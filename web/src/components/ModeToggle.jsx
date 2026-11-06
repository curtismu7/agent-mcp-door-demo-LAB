// The Mock / Real toggle, in the header of every page (rule 19). Switching is a server call: POST /api/mode
// with exactly { source }, then the caller reloads its data. This app has a mock mode only, so Real is shown,
// disabled, with the server's reason beside it. The banner shows the same mode.
import { api } from '../lib/api.js';

export default function ModeToggle({ info, onSwitched, onRefused }) {
  const source = info?.source ?? 'mock';
  const realOk = Boolean(info?.realAvailable);
  const reason = info?.realReason || 'No live backend';
  const switchTo = async (next) => {
    if (!realOk && next === 'real') { onRefused?.(reason); return; }
    try { await api.setMode(next); } catch (e) { onRefused?.(e.message || reason); return; }
    onSwitched?.();
  };
  return (
    <div className="mode-toggle" role="group" aria-label="Mock or real" data-testid="mode-toggle">
      <span className="mode-toggle__current" data-testid="mode">{source === 'real' ? 'REAL' : 'MOCK'}</span>
      <button type="button" aria-pressed={source !== 'real'} title="Offline, simulated" onClick={() => switchTo('mock')}>Mock</button>
      <button type="button" aria-pressed={source === 'real'} disabled={!realOk} title={realOk ? undefined : reason} onClick={() => switchTo('real')}>Real</button>
      {!realOk && <span className="mode-toggle__hint" data-testid="live-hint">Real: not available, this demo is mock only</span>}
    </div>
  );
}
