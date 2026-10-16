import { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { PageHeader } from '../components/ui/PageHeader';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { StatusBanner } from '../components/ui/StatusBanner';

type NumericFieldKey =
  | 'heightCm'
  | 'weightKg'
  | 'waistCm'
  | 'bodyFatPercent'
  | 'restingHeartRate';

const MEASUREMENT_FIELDS: {
  key: NumericFieldKey;
  label: string;
  helper: string;
  suffix: string;
}[] = [
  { key: 'heightCm', label: 'Height', helper: 'Used for physiological metrics and body tracking.', suffix: 'cm' },
  { key: 'weightKg', label: 'Weight', helper: 'Stores your current baseline weight for body tracking.', suffix: 'kg' },
  { key: 'waistCm', label: 'Waist', helper: 'Useful for visceral fat context and health tracking.', suffix: 'cm' },
  { key: 'bodyFatPercent', label: 'Body Fat', helper: 'Optional estimate for body-composition tracking.', suffix: '%' },
  { key: 'restingHeartRate', label: 'Resting Heart Rate', helper: 'Keeps a baseline for autonomic & longevity correlation views.', suffix: 'bpm' },
];

function valueToDraft(value: number | null) {
  return value === null ? '' : String(value);
}

export function SettingsPage() {
  const {
    settings,
    status,
    error,
    lastSavedAt,
    markDirty,
    saveNow,
    resetToDefaults,
    formatLastSaved,
  } = useSettings();

  const [numericDrafts, setNumericDrafts] = useState<Record<NumericFieldKey, string>>({
    heightCm: valueToDraft(settings.measurements.heightCm),
    weightKg: valueToDraft(settings.measurements.weightKg),
    waistCm: valueToDraft(settings.measurements.waistCm),
    bodyFatPercent: valueToDraft(settings.measurements.bodyFatPercent),
    restingHeartRate: valueToDraft(settings.measurements.restingHeartRate),
  });

  useEffect(() => {
    setNumericDrafts({
      heightCm: valueToDraft(settings.measurements.heightCm),
      weightKg: valueToDraft(settings.measurements.weightKg),
      waistCm: valueToDraft(settings.measurements.waistCm),
      bodyFatPercent: valueToDraft(settings.measurements.bodyFatPercent),
      restingHeartRate: valueToDraft(settings.measurements.restingHeartRate),
    });
  }, [settings]);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = settings.preferences.reducedMotion ? 'true' : 'false';
  }, [settings.preferences.reducedMotion]);

  const saveLabel = useMemo(() => {
    if (status === 'saving') return 'Saving...';
    if (status === 'saved') return 'Saved';
    if (status === 'error') return 'Save Failed';
    if (status === 'dirty') return 'Save Now';
    return 'Save';
  }, [status]);

  const statusLabel = useMemo(() => {
    if (status === 'saving') return 'Saving your preferences...';
    if (status === 'saved') return `Saved ${formatLastSaved(lastSavedAt)}`;
    if (status === 'error') return error || 'Failed to save settings.';
    if (status === 'dirty') return 'Changes are queued for auto-save.';
    return lastSavedAt ? `Last saved ${formatLastSaved(lastSavedAt)}` : 'Auto-save is enabled for this page.';
  }, [error, formatLastSaved, lastSavedAt, status]);

  const updateNumericDraft = (key: NumericFieldKey, nextValue: string) => {
    setNumericDrafts(current => ({ ...current, [key]: nextValue }));
  };

  const handleMeasurementChange = (key: NumericFieldKey, nextValue: string) => {
    updateNumericDraft(key, nextValue);
    if (nextValue.trim() === '') return;
    const parsed = Number(nextValue);
    if (!Number.isFinite(parsed)) return;
    markDirty(current => ({
      ...current,
      measurements: { ...current.measurements, [key]: parsed },
    }));
  };

  const commitMeasurementField = (key: NumericFieldKey) => {
    const rawValue = numericDrafts[key].trim();
    if (rawValue === '') {
      markDirty(current => ({
        ...current,
        measurements: { ...current.measurements, [key]: null },
      }));
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      setNumericDrafts(current => ({ ...current, [key]: valueToDraft(settings.measurements[key]) }));
      return;
    }

    markDirty(current => ({
      ...current,
      measurements: { ...current.measurements, [key]: parsed },
    }));
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Settings"
        subtitle="Personal profile, biological baseline measurements, and app preferences."
      />

      <StatusBanner
        tone={status === 'error' ? 'danger' : 'subtle'}
        message={statusLabel}
        actions={(
          <div className="settings-status-actions">
            <button className="status-action" type="button" onClick={resetToDefaults}>
              Reset
            </button>
            <button className="status-action" type="button" onClick={saveNow} disabled={status === 'saving'}>
              {saveLabel}
            </button>
          </div>
        )}
      />

      <div className="settings-grid">
        <section className="card settings-card">
          <div className="card-title">Profile</div>
          <div className="settings-field-grid">
            <label className="settings-field">
              <span className="settings-label">Name</span>
              <input
                type="text"
                className="input"
                value={settings.profile.name}
                maxLength={80}
                placeholder="Enter your name"
                onChange={event => {
                  const value = event.target.value;
                  markDirty(current => ({
                    ...current,
                    profile: { ...current.profile, name: value },
                  }));
                }}
              />
              <span className="settings-helper">Stored locally and used only to personalize your workspace.</span>
            </label>

            <label className="settings-field">
              <span className="settings-label">Date of Birth</span>
              <input
                type="date"
                className="input"
                value={settings.profile.dateOfBirth}
                onChange={event => {
                  const value = event.target.value;
                  markDirty(current => ({
                    ...current,
                    profile: { ...current.profile, dateOfBirth: value },
                  }));
                }}
              />
              <span className="settings-helper">Used to calculate biological age and longevity trajectories.</span>
            </label>
          </div>

          <div className="settings-field">
            <span className="settings-label">Biological Sex</span>
            <SegmentedControl
              className="settings-pill-row"
              options={(['male', 'female', 'other'] as const).map(option => ({
                value: option,
                label: option.charAt(0).toUpperCase() + option.slice(1),
              }))}
              value={settings.profile.sex}
              onChange={option => {
                markDirty(current => ({
                  ...current,
                  profile: { ...current.profile, sex: option },
                }));
              }}
            />
            <span className="settings-helper">Context for physiological benchmarks and longevity correlations.</span>
          </div>
        </section>

        <section className="card settings-card">
          <div className="card-title">Measurements</div>
          <div className="settings-field-grid">
            {MEASUREMENT_FIELDS.map(field => (
              <label key={field.key} className="settings-field">
                <span className="settings-label">{field.label}</span>
                <div className="settings-input-with-suffix">
                  <input
                    type="number"
                    className="input"
                    value={numericDrafts[field.key]}
                    placeholder="Optional"
                    onChange={event => handleMeasurementChange(field.key, event.target.value)}
                    onBlur={() => commitMeasurementField(field.key)}
                  />
                  <span className="settings-suffix">{field.suffix}</span>
                </div>
                <span className="settings-helper">{field.helper}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="card settings-card">
          <div className="card-title">App Behavior</div>
          <div className="settings-toggle-list">
            <button
              type="button"
              className={`settings-toggle ${settings.preferences.reducedMotion ? 'active' : ''}`}
              onClick={() => {
                markDirty(current => ({
                  ...current,
                  preferences: {
                    ...current.preferences,
                    reducedMotion: !current.preferences.reducedMotion,
                  },
                }));
              }}
            >
              <div>
                <span className="settings-label">Reduced Motion</span>
                <span className="settings-helper">Softens animations and visual transitions for comfort.</span>
              </div>
              <span className="settings-toggle-indicator">{settings.preferences.reducedMotion ? 'On' : 'Off'}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
