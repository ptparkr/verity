import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { loadSettings } from '../lib/settings';
import type { HealthCheckin, LongevityScore, HealthTrend, BiologicalMarker, TodayCheckinStatus } from '../types';

interface HealthTrends {
  hrv: HealthTrend[];
  sleep: HealthTrend[];
  restingHR: HealthTrend[];
  energy: HealthTrend[];
  mood: HealthTrend[];
}

function getAgeFromDOB(dob: string) {
  if (!dob) return 25;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

export function useHealth() {
  const [todayStatus, setTodayStatus] = useState<TodayCheckinStatus>({
    hasCheckedIn: false,
    checkin: null
  });
  const [longevity, setLongevity] = useState<LongevityScore | null>(null);
  const [trends, setTrends] = useState<HealthTrends>({ 
    hrv: [], sleep: [], restingHR: [], energy: [], mood: [] 
  });
  const [markers, setMarkers] = useState<BiologicalMarker[]>([]);
  const [checkins, setCheckins] = useState<HealthCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const settings = loadSettings();
      const dob = settings.profile.dateOfBirth;
      const age = dob ? getAgeFromDOB(dob) : 25;

      const [status, lon, tr, mk, ch] = await Promise.all([
        api.getTodayCheckin(),
        api.getLongevity(age),
        Promise.all([
          api.getHealthTrends('hrv', 30),
          api.getHealthTrends('sleep', 30),
          api.getHealthTrends('restingHR', 30),
          api.getHealthTrends('energy', 30),
          api.getHealthTrends('mood', 30),
        ]),
        api.getMarkers(),
        api.getHealthCheckins(30),
      ]);
      setTodayStatus(status);
      setLongevity(lon);
      setTrends({ hrv: tr[0], sleep: tr[1], restingHR: tr[2], energy: tr[3], mood: tr[4] });
      setMarkers(mk);
      setCheckins(ch);
    } catch (err) {
      console.error('Failed to load health data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submitCheckin = useCallback(async (data: Omit<HealthCheckin, 'id' | 'date'>) => {
    const checkin = await api.createCheckin({ ...data, date: new Date().toISOString().slice(0, 10) });
    setTodayStatus({ hasCheckedIn: true, checkin });
    await load();
    return checkin;
  }, [load]);

  const addMarker = useCallback(async (data: Omit<BiologicalMarker, 'id'>) => {
    const marker = await api.createMarker({ ...data, date: new Date().toISOString().slice(0, 10) });
    setMarkers(prev => [...prev, marker]);
    return marker;
  }, []);

  return {
    todayStatus,
    longevity,
    trends,
    markers,
    checkins,
    loading,
    submitCheckin,
    addMarker,
    refresh: load,
  };
}
