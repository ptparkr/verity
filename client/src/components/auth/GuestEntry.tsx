import { FormEvent, useState } from 'react';
import { useAuth } from '../../lib/auth';

export function GuestEntry() {
  const { joinAsGuest } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextUsername = username.trim();

    if (nextUsername.length < 2) {
      setError('Use at least 2 characters.');
      return;
    }

    await joinAsGuest(nextUsername);
  };

  return (
    <main className="guest-entry-shell">
      <section className="guest-entry-panel animate-in">
        <div className="guest-entry-copy">
          <span className="guest-entry-kicker">Local-first workspace</span>
          <h1>Verity</h1>
          <p>
            Track what your daily actions are compounding into across Play, Health, Mind, and Social. Your identity is created on this device and restored automatically.
          </p>
        </div>

        <form className="guest-entry-form" onSubmit={onSubmit}>
          <label htmlFor="guest-username">Username</label>
          <input
            id="guest-username"
            className="input"
            autoComplete="nickname"
            autoFocus
            value={username}
            onChange={event => {
              setUsername(event.target.value);
              setError('');
            }}
            placeholder="What should we call you?"
          />
          {error && <span className="guest-entry-error">{error}</span>}
          <button className="btn btn-primary" type="submit">Enter workspace</button>
        </form>
      </section>
    </main>
  );
}
