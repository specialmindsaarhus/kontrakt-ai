export default function ProgressStage({ active }) {
  return (
    <div className={`progress-stage ${active ? 'active' : ''}`}></div>
  );
}
