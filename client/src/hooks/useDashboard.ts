import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { AreaSummary, ConsistencyData, StreakData, WeeklyData } from '../types';

const DASHBOARD_CACHE_KEY = 'dashboard_cache';
const DASHBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface DashboardCache {
  streaks: StreakData[];
  weekly: WeeklyData | null;
  areas: AreaSummary[];
  consistency: ConsistencyData | null;
  timestamp: number;
}

function getDashboardCached(): DashboardCache | null {
  try {
    const raw = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as DashboardCache;
    if (Date.now() - cached.timestamp > DASHBOARD_CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function setDashboardCached(data: DashboardCache): void {
  try {
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to cache dashboard data:', err);
  }
}

const getInitialState = () => {
  const cached = getDashboardCached();
  if (cached) {
    return {
      streaks: cached.streaks,
      weekly: cached.weekly,
      areas: cached.areas,
      consistency: cached.consistency,
      loading: false,
    };
  }
  return {
    streaks: [] as StreakData[],
    weekly: null as WeeklyData | null,
    areas: [] as AreaSummary[],
    consistency: null as ConsistencyData | null,
    loading: true,
  };
};

const initialState = getInitialState();

export function useDashboard() {
  const [streaks, setStreaks] = useState<StreakData[]>(initialState.streaks);
  const [weekly, setWeekly] = useState<WeeklyData | null>(initialState.weekly);
  const [areas, setAreas] = useState<AreaSummary[]>(initialState.areas);
  const [consistency, setConsistency] = useState<ConsistencyData | null>(initialState.consistency);
  const [loading, setLoading] = useState(initialState.loading);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    setError(null);

    // Only show loading if no cache available
    const cached = !forceRefresh ? getDashboardCached() : null;
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
      
      // Cache the data
      setDashboardCached({
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
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleCheckin = useCallback(async (habitId: string, date: string) => {
    try {
      await api.toggleCheckin(habitId, date);
      load(true);
    } catch (err) {
      console.error('Failed to toggle checkin:', err);
    }
  }, [load]);

  return {
    streaks,
    weekly,
    areas,
    consistency,
    loading,
    error,
    toggleCheckin,
    refresh: load,
  };
}
