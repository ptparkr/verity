import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { ROUTE_TITLE_MAP } from '../../lib/navigation';

interface TopbarProps {
  onOpenCommandPalette: () => void;
}

export function Topbar({ onOpenCommandPalette }: TopbarProps) {
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

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="window-controls" aria-hidden="true">
          <span className="window-dot close" />
          <span className="window-dot minimize" />
          <span className="window-dot zoom" />
        </div>
        <div className="topbar-title-group">
          <span className="topbar-kicker">Verity</span>
          <span className="topbar-title">{pageTitle}</span>
        </div>
      </div>

      <div className="topbar-right">
        <button type="button" className="topbar-search" onClick={onOpenCommandPalette}>
          <span className="topbar-search-label">Search or jump</span>
          <kbd>Cmd/Ctrl K</kbd>
        </button>
        <div className="topbar-user" title="Guest workspace">
          <span className="topbar-user-indicator" />
          <span>{identity?.username}</span>
        </div>
        <div className="topbar-date">{dateLabel}</div>
      </div>
    </header>
  );
}
