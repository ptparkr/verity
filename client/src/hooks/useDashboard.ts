import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { AreaSummary, ConsistencyData, StreakData, WeeklyData } from '../types';

const DASHBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface DashboardCache {
  streaks: StreakData[];
  weekly: WeeklyData | null;
  areas: AreaSummary[];
  consistency: ConsistencyData | null;
  timestamp: number;
}

function getCacheKey(ownerId: string): string {
  return `verity_dashboard_cache_${ownerId}`;
}

function getDashboardCached(ownerId: string): DashboardCache | null {
  try {
    const raw = localStorage.getItem(getCacheKey(ownerId));
    if (!raw) return null;
    const cached = JSON.parse(raw) as DashboardCache;
    if (Date.now() - cached.timestamp > DASHBOARD_CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function setDashboardCached(ownerId: string, data: DashboardCache): void {
  try {
    localStorage.setItem(getCacheKey(ownerId), JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to cache dashboard data:', err);
  }
}

export function useDashboard() {
  const { identity } = useAuth();
  const ownerId = identity?.id || 'default';

  const [streaks, setStreaks] = useState<StreakData[]>(() => getDashboardCached(ownerId)?.streaks || []);
  const [weekly, setWeekly] = useState<WeeklyData | null>(() => getDashboardCached(ownerId)?.weekly || null);
  const [areas, setAreas] = useState<AreaSummary[]>(() => getDashboardCached(ownerId)?.areas || []);
  const [consistency, setConsistency] = useState<ConsistencyData | null>(() => getDashboardCached(ownerId)?.consistency || null);
  const [loading, setLoading] = useState(() => !getDashboardCached(ownerId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    setError(null);

    // Only show loading if no cache available
    const cached = !forceRefresh ? getDashboardCached(ownerId) : null;
    if (!cached) {
      setLoading(true);
    }

    try {
      // Fetch fresh data
      const [s, w, a, c] = await Promise.all([
        api.getStreaks(),
        api.getWeekly(),
        api.getAreas(),
        api.getConsistency(),
      ]);
      setStreaks(s);
      setWeekly(w);
      setAreas(a);
      setConsistency(c);
      
      // Cache the data scoped to this owner
      setDashboardCached(ownerId, {
        streaks: s,
        weekly: w,
        areas: a,
        consistency: c,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleCheckin = useCallback(async (habitId: string, date: string) => {
    try {
      await api.toggleCheckin(habitId, date);
      // Reload dashboard data
      await load(true);
    } catch (err) {
      console.error('Failed to toggle checkin:', err);
      setError(err instanceof Error ? err.message : 'Failed to update check-in.');
    }
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
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
