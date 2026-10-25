import type {
  AreaColor,
  AreaSummary,
  ConsistencyData,
  DeleteResponse,
  Habit,
  HabitStreak,
  LeaderboardEntry,
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
 * IndexedDB name.
 */
const INDEXED_DB_NAMES = ['verity-local-first'];

let activeGuestId: string | null = null;

export function setActiveGuestId(id: string | null): void {
  activeGuestId = id;
}

export function getActiveGuestId(): string | null {
  return activeGuestId;
}

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
  if (!activeGuestId) {
    activeGuestId = await readActiveGuestIdFromIndexedDb();
  }

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      // Send X-Verity-Guest-ID header
      ...(activeGuestId ? {
        'X-Verity-Guest-ID': activeGuestId,
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
  target_days?: string;
  checkins: string[];
};

export const api = {
  getHabits: () => request<Habit[]>('/habits'),

  createHabit: (name: string, area: string, targetDays?: number[]) =>
    request<Habit>('/habits', {
      method: 'POST',
      body: JSON.stringify({ name, area, targetDays }),
    }),

  deleteHabit: (id: string) =>
    request<DeleteResponse>(`/habits/${id}`, { method: 'DELETE' }),

  toggleCheckin: (id: string, date?: string) =>
    request<ToggleCheckinResponse>(`/habits/${id}/checkin`, { method: 'POST', body: JSON.stringify({ date }) }),

  getCheckins: (id: string) => request<string[]>(`/habits/${id}/checkins`),

  getStreak: (id: string) => request<HabitStreak>(`/habits/${id}/streak`),

  getLeaderboard: () => request<LeaderboardEntry[]>('/habits/leaderboard'),

  getStreaks: () => request<StreakData[]>('/dashboard/streaks'),

  getWeekly: () => request<WeeklyData>('/dashboard/weekly'),

  getAreas: () => request<AreaSummary[]>('/dashboard/areas'),

  getConsistency: () => request<ConsistencyData>('/dashboard/consistency'),

  getAreaColors: () => request<AreaColor[]>('/areas'),

  updateAreaColor: (name: string, color: string) =>
    request<AreaColor>(`/areas/${name}`, {
      method: 'PUT',
      body: JSON.stringify({ color }),
    }),

  deleteArea: (name: string) =>
    request<DeleteResponse>(`/areas/${name}`, { method: 'DELETE' }),

  updateTargetDays: (id: string, targetDays: number[]) =>
    request<{ success: boolean; targetDays: number[] }>(`/habits/${id}/target-days`, {
      method: 'PUT',
      body: JSON.stringify({ targetDays }),
    }),

  getAllHabitsWithCheckins: () =>
    request<HabitWithCheckins[]>('/habits/all/checkins'),

  getHabitsWithCheckins: () =>
    request<HabitWithCheckins[]>('/habits/all/checkins'),

  // Health endpoints
  getTodayCheckin: () => request<TodayCheckinStatus>('/health/today'),
  createCheckin: (data: Omit<HealthCheckin, 'id'>) =>
    request<HealthCheckin>('/health/checkin', { method: 'POST', body: JSON.stringify(data) }),
  getLongevity: (age?: number) => request<LongevityScore>(`/health/longevity${age ? `?age=${age}` : ''}`),
  getHealthTrends: (metric: string, days?: number) =>
    request<HealthTrend[]>(`/health/trends/${metric}${days ? `?days=${days}` : ''}`),
  getMarkers: () => request<BiologicalMarker[]>('/health/markers'),
  createMarker: (data: Omit<BiologicalMarker, 'id'>) =>
    request<BiologicalMarker>('/health/markers', { method: 'POST', body: JSON.stringify(data) }),
  getHealthCheckins: (days?: number) =>
    request<HealthCheckin[]>(`/health/checkins${days ? `?days=${days}` : ''}`),
};
