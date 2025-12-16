import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { isCLIAvailable, getCLIVersion } from '../utils/cli-detector.js';

/**
 * Claude CLI Adapter
 * Implements the CLIAdapter interface for Claude CLI
 */
export class ClaudeAdapter {
  constructor() {
    this.providerName = 'claude';
    this.cliCommand = 'claude';
    this._isAvailableCache = null;
    this._versionCache = null;
  }

  /**
   * Check if Claude CLI is installed and available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    if (this._isAvailableCache !== null) {
      return this._isAvailableCache;
    }

    this._isAvailableCache = await isCLIAvailable(this.providerName);
    return this._isAvailableCache;
  }

  /**
   * Get the installed version of Claude CLI
   * @returns {Promise<string|null>}
   */
  async getVersion() {
    if (this._versionCache !== null) {
      return this._versionCache;
    }

    if (!(await this.isAvailable())) {
      return null;
    }

    this._versionCache = await getCLIVersion(this.providerName);
    return this._versionCache;
  }

  /**
   * Build the Claude CLI command with arguments
   * @param {CLIRequest} request
   * @returns {{args: string[], prompt: string}} Command arguments and prompt text
   * @throws {Error} If validation fails
   */
  buildCommand(request) {
    // Validate required fields
    if (!request.documentPath) {
      throw new Error('Document path is required');
    }
    if (!request.systemPromptPath) {
      throw new Error('System prompt path is required');
    }

    // Check if files exist
    if (!existsSync(request.documentPath)) {
      throw new Error(`Document not found: ${request.documentPath}`);
    }
    if (!existsSync(request.systemPromptPath)) {
      throw new Error(`System prompt not found: ${request.systemPromptPath}`);
    }

    // Build command arguments
    const args = [];

    // Add print flag for non-interactive output
    args.push('--print');

    // Read and add system prompt content
    const systemPrompt = readFileSync(request.systemPromptPath, 'utf8');
    args.push('--system-prompt', systemPrompt);

    // Build the prompt with document content
    const documentContent = readFileSync(request.documentPath, 'utf8');
    let prompt = `Please analyze the following document:\n\n${documentContent}`;

    // Add reference materials if provided
    if (request.referencePath && existsSync(request.referencePath)) {
      // Note: For now, we'll mention reference path in prompt
      // In future, could read and include reference files
      prompt += `\n\nReference materials are available in: ${request.referencePath}`;
    }

    return { args, prompt };
  }

  /**
   * Execute the Claude CLI command
   * @param {CLIRequest} request
   * @returns {Promise<CLIResult>}
   */
  async execute(request) {
    const startTime = Date.now();

    try {
      // Check if CLI is available
      if (!(await this.isAvailable())) {
        return {
          success: false,
          provider: this.providerName,
          error: 'Claude CLI not found. Please install it from https://claude.ai/cli',
          errorCode: 'CLI_NOT_FOUND',
          executionTime: Date.now() - startTime
        };
      }

      // Build command
      let commandData;
      try {
        commandData = this.buildCommand(request);
      } catch (error) {
        return {
          success: false,
          provider: this.providerName,
          error: error.message,
          errorCode: 'INVALID_REQUEST',
          executionTime: Date.now() - startTime
        };
      }

      // Execute CLI command
      const result = await this._executeCommand(commandData.args, commandData.prompt, request.timeout || 300000);

      // Get CLI version
      const version = await this.getVersion();

      if (result.success) {
        return {
          success: true,
          provider: this.providerName,
          output: this.normalizeOutput(result.stdout),
          executionTime: Date.now() - startTime,
          cliVersion: version,
          rawStdout: result.stdout,
          rawStderr: result.stderr
        };
      } else {
        return {
          success: false,
          provider: this.providerName,
          error: result.error,
          errorCode: result.errorCode,
          executionTime: Date.now() - startTime,
          rawStdout: result.stdout,
          rawStderr: result.stderr
        };
      }
    } catch (error) {
      return {
        success: false,
        provider: this.providerName,
        error: error.message,
        errorCode: 'UNKNOWN',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute the CLI command using spawn
   * @private
   * @param {string[]} args - Command arguments
   * @param {string} prompt - The prompt text to pass to Claude
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<{success: boolean, stdout: string, stderr: string, error?: string, errorCode?: string}>}
   */
  _executeCommand(args, prompt, timeout) {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Build full argument list with prompt at the end
      const fullArgs = [...args, prompt];

      const child = spawn(this.cliCommand, fullArgs, {
        shell: true,
        timeout
      });

      // Set up timeout handler
      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, timeout);

      // Collect stdout
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      child.on('close', (code) => {
        clearTimeout(timeoutId);

        if (timedOut) {
          resolve({
            success: false,
            stdout,
            stderr,
            error: `Command timed out after ${timeout}ms`,
            errorCode: 'TIMEOUT'
          });
        } else if (code === 0) {
          resolve({
            success: true,
            stdout,
            stderr
          });
        } else {
          // Check for authentication errors
          const stderrLower = stderr.toLowerCase();
          if (stderrLower.includes('auth') || stderrLower.includes('login') || stderrLower.includes('unauthorized')) {
            resolve({
              success: false,
              stdout,
              stderr,
              error: 'Authentication required. Please run "claude login" in your terminal.',
              errorCode: 'AUTH_REQUIRED'
            });
          } else {
            resolve({
              success: false,
              stdout,
              stderr,
              error: `Command failed with exit code ${code}. Error: ${stderr || 'Unknown error'}`,
              errorCode: 'EXECUTION_FAILED'
            });
          }
        }
      });

      // Handle errors
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          stdout,
          stderr,
          error: error.message,
          errorCode: 'EXECUTION_FAILED'
        });
      });
    });
  }

  /**
   * Normalize CLI output to common format
   * @param {string} rawOutput
   * @returns {string}
   */
  normalizeOutput(rawOutput) {
    if (!rawOutput) {
      return '';
    }

    // Remove any CLI-specific formatting artifacts
    let normalized = rawOutput.trim();

    // Remove ANSI color codes if present
    normalized = normalized.replace(/\x1b\[[0-9;]*m/g, '');

    // Remove any CLI headers or footers
    // This may need adjustment based on actual Claude CLI output format
    const lines = normalized.split('\n');
    const filteredLines = lines.filter(line => {
      const lineLower = line.toLowerCase();
      return !lineLower.startsWith('claude cli') &&
             !lineLower.startsWith('using model') &&
             !lineLower.includes('tokens used');
    });

    return filteredLines.join('\n').trim();
  }

  /**
   * Get the provider name
   * @returns {string}
   */
  getProviderName() {
    return this.providerName;
  }
}

/**
 * Create a new ClaudeAdapter instance
 * @returns {ClaudeAdapter}
 */
export function createClaudeAdapter() {
  return new ClaudeAdapter();
}
