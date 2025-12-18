import { useAppState } from '../context/AppContext';
import StatusMessage from './StatusMessage';
import StatusTime from './StatusTime';
import ProgressIndicator from './ProgressIndicator';
import ErrorMessage from './ErrorMessage';

export default function StatusArea({ onRetry }) {
  const state = useAppState();

  // Idle / prompt-selected / file-hover - show nothing (completely hidden)
  if (['idle', 'prompt-selected', 'file-hover'].includes(state.uiState)) {
    return null;
  }

  // Analysis running - show progress
  if (state.uiState === 'analysis-running') {
    const stageMessages = [
      'Analyserer indhold',
      'Genererer rapport',
      'Færdiggør'
    ];
    const stageTimeEstimates = [
      'Ca. 60 sekunder',
      'Ca. 30 sekunder',
      'Næsten færdig'
    ];

    return (
      <div className="status-area">
        <StatusMessage text={stageMessages[state.currentStage] || stageMessages[0]} />
        <StatusTime text={stageTimeEstimates[state.currentStage] || stageTimeEstimates[0]} />
        <ProgressIndicator currentStage={state.currentStage} totalStages={3} />
      </div>
    );
  }

  // Completed - show execution time
  if (state.uiState === 'completed' && state.analysisResult) {
    const seconds = Math.round(state.analysisResult.executionTime / 1000);
    return (
      <div className="status-area">
        <StatusTime text={`${seconds} sekunder`} />
      </div>
    );
  }

  // Error - show error message and retry button
  if (state.uiState === 'error' && state.error) {
    return (
      <div className="status-area">
        <ErrorMessage
          message={state.error.message}
          suggestions={state.error.suggestions}
          onRetry={onRetry}
        />
      </div>
    );
  }

  // Fallback - hidden
  return null;
}
