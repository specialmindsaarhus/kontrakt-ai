import { useState } from 'react';

export default function OutputButton({ label, format, onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      className="output-btn"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Export as ${label}`}
    >
      {label}
    </button>
  );
}
