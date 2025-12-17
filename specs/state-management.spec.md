# State Management Specification

## Overview

This document defines the application state structure and management strategy for the Contract Reviewer application.

**Approach:** React Context + useReducer pattern
- **Why not Redux/Zustand?** Simple single-user desktop app with linear workflow - Context is sufficient
- **Why useReducer?** Complex state transitions with clear action types, easier to debug
- **Why Context?** Avoid prop drilling through component tree

---

## Application State Structure

### AppState Interface

```typescript
interface AppState {
  // ========== UI State ==========
  // Current UI state: 'idle' | 'prompt-selected' | 'file-hover' | 'analysis-running' | 'completed' | 'error'
  uiState: UIState;

  // ========== Document State ==========
  // Uploaded document file
  documentFile: DocumentFile | null;

  // ========== Prompt State ==========
  // Currently selected prompt type
  selectedPrompt: PromptType | null;

  // Available prompts loaded from backend
  availablePrompts: PromptInfo[];

  // ========== CLI Provider State ==========
  // Available CLI providers (Claude, Gemini, OpenAI)
  availableProviders: CLIProviderInfo[];

  // Currently selected CLI provider
  selectedProvider: string | null;

  // ========== Analysis State ==========
  // Analysis result from backend
  analysisResult: AnalysisResult | null;

  // Current analysis progress (0-100)
  analysisProgress: number;

  // Current progress stage (0-2: analyzing, generating, complete)
  currentStage: number;

  // ========== Error State ==========
  // Error information (when uiState === 'error')
  error: ErrorInfo | null;

  // ========== User Settings ==========
  // Client name for report generation
  clientName: string;

  // User branding preferences
  branding: BrandingConfig;

  // Recent clients (for quick selection)
  recentClients: string[];

  // Output preferences
  outputPreferences: OutputPreferences;
}
```

---

## State Type Definitions

### UIState
```typescript
type UIState =
  | 'idle'              // Initial state, no file uploaded
  | 'prompt-selected'   // User selected a prompt type
  | 'file-hover'        // User is dragging a file over drop zone
  | 'analysis-running'  // Backend is analyzing document
  | 'completed'         // Analysis complete, showing results
  | 'error';            // Error occurred
```

### DocumentFile
```typescript
interface DocumentFile {
  // File object from browser
  file: File;

  // Original filename
  name: string;

  // File size in bytes
  size: number;

  // File type (extension)
  type: string;  // 'txt' | 'pdf' | 'docx'

  // Upload timestamp
  uploadedAt: Date;
}
```

### PromptType
```typescript
type PromptType =
  | 'franchise-contract-review'
  | 'franchise-manual-review'
  | 'compliance-check';
```

### PromptInfo
```typescript
interface PromptInfo {
  // Prompt identifier
  name: PromptType;

  // Display name (Danish)
  displayName: string;  // e.g., "Kontrakt", "Manual", "Compliance"

  // Brief description
  description: string;

  // Prompt file path (backend)
  filePath: string;
}
```

### CLIProviderInfo
```typescript
interface CLIProviderInfo {
  // Provider identifier ('claude', 'gemini', 'openai')
  name: string;

  // Display name for UI
  displayName: string;

  // Whether the CLI is installed and available
  available: boolean;

  // Installed version (if available)
  version?: string;

  // Installation URL (for unavailable providers)
  installUrl: string;
}
```

### AnalysisResult
```typescript
interface AnalysisResult {
  // Markdown output from CLI
  output: string;

  // Execution time in milliseconds
  executionTime: number;

  // Generated report file paths
  reportPaths: {
    pdf: string;
    docx: string;
    md: string;
  };

  // Metadata
  metadata: {
    provider: string;
    providerVersion: string;
    promptName: string;
    documentName: string;
    clientName: string;
    analysisDate: Date;
  };
}
```

### ErrorInfo
```typescript
interface ErrorInfo {
  // Error code for programmatic handling
  code: string;  // 'CLI_NOT_FOUND' | 'AUTH_REQUIRED' | 'FILE_NOT_FOUND' | 'TIMEOUT' | etc.

  // User-friendly error message (Danish)
  message: string;

  // Recovery suggestions (Danish)
  suggestions: string;

  // Original error (for debugging)
  originalError?: Error;
}
```

### BrandingConfig
```typescript
interface BrandingConfig {
  // Consultant/company name
  companyName: string;

  // Logo file path (optional)
  logoPath?: string;

  // Primary brand color (hex)
  primaryColor: string;

  // Contact information
  contactEmail?: string;
  contactPhone?: string;

  // Footer text for reports
  footerText?: string;
}
```

### OutputPreferences
```typescript
interface OutputPreferences {
  // Default output formats to generate
  defaultFormats: ('pdf' | 'docx' | 'md')[];

  // Whether to open reports automatically after generation
  autoOpen: boolean;

  // Output directory organization
  organizationMode: 'client' | 'date' | 'flat';  // client: output/client-name/date/, date: output/2024-01-15/, flat: output/
}
```

---

## Initial State

```javascript
const initialState = {
  // UI
  uiState: 'idle',

  // Document
  documentFile: null,

  // Prompt
  selectedPrompt: null,
  availablePrompts: [],  // Loaded from backend on mount

  // CLI Provider
  availableProviders: [],  // Detected on mount
  selectedProvider: null,  // Auto-select first available

  // Analysis
  analysisResult: null,
  analysisProgress: 0,
  currentStage: 0,

  // Error
  error: null,

  // User Settings (loaded from settings.json via IPC)
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
```

---

## Action Types

### Action Interface
```typescript
interface Action {
  type: ActionType;
  payload?: any;
}

type ActionType =
  // UI Actions
  | 'SET_UI_STATE'
  | 'RESET_STATE'

  // Document Actions
  | 'UPLOAD_DOCUMENT'
  | 'CLEAR_DOCUMENT'

  // Prompt Actions
  | 'SELECT_PROMPT'
  | 'LOAD_PROMPTS_SUCCESS'

  // CLI Provider Actions
  | 'LOAD_PROVIDERS_SUCCESS'
  | 'SELECT_PROVIDER'

  // Analysis Actions
  | 'START_ANALYSIS'
  | 'UPDATE_PROGRESS'
  | 'ANALYSIS_SUCCESS'
  | 'ANALYSIS_ERROR'

  // Settings Actions
  | 'UPDATE_CLIENT_NAME'
  | 'UPDATE_BRANDING'
  | 'ADD_RECENT_CLIENT'
  | 'UPDATE_OUTPUT_PREFERENCES'
  | 'LOAD_SETTINGS_SUCCESS'

  // Error Actions
  | 'SET_ERROR'
  | 'CLEAR_ERROR';
```

---

## Reducer Implementation

### Reducer Function

```javascript
function appReducer(state, action) {
  switch (action.type) {
    // ========== UI Actions ==========
    case 'SET_UI_STATE':
      return {
        ...state,
        uiState: action.payload  // 'idle' | 'prompt-selected' | etc.
      };

    case 'RESET_STATE':
      return {
        ...initialState,
        // Preserve settings
        availablePrompts: state.availablePrompts,
        availableProviders: state.availableProviders,
        selectedProvider: state.selectedProvider,
        clientName: state.clientName,
        branding: state.branding,
        recentClients: state.recentClients,
        outputPreferences: state.outputPreferences
      };

    // ========== Document Actions ==========
    case 'UPLOAD_DOCUMENT':
      return {
        ...state,
        documentFile: action.payload,  // { file, name, size, type, uploadedAt }
        uiState: state.selectedPrompt ? 'prompt-selected' : 'idle',
        error: null
      };

    case 'CLEAR_DOCUMENT':
      return {
        ...state,
        documentFile: null,
        analysisResult: null,
        uiState: 'idle',
        error: null
      };

    // ========== Prompt Actions ==========
    case 'SELECT_PROMPT':
      return {
        ...state,
        selectedPrompt: action.payload,  // 'franchise-contract-review' | etc.
        uiState: 'prompt-selected',
        error: null
      };

    case 'LOAD_PROMPTS_SUCCESS':
      return {
        ...state,
        availablePrompts: action.payload  // PromptInfo[]
      };

    // ========== CLI Provider Actions ==========
    case 'LOAD_PROVIDERS_SUCCESS':
      const providers = action.payload;  // CLIProviderInfo[]
      const firstAvailable = providers.find(p => p.available);

      return {
        ...state,
        availableProviders: providers,
        selectedProvider: firstAvailable ? firstAvailable.name : null
      };

    case 'SELECT_PROVIDER':
      return {
        ...state,
        selectedProvider: action.payload  // 'claude' | 'gemini' | 'openai'
      };

    // ========== Analysis Actions ==========
    case 'START_ANALYSIS':
      return {
        ...state,
        uiState: 'analysis-running',
        analysisProgress: 0,
        currentStage: 0,
        analysisResult: null,
        error: null
      };

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        analysisProgress: action.payload.progress,  // 0-100
        currentStage: action.payload.stage          // 0-2
      };

    case 'ANALYSIS_SUCCESS':
      return {
        ...state,
        uiState: 'completed',
        analysisResult: action.payload,  // AnalysisResult
        analysisProgress: 100,
        currentStage: 2,
        error: null
      };

    case 'ANALYSIS_ERROR':
      return {
        ...state,
        uiState: 'error',
        error: action.payload,  // ErrorInfo
        analysisResult: null
      };

    // ========== Settings Actions ==========
    case 'UPDATE_CLIENT_NAME':
      return {
        ...state,
        clientName: action.payload
      };

    case 'UPDATE_BRANDING':
      return {
        ...state,
        branding: {
          ...state.branding,
          ...action.payload
        }
      };

    case 'ADD_RECENT_CLIENT':
      const newClient = action.payload;
      const updatedRecent = [
        newClient,
        ...state.recentClients.filter(c => c !== newClient)
      ].slice(0, 10);  // Keep last 10

      return {
        ...state,
        recentClients: updatedRecent
      };

    case 'UPDATE_OUTPUT_PREFERENCES':
      return {
        ...state,
        outputPreferences: {
          ...state.outputPreferences,
          ...action.payload
        }
      };

    case 'LOAD_SETTINGS_SUCCESS':
      return {
        ...state,
        clientName: action.payload.clientName || '',
        branding: action.payload.branding || initialState.branding,
        recentClients: action.payload.recentClients || [],
        outputPreferences: action.payload.outputPreferences || initialState.outputPreferences,
        selectedProvider: action.payload.lastProvider || state.selectedProvider,
        selectedPrompt: action.payload.lastPrompt || null
      };

    // ========== Error Actions ==========
    case 'SET_ERROR':
      return {
        ...state,
        uiState: 'error',
        error: action.payload  // ErrorInfo
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
        uiState: 'idle'
      };

    default:
      return state;
  }
}
```

---

## Context Setup

### AppContext.jsx

```javascript
import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Create context
const AppStateContext = createContext();
const AppDispatchContext = createContext();

// Context provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load settings on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load user settings, prompts, and CLI providers
  async function loadInitialData() {
    try {
      // Load user settings from backend
      const settings = await window.electronAPI.loadSettings();
      dispatch({ type: 'LOAD_SETTINGS_SUCCESS', payload: settings });

      // Load available prompts
      const prompts = await window.electronAPI.getAvailablePrompts();
      dispatch({ type: 'LOAD_PROMPTS_SUCCESS', payload: prompts });

      // Detect available CLI providers
      const providers = await window.electronAPI.detectCLIProviders();
      dispatch({ type: 'LOAD_PROVIDERS_SUCCESS', payload: providers });

    } catch (error) {
      console.error('Failed to load initial data:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: {
          code: 'INITIALIZATION_ERROR',
          message: 'Kunne ikke indlæse indstillinger',
          suggestions: 'Prøv at genstarte programmet.',
          originalError: error
        }
      });
    }
  }

  // Save settings whenever relevant state changes
  useEffect(() => {
    if (state.uiState !== 'idle') return;  // Only save when idle

    const settingsToSave = {
      lastProvider: state.selectedProvider,
      lastPrompt: state.selectedPrompt,
      clientName: state.clientName,
      branding: state.branding,
      recentClients: state.recentClients,
      outputPreferences: state.outputPreferences
    };

    window.electronAPI.saveSettings(settingsToSave).catch(err => {
      console.error('Failed to save settings:', err);
    });

  }, [
    state.selectedProvider,
    state.selectedPrompt,
    state.clientName,
    state.branding,
    state.recentClients,
    state.outputPreferences
  ]);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

// Custom hooks for consuming context
export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
}

export function useAppDispatch() {
  const context = useContext(AppDispatchContext);
  if (context === undefined) {
    throw new Error('useAppDispatch must be used within AppProvider');
  }
  return context;
}

// Convenience hook for both state and dispatch
export function useApp() {
  return [useAppState(), useAppDispatch()];
}
```

---

## Usage in Components

### Example: App.jsx

```javascript
import { useAppState, useAppDispatch } from './context/AppContext';

function App() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const handlePromptSelect = (promptName) => {
    dispatch({ type: 'SELECT_PROMPT', payload: promptName });
  };

  const handleFileUpload = (file) => {
    dispatch({
      type: 'UPLOAD_DOCUMENT',
      payload: {
        file,
        name: file.name,
        size: file.size,
        type: file.name.split('.').pop(),
        uploadedAt: new Date()
      }
    });
  };

  const startAnalysis = async () => {
    dispatch({ type: 'START_ANALYSIS' });

    try {
      // Call backend via IPC
      const result = await window.electronAPI.runAnalysis({
        provider: state.selectedProvider,
        documentPath: state.documentFile.file.path,
        promptName: state.selectedPrompt,
        clientName: state.clientName,
        outputFormats: state.outputPreferences.defaultFormats
      });

      dispatch({ type: 'ANALYSIS_SUCCESS', payload: result });

      // Add to recent clients
      if (state.clientName) {
        dispatch({ type: 'ADD_RECENT_CLIENT', payload: state.clientName });
      }

    } catch (error) {
      dispatch({
        type: 'ANALYSIS_ERROR',
        payload: {
          code: error.code || 'UNKNOWN',
          message: error.message,
          suggestions: error.suggestions || 'Kontakt support.',
          originalError: error
        }
      });
    }
  };

  return (
    <div className="app-container">
      {/* Components use state and dispatch */}
      <DropZone
        state={state.uiState}
        onFileUpload={handleFileUpload}
        filename={state.documentFile?.name}
      />
      <PromptSelector
        selected={state.selectedPrompt}
        onSelect={handlePromptSelect}
        visible={state.uiState === 'idle' || state.uiState === 'prompt-selected'}
      />
      {/* ... other components */}
    </div>
  );
}
```

### Example: DropZone.jsx

```javascript
import { useAppState } from '../context/AppContext';

function DropZone({ onFileUpload, filename }) {
  const state = useAppState();

  // Component uses state for conditional rendering
  const getIcon = () => {
    switch (state.uiState) {
      case 'idle':
      case 'prompt-selected':
        return <UploadCloud size={56} />;
      case 'file-hover':
        return <ArrowDownCircle size={56} />;
      case 'analysis-running':
        return <Loader size={48} className="spinning" />;
      case 'completed':
        return <CheckCircle size={56} className="success-pop" />;
      case 'error':
        return <AlertTriangle size={56} />;
      default:
        return <UploadCloud size={56} />;
    }
  };

  return (
    <div className={`drop-zone ${state.uiState}`}>
      {getIcon()}
      {/* ... rest of component */}
    </div>
  );
}
```

---

## State Persistence

### What Gets Persisted
Settings saved to `~/.contract-reviewer/settings.json` via IPC:
- Last selected CLI provider
- Last selected prompt type
- Client name
- Branding configuration
- Recent clients list
- Output preferences

### What Doesn't Get Persisted
Transient state (cleared on app restart):
- Current UI state
- Uploaded document
- Analysis result
- Error state
- Analysis progress

### Save Strategy
- **Automatic:** Save settings whenever they change (debounced)
- **On Close:** Final save when app closes (via `window.onbeforeunload`)

### Load Strategy
- **On Mount:** Load settings immediately when app initializes
- **Fallback:** Use `initialState` defaults if settings file doesn't exist

---

## Progress Updates During Analysis

Since analysis can take 1-5 minutes, provide progress feedback:

### Progress Stages
1. **Stage 0:** Analyzing content (0-60% progress)
2. **Stage 1:** Generating report (60-90% progress)
3. **Stage 2:** Complete (100% progress)

### Implementation
Backend sends progress updates via IPC events:

```javascript
// In App.jsx or analysis handler
useEffect(() => {
  // Listen for progress updates
  window.electronAPI.onAnalysisProgress((progress) => {
    dispatch({
      type: 'UPDATE_PROGRESS',
      payload: {
        progress: progress.percent,  // 0-100
        stage: progress.stage         // 0-2
      }
    });
  });

  return () => {
    window.electronAPI.removeAnalysisProgressListener();
  };
}, []);
```

**Status messages:**
- Stage 0: "Analyserer indhold" + "Ca. 60 sekunder"
- Stage 1: "Genererer rapport" + "Ca. 30 sekunder"
- Stage 2: Complete (show checkmark)

---

## Error Handling Strategy

### Error Categories

**1. CLI Errors**
```javascript
{
  code: 'CLI_NOT_FOUND',
  message: 'Claude CLI ikke fundet',
  suggestions: 'Installer Claude CLI fra https://claude.ai/cli'
}

{
  code: 'AUTH_REQUIRED',
  message: 'Claude CLI kræver autentificering',
  suggestions: 'Kør claude auth i terminalen og følg instruktionerne.'
}
```

**2. File Errors**
```javascript
{
  code: 'FILE_TOO_LARGE',
  message: 'Filen er for stor (max 10MB)',
  suggestions: 'Vælg en mindre fil eller komprimér dokumentet.'
}

{
  code: 'INVALID_FILE_TYPE',
  message: 'Ugyldigt filformat',
  suggestions: 'Kun .txt, .pdf og .docx filer understøttes.'
}
```

**3. Timeout Errors**
```javascript
{
  code: 'TIMEOUT',
  message: 'Analysen tog for lang tid',
  suggestions: 'Prøv igen med et kortere dokument eller vælg en anden CLI provider.'
}
```

### Error Recovery
All errors show "Prøv igen" button that dispatches `RESET_STATE` action.

---

## Testing State Management

### Reducer Tests

```javascript
// tests/state/appReducer.test.js
import { describe, it, expect } from 'vitest';
import { appReducer, initialState } from '../src/context/AppContext';

describe('appReducer', () => {
  it('handles SELECT_PROMPT action', () => {
    const action = {
      type: 'SELECT_PROMPT',
      payload: 'franchise-contract-review'
    };

    const newState = appReducer(initialState, action);

    expect(newState.selectedPrompt).toBe('franchise-contract-review');
    expect(newState.uiState).toBe('prompt-selected');
  });

  it('handles UPLOAD_DOCUMENT action', () => {
    const action = {
      type: 'UPLOAD_DOCUMENT',
      payload: {
        file: new File(['content'], 'test.txt'),
        name: 'test.txt',
        size: 1024,
        type: 'txt',
        uploadedAt: new Date()
      }
    };

    const newState = appReducer(initialState, action);

    expect(newState.documentFile).toBeDefined();
    expect(newState.documentFile.name).toBe('test.txt');
  });

  it('handles ANALYSIS_SUCCESS action', () => {
    const action = {
      type: 'ANALYSIS_SUCCESS',
      payload: {
        output: '## Test output',
        executionTime: 45000,
        reportPaths: {
          pdf: '/path/to/report.pdf',
          docx: '/path/to/report.docx',
          md: '/path/to/report.md'
        }
      }
    };

    const newState = appReducer(initialState, action);

    expect(newState.uiState).toBe('completed');
    expect(newState.analysisResult).toBeDefined();
    expect(newState.analysisProgress).toBe(100);
  });

  it('preserves settings on RESET_STATE', () => {
    const stateWithSettings = {
      ...initialState,
      clientName: 'Test Client',
      branding: { companyName: 'Test Company', primaryColor: '#000' },
      selectedProvider: 'claude'
    };

    const newState = appReducer(stateWithSettings, { type: 'RESET_STATE' });

    expect(newState.clientName).toBe('Test Client');
    expect(newState.branding.companyName).toBe('Test Company');
    expect(newState.selectedProvider).toBe('claude');
    expect(newState.documentFile).toBeNull();
    expect(newState.analysisResult).toBeNull();
  });
});
```

---

## File Organization

```
src/
├── context/
│   └── AppContext.jsx      # Context provider, reducer, hooks
├── App.jsx                 # Uses context via hooks
└── components/
    └── *.jsx               # All components use context via hooks

tests/
└── state/
    └── appReducer.test.js  # Reducer unit tests
```

---

## Performance Considerations

### Optimization Strategies
1. **Split Contexts:** If performance becomes an issue, split into multiple contexts:
   - `UIContext` (uiState, error)
   - `DocumentContext` (documentFile, analysisResult)
   - `SettingsContext` (branding, preferences)

2. **Memoization:** Use `React.memo` on components that receive dispatch but don't use state

3. **Selector Pattern:** Create custom hooks for derived state:
```javascript
export function useIsAnalyzing() {
  const state = useAppState();
  return state.uiState === 'analysis-running';
}
```

### Current Approach is Sufficient
For MVP, single context is fine because:
- Small number of components (< 15)
- Linear workflow (not complex multi-view navigation)
- State updates are infrequent (user-triggered, not real-time)

---

## Future Enhancements (Not MVP)

- **Undo/Redo:** Add state history for undo/redo functionality
- **Batch Processing:** Queue state for multiple documents
- **Analysis History:** Persist past analysis results in state
- **Settings Modal:** Add UI settings (theme, language, shortcuts)
- **Real-time Collaboration:** Add WebSocket state updates for multi-user (if needed)
