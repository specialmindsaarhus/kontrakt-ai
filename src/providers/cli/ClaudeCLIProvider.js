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
   * @param {import('../base/BaseCLIProvider.js').ProcessResult} result
   * @returns {import('../base/ProviderError.js').ProviderError}
   */
  parseError(result) {
    // Use default error mapping with full ProcessResult (preserves cancelled/timedOut flags)
    return CLIErrorMapper.map(this.id, result);
  }
}
