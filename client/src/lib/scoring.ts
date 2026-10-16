/**
 * Verity Scoring Engine — TypeScript Implementation
 *
 * Implements the 4-area compounding momentum score:
 *   - Play (career) | Health | Mind | Social
 *
 * Per-area daily score uses an Exponential Moving Average (EMA) over
 * daily checklist completion ratios, so the score has memory instead of
 * resetting every day.
 *
 * Formula:
 *   completion(area) = items_ticked / items_possible        (0.0 – 1.0)
 *   score(area, t)   = α × completion × 100 + (1 − α) × score(area, t-1)
 *
 * Composite:
 *   composite = (4×Health + 5×Mind + 3×Social + 4×Play) / 16
 *
 * Alpha (α = 0.2):  Tune this constant to control responsiveness.
 *   Higher α → more reactive / noisy.
 *   Lower  α → smoother / slower to move.
 *
 * NOTE: The Health area score (behavioral checklist adherence) intentionally
 * diverges from the physiological Longevity Score in server/routes/health.ts.
 * The Longevity Score measures biomarkers (HRV, HR, sleep, steps); this score
 * measures daily habit completion momentum.
 */

// ── Constants ──────────────────────────────────────────────────────────────

/** EMA smoothing factor. Tunable; do NOT hardcode elsewhere. */
export const SCORING_ALPHA = 0.2;

/**
 * The 4 canonical life areas Verity tracks.
 * 'play' maps to the existing 'career' habits area.
 */
export type LifeArea = 'play' | 'health' | 'mind' | 'social';

export const LIFE_AREAS: LifeArea[] = ['play', 'health', 'mind', 'social'];

/** Composite weights. Must sum to 16. */
export const COMPOSITE_WEIGHTS: Record<LifeArea, number> = {
  health: 4,
  mind:   5,
  social: 3,
  play:   4,
} as const;

/** Maps user-visible/DB area names to canonical LifeArea keys. */
export const AREA_ALIAS_MAP: Record<string, LifeArea> = {
  play:    'play',
  career:  'play',   // existing habits area → maps to Play
  health:  'health',
  mind:    'mind',
  social:  'social',
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface DailyCompletion {
  /** ISO date string: YYYY-MM-DD */
  date: string;
  area: LifeArea;
  /** 0.0 – 1.0 */
  completionRatio: number;
}

export interface AreaScoreSeries {
  area: LifeArea;
  /** Array of (date, score 0–100) ordered ascending by date */
  series: { date: string; score: number }[];
}

export interface CompositeScoreSeries {
  /** Parallel date array (same order as area series) */
  dates: string[];
  play:    number[];
  health:  number[];
  mind:    number[];
  social:  number[];
  composite: number[];
}

export interface ZoomedView {
  /** Weekly: last 7 raw daily points */
  weekly: { date: string; play: number; health: number; mind: number; social: number; composite: number }[];
  /** Monthly: last 30 raw daily + 7-day rolling average per area + composite */
  monthly: {
    date: string;
    play: number; health: number; mind: number; social: number; composite: number;
    /** rolling average for composite (7-day window) */
    compositeRolling: number | null;
  }[];
  /** Annual: ~52 weekly aggregate points */
  annual: { weekStart: string; play: number; health: number; mind: number; social: number; composite: number }[];
  /** Forward projection past today (7–14 days) */
  projection: { date: string; composite: number; isProjection: true }[];
}

// ── Core Engine ────────────────────────────────────────────────────────────

/**
 * Compute EMA score series for a single area from daily completion ratios.
 * The first day's score seeds the EMA at completion × 100.
 */
export function computeAreaEma(
  completions: { date: string; completionRatio: number }[],
  alpha: number = SCORING_ALPHA,
): { date: string; score: number }[] {
  if (completions.length === 0) return [];

  const sorted = [...completions].sort((a, b) => a.date.localeCompare(b.date));
  let prev = sorted[0].completionRatio * 100;

  return sorted.map(({ date, completionRatio }) => {
    const score = alpha * (completionRatio * 100) + (1 - alpha) * prev;
    prev = score;
    return { date, score: Math.round(score * 10) / 10 };
  });
}

/**
 * Compute the weighted composite score from per-area EMA scores.
 */
export function computeComposite(
  scores: Partial<Record<LifeArea, number>>,
): number {
  const totalWeight = Object.values(COMPOSITE_WEIGHTS).reduce((a, b) => a + b, 0); // 16
  let weightedSum = 0;
  let usedWeight = 0;

  for (const area of LIFE_AREAS) {
    const score = scores[area];
    if (score != null) {
      weightedSum += score * COMPOSITE_WEIGHTS[area];
      usedWeight  += COMPOSITE_WEIGHTS[area];
    }
  }

  if (usedWeight === 0) return 0;
  // If some areas missing, scale by actual weights used
  const scaleFactor = totalWeight / usedWeight;
  return Math.round((weightedSum / totalWeight) * scaleFactor * 10) / 10;
}

/**
 * Build a full CompositeScoreSeries from raw habit check-in data.
 *
 * @param habitEntries  Array of { habitId, date, area, completed }
 * @param habits        Array of { id, area, target_days } (target_days JSON string)
 * @param startDate     Earliest date to include (ISO string). Defaults to 90 days ago.
 */
export function buildScoringTimeSeries(
  habitEntries: { habitId: string; date: string; area: string; completed: boolean }[],
  habits: { id: string; area: string; target_days?: string }[],
  startDate?: string,
  alpha: number = SCORING_ALPHA,
): CompositeScoreSeries {
  const cutoff = startDate ?? offsetDate(new Date(), -365);

  // Group habits by canonical life area
  const habitsByArea: Record<LifeArea, string[]> = {
    play: [], health: [], mind: [], social: [],
  };
  for (const h of habits) {
    const canonical = AREA_ALIAS_MAP[h.area.toLowerCase()];
    if (canonical) habitsByArea[canonical].push(h.id);
  }

  // Collect all dates present in entries
  const dateSet = new Set<string>();
  for (const e of habitEntries) {
    if (e.date >= cutoff) dateSet.add(e.date);
  }
  const allDates = Array.from(dateSet).sort();

  // Build daily completion per area
  const dailyCompletions: Record<LifeArea, { date: string; completionRatio: number }[]> = {
    play: [], health: [], mind: [], social: [],
  };

  for (const date of allDates) {
    for (const area of LIFE_AREAS) {
      const areaHabitIds = habitsByArea[area];
      const total = areaHabitIds.length;
      if (total === 0) continue;

      const ticked = habitEntries.filter(
        e => e.date === date && areaHabitIds.includes(e.habitId) && e.completed
      ).length;

      dailyCompletions[area].push({ date, completionRatio: ticked / total });
    }
  }

  // Compute EMA series per area
  const emaSeries: Partial<Record<LifeArea, Map<string, number>>> = {};
  for (const area of LIFE_AREAS) {
    const series = computeAreaEma(dailyCompletions[area], alpha);
    emaSeries[area] = new Map(series.map(p => [p.date, p.score]));
  }

  // Build unified date-aligned output
  const playArr:     number[] = [];
  const healthArr:   number[] = [];
  const mindArr:     number[] = [];
  const socialArr:   number[] = [];
  const compositeArr: number[] = [];

  for (const date of allDates) {
    const scores: Partial<Record<LifeArea, number>> = {};
    for (const area of LIFE_AREAS) {
      const v = emaSeries[area]?.get(date);
      if (v != null) scores[area] = v;
    }

    playArr.push(scores.play     ?? 0);
    healthArr.push(scores.health ?? 0);
    mindArr.push(scores.mind     ?? 0);
    socialArr.push(scores.social ?? 0);
    compositeArr.push(computeComposite(scores));
  }

  return {
    dates:     allDates,
    play:      playArr,
    health:    healthArr,
    mind:      mindArr,
    social:    socialArr,
    composite: compositeArr,
  };
}

// ── Zoom / View Helpers ────────────────────────────────────────────────────

/**
 * Slice a CompositeScoreSeries into weekly/monthly/annual views
 * and generate a trajectory projection.
 */
export function buildZoomedViews(series: CompositeScoreSeries): ZoomedView {
  const n = series.dates.length;

  const makeRow = (i: number) => ({
    date:      series.dates[i],
    play:      series.play[i],
    health:    series.health[i],
    mind:      series.mind[i],
    social:    series.social[i],
    composite: series.composite[i],
  });

  // Weekly: last 7 days
  const weekly = Array.from({ length: Math.min(7, n) }, (_, k) => makeRow(n - Math.min(7, n) + k));

  // Monthly: last 30 days + 7-day rolling composite average
  const monthSlice = Array.from({ length: Math.min(30, n) }, (_, k) => makeRow(n - Math.min(30, n) + k));
  const monthly = monthSlice.map((row, i) => {
    const windowStart = Math.max(0, i - 6);
    const window = monthSlice.slice(windowStart, i + 1);
    const compositeRolling = window.length >= 3
      ? Math.round((window.reduce((s, r) => s + r.composite, 0) / window.length) * 10) / 10
      : null;
    return { ...row, compositeRolling };
  });

  // Annual: aggregate to weekly (1 point per 7-day window)
  const annual: ZoomedView['annual'] = [];
  for (let i = 0; i < n; i += 7) {
    const chunk = Array.from({ length: Math.min(7, n - i) }, (_, k) => makeRow(i + k));
    annual.push({
      weekStart: chunk[0].date,
      play:      avg(chunk.map(r => r.play)),
      health:    avg(chunk.map(r => r.health)),
      mind:      avg(chunk.map(r => r.mind)),
      social:    avg(chunk.map(r => r.social)),
      composite: avg(chunk.map(r => r.composite)),
    });
  }

  // Projection: slope from last 7–30 days, project 7–14 days forward
  const projection = buildProjection(series.composite, series.dates);

  return { weekly, monthly, annual, projection };
}

/**
 * Compute a linear-slope forward projection from the last `windowDays` points.
 */
function buildProjection(
  compositeValues: number[],
  dates: string[],
  windowDays = 14,
  projectDays = 14,
): ZoomedView['projection'] {
  if (compositeValues.length < 2) return [];

  const n = compositeValues.length;
  const start = Math.max(0, n - windowDays);
  const windowValues = compositeValues.slice(start);

  // Simple linear least-squares slope
  const m = windowValues.length;
  const xMean = (m - 1) / 2;
  const yMean = avg(windowValues);
  let num = 0, den = 0;
  for (let i = 0; i < m; i++) {
    num += (i - xMean) * (windowValues[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;

  const lastDate = dates[n - 1];
  const lastValue = compositeValues[n - 1];
  const projection: ZoomedView['projection'] = [];

  for (let i = 1; i <= projectDays; i++) {
    const futureDate = offsetDate(parseLocalDate(lastDate), i);
    const projected = Math.min(100, Math.max(0, lastValue + slope * i));
    projection.push({
      date: futureDate,
      composite: Math.round(projected * 10) / 10,
      isProjection: true,
    });
  }

  return projection;
}

// ── Date Utilities ─────────────────────────────────────────────────────────

function offsetDate(base: Date | string, days: number): string {
  const d = typeof base === 'string' ? parseLocalDate(base) : new Date(base);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

function parseLocalDate(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}
