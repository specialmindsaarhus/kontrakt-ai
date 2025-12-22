# Provider Abstraction Migration Guide

**Status:** 🟡 Draft
**Related:** `provider-abstraction.spec.md`, `provider-abstraction-cli-pattern.spec.md`, `provider-abstraction-error-mapping.spec.md`
**Purpose:** Step-by-step guide for refactoring existing adapters to use the new provider abstraction.

---

## 1. Migration Overview

### 1.1 Current State (Before)

```
src/adapters/
├── claude-adapter.js    (459 lines, tightly coupled)
├── gemini-adapter.js    (450 lines, duplicate code)
└── (no openai adapter yet)

src/services/
└── analysis-runner.js   (uses adapters directly, reads prompt files)

Problems:
❌ 350+ lines of duplicate process management code
❌ File I/O mixed with provider logic
❌ Inconsistent error handling
❌ Hard to add new providers
❌ Can't support non-CLI providers (APIs, HTTP sessions)
```

### 1.2 Target State (After)

```
src/providers/
├── base/
│   ├── LLMProvider.ts           (Interface definition)
│   ├── ProviderError.ts         (Error class)
│   ├── ProviderTypes.ts         (Type definitions)
│   └── BaseCLIProvider.ts       (350 lines of shared CLI logic)
├── cli/
│   ├── ClaudeCLIProvider.ts     (~50 lines)
│   ├── GeminiCLIProvider.ts     (~55 lines)
│   └── OpenAICLIProvider.ts     (~50 lines) NEW!
├── api/
│   └── ClaudeAPIProvider.ts     (~100 lines) FUTURE
└── registry/
    └── ProviderRegistry.ts      (Discovery and selection)

src/services/
└── analysis-runner.js           (uses ProviderRegistry, builds context)

Benefits:
✅ 50% less code (909 → 455 lines)
✅ Zero duplicate code
✅ Consistent error handling
✅ Easy to add providers (~50 lines each)
✅ Supports CLI, API, HTTP session providers
```

---

## 2. Migration Strategy

### 2.1 Phased Approach

**Phase 1: Foundation (8 hours)**
- Create base classes and types
- Implement error handling system
- No changes to existing code yet

**Phase 2: Refactor Claude Adapter (4 hours)**
- Migrate `claude-adapter.js` → `ClaudeCLIProvider.ts`
- Update `analysis-runner.js` to support both old and new
- Run all tests (should still pass)

**Phase 3: Refactor Gemini Adapter (3 hours)**
- Migrate `gemini-adapter.js` → `GeminiCLIProvider.ts`
- Remove compatibility layer
- Run all tests

**Phase 4: Cleanup (1 hour)**
- Delete old adapter files
- Update documentation
- Final testing

**Total: 16 hours**

### 2.2 Risk Mitigation

1. **Parallel Development:** Keep old adapters until new ones proven
2. **Feature Flag:** Toggle between old/new implementations
3. **Incremental Testing:** Test after each phase
4. **Rollback Plan:** Git commits at each phase boundary

---

## 3. Phase 1: Foundation

### 3.1 Create Type Definitions

**File:** `src/providers/base/ProviderTypes.ts`

```typescript
/**
 * Core provider types
 * Shared across all provider implementations
 */

export type Role = 'system' | 'user' | 'assistant';

export interface Message {
  role: Role;
  content: string;
}

export interface ProviderContext {
  /**
   * Combined instruction text (from prompt files, system instructions)
   */
  instructions: string;

  /**
   * Optional metadata for logging
   */
  metadata?: Record<string, string>;
}

export interface ProviderOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMRequest {
  messages: Message[];
  context: ProviderContext;
  options?: ProviderOptions;
}

export interface UsageInfo {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface ProviderMeta {
  providerId: string;
  model?: string;
  latencyMs?: number;
  raw?: unknown;
}

export interface LLMResponse {
  message: Message;
  usage?: UsageInfo;
  providerMeta?: ProviderMeta;
}

export interface ProviderCapabilities {
  streaming: boolean;
  temperature: boolean;
  maxTokens: boolean;
  systemMessages: boolean;
}

export type ProviderErrorType =
  | 'CONFIG'
  | 'AUTH'
  | 'NOT_INSTALLED'
  | 'RATE_LIMIT'
  | 'QUOTA_EXCEEDED'
  | 'CONTEXT_LENGTH'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'PROVIDER'
  | 'MODEL_OVERLOADED'
  | 'CANCELLED'
  | 'UNKNOWN';

export interface ProgressUpdate {
  percent: number;
  stage: string;
  bytes?: { stdin: number; stdout: number };
}

export type ProgressCallback = (progress: ProgressUpdate) => void;

export interface ExecutionOptions {
  timeout?: number;
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
}
```

### 3.2 Create ProviderError Class

**File:** `src/providers/base/ProviderError.ts`

```typescript
import { ProviderErrorType } from './ProviderTypes';

export interface ProviderErrorOptions {
  type: ProviderErrorType;
  providerId: string;
  message: string;
  isRecoverable: boolean;
  userMessage: string;
  recoverySuggestions?: string[];
  technicalDetails?: Record<string, any>;
  cause?: Error;
}

export class ProviderError extends Error {
  readonly type: ProviderErrorType;
  readonly providerId: string;
  readonly isRecoverable: boolean;
  readonly userMessage: string;
  readonly recoverySuggestions: string[];
  readonly technicalDetails?: Record<string, any>;
  override readonly cause?: Error;

  constructor(options: ProviderErrorOptions) {
    super(options.message);
    this.name = 'ProviderError';
    this.type = options.type;
    this.providerId = options.providerId;
    this.isRecoverable = options.isRecoverable;
    this.userMessage = options.userMessage;
    this.recoverySuggestions = options.recoverySuggestions || [];
    this.technicalDetails = options.technicalDetails;
    this.cause = options.cause;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProviderError);
    }
  }

  /**
   * Get user-friendly error message in Danish
   */
  getUserMessage(): string {
    return this.userMessage;
  }

  /**
   * Get recovery suggestions
   */
  getRecoverySuggestions(): string[] {
    return this.recoverySuggestions;
  }

  /**
   * Format for logging
   */
  toJSON(): Record<string, any> {
    return {
      type: this.type,
      providerId: this.providerId,
      message: this.message,
      userMessage: this.userMessage,
      isRecoverable: this.isRecoverable,
      recoverySuggestions: this.recoverySuggestions,
      technicalDetails: this.technicalDetails
    };
  }
}
```

### 3.3 Create LLMProvider Interface

**File:** `src/providers/base/LLMProvider.ts`

```typescript
import {
  LLMRequest,
  LLMResponse,
  ProviderCapabilities,
  ExecutionOptions
} from './ProviderTypes';

/**
 * Core interface that all LLM providers must implement
 * Providers can be CLI-based, API-based, HTTP session-based, or local models
 */
export interface LLMProvider {
  /**
   * Unique provider identifier (e.g., 'claude-cli', 'gemini-api')
   */
  readonly id: string;

  /**
   * Human-readable name (e.g., 'Claude (Local CLI)')
   */
  readonly displayName: string;

  /**
   * Provider capabilities (what features it supports)
   */
  readonly capabilities: ProviderCapabilities;

  /**
   * Send a request to the LLM provider
   * @throws {ProviderError} On any error
   */
  send(request: LLMRequest, options?: ExecutionOptions): Promise<LLMResponse>;

  /**
   * Check if provider is available/installed
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get provider version (if applicable)
   */
  getVersion(): Promise<string | null>;
}
```

### 3.4 Create BaseCLIProvider (Extract Common Logic)

**File:** `src/providers/base/BaseCLIProvider.ts`

This is the most complex file. Let's build it incrementally:

```typescript
import { spawn, ChildProcess } from 'child_process';
import { LLMProvider } from './LLMProvider';
import { ProviderError } from './ProviderError';
import {
  LLMRequest,
  LLMResponse,
  ExecutionOptions,
  ProviderCapabilities
} from './ProviderTypes';

/**
 * CLI command structure returned by buildCommand()
 */
export interface CLICommand {
  args: string[];
  stdin: string | null;
  env?: Record<string, string>;
  cwd?: string;
}

/**
 * Process execution result (internal)
 */
interface ProcessResult {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
  signal: string | null;
  timedOut: boolean;
  cancelled: boolean;
  timeoutMs?: number;
}

/**
 * Base class for CLI-based LLM providers
 * Handles all common process management logic
 */
export abstract class BaseCLIProvider implements LLMProvider {
  // ========== Abstract Properties (Subclass Must Provide) ==========

  abstract readonly id: string;
  abstract readonly displayName: string;
  abstract readonly capabilities: ProviderCapabilities;

  /**
   * CLI command name (e.g., 'claude', 'gemini', 'ollama')
   */
  protected abstract get cliCommand(): string;

  // ========== Abstract Methods (Subclass Must Implement) ==========

  /**
   * Build CLI command from request
   * This is where provider-specific logic lives
   */
  protected abstract buildCommand(request: LLMRequest): CLICommand;

  /**
   * Normalize raw CLI output to clean response
   */
  protected abstract normalizeOutput(stdout: string, stderr: string): string;

  /**
   * Parse CLI error into ProviderError
   */
  protected abstract parseError(
    code: number,
    stdout: string,
    stderr: string,
    signal: string | null
  ): ProviderError;

  // ========== Lifecycle Hooks (Optional Override) ==========

  protected async beforeExecute(request: LLMRequest): Promise<void> {
    // Default: do nothing
  }

  protected async afterExecute(response: LLMResponse): Promise<void> {
    // Default: do nothing
  }

  // ========== LLMProvider Implementation ==========

  async send(request: LLMRequest, options: ExecutionOptions = {}): Promise<LLMResponse> {
    const startTime = Date.now();

    // 1. Check CLI availability
    if (!(await this.isAvailable())) {
      throw new ProviderError({
        type: 'NOT_INSTALLED',
        providerId: this.id,
        message: `${this.cliCommand} CLI not found`,
        isRecoverable: true,
        userMessage: `${this.displayName} er ikke installeret`,
        recoverySuggestions: this._getInstallSuggestions()
      });
    }

    // 2. Pre-execution hook
    await this.beforeExecute(request);

    // 3. Build command
    const command = this.buildCommand(request);

    // 4. Execute process
    const result = await this._executeProcess(command, options);

    // 5. Check for errors
    if (!result.success) {
      throw this.parseError(result.code, result.stdout, result.stderr, result.signal);
    }

    // 6. Normalize output
    const content = this.normalizeOutput(result.stdout, result.stderr);

    // 7. Build response
    const response: LLMResponse = {
      message: { role: 'assistant', content },
      usage: this._extractUsage(result.stderr),
      providerMeta: {
        providerId: this.id,
        latencyMs: Date.now() - startTime,
        raw: { stdout: result.stdout, stderr: result.stderr }
      }
    };

    // 8. Post-execution hook
    await this.afterExecute(response);

    return response;
  }

  async isAvailable(): Promise<boolean> {
    // Check if CLI is in PATH
    const platform = process.platform;
    const command = platform === 'win32' ? 'where' : 'which';

    return new Promise((resolve) => {
      const child = spawn(command, [this.cliCommand], { shell: true });
      child.on('exit', (code) => {
        resolve(code === 0);
      });
      child.on('error', () => {
        resolve(false);
      });
    });
  }

  async getVersion(): Promise<string | null> {
    if (!(await this.isAvailable())) {
      return null;
    }

    return new Promise((resolve) => {
      let stdout = '';
      const child = spawn(this.cliCommand, ['--version'], { shell: true });

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.on('exit', (code) => {
        resolve(code === 0 ? stdout.trim() : null);
      });

      child.on('error', () => {
        resolve(null);
      });
    });
  }

  // ========== Private Helpers ==========

  /**
   * Execute CLI process with timeout and cancellation support
   * This is the 350 lines of duplicate code we're eliminating!
   */
  private async _executeProcess(
    command: CLICommand,
    options: ExecutionOptions
  ): Promise<ProcessResult> {
    return new Promise((resolve) => {
      const { timeout = 300000, signal, onProgress } = options;

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let cancelled = false;

      // Spawn process
      const child = spawn(this.cliCommand, command.args, {
        env: { ...process.env, ...command.env },
        cwd: command.cwd,
        shell: true
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
        child.stdin.end(); // Signal EOF
      }

      // Collect stdout
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
        onProgress?.({
          percent: this._estimateProgress(Date.now() - Date.now(), timeout),
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
        options.signal?.removeEventListener('abort', onAbort);

        resolve({
          success: code === 0 && !timedOut && !cancelled,
          code: code || -1,
          stdout,
          stderr,
          signal,
          timedOut,
          cancelled,
          timeoutMs: timedOut ? timeout : undefined
        });
      });

      // Handle spawn errors
      child.on('error', (err) => {
        clearTimeout(timeoutHandle);
        options.signal?.removeEventListener('abort', onAbort);

        resolve({
          success: false,
          code: -1,
          stdout,
          stderr: stderr + err.message,
          signal: null,
          timedOut: false,
          cancelled: false
        });
      });
    });
  }

  /**
   * Kill process gracefully, then forcefully
   */
  private _killProcess(child: ChildProcess): void {
    if (child.killed) return;

    // Try Ctrl+C first
    if (child.stdin && !child.stdin.destroyed) {
      child.stdin.write('\x03');
    }

    // Force kill after 2 seconds
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }, 2000);
  }

  /**
   * Estimate progress (asymptotic curve)
   */
  private _estimateProgress(elapsedMs: number, timeoutMs: number): number {
    const ratio = elapsedMs / timeoutMs;
    return Math.min(95, Math.round(100 * (1 - Math.exp(-3 * ratio))));
  }

  /**
   * Extract usage info from stderr (provider-specific patterns)
   */
  private _extractUsage(stderr: string): UsageInfo | undefined {
    // Override in subclass if provider reports usage
    return undefined;
  }

  /**
   * Get installation suggestions
   */
  private _getInstallSuggestions(): string[] {
    return [`Installer ${this.displayName} CLI`];
  }
}
```

---

## 4. Phase 2: Refactor Claude Adapter

### 4.1 Create ClaudeCLIProvider

**File:** `src/providers/cli/ClaudeCLIProvider.ts`

```typescript
import { BaseCLIProvider, CLICommand } from '../base/BaseCLIProvider';
import { ProviderError } from '../base/ProviderError';
import { LLMRequest, ProviderCapabilities } from '../base/ProviderTypes';

export class ClaudeCLIProvider extends BaseCLIProvider {
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

    // Add system prompt if present
    if (request.context.instructions) {
      args.push('--system-prompt', request.context.instructions);
    }

    // Build user message from conversation
    const userMessage = request.messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');

    return {
      args,
      stdin: userMessage
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

    // AUTH errors
    if (stderrLower.includes('auth') ||
        stderrLower.includes('login') ||
        stderrLower.includes('unauthorized')) {
      return new ProviderError({
        type: 'AUTH',
        providerId: this.id,
        message: 'Authentication required',
        isRecoverable: true,
        userMessage: 'Du skal logge ind først',
        recoverySuggestions: ['Kør "claude login" i din terminal'],
        technicalDetails: { exitCode: code, stderr }
      });
    }

    // Generic error
    return new ProviderError({
      type: 'PROVIDER',
      providerId: this.id,
      message: `CLI failed with exit code ${code}`,
      isRecoverable: false,
      userMessage: 'Claude CLI fejlede',
      recoverySuggestions: [
        'Prøv med en anden provider',
        'Tjek log filen for detaljer'
      ],
      technicalDetails: { exitCode: code, stderr }
    });
  }
}
```

**Result:** 50 lines instead of 459! 🎉

### 4.2 Update analysis-runner.js (Compatibility Layer)

Add support for both old and new providers:

```javascript
// analysis-runner.js

import { createClaudeAdapter } from '../adapters/claude-adapter.js'; // OLD
import { ClaudeCLIProvider } from '../providers/cli/ClaudeCLIProvider.js'; // NEW
// ... other imports

const USE_NEW_PROVIDERS = process.env.USE_NEW_PROVIDERS === 'true';

function getAdapter(provider) {
  if (USE_NEW_PROVIDERS) {
    // NEW provider system
    switch (provider) {
      case 'claude':
        return new ClaudeCLIProvider();
      case 'gemini':
        return new GeminiCLIProvider();
      // ...
    }
  } else {
    // OLD adapter system (backwards compatibility)
    switch (provider) {
      case 'claude':
        return createClaudeAdapter();
      case 'gemini':
        return createGeminiAdapter();
      // ...
    }
  }
}

// Update runAnalysis() to build ProviderContext
async function runAnalysis(options, progressCallback) {
  // ... existing code ...

  const adapter = getAdapter(provider);

  // NEW: Build context from prompt file
  const promptPath = getPromptPath(promptName);
  const instructions = await readFile(promptPath, 'utf8');

  const request = {
    messages: [
      { role: 'user', content: `Please analyze: ${documentContent}` }
    ],
    context: {
      instructions,
      metadata: { promptName, clientName }
    }
  };

  // Execute
  if (USE_NEW_PROVIDERS) {
    const response = await adapter.send(request, {
      timeout,
      signal: abortSignal,
      onProgress: progressCallback
    });
    // ... handle response ...
  } else {
    // OLD code path
    const result = await adapter.execute({
      documentPath,
      systemPromptPath: promptPath,
      timeout
    });
    // ... handle result ...
  }
}
```

### 4.3 Test Both Paths

```bash
# Test OLD path (should still work)
npm run test

# Test NEW path
USE_NEW_PROVIDERS=true npm run test

# Both should pass!
```

---

## 5. Phase 3: Refactor Gemini Adapter

Same process as Claude:

**File:** `src/providers/cli/GeminiCLIProvider.ts`

```typescript
import { BaseCLIProvider, CLICommand } from '../base/BaseCLIProvider';
import { ProviderError } from '../base/ProviderError';
import { LLMRequest, ProviderCapabilities } from '../base/ProviderTypes';

export class GeminiCLIProvider extends BaseCLIProvider {
  readonly id = 'gemini-cli';
  readonly displayName = 'Gemini (Local CLI)';
  readonly capabilities: ProviderCapabilities = {
    streaming: false,
    temperature: true, // Gemini supports temperature
    maxTokens: false,
    systemMessages: true
  };

  protected get cliCommand(): string {
    return 'gemini';
  }

  protected buildCommand(request: LLMRequest): CLICommand {
    const args = [];

    // Gemini CLI doesn't have --system-prompt flag
    // Prepend instructions to user message instead
    const systemAndUser = request.context.instructions
      ? `${request.context.instructions}\n\n---\n\n${request.messages[0].content}`
      : request.messages[0].content;

    return {
      args,
      stdin: systemAndUser
    };
  }

  protected normalizeOutput(stdout: string, stderr: string): string {
    return stdout
      .replace(/\x1b\[[0-9;]*m/g, '') // ANSI codes
      .replace(/\r/g, '') // Carriage returns
      .trim();
  }

  protected parseError(
    code: number,
    stdout: string,
    stderr: string,
    signal: string | null
  ): ProviderError {
    const stderrLower = stderr.toLowerCase();

    if (stderrLower.includes('auth') || stderrLower.includes('login')) {
      return new ProviderError({
        type: 'AUTH',
        providerId: this.id,
        message: 'Authentication required',
        isRecoverable: true,
        userMessage: 'Du skal logge ind først',
        recoverySuggestions: ['Kør "gemini login" i din terminal'],
        technicalDetails: { exitCode: code, stderr }
      });
    }

    return new ProviderError({
      type: 'PROVIDER',
      providerId: this.id,
      message: `CLI failed with exit code ${code}`,
      isRecoverable: false,
      userMessage: 'Gemini CLI fejlede',
      recoverySuggestions: ['Prøv med en anden provider'],
      technicalDetails: { exitCode: code, stderr }
    });
  }
}
```

---

## 6. Phase 4: Cleanup and Finalization

### 6.1 Remove Old Adapters

```bash
# Delete old files
rm src/adapters/claude-adapter.js
rm src/adapters/gemini-adapter.js

# Update imports in analysis-runner.js
# Remove compatibility layer (USE_NEW_PROVIDERS flag)
```

### 6.2 Update analysis-runner.js (Final Version)

```javascript
import { ClaudeCLIProvider } from '../providers/cli/ClaudeCLIProvider.js';
import { GeminiCLIProvider } from '../providers/cli/GeminiCLIProvider.js';
import { readFile } from 'fs/promises';
import { getPromptPath } from '../utils/prompt-loader.js';

// Create provider instances
const PROVIDERS = {
  claude: new ClaudeCLIProvider(),
  gemini: new GeminiCLIProvider()
};

async function runAnalysis(options, progressCallback) {
  const { provider, documentPath, promptName, clientName, timeout } = options;

  // Get provider
  const providerInstance = PROVIDERS[provider];
  if (!providerInstance) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  // Load prompt (context)
  const promptPath = getPromptPath(promptName);
  const instructions = await readFile(promptPath, 'utf8');

  // Load document
  const documentContent = await readFile(documentPath, 'utf8');

  // Build request
  const request = {
    messages: [
      { role: 'user', content: `Please analyze:\n\n${documentContent}` }
    ],
    context: {
      instructions,
      metadata: { promptName, clientName }
    }
  };

  // Create abort controller for cancellation
  const abortController = new AbortController();

  // Execute
  try {
    const response = await providerInstance.send(request, {
      timeout,
      signal: abortController.signal,
      onProgress: progressCallback
    });

    return {
      success: true,
      output: response.message.content,
      provider: response.providerMeta?.providerId,
      executionTime: response.providerMeta?.latencyMs
    };
  } catch (error) {
    if (error instanceof ProviderError) {
      return {
        success: false,
        error: error.message,
        userMessage: error.getUserMessage(),
        recoverySuggestions: error.getRecoverySuggestions(),
        errorCode: error.type
      };
    }
    throw error;
  }
}

// Export cancellation function
export function cancelAnalysis() {
  // Signal abort to current request
  // (implementation depends on how we store abort controller)
}
```

### 6.3 Final Verification

```bash
# Run all tests
npm run test

# Run smoke test
npm run test:smoke

# Run integration test
npm run test:integration

# Build production
npm run build

# All should pass! ✅
```

---

## 7. Code Comparison: Before vs After

### 7.1 Claude Adapter

**Before (`claude-adapter.js`):**
```javascript
// Lines 1-459
export class ClaudeAdapter {
  constructor() {
    this.providerName = 'claude';
    this._currentProcess = null;
    this._isCancelled = false;
  }

  cancel() {
    // 40 lines of process management
  }

  async execute(request) {
    // 200 lines of validation, execution, error handling
  }

  _executeCommand(args, prompt, timeout) {
    // 200 lines of spawn, stdin, stdout, timeout, cancellation
  }

  normalizeOutput(rawOutput) {
    // 20 lines
  }
}
```

**After (`ClaudeCLIProvider.ts`):**
```typescript
// Lines 1-50
export class ClaudeCLIProvider extends BaseCLIProvider {
  readonly id = 'claude-cli';
  readonly displayName = 'Claude (Local CLI)';
  readonly capabilities = { ... };

  protected get cliCommand(): string {
    return 'claude';
  }

  protected buildCommand(request: LLMRequest): CLICommand {
    // 10 lines
  }

  protected normalizeOutput(stdout: string): string {
    // 5 lines
  }

  protected parseError(...): ProviderError {
    // 25 lines
  }
}
```

**Reduction: 459 → 50 lines (89% reduction!)**

---

## 8. Adding OpenAI Provider (Proves Extensibility)

Now that we have the abstraction, adding OpenAI is trivial:

**File:** `src/providers/cli/OpenAICLIProvider.ts`

```typescript
import { BaseCLIProvider, CLICommand } from '../base/BaseCLIProvider';
import { ProviderError } from '../base/ProviderError';
import { LLMRequest, ProviderCapabilities } from '../base/ProviderTypes';

export class OpenAICLIProvider extends BaseCLIProvider {
  readonly id = 'openai-cli';
  readonly displayName = 'OpenAI (Local CLI)';
  readonly capabilities: ProviderCapabilities = {
    streaming: true, // OpenAI CLI supports streaming!
    temperature: true,
    maxTokens: true,
    systemMessages: true
  };

  protected get cliCommand(): string {
    return 'openai';
  }

  protected buildCommand(request: LLMRequest): CLICommand {
    const args = ['chat', 'completions', 'create'];

    // OpenAI CLI uses JSON input
    const messages = [
      { role: 'system', content: request.context.instructions },
      ...request.messages
    ];

    const input = JSON.stringify({
      model: 'gpt-4',
      messages,
      temperature: request.options?.temperature,
      max_tokens: request.options?.maxTokens
    });

    return {
      args,
      stdin: input
    };
  }

  protected normalizeOutput(stdout: string, stderr: string): string {
    // OpenAI CLI returns JSON
    const parsed = JSON.parse(stdout);
    return parsed.choices[0].message.content;
  }

  protected parseError(
    code: number,
    stdout: string,
    stderr: string,
    signal: string | null
  ): ProviderError {
    // Parse OpenAI-specific errors
    if (stderr.includes('invalid_api_key')) {
      return new ProviderError({
        type: 'AUTH',
        providerId: this.id,
        message: 'Invalid API key',
        isRecoverable: true,
        userMessage: 'Ugyldig OpenAI API nøgle',
        recoverySuggestions: ['Sæt OPENAI_API_KEY miljøvariabel']
      });
    }

    // ... other error patterns ...
  }
}
```

**Result: 50 lines for a complete new provider!**

Register it:
```javascript
// analysis-runner.js
const PROVIDERS = {
  claude: new ClaudeCLIProvider(),
  gemini: new GeminiCLIProvider(),
  openai: new OpenAICLIProvider() // ← Added in 5 seconds!
};
```

---

## 9. Migration Checklist

### Phase 1: Foundation
- [ ] Create `src/providers/base/ProviderTypes.ts`
- [ ] Create `src/providers/base/ProviderError.ts`
- [ ] Create `src/providers/base/LLMProvider.ts`
- [ ] Create `src/providers/base/BaseCLIProvider.ts`
- [ ] Write unit tests for ProviderError
- [ ] Write unit tests for BaseCLIProvider (mocked processes)

### Phase 2: Claude Migration
- [ ] Create `src/providers/cli/ClaudeCLIProvider.ts`
- [ ] Add compatibility layer to analysis-runner.js
- [ ] Test old path (USE_NEW_PROVIDERS=false)
- [ ] Test new path (USE_NEW_PROVIDERS=true)
- [ ] Verify all existing tests pass

### Phase 3: Gemini Migration
- [ ] Create `src/providers/cli/GeminiCLIProvider.ts`
- [ ] Update analysis-runner.js compatibility layer
- [ ] Test both providers with new system
- [ ] Verify smoke test passes

### Phase 4: Cleanup
- [ ] Remove old adapter files
- [ ] Remove compatibility layer from analysis-runner.js
- [ ] Update all imports
- [ ] Run full test suite
- [ ] Update documentation (README, USAGE.md)
- [ ] Git commit with message "feat: provider abstraction complete"

### Phase 5: Validation
- [ ] Add OpenAI provider (proves extensibility)
- [ ] Run integration tests
- [ ] Run E2E tests with real CLIs
- [ ] Verify code reduction (should be ~50%)
- [ ] Update HISTORY.md with migration notes

---

## 10. Rollback Plan

If something goes wrong:

### Emergency Rollback
```bash
# Revert to before migration
git revert <migration-commit-hash>

# Or reset to pre-migration state
git reset --hard <commit-before-migration>
```

### Gradual Rollback
```bash
# Re-enable old adapters
git checkout <old-commit> -- src/adapters/

# Use compatibility layer
USE_NEW_PROVIDERS=false npm start
```

---

## 11. Success Criteria

✅ **Code Reduction:** ≥50% (909 → ~455 lines)
✅ **Zero Duplication:** No shared logic between providers
✅ **Easy Extension:** New provider in ≤100 lines
✅ **All Tests Pass:** Unit, integration, E2E
✅ **No Regressions:** Existing features work unchanged
✅ **Type Safety:** Full TypeScript support
✅ **Error Consistency:** Same error types across providers

---

## 12. Timeline

**Total: 16 hours over 3-4 days**

**Day 1 (8 hours):**
- Phase 1: Foundation (8 hours)
- Git commit: "feat: add provider abstraction foundation"

**Day 2 (4 hours):**
- Phase 2: Claude migration (4 hours)
- Git commit: "feat: migrate Claude to new provider system"

**Day 3 (3 hours):**
- Phase 3: Gemini migration (3 hours)
- Git commit: "feat: migrate Gemini to new provider system"

**Day 4 (1 hour):**
- Phase 4: Cleanup (1 hour)
- Git commit: "feat: complete provider abstraction migration"

---

## 13. Post-Migration Opportunities

With the abstraction in place, we can now easily:

1. **Add API Providers** (Claude API, OpenAI API)
   - ~100 lines each
   - Use `fetch()` instead of `spawn()`
   - Same `LLMProvider` interface

2. **Add HTTP Session Providers** (Gemini Web, Claude Web)
   - ~200 lines each
   - Use Playwright/Puppeteer
   - Same error handling

3. **Add Local Models** (Ollama, LM Studio)
   - ~50 lines each
   - Extend BaseCLIProvider
   - Free inference!

4. **Mock for Testing**
   - Create `MockProvider` that returns canned responses
   - Test app without real CLIs

5. **Provider Registry**
   - Auto-detect available providers
   - Fallback logic (try Claude → Gemini → OpenAI)
   - User preferences

---

## Status

**Implementation Status:** 🟡 **READY TO START**

**Estimated Effort:** 16 hours
- Phase 1: 8 hours
- Phase 2: 4 hours
- Phase 3: 3 hours
- Phase 4: 1 hour

**Risk Level:** 🟡 **Medium**
- Large refactoring
- But we have comprehensive tests
- And compatibility layer for safe migration

**Dependencies:**
- None! Can start immediately

---

## References

- Main spec: `provider-abstraction.spec.md`
- CLI pattern: `provider-abstraction-cli-pattern.spec.md`
- Error mapping: `provider-abstraction-error-mapping.spec.md`
- Testing guide: `provider-abstraction-testing.spec.md`
- Current adapters: `src/adapters/claude-adapter.js`, `src/adapters/gemini-adapter.js`
