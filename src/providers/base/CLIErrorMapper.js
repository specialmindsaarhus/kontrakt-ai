/**
 * @fileoverview Maps CLI execution results to standardized ProviderErrors
 * Provides pattern matching for common error scenarios
 */

import { ProviderError, ProviderErrorFactory } from './ProviderError.js';

/**
 * @typedef {import('./BaseCLIProvider.js').ProcessResult} ProcessResult
 */

// ========== Error Pattern Definitions ==========

/** @type {RegExp[]} AUTH error patterns */
const AUTH_PATTERNS = [
  /\bauth/i,
  /\blogin\b/i,
  /\bunauthorized\b/i,
  /\bunauthenticated\b/i,
  /\binvalid\s+credentials\b/i,
  /\bapi\s+key\b/i,
  /\btoken\s+expired\b/i,
  /please\s+run\s+["']?\w+\s+login["']?/i,
  /not\s+logged\s+in/i,
  /authentication\s+required/i,
  /sign\s+in\s+required/i
];

/** @type {RegExp[]} NOT_INSTALLED error patterns */
const NOT_INSTALLED_PATTERNS = [
  // Unix-style
  /command\s+not\s+found/i,
  /\bno\s+such\s+file\s+or\s+directory\b/i,
  // Windows-style
  /is\s+not\s+recognized\s+as\s+an\s+internal\s+or\s+external\s+command/i,
  /'\w+'\s+is\s+not\s+recognized/i,
  // General
  /\bnot\s+installed\b/i,
  /\bcannot\s+find\s+command\b/i
];

/** @type {RegExp[]} RATE_LIMIT error patterns */
const RATE_LIMIT_PATTERNS = [
  /rate\s+limit/i,
  /too\s+many\s+requests/i,
  /\b429\b/,
  /quota\s+exceeded/i,
  /request\s+limit/i,
  /throttle/i
];

/** @type {RegExp[]} CONTEXT_LENGTH error patterns */
const CONTEXT_LENGTH_PATTERNS = [
  /context\s+length/i,
  /too\s+long/i,
  /exceeds\s+maximum/i,
  /input\s+too\s+large/i,
  /token\s+limit/i,
  /maximum\s+tokens/i
];

/** @type {RegExp[]} NETWORK error patterns */
const NETWORK_PATTERNS = [
  /network\s+error/i,
  /connection\s+refused/i,
  /connection\s+timeout/i,
  /connection\s+failed/i,
  /could\s+not\s+connect/i,
  /dns\s+lookup\s+failed/i,
  /\bECONNREFUSED\b/i,
  /\bETIMEDOUT\b/i,
  /\bECONNRESET\b/i,
  /socket\s+hang\s+up/i
];

/**
 * Maps CLI execution results to ProviderError
 */
export class CLIErrorMapper {
  /**
   * Map process result to ProviderError (or null if successful)
   * @param {string} providerId
   * @param {ProcessResult} result
   * @returns {ProviderError | null}
   */
  static map(providerId, result) {
    // 1. Check if cancelled
    if (result.cancelled) {
      return ProviderErrorFactory.cancelled(providerId);
    }

    // 2. Check if timed out
    if (result.timedOut) {
      return ProviderErrorFactory.timeout(providerId, result.timeoutMs || 0);
    }

    // 3. Success - no error
    if (result.success && result.code === 0) {
      return null;
    }

    // 4. Parse stderr for known patterns
    return this._parseStderr(providerId, result);
  }

  /**
   * Pattern-based stderr classification
   * @private
   * @param {string} providerId
   * @param {ProcessResult} result
   * @returns {ProviderError}
   */
  static _parseStderr(providerId, result) {
    const stderr = result.stderr.toLowerCase();
    const stdout = result.stdout.toLowerCase();

    // AUTH errors
    if (this._matchAny(stderr, AUTH_PATTERNS)) {
      return ProviderErrorFactory.authRequired(providerId, {
        exitCode: result.code,
        stderr: result.stderr
      });
    }

    // NOT_INSTALLED errors
    if (
      this._matchAny(stderr, NOT_INSTALLED_PATTERNS) ||
      this._matchAny(stdout, NOT_INSTALLED_PATTERNS)
    ) {
      return ProviderErrorFactory.notInstalled(providerId);
    }

    // RATE_LIMIT errors
    if (this._matchAny(stderr, RATE_LIMIT_PATTERNS)) {
      return new ProviderError({
        type: 'RATE_LIMIT',
        providerId,
        message: 'Rate limit exceeded',
        isRecoverable: true,
        userMessage: 'Du har sendt for mange anmodninger',
        recoverySuggestions: [
          'Vent et par minutter og prøv igen',
          'Opgrader din abonnement for højere grænser'
        ],
        technicalDetails: { exitCode: result.code, stderr: result.stderr }
      });
    }

    // CONTEXT_LENGTH errors
    if (this._matchAny(stderr, CONTEXT_LENGTH_PATTERNS)) {
      return new ProviderError({
        type: 'CONTEXT_LENGTH',
        providerId,
        message: 'Input exceeds context length',
        isRecoverable: true,
        userMessage: 'Dokumentet er for langt',
        recoverySuggestions: [
          'Prøv med et kortere dokument',
          'Del dokumentet op i mindre dele'
        ],
        technicalDetails: { exitCode: result.code, stderr: result.stderr }
      });
    }

    // NETWORK errors
    if (this._matchAny(stderr, NETWORK_PATTERNS)) {
      return ProviderErrorFactory.networkError(providerId);
    }

    // Generic PROVIDER error (fallback)
    return new ProviderError({
      type: 'PROVIDER',
      providerId,
      message: `CLI failed with exit code ${result.code}`,
      isRecoverable: false,
      userMessage: 'CLI værktøjet fejlede',
      recoverySuggestions: [
        'Prøv med en anden provider (Claude, Gemini)',
        'Tjek log filen for detaljer',
        'Kontakt support hvis problemet fortsætter'
      ],
      technicalDetails: {
        exitCode: result.code,
        signal: result.signal,
        stderr: result.stderr.slice(0, 500) // First 500 chars only
      }
    });
  }

  /**
   * Check if text matches any pattern in list
   * @private
   * @param {string} text
   * @param {RegExp[]} patterns
   * @returns {boolean}
   */
  static _matchAny(text, patterns) {
    return patterns.some((pattern) => pattern.test(text));
  }
}
