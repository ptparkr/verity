import type { WeeklyReportPreview as WeeklyReportPreviewType } from '../../types';

interface Props {
  report: WeeklyReportPreviewType;
}

export function WeeklyReportPreview({ report }: Props) {
  const hours = Math.floor(report.totalFocusMinutes / 60);
  const minutes = report.totalFocusMinutes % 60;

  return (
    <div className="card dashboard-card dashboard-report-card">
      <div className="dashboard-card-header">
        <div>
          <div className="card-title">Weekly Verity Report</div>
          <p className="dashboard-card-subtitle">A compact readout from the habit and focus layers you already have.</p>
        </div>
      </div>

      <div className="report-preview-metrics">
        <div className="report-preview-stat">
          <span className="report-preview-value">{hours}h {minutes}m</span>
          <span className="report-preview-label">Focus this week</span>
        </div>
        <div className="report-preview-stat">
          <span className="report-preview-value">{report.consistencyPercentage}%</span>
          <span className="report-preview-label">30-day consistency</span>
        </div>
        <div className="report-preview-stat">
          <span className="report-preview-value">{report.currentBestStreak}d</span>
          <span className="report-preview-label">Best active streak</span>
        </div>
      </div>

      <div className="report-preview-highlights">
        <div className="report-highlight">
          <span className="report-highlight-label">Top focus area</span>
          <strong>{report.topFocusArea ?? 'No sessions yet'}</strong>
        </div>
        <div className="report-highlight">
          <span className="report-highlight-label">Strongest habit</span>
          <strong>{report.strongestHabit ?? 'No streak yet'}</strong>
        </div>
        <div className="report-highlight">
          <span className="report-highlight-label">Needs support</span>
          <strong>{report.weakestArea ?? 'No weak spot detected'}</strong>
        </div>
      </div>

      <div className="report-recommendations">
        {report.recommendations.map(recommendation => (
          <div key={recommendation} className="report-recommendation">
            {recommendation}
          </div>
        ))}
      </div>

      <div className="report-preview-note">
        Health and life-area compounding momentum feed into this summary.
      </div>
    </div>
  );
}
