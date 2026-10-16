/**
 * CompositeGraph — Verity 4-Area Weighted Momentum & Composite Chart
 *
 * Plotted Series:
 *   - Play (career): #58a6ff (thin line)
 *   - Health:        #3fb950 (thin line)
 *   - Mind:          #bc8cff (thin line)
 *   - Social:        #f0883e (thin line)
 *   - Composite:     #f0f6fc (bold line with glow)
 *   - 7-Day Rolling: dashed amber/gold overlay on Monthly zoom
 *   - Forward Proj:  dashed line projecting 7–14 days past today
 *
 * View Zoom Levels:
 *   - Weekly:  last 7 raw daily points
 *   - Monthly: last 30 raw daily points + rolling average overlay
 *   - Annual:  aggregated to 1 point per week (~52 points)
 */

import { useState, useMemo } from 'react';
import type { ZoomedView, LifeArea } from '../../lib/scoring';
import { AREA_COLORS } from '../../hooks/useScoring';

interface CompositeGraphProps {
  zoomedView: ZoomedView | null;
  loading?: boolean;
}

type ZoomLevel = 'weekly' | 'monthly' | 'annual';

const AREA_LABELS: Record<LifeArea, string> = {
  play:   'Play (Career)',
  health: 'Health',
  mind:   'Mind',
  social: 'Social',
};

export function CompositeGraph({ zoomedView, loading }: CompositeGraphProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('monthly');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Active dataset based on zoom level
  const activeData = useMemo(() => {
    if (!zoomedView) return [];
    if (zoom === 'weekly') {
      return zoomedView.weekly.map(d => ({
        date: d.date,
        label: d.date.slice(5),
        play: d.play,
        health: d.health,
        mind: d.mind,
        social: d.social,
        composite: d.composite,
        rolling: null as number | null,
        isProjection: false,
      }));
    }
    if (zoom === 'monthly') {
      const main = zoomedView.monthly.map(d => ({
        date: d.date,
        label: d.date.slice(5),
        play: d.play,
        health: d.health,
        mind: d.mind,
        social: d.social,
        composite: d.composite,
        rolling: d.compositeRolling,
        isProjection: false,
      }));
      // Append projection points for future trajectory
      const proj = zoomedView.projection.map(p => ({
        date: p.date,
        label: p.date.slice(5),
        play: null as number | null,
        health: null as number | null,
        mind: null as number | null,
        social: null as number | null,
        composite: p.composite,
        rolling: null as number | null,
        isProjection: true,
      }));
      return [...main, ...proj];
    }
    // Annual
    return zoomedView.annual.map(d => ({
      date: d.weekStart,
      label: d.weekStart.slice(5),
      play: d.play,
      health: d.health,
      mind: d.mind,
      social: d.social,
      composite: d.composite,
      rolling: null as number | null,
      isProjection: false,
    }));
  }, [zoomedView, zoom]);

  if (loading || !zoomedView) {
    return (
      <div className="card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
        <span style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>Loading compounding momentum data...</span>
      </div>
    );
  }

  if (activeData.length === 0) {
    return (
      <div className="card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
        <p style={{ color: 'var(--fg-muted)', margin: 0 }}>
          Check in on your daily habits to start plotting your compounding life scores.
        </p>
      </div>
    );
  }

  // SVG dimensions & scales
  const width = 800;
  const height = 280;
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const totalPoints = activeData.length;
  const getX = (index: number) => padding.left + (index / (Math.max(1, totalPoints - 1))) * graphWidth;
  const getY = (score: number) => padding.top + (1 - Math.min(100, Math.max(0, score)) / 100) * graphHeight;

  // Build SVG path strings
  const buildPath = (key: 'play' | 'health' | 'mind' | 'social' | 'composite') => {
    const valid = activeData
      .map((d, i) => ({ val: d[key], i, isProj: d.isProjection }))
      .filter((p): p is { val: number; i: number; isProj: boolean } => p.val !== null && !p.isProj);

    if (valid.length === 0) return '';
    return valid.reduce((acc, p, idx) => {
      const cmd = idx === 0 ? 'M' : 'L';
      return `${acc} ${cmd} ${getX(p.i).toFixed(1)} ${getY(p.val).toFixed(1)}`;
    }, '');
  };

  // Build projection path (starts from last real composite point)
  const buildProjectionPath = () => {
    let lastRealIdx = -1;
    for (let idx = activeData.length - 1; idx >= 0; idx--) {
      if (!activeData[idx].isProjection && activeData[idx].composite !== null) {
        lastRealIdx = idx;
        break;
      }
    }
    if (lastRealIdx === -1) return '';
    const projPoints = activeData
      .map((d, i) => ({ val: d.composite, i, isProj: d.isProjection }))
      .filter((p, i): p is { val: number; i: number; isProj: boolean } => (p.isProj || i === lastRealIdx) && p.val !== null);

    if (projPoints.length <= 1) return '';
    return projPoints.reduce((acc, p, idx) => {
      const cmd = idx === 0 ? 'M' : 'L';
      return `${acc} ${cmd} ${getX(p.i).toFixed(1)} ${getY(p.val).toFixed(1)}`;
    }, '');
  };

  // Build rolling average path (for monthly zoom)
  const buildRollingPath = () => {
    if (zoom !== 'monthly') return '';
    const rollingPoints = activeData
      .map((d, i) => ({ val: d.rolling, i }))
      .filter((p): p is { val: number; i: number } => p.val !== null);

    if (rollingPoints.length === 0) return '';
    return rollingPoints.reduce((acc, p, idx) => {
      const cmd = idx === 0 ? 'M' : 'L';
      return `${acc} ${cmd} ${getX(p.i).toFixed(1)} ${getY(p.val).toFixed(1)}`;
    }, '');
  };

  const hoveredPoint = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < activeData.length
    ? activeData[hoverIndex]
    : null;

  return (
    <div className="card" style={{ padding: 'var(--space-md)', background: 'var(--bg-card)' }}>
      {/* Header with Title and Zoom Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--fg-primary)' }}>
            Compounding Life Scores
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
            One honest, continuous number per area + weighted composite (4×Health + 5×Mind + 3×Social + 4×Play) / 16.
          </p>
        </div>

        {/* Zoom Level Toggle */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
          {(['weekly', 'monthly', 'annual'] as const).map(lvl => (
            <button
              key={lvl}
              type="button"
              onClick={() => { setZoom(lvl); setHoverIndex(null); }}
              style={{
                background: zoom === lvl ? 'var(--bg-card-hover)' : 'transparent',
                color: zoom === lvl ? 'var(--fg-primary)' : 'var(--fg-muted)',
                border: 'none',
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: zoom === lvl ? 600 : 400,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease',
              }}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Container */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block', minWidth: '550px' }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <filter id="compositeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines (0, 25, 50, 75, 100) */}
          {[0, 25, 50, 75, 100].map(val => (
            <g key={val}>
              <line
                x1={padding.left}
                y1={getY(val)}
                x2={width - padding.right}
                y2={getY(val)}
                stroke="var(--border-color)"
                strokeDasharray={val === 50 ? 'none' : '3 3'}
                strokeOpacity={val === 50 ? 0.35 : 0.18}
              />
              <text
                x={padding.left - 8}
                y={getY(val) + 3}
                fill="var(--fg-muted)"
                fontSize="10"
                textAnchor="end"
                opacity={0.6}
              >
                {val}
              </text>
            </g>
          ))}

          {/* Date Axis Ticks (sample 6-8 evenly) */}
          {activeData.map((d, i) => {
            const step = Math.max(1, Math.floor(totalPoints / 6));
            if (i % step !== 0 && i !== totalPoints - 1) return null;
            return (
              <text
                key={d.date + i}
                x={getX(i)}
                y={height - padding.bottom + 18}
                fill={d.isProjection ? '#e3b341' : 'var(--fg-muted)'}
                fontSize="10"
                textAnchor="middle"
                opacity={0.7}
              >
                {d.isProjection ? `+${d.label}` : d.label}
              </text>
            );
          })}

          {/* 4 Thin Area Lines */}
          <path d={buildPath('play')}   fill="none" stroke={AREA_COLORS.play}   strokeWidth="1.5" strokeOpacity="0.8" />
          <path d={buildPath('health')} fill="none" stroke={AREA_COLORS.health} strokeWidth="1.5" strokeOpacity="0.8" />
          <path d={buildPath('mind')}   fill="none" stroke={AREA_COLORS.mind}   strokeWidth="1.5" strokeOpacity="0.8" />
          <path d={buildPath('social')} fill="none" stroke={AREA_COLORS.social} strokeWidth="1.5" strokeOpacity="0.8" />

          {/* 7-Day Rolling Average Overlay (Monthly view only) */}
          {zoom === 'monthly' && (
            <path
              d={buildRollingPath()}
              fill="none"
              stroke="#e3b341"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeOpacity="0.75"
            />
          )}

          {/* Bold Composite Line */}
          <path
            d={buildPath('composite')}
            fill="none"
            stroke="#f0f6fc"
            strokeWidth="3"
            filter="url(#compositeGlow)"
          />

          {/* Trajectory Projection (Dashed Forward Line) */}
          <path
            d={buildProjectionPath()}
            fill="none"
            stroke="#f0f6fc"
            strokeWidth="2.5"
            strokeDasharray="5 4"
            strokeOpacity="0.65"
          />

          {/* Interactive Hover Vertical Line & Overlay Rects */}
          {activeData.map((_, i) => (
            <rect
              key={i}
              x={getX(i) - (graphWidth / totalPoints) / 2}
              y={padding.top}
              width={graphWidth / totalPoints}
              height={graphHeight}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}

          {/* Hover indicator line & dot */}
          {hoveredPoint && hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={height - padding.bottom}
                stroke="var(--fg-muted)"
                strokeDasharray="2 2"
                strokeOpacity="0.7"
              />
              {hoveredPoint.composite !== null && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(hoveredPoint.composite)}
                  r="5"
                  fill="#f0f6fc"
                  stroke="var(--bg-primary)"
                  strokeWidth="2"
                />
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Tooltip / Data Bar when Hovering */}
      {hoveredPoint ? (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          marginTop: '8px',
        }}>
          <div>
            <strong style={{ color: hoveredPoint.isProjection ? '#e3b341' : 'var(--fg-primary)' }}>
              {hoveredPoint.date}
            </strong>
            {hoveredPoint.isProjection && (
              <span style={{ fontSize: '0.7rem', color: '#e3b341', marginLeft: '6px' }}>
                (Trajectory Projection)
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#f0f6fc', fontWeight: 700 }}>
              Composite: {hoveredPoint.composite?.toFixed(1) ?? '-'}
            </span>
            {hoveredPoint.rolling !== null && (
              <span style={{ color: '#e3b341' }}>
                7d Avg: {hoveredPoint.rolling.toFixed(1)}
              </span>
            )}
            {hoveredPoint.play !== null && (
              <span style={{ color: AREA_COLORS.play }}>
                Play: {hoveredPoint.play.toFixed(0)}
              </span>
            )}
            {hoveredPoint.health !== null && (
              <span style={{ color: AREA_COLORS.health }}>
                Health: {hoveredPoint.health.toFixed(0)}
              </span>
            )}
            {hoveredPoint.mind !== null && (
              <span style={{ color: AREA_COLORS.mind }}>
                Mind: {hoveredPoint.mind.toFixed(0)}
              </span>
            )}
            {hoveredPoint.social !== null && (
              <span style={{ color: AREA_COLORS.social }}>
                Social: {hoveredPoint.social.toFixed(0)}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Static Chart Legend */
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginTop: '10px',
          fontSize: '0.78rem',
          color: 'var(--fg-muted)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '16px', height: '3px', background: '#f0f6fc', display: 'inline-block', borderRadius: '1px' }} />
            <strong style={{ color: '#f0f6fc' }}>Composite Score</strong>
          </div>
          {(['play', 'health', 'mind', 'social'] as const).map(area => (
            <div key={area} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '2px', background: AREA_COLORS[area], display: 'inline-block' }} />
              <span>{AREA_LABELS[area]}</span>
            </div>
          ))}
          {zoom === 'monthly' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '2px', borderTop: '2px dashed #e3b341', display: 'inline-block' }} />
              <span>7d Rolling Avg</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '2px', borderTop: '2px dashed #f0f6fc', opacity: 0.7, display: 'inline-block' }} />
            <span>Forward Trajectory</span>
          </div>
        </div>
      )}
    </div>
  );
}
