import type { HealthCheckin, Habit, HabitWithSchedule } from '../types';

type WheelAxis = { id: string; currentScore: number; targetScore: number };

export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ─── Sleep × Focus Correlation ─────────────────────────────────────
export interface CorrelationPoint {
  date: string;
  sleepHours: number;
  avgFocusMinutes: number;
  avgQuality: number;
}

export function sleepFocusCorrelation(
  sessions: { date: string; focus_min: number; quality: number }[],
  checkins: HealthCheckin[]
): CorrelationPoint[] {
  const sleepByDate = new Map<string, number>();
  for (const c of checkins) {
    if (c.sleepHours != null) sleepByDate.set(c.date, c.sleepHours);
  }
  
  const focusByDate = new Map<string, { total: number; quality: number; count: number }>();
  for (const s of sessions) {
    if (!s.date) continue;
    const date = s.date;
    const existing = focusByDate.get(date) || { total: 0, quality: 0, count: 0 };
    focusByDate.set(date, {
      total: existing.total + (s.focus_min || 0),
      quality: existing.quality + (s.quality || 3),
      count: existing.count + 1
    });
  }
  
  const points: CorrelationPoint[] = [];
  const allDates = new Set([...sleepByDate.keys(), ...focusByDate.keys()]);
  
  for (const date of allDates) {
    const sleep = sleepByDate.get(date);
    const focus = focusByDate.get(date);
    if (sleep != null && focus && focus.count > 0) {
      points.push({
        date,
        sleepHours: sleep,
        avgFocusMinutes: Math.round(focus.total / focus.count),
        avgQuality: Math.round((focus.quality / focus.count) * 10) / 10
      });
    }
  }
  
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  if (points.length < 2) return { slope: 0, intercept: 0 };
  
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope: Math.round(slope * 1000) / 1000, intercept: Math.round(intercept * 1000) / 1000 };
}

// ─── Energy × Mood Correlation ─────────────────────────────────────────────
export interface EnergyMoodPoint {
  date: string;
  energy: number;
  mood: number;
}

export function energyMoodCorrelation(checkins: HealthCheckin[]): EnergyMoodPoint[] {
  return checkins
    .filter(c => c.energyLevel != null && c.moodScore != null)
    .map(c => ({
      date: c.date,
      energy: c.energyLevel!,
      mood: c.moodScore!
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Habit Area Completion (Weekly) ───────────────────────────────────────────
export interface HabitAreaCompletion {
  weekStart: string;
  areaId: string;
  rate: number;
}

export function habitAreaCompletionByWeek(
  habits: HabitWithSchedule[],
  areaId: string,
  entries: { habitId: string; date: string; completed: boolean }[],
  weeks = 8
): HabitAreaCompletion[] {
  const result: HabitAreaCompletion[] = [];
  const now = new Date();
  
  const areaHabits = habits.filter(h => h.area === areaId);
  
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - w * 7);
    weekStart.setHours(0, 0, 0, 0);
    
    let scheduled = 0;
    let completed = 0;
    
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const dayOfWeek = day.getDay();
      const dateStr = toLocalDateString(day);
      
      for (const h of areaHabits) {
        const targetDays = h.targetDays || [];
        if (!targetDays.includes(dayOfWeek)) continue;
        scheduled++;
        const entry = entries.find(e => e.habitId === h.id && e.date === dateStr && e.completed);
        if (entry) completed++;
      }
    }
    
    result.push({
      weekStart: toLocalDateString(weekStart),
      areaId,
      rate: scheduled > 0 ? Math.round((completed / scheduled) * 100) / 100 : 0
    });
  }
  
  return result;
}

// ─── Wheel Analytics ──────────────────────────────────────────────────────
export function wheelTrendByAxis(
  snapshots: { date: string; scores: Record<string, number> }[],
  axisId: string
): { date: string; score: number }[] {
  return snapshots
    .map(s => ({ date: s.date, score: s.scores[axisId] || 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function wheelBalanceScore(axes: { currentScore: number }[]): number {
  const scores = axes.map(a => a.currentScore);
  if (scores.length === 0) return 50;
  
  const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  return Math.max(0, Math.round(100 - stdDev * 10));
}

// ─── Weekly Report Builder ─────────────────────────────────────────────
export interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  totalFocusMinutes: number;
  focusByArea: Record<string, number>;
  completedSessions: number;
  completionRate: number;
  avgQuality: number | null;
  topFocusArea: string | null;
  habitCompletionRate: number;
  habitAreaRates: Record<string, number>;
  longestCurrentStreak: { name: string; days: number } | null;
  sleepAvg: number | null;
  hrvAvg: number | null;
  energyAvg: number | null;
  moodAvg: number | null;
  wheelBalanceScore: number;
  lowestWheelAxis: { id: string; label: string; score: number } | null;
  momentumScore: number;
  recommendations: string[];
}

const WHEEL_LABELS: Record<string, string> = {
  body: 'Body', mind: 'Mind', soul: 'Soul',
  growth: 'Growth', money: 'Money', mission: 'Mission',
  romance: 'Romance', family: 'Family', friends: 'Friends', joy: 'Joy'
};

export function buildWeeklyReport(
  sessions: { date: string; focus_min: number; quality: number; area: string; completed: boolean }[],
  checkins: HealthCheckin[],
  habits: HabitWithSchedule[],
  habitEntries: { habitId: string; date: string; completed: boolean }[],
  wheelAxes: { id: string; currentScore: number }[]
): WeeklyReportData {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = toLocalDateString(weekStart);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const weekEndStr = toLocalDateString(weekEnd);

  // Focus stats (will be empty since no Pomodoro)
  const weekSessions = sessions.filter(s => {
    if (!s.date) return false;
    return s.date >= weekStartStr && s.date <= weekEndStr;
  });
  const completed = weekSessions.filter(s => s.completed);
  const totalFocusMinutes = weekSessions.reduce((sum, s) => sum + (s.focus_min || 0), 0);
  const completionRate = weekSessions.length > 0 ? completed.length / weekSessions.length : 0;
  
  const qualitySessions = completed.filter(s => s.quality != null);
  const avgQuality = qualitySessions.length > 0
    ? qualitySessions.reduce((sum, s) => sum + (s.quality || 0), 0) / qualitySessions.length
    : null;
  
  const focusByArea: Record<string, number> = {};
  for (const s of weekSessions) {
    const area = s.area || 'other';
    focusByArea[area] = (focusByArea[area] || 0) + (s.focus_min || 0);
  }
  
  const sortedAreas = Object.entries(focusByArea).sort((a, b) => b[1] - a[1]);
  const topFocusArea = sortedAreas[0]?.[0] || null;
  
  // Habit stats
  let totalScheduled = 0;
  let totalCompleted = 0;
  const habitAreaRates: Record<string, number> = {};
  
  const areaIds = [...new Set(habits.map(h => h.area))];
  const completionLookup = new Set(habitEntries.map(e => `${e.habitId}:${e.date}`));
  const underperformingHabits: string[] = [];
  
  for (const areaId of areaIds) {
    let aScheduled = 0;
    let aCompleted = 0;
    
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const dayOfWeek = day.getDay();
      const dateStr = toLocalDateString(day);
      
      const dayHabits = habits.filter(h => h.area === areaId);
      for (const h of dayHabits) {
        const targetDays = h.targetDays || [];
        if (!targetDays.includes(dayOfWeek)) continue;
        aScheduled++;
        totalScheduled++;
        if (completionLookup.has(`${h.id}:${dateStr}`)) {
          aCompleted++;
          totalCompleted++;
        }
      }
    }
    
    habitAreaRates[areaId] = aScheduled > 0 ? Math.round((aCompleted / aScheduled) * 100) / 100 : 0;
  }
  
  const habitCompletionRate = totalScheduled > 0 ? totalCompleted / totalScheduled : 0;
  
  // Longest streak
  const streakByHabit = new Map<string, { name: string; days: number }>();
  for (const h of habits) {
    const entries = habitEntries.filter(e => e.habitId === h.id && e.completed);
    if (entries.length === 0) continue;
    
    const dates = entries.map(e => e.date).sort();
    let streak = 1;
    let current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) {
        current++;
        streak = Math.max(streak, current);
      } else {
        current = 1;
      }
    }
    streakByHabit.set(h.id, { name: h.name, days: streak });
  }
  
  const longestCurrentStreak = [...streakByHabit.values()].sort((a, b) => b.days - a.days)[0] || null;
  
  // Health averages
  const weekCheckins = checkins.filter(c => c.date >= weekStartStr);
  const avg = (arr: (number | null)[]) => {
    const vals = arr.filter((x): x is number => x !== null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const sleepAvg = avg(weekCheckins.map(c => c.sleepHours));
  const hrvAvg = avg(weekCheckins.map(c => c.hrv));
  const energyAvg = avg(weekCheckins.map(c => c.energyLevel));
  const moodAvg = avg(weekCheckins.map(c => c.moodScore));
  
  // Wheel
  const wheelScore = wheelBalanceScore(wheelAxes);
  const sortedAxes = [...wheelAxes].sort((a, b) => a.currentScore - b.currentScore);
  const lowestWheelAxis = sortedAxes[0] ? { id: sortedAxes[0].id, label: WHEEL_LABELS[sortedAxes[0].id] || sortedAxes[0].id, score: sortedAxes[0].currentScore } : null;
  
  // Momentum (will be 0 since no Pomodoro)
  const momentumScore = 0;
  
  // Recommendations
  const recommendations: string[] = [];
  if (habitCompletionRate < 0.6) {
    recommendations.push(`Overall habit completion was ${Math.round(habitCompletionRate * 100)}%. Consider dropping 1-2 low-impact habits.`);
  }
  
  // Detect specific underperforming habits
  for (const h of habits) {
    const relevantEntries = habitEntries.filter(e => e.habitId === h.id && e.date >= weekStartStr);
    const scheduledCount = Array.from({length: 7}).filter((_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return h.targetDays?.includes(d.getDay());
    }).length;
    
    if (scheduledCount > 0 && relevantEntries.length / scheduledCount < 0.4) {
      underperformingHabits.push(h.name);
    }
  }

  if (underperformingHabits.length > 0) {
    recommendations.push(`Habit friction detected: "${underperformingHabits.slice(0, 2).join(', ')}" were often missed. Try a smaller version of these.`);
  }
  if (lowestWheelAxis && lowestWheelAxis.score < 4) {
    recommendations.push(`"${lowestWheelAxis.label}" is your lowest wheel axis (${lowestWheelAxis.score}/10). One intentional action this week can move it.`);
  }
  if (sleepAvg !== null && sleepAvg < 7) {
    recommendations.push(`Average sleep was ${sleepAvg.toFixed(1)} hrs — below the 7-hr threshold for optimal focus.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('Excellent week. Raise your lowest wheel axis by 1 point next week.');
  }
  while (recommendations.length < 3) {
    recommendations.push('Log HRV and mood daily to unlock deeper correlations.');
  }
  
  return {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    totalFocusMinutes,
    focusByArea,
    completedSessions: completed.length,
    completionRate: Math.round(completionRate * 100) / 100,
    avgQuality: avgQuality ? Math.round(avgQuality * 10) / 10 : null,
    topFocusArea,
    habitCompletionRate: Math.round(habitCompletionRate * 100) / 100,
    habitAreaRates,
    longestCurrentStreak,
    sleepAvg: sleepAvg ? Math.round(sleepAvg * 10) / 10 : null,
    hrvAvg: hrvAvg ? Math.round(hrvAvg) : null,
    energyAvg: energyAvg ? Math.round(energyAvg * 10) / 10 : null,
    moodAvg: moodAvg ? Math.round(moodAvg * 10) / 10 : null,
    wheelBalanceScore: wheelScore,
    lowestWheelAxis,
    momentumScore,
    recommendations: recommendations.slice(0, 5)
  };
}