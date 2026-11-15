/**
 * AreaChecklist — organizes habits by canonical Verity life-areas
 * (Play, Health, Mind, Social) plus any custom user areas.
 *
 * Displays per-area: dot, daily ratio badge, EMA momentum score, and
 * inline check buttons for each habit.
 */
import { Link } from 'react-router-dom';
import type { WeeklyData } from '../../types';
import { AREA_COLORS } from '../../hooks/useScoring';
import type { LifeArea } from '../../lib/scoring';
import { AREA_ALIAS_MAP } from '../../lib/scoring';
import { useAuth } from '../../lib/auth';
import { getWeeklyMatrixFromLocal } from '../../lib/habitStorage';

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
  const safeHex = hex?.startsWith('#') ? hex : '#8b949e';
  const r = parseInt(safeHex.slice(1, 3), 16) || 120;
  const g = parseInt(safeHex.slice(3, 5), 16) || 120;
  const b = parseInt(safeHex.slice(5, 7), 16) || 120;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function AreaChecklist({ weekly, todayStr, onToggle, areaScores = {} }: Props) {
  const { identity } = useAuth();
  const ownerId = identity?.id || 'default';

  // Use weekly from prop, or fallback to local matrix if prop is empty/null
  const effectiveWeekly = (weekly && weekly.matrix.length > 0)
    ? weekly
    : getWeeklyMatrixFromLocal(ownerId);

  if (!effectiveWeekly || effectiveWeekly.matrix.length === 0) {
    return (
      <div className="card dashboard-card">
        <div className="dashboard-card-header">
          <div>
            <div className="card-title">Area Check-in</div>
            <p className="dashboard-card-subtitle">Daily habit flow across your life areas.</p>
          </div>
        </div>
        <div className="empty-state dashboard-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🎯</div>
          <span className="empty-text" style={{ display: 'block', marginBottom: '1.25rem', color: 'var(--fg-muted)' }}>
            No habits created yet. Add habits to Play, Health, Mind, or Social to begin compounding.
          </span>
          <Link
            to="/habits"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <span>+ Add Habits</span>
          </Link>
        </div>
      </div>
    );
  }

  // Group matrix rows by canonical area or custom area
  type RowType = typeof effectiveWeekly.matrix[0];
  const canonicalGroups: Record<LifeArea, RowType[]> = {
    play: [], health: [], mind: [], social: [],
  };
  const customGroups: Record<string, RowType[]> = {};

  for (const row of effectiveWeekly.matrix) {
    const rawArea = (row.area ?? '').trim().toLowerCase();
    const canonical = AREA_ALIAS_MAP[rawArea] as LifeArea | undefined;
    if (canonical && canonicalGroups[canonical]) {
      canonicalGroups[canonical].push(row);
    } else {
      const groupKey = row.area?.trim() || 'Other';
      if (!customGroups[groupKey]) customGroups[groupKey] = [];
      customGroups[groupKey].push(row);
    }
  }

  const activeCanonicalAreas = CANONICAL_ORDER.filter(a => canonicalGroups[a].length > 0);
  const activeCustomAreas = Object.keys(customGroups);

  return (
    <div className="card dashboard-card dashboard-quick-check">
      <div className="dashboard-card-header">
        <div>
          <div className="card-title">Area Check-in</div>
          <p className="dashboard-card-subtitle">Today's habits across your life areas.</p>
        </div>
        <Link
          to="/habits"
          style={{
            fontSize: '0.8rem',
            color: 'var(--fg-muted)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          Manage Habits →
        </Link>
      </div>

      <div className="quick-check-groups">
        {/* Canonical areas */}
        {activeCanonicalAreas.map(area => {
          const rows = canonicalGroups[area];
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
                        className={`quick-check-box ${checked ? 'is-checked' : ''}`}
                        style={checked ? {
                          background: color,
                          borderColor: color,
                          boxShadow: `0 0 14px ${color}66`,
                        } : undefined}
                      >
                        {checked && (
                          <svg
                            className="quick-check-icon"
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#050814"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span className="quick-check-label">{row.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Custom areas */}
        {activeCustomAreas.map(customAreaName => {
          const rows = customGroups[customAreaName];
          const color = '#38bdf8'; // Sky blue for custom areas
          const completed = rows.filter(row =>
            row.days.some(day => day.date === todayStr && day.checked)
          ).length;

          return (
            <section
              key={customAreaName}
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
                  <span>{customAreaName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                        className={`quick-check-box ${checked ? 'is-checked' : ''}`}
                        style={checked ? {
                          background: color,
                          borderColor: color,
                          boxShadow: `0 0 14px ${color}66`,
                        } : undefined}
                      >
                        {checked && (
                          <svg
                            className="quick-check-icon"
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#050814"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
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
