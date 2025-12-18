export default function ProgressStage({ active, progress = 0 }) {
  return (
    <div className={`progress-stage ${active ? 'active' : ''}`}>
      {active && progress > 0 && progress < 100 && (
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      )}
    </div>
  );
}
