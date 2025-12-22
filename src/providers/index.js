/**
 * @fileoverview Provider factory functions
 * Creates provider instances wrapped for compatibility with analysis-runner
 */

import { ClaudeCLIProvider } from './cli/ClaudeCLIProvider.js';
import { GeminiCLIProvider } from './cli/GeminiCLIProvider.js';
import { LegacyAdapterBridge } from './LegacyAdapterBridge.js';

/**
 * Create Claude CLI adapter (compatible with legacy interface)
 * @returns {LegacyAdapterBridge}
 */
export function createClaudeProvider() {
  const provider = new ClaudeCLIProvider();
  return new LegacyAdapterBridge(provider);
}

/**
 * Create Gemini CLI adapter (compatible with legacy interface)
 * @returns {LegacyAdapterBridge}
 */
export function createGeminiProvider() {
  const provider = new GeminiCLIProvider();
  return new LegacyAdapterBridge(provider);
}

/**
 * Get provider by name
 * @param {string} providerName - 'claude', 'gemini', etc.
 * @returns {LegacyAdapterBridge}
 */
export function getProvider(providerName) {
  switch (providerName.toLowerCase()) {
    case 'claude':
      return createClaudeProvider();
    case 'gemini':
      return createGeminiProvider();
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

// Export providers directly for advanced usage
export { ClaudeCLIProvider } from './cli/ClaudeCLIProvider.js';
export { GeminiCLIProvider } from './cli/GeminiCLIProvider.js';
export { BaseCLIProvider } from './base/BaseCLIProvider.js';
export { ProviderError, ProviderErrorFactory } from './base/ProviderError.js';
export { CLIErrorMapper } from './base/CLIErrorMapper.js';
export { LegacyAdapterBridge } from './LegacyAdapterBridge.js';
