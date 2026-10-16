/**
 * AreaChecklist — replaces HabitQuickCheck on the Dashboard
 *
 * Organizes habits by the 4 canonical Verity life-areas:
 *   Play (career) | Health | Mind | Social
 *
 * Displays per-area: dot, daily ratio badge, EMA momentum score, and
 * inline check buttons for each habit due today.
 */
import type { WeeklyData } from '../../types';
import { AREA_COLORS } from '../../hooks/useScoring';
import type { LifeArea } from '../../lib/scoring';
import { AREA_ALIAS_MAP } from '../../lib/scoring';

interface Props {
  weekly: WeeklyData | null;
  todayStr: string;
  onToggle: (habitId: string, date: string) => void;
  /** Current EMA momentum score per area (0–100). May be partial if no data yet. */
  areaScores?: Partial<Record<LifeArea, number>>;
}

const CANONICAL_ORDER: LifeArea[] = ['play', 'health', 'mind', 'social'];

const AREA_DISPLAY: Record<LifeArea, string> = {
  play:   'Play',
  health: 'Health',
  mind:   'Mind',
  social: 'Social',
};

function hexToRgba(hex: string, alpha: number): string {
  const safeHex = hex.startsWith('#') ? hex : '#8b949e';
  const r = parseInt(safeHex.slice(1, 3), 16);
  const g = parseInt(safeHex.slice(3, 5), 16);
  const b = parseInt(safeHex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function AreaChecklist({ weekly, todayStr, onToggle, areaScores = {} }: Props) {
  if (!weekly || weekly.matrix.length === 0) {
    return (
      <div className="card dashboard-card">
        <div className="card-title">Area Check-in</div>
        <div className="empty-state dashboard-empty">
          <span className="empty-text">
            Add habits to Play, Health, Mind, or Social to begin tracking your momentum.
          </span>
        </div>
      </div>
    );
  }

  // Group matrix rows by canonical area
  const grouped: Record<LifeArea, typeof weekly.matrix> = {
    play: [], health: [], mind: [], social: [],
  };

  for (const row of weekly.matrix) {
    const canonical = AREA_ALIAS_MAP[(row.area ?? '').toLowerCase()] as LifeArea | undefined;
    if (canonical) grouped[canonical].push(row);
  }

  // Only render areas that have habits
  const activeAreas = CANONICAL_ORDER.filter(a => grouped[a].length > 0);

  return (
    <div className="card dashboard-card dashboard-quick-check">
      <div className="dashboard-card-header">
        <div>
          <div className="card-title">Area Check-in</div>
          <p className="dashboard-card-subtitle">Today's habits across your 4 life areas.</p>
        </div>
      </div>

      <div className="quick-check-groups">
        {activeAreas.map(area => {
          const rows = grouped[area];
          const color = AREA_COLORS[area];
          const completed = rows.filter(row =>
            row.days.some(day => day.date === todayStr && day.checked)
          ).length;
          const momentumScore = areaScores[area];

          return (
            <section
              key={area}
              className="quick-check-group"
              style={{
                borderColor: hexToRgba(color, 0.28),
                background: `linear-gradient(135deg, ${hexToRgba(color, 0.14)}, rgba(5, 8, 20, 0.7))`,
              }}
            >
              <header className="quick-check-group-header">
                <div className="quick-check-area">
                  <span
                    className="quick-check-area-dot"
                    style={{ background: color, boxShadow: `0 0 12px ${color}` }}
                  />
                  <span>{AREA_DISPLAY[area]}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {momentumScore != null && (
                    <span
                      className="quick-check-pill"
                      title={`${AREA_DISPLAY[area]} momentum score (EMA)`}
                      style={{
                        color: 'var(--fg-muted)',
                        background: hexToRgba(color, 0.08),
                        borderColor: hexToRgba(color, 0.16),
                        fontSize: '0.7rem',
                      }}
                    >
                      {momentumScore.toFixed(0)}pts
                    </span>
                  )}
                  <span
                    className="quick-check-pill"
                    style={{
                      color,
                      background: hexToRgba(color, 0.12),
                      borderColor: hexToRgba(color, 0.24),
                    }}
                  >
                    {completed}/{rows.length}
                  </span>
                </div>
              </header>

              <div className="quick-check-items">
                {rows.map(row => {
                  const todayState = row.days.find(day => day.date === todayStr);
                  const checked = Boolean(todayState?.checked);

                  return (
                    <button
                      key={row.habitId}
                      type="button"
                      className={`quick-check-item ${checked ? 'checked' : ''}`}
                      onClick={() => onToggle(row.habitId, todayStr)}
                      style={checked ? {
                        borderColor: hexToRgba(color, 0.42),
                        background: hexToRgba(color, 0.16),
                      } : undefined}
                    >
                      <span
                        className="quick-check-box"
                        style={checked ? {
                          background: color,
                          borderColor: color,
                          boxShadow: `0 0 14px ${color}55`,
                        } : undefined}
                      >
                        {checked ? '✓' : ''}
                      </span>
                      <span className="quick-check-label">{row.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
