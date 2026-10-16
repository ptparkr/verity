import type {
  AreaColor,
  AreaSummary,
  ConsistencyData,
  DeleteResponse,
  FocusAnalytics,
  FocusQuality,
  Habit,
  HabitStreak,
  LeaderboardEntry,
  PomodoroSession,
  StreakData,
  ToggleCheckinResponse,
  WeeklyData,
  HealthCheckin,
  LongevityScore,
  HealthTrend,
  BiologicalMarker,
  TodayCheckinStatus,
} from '../types';

const BASE = '/api';
const ACTIVE_IDENTITY_META_KEY = 'activeIdentityId';

/**
 * IndexedDB name. Supports both legacy ('karma-yoga-local-first') and
 * new ('verity-local-first') databases transparently for backward compat.
 */
const INDEXED_DB_NAMES = ['verity-local-first', 'karma-yoga-local-first'];

let activeGuestId: string | null = null;

async function readActiveGuestIdFromIndexedDb(): Promise<string | null> {
  if (typeof indexedDB === 'undefined') return null;

  for (const dbName of INDEXED_DB_NAMES) {
    const result = await tryReadFromDb(dbName);
    if (result) return result;
  }
  return null;
}

function tryReadFromDb(dbName: string): Promise<string | null> {
  return new Promise(resolve => {
    const request = indexedDB.open(dbName, 1);
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      try {
        const tx = db.transaction('meta', 'readonly');
        const store = tx.objectStore('meta');
        const getRequest = store.get(ACTIVE_IDENTITY_META_KEY);
        getRequest.onsuccess = () => {
          db.close();
          resolve(getRequest.result?.value ?? null);
        };
        getRequest.onerror = () => {
          db.close();
          resolve(null);
        };
      } catch {
        db.close();
        resolve(null);
      }
    };
  });
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  activeGuestId = activeGuestId ?? await readActiveGuestIdFromIndexedDb();

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      // Send both headers: X-Verity-Guest-ID (new) and X-Karma-Guest-ID (legacy).
      // Server accepts either. This ensures zero downtime during migration.
      ...(activeGuestId ? {
        'X-Verity-Guest-ID': activeGuestId,
        'X-Karma-Guest-ID':  activeGuestId,
      } : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `API ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as T) : (undefined as T);
  } catch (err) {
    throw new Error(`Invalid JSON response: ${err}`);
  }
}

export type HabitWithCheckins = {
  id: string;
  name: string;
  area: string;
  target_days: string;
  checkins: string[];
};

export const api = {
  // Habits
  getHabits: () => request<Habit[]>('/habits'),
  createHabit: (name: string, area: string, targetDays?: number[]) =>
    request<Habit>('/habits', { method: 'POST', body: JSON.stringify({ name, area, targetDays }) }),
  deleteHabit: (id: string) =>
    request<DeleteResponse>(`/habits/${id}`, { method: 'DELETE' }),
  toggleCheckin: (id: string, date?: string) =>
    request<ToggleCheckinResponse>(`/habits/${id}/checkin`, { method: 'POST', body: JSON.stringify({ date }) }),
  getCheckins: (id: string) => request<string[]>(`/habits/${id}/checkins`),
  getStreak: (id: string) => request<HabitStreak>(`/habits/${id}/streak`),
  getLeaderboard: () => request<LeaderboardEntry[]>('/habits/leaderboard'),
  updateTargetDays: (id: string, targetDays: number[]) =>
    request<{ success: boolean; targetDays: number[] }>(`/habits/${id}/target-days`, { method: 'PUT', body: JSON.stringify({ targetDays }) }),
  getCheckinsInRange: (id: string, start: string, end: string) =>
    request<string[]>(`/habits/${id}/checkins/range?start=${start}&end=${end}`),
  /** Batch fetch ALL habits with their check-in dates (avoids N+1 for scoring). */
  getAllHabitsWithCheckins: () => request<HabitWithCheckins[]>('/habits/all/checkins'),
  /** Alias for scoring hook compatibility */
  getHabitsWithCheckins: () => request<HabitWithCheckins[]>('/habits/all/checkins'),

  // Dashboard
  getStreaks: () => request<StreakData[]>('/dashboard/streaks'),
  getWeekly: () => request<WeeklyData>('/dashboard/weekly'),
  getAreas: () => request<AreaSummary[]>('/dashboard/areas'),
  getConsistency: () => request<ConsistencyData>('/dashboard/consistency'),

  // Pomodoro
  logSession: (focus_min: number, break_min: number, completed: boolean, area?: string, intention?: string, quality?: FocusQuality) =>
    request<{ success: true }>('/pomodoro', { method: 'POST', body: JSON.stringify({ focus_min, break_min, completed, area, intention, quality }) }),
  getTodaySessions: () => request<PomodoroSession[]>('/pomodoro/today'),
  getRecentSessions: (days = 7) => request<PomodoroSession[]>(`/pomodoro/recent?days=${days}`),
  getFocusAnalytics: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<FocusAnalytics>(`/pomodoro/analytics${query}`);
  },
  runRustAnalytics: (payload: unknown) =>
    request<unknown>('/utils/rust-analytics', { method: 'POST', body: JSON.stringify(payload) }),

  // Areas
  getAreaColors: () => request<AreaColor[]>('/areas'),
  updateAreaColor: (name: string, color: string) =>
    request<AreaColor>(`/areas/${name}`, { method: 'PUT', body: JSON.stringify({ color }) }),
  addArea: (name: string, color: string) =>
    request<AreaColor>('/areas', { method: 'POST', body: JSON.stringify({ name, color }) }),
  deleteArea: (name: string) =>
    request<DeleteResponse>(`/areas/${name}`, { method: 'DELETE' }),

  // Health
  getTodayCheckin: () => request<TodayCheckinStatus>('/health/today'),
  getHealthCheckins: (days = 30) => request<HealthCheckin[]>(`/health/checkins?days=${days}`),
  createCheckin: (checkin: Partial<HealthCheckin>) =>
    request<HealthCheckin>('/health/checkin', { method: 'POST', body: JSON.stringify(checkin) }),
  getHealthTrends: (metric: string, days = 30) =>
    request<HealthTrend[]>(`/health/trends/${metric}?days=${days}`),
  getLongevity: (age?: number) => request<LongevityScore>(`/health/longevity${age ? `?age=${age}` : ''}`),
  createMarker: (marker: Partial<BiologicalMarker>) =>
    request<BiologicalMarker>('/health/markers', { method: 'POST', body: JSON.stringify(marker) }),
  getMarkers: () => request<BiologicalMarker[]>('/health/markers'),
};
