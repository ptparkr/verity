import type { EnergyMoodPoint } from '../../lib/analytics';
import { energyMoodCorrelation } from '../../lib/analytics';
import type { HealthCheckin } from '../../types';

interface Props {
  checkins: HealthCheckin[];
}

export function HealthCorrelations({ checkins }: Props) {
  const data = energyMoodCorrelation(checkins);
  if (data.length === 0) {
    return (
      <div className="analytics-empty">
        <p>Log daily health check-ins to see energy and mood correlations.</p>
        <a href="/health" className="btn btn-ghost">Log Check-in →</a>
      </div>
    );
  }

  // Calculate correlation
  const n = data.length;
  const avgEnergy = data.reduce((s, p) => s + p.energy, 0) / n;
  const avgMood = data.reduce((s, p) => s + p.mood, 0) / n;
  
  let num = 0, denEnergy = 0, denMood = 0;
  for (const p of data) {
    num += (p.energy - avgEnergy) * (p.mood - avgMood);
    denEnergy += Math.pow(p.energy - avgEnergy, 2);
    denMood += Math.pow(p.mood - avgMood, 2);
  }
  
  const correlation = denEnergy > 0 && denMood > 0 
    ? Math.round((num / Math.sqrt(denEnergy * denMood)) * 100) / 100 
    : 0;

  const strength = Math.abs(correlation);
  const label = strength >= 0.7 ? 'Strong' : strength >= 0.4 ? 'Moderate' : 'Weak';

  return (
    <div className="health-correlations">
      <div className="correlation-header">
        <div className="correlation-stat">
          <span className="correlation-number">
            {correlation > 0 ? '+' : ''}{correlation}
          </span>
          <span className="correlation-desc">Energy ↔ Mood</span>
        </div>
        <div className="correlation-badge">
          {label} correlation
        </div>
      </div>

      <div className="correlation-matrix">
        {[1, 2, 3, 4, 5].map(energy => (
          <div key={energy} className="correlation-row">
            <span className="correlation-axis-label">E{energy}</span>
            {[1, 2, 3, 4, 5].map(mood => {
              const count = data.filter(p => p.energy === energy && p.mood === mood).length;
              const intensity = Math.min(1, count / (data.length / 10));
              return (
                <div 
                  key={mood} 
                  className="correlation-cell"
                  style={{ 
                    background: count > 0 
                      ? `rgba(59, 139, 212, ${0.2 + intensity * 0.8})` 
                      : 'var(--heatmap-empty)',
                    border: energy === mood ? '1px solid var(--border)' : 'none'
                  }}
                  title={`Energy ${energy}, Mood ${mood}: ${count} days`}
                >
                  {count > 0 && <span className="correlation-cell-count">{count}</span>}
                </div>
              );
            })}
          </div>
        ))}
        <div className="correlation-axis-label-bottom">
          {[1, 2, 3, 4, 5].map(mood => (
            <span key={mood}>M{mood}</span>
          ))}
        </div>
      </div>

      <div className="correlation-insight">
        {correlation > 0.4 && (
          <p>Your energy and mood are tightly linked. Prioritize sleep and nutrition to boost both.</p>
        )}
        {correlation <= 0.4 && correlation > -0.4 && (
          <p>Your mood seems to be driven by factors other than energy. Keep exploring.</p>
        )}
        {correlation < -0.4 && (
          <p>Interesting — higher energy doesn't always mean better mood for you.</p>
        )}
      </div>
    </div>
  );
}