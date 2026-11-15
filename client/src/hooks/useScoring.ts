import { useCallback, useEffect, useState } from 'react';
import { api, HabitWithCheckins } from '../lib/api';
import { useAuth } from '../lib/auth';
import { getHabitsWithCheckinsFromLocal } from '../lib/habitStorage';
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
  score: number; // 0–100
  label: string;
}

export interface ScoringState {
  areaScores: AreaCurrentScore[];
  /** Legacy alias for backward compatibility */
  areScores: AreaCurrentScore[];
  composite: number;
  series: CompositeScoreSeries | null;
  zoomedView: ZoomedView | null;
  loading: boolean;
  error: string | null;
}

export const AREA_LABELS: Record<LifeArea, string> = {
  play: 'Play',
  health: 'Health',
  mind: 'Mind',
  social: 'Social',
};

/** Canonical display color per area */
export const AREA_COLORS: Record<LifeArea, string> = {
  play: '#58a6ff',
  health: '#3fb950',
  mind: '#bc8cff',
  social: '#f0883e',
};

const DEFAULT_AREA_SCORES: AreaCurrentScore[] = [
  { area: 'play', score: 0, label: AREA_LABELS.play },
  { area: 'health', score: 0, label: AREA_LABELS.health },
  { area: 'mind', score: 0, label: AREA_LABELS.mind },
  { area: 'social', score: 0, label: AREA_LABELS.social },
];

export function useScoring(): ScoringState & { refresh: () => void } {
  const { identity } = useAuth();
  const ownerId = identity?.id || 'default';

  const [areaScores, setAreaScores] = useState<AreaCurrentScore[]>(DEFAULT_AREA_SCORES);
  const [composite, setComposite] = useState(0);
  const [series, setSeries] = useState<CompositeScoreSeries | null>(null);
  const [zoomedView, setZoomedView] = useState<ZoomedView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let habitsWithCheckins: HabitWithCheckins[] = [];

      try {
        habitsWithCheckins = await api.getHabitsWithCheckins();
      } catch (err) {
        console.warn('API getHabitsWithCheckins unavailable, reading from local store:', err);
      }

      // If server returned empty, fallback to local storage
      if (!habitsWithCheckins || habitsWithCheckins.length === 0) {
        habitsWithCheckins = getHabitsWithCheckinsFromLocal(ownerId);
      }

      // Build flat entry list
      const entries: { habitId: string; date: string; area: string; completed: boolean }[] = [];
      const habitsFlat: { id: string; area: string; target_days?: string }[] = [];

      for (const h of habitsWithCheckins) {
        const canonical = AREA_ALIAS_MAP[(h.area ?? '').toLowerCase()];
        if (!canonical) continue;

        habitsFlat.push({ id: h.id, area: canonical, target_days: h.target_days });
        for (const date of (h.checkins ?? []) as string[]) {
          entries.push({ habitId: h.id, date, area: canonical, completed: true });
        }
      }

      if (habitsFlat.length === 0) {
        setAreaScores(DEFAULT_AREA_SCORES);
        setComposite(0);
        setSeries(null);
        setZoomedView(null);
        return;
      }

      const scoringSeries = buildScoringTimeSeries(entries, habitsFlat, undefined, SCORING_ALPHA);
      setSeries(scoringSeries);

      const zoomed = buildZoomedViews(scoringSeries);
      setZoomedView(zoomed);

      const n = scoringSeries.dates.length;
      if (n > 0) {
        const last = n - 1;
        const areas: AreaCurrentScore[] = [
          { area: 'play', score: scoringSeries.play[last] || 0, label: AREA_LABELS.play },
          { area: 'health', score: scoringSeries.health[last] || 0, label: AREA_LABELS.health },
          { area: 'mind', score: scoringSeries.mind[last] || 0, label: AREA_LABELS.mind },
          { area: 'social', score: scoringSeries.social[last] || 0, label: AREA_LABELS.social },
        ];
        setAreaScores(areas);
        setComposite(scoringSeries.composite[last] || 0);
      } else {
        setAreaScores(DEFAULT_AREA_SCORES);
        setComposite(0);
      }
    } catch (err) {
      console.warn('Scoring computation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate score');
      setAreaScores(DEFAULT_AREA_SCORES);
      setComposite(0);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void compute();
  }, [compute]);

  return {
    areaScores,
    areScores: areaScores,
    composite,
    series,
    zoomedView,
    loading,
    error,
    refresh: compute,
  };
}
