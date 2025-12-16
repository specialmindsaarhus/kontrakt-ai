# CLI Adapter Interface Specification

## Overview

The CLI Adapter interface defines the contract that all CLI provider adapters (Gemini, Claude, OpenAI) must implement. This ensures consistent behavior across different CLI providers.

## CLIAdapter Interface

All CLI adapters must implement the following interface:

```javascript
class CLIAdapter {
  /**
   * Check if the CLI is installed and available on the system
   * @returns {Promise<boolean>} True if CLI is available, false otherwise
   */
  async isAvailable() {}

  /**
   * Get the installed version of the CLI
   * @returns {Promise<string|null>} Version string (e.g., "1.2.3") or null if not available
   */
  async getVersion() {}

  /**
   * Build the CLI command with all necessary arguments
   * @param {CLIRequest} request - The CLI request object containing all necessary parameters
   * @returns {string[]} Array of command arguments (e.g., ['claude', '--files', 'path/to/file.txt'])
   */
  buildCommand(request) {}

  /**
   * Execute the CLI command and return the result
   * @param {CLIRequest} request - The CLI request object
   * @returns {Promise<CLIResult>} The result of the CLI execution
   */
  async execute(request) {}

  /**
   * Normalize the CLI output to a common format
   * @param {string} rawOutput - The raw stdout from the CLI
   * @returns {string} Normalized markdown output
   */
  normalizeOutput(rawOutput) {}

  /**
   * Get the name of the CLI provider
   * @returns {string} Provider name (e.g., 'claude', 'gemini', 'openai')
   */
  getProviderName() {}
}
```

## Implementation Requirements

### isAvailable()
- Must use platform-appropriate command: `which` (macOS/Linux) or `where` (Windows)
- Should not throw errors, return false if check fails
- Should cache result to avoid repeated system calls

### getVersion()
- Should execute CLI version command (e.g., `claude --version`)
- Should parse and return clean version string
- Return null if version cannot be determined

### buildCommand(request)
- Must handle file paths with spaces (wrap in quotes)
- Must use platform-appropriate path separators
- Must validate that required files exist before building command
- Should throw descriptive errors for invalid requests

### execute(request)
- Must use `child_process.spawn()` for better streaming and error handling
- Must capture both stdout and stderr
- Must handle timeouts (default: 5 minutes, configurable)
- Must handle CLI authentication errors gracefully
- Must return structured `CLIResult` object

### normalizeOutput(rawOutput)
- Must clean up any CLI-specific formatting artifacts
- Should preserve markdown structure
- Should handle empty or error outputs gracefully

## Error Handling

Adapters must handle and report these error scenarios:

1. **CLI Not Installed** - Clear message with installation link
2. **Authentication Error** - Guide user to run CLI login command
3. **File Not Found** - Report which file is missing
4. **Timeout** - Report that analysis took too long
5. **Invalid Response** - Fall back to raw output

## Example Implementation Structure

```javascript
// src/adapters/claude-adapter.js
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

export class ClaudeAdapter {
  constructor() {
    this.providerName = 'claude';
    this.cliCommand = 'claude';
    this._isAvailableCache = null;
  }

  async isAvailable() {
    if (this._isAvailableCache !== null) {
      return this._isAvailableCache;
    }

    // Implementation here
  }

  async getVersion() {
    // Implementation here
  }

  buildCommand(request) {
    // Validate and build command
  }

  async execute(request) {
    // Execute CLI and handle output
  }

  normalizeOutput(rawOutput) {
    // Clean up output
  }

  getProviderName() {
    return this.providerName;
  }
}
```

## Testing Requirements

Each adapter must have comprehensive tests covering:
- Availability detection on different platforms
- Version detection
- Command building with various file paths
- Successful execution scenarios
- Error scenarios (CLI not found, timeout, invalid files)
- Output normalization

See `tests/adapters/claude-adapter.test.js` for test examples.
