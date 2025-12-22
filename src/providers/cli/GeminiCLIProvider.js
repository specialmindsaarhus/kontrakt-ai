/**
 * @fileoverview Gemini CLI Provider
 * Implements Gemini-specific CLI logic (~55 lines instead of 450!)
 */

import { BaseCLIProvider } from '../base/BaseCLIProvider.js';
import { CLIErrorMapper } from '../base/CLIErrorMapper.js';

/**
 * Gemini CLI Provider
 * Extends BaseCLIProvider with Gemini-specific command building
 */
export class GeminiCLIProvider extends BaseCLIProvider {
  /** @type {string} */
  get id() {
    return 'gemini-cli';
  }

  /** @type {string} */
  get displayName() {
    return 'Gemini (Local CLI)';
  }

  /** @type {import('../base/BaseCLIProvider.js').ProviderCapabilities} */
  get capabilities() {
    return {
      streaming: false,
      temperature: true, // Gemini supports temperature
      maxTokens: false,
      systemMessages: true
    };
  }

  /** @protected */
  get cliCommand() {
    return 'gemini';
  }

  /**
   * Build Gemini CLI command
   * @protected
   * @param {import('../base/BaseCLIProvider.js').LLMRequest} request
   * @returns {import('../base/BaseCLIProvider.js').CLICommand}
   */
  buildCommand(request) {
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

  /**
   * Normalize Gemini CLI output
   * @protected
   * @param {string} stdout
   * @param {string} _stderr
   * @returns {string}
   */
  normalizeOutput(stdout, _stderr) {
    return (
      stdout
        .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes
        .replace(/\r/g, '') // Remove carriage returns
        .trim()
    );
  }

  /**
   * Parse Gemini CLI error
   * @protected
   * @param {import('../base/BaseCLIProvider.js').ProcessResult} result
   * @returns {import('../base/ProviderError.js').ProviderError}
   */
  parseError(result) {
    // Use default error mapping with full ProcessResult (preserves cancelled/timedOut flags)
    return CLIErrorMapper.map(this.id, result);
  }
}
