import { useMemo, useState } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useScoring } from '../hooks/useScoring';
import { CompositeGraph } from '../components/analytics/CompositeGraph';
import { HabitAreaAnalytics } from '../components/analytics/HabitAreaAnalytics';
import { HealthCorrelations } from '../components/analytics/HealthCorrelations';
import { WeeklyReport } from '../components/analytics/WeeklyReport';
import { PageHeader } from '../components/ui/PageHeader';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { StatusBanner } from '../components/ui/StatusBanner';
import { useAreaColors } from '../hooks/useAreaColors';

type TabId = 'overview' | 'habits' | 'health';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'habits', label: 'Habits' },
  { id: 'health', label: 'Health' },
];

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { getColor } = useAreaColors();
  const {
    weeklyReport,
    habitAreas,
    areaSummaries,
    consistency,
    streaks,
    healthCheckins,
    loading: analyticsLoading,
    error,
    refresh,
    getColor: analyticsGetColor,
  } = useAnalytics();

  const {
    composite,
    zoomedView,
    loading: scoringLoading,
  } = useScoring();

  const getAreaColor = analyticsGetColor || getColor;

  const overviewCards = useMemo(() => {
    const consistencyPct = consistency?.percentage || 0;
    const roundedComposite = Math.round(composite);

    return [
      { label: 'Composite Score', value: roundedComposite, unit: '/100', color: '#f0f6fc' },
      { label: 'Consistency', value: consistencyPct, unit: '%', color: '#1D9E75' },
    ];
  }, [consistency, composite]);

  const loading = analyticsLoading && scoringLoading;

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-state">
          <span className="empty-icon analytics-loading-dot">...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Analytics"
        subtitle="Your compounding momentum engine — see what your daily actions are building into."
      />

      {error && (
        <StatusBanner
          tone="danger"
          message={error}
          actions={<button className="status-action" onClick={() => void refresh()}>Retry</button>}
        />
      )}

      <SegmentedControl
        className="analytics-tabs"
        options={TABS.map(tab => ({ value: tab.id, label: tab.label }))}
        value={activeTab}
        onChange={setActiveTab}
      />

      <div className="analytics-content">
        {activeTab === 'overview' && (
          <div className="analytics-overview">
            <div className="stat-row">
              {overviewCards.map(card => (
                <div key={card.label} className="analytics-card">
                  <div className="analytics-card-value" style={{ color: card.color }}>
                    {card.value}{card.unit}
                  </div>
                  <div className="analytics-card-label">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Featured 4-Area Weighted Composite Graph */}
            <div className="analytics-section">
              <CompositeGraph zoomedView={zoomedView} loading={scoringLoading} />
            </div>

            <div className="analytics-section">
              <h3 className="analytics-section-title">This Week&apos;s Report</h3>
              {weeklyReport && <WeeklyReport report={weeklyReport} />}
            </div>
          </div>
        )}

        {activeTab === 'habits' && (
          <div className="analytics-habits">
            <div className="analytics-section">
              <h3 className="analytics-section-title">Area Completion Rates</h3>
              <HabitAreaAnalytics areas={areaSummaries} getColor={getAreaColor} />
            </div>

            <div className="analytics-section">
              <h3 className="analytics-section-title">Streak Leaderboard</h3>
              <StreakLeaderboardSimple streaks={streaks} getColor={getAreaColor} />
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div className="analytics-health">
            <div className="analytics-section">
              <h3 className="analytics-section-title">Health Metrics</h3>
              {healthCheckins.length > 0 ? (
                <>
                  <HealthMetricsPreview checkins={healthCheckins} />
                  <div className="analytics-section analytics-section-spaced">
                    <h3 className="analytics-section-title">Health Correlations</h3>
                    <HealthCorrelations checkins={healthCheckins} />
                  </div>
                </>
              ) : (
                <div className="analytics-empty">
                  <p>Log daily health check-ins to see correlations.</p>
                  <a href="/health" className="btn btn-ghost">Go to Health {'->'}</a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StreakLeaderboardSimple({ streaks, getColor }: { streaks: any[]; getColor: (area: string) => string }) {
  const sorted = [...streaks].sort((a, b) => b.currentStreak - a.currentStreak).slice(0, 5);

  return (
    <div className="streak-mini-list">
      {sorted.map((entry, index) => (
        <div key={entry.habitId || index} className="streak-mini-row">
          <span className="streak-mini-rank">#{index + 1}</span>
          <span className="streak-mini-name">{entry.name}</span>
          <span className="streak-mini-streak" style={{ color: getColor(entry.area) }}>
            {entry.currentStreak}d
          </span>
        </div>
      ))}
    </div>
  );
}

function HealthMetricsPreview({ checkins }: { checkins: any[] }) {
  if (checkins.length === 0) {
    return (
      <div className="analytics-empty">
        <p>No health metrics yet. Start by checking in on the Health page.</p>
      </div>
    );
  }

  const avg = (values: (number | null | undefined)[], fallback = 0) => {
    const presentValues = values.filter((value): value is number => typeof value === 'number');
    return presentValues.length > 0
      ? Math.round(presentValues.reduce((sum, value) => sum + value, 0) / presentValues.length)
      : fallback;
  };

  const sleep = avg(checkins.map(checkin => checkin.sleepHours));
  const hrv = avg(checkins.map(checkin => checkin.hrv));
  const energy = avg(checkins.map(checkin => checkin.energyLevel));
  const mood = avg(checkins.map(checkin => checkin.moodScore));

  return (
    <div className="health-metrics-grid">
      <div className="health-metric-card">
        <span className="health-metric-value">{sleep}h</span>
        <span className="health-metric-label">Avg Sleep</span>
      </div>
      <div className="health-metric-card">
        <span className="health-metric-value">{hrv}</span>
        <span className="health-metric-label">Avg HRV</span>
      </div>
      <div className="health-metric-card">
        <span className="health-metric-value">{energy}</span>
        <span className="health-metric-label">Avg Energy</span>
      </div>
      <div className="health-metric-card">
        <span className="health-metric-value">{mood}</span>
        <span className="health-metric-label">Avg Mood</span>
      </div>
    </div>
  );
}
