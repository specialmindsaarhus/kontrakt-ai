export default function PromptButton({ label, selected, onClick }) {
  return (
    <button
      className={`prompt-btn ${selected ? 'selected' : ''}`}
      onClick={onClick}
      aria-label={`Select ${label} prompt`}
    >
      {label}
    </button>
  );
}
