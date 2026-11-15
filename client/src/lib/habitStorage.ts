import type {
  AreaSummary,
  ConsistencyData,
  Habit,
  HabitStreak,
  StreakData,
  WeeklyData,
} from '../types';
import type { HabitWithCheckins } from './api';
import { toDateStr, today } from './dateUtils';

export interface StoredHabitData {
  habits: Habit[];
  checkins: Record<string, string[]>; // habitId -> sorted array of YYYY-MM-DD
  updatedAt: number;
}

const STORAGE_PREFIX = 'verity_habits_store_';

export function getHabitsStoreKey(ownerId: string): string {
  return `${STORAGE_PREFIX}${ownerId || 'default'}`;
}

export function getStoredData(ownerId: string): StoredHabitData {
  try {
    const raw = localStorage.getItem(getHabitsStoreKey(ownerId));
    if (!raw) {
      // Check legacy cache key if migrating
      const legacyRaw = localStorage.getItem(`verity_habits_cache_${ownerId || 'default'}`);
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw) as { habits?: HabitWithCheckins[] };
        if (Array.isArray(legacy.habits) && legacy.habits.length > 0) {
          const habits: Habit[] = legacy.habits.map(h => ({
            id: h.id,
            name: h.name,
            area: h.area,
            target_days: h.target_days || '[0,1,2,3,4,5,6]',
            created_at: new Date().toISOString(),
          }));
          const checkins: Record<string, string[]> = {};
          for (const h of legacy.habits) {
            checkins[h.id] = [...(h.checkins || [])].sort();
          }
          const migrated: StoredHabitData = { habits, checkins, updatedAt: Date.now() };
          saveStoredData(ownerId, migrated);
          return migrated;
        }
      }
      return { habits: [], checkins: {}, updatedAt: Date.now() };
    }
    const data = JSON.parse(raw) as StoredHabitData;
    return {
      habits: Array.isArray(data.habits) ? data.habits : [],
      checkins: data.checkins && typeof data.checkins === 'object' ? data.checkins : {},
      updatedAt: data.updatedAt || Date.now(),
    };
  } catch (err) {
    console.warn('Failed to read stored habits data:', err);
    return { habits: [], checkins: {}, updatedAt: Date.now() };
  }
}

export function saveStoredData(ownerId: string, data: StoredHabitData): void {
  try {
    const payload = {
      habits: data.habits,
      checkins: data.checkins,
      updatedAt: Date.now(),
    };
    localStorage.setItem(getHabitsStoreKey(ownerId), JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed to save stored habits data:', err);
  }
}

export function saveHabitLocal(ownerId: string, habit: Habit): StoredHabitData {
  const current = getStoredData(ownerId);
  const existingIdx = current.habits.findIndex(h => h.id === habit.id);
  let nextHabits: Habit[];
  if (existingIdx >= 0) {
    nextHabits = [...current.habits];
    nextHabits[existingIdx] = habit;
  } else {
    nextHabits = [...current.habits, habit];
  }
  const nextCheckins = {
    ...current.checkins,
    [habit.id]: current.checkins[habit.id] || [],
  };
  const updated: StoredHabitData = {
    habits: nextHabits,
    checkins: nextCheckins,
    updatedAt: Date.now(),
  };
  saveStoredData(ownerId, updated);
  return updated;
}

export function deleteHabitLocal(ownerId: string, habitId: string): StoredHabitData {
  const current = getStoredData(ownerId);
  const nextHabits = current.habits.filter(h => h.id !== habitId);
  const nextCheckins = { ...current.checkins };
  delete nextCheckins[habitId];
  const updated: StoredHabitData = {
    habits: nextHabits,
    checkins: nextCheckins,
    updatedAt: Date.now(),
  };
  saveStoredData(ownerId, updated);
  return updated;
}

export function toggleCheckinLocal(ownerId: string, habitId: string, date: string): { isChecked: boolean; data: StoredHabitData } {
  const current = getStoredData(ownerId);
  const dates = new Set(current.checkins[habitId] || []);
  let isChecked: boolean;
  if (dates.has(date)) {
    dates.delete(date);
    isChecked = false;
  } else {
    dates.add(date);
    isChecked = true;
  }
  const nextCheckins = {
    ...current.checkins,
    [habitId]: Array.from(dates).sort(),
  };
  const updated: StoredHabitData = {
    ...current,
    checkins: nextCheckins,
    updatedAt: Date.now(),
  };
  saveStoredData(ownerId, updated);
  return { isChecked, data: updated };
}

export function updateTargetDaysLocal(ownerId: string, habitId: string, targetDays: number[]): StoredHabitData {
  const current = getStoredData(ownerId);
  const str = JSON.stringify(targetDays);
  const nextHabits = current.habits.map(h => (h.id === habitId ? { ...h, target_days: str } : h));
  const updated: StoredHabitData = {
    ...current,
    habits: nextHabits,
    updatedAt: Date.now(),
  };
  saveStoredData(ownerId, updated);
  return updated;
}

export function mergeServerHabits(
  ownerId: string,
  serverData: HabitWithCheckins[]
): StoredHabitData {
  const current = getStoredData(ownerId);

  // If server returns empty but local has habits, do not wipe local habits!
  if ((!serverData || serverData.length === 0) && current.habits.length > 0) {
    return current;
  }

  const habitMap = new Map<string, Habit>();
  for (const h of current.habits) {
    habitMap.set(h.id, h);
  }

  const checkinsMap: Record<string, Set<string>> = {};
  for (const [hId, dates] of Object.entries(current.checkins)) {
    checkinsMap[hId] = new Set(dates);
  }

  // Merge server records
  for (const s of serverData || []) {
    habitMap.set(s.id, {
      id: s.id,
      name: s.name,
      area: s.area,
      target_days: s.target_days || '[0,1,2,3,4,5,6]',
      created_at: new Date().toISOString(),
    });
    if (!checkinsMap[s.id]) {
      checkinsMap[s.id] = new Set();
    }
    for (const d of s.checkins || []) {
      checkinsMap[s.id].add(d);
    }
  }

  const mergedCheckins: Record<string, string[]> = {};
  for (const [hId, set] of Object.entries(checkinsMap)) {
    mergedCheckins[hId] = Array.from(set).sort();
  }

  const updated: StoredHabitData = {
    habits: Array.from(habitMap.values()),
    checkins: mergedCheckins,
    updatedAt: Date.now(),
  };
  saveStoredData(ownerId, updated);
  return updated;
}

export function computeHabitStreak(dates: string[]): HabitStreak {
  if (!dates || dates.length === 0) {
    return {
      habitId: '',
      currentStreak: 0,
      longestStreak: 0,
      totalCheckins: 0,
      lastCheckinDate: null,
    };
  }

  const sorted = [...dates].sort();
  const t = today();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = toDateStr(yesterday);

  let currentStreak = 0;
  let cursor = sorted.includes(t) ? t : (sorted.includes(yStr) ? yStr : '');

  while (cursor && sorted.includes(cursor)) {
    currentStreak++;
    const prev = new Date(cursor);
    prev.setDate(prev.getDate() - 1);
    cursor = toDateStr(prev);
  }

  let longestStreak = 0;
  let streak = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) {
        streak++;
      } else if (diff > 1) {
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak);
  }

  return {
    habitId: '',
    currentStreak,
    longestStreak,
    totalCheckins: sorted.length,
    lastCheckinDate: sorted[sorted.length - 1] || null,
  };
}

export function getWeeklyMatrixFromLocal(ownerId: string, referenceDate: Date = new Date()): WeeklyData {
  const data = getStoredData(ownerId);
  const day = referenceDate.getDay();
  const diff = referenceDate.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(referenceDate);
  monday.setDate(diff);

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(toDateStr(d));
  }

  const matrix = data.habits.map(h => {
    const datesSet = new Set(data.checkins[h.id] || []);
    return {
      habitId: h.id,
      name: h.name,
      area: h.area,
      days: weekDates.map(date => ({
        date,
        checked: datesSet.has(date),
      })),
    };
  });

  return { weekDates, matrix };
}

export function getStreaksFromLocal(ownerId: string): StreakData[] {
  const data = getStoredData(ownerId);
  return data.habits.map(h => {
    const dates = data.checkins[h.id] || [];
    const streak = computeHabitStreak(dates);
    return {
      habitId: h.id,
      name: h.name,
      area: h.area,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalCheckins: streak.totalCheckins,
    };
  });
}

export function getAreasFromLocal(ownerId: string): AreaSummary[] {
  const data = getStoredData(ownerId);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = toDateStr(thirtyDaysAgo);

  const areaMap: Record<string, { total: number; checkins: number }> = {};
  for (const h of data.habits) {
    const areaKey = (h.area || 'other').trim().toLowerCase();
    if (!areaMap[areaKey]) {
      areaMap[areaKey] = { total: 0, checkins: 0 };
    }
    areaMap[areaKey].total++;
    const dates = (data.checkins[h.id] || []).filter(d => d >= cutoff);
    areaMap[areaKey].checkins += dates.length;
  }

  return Object.entries(areaMap).map(([area, stats]) => {
    const possible = stats.total * 30;
    return {
      area,
      habitCount: stats.total,
      checkins: stats.checkins,
      possible,
      percentage: possible > 0 ? Math.round((stats.checkins / possible) * 100) : 0,
    };
  });
}

export function getConsistencyFromLocal(ownerId: string): ConsistencyData {
  const data = getStoredData(ownerId);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = toDateStr(thirtyDaysAgo);

  const totalHabits = data.habits.length;
  let totalCheckins = 0;
  for (const dates of Object.values(data.checkins)) {
    totalCheckins += dates.filter(d => d >= cutoff).length;
  }

  const possible = totalHabits * 30;
  const percentage = possible > 0 ? Math.round((totalCheckins / possible) * 100) : 0;

  return {
    totalHabits,
    totalCheckins,
    possible,
    percentage,
    missed: Math.max(0, possible - totalCheckins),
  };
}

export function getHabitsWithCheckinsFromLocal(ownerId: string): HabitWithCheckins[] {
  const data = getStoredData(ownerId);
  return data.habits.map(h => ({
    id: h.id,
    name: h.name,
    area: h.area,
    target_days: h.target_days,
    checkins: data.checkins[h.id] || [],
  }));
}
