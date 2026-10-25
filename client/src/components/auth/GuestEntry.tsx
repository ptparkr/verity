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
      <section className="guest-entry-panel animate-in">
        <div className="guest-entry-copy">
          <span className="guest-entry-kicker">Local-first Workspace</span>
          <h1>Verity</h1>
          <p>
            Track what your daily actions are compounding into across play, health, mind, and social.
          </p>
        </div>

        <form className="guest-entry-form" onSubmit={onSubmit}>
          <div className="guest-preview-header">
            <span className="guest-preview-title">
              {trimmed ? `Welcome, ${trimmed}!` : 'Create Your Identity'}
            </span>
          </div>

          <div className="guest-input-group">
            <label htmlFor="guest-username">Your Name / Username</label>
            <input
              id="guest-username"
              className="input guest-input-field"
              autoComplete="nickname"
              autoFocus
              maxLength={40}
              value={username}
              onChange={event => {
                setUsername(event.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Alex"
              disabled={isSubmitting}
            />
          </div>

          {error && <span className="guest-entry-error">{error}</span>}

          <button
            className="btn btn-primary guest-submit-btn"
            type="submit"
            disabled={isSubmitting || trimmed.length < 2}
          >
            {isSubmitting ? (
              <span className="guest-btn-loading">
                <span className="analytics-loading-dot" /> Setting up workspace...
              </span>
            ) : (
              <span>Enter Workspace &rarr;</span>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}
