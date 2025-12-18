import { useAppState } from '../context/AppContext';
import ProgressStage from './ProgressStage';

export default function ProgressIndicator({ currentStage, totalStages = 3 }) {
  const state = useAppState();
  const overallProgress = state.analysisProgress || 0;

  // Map progress to actual workflow timing (not equal thirds!)
  // Stage 0 (bar 1): 0-20% (validation, prep)
  // Stage 1 (bar 2): 20-80% (long CLI execution + report generation)
  // Stage 2 (bar 3): 80-100% (finalization)
  const stageRanges = [
    { start: 0, end: 20 },    // Stage 0: Fast validation
    { start: 20, end: 80 },   // Stage 1: Long analysis + reports
    { start: 80, end: 100 }   // Stage 2: Quick finalization
  ];

  const getStageProgress = (stageIndex) => {
    const range = stageRanges[stageIndex];
    const stageWidth = range.end - range.start;

    if (overallProgress <= range.start) return 0;
    if (overallProgress >= range.end) return 100;

    // Calculate percentage within this stage
    return ((overallProgress - range.start) / stageWidth) * 100;
  };

  return (
    <div className="status-progress">
      <ProgressStage
        active={currentStage >= 0}
        progress={getStageProgress(0)}
      />
      <ProgressStage
        active={currentStage >= 1}
        progress={getStageProgress(1)}
      />
      <ProgressStage
        active={currentStage >= 2}
        progress={getStageProgress(2)}
      />
    </div>
  );
}
