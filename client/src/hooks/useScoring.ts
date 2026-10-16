/**
 * useScoring — Verity area scoring hook
 *
 * Loads habit + check-in data and runs the EMA scoring engine
 * (TypeScript implementation from lib/scoring.ts — always available,
 *  regardless of whether the Rust binary is present).
 *
 * If the Rust analytics response already includes scoring data,
 * it will be used as-is (identical math). The TS engine is the fallback.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  buildScoringTimeSeries,
  buildZoomedViews,
  AREA_ALIAS_MAP,
  SCORING_ALPHA,
  type CompositeScoreSeries,
  type ZoomedView,
  type LifeArea,
} from '../lib/scoring';

export interface AreaCurrentScore {
  area: LifeArea;
  score: number;  // 0–100
  label: string;
}

export interface ScoringState {
  areScores: AreaCurrentScore[];
  composite: number;
  series: CompositeScoreSeries | null;
  zoomedView: ZoomedView | null;
  loading: boolean;
  error: string | null;
}

const AREA_LABELS: Record<LifeArea, string> = {
  play:   'Play',
  health: 'Health',
  mind:   'Mind',
  social: 'Social',
};

/** Canonical display color per area */
export const AREA_COLORS: Record<LifeArea, string> = {
  play:   '#58a6ff',
  health: '#3fb950',
  mind:   '#bc8cff',
  social: '#f0883e',
};

export function useScoring(): ScoringState & { refresh: () => void } {
  const [areScores, setAreaScores] = useState<AreaCurrentScore[]>([]);
  const [composite, setComposite] = useState(0);
  const [series, setSeries] = useState<CompositeScoreSeries | null>(null);
  const [zoomedView, setZoomedView] = useState<ZoomedView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch habits + all check-in entries
      const [habitsWithCheckins] = await Promise.all([
        api.getHabitsWithCheckins(),
      ]);

      // Build flat entry list from API response
      const entries: { habitId: string; date: string; area: string; completed: boolean }[] = [];
      const habitsFlat: { id: string; area: string; target_days?: string }[] = [];

      for (const h of habitsWithCheckins) {
        // Only include habits in the 4 canonical areas
        const canonical = AREA_ALIAS_MAP[(h.area ?? '').toLowerCase()];
        if (!canonical) continue;

        habitsFlat.push({ id: h.id, area: h.area, target_days: h.target_days });
        for (const date of (h.checkins ?? []) as string[]) {
          entries.push({ habitId: h.id, date, area: h.area, completed: true });
        }
      }

      const scoringSeries = buildScoringTimeSeries(entries, habitsFlat, undefined, SCORING_ALPHA);
      setSeries(scoringSeries);

      const zoomed = buildZoomedViews(scoringSeries);
      setZoomedView(zoomed);

      // Current scores: last point in each area series
      const n = scoringSeries.dates.length;
      if (n > 0) {
        const last = n - 1;
        const areas: AreaCurrentScore[] = [
          { area: 'play',   score: scoringSeries.play[last],   label: AREA_LABELS.play },
          { area: 'health', score: scoringSeries.health[last], label: AREA_LABELS.health },
          { area: 'mind',   score: scoringSeries.mind[last],   label: AREA_LABELS.mind },
          { area: 'social', score: scoringSeries.social[last], label: AREA_LABELS.social },
        ];
        setAreaScores(areas);
        setComposite(scoringSeries.composite[last]);
      } else {
        setAreaScores([]);
        setComposite(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scoring data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void compute(); }, [compute]);

  return { areScores, composite, series, zoomedView, loading, error, refresh: compute };
}
