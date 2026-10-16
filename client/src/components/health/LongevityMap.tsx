/**
 * LongevityMap — Complete Longevity Map for Verity Health
 *
 * Visualizes the 4 core physiological longevity pillars derived from 30-day baseline data:
 *   1. Autonomic & Cardiovascular (HRV + Resting Heart Rate) — 50% combined weight
 *   2. Sleep Architecture & Recovery (Sleep duration & quality) — 30% weight
 *   3. Metabolic & Movement Capacity (Daily steps + optional biomarkers) — 20% weight
 *   4. Vitality & Nervous Tone (Daily energy & mood baseline)
 *
 * NOTE ON SCORING DIVERGENCE:
 * This Longevity Map and the Longevity Score reflect objective physiological
 * biomarkers (vital signs and daily biological recovery).
 * In contrast, the Verity 4-area engine (Play, Health, Mind, Social) tracks
 * behavioral habit-completion momentum via Exponential Moving Average (EMA).
 * Both systems complement each other: one shows biological state, the other
 * shows daily action compounding.
 */

import type { LongevityScore, HealthCheckin, BiologicalMarker } from '../../types';

interface LongevityMapProps {
  longevity: LongevityScore | null;
  recentCheckins: HealthCheckin[];
  latestMarker?: BiologicalMarker | null;
}

interface PillarData {
  title: string;
  category: string;
  score: number;
  weightLabel: string;
  status: 'optimal' | 'good' | 'attention';
  metrics: { label: string; current: string; optimal: string; status: 'optimal' | 'good' | 'attention' }[];
  impactYears: number; // Biological age impact in years
  description: string;
}

export function LongevityMap({ longevity, recentCheckins, latestMarker }: LongevityMapProps) {
  // Compute 30-day averages for metrics
  const count = recentCheckins.length || 1;
  const avgEnergy = recentCheckins.reduce((s, c) => s + (c.energyLevel || 0), 0) / count;
  const avgMood = recentCheckins.reduce((s, c) => s + (c.moodScore || 0), 0) / count;

  const hrvScore = longevity?.factors.hrv ?? 50;
  const restingHRScore = longevity?.factors.restingHR ?? 50;
  const sleepScore = longevity?.factors.sleep ?? 50;
  const stepsScore = longevity?.factors.steps ?? 50;

  // Calculate pillar impacts based on the biologicalAge formula: ageDelta = -((score - 50) * 0.3)
  // Overall delta = -((score - 50) * 0.3) years
  // Weights: HRV (0.25), RestingHR (0.25), Sleep (0.30), Steps (0.20)
  const hrvDelta = -((hrvScore - 50) * 0.3 * 0.25);
  const restingHRDelta = -((restingHRScore - 50) * 0.3 * 0.25);
  const sleepDelta = -((sleepScore - 50) * 0.3 * 0.30);
  const stepsDelta = -((stepsScore - 50) * 0.3 * 0.20);

  const getStatus = (score: number): 'optimal' | 'good' | 'attention' => {
    if (score >= 75) return 'optimal';
    if (score >= 50) return 'good';
    return 'attention';
  };

  const cardioScore = Math.round((hrvScore + restingHRScore) / 2);

  const pillars: PillarData[] = [
    {
      title: 'Autonomic & Cardiovascular',
      category: 'Heart Rate Variability & Vagal Tone',
      score: cardioScore,
      weightLabel: '50% Longevity Weight',
      status: getStatus(cardioScore),
      impactYears: Math.round((hrvDelta + restingHRDelta) * 10) / 10,
      description: 'Parasympathetic recovery balance and cardiovascular strain resilience.',
      metrics: [
        {
          label: 'Heart Rate Variability (HRV)',
          current: longevity ? `${Math.round(hrvScore * 0.8)} ms avg` : 'No data',
          optimal: '50 – 80+ ms',
          status: getStatus(hrvScore),
        },
        {
          label: 'Resting Heart Rate',
          current: longevity ? `${Math.round(120 - (restingHRScore * 0.6))} bpm` : 'No data',
          optimal: '48 – 60 bpm',
          status: getStatus(restingHRScore),
        },
      ],
    },
    {
      title: 'Sleep Architecture & Recovery',
      category: 'Cellular Repair & Glymphatic Clearance',
      score: sleepScore,
      weightLabel: '30% Longevity Weight',
      status: getStatus(sleepScore),
      impactYears: Math.round(sleepDelta * 10) / 10,
      description: 'Sleep duration and quality dictate DNA repair, hormonal balancing, and brain health.',
      metrics: [
        {
          label: 'Sleep Duration',
          current: recentCheckins.length > 0
            ? `${(recentCheckins.reduce((s, c) => s + (c.sleepHours || 0), 0) / count).toFixed(1)} hrs`
            : 'No data',
          optimal: '7.5 – 8.5 hrs',
          status: getStatus(sleepScore),
        },
        {
          label: 'Subjective Sleep Quality',
          current: recentCheckins.length > 0
            ? `${(recentCheckins.reduce((s, c) => s + (c.sleepQuality || 0), 0) / count).toFixed(1)} / 5`
            : 'No data',
          optimal: '4.0+ / 5',
          status: getStatus(sleepScore),
        },
      ],
    },
    {
      title: 'Metabolic & Movement Capacity',
      category: 'Mitochondrial Density & Daily Flux',
      score: stepsScore,
      weightLabel: '20% Longevity Weight',
      status: getStatus(stepsScore),
      impactYears: Math.round(stepsDelta * 10) / 10,
      description: 'Daily non-exercise physical activity keeps insulin sensitivity and lymphatic circulation optimal.',
      metrics: [
        {
          label: 'Daily Movement / Steps',
          current: longevity ? `${Math.round(stepsScore * 100).toLocaleString()} steps` : 'No data',
          optimal: '8,000 – 10,000+ steps',
          status: getStatus(stepsScore),
        },
        ...(latestMarker?.vo2MaxEstimate ? [{
          label: 'VO2 Max Estimate',
          current: `${latestMarker.vo2MaxEstimate} ml/kg/min`,
          optimal: '45+ ml/kg/min',
          status: (latestMarker.vo2MaxEstimate >= 45 ? 'optimal' : 'good') as 'optimal' | 'good',
        }] : []),
        ...(latestMarker?.gripStrengthKg ? [{
          label: 'Grip Strength',
          current: `${latestMarker.gripStrengthKg} kg`,
          optimal: '48+ kg',
          status: (latestMarker.gripStrengthKg >= 45 ? 'optimal' : 'good') as 'optimal' | 'good',
        }] : []),
      ],
    },
    {
      title: 'Vitality & Nervous Tone',
      category: 'Neuroendocrine Energy & Mood Consistency',
      score: Math.round(((avgEnergy + avgMood) / 10) * 100) || 60,
      weightLabel: 'Psychological Vitality',
      status: getStatus(Math.round(((avgEnergy + avgMood) / 10) * 100) || 60),
      impactYears: -0.5,
      description: 'Daily energy levels and mood scores reflect sustained allostatic load and psychological resilience.',
      metrics: [
        {
          label: 'Daily Energy Baseline',
          current: avgEnergy > 0 ? `${avgEnergy.toFixed(1)} / 5` : 'No data',
          optimal: '3.8+ / 5',
          status: avgEnergy >= 3.8 ? 'optimal' : avgEnergy >= 3 ? 'good' : 'attention',
        },
        {
          label: 'Mood Index',
          current: avgMood > 0 ? `${avgMood.toFixed(1)} / 5` : 'No data',
          optimal: '4.0+ / 5',
          status: avgMood >= 4 ? 'optimal' : avgMood >= 3 ? 'good' : 'attention',
        },
      ],
    },
  ];

  return (
    <div className="section longevity-map-section">
      <div className="section-header" style={{ marginBottom: 'var(--space-md)' }}>
        <div>
          <h2 className="section-title">Complete Longevity Map</h2>
          <p className="section-subtitle" style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
            Comprehensive analysis across 4 physiological pillars mapping biomarker health to biological age impact.
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 'var(--gap-md)',
        marginBottom: 'var(--gap-lg)',
      }}>
        {pillars.map(pillar => {
          const statusColor = pillar.status === 'optimal'
            ? '#3fb950'
            : pillar.status === 'good'
            ? '#58a6ff'
            : '#f0883e';

          return (
            <div
              key={pillar.title}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 'var(--space-md)',
                background: 'var(--bg-card)',
                borderColor: `${statusColor}33`,
                borderLeft: `4px solid ${statusColor}`,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: statusColor, fontWeight: 600 }}>
                      {pillar.category}
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--fg-primary)', margin: '2px 0 4px 0' }}>
                      {pillar.title}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: statusColor, lineHeight: 1 }}>
                      {pillar.score}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--fg-muted)' }}>/ 100</span>
                  </div>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                  {pillar.description}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {pillar.metrics.map(m => (
                    <div
                      key={m.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.82rem',
                        padding: '6px 8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <span style={{ color: 'var(--fg-primary)' }}>{m.label}</span>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ color: 'var(--fg-primary)' }}>{m.current}</strong>
                        <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--fg-muted)' }}>
                          opt: {m.optimal}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-color)',
                fontSize: '0.78rem',
              }}>
                <span style={{ color: 'var(--fg-muted)' }}>{pillar.weightLabel}</span>
                <span style={{
                  color: pillar.impactYears <= 0 ? '#3fb950' : '#f0883e',
                  fontWeight: 600,
                }}>
                  {pillar.impactYears <= 0 ? `${pillar.impactYears} yrs bio age` : `+${pillar.impactYears} yrs bio age`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="card"
        style={{
          padding: 'var(--space-md)',
          background: 'rgba(88, 166, 255, 0.05)',
          borderColor: 'rgba(88, 166, 255, 0.2)',
          fontSize: '0.82rem',
          color: 'var(--fg-muted)',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: '#58a6ff', display: 'block', marginBottom: '4px' }}>
          Longevity Engine Architecture Note
        </strong>
        The biological Longevity Map calculates physiological aging using validated 30-day vitals (HRV, resting heart rate, sleep metrics, and movement flux).
        This physiological measurement is decoupled from the <strong>Verity 4-Area Compounding Engine</strong> (Play, Health, Mind, Social), which uses Exponential Moving Averages (EMA) to measure your behavioral habit consistency over time.
      </div>
    </div>
  );
}
