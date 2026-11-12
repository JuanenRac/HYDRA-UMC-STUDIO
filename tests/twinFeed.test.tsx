// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/twinFeed.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The live state of the twin through the server: watching is off by default and survives a blocked storage, how a frame is read, an old state is dropped,
// what a close code means, and the screen: nothing opens until the box is ticked, the token goes as a subprotocol, and the state and the notices are shown.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '../src/i18n';
import { TwinLivePanel } from '../src/components/TwinLivePanel';
import {
  EMPTY_TWIN_FEED, TWIN_FEED_PATH, TWIN_FEED_PREF_KEY, applyTwinFrame, parseTwinFrame, readTwinFeedPref, twinFeedEnd, twinFeedRetries, writeTwinFeedPref,
} from '../src/lib/twinFeed';
import { TOKEN_KEY } from '../src/lib/session';

const state = (extra: Record<string, unknown> = {}) => JSON.stringify({
  type: 'twin_state',
  state: { schema_version: '1.0', source: 'real', robot_id: 'r1', frame: 'base', timestamp_utc: '2026-01-01T00:00:00Z', sequence: 5, joint_states: [{ name: 'j1', position: 0 }, { name: 'j2', position: 1 }], ...extra },
});

describe('the preference', () => {
  it('is off by default and when the storage is blocked', () => {
    expect(readTwinFeedPref({ getItem: () => null, setItem: () => {}, removeItem: () => {} })).toBe(false);
    expect(readTwinFeedPref({ getItem: () => { throw new Error('blocked'); }, setItem: () => {}, removeItem: () => {} })).toBe(false);
    expect(readTwinFeedPref(null)).toBe(false);
  });
  it('is kept when switched on and removed when switched off', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } };
    writeTwinFeedPref(true, storage);
    expect(data.get(TWIN_FEED_PREF_KEY)).toBe('on');
    expect(readTwinFeedPref(storage)).toBe(true);
    writeTwinFeedPref(false, storage);
    expect(readTwinFeedPref(storage)).toBe(false);
    expect(() => writeTwinFeedPref(true, { getItem: () => null, setItem: () => { throw new Error('full'); }, removeItem: () => {} })).not.toThrow();
  });
});

describe('the frames', () => {
  it('reads a state, a notice and the vehicles, and ignores everything else', () => {
    expect(parseTwinFrame(state())).toEqual({ kind: 'state', source: 'real', robotId: 'r1', joints: 2, sequence: 5 });
    expect(parseTwinFrame(JSON.stringify({ type: 'status', code: 'incomplete', message: 'x', missing: ['j2'] }))).toEqual({ kind: 'status', code: 'incomplete', message: 'x' });
    expect(parseTwinFrame(JSON.stringify({ type: 'uav_state', state: { robot_id: 'u1' } }))).toEqual({ kind: 'uav_state', robotId: 'u1' });
    expect(parseTwinFrame(JSON.stringify({ type: 'uav_status', robot_id: 'u1', code: 'stale' }))).toEqual({ kind: 'uav_status', robotId: 'u1', code: 'stale' });
    expect(parseTwinFrame(JSON.stringify({ error: 'Access denied' }))).toEqual({ kind: 'error', message: 'Access denied' });
    for (const bad of ['not json', '[]', 'null', JSON.stringify({ type: 'other' }), JSON.stringify({ type: 'twin_state', state: { source: 'guess', joint_states: [] } }),
      JSON.stringify({ type: 'twin_state', state: { source: 'real' } }), JSON.stringify({ type: 'status' }), JSON.stringify({ type: 'uav_status', robot_id: 3, code: 'x' })]) {
      expect(parseTwinFrame(bad)).toBeNull();
    }
  });
  it('takes a sequence that is not a whole non-negative number as none', () => {
    expect(parseTwinFrame(state({ sequence: -1 }))).toMatchObject({ sequence: null });
    expect(parseTwinFrame(state({ sequence: 1.5 }))).toMatchObject({ sequence: null });
  });
  it('builds the state, never lets a simulation pass for the real robot and drops a late state', () => {
    let feed = applyTwinFrame(EMPTY_TWIN_FEED, parseTwinFrame(state())!);
    expect(feed).toMatchObject({ source: 'real', joints: 2, sequence: 5, status: null, frames: 1 });
    const older = applyTwinFrame(feed, parseTwinFrame(state({ sequence: 4, joint_states: [] }))!);
    expect(older).toBe(feed);
    feed = applyTwinFrame(feed, parseTwinFrame(state({ source: 'simulated', sequence: 6 }))!);
    expect(feed.source).toBe('simulated');
    feed = applyTwinFrame(feed, { kind: 'status', code: 'incomplete', message: null });
    expect(feed.status).toEqual({ code: 'incomplete', message: null });
    feed = applyTwinFrame(feed, parseTwinFrame(state({ sequence: 7 }))!);
    expect(feed.status).toBeNull();
    feed = applyTwinFrame(feed, { kind: 'uav_status', robotId: 'u1', code: 'stale' });
    expect(feed.vehicles).toEqual({ u1: { stale: true } });
    feed = applyTwinFrame(feed, { kind: 'uav_state', robotId: 'u1' });
    expect(feed.vehicles).toEqual({ u1: { stale: false } });
    expect(applyTwinFrame(feed, { kind: 'error', message: 'x' })).toBe(feed);
  });
  it('turns a close code into what to do next', () => {
    expect(twinFeedEnd(1008)).toBe('denied');
    expect(twinFeedEnd(1013)).toBe('not_available');
    expect(twinFeedEnd(1011)).toBe('unavailable');
    expect(twinFeedEnd(1006)).toBe('closed');
    expect([twinFeedEnd(1008), twinFeedEnd(1013)].map(twinFeedRetries)).toEqual([false, false]);
    expect([twinFeedEnd(1011), twinFeedEnd(1006)].map(twinFeedRetries)).toEqual([true, true]);
  });
});

class FakeSocket {
  static all: FakeSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: ((ev: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  constructor(public url: string, public protocols: string[]) { FakeSocket.all.push(this); }
  close() { this.closed = true; }
}

describe('the screen', () => {
  beforeEach(() => {
    FakeSocket.all = [];
    vi.stubGlobal('WebSocket', FakeSocket);
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(TOKEN_KEY, 'the.token');
    sessionStorage.setItem(TOKEN_KEY, 'the.token');
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear(); });

  it('opens nothing until the box is ticked, then opens the route of the server with the token as a subprotocol', () => {
    render(<TwinLivePanel />);
    expect((screen.getByTestId('twin-live-watch') as HTMLInputElement).checked).toBe(false);
    expect(FakeSocket.all).toHaveLength(0);
    fireEvent.click(screen.getByTestId('twin-live-watch'));
    expect(FakeSocket.all).toHaveLength(1);
    expect(FakeSocket.all[0].url.endsWith(TWIN_FEED_PATH)).toBe(true);
    expect(FakeSocket.all[0].protocols).toEqual(['hydra.bearer', 'the.token']);
    expect(localStorage.getItem(TWIN_FEED_PREF_KEY)).toBe('on');
  });

  it('shows the state of the real robot, a notice of the twin and the vehicles, and closes the socket when the box is cleared', () => {
    render(<TwinLivePanel />);
    fireEvent.click(screen.getByTestId('twin-live-watch'));
    const socket = FakeSocket.all[0];
    act(() => { socket.onopen?.(); });
    act(() => { socket.onmessage?.({ data: state() }); });
    expect(screen.getByTestId('twin-live-state').textContent).toContain('2');
    act(() => { socket.onmessage?.({ data: JSON.stringify({ type: 'status', code: 'incomplete', message: null }) }); });
    expect(screen.getByTestId('twin-live-status').textContent).toContain('incomplete');
    act(() => { socket.onmessage?.({ data: JSON.stringify({ type: 'uav_status', robot_id: 'u1', code: 'stale' }) }); });
    expect(screen.getByTestId('twin-live-state').textContent).toContain('1');
    fireEvent.click(screen.getByTestId('twin-live-watch'));
    expect(socket.closed).toBe(true);
    expect(localStorage.getItem(TWIN_FEED_PREF_KEY)).toBeNull();
  });

  it('does not retry after a refused session and says so', () => {
    vi.useFakeTimers();
    try {
      render(<TwinLivePanel />);
      fireEvent.click(screen.getByTestId('twin-live-watch'));
      act(() => { FakeSocket.all[0].onclose?.({ code: 1008 }); });
      act(() => { vi.advanceTimersByTime(20000); });
      expect(FakeSocket.all).toHaveLength(1);
      expect(screen.getByTestId('twin-live-link').textContent).toMatch(/sign in again/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens again after the twin was unavailable', () => {
    vi.useFakeTimers();
    try {
      render(<TwinLivePanel />);
      fireEvent.click(screen.getByTestId('twin-live-watch'));
      act(() => { FakeSocket.all[0].onclose?.({ code: 1011 }); });
      act(() => { vi.advanceTimersByTime(6000); });
      expect(FakeSocket.all).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not open without a session', () => {
    localStorage.clear();
    sessionStorage.clear();
    render(<TwinLivePanel />);
    fireEvent.click(screen.getByTestId('twin-live-watch'));
    expect(FakeSocket.all).toHaveLength(0);
    expect(screen.getByTestId('twin-live-link').textContent).toMatch(/sign in again/i);
  });
});
