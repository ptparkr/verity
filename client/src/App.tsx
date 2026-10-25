import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/ui/Topbar';
import { CommandPalette } from './components/ui/CommandPalette';
import { GuestEntry } from './components/auth/GuestEntry';
import { AreaColorsProvider } from './hooks/useAreaColors';
import { useAuth } from './lib/auth';
import { loadSettings } from './lib/settings';
import { storageGetString, storageSetString } from './lib/storage';
import { DashboardPage } from './pages/DashboardPage';
import { HabitsPage } from './pages/HabitsPage';
import { HealthPage } from './pages/HealthPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const { identity, isBooting } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = loadSettings().preferences.reducedMotion ? 'true' : 'false';
  }, []);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => storageGetString('verity_sidebar_collapsed', 'false') === 'true'
  );

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen(current => !current);
      }
      if (event.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSidebarChange = (nextValue: boolean) => {
    setIsSidebarCollapsed(nextValue);
    storageSetString('verity_sidebar_collapsed', String(nextValue));
  };

  if (isBooting) {
    return (
      <main className="app-boot-shell">
        <div className="app-boot-mark" />
        <span>Restoring your workspace</span>
      </main>
    );
  }

  if (!identity) {
    return <GuestEntry />;
  }

  return (
    <AreaColorsProvider>
      <div className={`app-layout ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''} ${isMobileMenuOpen ? 'is-mobile-menu-open' : ''}`}>
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={handleSidebarChange}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
        <div className="workspace-shell">
          <Topbar
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onToggleSidebar={() => handleSidebarChange(!isSidebarCollapsed)}
            onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
            isSidebarCollapsed={isSidebarCollapsed}
          />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <CommandPalette open={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      </div>
    </AreaColorsProvider>
  );
}
