// Deployment configuration: the MODE setting. The app has one mode, mock; a live mode does not exist, so asking for one
// is an error, never a silent fallback. The Mock / Live toggle in the page shows both and says why Live is unavailable.
export const MODES = ['mock', 'live'];
export const LIVE_UNAVAILABLE = 'This walkthrough has no live backend: it is mock only. Nothing here talks to a tenant.';

export function modeFrom(env = process.env) {
  const m = env.MODE === undefined || env.MODE === '' ? 'mock' : env.MODE;
  if (m !== 'mock') throw new Error(`MODE=${String(m).slice(0, 20)} is not available: this app has a mock mode only`);
  return m;
}

// What the page needs for its toggle and banner.
// Rule 19 fields: source (mock|real), realAvailable and realReason — this walkthrough is mock only, so Real is never available.
export function modeInfo(env = process.env) {
  const mode = modeFrom(env);
  return {
    mode, source: 'mock', available: ['mock'],
    realAvailable: false, realReason: LIVE_UNAVAILABLE,
    live: { available: false, reason: LIVE_UNAVAILABLE },
  };
}

// Reads MODE from the process environment (after the shared settings file has been loaded).
export const configuredMode = () => modeFrom({ MODE: process.env.MODE });
