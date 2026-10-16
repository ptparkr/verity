import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { PomodoroSession, HabitWithSchedule, AreaSummary, ConsistencyData, StreakData, HealthCheckin } from '../types';
import type {
  MomentumDataPoint,
  PeakHourCell,
  AreaBalanceData,
  CorrelationPoint,
  WeeklyReportData,
} from '../lib/analytics';
import {
  areaBalanceByAreas,
  buildWeeklyReport,
  linearRegression,
  momentumTimeSeries,
  peakHoursGrid,
  sleepFocusCorrelation,
} from '../lib/analytics';
import { useAreaColors } from './useAreaColors';

type BatchHabitRecord = { id: string; name: string; area: string; target_days: string; checkins: string[] };

interface FetchResult<T> {
  data: T;
  errors: string[];
}

interface RustAnalyticsResult {
  momentum: MomentumDataPoint[];
  peakHours: PeakHourCell[][];
  areaBalance: AreaBalanceData[];
  sleepFocusData: CorrelationPoint[];
  sleepFocusRegression: { slope: number; intercept: number };
  weeklyReport: WeeklyReportData;
}

function isRustAnalyticsResult(value: unknown): value is RustAnalyticsResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RustAnalyticsResult>;
  return (
    Array.isArray(candidate.momentum) &&
    Array.isArray(candidate.peakHours) &&
    Array.isArray(candidate.areaBalance) &&
    Array.isArray(candidate.sleepFocusData) &&
    typeof candidate.sleepFocusRegression === 'object' &&
    candidate.sleepFocusRegression !== null &&
    typeof candidate.weeklyReport === 'object' &&
    candidate.weeklyReport !== null
  );
}

async function settleValue<T>(label: string, loader: () => Promise<T>, fallback: T): Promise<FetchResult<T>> {
  try {
    return { data: await loader(), errors: [] };
  } catch (err) {
    console.warn(`Failed to fetch ${label}:`, err);
    return { data: fallback, errors: [`${label}: ${err instanceof Error ? err.message : 'unavailable'}`] };
  }
}

function parseTargetDays(targetDays: string | undefined): number[] {
  try {
    const parsed = JSON.parse(targetDays || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useAnalytics() {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [habits, setHabits] = useState<HabitWithSchedule[]>([]);
  const [habitAreas, setHabitAreas] = useState<string[]>([]);
  const [areaSummaries, setAreaSummaries] = useState<AreaSummary[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyData | null>(null);
  const [streaks, setStreaks] = useState<StreakData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [momentum, setMomentum] = useState<MomentumDataPoint[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHourCell[][]>([]);
  const [areaBalance, setAreaBalance] = useState<AreaBalanceData[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportData | null>(null);
  const [healthCheckins, setHealthCheckins] = useState<HealthCheckin[]>([]);
  const [sleepFocusData, setSleepFocusData] = useState<CorrelationPoint[]>([]);
  const [sleepFocusRegression, setSleepFocusRegression] = useState({ slope: 0, intercept: 0 });

  const { areas: areaColorsList, getColor } = useAreaColors();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [sessionsResult, habitsResult, areasResult, consistencyResult, streaksResult, healthResult] = await Promise.all([
      settleValue('sessions', () => api.getRecentSessions(30), [] as PomodoroSession[]),
      settleValue('habits', () => api.getAllHabitsWithCheckins(), [] as BatchHabitRecord[]),
      settleValue('areas', () => api.getAreas(), [] as AreaSummary[]),
      settleValue('consistency', () => api.getConsistency(), null as ConsistencyData | null),
      settleValue('streaks', () => api.getStreaks(), [] as StreakData[]),
      settleValue('health checkins', () => api.getHealthCheckins(30), [] as HealthCheckin[]),
    ]);

    const errors = [
      ...sessionsResult.errors,
      ...habitsResult.errors,
      ...areasResult.errors,
      ...consistencyResult.errors,
      ...streaksResult.errors,
      ...healthResult.errors,
    ];

    const sessionsData = sessionsResult.data;
    const habitsBatch = habitsResult.data;
    const habitsData: HabitWithSchedule[] = habitsBatch.map(habit => ({
      id: habit.id,
      name: habit.name,
      area: habit.area,
      target_days: habit.target_days,
      created_at: '',
      targetDays: parseTargetDays(habit.target_days),
    }));
    const uniqueAreas = [...new Set(habitsBatch.map(habit => habit.area))].filter(Boolean);
    const derivedAreas = uniqueAreas.length > 0 ? uniqueAreas : areaColorsList.slice(0, 3);
    const habitEntries = habitsBatch.flatMap(habit =>
      habit.checkins.map(date => ({ habitId: habit.id, date, completed: true }))
    );

    const correlationData = sleepFocusCorrelation(sessionsData, healthResult.data);
    const regressionData = correlationData.map(point => ({ x: point.sleepHours, y: point.avgFocusMinutes }));

    setSessions(sessionsData);
    setHabits(habitsData);
    setHabitAreas(derivedAreas);
    setAreaSummaries(areasResult.data);
    setConsistency(consistencyResult.data);
    setStreaks(streaksResult.data);
    setHealthCheckins(healthResult.data);

    let usedRustCore = false;
    try {
      const rustPayload = {
        sessions: sessionsData,
        checkins: healthResult.data,
        habits: habitsData,
        habitEntries,
        wheelAxes: [],
        areas: derivedAreas,
        weeks: 8,
      };
      const rustResult = await api.runRustAnalytics(rustPayload);
      if (isRustAnalyticsResult(rustResult)) {
        setMomentum(rustResult.momentum);
        setPeakHours(rustResult.peakHours);
        setAreaBalance(rustResult.areaBalance);
        setSleepFocusData(rustResult.sleepFocusData);
        setSleepFocusRegression(rustResult.sleepFocusRegression);
        setWeeklyReport(rustResult.weeklyReport);
        usedRustCore = true;
      } else {
        console.warn('Rust analytics returned an unexpected payload shape.');
      }
    } catch (err) {
      console.warn('Rust analytics unavailable, falling back to TypeScript analytics.', err);
    }

    if (!usedRustCore) {
      setMomentum(momentumTimeSeries(sessionsData));
      setPeakHours(peakHoursGrid(sessionsData));
      setAreaBalance(areaBalanceByAreas(sessionsData, derivedAreas, 8));
      setSleepFocusData(correlationData);
      setSleepFocusRegression(linearRegression(regressionData));
      setWeeklyReport(
        buildWeeklyReport(
          sessionsData,
          healthResult.data,
          habitsData,
          habitEntries,
          []
        )
      );
    }

    setError(errors.length > 0 ? `Some analytics data could not be loaded (${errors.join(' | ')})` : null);
    setLoading(false);
  }, [areaColorsList]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    sessions,
    habits,
    habitAreas,
    areaSummaries,
    consistency,
    streaks,
    momentum,
    peakHours,
    areaBalance,
    weeklyReport,
    healthCheckins,
    sleepFocusData,
    sleepFocusRegression,
    loading,
    error,
    refresh: loadData,
    getColor,
  };
}
