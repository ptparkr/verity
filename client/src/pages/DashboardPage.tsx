import { useDashboard } from '../hooks/useDashboard';
import { useTargets } from '../hooks/useTargets';
import { useAreaColors } from '../hooks/useAreaColors';
import { useAnalytics } from '../hooks/useAnalytics';
import { useScoring, AREA_COLORS } from '../hooks/useScoring';
import { AreaChecklist } from '../components/dashboard/AreaChecklist';
import { WeeklyHabitGrid } from '../components/dashboard/WeeklyHabitGrid';
import { TargetsPanel } from '../components/dashboard/TargetsPanel';
import { DashboardShimmer } from '../components/Shimmer';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBanner } from '../components/ui/StatusBanner';
import type { LifeArea } from '../lib/scoring';

export function DashboardPage() {
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

  // Build area scores map for AreaChecklist
  const areaScoreMap: Partial<Record<LifeArea, number>> = {};
  for (const s of areScores) {
    areaScoreMap[s.area] = s.score;
  }

  if (loading && streaks.length === 0) {
    return <DashboardShimmer />;
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Dashboard"
        subtitle="Daily command center built for a fast scan and an even faster loop."
      />

      {error && (
        <StatusBanner
          tone="danger"
          message={error}
          actions={<button className="status-action" onClick={() => void refresh()}>Retry</button>}
        />
      )}

      {/* ── Composite Score ── */}
      {!scoringLoading && composite > 0 && (
        <div className="stat-row" style={{ justifyContent: 'flex-start' }}>
          <div
            className="streak-card"
            style={{
              borderColor: '#00ffcc44',
              background: '#00ffcc12',
            }}
          >
            <div className="streak-card-icon" style={{ color: '#00ffcc' }}>V</div>
            <div className="streak-card-content">
              <div className="streak-card-value" style={{ color: '#00ffcc' }}>
                {Math.round(composite)}<span className="streak-card-unit">/100</span>
              </div>
              <div className="streak-card-label">Composite Score</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Area Score Pills (per-area momentum) ── */}
      {!scoringLoading && areScores.length > 0 && (
        <div className="stat-row" style={{ gap: '0.5rem', marginBottom: 0 }}>
          {areScores.map(({ area, score, label }) => (
            <div
              key={area}
              className="analytics-card"
              style={{
                borderColor: AREA_COLORS[area as LifeArea] + '44',
                background: AREA_COLORS[area as LifeArea] + '12',
                minWidth: 0,
                flex: 1,
              }}
            >
              <div
                className="analytics-card-value"
                style={{ color: AREA_COLORS[area as LifeArea], fontSize: '1.5rem' }}
              >
                {score.toFixed(0)}
              </div>
              <div className="analytics-card-label">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Targets + Area Checklist ── */}
      <div className="section dashboard-command-grid">
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

      <div className="section">
        <WeeklyHabitGrid weekly={weekly} todayStr={todayStr} onToggle={toggleCheckin} getColor={getColor} />
      </div>
    </div>
  );
}
