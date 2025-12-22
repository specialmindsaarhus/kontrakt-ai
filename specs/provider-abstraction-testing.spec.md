# Provider Abstraction Testing Specification

**Status:** 🟡 Draft
**Related:** `provider-abstraction.spec.md`, `provider-abstraction-cli-pattern.spec.md`, `provider-abstraction-error-mapping.spec.md`
**Purpose:** Define comprehensive testing strategy for provider abstraction to ensure reliability, correctness, and ease of maintenance.

---

## 1. Testing Philosophy

### 1.1 Core Principles

> **"Test the contract, not the implementation."**

Our testing strategy focuses on:
1. **Interface Compliance:** Every provider must implement `LLMProvider` correctly
2. **Error Consistency:** Same error type → same behavior across all providers
3. **Isolation:** Test providers without external dependencies (CLIs, APIs, network)
4. **Regression Prevention:** Catch breaking changes early
5. **Documentation:** Tests serve as executable examples

### 1.2 Test Pyramid

```
         ┌─────────────────┐
         │   E2E Tests     │  ← Real CLIs, real files (slow, brittle)
         │   (5-10 tests)  │
         ├─────────────────┤
         │ Integration     │  ← Mocked processes, real logic (medium speed)
         │ (30-50 tests)   │
         ├─────────────────┤
         │  Unit Tests     │  ← Pure functions, mocked I/O (fast, reliable)
         │ (100-150 tests) │
         └─────────────────┘
```

**Target Distribution:**
- **Unit:** 70% of tests (fast, isolated, pure logic)
- **Integration:** 25% of tests (mocked I/O, real provider logic)
- **E2E:** 5% of tests (smoke tests, real CLIs, slow)

---

## 2. Test Categories

### 2.1 Unit Tests

**Scope:** Pure functions, data transformations, no I/O

#### 2.1.1 ProviderError Tests

```typescript
describe('ProviderError', () => {
  describe('constructor', () => {
    it('should create error with all properties', () => {
      const error = new ProviderError({
        type: 'AUTH',
        providerId: 'claude-cli',
        message: 'Auth failed',
        isRecoverable: true,
        userMessage: 'Du skal logge ind',
        recoverySuggestions: ['Kør "claude login"']
      });

      expect(error.type).toBe('AUTH');
      expect(error.providerId).toBe('claude-cli');
      expect(error.isRecoverable).toBe(true);
      expect(error.userMessage).toBe('Du skal logge ind');
      expect(error.recoverySuggestions).toHaveLength(1);
    });

    it('should extend Error class', () => {
      const error = new ProviderError({
        type: 'NETWORK',
        providerId: 'test',
        message: 'Network failed',
        isRecoverable: true,
        userMessage: 'Netværksfejl'
      });

      expect(error instanceof Error).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should preserve cause chain', () => {
      const cause = new Error('Original error');
      const error = new ProviderError({
        type: 'PROVIDER',
        providerId: 'test',
        message: 'Wrapped error',
        isRecoverable: false,
        userMessage: 'Fejl',
        cause
      });

      expect(error.cause).toBe(cause);
    });
  });
});
```

#### 2.1.2 Error Mapper Tests

```typescript
describe('CLIErrorMapper', () => {
  describe('pattern matching', () => {
    it('should detect AUTH from "login required" in stderr', () => {
      const result: ProcessResult = {
        success: false,
        code: 1,
        stdout: '',
        stderr: 'Error: Please run "claude login" to authenticate',
        signal: null,
        timedOut: false,
        cancelled: false
      };

      const error = CLIErrorMapper.map('claude-cli', result);

      expect(error.type).toBe('AUTH');
      expect(error.userMessage).toContain('logge ind');
    });

    it('should detect NOT_INSTALLED from "command not found"', () => {
      const result: ProcessResult = {
        success: false,
        code: 127,
        stdout: '',
        stderr: 'bash: gemini: command not found',
        signal: null,
        timedOut: false,
        cancelled: false
      };

      const error = CLIErrorMapper.map('gemini-cli', result);

      expect(error.type).toBe('NOT_INSTALLED');
      expect(error.isRecoverable).toBe(true);
    });

    it('should detect RATE_LIMIT from "429" in stderr', () => {
      const result: ProcessResult = {
        success: false,
        code: 1,
        stdout: '',
        stderr: 'Error: Rate limit exceeded (HTTP 429)',
        signal: null,
        timedOut: false,
        cancelled: false
      };

      const error = CLIErrorMapper.map('claude-cli', result);

      expect(error.type).toBe('RATE_LIMIT');
      expect(error.recoverySuggestions.length).toBeGreaterThan(0);
    });

    it('should detect CONTEXT_LENGTH from "too long" patterns', () => {
      const result: ProcessResult = {
        success: false,
        code: 1,
        stdout: '',
        stderr: 'Error: Input exceeds maximum context length',
        signal: null,
        timedOut: false,
        cancelled: false
      };

      const error = CLIErrorMapper.map('claude-cli', result);

      expect(error.type).toBe('CONTEXT_LENGTH');
    });

    it('should detect NETWORK from connection errors', () => {
      const result: ProcessResult = {
        success: false,
        code: 1,
        stdout: '',
        stderr: 'Error: ECONNREFUSED - Connection refused',
        signal: null,
        timedOut: false,
        cancelled: false
      };

      const error = CLIErrorMapper.map('claude-cli', result);

      expect(error.type).toBe('NETWORK');
    });
  });

  describe('process state detection', () => {
    it('should detect TIMEOUT from timedOut flag', () => {
      const result: ProcessResult = {
        success: false,
        code: -1,
        stdout: '',
        stderr: '',
        signal: 'SIGTERM',
        timedOut: true,
        cancelled: false,
        timeoutMs: 60000
      };

      const error = CLIErrorMapper.map('claude-cli', result);

      expect(error.type).toBe('TIMEOUT');
      expect(error.technicalDetails?.timeoutMs).toBe(60000);
    });

    it('should detect CANCELLED from cancelled flag', () => {
      const result: ProcessResult = {
        success: false,
        code: -1,
        stdout: '',
        stderr: '',
        signal: 'SIGKILL',
        timedOut: false,
        cancelled: true
      };

      const error = CLIErrorMapper.map('claude-cli', result);

      expect(error.type).toBe('CANCELLED');
      expect(error.isRecoverable).toBe(false);
    });

    it('should return null for successful execution', () => {
      const result: ProcessResult = {
        success: true,
        code: 0,
        stdout: 'Success output',
        stderr: '',
        signal: null,
        timedOut: false,
        cancelled: false
      };

      const error = CLIErrorMapper.map('claude-cli', result);

      expect(error).toBeNull();
    });
  });

  describe('fallback behavior', () => {
    it('should return PROVIDER error for unknown patterns', () => {
      const result: ProcessResult = {
        success: false,
        code: 42,
        stdout: '',
        stderr: 'Some weird error that we do not recognize',
        signal: null,
        timedOut: false,
        cancelled: false
      };

      const error = CLIErrorMapper.map('claude-cli', result);

      expect(error.type).toBe('PROVIDER');
      expect(error.isRecoverable).toBe(false);
      expect(error.technicalDetails?.exitCode).toBe(42);
    });
  });
});
```

#### 2.1.3 HTTP Error Mapper Tests

```typescript
describe('HTTPErrorMapper', () => {
  it('should map 401 to AUTH error', async () => {
    const response = new Response(
      JSON.stringify({ error: { message: 'Invalid API key' } }),
      { status: 401 }
    );

    const error = await HTTPErrorMapper.map('claude-api', response);

    expect(error.type).toBe('AUTH');
    expect(error.userMessage).toContain('API nøgle');
  });

  it('should map 429 to RATE_LIMIT error', async () => {
    const response = new Response(
      JSON.stringify({ error: { message: 'Rate limit exceeded' } }),
      { status: 429 }
    );

    const error = await HTTPErrorMapper.map('claude-api', response);

    expect(error.type).toBe('RATE_LIMIT');
  });

  it('should map 413 to CONTEXT_LENGTH error', async () => {
    const response = new Response('Payload too large', { status: 413 });

    const error = await HTTPErrorMapper.map('claude-api', response);

    expect(error.type).toBe('CONTEXT_LENGTH');
  });

  it('should map 500-504 to PROVIDER error', async () => {
    const response = new Response('Internal server error', { status: 500 });

    const error = await HTTPErrorMapper.map('claude-api', response);

    expect(error.type).toBe('PROVIDER');
    expect(error.isRecoverable).toBe(true); // Server errors are often transient
  });

  it('should map 529 to MODEL_OVERLOADED error', async () => {
    const response = new Response('Model overloaded', { status: 529 });

    const error = await HTTPErrorMapper.map('claude-api', response);

    expect(error.type).toBe('MODEL_OVERLOADED');
  });
});
```

---

### 2.2 Integration Tests

**Scope:** Provider logic with mocked I/O (process, filesystem, network)

#### 2.2.1 BaseCLIProvider Tests

```typescript
describe('BaseCLIProvider', () => {
  // Create a concrete test provider
  class TestCLIProvider extends BaseCLIProvider {
    readonly id = 'test-cli';
    readonly displayName = 'Test CLI';
    readonly capabilities = {
      streaming: false,
      temperature: false,
      maxTokens: false,
      systemMessages: true
    };

    protected get cliCommand(): string {
      return 'test-cli';
    }

    protected buildCommand(request: LLMRequest): CLICommand {
      return {
        args: ['--print'],
        stdin: request.messages[0].content
      };
    }

    protected normalizeOutput(stdout: string): string {
      return stdout.trim();
    }

    protected parseError(code: number, stdout: string, stderr: string): ProviderError {
      return CLIErrorMapper.map(this.id, {
        success: false,
        code,
        stdout,
        stderr,
        signal: null,
        timedOut: false,
        cancelled: false
      });
    }
  }

  describe('send()', () => {
    let provider: TestCLIProvider;
    let mockSpawn: jest.Mock;

    beforeEach(() => {
      provider = new TestCLIProvider();

      // Mock child_process.spawn
      mockSpawn = jest.fn();
      jest.spyOn(require('child_process'), 'spawn').mockImplementation(mockSpawn);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should execute CLI and return response on success', async () => {
      // Mock successful process
      mockProcessSuccess(mockSpawn, 'Test response from CLI');

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Test prompt' }],
        context: { instructions: 'System instructions' }
      };

      const response = await provider.send(request);

      expect(response.message.role).toBe('assistant');
      expect(response.message.content).toBe('Test response from CLI');
      expect(response.providerMeta?.providerId).toBe('test-cli');
    });

    it('should throw AUTH error on authentication failure', async () => {
      mockProcessError(mockSpawn, 1, '', 'Error: Please login first');

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        context: { instructions: '' }
      };

      await expect(provider.send(request)).rejects.toThrow(ProviderError);
      await expect(provider.send(request)).rejects.toMatchObject({
        type: 'AUTH',
        isRecoverable: true
      });
    });

    it('should throw TIMEOUT error when process times out', async () => {
      mockProcessTimeout(mockSpawn);

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        context: { instructions: '' }
      };

      await expect(
        provider.send(request, { timeout: 1000 })
      ).rejects.toMatchObject({
        type: 'TIMEOUT'
      });
    });

    it('should throw CANCELLED error when aborted', async () => {
      mockProcessDelay(mockSpawn, 5000); // 5 second delay

      const abortController = new AbortController();

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        context: { instructions: '' }
      };

      const promise = provider.send(request, { signal: abortController.signal });

      // Abort after 100ms
      setTimeout(() => abortController.abort(), 100);

      await expect(promise).rejects.toMatchObject({
        type: 'CANCELLED'
      });
    });

    it('should emit progress updates during execution', async () => {
      mockProcessDelay(mockSpawn, 1000, 'Response');

      const progressUpdates: ProgressUpdate[] = [];
      const onProgress = (update: ProgressUpdate) => {
        progressUpdates.push(update);
      };

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        context: { instructions: '' }
      };

      await provider.send(request, { onProgress });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].percent).toBeLessThan(100);
    });

    it('should throw NOT_INSTALLED if CLI not available', async () => {
      jest.spyOn(provider, 'isAvailable').mockResolvedValue(false);

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        context: { instructions: '' }
      };

      await expect(provider.send(request)).rejects.toMatchObject({
        type: 'NOT_INSTALLED'
      });
    });
  });

  describe('buildCommand()', () => {
    it('should be called by send() with correct request', async () => {
      const provider = new TestCLIProvider();
      const buildCommandSpy = jest.spyOn(provider as any, 'buildCommand');

      mockProcessSuccess(mockSpawn, 'Response');

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        context: { instructions: 'System' }
      };

      await provider.send(request);

      expect(buildCommandSpy).toHaveBeenCalledWith(request);
    });
  });

  describe('isAvailable()', () => {
    it('should return true if CLI is in PATH', async () => {
      mockWhichSuccess('test-cli', '/usr/local/bin/test-cli');

      const provider = new TestCLIProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(true);
    });

    it('should return false if CLI not in PATH', async () => {
      mockWhichFailure('test-cli');

      const provider = new TestCLIProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });

    it('should cache result for subsequent calls', async () => {
      const whichMock = mockWhichSuccess('test-cli', '/usr/local/bin/test-cli');

      const provider = new TestCLIProvider();
      await provider.isAvailable();
      await provider.isAvailable();
      await provider.isAvailable();

      expect(whichMock).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('getVersion()', () => {
    it('should return version from CLI --version', async () => {
      mockProcessSuccess(mockSpawn, 'test-cli version 1.2.3', ['--version']);

      const provider = new TestCLIProvider();
      const version = await provider.getVersion();

      expect(version).toBe('test-cli version 1.2.3');
    });

    it('should return null if CLI not available', async () => {
      jest.spyOn(provider, 'isAvailable').mockResolvedValue(false);

      const provider = new TestCLIProvider();
      const version = await provider.getVersion();

      expect(version).toBeNull();
    });
  });
});
```

#### 2.2.2 Concrete Provider Tests

```typescript
describe('ClaudeCLIProvider', () => {
  let provider: ClaudeCLIProvider;

  beforeEach(() => {
    provider = new ClaudeCLIProvider();
    mockCLIAvailable('claude');
  });

  describe('capabilities', () => {
    it('should declare correct capabilities', () => {
      expect(provider.capabilities).toEqual({
        streaming: false,
        temperature: false,
        maxTokens: false,
        systemMessages: true
      });
    });
  });

  describe('buildCommand()', () => {
    it('should build command with system prompt', () => {
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Analyze this' }],
        context: { instructions: 'You are a helpful assistant' }
      };

      const command = provider['buildCommand'](request);

      expect(command.args).toContain('--print');
      expect(command.args).toContain('--system-prompt');
      expect(command.args).toContain('You are a helpful assistant');
    });

    it('should use stdin for user message', () => {
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        context: { instructions: '' }
      };

      const command = provider['buildCommand'](request);

      expect(command.stdin).toContain('Test message');
    });

    it('should combine multiple messages', () => {
      const request: LLMRequest = {
        messages: [
          { role: 'user', content: 'First message' },
          { role: 'assistant', content: 'Response' },
          { role: 'user', content: 'Second message' }
        ],
        context: { instructions: '' }
      };

      const command = provider['buildCommand'](request);

      expect(command.stdin).toContain('First message');
      expect(command.stdin).toContain('Second message');
    });
  });

  describe('normalizeOutput()', () => {
    it('should remove ANSI color codes', () => {
      const stdout = '\x1b[32mGreen text\x1b[0m normal text';
      const normalized = provider['normalizeOutput'](stdout, '');

      expect(normalized).toBe('Green text normal text');
      expect(normalized).not.toContain('\x1b');
    });

    it('should trim whitespace', () => {
      const stdout = '  \n  Response text  \n  ';
      const normalized = provider['normalizeOutput'](stdout, '');

      expect(normalized).toBe('Response text');
    });
  });

  describe('end-to-end', () => {
    it('should complete full request cycle', async () => {
      mockProcessSuccess(mockSpawn, 'Claude response');

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        context: { instructions: 'System' }
      };

      const response = await provider.send(request);

      expect(response.message.content).toBe('Claude response');
      expect(response.providerMeta?.providerId).toBe('claude-cli');
    });
  });
});

// Similar tests for GeminiCLIProvider, OpenAICLIProvider...
```

---

### 2.3 Contract Tests

**Scope:** Verify all providers implement the interface correctly

```typescript
/**
 * Contract tests - run against ALL providers
 * Ensures every provider behaves consistently
 */
describe('LLMProvider Contract', () => {
  const providers: LLMProvider[] = [
    new ClaudeCLIProvider(),
    new GeminiCLIProvider(),
    new OpenAICLIProvider(),
    // Add more as implemented
  ];

  providers.forEach((provider) => {
    describe(`${provider.id}`, () => {
      beforeEach(() => {
        mockCLIAvailable(provider.id);
      });

      it('should have valid id', () => {
        expect(provider.id).toBeTruthy();
        expect(typeof provider.id).toBe('string');
        expect(provider.id.length).toBeGreaterThan(0);
      });

      it('should have valid displayName', () => {
        expect(provider.displayName).toBeTruthy();
        expect(typeof provider.displayName).toBe('string');
      });

      it('should declare capabilities', () => {
        expect(provider.capabilities).toBeDefined();
        expect(typeof provider.capabilities.streaming).toBe('boolean');
        expect(typeof provider.capabilities.temperature).toBe('boolean');
        expect(typeof provider.capabilities.maxTokens).toBe('boolean');
        expect(typeof provider.capabilities.systemMessages).toBe('boolean');
      });

      it('should implement send() method', () => {
        expect(typeof provider.send).toBe('function');
      });

      it('should return valid LLMResponse on success', async () => {
        mockProviderSuccess(provider, 'Test response');

        const request: LLMRequest = {
          messages: [{ role: 'user', content: 'Test' }],
          context: { instructions: '' }
        };

        const response = await provider.send(request);

        expect(response.message).toBeDefined();
        expect(response.message.role).toBe('assistant');
        expect(response.message.content).toBeTruthy();
        expect(response.providerMeta?.providerId).toBe(provider.id);
      });

      it('should throw ProviderError on failure', async () => {
        mockProviderError(provider, 'AUTH');

        const request: LLMRequest = {
          messages: [{ role: 'user', content: 'Test' }],
          context: { instructions: '' }
        };

        await expect(provider.send(request)).rejects.toBeInstanceOf(ProviderError);
      });

      it('should support cancellation via AbortSignal', async () => {
        mockProviderDelay(provider, 5000);

        const abortController = new AbortController();
        const request: LLMRequest = {
          messages: [{ role: 'user', content: 'Test' }],
          context: { instructions: '' }
        };

        const promise = provider.send(request, { signal: abortController.signal });

        setTimeout(() => abortController.abort(), 100);

        await expect(promise).rejects.toMatchObject({ type: 'CANCELLED' });
      });

      it('should respect timeout option', async () => {
        mockProviderDelay(provider, 10000); // 10 seconds

        const request: LLMRequest = {
          messages: [{ role: 'user', content: 'Test' }],
          context: { instructions: '' }
        };

        await expect(
          provider.send(request, { timeout: 1000 }) // 1 second timeout
        ).rejects.toMatchObject({ type: 'TIMEOUT' });
      });

      it('should call onProgress callback if provided', async () => {
        mockProviderDelay(provider, 1000, 'Response');

        const progressUpdates: ProgressUpdate[] = [];
        const request: LLMRequest = {
          messages: [{ role: 'user', content: 'Test' }],
          context: { instructions: '' }
        };

        await provider.send(request, {
          onProgress: (update) => progressUpdates.push(update)
        });

        expect(progressUpdates.length).toBeGreaterThan(0);
      });
    });
  });
});
```

---

### 2.4 E2E Tests (Smoke Tests)

**Scope:** Real CLIs, real files, real execution (slow, run manually)

```typescript
/**
 * E2E tests - require real CLIs to be installed
 * Run with: npm run test:e2e
 * Skip in CI if CLIs not available
 */
describe('E2E Provider Tests', () => {
  // Skip if CLI not installed
  const skipIfNotInstalled = (cliName: string) => {
    beforeAll(async () => {
      const available = await isCLIAvailable(cliName);
      if (!available) {
        console.warn(`Skipping ${cliName} tests - CLI not installed`);
      }
    });
  };

  describe('ClaudeCLIProvider', () => {
    skipIfNotInstalled('claude');

    it('should complete real analysis with Claude CLI', async () => {
      const provider = new ClaudeCLIProvider();

      const request: LLMRequest = {
        messages: [
          { role: 'user', content: 'What is 2+2? Answer with just the number.' }
        ],
        context: { instructions: 'You are a calculator.' }
      };

      const response = await provider.send(request, { timeout: 60000 });

      expect(response.message.content).toContain('4');
    }, 60000); // 60 second timeout

    it('should handle long documents', async () => {
      const provider = new ClaudeCLIProvider();

      const longText = 'a'.repeat(50000); // 50k characters

      const request: LLMRequest = {
        messages: [
          { role: 'user', content: `Summarize this text: ${longText}` }
        ],
        context: { instructions: '' }
      };

      const response = await provider.send(request, { timeout: 120000 });

      expect(response.message.content).toBeTruthy();
    }, 120000);
  });

  describe('GeminiCLIProvider', () => {
    skipIfNotInstalled('gemini');

    it('should complete real analysis with Gemini CLI', async () => {
      const provider = new GeminiCLIProvider();

      const request: LLMRequest = {
        messages: [
          { role: 'user', content: 'What is the capital of France?' }
        ],
        context: { instructions: '' }
      };

      const response = await provider.send(request, { timeout: 60000 });

      expect(response.message.content.toLowerCase()).toContain('paris');
    }, 60000);
  });
});
```

---

## 3. Test Utilities and Mocks

### 3.1 Process Mocking Utilities

```typescript
/**
 * Mock successful process execution
 */
function mockProcessSuccess(
  spawnMock: jest.Mock,
  stdout: string,
  expectedArgs?: string[]
): void {
  const mockChild = {
    stdin: {
      write: jest.fn(),
      end: jest.fn(),
      destroyed: false
    },
    stdout: {
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(stdout)), 10);
        }
      })
    },
    stderr: {
      on: jest.fn()
    },
    on: jest.fn((event, callback) => {
      if (event === 'exit') {
        setTimeout(() => callback(0, null), 50);
      }
    }),
    killed: false,
    kill: jest.fn()
  };

  spawnMock.mockImplementation((cmd, args) => {
    if (expectedArgs) {
      expect(args).toEqual(expect.arrayContaining(expectedArgs));
    }
    return mockChild;
  });
}

/**
 * Mock process error
 */
function mockProcessError(
  spawnMock: jest.Mock,
  exitCode: number,
  stdout: string,
  stderr: string
): void {
  const mockChild = {
    stdin: { write: jest.fn(), end: jest.fn(), destroyed: false },
    stdout: {
      on: jest.fn((event, callback) => {
        if (event === 'data' && stdout) {
          setTimeout(() => callback(Buffer.from(stdout)), 10);
        }
      })
    },
    stderr: {
      on: jest.fn((event, callback) => {
        if (event === 'data' && stderr) {
          setTimeout(() => callback(Buffer.from(stderr)), 10);
        }
      })
    },
    on: jest.fn((event, callback) => {
      if (event === 'exit') {
        setTimeout(() => callback(exitCode, null), 50);
      }
    }),
    killed: false,
    kill: jest.fn()
  };

  spawnMock.mockReturnValue(mockChild);
}

/**
 * Mock process timeout
 */
function mockProcessTimeout(spawnMock: jest.Mock): void {
  const mockChild = {
    stdin: { write: jest.fn(), end: jest.fn(), destroyed: false },
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn((event, callback) => {
      // Never calls 'exit' - simulates hanging process
    }),
    killed: false,
    kill: jest.fn(function() {
      this.killed = true;
      // Trigger exit callback after kill
      const exitCallback = this.on.mock.calls.find(([e]) => e === 'exit')?.[1];
      if (exitCallback) {
        setTimeout(() => exitCallback(-1, 'SIGTERM'), 10);
      }
    })
  };

  spawnMock.mockReturnValue(mockChild);
}

/**
 * Mock process with delay
 */
function mockProcessDelay(
  spawnMock: jest.Mock,
  delayMs: number,
  stdout: string = ''
): void {
  const mockChild = {
    stdin: { write: jest.fn(), end: jest.fn(), destroyed: false },
    stdout: {
      on: jest.fn((event, callback) => {
        if (event === 'data' && stdout) {
          setTimeout(() => callback(Buffer.from(stdout)), delayMs);
        }
      })
    },
    stderr: { on: jest.fn() },
    on: jest.fn((event, callback) => {
      if (event === 'exit') {
        setTimeout(() => callback(0, null), delayMs + 10);
      }
    }),
    killed: false,
    kill: jest.fn()
  };

  spawnMock.mockReturnValue(mockChild);
}
```

---

## 4. Coverage Requirements

### 4.1 Code Coverage Targets

```
Overall:         ≥ 90%
Unit Tests:      ≥ 95%
Integration:     ≥ 85%
E2E:             ≥ 50% (smoke tests only)

Critical Paths:  100%
- Error mapping
- Process execution
- Timeout handling
- Cancellation
```

### 4.2 Coverage Exemptions

**Allowed to skip:**
- Logging statements
- Type guards (covered by TypeScript)
- Unreachable code (proven by types)

---

## 5. Test Execution

### 5.1 npm Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e --runInBand",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:providers": "jest --testPathPattern=providers"
  }
}
```

### 5.2 Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/providers/**/*.ts',
    'src/adapters/**/*.ts', // Until refactored
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageThresholds: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
```

---

## 6. Continuous Integration

### 6.1 CI Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    # Skip E2E in CI (requires real CLIs)
    if: false
```

---

## 7. Migration Checklist

- [ ] Setup Jest with TypeScript support
- [ ] Create test utilities (process mocking, fixtures)
- [ ] Write unit tests for `ProviderError` class
- [ ] Write unit tests for `CLIErrorMapper`
- [ ] Write unit tests for `HTTPErrorMapper`
- [ ] Write integration tests for `BaseCLIProvider`
- [ ] Write integration tests for `ClaudeCLIProvider`
- [ ] Write integration tests for `GeminiCLIProvider`
- [ ] Write contract tests for all providers
- [ ] Write E2E smoke tests (manual execution)
- [ ] Configure coverage thresholds in jest.config
- [ ] Setup CI pipeline for automated testing
- [ ] Document test execution in README

---

## 8. Success Criteria

✅ **Coverage ≥90%:** All critical paths tested
✅ **Contract compliance:** All providers pass contract tests
✅ **Fast execution:** Unit + integration < 30 seconds
✅ **Reliable:** No flaky tests (deterministic mocks)
✅ **Maintainable:** Clear test names, good fixtures
✅ **Documented:** Tests serve as usage examples

---

## Status

**Implementation Priority:** 🔴 **CRITICAL** (test-driven development)

**Estimated Effort:** 16-20 hours
- Test utilities: 3 hours
- Unit tests: 5 hours
- Integration tests: 6 hours
- Contract tests: 2 hours
- E2E tests: 2 hours
- CI setup: 2 hours

**Dependencies:**
- Jest + TypeScript setup
- Provider implementation code

---

## References

- Main spec: `provider-abstraction.spec.md`
- CLI pattern: `provider-abstraction-cli-pattern.spec.md`
- Error mapping: `provider-abstraction-error-mapping.spec.md`
- Jest docs: https://jestjs.io/
- Testing best practices: https://github.com/goldbergyoni/javascript-testing-best-practices
