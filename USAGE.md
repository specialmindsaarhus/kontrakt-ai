# Contract Reviewer - Usage Guide

This guide explains how to use the Contract Reviewer system for analyzing franchise documents.

## Quick Start

### 1. Basic Analysis

Analyze a document using the complete workflow:

```javascript
import { runAnalysis } from './src/services/analysis-runner.js';

const result = await runAnalysis({
  provider: 'claude',
  documentPath: './documents/franchise-agreement.txt',
  promptName: 'franchise-contract-review',
  clientName: 'Acme Franchise Inc',
  outputFormats: ['pdf', 'docx', 'md']
});

if (result.success) {
  console.log('Analysis complete!');
  result.reports.forEach(report => {
    console.log(`${report.format}: ${report.path}`);
  });
} else {
  console.error('Analysis failed:', result.userMessage);
}
```

### 2. Available System Prompts

- **`franchise-contract-review`** - Analyze franchise contracts for legal risks and improvements
- **`franchise-manual-review`** - Review operations manuals for completeness and clarity
- **`compliance-check`** - Check legal compliance and regulatory requirements

### 3. Output Formats

- **`pdf`** - Professional PDF with branding and formatting
- **`docx`** - Editable Word document
- **`md`** - Markdown with metadata header

## Components

### Analysis Runner

The main orchestrator that combines all components:

```javascript
import { runAnalysis } from './src/services/analysis-runner.js';

const options = {
  provider: 'claude',              // CLI provider (claude, gemini, openai)
  documentPath: './doc.txt',       // Document to analyze
  promptName: 'contract-review',   // System prompt to use
  clientName: 'Client Name',       // Optional: for organization
  outputFormats: ['pdf'],          // Formats to generate
  referencePath: './refs/',        // Optional: reference materials
  customBranding: { ... },         // Optional: custom branding
  timeout: 300000                  // Optional: timeout in ms
};

const result = await runAnalysis(options);
```

### Settings Manager

Manage persistent user settings:

```javascript
import { loadSettings, saveSettings, updateBranding } from './src/utils/settings-manager.js';

// Load settings
const settings = loadSettings();
console.log('Last provider:', settings.lastProvider);

// Update branding
updateBranding({
  companyName: 'Special Minds ApS',
  contactEmail: 'info@specialminds.com',
  footerText: 'Fortroligt dokument'
});

// Settings are automatically saved
```

### Output Manager

Organize reports by client and date:

```javascript
import { generateOutputPath, getClientReports } from './src/utils/output-manager.js';

// Generate organized path
const path = generateOutputPath({
  clientName: 'Acme Inc',
  documentName: 'franchise-agreement',
  format: 'pdf',
  organizeByClient: true,
  organizeByDate: true
});

// Get all reports for a client
const reports = getClientReports('Acme Inc');
console.log(`Found ${reports.length} reports`);
```

### Logger

Enhanced logging with file output:

```javascript
import { info, warn, error, ErrorFactory } from './src/utils/logger.js';

info('Starting analysis');
warn('Long processing time detected');
error('Analysis failed', new Error('Details'));

// Create user-friendly errors
throw ErrorFactory.cliNotFound('claude');
throw ErrorFactory.fileNotFound('/path/to/file.txt');
```

## CLI Providers

### Claude CLI

```bash
# Install
npm install -g @anthropic-ai/claude-cli

# Login
claude login

# Usage (handled automatically by the app)
claude --print --system-prompt "..." "..."
```

### Gemini CLI (Not yet implemented)

Future support planned.

### OpenAI CLI (Not yet implemented)

Future support planned.

## Workflow Examples

### Complete Document Review

```javascript
// 1. Load settings
import { loadSettings } from './src/utils/settings-manager.js';
const settings = loadSettings();

// 2. Run analysis with all formats
import { runAnalysis } from './src/services/analysis-runner.js';
const result = await runAnalysis({
  provider: settings.lastProvider || 'claude',
  documentPath: './documents/contract.pdf',
  promptName: 'franchise-contract-review',
  clientName: 'Jan Jensen',
  outputFormats: ['pdf', 'docx', 'md']
});

// 3. Check results
if (result.success) {
  console.log(`Analysis completed in ${result.executionTime}ms`);
  console.log(`Generated ${result.reports.length} reports`);

  // Reports are automatically organized:
  // output/jan-jensen/2025-12-16/contract-2025-12-16T14-30-00.pdf
  // output/jan-jensen/2025-12-16/contract-2025-12-16T14-30-00.docx
  // output/jan-jensen/2025-12-16/contract-2025-12-16T14-30-00.md
}
```

### Multiple Documents for Same Client

```javascript
const documents = [
  './docs/franchise-agreement.txt',
  './docs/operations-manual.txt'
];

for (const doc of documents) {
  const result = await runAnalysis({
    provider: 'claude',
    documentPath: doc,
    promptName: doc.includes('agreement') ? 'franchise-contract-review' : 'franchise-manual-review',
    clientName: 'Acme Franchise Inc',
    outputFormats: ['pdf']
  });

  if (result.success) {
    console.log(`✓ ${doc} analyzed`);
  }
}

// All reports organized under: output/acme-franchise-inc/2025-12-16/
```

### Custom Branding

```javascript
const customBranding = {
  companyName: 'My Consulting Firm',
  contactEmail: 'contact@firm.com',
  contactPhone: '+45 12345678',
  footerText: 'Confidential Analysis - For Client Use Only',
  primaryColor: '#2c5aa0'
};

const result = await runAnalysis({
  provider: 'claude',
  documentPath: './document.txt',
  promptName: 'compliance-check',
  outputFormats: ['pdf'],
  customBranding
});
```

## Error Handling

The system provides user-friendly error messages with recovery suggestions:

```javascript
const result = await runAnalysis({ ... });

if (!result.success) {
  console.error('Error:', result.error);
  console.log('User message:');
  console.log(result.userMessage);
  // Includes Danish recovery suggestions
}
```

Common errors:
- **CLI_NOT_FOUND** - CLI not installed
- **AUTH_REQUIRED** - Need to login to CLI
- **FILE_NOT_FOUND** - Document doesn't exist
- **TIMEOUT** - Analysis took too long
- **INVALID_FORMAT** - Unsupported file format

## File Organization

Reports are automatically organized:

```
output/
├── client-name-1/
│   ├── 2025-12-15/
│   │   ├── document-1.pdf
│   │   └── document-2.pdf
│   └── 2025-12-16/
│       └── document-3.pdf
└── client-name-2/
    └── 2025-12-16/
        └── document-1.pdf
```

Settings and logs stored in user directory:

```
~/.contract-reviewer/
├── settings.json       # User preferences
└── logs/
    └── app.log        # Application logs
```

## Testing

Run tests to verify functionality:

```bash
# Test individual components
node tests/test-prompt-loader.js
node tests/test-report-generator.js

# Test end-to-end workflow
node tests/test-end-to-end.js
```

## Tips

1. **First run**: The CLI will analyze the document (may take 30-60 seconds)
2. **Organize by client**: Enable for better organization
3. **Multiple formats**: Generate all three for flexibility
4. **Settings persist**: Last provider and prompt are remembered
5. **Check logs**: See `~/.contract-reviewer/logs/app.log` for debugging

## Next Steps

- Integrate with Electron GUI
- Add batch processing
- Implement Gemini and OpenAI adapters
- Add document conversion (PDF/Word → text)
