import { useState, useEffect, useMemo } from 'react';
import { useHabits } from '../hooks/useHabits';
import { useAreaColors } from '../hooks/useAreaColors';
import { HabitCheckin } from '../components/HabitCheckin';
import { Heatmap } from '../components/Heatmap';
import { CustomDropdown } from '../components/CustomDropdown';
import { StreakLeaderboard } from '../components/StreakLeaderboard';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBanner } from '../components/ui/StatusBanner';
import { toDateStr, addDays } from '../lib/dateUtils';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function HabitsPage() {
  const { 
    habits, 
    checkins, 
    streaks,
    leaderboard,
    loading, 
    error, 
    addHabit, 
    deleteHabit, 
    toggleCheckin, 
    isCheckedToday,
    isScheduledToday,
    getTargetDays,
    aggregateCheckins, 
    refresh 
  } = useHabits();
  const { areas, getColor, updateColor, addArea, removeArea } = useAreaColors();
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [viewMode, setViewMode] = useState<'all' | string>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [targetDays, setTargetDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [showDaySelector, setShowDaySelector] = useState(false);

  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaColor, setNewAreaColor] = useState('#58a6ff');

  const premiumPresets = [
    '#00ffcc', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
    '#f43f5e', '#f59e0b', '#14b8a6', '#6366f1'
  ];

  useEffect(() => {
    if (areas.length > 0 && (!area || !areas.includes(area))) {
      setArea(areas[0]);
    }
  }, [areas, area]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !area) return;
    await addHabit(name.trim(), area, targetDays);
    setName('');
    setTargetDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const toggleDay = (day: number) => {
    if (targetDays.includes(day)) {
      if (targetDays.length > 1) {
        setTargetDays(targetDays.filter(d => d !== day));
      }
    } else {
      setTargetDays([...targetDays, day].sort());
    }
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    const cleanName = newAreaName.trim().toLowerCase();
    await addArea(cleanName, newAreaColor);
    setNewAreaName('');
    if (!area) setArea(cleanName);
  };

  const handleDeleteArea = async (areaToDelete: string) => {
    if (confirm(`Delete area "${areaToDelete}" and all its habits? This cannot be undone.`)) {
      await removeArea(areaToDelete);
      if (area === areaToDelete) {
        const nextAreas = areas.filter(a => a !== areaToDelete);
        setArea(nextAreas.length > 0 ? nextAreas[0] : '');
      }
      await refresh(true);
    }
  };

  const grouped = areas.map(a => ({
    area: a,
    habits: habits.filter(h => h.area === a),
  })).filter(g => g.habits.length > 0 || areas.length > 0);

  const areaProgress = useMemo(() => {
    const today = new Date().getDay();
    const result: Record<string, { scheduled: number; completed: number; percentage: number }> = {};
    
    for (const a of areas) {
      const areaHabits = habits.filter(h => h.area === a);
      let scheduled = 0;
      let completed = 0;
      
      for (const h of areaHabits) {
        const days = getTargetDays(h.id);
        if (days.includes(today)) {
          scheduled++;
          if (checkins[h.id]?.has(toDateStr(new Date()))) {
            completed++;
          }
        }
      }
      
      result[a] = {
        scheduled,
        completed,
        percentage: scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0
      };
    }
    
    return result;
  }, [areas, habits, checkins, getTargetDays]);

  const last7Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      days.push(toDateStr(addDays(new Date(), -i)));
    }
    return days;
  }, []);

  const getHabitLast7Days = (habitId: string) => {
    const habitTargetDays = getTargetDays(habitId);
    const habitCheckins = checkins[habitId] || new Set();
    
    return last7Days.map(date => {
      const dayOfWeek = new Date(date).getDay();
      const scheduled = habitTargetDays.includes(dayOfWeek);
      const completed = habitCheckins.has(date);
      return { date, completed, scheduled };
    });
  };

  const getHeatmapData = (): Record<string, number> => {
    if (viewMode === 'all') return aggregateCheckins();
    const dates = checkins[viewMode];
    if (!dates) return {};
    const map: Record<string, number> = {};
    dates.forEach(d => { map[d] = 1; });
    return map;
  };

  const areaColors = areas.reduce((acc, a) => {
    acc[a] = getColor(a);
    return acc;
  }, {} as Record<string, string>);

  if (loading && habits.length === 0) {
    return (
      <div className="page-shell">
        <div className="empty-state"><span className="empty-icon" style={{ animation: 'pulse 1.5s infinite' }}>...</span></div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Habits & Areas"
        subtitle="Track your daily habits across your customizable areas of life."
      />

      {error && (
        <StatusBanner
          tone="danger"
          message={error}
          actions={<button className="status-action" onClick={() => void refresh()}>Retry</button>}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--gap-lg)' }}>
        <div className={`card habit-mgmt-card ${isDropdownOpen ? 'has-open-dropdown' : ''}`}>
          <div className="card-title">Add Habit</div>
          <form className="add-habit-form" style={{ marginBottom: 0 }} onSubmit={handleSubmit}>
            <input
              className="input"
              type="text"
              placeholder="New habit name..."
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ flex: 1 }}
              id="habit-name-input"
            />
            
            <CustomDropdown 
              options={areas.map(a => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1), color: getColor(a) }))}
              value={area}
              onChange={setArea}
              placeholder="Select Area"
              onToggle={setIsDropdownOpen}
            />

            <button className="btn btn-primary" type="submit" id="add-habit-btn">+</button>
          </form>
          
          <div style={{ marginTop: 'var(--space-sm)' }}>
            <button 
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowDaySelector(!showDaySelector)}
              style={{ fontSize: 12, padding: '4px 8px' }}
            >
              {showDaySelector ? 'v' : '>'} Schedule: {targetDays.length}/7 days
            </button>
            {showDaySelector && (
              <div className="day-selector">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    className={targetDays.includes(i) ? 'active' : ''}
                    onClick={() => toggleDay(i)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Add Area</div>
          <form className="add-habit-form" style={{ marginBottom: 0 }} onSubmit={handleAddArea}>
            <input
              className="input"
              type="text"
              placeholder="New area name..."
              value={newAreaName}
              onChange={e => setNewAreaName(e.target.value)}
              style={{ flex: 1 }}
            />
            
            <div className="color-picker-container">
              <div className="preset-palette">
                {premiumPresets.map(c => (
                  <div 
                    key={c}
                    className={`color-dot ${newAreaColor === c ? 'active' : ''}`}
                    style={{ background: c, color: c }}
                    onClick={() => setNewAreaColor(c)}
                  />
                ))}
                <div className="custom-color-trigger" style={{ position: 'relative' }}>
                  <input
                    type="color"
                    value={newAreaColor}
                    onChange={e => setNewAreaColor(e.target.value)}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer',
                      width: '100%',
                      height: '100%'
                    }}
                  />
                  <span>+</span>
                </div>
              </div>
            </div>

            <button className="btn btn-ghost" type="submit">+</button>
          </form>
        </div>
      </div>

      {areas.length > 0 && (
        <div className="section" style={{ marginTop: 'var(--gap-lg)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--gap-md)' }}>
            {areas.map(a => {
              const prog = areaProgress[a] || { scheduled: 0, completed: 0, percentage: 0 };
              if (prog.scheduled === 0) return null;
              return (
                <div 
                  key={a}
                  className="area-progress"
                  style={{ 
                    flex: '1 1 150px',
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  <span style={{ color: getColor(a), fontWeight: 600, minWidth: 60 }}>{a}</span>
                  <div className="area-progress-bar">
                    <div 
                      className="area-progress-fill"
                      style={{ 
                        width: `${prog.percentage}%`,
                        background: getColor(a)
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {prog.completed}/{prog.scheduled}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {areas.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 32 }}>
          <span className="empty-icon">o</span>
          <span className="empty-text">No areas defined. Add your first area!</span>
        </div>
      ) : (
        <div className="section" style={{ marginTop: 'var(--gap-xl)' }}>
          <div className="area-grid">
            {grouped.map(group => (
              <div key={group.area} style={{ marginBottom: 'var(--gap-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-sm)', marginBottom: 'var(--gap-sm)' }}>
                  <input
                    type="color"
                    value={getColor(group.area)}
                    onChange={e => updateColor(group.area, e.target.value)}
                    title={`Change ${group.area} color`}
                    style={{
                      width: 18,
                      height: 18,
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: 'transparent',
                      padding: 0,
                    }}
                  />
                  <span className="section-title" style={{ color: getColor(group.area), textShadow: `0 0 15px ${getColor(group.area)}40` }}>
                    {group.area}
                  </span>
                  <button 
                    onClick={() => handleDeleteArea(group.area)}
                    style={{ 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      border: '1px solid rgba(239, 68, 68, 0.2)', 
                      color: 'var(--danger)', 
                      cursor: 'pointer', 
                      fontSize: 10, 
                      marginLeft: 'auto',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                    title="Delete area"
                  >
                    Delete
                  </button>
                </div>
                {group.habits.length === 0 && (
                   <div style={{ fontSize: 13, color: 'var(--text-muted)', paddingLeft: 26, fontStyle: 'italic', marginBottom: 'var(--gap-sm)' }}>No habits in this area.</div>
                )}
                <div className="habit-list" style={{ gap: 'var(--gap-sm)' }}>
                  {group.habits.map(h => {
                    const streakData = streaks[h.id];
                    return (
                      <HabitCheckin
                        key={h.id}
                        habitId={h.id}
                        name={h.name}
                        area={h.area}
                        areaColor={getColor(h.area)}
                        checked={isCheckedToday(h.id)}
                        scheduled={isScheduledToday(h.id)}
                        streak={streakData?.currentStreak || 0}
                        longestStreak={streakData?.longestStreak || 0}
                        last7Days={getHabitLast7Days(h.id)}
                        onToggle={() => toggleCheckin(h.id)}
                        onDelete={() => deleteHabit(h.id)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {habits.length > 0 && (
        <div className="section" style={{ marginTop: 'var(--gap-xl)' }}>
          <div className="card">
            <div className="section-header" style={{ marginBottom: 'var(--gap-lg)' }}>
              <span className="card-title" style={{ marginBottom: 0 }}>Contribution Graph</span>
              <div className="toggle-group anim-fade-in">
                <button
                  className={`toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
                  onClick={() => setViewMode('all')}
                >
                  Global Activity
                </button>
                {habits.slice(0, 5).map(h => (
                  <button
                    key={h.id}
                    className={`toggle-btn ${viewMode === h.id ? 'active' : ''}`}
                    onClick={() => setViewMode(h.id)}
                  >
                    {h.name.length > 12 ? h.name.slice(0, 10) + '...' : h.name}
                  </button>
                ))}
              </div>
            </div>
            <Heatmap checkins={getHeatmapData()} />
          </div>
        </div>
      )}

      {habits.length > 0 && leaderboard.length > 0 && (
        <div className="section" style={{ marginTop: 'var(--gap-xl)' }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 'var(--gap-md)' }}>Streak Leaderboard</div>
            <StreakLeaderboard entries={leaderboard} areaColors={areaColors} />
          </div>
        </div>
      )}
    </div>
  );
}
