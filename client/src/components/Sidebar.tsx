import { NavLink } from 'react-router-dom';
import { NAVIGATION_ITEMS } from '../lib/navigation';
import { VerticalBurgerButton } from './ui/VerticalBurgerButton';
import { useAuth } from '../lib/auth';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

function NavIcon({ to }: { to: string }) {
  switch (to) {
    case '/':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case '/habits':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case '/health':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
    case '/analytics':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case '/settings':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    default:
      return null;
  }
}

function VerityLogo() {
  return (
    <div className="verity-brand-mark">
      <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
        <defs>
          <linearGradient id="vMarkGrad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00ffcc" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="24" height="24" rx="7" fill="rgba(0, 255, 204, 0.12)" stroke="url(#vMarkGrad)" strokeWidth="1.6" />
        <path d="M8 9.5L14 20L20 9.5" stroke="url(#vMarkGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const { identity } = useAuth();
  const username = identity?.username || 'Guest';
  const userInitial = username.charAt(0).toUpperCase();

  const handleNavClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleToggle = () => {
    if (onCloseMobile && isMobileOpen) {
      onCloseMobile();
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
        aria-label="Main Navigation"
      >
        {/* Brand Header */}
        <div className="sidebar-brand">
          <NavLink to="/" className="sidebar-brand-link" onClick={handleNavClick}>
            <VerityLogo />
            <span className="brand-text">Verity</span>
          </NavLink>
          <VerticalBurgerButton
            isOpen={!isCollapsed}
            onClick={handleToggle}
            title={isMobileOpen ? 'Close Menu' : isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            ariaLabel={isMobileOpen ? 'Close Menu' : isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="sidebar-toggle-btn"
          />
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {NAVIGATION_ITEMS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              end={link.to === '/'}
              onClick={handleNavClick}
              title={isCollapsed ? `${link.label} (${link.shortcut})` : link.hint}
            >
              <span className="nav-icon-box">
                <NavIcon to={link.to} />
              </span>
              <span className="nav-label">{link.label}</span>
              <span className="nav-shortcut">{link.shortcut}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer / User Profile Card */}
        <div className="sidebar-footer">
          <NavLink
            to="/settings"
            className="sidebar-user-card"
            onClick={handleNavClick}
            title="Account & Settings"
          >
            <div className="sidebar-avatar">
              <span>{userInitial}</span>
              <span className="sidebar-avatar-status" />
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-username">{username}</span>
              <span className="sidebar-workspace-label">Guest • Local</span>
            </div>
          </NavLink>
        </div>
      </aside>
    </>
  );
}
