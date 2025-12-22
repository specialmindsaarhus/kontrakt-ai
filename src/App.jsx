import { useEffect, useCallback, useState } from 'react';
import { useAppState, useAppDispatch, useCanStartAnalysis } from './context/AppContext';
import AppHeader from './components/AppHeader';
import DropZone from './components/DropZone';
import PromptSelector from './components/PromptSelector';
import ProviderSelector from './components/ProviderSelector';
import ProviderErrorOverlay from './components/ProviderErrorOverlay';
import OutputButtons from './components/OutputButtons';
import StatusArea from './components/StatusArea';
import SettingsModal from './components/SettingsModal';

function App() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const canStartAnalysis = useCanStartAnalysis();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ========== Event Handlers ==========

  const handleMenuClick = () => {
    setSettingsOpen(true);
  };

  const handleSettingChange = async (key, value) => {
    // Update context state
    dispatch({
      type: 'UPDATE_SETTING',
      payload: { key, value }
    });

    // Auto-save will happen via the useEffect in AppContext
  };

  const handlePromptSelect = (promptName) => {
    dispatch({ type: 'SELECT_PROMPT', payload: promptName });
  };

  const handleProviderSelect = (providerName) => {
    dispatch({ type: 'SELECT_PROVIDER', payload: providerName });
  };

  const handleFileUpload = (fileData) => {
    dispatch({ type: 'UPLOAD_DOCUMENT', payload: fileData });
  };

  const startAnalysis = useCallback(async () => {
    // Validate we have everything needed
    if (!state.selectedPrompt || !state.documentFile || !state.selectedProvider) {
      console.error('Missing required data for analysis');
      return;
    }

    console.log('[FRONTEND] Starting analysis...');
    console.log('[FRONTEND] Provider:', state.selectedProvider);
    console.log('[FRONTEND] Document:', state.documentFile.path);
    console.log('[FRONTEND] Prompt:', state.selectedPrompt);

    dispatch({ type: 'START_ANALYSIS' });

    try {
      console.log('[FRONTEND] Calling window.electronAPI.runAnalysis()...');
      // Call backend via IPC
      const result = await window.electronAPI.runAnalysis({
        provider: state.selectedProvider,
        documentPath: state.documentFile.path,
        promptName: state.selectedPrompt,
        clientName: state.clientName || 'Unnamed Client',
        outputFormats: state.outputPreferences.defaultFormats,
        branding: state.branding
      });
      console.log('[FRONTEND] runAnalysis() completed successfully!');
      console.log('[FRONTEND] Result:', result);

      dispatch({ type: 'ANALYSIS_SUCCESS', payload: result });

      // Add to recent clients if clientName provided
      if (state.clientName) {
        dispatch({ type: 'ADD_RECENT_CLIENT', payload: state.clientName });
      }

    } catch (error) {
      console.error('Analysis failed:', error);

      // Handle cancellation - just reset, don't show error
      // Check code, cancelled flag, OR message content (Electron IPC doesn't preserve custom properties)
      if (error.code === 'ANALYSIS_CANCELLED' ||
          error.cancelled ||
          error.message?.includes('Analysen blev afbrudt')) {
        console.log('Analysis cancelled by user');
        dispatch({ type: 'RESET_STATE' });
        return;
      }

      // Handle other errors normally
      dispatch({
        type: 'ANALYSIS_ERROR',
        payload: {
          code: error.code || 'UNKNOWN',
          message: error.message || 'En ukendt fejl opstod',
          suggestions: error.suggestions || 'Kontakt support.',
          originalError: error
        }
      });
    }
  }, [state.selectedPrompt, state.documentFile, state.selectedProvider, state.clientName, state.outputPreferences.defaultFormats, state.branding, dispatch]);

  const exportReport = async (format) => {
    if (!state.analysisResult || !state.analysisResult.reportPaths[format]) {
      console.error('No report available for format:', format);
      return;
    }

    try {
      const reportPath = state.analysisResult.reportPaths[format];

      // Export via IPC (always open when user clicks button)
      await window.electronAPI.exportReport({
        format,
        reportPath,
        autoOpen: true
      });

      console.log(`Exported ${format} report:`, reportPath);
    } catch (error) {
      console.error('Export failed:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: {
          code: 'EXPORT_ERROR',
          message: 'Kunne ikke eksportere rapport',
          suggestions: 'Prøv igen eller kontakt support.',
          originalError: error
        }
      });
    }
  };

  const resetState = () => {
    dispatch({ type: 'RESET_STATE' });
  };

  // ========== Effects ==========

  // Auto-start analysis when file + prompt + provider are ready
  useEffect(() => {
    if (canStartAnalysis) {
      startAnalysis();
    }
  }, [canStartAnalysis, startAnalysis]);

  // ESC key to cancel analysis
  useEffect(() => {
    const handleKeyDown = async (event) => {
      // Only handle ESC during analysis
      if (event.key === 'Escape' && state.uiState === 'analysis-running') {
        event.preventDefault();

        // Show confirmation dialog
        const confirmed = window.confirm('Vil du afbryde analysen?');

        if (confirmed) {
          try {
            await window.electronAPI.cancelAnalysis();
            console.log('Analysis cancelled by user');

            // Reset to ready state (file still uploaded, can restart)
            dispatch({ type: 'RESET_STATE' });
          } catch (error) {
            console.error('Failed to cancel analysis:', error);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.uiState, dispatch]);

  // ========== Render ==========

  return (
    <div className="app-container">
      <AppHeader onMenuClick={handleMenuClick} logoPath={state.logoPath} />

      <DropZone onFileUpload={handleFileUpload} />

      <PromptSelector
        selected={state.selectedPrompt}
        onSelect={handlePromptSelect}
        visible={['idle', 'prompt-selected'].includes(state.uiState)}
      />

      <ProviderSelector
        availableProviders={state.availableProviders}
        selected={state.selectedProvider}
        onSelect={handleProviderSelect}
        visible={['idle', 'prompt-selected'].includes(state.uiState)}
        loading={state.providersLoading}
      />

      <OutputButtons
        visible={state.uiState === 'completed'}
        onExport={exportReport}
        selectedFormats={state.outputPreferences.defaultFormats}
      />

      <StatusArea onRetry={resetState} />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={{
          logoPath: state.logoPath,
          defaultFormats: state.outputPreferences.defaultFormats,
          autoOpen: state.outputPreferences.autoOpen,
          lastProvider: state.selectedProvider
        }}
        recentAnalyses={state.recentAnalyses}
        onSettingChange={handleSettingChange}
      />

      <ProviderErrorOverlay
        visible={!state.providersLoading && state.availableProviders.filter(p => p.available).length === 0}
      />
    </div>
  );
}

export default App;
