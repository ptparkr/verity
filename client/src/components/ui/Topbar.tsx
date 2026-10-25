import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { ROUTE_TITLE_MAP } from '../../lib/navigation';
import { VerticalBurgerButton } from './VerticalBurgerButton';

interface TopbarProps {
  onOpenCommandPalette: () => void;
  onToggleSidebar?: () => void;
  onToggleMobileMenu?: () => void;
  isSidebarCollapsed?: boolean;
}

export function Topbar({
  onOpenCommandPalette,
  onToggleSidebar,
  onToggleMobileMenu,
  isSidebarCollapsed = false,
}: TopbarProps) {
  const location = useLocation();
  const { identity } = useAuth();
  const pageTitle = ROUTE_TITLE_MAP[location.pathname] ?? 'Verity';

  const dateLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const username = identity?.username || 'Guest';
  const userInitial = username.charAt(0).toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Mobile Vertical Burger Menu Trigger */}
        <VerticalBurgerButton
          className="topbar-mobile-burger"
          onClick={() => onToggleMobileMenu?.()}
          title="Open Navigation"
          ariaLabel="Open navigation menu"
        />

        {/* Desktop Sidebar Expand Trigger (when collapsed) */}
        {isSidebarCollapsed && (
          <VerticalBurgerButton
            className="topbar-desktop-expand"
            onClick={() => onToggleSidebar?.()}
            title="Expand Sidebar"
            ariaLabel="Expand sidebar"
          />
        )}

        <div className="window-controls" aria-hidden="true">
          <span className="window-dot close" />
          <span className="window-dot minimize" />
          <span className="window-dot zoom" />
        </div>

        <div className="topbar-title-group">
          <span className="topbar-kicker">Verity Workspace</span>
          <h1 className="topbar-title">{pageTitle}</h1>
        </div>
      </div>

      <div className="topbar-right">
        <button
          type="button"
          className="topbar-search"
          onClick={onOpenCommandPalette}
          title="Search or jump (Cmd/Ctrl + K)"
        >
          <svg
            className="topbar-search-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span className="topbar-search-label">Search or jump</span>
          <kbd>⌘K</kbd>
        </button>

        <div className="topbar-user" title={`Logged in as ${username}`}>
          <div className="topbar-user-avatar">
            <span>{userInitial}</span>
          </div>
          <span className="topbar-username">{username}</span>
          <span className="topbar-user-indicator" />
        </div>

        <div className="topbar-date">{dateLabel}</div>
      </div>
    </header>
  );
}
