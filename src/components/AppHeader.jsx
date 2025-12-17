import Logo from './Logo';
import HamburgerMenu from './HamburgerMenu';

export default function AppHeader({ onMenuClick }) {
  return (
    <div className="app-header">
      <Logo />
      <HamburgerMenu onClick={onMenuClick} />
    </div>
  );
}
