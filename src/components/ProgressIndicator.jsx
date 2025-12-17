import ProgressStage from './ProgressStage';

export default function ProgressIndicator({ currentStage, totalStages = 3 }) {
  return (
    <div className="status-progress">
      <ProgressStage active={currentStage >= 0} />
      <ProgressStage active={currentStage >= 1} />
      <ProgressStage active={currentStage >= 2} />
    </div>
  );
}
