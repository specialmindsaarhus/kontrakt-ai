# API Contracts Specification

## Overview

This document defines the function signatures and contracts for key modules in the CLI integration system.

## CLI Runner (`src/services/cli-runner.js`)

### runCLI(request)

Main entry point for executing CLI commands.

```javascript
/**
 * Execute a CLI command using the specified provider
 * @param {CLIRequest} request - The CLI request configuration
 * @returns {Promise<CLIResult>} The result of the CLI execution
 * @throws {Error} If request validation fails
 */
async function runCLI(request)
```

**Parameters:**
- `request` (CLIRequest): Configuration object with provider, paths, and options

**Returns:**
- Promise resolving to CLIResult with output or error

**Example:**
```javascript
import { runCLI } from './services/cli-runner.js';

const result = await runCLI({
  provider: 'claude',
  documentPath: './documents/contract.txt',
  referencePath: './reference-docs/',
  systemPromptPath: './prompts/franchise-contract-review.md',
  timeout: 300000
});

if (result.success) {
  console.log('Analysis complete:', result.output);
} else {
  console.error('Analysis failed:', result.error);
}
```

---

## CLI Detector (`src/utils/cli-detector.js`)

### detectAvailableCLIs()

Detect which CLI providers are installed on the system.

```javascript
/**
 * Detect all available CLI providers on the system
 * @returns {Promise<CLIProvider[]>} Array of CLI provider information
 */
async function detectAvailableCLIs()
```

**Returns:**
- Promise resolving to array of CLIProvider objects

**Example:**
```javascript
import { detectAvailableCLIs } from './utils/cli-detector.js';

const providers = await detectAvailableCLIs();
// [
//   { name: 'claude', displayName: 'Claude CLI', available: true, version: '1.2.3', ... },
//   { name: 'gemini', displayName: 'Gemini CLI', available: false, ... }
// ]
```

### isCLIAvailable(providerName)

Check if a specific CLI is available.

```javascript
/**
 * Check if a specific CLI provider is available
 * @param {string} providerName - The provider name ('claude', 'gemini', 'openai')
 * @returns {Promise<boolean>} True if available, false otherwise
 */
async function isCLIAvailable(providerName)
```

**Parameters:**
- `providerName` (string): One of 'claude', 'gemini', 'openai'

**Returns:**
- Promise resolving to boolean

**Example:**
```javascript
const isClaudeAvailable = await isCLIAvailable('claude');
if (!isClaudeAvailable) {
  alert('Please install Claude CLI');
}
```

### getCLIVersion(providerName)

Get the version of an installed CLI.

```javascript
/**
 * Get the version of an installed CLI
 * @param {string} providerName - The provider name
 * @returns {Promise<string|null>} Version string or null if not available
 */
async function getCLIVersion(providerName)
```

**Parameters:**
- `providerName` (string): One of 'claude', 'gemini', 'openai'

**Returns:**
- Promise resolving to version string (e.g., "1.2.3") or null

---

## File Converter (`src/utils/file-converter.js`)

### convertToText(filePath)

Convert PDF, DOCX, or text files to plain text format.

```javascript
/**
 * Convert a file to plain text format
 * @param {string} filePath - Absolute path to the file
 * @returns {Promise<FileConversionResult>} Conversion result with text file path
 */
async function convertToText(filePath)
```

**Parameters:**
- `filePath` (string): Absolute path to PDF, DOCX, or text file

**Returns:**
- Promise resolving to FileConversionResult

**Supported Formats:**
- `.txt` - Pass through (no conversion)
- `.pdf` - Extract text using `pdf-parse`
- `.docx` - Extract text using `mammoth`

**Example:**
```javascript
import { convertToText } from './utils/file-converter.js';

const result = await convertToText('./documents/contract.pdf');
if (result.success) {
  console.log('Text file:', result.textFilePath);
  // Text file: ./documents/contract.txt
} else {
  console.error('Conversion failed:', result.error);
}
```

### convertBatchToText(filePaths)

Convert multiple files to text in parallel.

```javascript
/**
 * Convert multiple files to text format in parallel
 * @param {string[]} filePaths - Array of absolute file paths
 * @returns {Promise<FileConversionResult[]>} Array of conversion results
 */
async function convertBatchToText(filePaths)
```

**Parameters:**
- `filePaths` (string[]): Array of absolute file paths

**Returns:**
- Promise resolving to array of FileConversionResult objects

---

## Report Generator (`src/utils/report-generator.js`)

### generatePDFReport(config)

Generate a professional PDF report from CLI results.

```javascript
/**
 * Generate a PDF report from CLI analysis results
 * @param {ReportConfig} config - Report configuration
 * @returns {Promise<string>} Path to generated PDF file
 */
async function generatePDFReport(config)
```

**Parameters:**
- `config` (ReportConfig): Report configuration with branding and content

**Returns:**
- Promise resolving to path of generated PDF file

**Example:**
```javascript
import { generatePDFReport } from './utils/report-generator.js';

const pdfPath = await generatePDFReport({
  format: 'pdf',
  outputPath: './output/franchise-review-2024-01-15.pdf',
  cliResult: analysisResult,
  metadata: {
    originalFileName: 'franchise-agreement.pdf',
    originalFormat: 'pdf',
    clientName: 'Acme Franchise Inc.'
  },
  branding: {
    companyName: 'Special Minds ApS',
    footerText: 'Confidential - For Client Use Only'
  }
});

console.log('Report generated:', pdfPath);
```

### generateWordReport(config)

Generate a Word document report from CLI results.

```javascript
/**
 * Generate a Word document report from CLI analysis results
 * @param {ReportConfig} config - Report configuration
 * @returns {Promise<string>} Path to generated DOCX file
 */
async function generateWordReport(config)
```

**Parameters:**
- `config` (ReportConfig): Report configuration

**Returns:**
- Promise resolving to path of generated DOCX file

### generateMarkdownReport(config)

Save the raw markdown output with metadata.

```javascript
/**
 * Generate a markdown report from CLI analysis results
 * @param {ReportConfig} config - Report configuration
 * @returns {Promise<string>} Path to generated markdown file
 */
async function generateMarkdownReport(config)
```

**Parameters:**
- `config` (ReportConfig): Report configuration

**Returns:**
- Promise resolving to path of generated markdown file

---

## Validation Utilities (`src/utils/validation.js`)

### validateCLIRequest(request)

Validate a CLI request object before execution.

```javascript
/**
 * Validate a CLI request object
 * @param {CLIRequest} request - The request to validate
 * @throws {Error} If validation fails with descriptive message
 */
function validateCLIRequest(request)
```

**Validation Rules:**
- `provider` must be 'claude', 'gemini', or 'openai'
- `documentPath` must be provided and file must exist
- `systemPromptPath` must be provided and file must exist
- `referencePath` (if provided) must be a valid directory
- `timeout` (if provided) must be positive number

**Example:**
```javascript
import { validateCLIRequest } from './utils/validation.js';

try {
  validateCLIRequest(request);
  // Request is valid, proceed
} catch (error) {
  console.error('Invalid request:', error.message);
}
```

### validateFilePath(filePath, mustExist = true)

Validate a file path.

```javascript
/**
 * Validate a file path
 * @param {string} filePath - The file path to validate
 * @param {boolean} mustExist - Whether the file must exist
 * @throws {Error} If validation fails
 */
function validateFilePath(filePath, mustExist = true)
```

**Example:**
```javascript
validateFilePath('./documents/contract.pdf', true);
// Throws if file doesn't exist
```

---

## Error Handling

All async functions should:
1. Return structured error objects (CLIResult with `success: false`)
2. Never throw unhandled exceptions
3. Provide descriptive error messages
4. Include error codes for programmatic handling

**Example Error Handling Pattern:**
```javascript
async function someFunction() {
  try {
    // Perform operation
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      errorCode: 'OPERATION_FAILED'
    };
  }
}
```

---

## Testing Contracts

All functions with these contracts must have corresponding unit tests that verify:
1. Success scenarios
2. Error scenarios
3. Edge cases (empty inputs, special characters, etc.)
4. Platform-specific behavior (Windows vs macOS paths)

See individual test files in `tests/` directory for examples.
