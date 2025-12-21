/**
 * ProviderErrorOverlay Component
 *
 * Fixed position overlay that appears when no providers are found.
 * Floats over the GUI and provides installation links.
 *
 * Props:
 * - visible: Whether to show the overlay
 */
export default function ProviderErrorOverlay({ visible }) {
  if (!visible) return null;

  return (
    <div className="provider-error-overlay">
      <div className="provider-error-content">
        <p className="error-title">Ingen LLM CLI fundet</p>
        <p className="error-message">Installer mindst én:</p>
        <ul className="error-links">
          <li><a href="https://ai.google.dev/gemini-api/docs/cli" target="_blank" rel="noopener noreferrer">Gemini CLI</a></li>
          <li><a href="https://claude.ai/cli" target="_blank" rel="noopener noreferrer">Claude CLI</a></li>
          <li><a href="https://platform.openai.com/docs" target="_blank" rel="noopener noreferrer">OpenAI CLI</a></li>
        </ul>
      </div>
    </div>
  );
}
