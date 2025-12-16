import { existsSync, mkdirSync, appendFileSync } from 'fs';
import path from 'path';
import { homedir } from 'os';

/**
 * Logger Utility
 * Provides structured logging with file output and console display
 */

const LOG_DIR = path.join(homedir(), '.contract-reviewer', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Log levels
export const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

/**
 * Ensure log directory exists
 * @private
 */
function ensureLogDirectory() {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Format log entry
 * @private
 */
function formatLogEntry(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const contextStr = Object.keys(context).length > 0 ? JSON.stringify(context) : '';
  return `[${timestamp}] [${level}] ${message} ${contextStr}`.trim();
}

/**
 * Write log entry to file
 * @private
 */
function writeToFile(entry) {
  try {
    ensureLogDirectory();
    appendFileSync(LOG_FILE, entry + '\n', 'utf8');
  } catch (error) {
    // Fail silently - logging errors shouldn't crash the app
    console.error('Failed to write to log file:', error.message);
  }
}

/**
 * Log a debug message
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 */
export function debug(message, context = {}) {
  const entry = formatLogEntry(LogLevel.DEBUG, message, context);
  console.debug(entry);
  writeToFile(entry);
}

/**
 * Log an info message
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 */
export function info(message, context = {}) {
  const entry = formatLogEntry(LogLevel.INFO, message, context);
  console.info(entry);
  writeToFile(entry);
}

/**
 * Log a warning message
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 */
export function warn(message, context = {}) {
  const entry = formatLogEntry(LogLevel.WARN, message, context);
  console.warn(entry);
  writeToFile(entry);
}

/**
 * Log an error message
 * @param {string} message - Log message
 * @param {Error|Object} errorOrContext - Error object or additional context
 */
export function error(message, errorOrContext = {}) {
  const context = errorOrContext instanceof Error
    ? { error: errorOrContext.message, stack: errorOrContext.stack }
    : errorOrContext;

  const entry = formatLogEntry(LogLevel.ERROR, message, context);
  console.error(entry);
  writeToFile(entry);
}

/**
 * Get log file path
 * @returns {string} Path to log file
 */
export function getLogPath() {
  return LOG_FILE;
}

/**
 * Enhanced error handler
 * Provides user-friendly error messages and recovery suggestions
 */
export class EnhancedError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'EnhancedError';
    this.userMessage = options.userMessage || message;
    this.recoverySuggestions = options.recoverySuggestions || [];
    this.errorCode = options.errorCode;
    this.context = options.context || {};
  }

  /**
   * Get user-friendly error message with recovery suggestions
   * @returns {string} Formatted error message
   */
  getUserMessage() {
    let msg = this.userMessage;

    if (this.recoverySuggestions.length > 0) {
      msg += '\n\nForsøg følgende:';
      this.recoverySuggestions.forEach((suggestion, index) => {
        msg += `\n${index + 1}. ${suggestion}`;
      });
    }

    return msg;
  }

  /**
   * Log this error
   */
  log() {
    error(this.message, {
      errorCode: this.errorCode,
      userMessage: this.userMessage,
      ...this.context
    });
  }
}

/**
 * Create enhanced error for common scenarios
 */
export const ErrorFactory = {
  /**
   * CLI not found error
   */
  cliNotFound: (provider) => new EnhancedError(
    `${provider} CLI not found`,
    {
      userMessage: `${provider} CLI er ikke installeret eller kan ikke findes.`,
      recoverySuggestions: [
        `Installer ${provider} CLI fra den officielle hjemmeside`,
        `Kontroller at CLI'en er tilgængelig i din PATH`,
        `Genstart terminalen efter installation`,
        `Prøv en anden CLI provider (Claude, Gemini, eller OpenAI)`
      ],
      errorCode: 'CLI_NOT_FOUND',
      context: { provider }
    }
  ),

  /**
   * Authentication error
   */
  authRequired: (provider) => new EnhancedError(
    `${provider} CLI requires authentication`,
    {
      userMessage: `${provider} CLI kræver autentificering.`,
      recoverySuggestions: [
        `Kør '${provider.toLowerCase()} login' i terminalen`,
        `Log ind med dine credentials`,
        `Prøv kommandoen igen`
      ],
      errorCode: 'AUTH_REQUIRED',
      context: { provider }
    }
  ),

  /**
   * File not found error
   */
  fileNotFound: (filePath) => new EnhancedError(
    `File not found: ${filePath}`,
    {
      userMessage: 'Den valgte fil kunne ikke findes.',
      recoverySuggestions: [
        'Kontroller at filen eksisterer',
        'Tjek filstien er korrekt',
        'Prøv at vælge filen igen'
      ],
      errorCode: 'FILE_NOT_FOUND',
      context: { filePath }
    }
  ),

  /**
   * Timeout error
   */
  timeout: (duration) => new EnhancedError(
    `Operation timed out after ${duration}ms`,
    {
      userMessage: 'Analysen tog for lang tid og blev afbrudt.',
      recoverySuggestions: [
        'Prøv med et mindre dokument',
        'Tjek din internetforbindelse',
        'Prøv igen om lidt',
        'Kontakt support hvis problemet fortsætter'
      ],
      errorCode: 'TIMEOUT',
      context: { duration }
    }
  ),

  /**
   * Invalid file format error
   */
  invalidFormat: (format, expected) => new EnhancedError(
    `Invalid file format: ${format}`,
    {
      userMessage: `Filformatet (${format}) understøttes ikke.`,
      recoverySuggestions: [
        `Konverter filen til et understøttet format: ${expected.join(', ')}`,
        'Brug PDF, Word (.docx) eller tekstfil (.txt)',
        'Kontakt support hvis du har brug for andre formater'
      ],
      errorCode: 'INVALID_FORMAT',
      context: { format, expected }
    }
  ),

  /**
   * Generic error with custom message
   */
  generic: (message, suggestions = []) => new EnhancedError(
    message,
    {
      userMessage: message,
      recoverySuggestions: suggestions.length > 0 ? suggestions : [
        'Prøv igen',
        'Genstart applikationen',
        'Kontakt support hvis problemet fortsætter'
      ],
      errorCode: 'GENERIC_ERROR'
    }
  )
};

export default {
  debug,
  info,
  warn,
  error,
  getLogPath,
  EnhancedError,
  ErrorFactory,
  LogLevel
};
