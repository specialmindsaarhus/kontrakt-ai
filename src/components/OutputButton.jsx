export default function OutputButton({ label, onClick }) {
  return (
    <button
      className="output-btn"
      onClick={onClick}
      aria-label={`Export as ${label}`}
    >
      {label}
    </button>
  );
}
