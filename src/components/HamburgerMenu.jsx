import { useState } from 'react';
import { Menu } from 'lucide-react';

export default function HamburgerMenu({ onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      className="hamburger-menu"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Open menu"
    >
      <Menu size={20} />
    </button>
  );
}
