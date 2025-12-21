import { Settings } from 'lucide-react';

export default function HamburgerMenu({ onClick }) {
  return (
    <button
      className="settings-icon"
      onClick={onClick}
      aria-label="Åbn indstillinger"
    >
      <Settings size={20} />
    </button>
  );
}
