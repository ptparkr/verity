export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type FocusArea =
  | 'play'
  | 'health'
  | 'mind'
  | 'social'
  | string;

export interface Habit {
  id: string;
  name: string;
  area: string;
  created_at: string;
  target_days?: string; // JSON string like "[0,1,2,3,4,5,6]"
}

export interface HabitWithSchedule extends Habit {
  targetDays: number[]; // 0=Sun ... 6=Sat
}

export interface HabitStreak {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  totalCheckins: number;
  lastCheckinDate: string | null;
}

export interface LeaderboardEntry {
  habitId: string;
  name: string;
  area: string;
  currentStreak: number;
  longestStreak: number;
}

export interface ToggleCheckinResponse {
  checked: boolean;
  date: string;
}

export interface DeleteResponse {
  deleted?: boolean;
}

export interface AreaColor {
  name: string;
  color: string;
}

export interface StreakData {
  habitId: string;
  name: string;
  area: string;
  currentStreak: number;
  longestStreak: number;
  totalCheckins: number;
}

export interface WeeklyMatrixDay {
  date: string;
  checked: boolean;
}

export interface WeeklyMatrixRow {
  habitId: string;
  name: string;
  area: string;
  days: WeeklyMatrixDay[];
}

export interface WeeklyData {
  weekDates: string[];
  matrix: WeeklyMatrixRow[];
}

export interface AreaSummary {
  area: string;
  habitCount: number;
  checkins: number;
  possible: number;
  percentage: number;
}

export interface ConsistencyData {
  totalHabits: number;
  totalCheckins: number;
  possible: number;
  percentage: number;
  missed: number;
}

export interface Target {
  id: string;
  title: string;
  deadline: string;
  description?: string;
  color: string;
  isPrimary: boolean;
  completed: boolean;
  createdAt: string;
  completedAt?: string | null;
  version?: number;
}

export interface TargetDraft {
  title: string;
  deadline: string;
  description?: string;
  color: string;
  isPrimary: boolean;
}

// ─── Health Layer Types ───────────────────────────────────────

export interface HealthCheckin {
  id: string;
  date: string;
  hrv: number | null;
  sleepHours: number | null;
  sleepQuality: 1 | 2 | 3 | 4 | 5 | null;
  restingHR: number | null;
  steps: number | null;
  energyLevel: 1 | 2 | 3 | 4 | 5 | null;
  moodScore: 1 | 2 | 3 | 4 | 5 | null;
  notes: string;
}

export interface BiologicalMarker {
  id: string;
  date: string;
  vo2MaxEstimate: number | null;
  gripStrengthKg: number | null;
  waistCm: number | null;
  weightKg: number | null;
  bodyFatPercent: number | null;
  restingHRAvg: number | null;
}

export interface LongevityScore {
  score: number;
  biologicalAge: number;
  ageDelta: number;
  factors: {
    hrv: number;
    restingHR: number;
    sleep: number;
    steps: number;
  };
}

export interface HealthTrend {
  date: string;
  value: number;
}

export interface TodayCheckinStatus {
  hasCheckedIn: boolean;
  checkin: HealthCheckin | null;
}



export interface UserProfileSettings {
  name: string;
  dateOfBirth: string;
  sex: 'male' | 'female' | 'other';
}

export interface MeasurementSettings {
  heightCm: number | null;
  weightKg: number | null;
  waistCm: number | null;
  bodyFatPercent: number | null;
  restingHeartRate: number | null;
}

export interface PomodoroSettings {
  defaultPomoDuration: 25 | 45 | 90;
  shortBreak: number;
  longBreak: number;
  pomosBeforeLongBreak: number;
}

export interface AppBehaviorSettings {
  reducedMotion: boolean;
  showAdaptiveRecommendations: boolean;
}

export interface AppSettings {
  profile: UserProfileSettings;
  measurements: MeasurementSettings;
  pomodoro: PomodoroSettings;
  preferences: AppBehaviorSettings;
}
