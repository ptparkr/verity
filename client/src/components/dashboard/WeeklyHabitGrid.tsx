import { getWeekdayShort } from '../../lib/dateUtils';
import type { WeeklyData } from '../../types';
import { useAuth } from '../../lib/auth';
import { getWeeklyMatrixFromLocal } from '../../lib/habitStorage';

interface Props {
  weekly: WeeklyData | null;
  todayStr: string;
  onToggle: (habitId: string, date: string) => void;
  getColor: (area: string) => string;
}

function hexToRgba(hex: string, alpha: number): string {
  const safeHex = hex.startsWith('#') ? hex : '#8b949e';
  const r = parseInt(safeHex.slice(1, 3), 16);
  const g = parseInt(safeHex.slice(3, 5), 16);
  const b = parseInt(safeHex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function WeeklyHabitGrid({ weekly, todayStr, onToggle, getColor }: Props) {
  const { identity } = useAuth();
  const ownerId = identity?.id || 'default';
  const effectiveWeekly = (weekly && weekly.matrix.length > 0)
    ? weekly
    : getWeeklyMatrixFromLocal(ownerId);

  if (!effectiveWeekly || effectiveWeekly.matrix.length === 0) {
    return null;
  }

  return (
    <div className="card dashboard-card">
      <div className="dashboard-card-header">
        <div>
          <div className="card-title">Weekly Habit Grid</div>
          <p className="dashboard-card-subtitle">Seven days, every habit, one glance.</p>
        </div>
      </div>

      <div className="weekly-grid-shell">
        <table className="weekly-grid dashboard-weekly-grid">
          <thead>
            <tr>
              <th>Habit</th>
              {effectiveWeekly.weekDates.map(date => (
                <th key={date} className={date === todayStr ? 'today-column' : ''}>
                  {getWeekdayShort(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {effectiveWeekly.matrix.map(row => {
              const color = getColor(row.area);

              return (
                <tr key={row.habitId}>
                  <td>
                    <div className="dashboard-habit-cell">
                      <span className="dashboard-habit-color" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
                      <div>
                        <div className="dashboard-habit-name">{row.name}</div>
                        <div className="dashboard-habit-area">{row.area}</div>
                      </div>
                    </div>
                  </td>
                  {row.days.map(day => {
                    const isFuture = day.date > todayStr;
                    const isToday = day.date === todayStr;
                    const background = isFuture
                      ? 'transparent'
                      : day.checked
                        ? color
                        : hexToRgba(color, 0.12);
                    const borderColor = isFuture
                      ? 'var(--border)'
                      : day.checked
                        ? hexToRgba(color, 0.45)
                        : hexToRgba(color, 0.22);

                    return (
                      <td key={day.date} className={isToday ? 'today-column' : ''}>
                        <button
                          type="button"
                          className={`dashboard-grid-cell ${day.checked ? 'done' : ''} ${isFuture ? 'future' : ''}`}
                          title={`${row.name} on ${day.date}`}
                          onClick={() => {
                            if (!isFuture) {
                              onToggle(row.habitId, day.date);
                            }
                          }}
                          style={{
                            background,
                            borderColor,
                            boxShadow: day.checked ? `0 0 16px ${hexToRgba(color, 0.3)}` : 'none',
                            cursor: isFuture ? 'default' : 'pointer',
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
