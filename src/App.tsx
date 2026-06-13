import { useEffect, useState } from 'react';
import { parseCsvText } from './lib/parseCsv';
import type { Claim } from './lib/types';
import { Dashboard } from './components/Dashboard';

type LoadState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; claims: Claim[] };

export function App() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/claims.csv`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} khi tải claims.csv`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setState({ phase: 'ready', claims: parseCsvText(text) });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ phase: 'error', message: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <header className="app-header">
        <div className="container">
          <div>
            <p className="eyebrow">Papaya Insurance · Claims Operations</p>
            <h1>Claims Analytics Dashboard</h1>
          </div>
          <div className="header-meta">
            TH / VN / HK · FY 2024
            {state.phase === 'ready' && ` · ${state.claims.length.toLocaleString()} claims`}
          </div>
        </div>
      </header>
      <main className="container">
        {state.phase === 'loading' && <p className="center-note">Loading claims dataset…</p>}
        {state.phase === 'error' && (
          <p className="center-note error">Không tải được dataset: {state.message}</p>
        )}
        {state.phase === 'ready' && <Dashboard claims={state.claims} />}
      </main>
    </>
  );
}
