import { useEffect } from 'react';
import { useAppState, useAppDispatch, useCanStartAnalysis } from './context/AppContext';
import AppHeader from './components/AppHeader';
import DropZone from './components/DropZone';
import PromptSelector from './components/PromptSelector';
import OutputButtons from './components/OutputButtons';
import StatusArea from './components/StatusArea';

function App() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const canStartAnalysis = useCanStartAnalysis();

  // Auto-start analysis when file + prompt + provider are ready
  useEffect(() => {
    if (canStartAnalysis) {
      startAnalysis();
    }
  }, [canStartAnalysis]);

  // ========== Event Handlers ==========

  const handleMenuClick = () => {
    // TODO: Open settings modal (future enhancement)
    console.log('Menu clicked - settings modal not yet implemented');
  };

  const handlePromptSelect = (promptName) => {
    dispatch({ type: 'SELECT_PROMPT', payload: promptName });
  };

  const handleFileUpload = (fileData) => {
    dispatch({ type: 'UPLOAD_DOCUMENT', payload: fileData });
  };

  const startAnalysis = async () => {
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
  };

  const exportReport = async (format) => {
    if (!state.analysisResult || !state.analysisResult.reportPaths[format]) {
      console.error('No report available for format:', format);
      return;
    }

    try {
      const reportPath = state.analysisResult.reportPaths[format];

      // Export via IPC
      await window.electronAPI.exportReport({
        format,
        reportPath,
        autoOpen: state.outputPreferences.autoOpen
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

  // ========== Render ==========

  return (
    <div className="app-container">
      <AppHeader onMenuClick={handleMenuClick} />

      <DropZone onFileUpload={handleFileUpload} />

      <PromptSelector
        selected={state.selectedPrompt}
        onSelect={handlePromptSelect}
        visible={['idle', 'prompt-selected'].includes(state.uiState)}
      />

      <OutputButtons
        visible={state.uiState === 'completed'}
        onExport={exportReport}
      />

      <StatusArea onRetry={resetState} />
    </div>
  );
}

export default App;
