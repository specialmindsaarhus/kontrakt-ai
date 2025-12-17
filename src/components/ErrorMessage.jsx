export default function ErrorMessage({ message, suggestions, onRetry }) {
  return (
    <>
      <div className="error-message">{message}</div>
      <div className="error-suggestions">{suggestions}</div>
      <button className="retry-btn" onClick={onRetry}>
        Prøv igen
      </button>
    </>
  );
}
