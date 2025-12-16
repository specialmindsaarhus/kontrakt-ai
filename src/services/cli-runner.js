import { ClaudeAdapter } from '../adapters/claude-adapter.js';
import { existsSync, statSync } from 'fs';
import path from 'path';

/**
 * Validate a CLI request object
 * @param {CLIRequest} request
 * @throws {Error} If validation fails
 */
function validateCLIRequest(request) {
  // Validate provider
  if (!request.provider) {
    throw new Error('Provider is required');
  }
  const validProviders = ['claude', 'gemini', 'openai'];
  if (!validProviders.includes(request.provider)) {
    throw new Error(`Invalid provider: ${request.provider}. Must be one of: ${validProviders.join(', ')}`);
  }

  // Validate document path
  if (!request.documentPath) {
    throw new Error('Document path is required');
  }
  if (!existsSync(request.documentPath)) {
    throw new Error(`Document file not found: ${request.documentPath}`);
  }
  if (!statSync(request.documentPath).isFile()) {
    throw new Error(`Document path must be a file: ${request.documentPath}`);
  }

  // Validate system prompt path
  if (!request.systemPromptPath) {
    throw new Error('System prompt path is required');
  }
  if (!existsSync(request.systemPromptPath)) {
    throw new Error(`System prompt file not found: ${request.systemPromptPath}`);
  }
  if (!statSync(request.systemPromptPath).isFile()) {
    throw new Error(`System prompt path must be a file: ${request.systemPromptPath}`);
  }

  // Validate reference path if provided
  if (request.referencePath) {
    if (!existsSync(request.referencePath)) {
      throw new Error(`Reference path not found: ${request.referencePath}`);
    }
    if (!statSync(request.referencePath).isDirectory()) {
      throw new Error(`Reference path must be a directory: ${request.referencePath}`);
    }
  }

  // Validate timeout if provided
  if (request.timeout !== undefined) {
    if (typeof request.timeout !== 'number' || request.timeout <= 0) {
      throw new Error('Timeout must be a positive number');
    }
  }
}

/**
 * Get the appropriate CLI adapter for the provider
 * @param {string} provider - Provider name ('claude', 'gemini', 'openai')
 * @returns {CLIAdapter} The adapter instance
 * @throws {Error} If provider is not supported
 */
function getAdapter(provider) {
  switch (provider) {
    case 'claude':
      return new ClaudeAdapter();
    case 'gemini':
      // TODO: Implement GeminiAdapter in future phase
      throw new Error('Gemini adapter not yet implemented');
    case 'openai':
      // TODO: Implement OpenAIAdapter in future phase
      throw new Error('OpenAI adapter not yet implemented');
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Execute a CLI command using the specified provider
 * @param {CLIRequest} request - The CLI request configuration
 * @returns {Promise<CLIResult>} The result of the CLI execution
 */
export async function runCLI(request) {
  const startTime = Date.now();

  try {
    // Validate request
    validateCLIRequest(request);

    // Get appropriate adapter
    const adapter = getAdapter(request.provider);

    // Execute CLI command
    const result = await adapter.execute(request);

    return result;
  } catch (error) {
    // Return error result if validation or adapter creation fails
    return {
      success: false,
      provider: request.provider || 'unknown',
      error: error.message,
      errorCode: 'INVALID_REQUEST',
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * Check if a provider is available before attempting to run
 * @param {string} provider - Provider name
 * @returns {Promise<boolean>}
 */
export async function isProviderAvailable(provider) {
  try {
    const adapter = getAdapter(provider);
    return await adapter.isAvailable();
  } catch (error) {
    return false;
  }
}

/**
 * Get provider version
 * @param {string} provider - Provider name
 * @returns {Promise<string|null>}
 */
export async function getProviderVersion(provider) {
  try {
    const adapter = getAdapter(provider);
    return await adapter.getVersion();
  } catch (error) {
    return null;
  }
}

/**
 * Run CLI with automatic provider selection (use first available)
 * @param {Omit<CLIRequest, 'provider'>} request - Request without provider
 * @returns {Promise<CLIResult>}
 */
export async function runCLIAuto(request) {
  // Try providers in order of preference
  const providers = ['claude', 'gemini', 'openai'];

  for (const provider of providers) {
    try {
      const adapter = getAdapter(provider);
      const isAvailable = await adapter.isAvailable();

      if (isAvailable) {
        return await runCLI({
          ...request,
          provider
        });
      }
    } catch (error) {
      // Skip to next provider
      continue;
    }
  }

  // No providers available
  return {
    success: false,
    provider: 'none',
    error: 'No CLI providers available. Please install Claude CLI, Gemini CLI, or OpenAI CLI.',
    errorCode: 'CLI_NOT_FOUND',
    executionTime: 0
  };
}
