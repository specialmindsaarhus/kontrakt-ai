import Logo from './Logo';
import HamburgerMenu from './HamburgerMenu';

export default function AppHeader({ onMenuClick, logoPath }) {
  return (
    <div className="app-header">
      <Logo logoPath={logoPath} />
      <HamburgerMenu onClick={onMenuClick} />
    </div>
  );
}
