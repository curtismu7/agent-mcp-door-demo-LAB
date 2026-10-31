// The Mock / Live toggle, in the header of every page. The server decides what exists: this app has a mock mode only, so Live
// is shown, disabled, with the reason beside it. The banner shows the same mode.
export default function ModeToggle({ info }) {
  const mode = info?.mode || 'mock';
  const liveOk = Boolean(info?.live?.available);
  return (
    <div className="mode-toggle" role="group" aria-label="Mock or live" data-testid="mode-toggle">
      <span className="mode-toggle__current" data-testid="mode">{mode === 'live' ? 'LIVE' : 'MOCK'}</span>
      <button type="button" aria-pressed={mode === 'mock'} title="Offline, simulated">Mock</button>
      <button type="button" aria-pressed={mode === 'live'} disabled={!liveOk} title={info?.live?.reason || 'No live backend'}>Live</button>
      {!liveOk && <span className="mode-toggle__hint" data-testid="live-hint">Live: not available, this demo is mock only</span>}
    </div>
  );
}
