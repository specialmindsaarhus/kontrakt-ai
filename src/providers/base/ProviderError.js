/**
 * @fileoverview Standardized error class for all LLM providers
 * Provides consistent error handling with user-friendly Danish messages
 */

/**
 * @typedef {'CONFIG' | 'AUTH' | 'NOT_INSTALLED' | 'RATE_LIMIT' | 'QUOTA_EXCEEDED' | 'CONTEXT_LENGTH' | 'NETWORK' | 'TIMEOUT' | 'PROVIDER' | 'MODEL_OVERLOADED' | 'CANCELLED' | 'UNKNOWN'} ProviderErrorType
 */

/**
 * @typedef {Object} ProviderErrorOptions
 * @property {ProviderErrorType} type - Error classification
 * @property {string} providerId - Provider that threw the error (e.g., 'claude-cli')
 * @property {string} message - Technical message for developers (English)
 * @property {boolean} isRecoverable - Can the user potentially fix this error?
 * @property {string} userMessage - User-friendly message (Danish)
 * @property {string[]} [recoverySuggestions] - Actionable recovery suggestions (Danish)
 * @property {Object} [technicalDetails] - Technical details (for logging, never shown to users)
 * @property {Error} [cause] - Original error that caused this (if wrapped)
 */

/**
 * Standardized error thrown by all LLM providers
 * Extends Error for stack traces and standard error handling
 */
export class ProviderError extends Error {
  /**
   * @param {ProviderErrorOptions} options
   */
  constructor(options) {
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
   * @returns {string}
   */
  getUserMessage() {
    return this.userMessage;
  }

  /**
   * Get recovery suggestions
   * @returns {string[]}
   */
  getRecoverySuggestions() {
    return this.recoverySuggestions;
  }

  /**
   * Format for logging
   * @returns {Object}
   */
  toJSON() {
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

/**
 * Factory for creating common ProviderErrors
 * Ensures consistent error messages across the app
 */
export class ProviderErrorFactory {
  /**
   * Get provider display name
   * @param {string} providerId
   * @returns {string}
   */
  static getProviderDisplayName(providerId) {
    const names = {
      'claude-cli': 'Claude CLI',
      'gemini-cli': 'Gemini CLI',
      'openai-cli': 'OpenAI CLI',
      'claude-api': 'Claude API'
    };
    return names[providerId] || providerId;
  }

  /**
   * Get authentication suggestions for specific provider
   * @param {string} providerId
   * @returns {string[]}
   */
  static getAuthSuggestions(providerId) {
    switch (providerId) {
      case 'claude-cli':
        return [
          'Kør "claude login" i din terminal',
          'Tjek at du har en gyldig Claude abonnement'
        ];
      case 'gemini-cli':
        return [
          'Kør "gemini login" i din terminal',
          'Sørg for at du har adgang til Gemini'
        ];
      case 'openai-cli':
        return [
          'Kør "openai login" i din terminal',
          'Tjek at din OpenAI API nøgle er gyldig'
        ];
      case 'claude-api':
        return [
          'Sæt ANTHROPIC_API_KEY miljøvariabel',
          'Få en API nøgle fra https://console.anthropic.com'
        ];
      default:
        return ['Log ind med din provider'];
    }
  }

  /**
   * Get installation suggestions for specific provider
   * @param {string} providerId
   * @returns {string[]}
   */
  static getInstallSuggestions(providerId) {
    switch (providerId) {
      case 'claude-cli':
        return [
          'Installer Claude CLI: npm install -g @anthropic-ai/claude-cli',
          'Se mere på: https://claude.ai/cli'
        ];
      case 'gemini-cli':
        return [
          'Installer Gemini CLI: npm install -g @google/generative-ai-cli',
          'Se mere på: https://gemini.google.com/cli'
        ];
      case 'openai-cli':
        return [
          'Installer OpenAI CLI: pip install openai',
          'Se mere på: https://platform.openai.com/docs/api-reference'
        ];
      default:
        return ['Installer CLI værktøjet for din provider'];
    }
  }

  /**
   * Create NOT_INSTALLED error
   * @param {string} providerId
   * @returns {ProviderError}
   */
  static notInstalled(providerId) {
    return new ProviderError({
      type: 'NOT_INSTALLED',
      providerId,
      message: `${providerId} CLI not found`,
      isRecoverable: true,
      userMessage: `${this.getProviderDisplayName(providerId)} er ikke installeret`,
      recoverySuggestions: this.getInstallSuggestions(providerId)
    });
  }

  /**
   * Create AUTH error
   * @param {string} providerId
   * @param {Object} [technicalDetails]
   * @returns {ProviderError}
   */
  static authRequired(providerId, technicalDetails) {
    return new ProviderError({
      type: 'AUTH',
      providerId,
      message: 'Authentication required',
      isRecoverable: true,
      userMessage: 'Du skal logge ind først',
      recoverySuggestions: this.getAuthSuggestions(providerId),
      technicalDetails
    });
  }

  /**
   * Create TIMEOUT error
   * @param {string} providerId
   * @param {number} timeoutMs
   * @returns {ProviderError}
   */
  static timeout(providerId, timeoutMs) {
    return new ProviderError({
      type: 'TIMEOUT',
      providerId,
      message: `Request timed out after ${timeoutMs}ms`,
      isRecoverable: true,
      userMessage: 'Anmodningen tog for lang tid',
      recoverySuggestions: [
        'Prøv igen med et kortere dokument',
        'Øg timeout i indstillinger'
      ],
      technicalDetails: { timeoutMs }
    });
  }

  /**
   * Create CANCELLED error
   * @param {string} providerId
   * @returns {ProviderError}
   */
  static cancelled(providerId) {
    return new ProviderError({
      type: 'CANCELLED',
      providerId,
      message: 'Request was cancelled',
      isRecoverable: false,
      userMessage: 'Analysen blev afbrudt',
      recoverySuggestions: []
    });
  }

  /**
   * Create NETWORK error
   * @param {string} providerId
   * @param {Error} [cause]
   * @returns {ProviderError}
   */
  static networkError(providerId, cause) {
    return new ProviderError({
      type: 'NETWORK',
      providerId,
      message: 'Network request failed',
      isRecoverable: true,
      userMessage: 'Kunne ikke oprette forbindelse',
      recoverySuggestions: [
        'Tjek din internetforbindelse',
        'Prøv igen om et øjeblik'
      ],
      cause,
      technicalDetails: cause ? { errorMessage: cause.message } : undefined
    });
  }
}
