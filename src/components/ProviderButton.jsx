import { useState } from 'react';

/**
 * ProviderButton Component
 *
 * Individual button for CLI provider selection.
 *
 * Props:
 * - label: Display text (e.g., "Gemini")
 * - providerName: Internal provider identifier (e.g., "gemini")
 * - selected: Whether this button is selected
 * - version: CLI version string (optional)
 * - onClick: Click callback
 */
function ProviderButton({ label, selected, version, onClick }) {
  const [_isHovered, _setIsHovered] = useState(false);

  return (
    <button
      className={`provider-btn ${selected ? 'selected' : ''}`}
      onClick={onClick}
      onMouseEnter={() => _setIsHovered(true)}
      onMouseLeave={() => _setIsHovered(false)}
      aria-label={`Select ${label} CLI provider`}
    >
      <span className="provider-label">{label}</span>
      {version && <span className="version">v{version}</span>}
    </button>
  );
}

export default ProviderButton;
