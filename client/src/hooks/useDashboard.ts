import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  getWeeklyMatrixFromLocal,
  getStreaksFromLocal,
  getAreasFromLocal,
  getConsistencyFromLocal,
  toggleCheckinLocal,
  getStoredData,
} from '../lib/habitStorage';
import type { AreaSummary, ConsistencyData, StreakData, WeeklyData } from '../types';

export function useDashboard() {
  const { identity } = useAuth();
  const ownerId = identity?.id || 'default';

  // Initialize immediately from persistent local store
  const [streaks, setStreaks] = useState<StreakData[]>(() => getStreaksFromLocal(ownerId));
  const [weekly, setWeekly] = useState<WeeklyData | null>(() => getWeeklyMatrixFromLocal(ownerId));
  const [areas, setAreas] = useState<AreaSummary[]>(() => getAreasFromLocal(ownerId));
  const [consistency, setConsistency] = useState<ConsistencyData | null>(() => getConsistencyFromLocal(ownerId));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncFromLocal = useCallback(() => {
    setStreaks(getStreaksFromLocal(ownerId));
    setWeekly(getWeeklyMatrixFromLocal(ownerId));
    setAreas(getAreasFromLocal(ownerId));
    setConsistency(getConsistencyFromLocal(ownerId));
  }, [ownerId]);

  const load = useCallback(async () => {
    setError(null);
    syncFromLocal();

    try {
      const [s, w, a, c] = await Promise.all([
        api.getStreaks(),
        api.getWeekly(),
        api.getAreas(),
        api.getConsistency(),
      ]);

      const localData = getStoredData(ownerId);
      const hasLocalHabits = localData.habits.length > 0;

      // Only use server data if it's not empty, or if we have no local habits
      if (s && (s.length > 0 || !hasLocalHabits)) {
        setStreaks(s);
      }
      if (w && (w.matrix.length > 0 || !hasLocalHabits)) {
        setWeekly(w);
      }
      if (a && (a.length > 0 || !hasLocalHabits)) {
        setAreas(a);
      }
      if (c && (c.totalHabits > 0 || !hasLocalHabits)) {
        setConsistency(c);
      }
    } catch (err) {
      console.warn('Dashboard server sync unavailable, using persistent local store:', err);
      syncFromLocal();
    }
  }, [ownerId, syncFromLocal]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleCheckin = useCallback(async (habitId: string, date: string) => {
    try {
      // Toggle locally first — instant response & resilient persistence
      toggleCheckinLocal(ownerId, habitId, date);
      syncFromLocal();

      // Sync to API in background
      await api.toggleCheckin(habitId, date);
    } catch (err) {
      console.warn('API toggleCheckin failed, state preserved locally:', err);
    }
  }, [ownerId, syncFromLocal]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return {
    streaks,
    weekly,
    areas,
    consistency,
    loading,
    error,
    toggleCheckin,
    refresh,
  };
}
