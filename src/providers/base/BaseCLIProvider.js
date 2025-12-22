/**
 * @fileoverview Base class for all CLI-based LLM providers
 * Handles process lifecycle, I/O, timeouts, cancellation, and error normalization
 */

import { spawn } from 'child_process';
import { ProviderErrorFactory } from './ProviderError.js';

/**
 * @typedef {Object} Message
 * @property {'system' | 'user' | 'assistant'} role
 * @property {string} content
 */

/**
 * @typedef {Object} ProviderContext
 * @property {string} instructions - Combined instruction text (from prompt files, system instructions)
 * @property {Object.<string, string>} [metadata] - Optional metadata for logging
 */

/**
 * @typedef {Object} ProviderOptions
 * @property {number} [temperature]
 * @property {number} [maxTokens]
 * @property {boolean} [stream]
 */

/**
 * @typedef {Object} LLMRequest
 * @property {Message[]} messages
 * @property {ProviderContext} context
 * @property {ProviderOptions} [options]
 */

/**
 * @typedef {Object} UsageInfo
 * @property {number} [inputTokens]
 * @property {number} [outputTokens]
 * @property {number} [totalTokens]
 */

/**
 * @typedef {Object} ProviderMeta
 * @property {string} providerId
 * @property {string} [model]
 * @property {number} [latencyMs]
 * @property {*} [raw]
 */

/**
 * @typedef {Object} LLMResponse
 * @property {Message} message
 * @property {UsageInfo} [usage]
 * @property {ProviderMeta} [providerMeta]
 */

/**
 * @typedef {Object} ProviderCapabilities
 * @property {boolean} streaming
 * @property {boolean} temperature
 * @property {boolean} maxTokens
 * @property {boolean} systemMessages
 */

/**
 * @typedef {Object} ProgressUpdate
 * @property {number} percent - Estimated progress (0-100)
 * @property {string} stage - Current stage description
 * @property {{stdin: number, stdout: number}} [bytes] - Bytes written/read
 */

/**
 * @callback ProgressCallback
 * @param {ProgressUpdate} progress
 */

/**
 * @typedef {Object} ExecutionOptions
 * @property {number} [timeout] - Maximum execution time in milliseconds (default: 300000)
 * @property {AbortSignal} [signal] - Cancellation token
 * @property {ProgressCallback} [onProgress] - Progress callback
 */

/**
 * @typedef {Object} CLICommand
 * @property {string[]} args - CLI arguments
 * @property {string | null} stdin - Content to write to stdin
 * @property {Object.<string, string>} [env] - Environment variables
 * @property {string} [cwd] - Working directory
 */

/**
 * @typedef {Object} ProcessResult
 * @property {boolean} success
 * @property {number} code
 * @property {string} stdout
 * @property {string} stderr
 * @property {string | null} signal
 * @property {boolean} timedOut
 * @property {boolean} cancelled
 * @property {number} [timeoutMs]
 */

/**
 * Base class for all CLI-based LLM providers
 * Handles all common process management logic
 *
 * @abstract
 */
export class BaseCLIProvider {
  constructor() {
    /** @type {boolean | null} */
    this._isAvailableCache = null;

    /** @type {string | null} */
    this._versionCache = null;

    if (new.target === BaseCLIProvider) {
      throw new Error('BaseCLIProvider is abstract and cannot be instantiated directly');
    }
  }

  // ========== Abstract Properties (Subclass Must Provide) ==========

  /**
   * Unique provider identifier (e.g., 'claude-cli', 'gemini-cli')
   * @abstract
   * @returns {string}
   */
  get id() {
    throw new Error('Subclass must implement id getter');
  }

  /**
   * Human-readable name (e.g., 'Claude (Local CLI)')
   * @abstract
   * @returns {string}
   */
  get displayName() {
    throw new Error('Subclass must implement displayName getter');
  }

  /**
   * Provider capabilities (what features it supports)
   * @abstract
   * @returns {ProviderCapabilities}
   */
  get capabilities() {
    throw new Error('Subclass must implement capabilities getter');
  }

  /**
   * CLI command name (e.g., 'claude', 'gemini', 'ollama')
   * @abstract
   * @protected
   * @returns {string}
   */
  get cliCommand() {
    throw new Error('Subclass must implement cliCommand getter');
  }

  // ========== Abstract Methods (Subclass Must Implement) ==========

  /**
   * Build CLI command from request
   * This is where provider-specific logic lives
   *
   * @abstract
   * @protected
   * @param {LLMRequest} _request
   * @returns {CLICommand}
   */
  buildCommand(_request) {
    throw new Error('Subclass must implement buildCommand()');
  }

  /**
   * Normalize raw CLI output to clean response
   * Remove ANSI codes, CLI headers, metadata, etc.
   *
   * @abstract
   * @protected
   * @param {string} _stdout
   * @param {string} _stderr
   * @returns {string}
   */
  normalizeOutput(_stdout, _stderr) {
    throw new Error('Subclass must implement normalizeOutput()');
  }

  /**
   * Parse CLI error into ProviderError
   * @abstract
   * @protected
   * @param {number} _code - Exit code
   * @param {string} _stdout
   * @param {string} _stderr
   * @param {string | null} _signal
   * @returns {import('./ProviderError.js').ProviderError}
   */
  parseError(_code, _stdout, _stderr, _signal) {
    throw new Error('Subclass must implement parseError()');
  }

  // ========== Lifecycle Hooks (Optional Override) ==========

  /**
   * Called before spawning process (validation, logging, etc.)
   * @protected
   * @param {LLMRequest} _request
   * @returns {Promise<void>}
   */
  async beforeExecute(_request) {
    // Default: do nothing
  }

  /**
   * Called after successful execution (cleanup, caching, etc.)
   * @protected
   * @param {LLMResponse} _response
   * @returns {Promise<void>}
   */
  async afterExecute(_response) {
    // Default: do nothing
  }

  // ========== LLMProvider Implementation ==========

  /**
   * Send a request to the LLM provider
   * @param {LLMRequest} request
   * @param {ExecutionOptions} [options]
   * @returns {Promise<LLMResponse>}
   * @throws {ProviderError} Normalized error with user-friendly message
   */
  async send(request, options = {}) {
    const startTime = Date.now();

    // 1. Check CLI availability
    if (!(await this.isAvailable())) {
      throw ProviderErrorFactory.notInstalled(this.id);
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
    const response = {
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

  /**
   * Check if CLI is installed and accessible
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    if (this._isAvailableCache !== null) {
      return this._isAvailableCache;
    }

    // Check if CLI is in PATH
    const platform = process.platform;
    const command = platform === 'win32' ? 'where' : 'which';

    return new Promise((resolve) => {
      const child = spawn(command, [this.cliCommand], { shell: true });

      child.on('exit', (code) => {
        this._isAvailableCache = code === 0;
        resolve(code === 0);
      });

      child.on('error', () => {
        this._isAvailableCache = false;
        resolve(false);
      });
    });
  }

  /**
   * Get CLI version string
   * @returns {Promise<string | null>}
   */
  async getVersion() {
    if (this._versionCache !== null) {
      return this._versionCache;
    }

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
        this._versionCache = code === 0 ? stdout.trim() : null;
        resolve(this._versionCache);
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
   *
   * @private
   * @param {CLICommand} command
   * @param {ExecutionOptions} options
   * @returns {Promise<ProcessResult>}
   */
  async _executeProcess(command, options) {
    return new Promise((resolve) => {
      const { timeout = 300000, signal, onProgress } = options;
      const startTime = Date.now();

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

      if (signal) {
        signal.addEventListener('abort', onAbort);
      }

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

        if (onProgress) {
          onProgress({
            percent: this._estimateProgress(Date.now() - startTime, timeout),
            stage: 'processing',
            bytes: { stdin: command.stdin?.length || 0, stdout: stdout.length }
          });
        }
      });

      // Collect stderr
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      // Handle completion
      child.on('exit', (code, exitSignal) => {
        clearTimeout(timeoutHandle);

        if (signal) {
          signal.removeEventListener('abort', onAbort);
        }

        resolve({
          success: code === 0 && !timedOut && !cancelled,
          code: code || -1,
          stdout,
          stderr,
          signal: exitSignal,
          timedOut,
          cancelled,
          timeoutMs: timedOut ? timeout : undefined
        });
      });

      // Handle spawn errors
      child.on('error', (err) => {
        clearTimeout(timeoutHandle);

        if (signal) {
          signal.removeEventListener('abort', onAbort);
        }

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
   * @private
   * @param {import('child_process').ChildProcess} child
   */
  _killProcess(child) {
    if (child.killed) return;

    // Try Ctrl+C first (graceful)
    // Check if stdin is writable (not ended or destroyed)
    if (child.stdin && !child.stdin.destroyed && child.stdin.writable) {
      try {
        child.stdin.write('\x03'); // Ctrl+C
      } catch (_err) {
        // Ignore write errors (stream might have closed)
      }
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
   *
   * @private
   * @param {number} elapsedMs
   * @param {number} timeoutMs
   * @returns {number} Progress percentage (0-95, never 100 until complete)
   */
  _estimateProgress(elapsedMs, timeoutMs) {
    const ratio = elapsedMs / timeoutMs;
    // Asymptotic function: 100 * (1 - e^(-3*ratio))
    // Reaches ~95% at ratio=1.0 (never shows 100% until complete)
    return Math.min(95, Math.round(100 * (1 - Math.exp(-3 * ratio))));
  }

  /**
   * Extract usage info from stderr (provider-specific patterns)
   * Override in subclass if provider reports usage
   *
   * @private
   * @param {string} _stderr
   * @returns {UsageInfo | undefined}
   */
  _extractUsage(_stderr) {
    // Default: no usage extraction
    return undefined;
  }
}
