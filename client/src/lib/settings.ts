import type { AppSettings } from '../types';

const SETTINGS_KEY = 'verity_settings_v2';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    name: '',
    dateOfBirth: '2000-01-01',
    sex: 'male',
  },
  measurements: {
    heightCm: null,
    weightKg: null,
    waistCm: null,
    bodyFatPercent: null,
    restingHeartRate: null,
  },
  pomodoro: {
    defaultPomoDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    pomosBeforeLongBreak: 4,
  },
  preferences: {
    reducedMotion: false,
    showAdaptiveRecommendations: true,
  },
};

function sanitizeNullableNumber(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return clamp(Number(parsed.toFixed(2)), min, max);
}

function sanitizePomodoroDuration(value: unknown): 25 | 45 | 90 {
  return value === 45 || value === 90 ? value : 25;
}

export function normalizeSettings(value: unknown): AppSettings {
  const candidate = (value && typeof value === 'object' ? value : {}) as Partial<AppSettings>;
  const profile = (candidate.profile ?? {}) as Partial<AppSettings['profile']>;
  const measurements = (candidate.measurements ?? {}) as Partial<AppSettings['measurements']>;
  const pomodoro = (candidate.pomodoro ?? {}) as Partial<AppSettings['pomodoro']>;
  const preferences = (candidate.preferences ?? {}) as Partial<AppSettings['preferences']>;

  return {
    profile: {
      name: typeof profile.name === 'string' ? profile.name.trim().slice(0, 80) : DEFAULT_SETTINGS.profile.name,
      dateOfBirth:
        typeof profile.dateOfBirth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(profile.dateOfBirth)
          ? profile.dateOfBirth
          : DEFAULT_SETTINGS.profile.dateOfBirth,
      sex: profile.sex === 'female' || profile.sex === 'other' ? profile.sex : DEFAULT_SETTINGS.profile.sex,
    },
    measurements: {
      heightCm: sanitizeNullableNumber(measurements.heightCm, 50, 260),
      weightKg: sanitizeNullableNumber(measurements.weightKg, 20, 350),
      waistCm: sanitizeNullableNumber(measurements.waistCm, 30, 220),
      bodyFatPercent: sanitizeNullableNumber(measurements.bodyFatPercent, 2, 70),
      restingHeartRate: sanitizeNullableNumber(measurements.restingHeartRate, 30, 220),
    },
    pomodoro: {
      defaultPomoDuration: sanitizePomodoroDuration(pomodoro.defaultPomoDuration),
      shortBreak: Math.round(clamp(Number.isFinite(Number(pomodoro.shortBreak)) ? Number(pomodoro.shortBreak) : DEFAULT_SETTINGS.pomodoro.shortBreak, 1, 30)),
      longBreak: Math.round(clamp(Number.isFinite(Number(pomodoro.longBreak)) ? Number(pomodoro.longBreak) : DEFAULT_SETTINGS.pomodoro.longBreak, 5, 60)),
      pomosBeforeLongBreak: clamp(
        Math.round(Number.isFinite(Number(pomodoro.pomosBeforeLongBreak))
          ? Number(pomodoro.pomosBeforeLongBreak)
          : DEFAULT_SETTINGS.pomodoro.pomosBeforeLongBreak),
        1,
        10
      ),
    },
    preferences: {
      reducedMotion: Boolean(preferences.reducedMotion),
      showAdaptiveRecommendations:
        typeof preferences.showAdaptiveRecommendations === 'boolean'
          ? preferences.showAdaptiveRecommendations
          : DEFAULT_SETTINGS.preferences.showAdaptiveRecommendations,
    },
  };
}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): AppSettings {
  const normalized = normalizeSettings(settings);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  }
  return normalized;
}
