import type { ConsistencyData, StreakData, Target } from '../types';

export function buildTodayFocusSegments(): any[] {
  return [];
}

export function buildWeeklyReportPreview(
  streaks: StreakData[],
  consistency: ConsistencyData | null,
  areas: Array<{ area: string; percentage: number }>,
): { totalFocusMinutes: number; topFocusArea: string | null; strongestHabit: string | null; currentBestStreak: number; consistencyPercentage: number; weakestArea: string | null; recommendations: string[] } {
  const totalFocusMinutes = 0;
  const topFocusArea = null;
  const strongestHabit = [...streaks].sort((a, b) => b.currentStreak - a.currentStreak)[0]?.name ?? null;
  const currentBestStreak = streaks.reduce((max, streak) => Math.max(max, streak.currentStreak), 0);
  const weakestArea = [...areas].sort((a, b) => a.percentage - b.percentage)[0]?.area ?? null;
  const consistencyPercentage = consistency?.percentage ?? 0;

  const recommendations: string[] = [];

  if (consistencyPercentage < 60) {
    recommendations.push('Cut one habit this week and rebuild consistency above 60%.');
  } else if (consistencyPercentage < 80) {
    recommendations.push('You are close. Protect your easiest habits first and keep the loop tight.');
  }

  if (weakestArea) {
    recommendations.push(`Your weakest area is ${capitalize(weakestArea)}. Put one easy win there next.`);
  }

  while (recommendations.length < 3) {
    recommendations.push('Keep the dashboard lean: finish today before adding anything new.');
  }

  return {
    totalFocusMinutes,
    topFocusArea,
    strongestHabit,
    currentBestStreak,
    consistencyPercentage,
    weakestArea,
    recommendations: recommendations.slice(0, 3),
  };
}

export function buildTargetSlots(targets: Target[]) {
  const activeTargets = targets.filter(target => !target.completed);
  const primary = activeTargets.find(target => target.isPrimary) ?? activeTargets[0] ?? null;
  const secondary = activeTargets
    .filter(target => target.id !== primary?.id)
    .slice(0, 2);
  const completed = targets
    .filter(target => target.completed)
    .sort((a, b) => new Date(b.completedAt ?? b.deadline).getTime() - new Date(a.completedAt ?? a.deadline).getTime())
    .slice(0, 3);

  return { primary, secondary, completed, activeCount: activeTargets.length };
}

export function getCountdownParts(deadline: string, nowMs: number) {
  const diff = new Date(deadline).getTime() - nowMs;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    expired: false,
  };
}

export function getProgressRatio(target: Target): number {
  const now = Date.now();
  const created = new Date(target.createdAt).getTime();
  const deadline = new Date(target.deadline).getTime();
  const total = deadline - created;
  if (total <= 0) return 1;
  const elapsed = now - created;
  return Math.min(1, Math.max(0, elapsed / total));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}