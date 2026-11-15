import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { today } from '../lib/dateUtils';
import {
  getStoredData,
  saveHabitLocal,
  deleteHabitLocal,
  toggleCheckinLocal,
  updateTargetDaysLocal,
  mergeServerHabits,
  computeHabitStreak,
} from '../lib/habitStorage';
import type { Habit, HabitStreak, LeaderboardEntry } from '../types';

function parseTargetDays(habit: Habit): number[] {
  try {
    const parsed = JSON.parse(habit.target_days || '[0,1,2,3,4,5,6]');
    return Array.isArray(parsed) ? parsed : [0, 1, 2, 3, 4, 5, 6];
  } catch {
    return [0, 1, 2, 3, 4, 5, 6];
  }
}

export function useHabits() {
  const { identity } = useAuth();
  const ownerId = identity?.id || 'default';

  // Seed initial state immediately from persistent storage
  const [habits, setHabits] = useState<Habit[]>(() => getStoredData(ownerId).habits);
  const [checkins, setCheckins] = useState<Record<string, Set<string>>>(() => {
    const stored = getStoredData(ownerId).checkins;
    const map: Record<string, Set<string>> = {};
    for (const [id, dates] of Object.entries(stored)) {
      map[id] = new Set(dates);
    }
    return map;
  });
  const [streaks, setStreaks] = useState<Record<string, HabitStreak>>(() => {
    const stored = getStoredData(ownerId);
    const map: Record<string, HabitStreak> = {};
    for (const h of stored.habits) {
      const dates = stored.checkins[h.id] || [];
      const s = computeHabitStreak(dates);
      map[h.id] = { ...s, habitId: h.id };
    }
    return map;
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const stored = getStoredData(ownerId);
    const board: LeaderboardEntry[] = stored.habits.map(h => {
      const dates = stored.checkins[h.id] || [];
      const s = computeHabitStreak(dates);
      return {
        habitId: h.id,
        name: h.name,
        area: h.area,
        currentStreak: s.currentStreak,
        longestStreak: s.longestStreak,
      };
    });
    board.sort((a, b) => b.currentStreak - a.currentStreak);
    return board;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyHabitData = useCallback((habitsList: Habit[], checkinsDict: Record<string, string[]>) => {
    setHabits(habitsList);

    const cMap: Record<string, Set<string>> = {};
    const sMap: Record<string, HabitStreak> = {};
    for (const h of habitsList) {
      const dates = checkinsDict[h.id] || [];
      cMap[h.id] = new Set(dates);
      const s = computeHabitStreak(dates);
      sMap[h.id] = { ...s, habitId: h.id };
    }
    setCheckins(cMap);
    setStreaks(sMap);

    const board: LeaderboardEntry[] = habitsList.map(h => ({
      habitId: h.id,
      name: h.name,
      area: h.area,
      currentStreak: sMap[h.id]?.currentStreak || 0,
      longestStreak: sMap[h.id]?.longestStreak || 0,
    }));
    board.sort((a, b) => b.currentStreak - a.currentStreak);
    setLeaderboard(board);
  }, []);

  const load = useCallback(async (_forceRefresh = false) => {
    setError(null);

    // 1. Load instantly from local persistent storage
    const currentLocal = getStoredData(ownerId);
    applyHabitData(currentLocal.habits, currentLocal.checkins);

    // 2. Sync with server in background / try-catch
    try {
      const serverData = await api.getAllHabitsWithCheckins();
      // Safely merge without discarding local habits
      const merged = mergeServerHabits(ownerId, serverData);
      applyHabitData(merged.habits, merged.checkins);
    } catch (err) {
      // Local copy is fully intact; log warning without breaking user flow
      console.warn('Server sync unavailable, using persistent local habits:', err);
    }
  }, [ownerId, applyHabitData]);

  useEffect(() => {
    void load();
  }, [load]);

  const addHabit = useCallback(async (name: string, area: string, targetDays?: number[]) => {
    const daysArr = Array.isArray(targetDays) ? targetDays : [0, 1, 2, 3, 4, 5, 6];
    const habitId = `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const newHabit: Habit = {
      id: habitId,
      name: name.trim(),
      area,
      target_days: JSON.stringify(daysArr),
      created_at: new Date().toISOString(),
    };

    // Save locally first — GUARANTEED persistence
    const updated = saveHabitLocal(ownerId, newHabit);
    applyHabitData(updated.habits, updated.checkins);

    // Sync with serverless backend
    try {
      const serverHabit = await api.createHabit(name, area, daysArr);
      if (serverHabit && serverHabit.id && serverHabit.id !== habitId) {
        // Update local id to match server if server generated a different id
        const alignedHabit: Habit = { ...newHabit, id: serverHabit.id };
        deleteHabitLocal(ownerId, habitId);
        const aligned = saveHabitLocal(ownerId, alignedHabit);
        applyHabitData(aligned.habits, aligned.checkins);
        return alignedHabit;
      }
    } catch (err) {
      console.warn('API createHabit failed, habit saved locally:', err);
    }

    return newHabit;
  }, [ownerId, applyHabitData]);

  const deleteHabit = useCallback(async (id: string) => {
    // Delete locally first
    const updated = deleteHabitLocal(ownerId, id);
    applyHabitData(updated.habits, updated.checkins);

    // Sync deletion to server
    try {
      await api.deleteHabit(id);
    } catch (err) {
      console.warn('API deleteHabit failed, habit deleted locally:', err);
    }
  }, [ownerId, applyHabitData]);

  const toggleCheckin = useCallback(async (id: string, date?: string) => {
    const d = date || today();
    // Toggle locally first
    const { data: updated } = toggleCheckinLocal(ownerId, id, d);
    applyHabitData(updated.habits, updated.checkins);

    // Sync with server
    try {
      await api.toggleCheckin(id, d);
    } catch (err) {
      console.warn('API toggleCheckin failed, checkin saved locally:', err);
    }
  }, [ownerId, applyHabitData]);

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
    const updated = updateTargetDaysLocal(ownerId, id, targetDays);
    applyHabitData(updated.habits, updated.checkins);

    try {
      await api.updateTargetDays(id, targetDays);
    } catch (err) {
      console.warn('API updateTargetDays failed, updated locally:', err);
    }
  }, [ownerId, applyHabitData]);

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
    refresh: load,
  };
}
