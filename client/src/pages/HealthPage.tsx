import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { useHealth } from '../hooks/useHealth';
import { LongevityMap } from '../components/health/LongevityMap';

export function HealthPage() {
  const { todayStatus, longevity, trends, markers, checkins, loading, submitCheckin } = useHealth();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-state"><span className="empty-icon" style={{ animation: 'pulse 1.5s infinite' }}>...</span></div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader title="Health" subtitle={today} />

      <div className="health-grid">
        <div className="health-card">
          <div className="card-title">Morning Check-in</div>
          {todayStatus.hasCheckedIn ? (
            <div className="checkin-summary">
              <div className="checkin-done">Done - Checked in today</div>
              <div className="checkin-quick-stats">
                {todayStatus.checkin?.sleepHours && (
                  <span>Sleep {todayStatus.checkin.sleepHours}h</span>
                )}
                {todayStatus.checkin?.energyLevel && (
                  <span>Energy {todayStatus.checkin.energyLevel}/5</span>
                )}
                {todayStatus.checkin?.moodScore && (
                  <span>Mood {todayStatus.checkin.moodScore}/5</span>
                )}
              </div>
            </div>
          ) : (
            <CheckinForm onSubmit={submitCheckin} />
          )}
        </div>

        <div className="health-card">
          <div className="card-title">Longevity Score</div>
          {longevity ? (
            <div className="longevity-display">
              <div className="longevity-main">
                <div className="longevity-bio-age">
                  <span className="label">Biological Age</span>
                  <span className="value">{longevity.biologicalAge} yrs</span>
                </div>
                <div className={`longevity-delta ${longevity.ageDelta < 0 ? 'positive' : 'negative'}`}>
                  {longevity.ageDelta < 0 ? 'Down' : 'Up'} {Math.abs(longevity.ageDelta)} years {longevity.ageDelta < 0 ? 'younger' : 'older'}
                </div>
              </div>
              <div className="longevity-score">
                <span className="score-value">{longevity.score}</span>
                <span className="score-max">/100</span>
              </div>
              <div className="longevity-factors">
                <div className="factor"><span>HRV</span><span>{longevity.factors.hrv}</span></div>
                <div className="factor"><span>Resting HR</span><span>{longevity.factors.restingHR}</span></div>
                <div className="factor"><span>Sleep</span><span>{longevity.factors.sleep}</span></div>
                <div className="factor"><span>Steps</span><span>{longevity.factors.steps}</span></div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <span>Log check-ins to calculate your longevity score</span>
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-title">30-Day Trends</div>
        <div className="trends-row">
          <TrendCard label="HRV" data={trends.hrv} unit="" />
          <TrendCard label="Sleep" data={trends.sleep} unit="h" />
          <TrendCard label="Resting HR" data={trends.restingHR} unit="" />
          <TrendCard label="Energy" data={trends.energy} unit="/5" />
          <TrendCard label="Mood" data={trends.mood} unit="/5" />
        </div>
      </div>

      <LongevityMap
        longevity={longevity}
        recentCheckins={checkins}
        latestMarker={markers.length > 0 ? markers[0] : null}
      />
    </div>
  );
}

function CheckinForm({ onSubmit }: { onSubmit: (data: any) => Promise<any> }) {
  const [formData, setFormData] = useState({
    sleepHours: 7,
    sleepQuality: 3 as 1 | 2 | 3 | 4 | 5,
    hrv: null as number | null,
    restingHR: null as number | null,
    steps: null as number | null,
    energyLevel: 3 as 1 | 2 | 3 | 4 | 5,
    moodScore: 3 as 1 | 2 | 3 | 4 | 5,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="checkin-form">
      <div className="checkin-grid">
        <div className="checkin-field">
          <label>Sleep Hours</label>
          <input
            type="number"
            step="0.25"
            min="0"
            max="24"
            value={formData.sleepHours}
            onChange={event => setFormData({ ...formData, sleepHours: parseFloat(event.target.value) })}
          />
        </div>
        <div className="checkin-field">
          <label>Sleep Quality</label>
          <div className="star-rating">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                type="button"
                key={star}
                className={`star ${star <= formData.sleepQuality ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, sleepQuality: star as 1 | 2 | 3 | 4 | 5 })}
              >
                *
              </button>
            ))}
          </div>
        </div>
        <div className="checkin-field">
          <label>HRV</label>
          <input
            type="number"
            placeholder="ms"
            value={formData.hrv ?? ''}
            onChange={event => setFormData({ ...formData, hrv: event.target.value ? parseInt(event.target.value, 10) : null })}
          />
        </div>
        <div className="checkin-field">
          <label>Resting HR</label>
          <input
            type="number"
            placeholder="bpm"
            value={formData.restingHR ?? ''}
            onChange={event => setFormData({ ...formData, restingHR: event.target.value ? parseInt(event.target.value, 10) : null })}
          />
        </div>
        <div className="checkin-field">
          <label>Steps</label>
          <input
            type="number"
            placeholder="count"
            value={formData.steps ?? ''}
            onChange={event => setFormData({ ...formData, steps: event.target.value ? parseInt(event.target.value, 10) : null })}
          />
        </div>
        <div className="checkin-field">
          <label>Energy</label>
          <div className="slider-field">
            <input
              type="range"
              min="1"
              max="5"
              value={formData.energyLevel}
              onChange={event => setFormData({ ...formData, energyLevel: parseInt(event.target.value, 10) as 1 | 2 | 3 | 4 | 5 })}
            />
            <span>{formData.energyLevel}/5</span>
          </div>
        </div>
        <div className="checkin-field">
          <label>Mood</label>
          <div className="slider-field">
            <input
              type="range"
              min="1"
              max="5"
              value={formData.moodScore}
              onChange={event => setFormData({ ...formData, moodScore: parseInt(event.target.value, 10) as 1 | 2 | 3 | 4 | 5 })}
            />
            <span>{formData.moodScore}/5</span>
          </div>
        </div>
      </div>
      <div className="checkin-field full-width">
        <label>Notes</label>
        <textarea
          placeholder="How are you feeling today?"
          value={formData.notes}
          onChange={event => setFormData({ ...formData, notes: event.target.value })}
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Saving...' : 'Log Check-in'}
      </button>
    </form>
  );
}

function TrendCard({ label, data, unit }: { label: string; data: { date: string; value: number }[]; unit: string }) {
  const max = Math.max(...data.map(item => item.value), 1);
  const min = Math.min(...data.map(item => item.value), 0);
  const range = max - min || 1;

  return (
    <div className="trend-card">
      <div className="trend-label">{label}</div>
      <div className="trend-sparkline">
        {data.map((point, index) => (
          <div key={index} className="spark-bar" style={{ height: `${((point.value - min) / range) * 100}%` }} />
        ))}
      </div>
      <div className="trend-current">{data.length > 0 ? `${data[data.length - 1].value}${unit}` : '-'}</div>
    </div>
  );
}

