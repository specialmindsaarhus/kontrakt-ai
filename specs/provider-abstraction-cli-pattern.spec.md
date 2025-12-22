# CLI Provider Pattern Specification

**Status:** 🟡 Draft
**Related:** `provider-abstraction.spec.md`
**Purpose:** Define reusable patterns for CLI-based LLM providers to eliminate code duplication and ensure consistent behavior.

---

## 1. Design Principles

### 1.1 Core Philosophy

> **"90% of CLI provider code should be identical. Subclasses customize the 10% that varies."**

After analyzing `claude-adapter.js` and `gemini-adapter.js`, we found:
- **~400 lines each** with ~350 lines of duplicate boilerplate
- Identical: process spawning, stdin/stdout handling, timeout, cancellation, error detection
- Different: CLI argument construction (~30 lines) and output normalization (~20 lines)

**Conclusion:** Extract common logic into a base class, leaving only provider-specific concerns to subclasses.

### 1.2 Goals

1. **DRY Principle:** Eliminate duplicate process management code
2. **Consistency:** All CLI providers behave identically (timeout, cancellation, errors)
3. **Simplicity:** Adding a new CLI provider should be ~50 lines, not ~400
4. **Type Safety:** Strong contracts prevent runtime errors
5. **Testability:** Mock process execution without touching real CLIs
6. **Extensibility:** Support future CLI types (local models, custom tools)

---

## 2. Architecture

### 2.1 Layer Separation

```
┌─────────────────────────────────────────┐
│   Application Layer (analysis-runner)   │
│   - Builds ProviderContext              │
│   - Handles progress callbacks          │
│   - Manages cancellation tokens         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Provider Interface (LLMProvider)    │
│      - send(request): Promise<response> │
│      - Stateless, async, cancellable    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│     BaseCLIProvider (Abstract Class)     │
│     - Process lifecycle management      │
│     - Stdin/stdout/stderr collection    │
│     - Timeout and cancellation logic    │
│     - Error normalization               │
│     - Progress estimation               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   Concrete Providers (ClaudeCLI, etc.)  │
│   - buildCommand(): string[]            │
│   - normalizeOutput(): string           │
│   - parseError(): ProviderError         │
└─────────────────────────────────────────┘
```

---

## 3. BaseCLIProvider Abstract Class

### 3.1 Interface

```typescript
/**
 * Base class for all CLI-based LLM providers
 * Handles process lifecycle, I/O, timeouts, cancellation, and error normalization
 */
abstract class BaseCLIProvider implements LLMProvider {
  // ========== LLMProvider Interface ==========

  abstract readonly id: string;
  abstract readonly displayName: string;
  abstract readonly capabilities: ProviderCapabilities;

  /**
   * Send a request to the LLM provider
   * @throws {ProviderError} Normalized error with user-friendly message
   */
  async send(request: LLMRequest, options?: ExecutionOptions): Promise<LLMResponse>;

  // ========== CLI-Specific Configuration ==========

  /**
   * Name of the CLI command (e.g., 'claude', 'gemini', 'ollama')
   */
  protected abstract get cliCommand(): string;

  /**
   * Build CLI arguments and stdin content from request
   * This is the PRIMARY customization point for subclasses
   */
  protected abstract buildCommand(request: LLMRequest): CLICommand;

  /**
   * Normalize raw CLI stdout to clean response text
   * Remove ANSI codes, CLI headers, metadata, etc.
   */
  protected abstract normalizeOutput(stdout: string, stderr: string): string;

  /**
   * Parse CLI error into structured ProviderError
   * Map stderr patterns to error types
   */
  protected abstract parseError(
    code: number,
    stdout: string,
    stderr: string,
    signal: string | null
  ): ProviderError;

  // ========== Lifecycle Hooks (Optional Overrides) ==========

  /**
   * Called before spawning process (validation, logging, etc.)
   */
  protected async beforeExecute(request: LLMRequest): Promise<void> {}

  /**
   * Called after successful execution (cleanup, caching, etc.)
   */
  protected async afterExecute(response: LLMResponse): Promise<void> {}

  /**
   * Check if CLI is installed and accessible
   * Default: `which {cliCommand}` on Unix, `where {cliCommand}` on Windows
   */
  async isAvailable(): Promise<boolean>;

  /**
   * Get CLI version string
   * Default: `{cliCommand} --version`
   */
  async getVersion(): Promise<string | null>;
}
```

### 3.2 CLICommand Structure

```typescript
/**
 * Result of buildCommand() - everything needed to execute CLI
 */
interface CLICommand {
  /**
   * CLI arguments (e.g., ['--print', '--system-prompt', '...'])
   */
  args: string[];

  /**
   * Content to write to stdin (null if using CLI args for prompt)
   */
  stdin: string | null;

  /**
   * Environment variables to set (optional)
   * Example: { ANTHROPIC_LOG: 'debug' }
   */
  env?: Record<string, string>;

  /**
   * Working directory (optional, defaults to process.cwd())
   */
  cwd?: string;
}
```

### 3.3 ExecutionOptions

```typescript
/**
 * Execution-specific options (not part of LLMRequest)
 */
interface ExecutionOptions {
  /**
   * Maximum execution time in milliseconds
   * Default: 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Cancellation token for aborting execution
   * Allows safe concurrent requests with individual cancellation
   */
  signal?: AbortSignal;

  /**
   * Progress callback for real-time updates
   * Called periodically during execution
   */
  onProgress?: ProgressCallback;
}

type ProgressCallback = (progress: ProgressUpdate) => void;

interface ProgressUpdate {
  /**
   * Estimated progress (0-100)
   * For CLIs without streaming: estimated based on elapsed time
   */
  percent: number;

  /**
   * Current stage description
   */
  stage: string;

  /**
   * Bytes written to stdin / bytes read from stdout (optional)
   */
  bytes?: { stdin: number; stdout: number };
}
```

---

## 4. Implementation Strategy

### 4.1 Process Execution Flow

```typescript
// Simplified implementation (actual code will be more robust)
abstract class BaseCLIProvider implements LLMProvider {
  async send(request: LLMRequest, options: ExecutionOptions = {}): Promise<LLMResponse> {
    const startTime = Date.now();

    // 1. Validate CLI availability
    if (!(await this.isAvailable())) {
      throw new ProviderError({
        type: 'NOT_INSTALLED',
        providerId: this.id,
        message: `${this.displayName} CLI is not installed`,
        isRecoverable: true,
        userMessage: `Installer ${this.displayName} CLI for at bruge denne provider`
      });
    }

    // 2. Pre-execution hook
    await this.beforeExecute(request);

    // 3. Build command
    const command = this.buildCommand(request);

    // 4. Execute with timeout and cancellation support
    const result = await this._executeProcess(command, options);

    // 5. Parse result or throw error
    if (!result.success) {
      throw this.parseError(result.code, result.stdout, result.stderr, result.signal);
    }

    // 6. Normalize output
    const content = this.normalizeOutput(result.stdout, result.stderr);

    // 7. Build response
    const response: LLMResponse = {
      message: { role: 'assistant', content },
      usage: this._extractUsage(result.stderr), // Optional
      providerMeta: {
        providerId: this.id,
        model: this._extractModel(result.stderr),
        latencyMs: Date.now() - startTime,
        raw: { stdout: result.stdout, stderr: result.stderr }
      }
    };

    // 8. Post-execution hook
    await this.afterExecute(response);

    return response;
  }

  /**
   * Execute CLI process with robust error handling
   * INTERNAL USE ONLY - subclasses should never override this
   */
  private async _executeProcess(
    command: CLICommand,
    options: ExecutionOptions
  ): Promise<ProcessResult> {
    // This is where the 350 lines of duplicate code lives
    // - spawn() process
    // - Handle stdin/stdout/stderr
    // - Implement timeout with AbortSignal
    // - Handle graceful shutdown (Ctrl+C) and force kill (SIGKILL)
    // - Collect all output
    // - Return structured result

    // See Section 4.2 for full implementation
  }
}
```

### 4.2 Robust Process Execution

**Key Requirements:**
1. **Cancellation Safety:** Use `AbortSignal` instead of instance variables
2. **Timeout Handling:** Graceful shutdown (2s) then force kill
3. **Stream Collection:** Buffer all stdin/stdout/stderr
4. **Error Detection:** Distinguish between timeout, cancellation, auth errors, etc.
5. **Progress Estimation:** Emit periodic updates during long executions

```typescript
private async _executeProcess(
  command: CLICommand,
  options: ExecutionOptions
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const { timeout = 300000, signal, onProgress } = options;

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let cancelled = false;

    // Spawn process
    const child = spawn(this.cliCommand, command.args, {
      env: { ...process.env, ...command.env },
      cwd: command.cwd,
      shell: true // Required for Windows compatibility
    });

    // Handle cancellation via AbortSignal
    const onAbort = () => {
      cancelled = true;
      this._killProcess(child);
    };
    signal?.addEventListener('abort', onAbort);

    // Setup timeout
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      this._killProcess(child);
    }, timeout);

    // Write stdin if provided
    if (command.stdin) {
      child.stdin.write(command.stdin);
      child.stdin.end(); // CRITICAL: Signal EOF
    }

    // Collect stdout
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      onProgress?.({
        percent: this._estimateProgress(Date.now() - startTime, timeout),
        stage: 'processing',
        bytes: { stdin: command.stdin?.length || 0, stdout: stdout.length }
      });
    });

    // Collect stderr
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    // Handle completion
    child.on('exit', (code, signal) => {
      clearTimeout(timeoutHandle);
      signal?.removeEventListener('abort', onAbort);

      resolve({
        success: code === 0 && !timedOut && !cancelled,
        code: code || -1,
        stdout,
        stderr,
        signal,
        timedOut,
        cancelled
      });
    });

    // Handle spawn errors
    child.on('error', (err) => {
      clearTimeout(timeoutHandle);
      signal?.removeEventListener('abort', onAbort);

      reject(new ProviderError({
        type: 'PROVIDER',
        providerId: this.id,
        message: `Failed to spawn CLI: ${err.message}`,
        isRecoverable: false,
        cause: err
      }));
    });
  });
}

/**
 * Kill process gracefully, then forcefully
 */
private _killProcess(child: ChildProcess): void {
  if (child.killed) return;

  // Try Ctrl+C first (graceful)
  if (child.stdin && !child.stdin.destroyed) {
    child.stdin.write('\x03'); // Ctrl+C
  }

  // Force kill after 2 seconds
  setTimeout(() => {
    if (!child.killed) {
      child.kill('SIGKILL');
    }
  }, 2000);
}

/**
 * Estimate progress based on elapsed time (for CLIs without streaming)
 * Uses asymptotic curve: fast initial progress, slower near completion
 */
private _estimateProgress(elapsedMs: number, timeoutMs: number): number {
  const ratio = elapsedMs / timeoutMs;
  // Asymptotic function: 100 * (1 - e^(-3*ratio))
  // Reaches ~95% at ratio=1.0 (never shows 100% until complete)
  return Math.min(95, Math.round(100 * (1 - Math.exp(-3 * ratio))));
}
```

---

## 5. Concrete Provider Example: Claude CLI

```typescript
/**
 * Claude CLI Provider
 * Implements ~50 lines of provider-specific logic
 */
class ClaudeCLIProvider extends BaseCLIProvider {
  readonly id = 'claude-cli';
  readonly displayName = 'Claude (Local CLI)';
  readonly capabilities: ProviderCapabilities = {
    streaming: false,
    temperature: false,
    maxTokens: false,
    systemMessages: true
  };

  protected get cliCommand(): string {
    return 'claude';
  }

  protected buildCommand(request: LLMRequest): CLICommand {
    const args = ['--print'];

    // Add system prompt if present in context
    if (request.context.instructions) {
      args.push('--system-prompt', request.context.instructions);
    }

    // Build user message from conversation history
    const userMessage = request.messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');

    return {
      args,
      stdin: userMessage,
      env: {} // No special env vars needed
    };
  }

  protected normalizeOutput(stdout: string, stderr: string): string {
    return stdout
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes
      .trim();
  }

  protected parseError(
    code: number,
    stdout: string,
    stderr: string,
    signal: string | null
  ): ProviderError {
    const stderrLower = stderr.toLowerCase();

    // Detect auth errors
    if (stderrLower.includes('auth') ||
        stderrLower.includes('login') ||
        stderrLower.includes('unauthorized')) {
      return new ProviderError({
        type: 'AUTH',
        providerId: this.id,
        message: 'Authentication required',
        isRecoverable: true,
        userMessage: 'Kør "claude login" i din terminal for at logge ind'
      });
    }

    // Generic failure
    return new ProviderError({
      type: 'PROVIDER',
      providerId: this.id,
      message: `CLI failed with exit code ${code}`,
      isRecoverable: false,
      userMessage: `Claude CLI fejlede: ${stderr.slice(0, 200)}`
    });
  }
}
```

**That's it!** ~50 lines instead of ~400.

---

## 6. Comparison: HTTP Provider

To validate our abstraction, let's sketch an HTTP-based provider:

```typescript
/**
 * Claude HTTP API Provider
 * Implements LLMProvider directly (no BaseCLIProvider)
 */
class ClaudeAPIProvider implements LLMProvider {
  readonly id = 'claude-api';
  readonly displayName = 'Claude (HTTP API)';
  readonly capabilities: ProviderCapabilities = {
    streaming: true, // APIs support streaming!
    temperature: true,
    maxTokens: true,
    systemMessages: true
  };

  async send(request: LLMRequest, options: ExecutionOptions = {}): Promise<LLMResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        system: request.context.instructions,
        messages: request.messages,
        temperature: request.options?.temperature,
        max_tokens: request.options?.maxTokens || 4096
      }),
      signal: options.signal // Native AbortSignal support!
    });

    if (!response.ok) {
      throw this._parseAPIError(response);
    }

    const data = await response.json();

    return {
      message: {
        role: 'assistant',
        content: data.content[0].text
      },
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      },
      providerMeta: {
        providerId: this.id,
        model: data.model,
        latencyMs: /* calculate from headers */
      }
    };
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async getVersion(): Promise<string | null> {
    return 'API v1'; // APIs don't have CLI versions
  }

  private _parseAPIError(response: Response): ProviderError {
    // Map HTTP status codes to ProviderErrorType
    if (response.status === 401) {
      return new ProviderError({
        type: 'AUTH',
        providerId: this.id,
        message: 'Invalid API key',
        isRecoverable: true,
        userMessage: 'Sæt ANTHROPIC_API_KEY miljøvariabel'
      });
    }

    if (response.status === 429) {
      return new ProviderError({
        type: 'RATE_LIMIT',
        providerId: this.id,
        message: 'Rate limit exceeded',
        isRecoverable: true,
        userMessage: 'For mange anmodninger - vent venligst et øjeblik'
      });
    }

    // ... etc
  }
}
```

**Key Observation:** HTTP providers and CLI providers share the same `LLMProvider` interface but have **completely different** internal implementations. This validates our design!

---

## 7. Design Validation Checklist

Our abstraction should make these scenarios easy:

- ✅ **Add OpenAI CLI:** Extend `BaseCLIProvider`, implement 3 methods (~50 lines)
- ✅ **Add Claude API:** Implement `LLMProvider` directly with `fetch()` (~100 lines)
- ✅ **Add Ollama (local):** Extend `BaseCLIProvider` for local model (~60 lines)
- ✅ **Add Gemini Web Session:** Implement `LLMProvider` with Playwright (~200 lines)
- ✅ **Mock for testing:** Create `MockProvider` that returns canned responses
- ✅ **Concurrent requests:** Use different `AbortSignal` for each request
- ✅ **Progress tracking:** `onProgress` callback works for all provider types
- ✅ **Error consistency:** All providers throw `ProviderError` with same structure

---

## 8. Migration Impact

### Before (Current)
```javascript
// claude-adapter.js: 459 lines
// gemini-adapter.js: 450 lines
// Total: 909 lines
```

### After (Refactored)
```javascript
// base-cli-provider.js: 350 lines (shared)
// claude-cli-provider.js: 50 lines
// gemini-cli-provider.js: 55 lines
// Total: 455 lines (50% reduction!)
```

**Savings:**
- 454 lines eliminated
- 0 duplicate code
- Future CLI providers: ~50 lines each (90% reduction)

---

## 9. Open Questions for Team Discussion

### 9.1 Should `BaseCLIProvider` be abstract or concrete?

**Option A: Abstract class (current proposal)**
- ✅ Enforces implementation of required methods
- ✅ Clear contract for subclasses
- ❌ Can't instantiate for testing without subclass

**Option B: Concrete class with strategy pattern**
```typescript
class GenericCLIProvider extends BaseCLIProvider {
  constructor(config: CLIProviderConfig) {
    this.buildCommand = config.buildCommand;
    this.normalizeOutput = config.normalizeOutput;
    // ...
  }
}
```
- ✅ Can create instances for testing
- ✅ More flexible (runtime configuration)
- ❌ Less type-safe

**Recommendation:** Abstract class (Option A). Use factory functions for testing.

### 9.2 Who owns progress estimation?

**Option A: BaseCLIProvider estimates progress (current proposal)**
- ✅ Consistent across all CLI providers
- ❌ Less accurate (can't know actual CLI progress)

**Option B: Subclasses report progress (if CLI supports it)**
```typescript
protected async *streamOutput(child: ChildProcess): AsyncIterable<string> {
  // Subclass can parse stdout incrementally and report real progress
}
```
- ✅ More accurate (if CLI provides progress)
- ❌ More work for subclass authors
- ❌ Not all CLIs support streaming

**Recommendation:** Option A (base class estimates). Add streaming support in v2 if needed.

### 9.3 Should we support shell pipes/redirection?

Some CLIs might need complex invocations:
```bash
cat prompt.txt | claude --print --system-prompt "$(cat system.txt)"
```

**Option A: No (current proposal)** - Use stdin for all input
**Option B: Yes** - Allow `command.shellScript` for complex cases

**Recommendation:** Option A. Shell scripts are brittle and platform-specific.

---

## 10. Implementation Checklist

- [ ] Create `src/providers/base/BaseCLIProvider.js`
- [ ] Implement `_executeProcess()` with timeout and cancellation
- [ ] Implement `_estimateProgress()` with asymptotic curve
- [ ] Add `isAvailable()` with platform-specific `which`/`where`
- [ ] Add `getVersion()` with `--version` fallback
- [ ] Create `ProviderError` class (see `provider-abstraction-error-mapping.spec.md`)
- [ ] Write unit tests for process execution (mocked)
- [ ] Refactor `ClaudeAdapter` → `ClaudeCLIProvider` extends `BaseCLIProvider`
- [ ] Refactor `GeminiAdapter` → `GeminiCLIProvider` extends `BaseCLIProvider`
- [ ] Verify 50%+ code reduction
- [ ] Update `analysis-runner.js` to use new provider interface
- [ ] Run integration tests with real CLIs
- [ ] Document provider development guide

---

## 11. Success Criteria

✅ **Quantitative:**
- Total codebase reduced by ≥400 lines
- New CLI provider requires ≤100 lines
- Test coverage ≥90% for `BaseCLIProvider`
- All existing functionality works unchanged

✅ **Qualitative:**
- Clear separation: base class = "how", subclass = "what"
- No duplicate process management code
- Same cancellation/timeout behavior across all providers
- Easy to mock for testing

---

## Status

**Implementation Priority:** 🔴 **CRITICAL** (blocks OpenAI adapter and API providers)

**Estimated Effort:** 12-16 hours
- Base class: 6-8 hours
- Refactor existing adapters: 4-6 hours
- Testing: 2 hours

**Dependencies:**
- Must implement `ProviderError` class first (see `provider-abstraction-error-mapping.spec.md`)
- Should have tests ready (see `provider-abstraction-testing.spec.md`)

---

## References

- Main spec: `provider-abstraction.spec.md`
- Error handling: `provider-abstraction-error-mapping.spec.md`
- Testing guide: `provider-abstraction-testing.spec.md`
- Migration guide: `provider-abstraction-migration.spec.md`
