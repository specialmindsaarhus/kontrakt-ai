import { useState } from 'react';

export default function PromptButton({ label, promptName, selected, onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      className={`prompt-btn ${selected ? 'selected' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Select ${label} prompt`}
    >
      {label}
    </button>
  );
}
