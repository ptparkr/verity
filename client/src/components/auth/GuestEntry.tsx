import { FormEvent, useState } from 'react';
import { useAuth } from '../../lib/auth';

export function GuestEntry() {
  const { joinAsGuest } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmed = username.trim();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (trimmed.length < 2) {
      setError('Please use at least 2 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await joinAsGuest(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create workspace profile');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="guest-entry-shell">
      {/* Ambient background orbs */}
      <div className="guest-orb guest-orb-1" aria-hidden="true" />
      <div className="guest-orb guest-orb-2" aria-hidden="true" />
      <div className="guest-orb guest-orb-3" aria-hidden="true" />

      <section className="guest-entry-panel animate-in">
        {/* Left — hero copy */}
        <div className="guest-entry-copy">
          <div className="guest-entry-wordmark" aria-label="Verity">
            <span className="guest-wordmark-v">V</span>erity
          </div>

          <span className="guest-entry-kicker">Local-first · Life compounding</span>

          <h1 className="guest-hero-headline">
            Build the life<br />
            <em className="guest-hero-em">you're compounding.</em>
          </h1>

          <p className="guest-entry-copy-body">
            Track what your daily actions are compounding into — across play, health, mind, and social. Every check-in is a data point. Every streak is a signal.
          </p>

          <ul className="guest-feature-list" aria-label="Key features">
            <li><span className="guest-feat-icon">◈</span> Habit streaks &amp; heatmaps</li>
            <li><span className="guest-feat-icon">◈</span> Life area analytics</li>
            <li><span className="guest-feat-icon">◈</span> Focus &amp; longevity tracking</li>
          </ul>
        </div>

        {/* Right — identity form */}
        <form className="guest-entry-form" onSubmit={onSubmit} noValidate>
          <div className="guest-form-header">
            <span className="guest-form-eyebrow">Your identity</span>
            <p className="guest-form-hint">
              {trimmed.length >= 2
                ? `Welcome, ${trimmed} — your workspace is ready.`
                : 'Choose a name to start your workspace.'}
            </p>
          </div>

          <div className="guest-input-group">
            <label htmlFor="guest-username">Name / Username</label>
            <div className="guest-input-wrap">
              <svg
                className="guest-input-icon"
                width="16" height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              <input
                id="guest-username"
                className="input guest-input-field"
                autoComplete="nickname"
                autoFocus
                maxLength={40}
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. Alex"
                disabled={isSubmitting}
              />
              {trimmed.length >= 2 && (
                <span className="guest-input-check" aria-hidden="true">✓</span>
              )}
            </div>
          </div>

          {error && <p className="guest-entry-error" role="alert">{error}</p>}

          <button
            className="btn btn-primary guest-submit-btn"
            type="submit"
            disabled={isSubmitting || trimmed.length < 2}
          >
            {isSubmitting ? (
              <span className="guest-btn-loading">
                <span className="guest-spinner" aria-hidden="true" />
                Setting up workspace…
              </span>
            ) : (
              <>Enter Workspace <span className="guest-submit-arrow" aria-hidden="true">→</span></>
            )}
          </button>

          <p className="guest-privacy-note">
            All data stays local — nothing leaves your device.
          </p>
        </form>
      </section>
    </main>
  );
}
