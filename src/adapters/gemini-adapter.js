import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { isCLIAvailable, getCLIVersion } from '../utils/cli-detector.js';

/**
 * Gemini CLI Adapter
 * Implements the CLIAdapter interface for Gemini CLI
 */
export class GeminiAdapter {
  constructor() {
    this.providerName = 'gemini';
    this.cliCommand = 'gemini';
    this._isAvailableCache = null;
    this._versionCache = null;
  }

  /**
   * Check if Gemini CLI is installed and available
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
   * Get the installed version of Gemini CLI
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
   * Build the Gemini CLI command with arguments
   * @param {CLIRequest} request
   * @returns {{args: string[], prompt: string}}
   * @private
   */
  buildCommand(request) {
    // Validate inputs
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

    // Gemini CLI uses positional arguments for one-shot mode
    // No need for --output-format (it causes interactive mode)

    // Gemini CLI doesn't have --system-prompt flag
    // We need to prepend system prompt to the user prompt
    const systemPrompt = readFileSync(request.systemPromptPath, 'utf8');
    const documentContent = readFileSync(request.documentPath, 'utf8');

    // Combine system prompt + user request + document
    let prompt = `${systemPrompt}\n\n---\n\nPlease analyze the following document:\n\n${documentContent}`;

    // Add reference materials if provided
    if (request.referencePath && existsSync(request.referencePath)) {
      // Note: For now, we'll mention reference path in prompt
      // In future, could read and include reference files
      prompt += `\n\nReference materials are available in: ${request.referencePath}`;
    }

    return { args, prompt };
  }

  /**
   * Execute the Gemini CLI command
   * @param {CLIRequest} request
   * @returns {Promise<CLIResult>}
   */
  async execute(request) {
    const startTime = Date.now();
    console.log('[DEBUG] GeminiAdapter.execute() called');
    console.log('[DEBUG] Request:', { documentPath: request.documentPath, timeout: request.timeout });

    try {
      // Check if CLI is available
      console.log('[DEBUG] Checking Gemini CLI availability...');
      if (!(await this.isAvailable())) {
        return {
          success: false,
          provider: this.providerName,
          error: 'Gemini CLI not found. Please install it from https://gemini.google.com/cli',
          errorCode: 'CLI_NOT_FOUND',
          executionTime: Date.now() - startTime
        };
      }

      // Build command
      let commandData;
      try {
        console.log('[DEBUG] Building Gemini command...');
        commandData = this.buildCommand(request);
        console.log('[DEBUG] Command built. Args:', commandData.args.length, 'Prompt length:', commandData.prompt.length);
      } catch (error) {
        console.log('[DEBUG] buildCommand() failed:', error.message);
        return {
          success: false,
          provider: this.providerName,
          error: error.message,
          errorCode: 'INVALID_REQUEST',
          executionTime: Date.now() - startTime
        };
      }

      // Execute CLI command
      const result = await this._executeCommand(commandData.args, commandData.prompt, request.timeout || 180000);

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
   * @param {string} prompt - The prompt text to pass to Gemini
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<{success: boolean, stdout: string, stderr: string, error?: string, errorCode?: string}>}
   */
  _executeCommand(args, prompt, timeout) {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Debug logging
      console.log('[DEBUG] Executing Gemini CLI:');
      console.log('[DEBUG] Command:', this.cliCommand);
      console.log('[DEBUG] Args count:', args.length);
      console.log('[DEBUG] Timeout:', timeout, 'ms');
      console.log('[DEBUG] Prompt length:', prompt.length, 'chars');

      // Gemini CLI works best with stdin for long prompts
      const child = spawn(this.cliCommand, args, {
        shell: true
        // Remove timeout from spawn options - we handle it manually below
      });

      // Write prompt to stdin
      child.stdin.write(prompt);
      child.stdin.end();

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

        console.log('[DEBUG] Process closed. Code:', code, 'Timed out:', timedOut);
        console.log('[DEBUG] Stdout length:', stdout.length, 'chars');
        console.log('[DEBUG] Stderr length:', stderr.length, 'chars');

        if (timedOut) {
          console.log('[DEBUG] TIMEOUT - Command took longer than', timeout, 'ms');
          resolve({
            success: false,
            stdout,
            stderr,
            error: `Command timed out after ${timeout}ms`,
            errorCode: 'TIMEOUT'
          });
        } else if (code === 0) {
          console.log('[DEBUG] SUCCESS - Command completed successfully');
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
              error: 'Authentication required. Please run "gemini login" or authenticate in your terminal.',
              errorCode: 'AUTH_REQUIRED'
            });
          } else {
            resolve({
              success: false,
              stdout,
              stderr,
              error: `Command failed with exit code ${code}. Error: ${stderr || 'Unknown error'}`,
              errorCode: 'COMMAND_FAILED'
            });
          }
        }
      });

      // Handle process errors
      child.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          stdout,
          stderr,
          error: `Failed to execute command: ${err.message}`,
          errorCode: 'EXECUTION_ERROR'
        });
      });
    });
  }

  /**
   * Normalize CLI output
   * Removes ANSI codes, extra whitespace, etc.
   * @param {string} output - Raw CLI output
   * @returns {string} - Normalized output
   */
  normalizeOutput(output) {
    if (!output) return '';

    return output
      // Remove ANSI color codes
      .replace(/\x1b\[[0-9;]*m/g, '')
      // Remove carriage returns
      .replace(/\r/g, '')
      // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim();
  }
}

export function createGeminiAdapter() {
  return new GeminiAdapter();
}
