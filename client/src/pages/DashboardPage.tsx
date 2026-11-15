import { useDashboard } from '../hooks/useDashboard';
import { useTargets } from '../hooks/useTargets';
import { useAreaColors } from '../hooks/useAreaColors';
import { useScoring } from '../hooks/useScoring';
import { useAuth } from '../lib/auth';
import { CompositeHero } from '../components/dashboard/CompositeHero';
import { AreaChecklist } from '../components/dashboard/AreaChecklist';
import { WeeklyHabitGrid } from '../components/dashboard/WeeklyHabitGrid';
import { TargetsPanel } from '../components/dashboard/TargetsPanel';
import { DashboardShimmer } from '../components/Shimmer';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBanner } from '../components/ui/StatusBanner';
import type { LifeArea } from '../lib/scoring';

export function DashboardPage() {
  const { identity } = useAuth();
  const {
    weekly,
    loading,
    error,
    toggleCheckin,
    refresh,
  } = useDashboard();
  const { getColor } = useAreaColors();
  const { targets, addTarget, updateTarget, removeTarget, completeTarget, setPrimary } = useTargets();
  const { areScores, composite, loading: scoringLoading } = useScoring();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const username = identity?.username;

  // Build area scores map for AreaChecklist
  const areaScoreMap: Partial<Record<LifeArea, number>> = {};
  for (const s of areScores) {
    areaScoreMap[s.area] = s.score;
  }

  if (loading) {
    return <DashboardShimmer />;
  }

  return (
    <div className="page-shell dashboard-page-shell">
      <div className="dashboard-header-wrapper anim-stagger-1">
        <PageHeader
          title={username ? `Welcome, ${username}` : 'Dashboard'}
          subtitle="Your daily pulse across Play, Health, Mind, and Social — designed for a fast scan and a faster loop."
        />
      </div>

      {error && (
        <StatusBanner
          tone="danger"
          message={error}
          actions={<button className="status-action" onClick={() => void refresh()}>Retry</button>}
        />
      )}

      {/* ── Composite Score Hero Section ── */}
      <div className="anim-stagger-2">
        <CompositeHero
          composite={composite}
          areaScores={areScores}
          loading={scoringLoading}
        />
      </div>

      {/* ── Targets + Area Checklist ── */}
      <div className="section dashboard-command-grid anim-stagger-3">
        <TargetsPanel
          targets={targets}
          addTarget={addTarget}
          updateTarget={updateTarget}
          removeTarget={removeTarget}
          completeTarget={completeTarget}
          setPrimary={setPrimary}
        />
        <AreaChecklist
          weekly={weekly}
          todayStr={todayStr}
          onToggle={toggleCheckin}
          areaScores={areaScoreMap}
        />
      </div>

      {/* ── Weekly Habit Grid ── */}
      <div className="section anim-stagger-4">
        <WeeklyHabitGrid weekly={weekly} todayStr={todayStr} onToggle={toggleCheckin} getColor={getColor} />
      </div>
    </div>
  );
}
