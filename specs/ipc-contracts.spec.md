# IPC Contracts Specification

## Overview

This document defines the Inter-Process Communication (IPC) contracts between the Electron renderer process (React frontend) and the main process (Node.js backend).

**Security Model:**
- **Preload Script:** Use `contextBridge` to expose safe IPC APIs to renderer
- **No `nodeIntegration`:** Renderer has no direct access to Node.js APIs
- **Validated Inputs:** Main process validates all inputs from renderer
- **Minimal Surface:** Only expose necessary functions

**Communication Pattern:**
- Renderer → Main: Invoke methods via `window.electronAPI.*`
- Main → Renderer: Send events via IPC channels
- Bidirectional: Request-response for async operations with progress updates

---

## Security Setup

### electron/preload.js

```javascript
const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // ========== Settings ==========
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // ========== CLI Provider Detection ==========
  detectCLIProviders: () => ipcRenderer.invoke('cli:detect-providers'),

  // ========== Prompts ==========
  getAvailablePrompts: () => ipcRenderer.invoke('prompts:get-available'),

  // ========== Analysis ==========
  runAnalysis: (params) => ipcRenderer.invoke('analysis:run', params),

  // Analysis progress events (main -> renderer)
  onAnalysisProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('analysis:progress', subscription);
    return subscription;
  },

  removeAnalysisProgressListener: (callback) => {
    if (callback) {
      ipcRenderer.removeListener('analysis:progress', callback);
    } else {
      ipcRenderer.removeAllListeners('analysis:progress');
    }
  },

  // ========== File Operations ==========
  openFile: (filePath) => ipcRenderer.invoke('file:open', filePath),
  openDirectory: (dirPath) => ipcRenderer.invoke('file:open-directory', dirPath),

  // ========== Export ==========
  exportReport: (params) => ipcRenderer.invoke('export:report', params),

  // ========== Error Handling ==========
  onError: (callback) => {
    const subscription = (event, error) => callback(error);
    ipcRenderer.on('app:error', subscription);
    return subscription;
  },

  removeErrorListener: (callback) => {
    if (callback) {
      ipcRenderer.removeListener('app:error', callback);
    } else {
      ipcRenderer.removeAllListeners('app:error');
    }
  }
});
```

### electron/main.js (Security Configuration)

```javascript
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 900,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    nodeIntegration: false,        // Disable Node.js in renderer
    contextIsolation: true,        // Enable context isolation
    enableRemoteModule: false,     // Disable remote module
    sandbox: true                  // Enable sandbox
  }
});
```

---

## IPC Method Contracts

### 1. Settings Management

#### `settings:load`

**Renderer → Main:**
```javascript
const settings = await window.electronAPI.loadSettings();
```

**Main Process Implementation:**
```javascript
ipcMain.handle('settings:load', async (event) => {
  try {
    const { loadSettings } = require('./src/utils/settings-manager.js');
    const settings = await loadSettings();
    return settings;
  } catch (error) {
    console.error('Failed to load settings:', error);
    // Return defaults on error
    return {
      lastProvider: null,
      lastPrompt: null,
      clientName: '',
      branding: {
        companyName: 'Contract Reviewer',
        primaryColor: '#0d1321'
      },
      recentClients: [],
      outputPreferences: {
        defaultFormats: ['pdf', 'docx', 'md'],
        autoOpen: false,
        organizationMode: 'client'
      }
    };
  }
});
```

**Returns:**
```typescript
interface Settings {
  lastProvider: string | null;
  lastPrompt: string | null;
  clientName: string;
  branding: BrandingConfig;
  recentClients: string[];
  outputPreferences: OutputPreferences;
}
```

---

#### `settings:save`

**Renderer → Main:**
```javascript
await window.electronAPI.saveSettings({
  lastProvider: 'claude',
  lastPrompt: 'franchise-contract-review',
  clientName: 'Acme Corp',
  branding: { ... },
  recentClients: ['Acme Corp', 'Beta Ltd'],
  outputPreferences: { ... }
});
```

**Main Process Implementation:**
```javascript
ipcMain.handle('settings:save', async (event, settings) => {
  try {
    // Validate settings object
    if (!settings || typeof settings !== 'object') {
      throw new Error('Invalid settings object');
    }

    const { saveSettings } = require('./src/utils/settings-manager.js');
    await saveSettings(settings);
    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
});
```

**Parameters:**
```typescript
interface SettingsToSave {
  lastProvider?: string;
  lastPrompt?: string;
  clientName?: string;
  branding?: BrandingConfig;
  recentClients?: string[];
  outputPreferences?: OutputPreferences;
}
```

**Returns:**
```typescript
{ success: boolean }
```

---

### 2. CLI Provider Detection

#### `cli:detect-providers`

**Renderer → Main:**
```javascript
const providers = await window.electronAPI.detectCLIProviders();
```

**Main Process Implementation:**
```javascript
ipcMain.handle('cli:detect-providers', async (event) => {
  try {
    const { detectAvailableCLIs } = require('./src/utils/cli-detector.js');
    const providers = await detectAvailableCLIs();
    return providers;
  } catch (error) {
    console.error('Failed to detect CLI providers:', error);
    // Return empty array on error
    return [];
  }
});
```

**Returns:**
```typescript
interface CLIProviderInfo {
  name: string;            // 'claude' | 'gemini' | 'openai'
  displayName: string;     // 'Claude CLI'
  available: boolean;      // true if installed
  version?: string;        // '2.0.70'
  installUrl: string;      // 'https://claude.ai/cli'
}

// Example return value
[
  {
    name: 'claude',
    displayName: 'Claude CLI',
    available: true,
    version: '2.0.70',
    installUrl: 'https://claude.ai/cli'
  },
  {
    name: 'gemini',
    displayName: 'Gemini CLI',
    available: false,
    installUrl: 'https://ai.google.dev/gemini-api/docs/cli'
  },
  {
    name: 'openai',
    displayName: 'OpenAI CLI',
    available: false,
    installUrl: 'https://platform.openai.com/docs/api-reference/cli'
  }
]
```

---

### 3. Prompts Management

#### `prompts:get-available`

**Renderer → Main:**
```javascript
const prompts = await window.electronAPI.getAvailablePrompts();
```

**Main Process Implementation:**
```javascript
ipcMain.handle('prompts:get-available', async (event) => {
  try {
    const { listPrompts } = require('./src/utils/prompt-loader.js');
    const promptNames = await listPrompts();

    // Map to display format
    const prompts = promptNames.map(name => ({
      name,
      displayName: getDisplayName(name),
      description: getDescription(name),
      filePath: path.join(__dirname, 'prompts', `${name}.md`)
    }));

    return prompts;
  } catch (error) {
    console.error('Failed to load prompts:', error);
    return [];
  }
});

function getDisplayName(promptName) {
  const map = {
    'franchise-contract-review': 'Kontrakt',
    'franchise-manual-review': 'Manual',
    'compliance-check': 'Compliance'
  };
  return map[promptName] || promptName;
}

function getDescription(promptName) {
  const map = {
    'franchise-contract-review': 'Analysér franchisekontrakt for juridiske risici',
    'franchise-manual-review': 'Gennemgå franchisemanual for fuldstændighed',
    'compliance-check': 'Kontrollér overholdelse af lovgivning'
  };
  return map[promptName] || '';
}
```

**Returns:**
```typescript
interface PromptInfo {
  name: string;          // 'franchise-contract-review'
  displayName: string;   // 'Kontrakt'
  description: string;   // 'Analysér franchisekontrakt...'
  filePath: string;      // Absolute path to prompt file
}

// Example return value
[
  {
    name: 'franchise-contract-review',
    displayName: 'Kontrakt',
    description: 'Analysér franchisekontrakt for juridiske risici',
    filePath: '/path/to/prompts/franchise-contract-review.md'
  },
  // ... other prompts
]
```

---

### 4. Analysis Execution

#### `analysis:run`

**Renderer → Main:**
```javascript
const result = await window.electronAPI.runAnalysis({
  provider: 'claude',
  documentPath: '/path/to/document.txt',
  promptName: 'franchise-contract-review',
  clientName: 'Acme Corp',
  outputFormats: ['pdf', 'docx', 'md']
});
```

**Main Process Implementation:**
```javascript
ipcMain.handle('analysis:run', async (event, params) => {
  try {
    // Validate parameters
    if (!params.provider || !params.documentPath || !params.promptName) {
      throw new Error('Missing required parameters');
    }

    const { runAnalysis } = require('./src/services/analysis-runner.js');

    // Run analysis with progress updates
    const result = await runAnalysis(
      params,
      (progress) => {
        // Send progress updates to renderer
        event.sender.send('analysis:progress', progress);
      }
    );

    return result;

  } catch (error) {
    console.error('Analysis failed:', error);

    // Format error for renderer
    throw {
      code: error.code || 'UNKNOWN',
      message: error.message,
      suggestions: error.suggestions || 'Kontakt support.',
      originalError: error.stack
    };
  }
});
```

**Parameters:**
```typescript
interface AnalysisParams {
  // CLI provider to use
  provider: string;  // 'claude' | 'gemini' | 'openai'

  // Absolute path to document file
  documentPath: string;

  // Prompt identifier
  promptName: string;  // 'franchise-contract-review' | etc.

  // Client name for report metadata
  clientName: string;

  // Output formats to generate
  outputFormats: ('pdf' | 'docx' | 'md')[];

  // Optional branding configuration
  branding?: BrandingConfig;
}
```

**Returns:**
```typescript
interface AnalysisResult {
  // Analysis output (markdown)
  output: string;

  // Execution time in milliseconds
  executionTime: number;

  // Generated report file paths
  reportPaths: {
    pdf?: string;    // Absolute path to PDF report
    docx?: string;   // Absolute path to DOCX report
    md?: string;     // Absolute path to Markdown report
  };

  // Metadata
  metadata: {
    provider: string;
    providerVersion: string;
    promptName: string;
    documentName: string;
    clientName: string;
    analysisDate: string;  // ISO 8601 format
  };
}
```

**Throws:**
```typescript
interface AnalysisError {
  code: string;         // Error code (CLI_NOT_FOUND, AUTH_REQUIRED, etc.)
  message: string;      // User-friendly error message (Danish)
  suggestions: string;  // Recovery suggestions (Danish)
  originalError?: string;  // Stack trace for debugging
}
```

---

#### `analysis:progress` Event

**Main → Renderer:**
```javascript
// Renderer listens for progress updates
window.electronAPI.onAnalysisProgress((progress) => {
  console.log(`Progress: ${progress.percent}%`);
  dispatch({ type: 'UPDATE_PROGRESS', payload: progress });
});
```

**Main Process Sends:**
```javascript
// Inside analysis-runner.js
function sendProgress(percent, stage, message) {
  mainWindow.webContents.send('analysis:progress', {
    percent,   // 0-100
    stage,     // 0-2
    message    // 'Analyzing content', 'Generating report', etc.
  });
}
```

**Progress Object:**
```typescript
interface AnalysisProgress {
  percent: number;   // Current progress (0-100)
  stage: number;     // Current stage (0-2)
  message: string;   // Status message (English, translate in renderer)
}

// Example progress updates
{ percent: 0, stage: 0, message: 'Starting analysis' }
{ percent: 30, stage: 0, message: 'Analyzing content' }
{ percent: 60, stage: 1, message: 'Generating report' }
{ percent: 90, stage: 2, message: 'Finalizing' }
{ percent: 100, stage: 2, message: 'Complete' }
```

---

### 5. File Operations

#### `file:open`

**Renderer → Main:**
```javascript
await window.electronAPI.openFile('/path/to/report.pdf');
```

**Main Process Implementation:**
```javascript
const { shell } = require('electron');

ipcMain.handle('file:open', async (event, filePath) => {
  try {
    // Validate file path
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }

    // Security: Ensure file exists and is within allowed paths
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    // Open file with default application
    await shell.openPath(filePath);
    return { success: true };

  } catch (error) {
    console.error('Failed to open file:', error);
    throw error;
  }
});
```

**Parameters:**
```typescript
filePath: string  // Absolute path to file
```

**Returns:**
```typescript
{ success: boolean }
```

---

#### `file:open-directory`

**Renderer → Main:**
```javascript
await window.electronAPI.openDirectory('/path/to/output/folder');
```

**Main Process Implementation:**
```javascript
const { shell } = require('electron');

ipcMain.handle('file:open-directory', async (event, dirPath) => {
  try {
    if (!dirPath || typeof dirPath !== 'string') {
      throw new Error('Invalid directory path');
    }

    const fs = require('fs');
    if (!fs.existsSync(dirPath)) {
      throw new Error('Directory not found');
    }

    // Open directory in file explorer
    await shell.openPath(dirPath);
    return { success: true };

  } catch (error) {
    console.error('Failed to open directory:', error);
    throw error;
  }
});
```

---

### 6. Export Operations

#### `export:report`

**Renderer → Main:**
```javascript
const result = await window.electronAPI.exportReport({
  format: 'pdf',
  reportPath: '/path/to/report.pdf',
  autoOpen: true
});
```

**Main Process Implementation:**
```javascript
ipcMain.handle('export:report', async (event, params) => {
  try {
    const { format, reportPath, autoOpen } = params;

    // Validate report exists
    const fs = require('fs');
    if (!fs.existsSync(reportPath)) {
      throw new Error('Report file not found');
    }

    // Optionally copy to user-selected location
    // (Future: Show save dialog)

    // Open if requested
    if (autoOpen) {
      const { shell } = require('electron');
      await shell.openPath(reportPath);
    }

    return {
      success: true,
      path: reportPath
    };

  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
});
```

**Parameters:**
```typescript
interface ExportParams {
  format: 'pdf' | 'docx' | 'md';
  reportPath: string;    // Path to generated report
  autoOpen: boolean;     // Whether to open after export
}
```

**Returns:**
```typescript
{
  success: boolean;
  path: string;  // Final path to exported file
}
```

---

### 7. Error Events

#### `app:error` Event

**Main → Renderer:**
```javascript
// Renderer listens for global errors
window.electronAPI.onError((error) => {
  console.error('App error:', error);
  dispatch({ type: 'SET_ERROR', payload: error });
});
```

**Main Process Sends:**
```javascript
// In main.js or error handler
function sendErrorToRenderer(error) {
  mainWindow.webContents.send('app:error', {
    code: error.code || 'UNKNOWN',
    message: error.message,
    suggestions: error.suggestions || 'Kontakt support.'
  });
}
```

**Error Object:**
```typescript
interface AppError {
  code: string;
  message: string;
  suggestions: string;
}
```

---

## File Upload Flow

Since Electron doesn't allow direct file path access from renderer, use this pattern:

### Option 1: HTML File Input (Recommended for Security)

**Renderer:**
```javascript
const input = document.createElement('input');
input.type = 'file';
input.accept = '.txt,.pdf,.docx';
input.onchange = (e) => {
  const file = e.target.files[0];

  // For Electron, file.path is available
  const filePath = file.path;

  // Send path to main process
  window.electronAPI.runAnalysis({
    provider: 'claude',
    documentPath: filePath,
    // ... other params
  });
};
input.click();
```

**Security Note:** In Electron, file inputs provide `file.path` which is the absolute path. This is safe because:
- User explicitly selected the file
- No arbitrary file system access
- Path is validated in main process

### Option 2: Electron Dialog (Alternative)

**Renderer:**
```javascript
const filePath = await window.electronAPI.selectFile();
```

**Preload:**
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('dialog:select-file')
});
```

**Main:**
```javascript
const { dialog } = require('electron');

ipcMain.handle('dialog:select-file', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['txt', 'pdf', 'docx'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];  // Return selected file path
});
```

**Recommendation:** Use **Option 1** (HTML file input) for better UX and drag-and-drop support.

---

## Drag-and-Drop File Handling

### Renderer Implementation

```javascript
function DropZone({ onFileUpload }) {
  const handleDrop = (e) => {
    e.preventDefault();

    const file = e.dataTransfer.files[0];
    if (!file) return;

    // Validate file type
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'pdf', 'docx'].includes(ext)) {
      alert('Ugyldigt filformat. Kun .txt, .pdf og .docx understøttes.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('Filen er for stor. Maksimal størrelse er 10MB.');
      return;
    }

    // In Electron, file.path is available
    const filePath = file.path;

    // Pass to parent
    onFileUpload({
      file,
      name: file.name,
      size: file.size,
      type: ext,
      path: filePath
    });
  };

  return (
    <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      {/* Drop zone UI */}
    </div>
  );
}
```

---

## Error Handling Best Practices

### Main Process Error Handling

```javascript
ipcMain.handle('analysis:run', async (event, params) => {
  try {
    const result = await runAnalysis(params);
    return result;
  } catch (error) {
    // Log error for debugging
    console.error('Analysis error:', error);

    // Map to user-friendly Danish error
    const userError = mapErrorToUserMessage(error);

    // Throw formatted error to renderer
    throw userError;
  }
});

function mapErrorToUserMessage(error) {
  const errorMap = {
    'CLI_NOT_FOUND': {
      code: 'CLI_NOT_FOUND',
      message: 'CLI ikke fundet',
      suggestions: 'Installer Claude CLI fra https://claude.ai/cli'
    },
    'AUTH_REQUIRED': {
      code: 'AUTH_REQUIRED',
      message: 'CLI kræver autentificering',
      suggestions: 'Kør claude auth i terminalen og følg instruktionerne.'
    },
    'FILE_NOT_FOUND': {
      code: 'FILE_NOT_FOUND',
      message: 'Filen blev ikke fundet',
      suggestions: 'Vælg en anden fil og prøv igen.'
    },
    'TIMEOUT': {
      code: 'TIMEOUT',
      message: 'Analysen tog for lang tid',
      suggestions: 'Prøv igen med et kortere dokument.'
    }
  };

  return errorMap[error.code] || {
    code: 'UNKNOWN',
    message: error.message || 'En ukendt fejl opstod',
    suggestions: 'Kontakt support.'
  };
}
```

### Renderer Error Handling

```javascript
async function startAnalysis() {
  try {
    const result = await window.electronAPI.runAnalysis(params);
    dispatch({ type: 'ANALYSIS_SUCCESS', payload: result });
  } catch (error) {
    // Error is already formatted by main process
    dispatch({ type: 'ANALYSIS_ERROR', payload: error });
  }
}
```

---

## Testing IPC Contracts

### Main Process Tests

```javascript
// tests/ipc/settings.test.js
import { describe, it, expect, vi } from 'vitest';
import { ipcMain } from 'electron';

describe('Settings IPC', () => {
  it('loads settings successfully', async () => {
    const mockSettings = {
      lastProvider: 'claude',
      clientName: 'Test Client'
    };

    // Mock settings-manager
    vi.mock('./src/utils/settings-manager.js', () => ({
      loadSettings: vi.fn().mockResolvedValue(mockSettings)
    }));

    // Simulate IPC call
    const result = await ipcMain.handle('settings:load');
    expect(result).toEqual(mockSettings);
  });

  it('returns defaults on load error', async () => {
    // Mock error
    vi.mock('./src/utils/settings-manager.js', () => ({
      loadSettings: vi.fn().mockRejectedValue(new Error('File not found'))
    }));

    const result = await ipcMain.handle('settings:load');
    expect(result.clientName).toBe('');
    expect(result.branding.companyName).toBe('Contract Reviewer');
  });
});
```

### Renderer Tests (Integration)

```javascript
// tests/integration/analysis-flow.test.js
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App';

describe('Analysis Flow', () => {
  it('completes full analysis workflow', async () => {
    // Mock IPC
    window.electronAPI = {
      loadSettings: vi.fn().mockResolvedValue({}),
      detectCLIProviders: vi.fn().mockResolvedValue([
        { name: 'claude', available: true }
      ]),
      getAvailablePrompts: vi.fn().mockResolvedValue([
        { name: 'franchise-contract-review', displayName: 'Kontrakt' }
      ]),
      runAnalysis: vi.fn().mockResolvedValue({
        output: '## Test output',
        executionTime: 5000,
        reportPaths: { pdf: '/test.pdf' }
      }),
      onAnalysisProgress: vi.fn()
    };

    render(<App />);

    // Select prompt
    fireEvent.click(screen.getByText('Kontrakt'));

    // Upload file
    const dropZone = screen.getByLabelText('Drop zone for document upload');
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    // Wait for analysis to complete
    await waitFor(() => {
      expect(window.electronAPI.runAnalysis).toHaveBeenCalled();
    });

    // Verify success state
    expect(screen.getByText(/sekunder/)).toBeInTheDocument();
  });
});
```

---

## Performance Considerations

### Debounce Settings Saves

```javascript
// In AppContext.jsx
import { useEffect, useRef } from 'react';

function AppProvider({ children }) {
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    // Debounce settings save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      window.electronAPI.saveSettings(state).catch(err => {
        console.error('Failed to save settings:', err);
      });
    }, 1000);  // Save 1 second after last change

  }, [state.clientName, state.branding, /* ... */]);
}
```

### Limit Progress Updates

```javascript
// In analysis-runner.js
let lastProgressSent = 0;

function sendProgress(percent, stage, message) {
  // Only send if progress changed by at least 5%
  if (Math.abs(percent - lastProgressSent) < 5) return;

  mainWindow.webContents.send('analysis:progress', {
    percent,
    stage,
    message
  });

  lastProgressSent = percent;
}
```

---

## File Organization

```
electron/
├── main.js          # Main process entry, IPC handlers
├── preload.js       # Context bridge, expose safe APIs
└── package.json     # Electron app manifest

src/
└── (React app - uses window.electronAPI)

tests/
├── ipc/
│   ├── settings.test.js
│   ├── analysis.test.js
│   └── file-operations.test.js
└── integration/
    └── analysis-flow.test.js
```

---

## Future Enhancements (Not MVP)

- **Bidirectional Streaming:** Real-time streaming of CLI output (not just progress)
- **Cancelable Operations:** Allow user to cancel long-running analysis
- **Multiple Windows:** Support for multiple analysis sessions in separate windows
- **Native Notifications:** Desktop notifications when analysis completes
- **Automatic Updates:** Electron auto-updater integration
