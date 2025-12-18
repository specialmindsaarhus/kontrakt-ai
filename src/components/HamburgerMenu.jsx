import { Menu } from 'lucide-react';

export default function HamburgerMenu({ onClick }) {
  return (
    <button
      className="hamburger-menu"
      onClick={onClick}
      aria-label="Open menu"
    >
      <Menu size={20} />
    </button>
  );
}
