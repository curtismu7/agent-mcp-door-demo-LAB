import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App, { hopFor } from './App.jsx';
import { FLOW } from './testFlow.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });
beforeEach(() => { window.location.hash = ''; });

const mockFetch = (flow = FLOW) => vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => (
  String(url).endsWith('/api/flow') ? { ok: true, json: async () => flow } : { ok: true, json: async () => ({ reset: 'ok', workspace: 'default', resets: 1 }) }));

describe('hopFor', () => {
  it('maps a step to its hop and is null when the walkthrough is off', () => {
    expect(hopFor(FLOW.hops, -1)).toBeNull();
    expect(hopFor(FLOW.hops, 1).n).toBe(1);
    expect(hopFor(FLOW.hops, 2).n).toBe(2);
    expect(hopFor(FLOW.hops, 9)).toBeNull();
  });
});

describe('App', () => {
  it('shows the simulation banner, the Mock / Live toggle with Live unavailable, and the story title', async () => {
    mockFetch();
    render(<App />);
    expect(await screen.findByText(/meets Test Air/)).toBeTruthy();
    expect(screen.getByTestId('sim-banner').textContent).toMatch(/MOCK. Simulated/);
    expect(screen.getByTestId('mode').textContent).toBe('MOCK');
    expect(screen.getByRole('button', { name: 'Mock' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Live' }).disabled).toBe(true);
    expect(screen.getByTestId('live-hint').textContent).toMatch(/mock only/);
  });

  it('the banner and the toggle are there even when the story cannot be loaded', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    render(<App />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Could not load/);
    expect(screen.getByTestId('sim-banner')).toBeTruthy();
    expect(screen.getByTestId('mode-toggle')).toBeTruthy();
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
    expect(screen.getByTestId('mode-toggle')).toBeTruthy();
    expect(screen.queryByText('intro text')).toBeNull();
    act(() => { fireEvent.keyDown(window, { key: 'ArrowRight' }); });
    await waitFor(() => expect(screen.getByTestId('track-now').textContent).toMatch(/say one/));
    act(() => { fireEvent.keyDown(window, { key: 'ArrowRight' }); fireEvent.keyDown(window, { key: 'ArrowRight' }); });
    await waitFor(() => expect(screen.getByTestId('track-now').textContent).toMatch(/say two/));
    fireEvent.click(screen.getByRole('button', { name: 'Reset demo' }));
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
});
