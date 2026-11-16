import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import App from './App.jsx';
import { FLOW } from './testFlow.js';
import { setJsonView } from './components/JsonPane.jsx';

// The header shows this lab's own Verified / In progress mark, read from the same /api/shelf call the Shelf link makes (through the lab-proxy
// that call reaches the shelf, whose payload lists every demo with its mark). The lab's own /api/shelf has no demos, so there is no mark then.
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });
beforeEach(() => { window.location.hash = ''; setJsonView('form'); });

const ID = 'agent-mcp-door-demo';
const mark = (status, label, extra = {}) => ({ status, label, note: '', updatedAt: '2026-11-15', source: 'shipped', ...extra });
const json = (body) => ({ ok: true, json: async () => body });
function stubFetch(shelfPayload) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const u = String(url);
    if (u === '/api/shelf') return json(shelfPayload);
    if (u.endsWith('/api/flow')) return json(FLOW);
    return json({ reset: 'ok', workspace: 'default', resets: 1 });
  });
}

describe('verification mark in the header', () => {
  it("shows this lab's own mark beside the Shelf link, once, and no other lab's", async () => {
    const spy = stubFetch({ shelfUrl: 'http://shelf.example', demos: [{ id: 'other-lab', verification: mark('in-progress', 'In progress') }, { id: ID, verification: mark('verified', 'Verified', { note: 'Every hop run on the mock' }) }] });
    render(<App />);
    const bar = within(await screen.findByTestId('top-menu'));
    expect(await bar.findByText('Verified')).toBeInTheDocument();
    expect(bar.getByRole('link', { name: 'Shelf' })).toBeInTheDocument();
    expect(bar.queryByText('In progress')).toBeNull();
    expect(document.querySelectorAll('.verify')).toHaveLength(1);
    expect(bar.getByText('Verified').closest('.verify')).toHaveAttribute('title', expect.stringContaining('Every hop run on the mock'));
    const shelfCalls = spy.mock.calls.filter(([u]) => u === '/api/shelf');
    expect(shelfCalls.length).toBeGreaterThanOrEqual(2); // the Shelf link and the mark
    for (const [, init] of shelfCalls) expect(init.headers['x-workspace']).toBe('default');
  });

  it('shows nothing when the lab is opened on its own port (its /api/shelf has no demos) or the shelf has no mark for it', async () => {
    for (const payload of [{ shelfUrl: 'http://shelf.example' }, { shelfUrl: 'http://shelf.example', demos: [{ id: ID, verification: null }] }, { shelfUrl: 'http://shelf.example', demos: [{ id: ID, verification: { status: 'none' } }] }]) {
      stubFetch(payload);
      const { unmount } = render(<App />);
      const bar = within(await screen.findByTestId('top-menu'));
      expect(await bar.findByRole('link', { name: 'Shelf' })).toBeInTheDocument(); // the shelf answered, and still no badge
      expect(document.querySelector('.verify')).toBeNull();
      unmount();
      vi.restoreAllMocks();
    }
  });
});
