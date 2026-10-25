import { useState, useEffect, useCallback } from 'react';
import { api, HabitWithCheckins } from '../lib/api';
import { useAuth } from '../lib/auth';
import { today } from '../lib/dateUtils';
import type { Habit, HabitStreak, LeaderboardEntry } from '../types';

function parseTargetDays(habit: Habit): number[] {
  try {
    const parsed = JSON.parse(habit.target_days || '[0,1,2,3,4,5,6]');
    return Array.isArray(parsed) ? parsed : [0, 1, 2, 3, 4, 5, 6];
  } catch {
    return [0, 1, 2, 3, 4, 5, 6];
  }
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  habits: HabitWithCheckins[];
  timestamp: number;
}

function getCacheKey(ownerId: string): string {
  return `verity_habits_cache_${ownerId}`;
}

function getCached(ownerId: string): CachedData | null {
  try {
    const raw = localStorage.getItem(getCacheKey(ownerId));
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedData;
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function setCached(ownerId: string, data: CachedData): void {
  try {
    localStorage.setItem(getCacheKey(ownerId), JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to cache habits data:', err);
  }
}

function clearCached(ownerId: string): void {
  try {
    localStorage.removeItem(getCacheKey(ownerId));
  } catch (err) {
    console.warn('Failed to clear habits cache:', err);
  }
}

export function useHabits() {
  const { identity } = useAuth();
  const ownerId = identity?.id || 'default';

  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<Record<string, Set<string>>>({});
  const [streaks, setStreaks] = useState<Record<string, HabitStreak>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Try cache first unless force refresh
      const cached = !forceRefresh ? getCached(ownerId) : null;
      
      let data: HabitWithCheckins[];
      
      if (cached) {
        data = cached.habits;
      } else {
        // Use batch endpoint - single API call!
        data = await api.getAllHabitsWithCheckins();
        setCached(ownerId, { habits: data, timestamp: Date.now() });
      }

      // Convert to Habit format (add required fields with defaults)
      const habitsData: Habit[] = data.map(h => ({
        id: h.id,
        name: h.name,
        area: h.area,
        target_days: h.target_days,
        created_at: new Date().toISOString(),
      }));
      setHabits(habitsData);

      // Build checkins map from batch response (no extra API calls!)
      const checkinsMap: Record<string, Set<string>> = {};
      for (const h of data) {
        checkinsMap[h.id] = new Set(h.checkins);
      }
      setCheckins(checkinsMap);

      // Calculate streaks from checkins locally (avoid N+1 API calls)
      const streakData: Record<string, HabitStreak> = {};
      for (const h of data) {
        const dates = [...h.checkins].sort();
        if (dates.length === 0) {
          streakData[h.id] = { habitId: h.id, currentStreak: 0, longestStreak: 0, totalCheckins: 0, lastCheckinDate: null };
          continue;
        }

        // Current streak
        let currentStreak = 0;
        const t = today();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().slice(0, 10);
        let cursorDate = dates.includes(t) ? t : (dates.includes(yStr) ? yStr : '');

        while (cursorDate && dates.includes(cursorDate)) {
          currentStreak++;
          const d = new Date(cursorDate);
          d.setDate(d.getDate() - 1);
          cursorDate = d.toISOString().slice(0, 10);
        }

        // Longest streak
        let longestStreak = 0;
        let streak = 0;
        for (let i = 0; i < dates.length; i++) {
          if (i === 0) {
            streak = 1;
          } else {
            const prev = new Date(dates[i - 1]);
            const curr = new Date(dates[i]);
            const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
            if (diff === 1) {
              streak++;
            } else {
              streak = 1;
            }
          }
          longestStreak = Math.max(longestStreak, streak);
        }

        streakData[h.id] = {
          habitId: h.id,
          currentStreak,
          longestStreak,
          totalCheckins: dates.length,
          lastCheckinDate: dates[dates.length - 1] || null,
        };
      }
      setStreaks(streakData);

      // Build leaderboard from calculated streaks
      const board: LeaderboardEntry[] = habitsData.map(h => ({
        habitId: h.id,
        name: h.name,
        area: h.area,
        currentStreak: streakData[h.id]?.currentStreak || 0,
        longestStreak: streakData[h.id]?.longestStreak || 0,
      }));
      board.sort((a, b) => b.currentStreak - a.currentStreak);
      setLeaderboard(board);

    } catch (err) {
      console.error('Failed to load habits:', err);
      setError(err instanceof Error ? err.message : 'Failed to load habits data.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addHabit = useCallback(async (name: string, area: string, targetDays?: number[]) => {
    const newHabit = await api.createHabit(name, area, targetDays);
    clearCached(ownerId);
    setHabits(prev => [...prev, newHabit]);
    setCheckins(prev => ({ ...prev, [newHabit.id]: new Set() }));
    setStreaks(prev => ({
      ...prev,
      [newHabit.id]: { habitId: newHabit.id, currentStreak: 0, longestStreak: 0, totalCheckins: 0, lastCheckinDate: null }
    }));
    return newHabit;
  }, [ownerId]);

  const deleteHabit = useCallback(async (id: string) => {
    await api.deleteHabit(id);
    clearCached(ownerId);
    setHabits(prev => prev.filter(h => h.id !== id));
    setCheckins(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setStreaks(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    // Refresh leaderboard
    const board = await api.getLeaderboard();
    setLeaderboard(board);
  }, [ownerId]);

  const toggleCheckin = useCallback(async (id: string, date?: string) => {
    const d = date || today();
    const result = await api.toggleCheckin(id, d);
    clearCached(ownerId);
    setCheckins(prev => {
      const set = new Set(prev[id] || []);
      if (result.checked) set.add(d);
      else set.delete(d);
      return { ...prev, [id]: set };
    });
    // Refresh streak for this habit
    try {
      const streak = await api.getStreak(id);
      setStreaks(prev => ({ ...prev, [id]: streak }));
      const board = await api.getLeaderboard();
      setLeaderboard(board);
    } catch {
      // Ignore streak refresh errors
    }
  }, [ownerId]);

  const isCheckedToday = useCallback((id: string) => {
    return checkins[id]?.has(today()) || false;
  }, [checkins]);

  const isScheduledToday = useCallback((id: string) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return false;
    const days = parseTargetDays(habit);
    const todayDay = new Date().getDay();
    return days.includes(todayDay);
  }, [habits]);

  const getTargetDays = useCallback((id: string): number[] => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return [0, 1, 2, 3, 4, 5, 6];
    return parseTargetDays(habit);
  }, [habits]);

  const updateTargetDays = useCallback(async (id: string, targetDays: number[]) => {
    await api.updateTargetDays(id, targetDays);
    clearCached(ownerId);
    setHabits(prev => prev.map(h => 
      h.id === id ? { ...h, target_days: JSON.stringify(targetDays) } : h
    ));
  }, [ownerId]);

  // Aggregate checkins for heatmap: date -> number of habits checked
  const aggregateCheckins = useCallback((): Record<string, number> => {
    const map: Record<string, number> = {};
    Object.values(checkins).forEach(dateSet => {
      dateSet.forEach(date => {
        map[date] = (map[date] || 0) + 1;
      });
    });
    return map;
  }, [checkins]);

  return { 
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
    updateTargetDays,
    aggregateCheckins, 
    refresh: load 
  };
}
