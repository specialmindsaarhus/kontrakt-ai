/**
 * @fileoverview Claude CLI Provider
 * Implements Claude-specific CLI logic (~50 lines instead of 459!)
 */

import { BaseCLIProvider } from '../base/BaseCLIProvider.js';
import { CLIErrorMapper } from '../base/CLIErrorMapper.js';

/**
 * Claude CLI Provider
 * Extends BaseCLIProvider with Claude-specific command building
 */
export class ClaudeCLIProvider extends BaseCLIProvider {
  /** @type {string} */
  get id() {
    return 'claude-cli';
  }

  /** @type {string} */
  get displayName() {
    return 'Claude (Local CLI)';
  }

  /** @type {import('../base/BaseCLIProvider.js').ProviderCapabilities} */
  get capabilities() {
    return {
      streaming: false,
      temperature: false,
      maxTokens: false,
      systemMessages: true
    };
  }

  /** @protected */
  get cliCommand() {
    return 'claude';
  }

  /**
   * Build Claude CLI command
   * @protected
   * @param {import('../base/BaseCLIProvider.js').LLMRequest} request
   * @returns {import('../base/BaseCLIProvider.js').CLICommand}
   */
  buildCommand(request) {
    const args = ['--print'];

    // Add system prompt if present in context
    if (request.context.instructions) {
      args.push('--system-prompt', request.context.instructions);
    }

    // Build user message from conversation history
    const userMessage = request.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n\n');

    return {
      args,
      stdin: userMessage,
      env: {} // No special env vars needed
    };
  }

  /**
   * Normalize Claude CLI output
   * @protected
   * @param {string} stdout
   * @param {string} _stderr
   * @returns {string}
   */
  normalizeOutput(stdout, _stderr) {
    return (
      stdout
        .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes
        .trim()
    );
  }

  /**
   * Parse Claude CLI error
   * @protected
   * @param {number} code
   * @param {string} stdout
   * @param {string} stderr
   * @param {string | null} signal
   * @returns {import('../base/ProviderError.js').ProviderError}
   */
  parseError(code, stdout, stderr, signal) {
    // Use default error mapping
    return CLIErrorMapper.map(this.id, {
      success: false,
      code,
      stdout,
      stderr,
      signal,
      timedOut: false,
      cancelled: false
    });
  }
}
