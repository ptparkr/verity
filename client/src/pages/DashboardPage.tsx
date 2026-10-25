import { useDashboard } from '../hooks/useDashboard';
import { useTargets } from '../hooks/useTargets';
import { useAreaColors } from '../hooks/useAreaColors';
import { useAnalytics } from '../hooks/useAnalytics';
import { useScoring, AREA_COLORS } from '../hooks/useScoring';
import { useAuth } from '../lib/auth';
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
    streaks,
    weekly,
    consistency,
    loading,
    error,
    toggleCheckin,
    refresh,
  } = useDashboard();
  const { getColor } = useAreaColors();
  const { targets, addTarget, updateTarget, removeTarget, completeTarget, setPrimary } = useTargets();
  const { weeklyReport } = useAnalytics();
  const { areScores, composite, loading: scoringLoading } = useScoring();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const username = identity?.username;

  // Build area scores map for AreaChecklist
  const areaScoreMap: Partial<Record<LifeArea, number>> = {};
  for (const s of areScores) {
    areaScoreMap[s.area] = s.score;
  }

  if (loading && streaks.length === 0) {
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

      {/* ── Composite Score & Momentum Section ── */}
      <div className="dashboard-metrics-row anim-stagger-2">
        {!scoringLoading && composite > 0 && (
          <div
            className="streak-card dashboard-composite-card"
            style={{
              borderColor: 'rgba(0, 255, 204, 0.35)',
              background: 'linear-gradient(135deg, rgba(0, 255, 204, 0.12) 0%, rgba(16, 185, 129, 0.05) 100%)',
            }}
          >
            <div className="streak-card-icon" style={{ color: '#00ffcc' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="streak-card-content">
              <div className="streak-card-value" style={{ color: '#00ffcc' }}>
                {Math.round(composite)}<span className="streak-card-unit">/100</span>
              </div>
              <div className="streak-card-label">Composite Score</div>
            </div>
          </div>
        )}

        {/* ── Area Score Pills (per-area momentum) ── */}
        {!scoringLoading && areScores.length > 0 && (
          <div className="dashboard-momentum-row">
            {areScores.map(({ area, score, label }) => {
              const areaColor = AREA_COLORS[area as LifeArea] || '#00ffcc';
              return (
                <div
                  key={area}
                  className="analytics-card momentum-card"
                  style={{
                    borderColor: `${areaColor}35`,
                    background: `linear-gradient(135deg, ${areaColor}15 0%, rgba(12, 19, 32, 0.6) 100%)`,
                  }}
                >
                  <div
                    className="analytics-card-value"
                    style={{ color: areaColor, fontSize: '1.5rem' }}
                  >
                    {score.toFixed(0)}
                  </div>
                  <div className="analytics-card-label">{label}</div>
                </div>
              );
            })}
          </div>
        )}
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
