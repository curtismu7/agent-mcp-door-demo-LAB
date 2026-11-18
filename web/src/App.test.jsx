import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App, { hopFor } from './App.jsx';
import { FLOW } from './testFlow.js';
import { setJsonView } from './components/JsonPane.jsx';

afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });
beforeEach(() => { window.location.hash = ''; setJsonView('form'); });

const mockFetch = (flow = FLOW) => vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init = {}) => {
  const u = String(url);
  if (u.endsWith('/api/mode') && init.method === 'POST') {
    const body = JSON.parse(init.body || '{}');
    if (body.source === 'real') return { ok: false, status: 409, json: async () => ({ error: 'real_not_available', realAvailable: false, realReason: 'mock only', message: 'This walkthrough has no live backend: it is mock only.' }) };
    return { ok: true, json: async () => ({ source: 'mock', realAvailable: false, realReason: 'mock only' }) };
  }
  return String(u).endsWith('/api/flow') ? { ok: true, json: async () => flow } : { ok: true, json: async () => ({ reset: 'ok', workspace: 'default', resets: 1 }) };
});

describe('hopFor', () => {
  it('maps a step to its hop and is null when the walkthrough is off', () => {
    expect(hopFor(FLOW.hops, -1)).toBeNull();
    expect(hopFor(FLOW.hops, 1).n).toBe(1);
    expect(hopFor(FLOW.hops, 2).n).toBe(2);
    expect(hopFor(FLOW.hops, 9)).toBeNull();
  });
});

describe('App', () => {
  it('shows the simulation banner, the Mock / Real toggle with Real unavailable, and the story title', async () => {
    mockFetch();
    render(<App />);
    expect(await screen.findByText(/meets Test Air/)).toBeTruthy();
    expect(screen.getByTestId('sim-banner').textContent).toMatch(/MOCK. Simulated/);
    expect(screen.getByTestId('mode-select')).toHaveValue('mock');
    const realOption = screen.getByTestId('mode-select').querySelector('option[value="real"]');
    expect(realOption).toBeDisabled();
  });

  it('shell bar: brand, Mock badge, the current page pill and the TopMenu in header.shell-bar; then <main> with the banner first', async () => {
    mockFetch();
    render(<App />);
    await screen.findByText(/meets Test Air/);
    const bar = document.querySelector('header.shell-bar');
    expect(bar).not.toBeNull();
    expect(document.body.querySelector('header.shell-bar + main')).not.toBeNull();
    expect(bar.querySelector('.shell-brand h1').textContent).toBe('Agent Meets the MCP Door LAB');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(bar.querySelector('[data-testid=mode-badge]').textContent).toBe('MOCK');
    expect(bar.querySelector('.shell-nav a[aria-current="page"]').textContent).toBe('MCP door');
    expect(bar.querySelector('[data-testid=top-menu]').classList.contains('shell-right')).toBe(true);
        expect(screen.getByTestId('privilege-check').nextElementSibling).toBe(screen.getByTestId('sim-banner'));
    expect(screen.getByRole('heading', { level: 2, name: /meets Test Air/ })).toBeTruthy();
    expect(bar.querySelector('#workspace-id')).toBeNull();
    expect(document.querySelector('main #workspace-id')).not.toBeNull();
  });

  it('rule 19: mock→mock posts /api/mode with exactly {source} and the view reloads; a refused switch shows the reason and stays mock', async () => {
    const spy = mockFetch();
    render(<App />);
    await screen.findByText(/meets Test Air/);
    spy.mockClear();
    await userEvent.selectOptions(screen.getByTestId('mode-select'), 'mock');
    await waitFor(() => expect(spy.mock.calls.some(([u, o]) => String(u).endsWith('/api/mode') && o?.method === 'POST' && o.body === JSON.stringify({ source: 'mock' }))).toBe(true));
    // the data reloaded after the switch
    await waitFor(() => expect(spy.mock.calls.some(([u]) => String(u).endsWith('/api/flow'))).toBe(true));
    expect(screen.getByTestId('sim-banner').textContent).toMatch(/MOCK. Simulated/);
    // Real is disabled: selecting it cannot post
    const posts = spy.mock.calls.filter(([u, o]) => String(u).endsWith('/api/mode') && o?.method === 'POST').length;
    await userEvent.selectOptions(screen.getByTestId('mode-select'), 'real');
    expect(spy.mock.calls.filter(([u, o]) => String(u).endsWith('/api/mode') && o?.method === 'POST').length).toBe(posts);
  });

  it('rule 19: a 409 from the server (if Real were enabled) shows the reason', async () => {
    const flow = { ...FLOW, realAvailable: false };
    mockFetch(flow);
    render(<App />);
    await screen.findByText(/meets Test Air/);
    // Real is disabled with the server's reason
    expect(screen.getByTestId('mode-select').querySelector('option[value="real"]')).toBeDisabled();
  });

  it('the banner and the toggle are there even when the story cannot be loaded', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    render(<App />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Could not load/);
    expect(screen.getByTestId('sim-banner')).toBeTruthy();
    expect(screen.getByTestId('top-menu')).toBeTruthy();
        expect(screen.getByTestId('privilege-check').nextElementSibling).toBe(screen.getByTestId('sim-banner'));
    expect(screen.getByTestId('sim-banner').nextElementSibling).toBe(screen.getByRole('alert'));
  });

  it('a #hop-2 link opens that hop', async () => {
    window.location.hash = '#hop-2';
    mockFetch();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('track-now').textContent).toMatch(/say two/));
  });

  it('picking a hop on the talk track jumps to it and shows what to say', async () => {
    mockFetch();
    render(<App />);
    await screen.findByText(/meets Test Air/);
    fireEvent.click(screen.getByRole('button', { name: /Call/ }));
    await waitFor(() => expect(screen.getByTestId('track-now').textContent).toMatch(/say two/));
  });

  it('presenter mode keeps the banner and the toggle; the arrow keys walk the hops; Reset returns to the list and posts a reset', async () => {
    const spy = mockFetch();
    render(<App />);
    await screen.findByText(/meets Test Air/);
    fireEvent.click(screen.getByRole('button', { name: 'Presenter' }));
    expect(screen.getByTestId('sim-banner')).toBeTruthy();
    expect(screen.getByTestId('top-menu')).toBeTruthy();
    expect(screen.queryByText('intro text')).toBeNull();
    act(() => { fireEvent.keyDown(window, { key: 'ArrowRight' }); });
    await waitFor(() => expect(screen.getByTestId('track-now').textContent).toMatch(/say one/));
    act(() => { fireEvent.keyDown(window, { key: 'ArrowRight' }); fireEvent.keyDown(window, { key: 'ArrowRight' }); });
    await waitFor(() => expect(screen.getByTestId('track-now').textContent).toMatch(/say two/));
    fireEvent.click(screen.getByTestId('reset'));
    await waitFor(() => expect(screen.queryByTestId('track-now')).toBeNull());
    expect(spy.mock.calls.some(([u, o]) => String(u).endsWith('/api/reset') && o?.method === 'POST')).toBe(true);
    await screen.findByText(/has a new trace/);
  });

  it('every call carries the workspace id, and changing it reloads the story for that workspace', async () => {
    const spy = mockFetch();
    render(<App />);
    await screen.findByText(/meets Test Air/);
    expect(spy.mock.calls[0][1].headers['x-workspace']).toBe('default');
    const input = screen.getByLabelText('Workspace');
    fireEvent.change(input, { target: { value: 'room-7' } });
    fireEvent.submit(input.closest('form'));
    await waitFor(() => expect(spy.mock.calls.some(([, o]) => o?.headers?.['x-workspace'] === 'room-7')).toBe(true));
    expect(window.localStorage.getItem('mcpdoor-workspace')).toBe('room-7');
  });

  it('a bad workspace id is refused in the page and never sent', async () => {
    const spy = mockFetch();
    render(<App />);
    await screen.findByText(/meets Test Air/);
    const calls = spy.mock.calls.length;
    const input = screen.getByLabelText('Workspace');
    fireEvent.change(input, { target: { value: 'Bad Id!' } });
    fireEvent.submit(input.closest('form'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/lowercase letters/);
    expect(spy.mock.calls.length).toBe(calls);
  });

  it('Simulate starts the walkthrough; the speed control is there; Reset on the step bar stops it', async () => {
    mockFetch();
    render(<App />);
    await screen.findByText(/meets Test Air/);
    expect(screen.getByLabelText(/Speed/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Simulate' }));
    await waitFor(() => expect(screen.getByTestId('track-now').textContent).toMatch(/say one/));
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset' })[0]);
    await waitFor(() => expect(screen.queryByTestId('track-now')).toBeNull());
  });

  it('the movie reel lists every arrow and opens the details row with the mock traceparent', async () => {
    mockFetch();
    render(<App />);
    await screen.findByText(/meets Test Air/);
    const cards = await waitFor(() => { const c = document.querySelectorAll('.reel__card'); expect(c.length).toBe(3); return c; });
    fireEvent.click(cards[1]);
    const detail = await screen.findByTestId('sequence-reel-detail');
    expect(detail.textContent).toMatch(/traceparent \(mock\)/);
    expect(detail.textContent).toMatch(/00-a{32}-2{16}-01/);
  });

  // Rule 24: a payload that carries JSON (the mock token's claims) goes through the shared JsonPane, in the reel and in the diagram.
  const TOKEN = 'Per-call token (MOCK)\n{\n  "sub": "<member id>",\n  "aud": "https://mcp.example/rewards",\n  "jti": "<unique id>"\n}';
  it('rule 24: the reel shows a JSON payload as Form | JSON, and wire text stays a plain pre', async () => {
    mockFetch({ ...FLOW, payloads: ['a: 1', TOKEN, 'b: 2'] });
    render(<App />);
    await screen.findByText(/meets Test Air/);
    const cards = await waitFor(() => { const c = document.querySelectorAll('.reel__card'); expect(c.length).toBe(3); return c; });
    fireEvent.click(cards[1]);
    const detail = await screen.findByTestId('sequence-reel-detail');
    expect(detail.querySelector('.jsonbox')).toBeTruthy();
    expect(detail.querySelector('pre.reel__code')?.textContent).toMatch(/00-a{32}-2{16}-01/); // the traceparent is not JSON
    expect(detail.querySelector('.json--form').textContent).toMatch(/jti/);
    fireEvent.click(detail.querySelector('.jsonbox__toggle button:last-child'));
    expect(detail.querySelector('pre.json--raw').textContent).toBe(TOKEN.slice(TOKEN.indexOf('\n') + 1));
    fireEvent.click(cards[0]);
    expect((await screen.findByTestId('sequence-reel-detail')).querySelector('.jsonbox')).toBeNull();
    expect(screen.getByTestId('sequence-reel-detail').querySelector('pre.reel__code').textContent).toBe('a: 1');
  });

  it('rule 24: the diagram shows the same payload through the JsonPane, and a text payload stays a pre', async () => {
    mockFetch({ ...FLOW, payloads: ['a: 1', TOKEN, 'b: 2'] });
    render(<App />);
    await screen.findByText(/meets Test Air/);
    await waitFor(() => expect(document.querySelectorAll('.seq-payload').length).toBe(3));
    const boxes = [...document.querySelectorAll('.seq-payload')];
    expect(boxes.map((b) => b.tagName)).toEqual(['PRE', 'DIV', 'PRE']);
    expect(boxes[1].querySelector('.jsonbox')).toBeTruthy();
    expect(boxes[1].querySelector('.payload-caption').textContent).toBe('Per-call token (MOCK)');
  });
});
