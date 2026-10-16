import { NavLink } from 'react-router-dom';
import { NAVIGATION_ITEMS } from '../lib/navigation';

export function Sidebar({ isCollapsed, setIsCollapsed }: { isCollapsed: boolean; setIsCollapsed: (v: boolean) => void }) {
  return (
    <>
      {isCollapsed && (
        <button
          className="sidebar-toggle-fixed"
          onClick={() => setIsCollapsed(false)}
          title="Expand Sidebar"
        >
          <span className="sidebar-toggle-glyph">|||</span>
        </button>
      )}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-text">Verity</span>
          <button
            className="sidebar-toggle-btn"
            onClick={() => setIsCollapsed(true)}
            title="Collapse Sidebar"
          >
            <span className="sidebar-toggle-glyph">|||</span>
          </button>
        </div>
        <nav className="sidebar-nav">
          {NAVIGATION_ITEMS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              end={link.to === '/'}
            >
              <span className="nav-dot">{link.shortcut}</span>
              <span className="nav-label">{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
