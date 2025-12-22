/**
 * @fileoverview Adapter bridge for legacy analysis-runner compatibility
 * Wraps new LLMProvider interface to match old adapter interface
 */

import { readFile } from 'fs/promises';

/**
 * Bridges new LLMProvider to legacy adapter interface
 * Allows analysis-runner to use new providers without changes
 */
export class LegacyAdapterBridge {
  /**
   * @param {import('./base/BaseCLIProvider.js').BaseCLIProvider} provider
   */
  constructor(provider) {
    this._provider = provider;
    this._abortController = null;

    // Expose properties expected by legacy code
    this.providerName = provider.id.replace('-cli', ''); // 'claude-cli' -> 'claude'
  }

  /**
   * Check if CLI is available (legacy interface)
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return this._provider.isAvailable();
  }

  /**
   * Get CLI version (legacy interface)
   * @returns {Promise<string | null>}
   */
  async getVersion() {
    return this._provider.getVersion();
  }

  /**
   * Cancel running analysis (legacy interface)
   * @returns {boolean}
   */
  cancel() {
    if (this._abortController) {
      this._abortController.abort();
      return true;
    }
    return false;
  }

  /**
   * Execute analysis (legacy interface)
   * @param {Object} request
   * @param {string} request.documentPath
   * @param {string} request.systemPromptPath
   * @param {number} [request.timeout]
   * @param {string} [request.referencePath]
   * @returns {Promise<Object>}
   */
  async execute(request) {
    const startTime = Date.now();

    try {
      // Read files to build LLMRequest
      const [documentContent, systemPrompt] = await Promise.all([
        readFile(request.documentPath, 'utf8'),
        readFile(request.systemPromptPath, 'utf8')
      ]);

      // Build new-style LLMRequest
      const llmRequest = {
        messages: [
          {
            role: 'user',
            content: `Please analyze the following document:\n\n${documentContent}`
          }
        ],
        context: {
          instructions: systemPrompt,
          metadata: {
            documentPath: request.documentPath,
            promptPath: request.systemPromptPath
          }
        }
      };

      // Create AbortController for cancellation (Node.js global)
      // eslint-disable-next-line no-undef
      this._abortController = new AbortController();

      // Execute with new provider
      const response = await this._provider.send(llmRequest, {
        timeout: request.timeout || 300000,
        signal: this._abortController.signal
      });

      // Map to legacy response format
      return {
        success: true,
        provider: this.providerName,
        output: response.message.content,
        executionTime: Date.now() - startTime,
        cliVersion: await this._provider.getVersion(),
        rawStdout: response.providerMeta?.raw?.stdout || response.message.content,
        rawStderr: response.providerMeta?.raw?.stderr || ''
      };
    } catch (error) {
      // Map ProviderError to legacy error format
      if (error.name === 'ProviderError') {
        return {
          success: false,
          provider: this.providerName,
          error: error.userMessage,
          errorCode: error.type,
          executionTime: Date.now() - startTime,
          rawStdout: error.technicalDetails?.stdout || '',
          rawStderr: error.technicalDetails?.stderr || ''
        };
      }

      // Generic error
      return {
        success: false,
        provider: this.providerName,
        error: error.message,
        errorCode: 'UNKNOWN',
        executionTime: Date.now() - startTime
      };
    } finally {
      this._abortController = null;
    }
  }
}
