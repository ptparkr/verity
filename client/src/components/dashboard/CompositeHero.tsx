import React from 'react';
import type { AreaCurrentScore } from '../../hooks/useScoring';
import { AREA_COLORS } from '../../hooks/useScoring';
import type { LifeArea } from '../../lib/scoring';

interface Props {
  composite: number;
  areaScores: AreaCurrentScore[];
  loading?: boolean;
}

const PILLAR_CONFIG: Record<LifeArea, { label: string; weight: string; icon: string }> = {
  play:   { label: 'Play', weight: '25%', icon: '⚡' },
  health: { label: 'Health', weight: '25%', icon: '❤️' },
  mind:   { label: 'Mind', weight: '31%', icon: '🧠' },
  social: { label: 'Social', weight: '19%', icon: '🌐' },
};

export function CompositeHero({ composite, areaScores, loading = false }: Props) {
  const rounded = Math.round(composite);

  // Determine Momentum Tier
  let tierLabel = 'Baseline Flow';
  let tierBadgeStyle = {
    background: 'rgba(0, 255, 204, 0.12)',
    color: '#00ffcc',
    border: '1px solid rgba(0, 255, 204, 0.3)',
  };

  if (rounded >= 80) {
    tierLabel = 'Peak Compounding';
    tierBadgeStyle = {
      background: 'rgba(0, 255, 204, 0.2)',
      color: '#00ffcc',
      border: '1px solid rgba(0, 255, 204, 0.5)',
    };
  } else if (rounded >= 60) {
    tierLabel = 'Accelerating';
    tierBadgeStyle = {
      background: 'rgba(56, 189, 248, 0.18)',
      color: '#38bdf8',
      border: '1px solid rgba(56, 189, 248, 0.4)',
    };
  } else if (rounded >= 40) {
    tierLabel = 'Building Rhythm';
    tierBadgeStyle = {
      background: 'rgba(188, 140, 255, 0.18)',
      color: '#bc8cff',
      border: '1px solid rgba(188, 140, 255, 0.4)',
    };
  } else if (rounded >= 20) {
    tierLabel = 'Gaining Flow';
    tierBadgeStyle = {
      background: 'rgba(240, 136, 62, 0.18)',
      color: '#f0883e',
      border: '1px solid rgba(240, 136, 62, 0.4)',
    };
  }

  // SVG Radial Gauge Calculations (Radius = 46, Circumference ~ 289.03)
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, composite));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // Build mapping of scores
  const scoreMap: Partial<Record<LifeArea, number>> = {};
  for (const item of areaScores) {
    scoreMap[item.area] = item.score;
  }

  const pillars: LifeArea[] = ['play', 'health', 'mind', 'social'];

  return (
    <div className="composite-hero-card">
      <div className="composite-hero-glow" />

      {/* ── Left: Circular Radial Gauge ── */}
      <div className="composite-hero-gauge-col">
        <div className="composite-radial-wrapper">
          <svg className="composite-radial-svg" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="compositeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00ffcc" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <filter id="compositeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Track Background */}
            <circle
              className="composite-radial-track"
              cx="60"
              cy="60"
              r={radius}
              strokeWidth="9"
            />

            {/* Glowing Active Ring */}
            <circle
              className="composite-radial-meter"
              cx="60"
              cy="60"
              r={radius}
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              stroke="url(#compositeGradient)"
              filter={rounded > 0 ? 'url(#compositeGlow)' : undefined}
            />
          </svg>

          {/* Value Display in Center */}
          <div className="composite-radial-center">
            <span className="composite-score-digits">
              {loading ? '—' : rounded}
            </span>
            <span className="composite-score-denom">/100</span>
          </div>
        </div>
      </div>

      {/* ── Center: Narrative & Status ── */}
      <div className="composite-hero-main-col">
        <div className="composite-hero-eyebrow">
          <span className="composite-live-dot" />
          <span className="composite-eyebrow-text">COMPOSITE MOMENTUM</span>
          <span className="composite-tier-pill" style={tierBadgeStyle}>
            {tierLabel}
          </span>
        </div>

        <h2 className="composite-hero-title">
          {rounded === 0
            ? 'Begin Your Compounding Loop'
            : rounded >= 80
            ? 'Optimal Compounding Velocity'
            : 'Sustained Daily Cadence'}
        </h2>

        <p className="composite-hero-desc">
          {rounded === 0
            ? 'Tick habits in Play, Health, Mind, or Social to kick off your Exponential Moving Average (EMA) momentum score.'
            : 'Weighted exponential moving average across all 4 canonical life pillars. Scores compound smoothly over consecutive daily check-ins.'}
        </p>
      </div>

      {/* ── Right: 4 Pillar Mini Cards ── */}
      <div className="composite-hero-pillars-col">
        <div className="composite-pillars-grid">
          {pillars.map(pillar => {
            const color = AREA_COLORS[pillar];
            const cfg = PILLAR_CONFIG[pillar];
            const rawScore = scoreMap[pillar] ?? 0;
            const scoreVal = Math.round(rawScore);

            return (
              <div
                key={pillar}
                className="composite-pillar-card"
                style={{
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div className="composite-pillar-header">
                  <div className="composite-pillar-meta">
                    <span
                      className="composite-pillar-dot"
                      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                    />
                    <span className="composite-pillar-name">{cfg.label}</span>
                  </div>
                  <span className="composite-pillar-val" style={{ color }}>
                    {scoreVal}
                    <span className="composite-pillar-unit">pt</span>
                  </span>
                </div>

                <div className="composite-pillar-track">
                  <div
                    className="composite-pillar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(4, scoreVal))}%`,
                      background: color,
                      boxShadow: scoreVal > 0 ? `0 0 10px ${color}88` : 'none',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
