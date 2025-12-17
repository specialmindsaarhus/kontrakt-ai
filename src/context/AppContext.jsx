import React, { createContext, useContext, useReducer, useEffect } from 'react';

// ========== Initial State ==========

const initialState = {
  // UI
  uiState: 'idle',  // 'idle' | 'prompt-selected' | 'file-hover' | 'analysis-running' | 'completed' | 'error'

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

// ========== Reducer ==========

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
        documentFile: action.payload,  // { file, name, size, type, uploadedAt, path }
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

// ========== Context Setup ==========

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

  // Listen for analysis progress events
  useEffect(() => {
    const handleProgress = (progress) => {
      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: {
          progress: progress.percent,  // 0-100
          stage: progress.stage         // 0-2
        }
      });
    };

    window.electronAPI.onAnalysisProgress(handleProgress);

    return () => {
      window.electronAPI.removeAnalysisProgressListener(handleProgress);
    };
  }, []);

  // Listen for error events
  useEffect(() => {
    const handleError = (error) => {
      dispatch({
        type: 'SET_ERROR',
        payload: error
      });
    };

    window.electronAPI.onError(handleError);

    return () => {
      window.electronAPI.removeErrorListener(handleError);
    };
  }, []);

  // Save settings whenever relevant state changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
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
    }, 1000);  // Debounce: save 1 second after last change

    return () => clearTimeout(timeoutId);
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

// ========== Custom Hooks ==========

// Hook for reading state
export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
}

// Hook for dispatching actions
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

// Derived state hooks (performance optimization)
export function useIsAnalyzing() {
  const state = useAppState();
  return state.uiState === 'analysis-running';
}

export function useHasDocument() {
  const state = useAppState();
  return state.documentFile !== null;
}

export function useHasPrompt() {
  const state = useAppState();
  return state.selectedPrompt !== null;
}

export function useCanStartAnalysis() {
  const state = useAppState();
  return (
    state.selectedPrompt !== null &&
    state.documentFile !== null &&
    state.selectedProvider !== null &&
    state.uiState === 'prompt-selected'
  );
}

// Export reducer and initialState for testing
export { appReducer, initialState };
