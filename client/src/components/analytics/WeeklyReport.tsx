import type { WeeklyReportData } from '../../lib/analytics';
import { useState } from 'react';

interface Props {
  report: WeeklyReportData;
}

export function WeeklyReport({ report }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const hours = Math.floor(report.totalFocusMinutes / 60);
  const minutes = report.totalFocusMinutes % 60;

  const formatDate = (str: string | undefined) => {
    if (!str) return '—';
    const d = new Date(str + 'T12:00:00'); // Use mid-day to avoid TZ shifts
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const copyToClipboard = () => {
    const text = generatePlainText(report);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error('Failed to copy:', err);
    });
  };

  return (
    <div className={`weekly-report ${expanded ? 'expanded' : ''}`}>
      <div className="weekly-report-header" onClick={() => setExpanded(!expanded)}>
        <div className="weekly-report-title">
          <span>Week of {formatDate(report.weekStart)}</span>
          <span className="weekly-report-week">{formatDate(report.weekStart)} – {formatDate(report.weekEnd)}</span>
        </div>
        <div className="weekly-report-summary">
          <div className="weekly-report-stat">
            <span className="weekly-report-stat-value">{hours}h {minutes}m</span>
            <span className="weekly-report-stat-label">Focus</span>
          </div>
          <div className="weekly-report-stat">
            <span className="weekly-report-stat-value">{Math.round((report.habitCompletionRate || 0) * 100)}%</span>
            <span className="weekly-report-stat-label">Habits</span>
          </div>
          <div className="weekly-report-stat">
            <span className="weekly-report-stat-value">{report.momentumScore}</span>
            <span className="weekly-report-stat-label">Momentum</span>
          </div>
        </div>
        <button className="weekly-report-toggle">
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {expanded && (
        <div className="weekly-report-body">
          <div className="weekly-report-section">
            <h4>Focus</h4>
            <div className="weekly-report-grid">
              <div className="weekly-report-item">
                <span className="weekly-report-item-value">{report.completedSessions}</span>
                <span className="weekly-report-item-label">Sessions</span>
              </div>
              <div className="weekly-report-item">
                <span className="weekly-report-item-value">{Math.round(report.completionRate * 100)}%</span>
                <span className="weekly-report-item-label">Completion</span>
              </div>
              <div className="weekly-report-item">
                <span className="weekly-report-item-value">{report.avgQuality?.toFixed(1) || '—'}</span>
                <span className="weekly-report-item-label">Avg Quality</span>
              </div>
              <div className="weekly-report-item">
                <span className="weekly-report-item-value">{report.topFocusArea || '—'}</span>
                <span className="weekly-report-item-label">Top Area</span>
              </div>
            </div>
          </div>

          <div className="weekly-report-section">
            <h4>Habits</h4>
            <div className="weekly-report-grid">
              <div className="weekly-report-item">
                <span className="weekly-report-item-value">{Math.round(report.habitCompletionRate * 100)}%</span>
                <span className="weekly-report-item-label">Completion</span>
              </div>
              {report.longestCurrentStreak && (
                <div className="weekly-report-item">
                  <span className="weekly-report-item-value">{report.longestCurrentStreak.days}d</span>
                  <span className="weekly-report-item-label">{report.longestCurrentStreak.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="weekly-report-section">
            <h4>Health</h4>
            <div className="weekly-report-grid">
              <div className="weekly-report-item">
                <span className="weekly-report-item-value">{report.sleepAvg?.toFixed(1) || '—'}h</span>
                <span className="weekly-report-item-label">Sleep</span>
              </div>
              <div className="weekly-report-item">
                <span className="weekly-report-item-value">{report.hrvAvg || '—'}</span>
                <span className="weekly-report-item-label">HRV</span>
              </div>
              <div className="weekly-report-item">
                <span className="weekly-report-item-value">{report.energyAvg?.toFixed(1) || '—'}</span>
                <span className="weekly-report-item-label">Energy</span>
              </div>
              <div className="weekly-report-item">
                <span className="weekly-report-item-value">{report.moodAvg?.toFixed(1) || '—'}</span>
                <span className="weekly-report-item-label">Mood</span>
              </div>
            </div>
          </div>


          <div className="weekly-report-section recommendations">
            <h4>Recommendations</h4>
            <ul>
              {report.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="weekly-report-actions">
            <button className="btn btn-ghost" onClick={copyToClipboard}>
              {copied ? '✓ Copied!' : '📋 Copy Report'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function generatePlainText(report: WeeklyReportData): string {
  const lines = [
    `📊 Verity Weekly Report — ${report.weekStart} to ${report.weekEnd}`,
    '',
    `🎯 Focus: ${report.totalFocusMinutes} min, ${report.completedSessions} sessions, ${Math.round(report.completionRate * 100)}% completion`,
    `✅ Habits: ${Math.round(report.habitCompletionRate * 100)}% completion`,
    report.longestCurrentStreak ? `🔥 Streak: ${report.longestCurrentStreak.name} (${report.longestCurrentStreak.days} days)` : '',
    '',
    `❤️ Health: Sleep ${report.sleepAvg?.toFixed(1) || '—'}h, HRV ${report.hrvAvg || '—'}`,
    `⚡ Energy ${report.energyAvg?.toFixed(1) || '—'}, Mood ${report.moodAvg?.toFixed(1) || '—'}`,
    '',
    '💡 Recommendations:',
    ...report.recommendations.map((r, i) => `${i + 1}. ${r}`),
  ];
  return lines.filter(Boolean).join('\n');
}