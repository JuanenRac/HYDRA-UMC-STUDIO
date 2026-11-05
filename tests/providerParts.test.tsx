// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/providerParts.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The parts moved out of the provider: the POST of a robot command, the feedback state, the safety limits poll and
// the scene files.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { postRobotCommand, tableThroughJogs } from '../src/lib/robotCommandPost';
import { useCommandIssues } from '../src/hooks/useCommandIssues';
import { useSafetyLimitsSync } from '../src/hooks/useSafetyLimitsSync';
import { useSceneFiles } from '../src/hooks/useSceneFiles';
import type { CommandResult } from '../src/lib/commandResult';
import type { RobotState } from '../src/store';

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];
const bodyOf = (call: Call) => JSON.parse(String(call.init.body));

function answers(...statuses: Array<[number, unknown]>) {
  let i = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    const [status, body] = statuses[Math.min(i++, statuses.length - 1)];
    return { ok: status >= 200 && status < 300, status, json: async () => body, headers: new Headers() } as Response;
  }));
}

beforeEach(() => { calls = []; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('the POST of one robot command', () => {
  const deps = () => ({ attemptTokenRefresh: vi.fn(async () => false), commandSequence: { next: vi.fn(() => 42) } });

  it('sends a numbered motion command with its number and an unnumbered one without', async () => {
    answers([200, { success: true }]);
    const d = deps();
    await postRobotCommand(d, 3, 'jog', { axis: 'x' });
    await postRobotCommand(d, 3, 'speed', { value: 50 });
    expect(calls[0].url).toBe('/api/robot/3/command');
    expect(bodyOf(calls[0]).seq).toBe(42);
    expect(bodyOf(calls[1]).seq).toBeUndefined();
    expect(d.commandSequence.next).toHaveBeenCalledTimes(1);
  });

  it('renews the session once and sends the command again when the token ran out', async () => {
    answers([401, { error: 'expired' }], [200, { success: true }]);
    const d = deps();
    d.attemptTokenRefresh.mockResolvedValue(true);
    const result = await postRobotCommand(d, 1, 'stop');
    expect(d.attemptTokenRefresh).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
    expect(result.ok).toBe(true);
  });

  it('answers a network failure as a typed result instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const result = await postRobotCommand(deps(), 1, 'jog', {});
    expect(result.ok).toBe(false);
  });

  it('sends the table move as jogs and stops at the first one that fails', async () => {
    const ok: CommandResult = { ok: true, status: 200, code: null, detail: null, serverCode: null, warnings: [] };
    const bad: CommandResult = { ...ok, ok: false, status: 500 };
    const post = vi.fn().mockResolvedValueOnce(ok).mockResolvedValueOnce(bad).mockResolvedValue(ok);
    const result = await tableThroughJogs(post, 2, { x: 10, y: 10, mode: 'relative' });
    expect(post.mock.calls.every((c) => c[0] === 2 && c[1] === 'jog')).toBe(true);
    if (post.mock.calls.length === 2) expect(result.ok).toBe(false);
    else expect(result.ok).toBe(true);
  });
});

describe('the feedback state', () => {
  it('numbers every reported issue and clears it when dismissed', () => {
    const { result } = renderHook(() => useCommandIssues());
    act(() => result.current.reportCommandIssue({ code: 'rejected', command: 'jog', robotIds: [1], detail: null }));
    const first = result.current.commandIssue!.id;
    act(() => result.current.reportCommandIssue({ code: 'rejected', command: 'jog', robotIds: [1], detail: null }));
    expect(result.current.commandIssue!.id).toBe(first + 1);
    act(() => result.current.dismissCommandIssue());
    expect(result.current.commandIssue).toBeNull();
  });

  it('counts the global STOPs on the wire and drops the report when dismissed', () => {
    const { result } = renderHook(() => useCommandIssues());
    act(() => { result.current.setStopAllInFlight((n) => n + 1); result.current.setStopAllInFlight((n) => n + 1); });
    expect(result.current.stopAllInFlight).toBe(2);
    act(() => result.current.setStopAllReport({} as never));
    act(() => result.current.dismissStopAllReport());
    expect(result.current.stopAllReport).toBeNull();
  });
});

describe('the safety limits poll', () => {
  it('reads nothing without a session and reads again every half minute with one', async () => {
    vi.useFakeTimers();
    answers([404, {}]);
    const { rerender, unmount } = renderHook(({ token }) => useSafetyLimitsSync(token), { initialProps: { token: null as string | null } });
    await vi.advanceTimersByTimeAsync(31_000);
    expect(calls).toHaveLength(0);
    rerender({ token: 'abc' });
    await vi.advanceTimersByTimeAsync(0);
    expect(calls.length).toBe(1);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(calls.length).toBe(2);
    unmount();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls.length).toBe(2);
  });
});

describe('the scene files', () => {
  const robot = { id: 1, name: 'R1', recordedPoints: [{ a: 1 }] } as unknown as RobotState;
  const deps = () => ({
    robots: [robot], worksPaths: undefined, activeControllerId: 'c1',
    sendRobotCommand: vi.fn(async () => undefined), updateRobot: vi.fn(), updateController: vi.fn(), reportCommandIssue: vi.fn(),
  });

  it('saves nothing for a robot without recorded points or that does not exist', () => {
    const d = deps();
    const create = vi.fn(() => ({ href: '', click: vi.fn(), download: '' }));
    const { result } = renderHook(() => useSceneFiles({ ...d, robots: [{ ...robot, recordedPoints: [] } as RobotState] }));
    vi.spyOn(document, 'createElement').mockImplementation(create as never);
    result.current.saveKinematics(1);
    result.current.saveKinematics(99);
    expect(create).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('reports an invalid scene file instead of changing the robots', async () => {
    const d = deps();
    const { result } = renderHook(() => useSceneFiles(d));
    const input = { files: [new File(['not json'], 'x.json')], value: 'x' } as unknown as HTMLInputElement;
    result.current.importScene({ target: input } as never);
    await vi.waitFor(() => expect(d.reportCommandIssue).toHaveBeenCalled());
    expect(d.reportCommandIssue.mock.calls[0][0]).toMatchObject({ code: 'import_invalid', command: 'scene' });
    expect(d.updateController).not.toHaveBeenCalled();
  });
});

describe('the command that loads a trajectory', () => {
  it('sends the points with the file they come from and shows them with a stopped playback', async () => {
    const { trajectorySender, idlePlayback } = await import('../src/lib/trajectoryCommand');
    const send = vi.fn(async () => ({ ok: true }) as never);
    const target = { id: 4, playbackState: { speed: 80, isPlaying: true, activeStep: 3 } } as unknown as RobotState;
    await trajectorySender(send, target, { selectedWorkFile: 'a.json' })([{ x: 1 }]);
    const [id, command, params, mutate] = send.mock.calls[0] as unknown as [number, string, Record<string, unknown>, (r: RobotState) => Partial<RobotState>];
    expect([id, command]).toEqual([4, 'trajectory']);
    expect(params).toEqual({ points: [{ x: 1 }], selectedWorkFile: 'a.json' });
    const shown = mutate(target) as { selectedWorkFile: string; recordedPoints: unknown[]; playbackState: Record<string, unknown> };
    expect(shown.selectedWorkFile).toBe('a.json');
    expect(shown.recordedPoints).toEqual([{ x: 1 }]);
    expect(shown.playbackState).toMatchObject({ speed: 80, isPlaying: false, activeStep: -1, isFinished: false });
    expect(idlePlayback(undefined)).toMatchObject({ isPaused: false, finished: false });
  });
});

describe('the reach gate', () => {
  it('sends at once when every point is reachable and keeps nothing pending', async () => {
    const { useReachGate } = await import('../src/hooks/useReachGate');
    const { result } = renderHook(() => useReachGate());
    const send = vi.fn(async () => undefined);
    await act(async () => { await result.current.sendUnlessUnreachable([0, 0, 1], () => undefined, send); });
    expect(send).toHaveBeenCalledTimes(1);
    expect(result.current.pendingReach).toBeNull();
  });

  it('holds the trajectory when a point cannot be reached and declines when cancelled', async () => {
    const { useReachGate } = await import('../src/hooks/useReachGate');
    const { result } = renderHook(() => useReachGate());
    const send = vi.fn(async () => undefined);
    const decline = vi.fn();
    await act(async () => { await result.current.sendUnlessUnreachable([null, 9999], decline, send); });
    expect(send).not.toHaveBeenCalled();
    expect(result.current.pendingReach).not.toBeNull();
    act(() => result.current.cancelPendingReach());
    expect(decline).toHaveBeenCalledTimes(1);
    expect(result.current.pendingReach).toBeNull();
  });
});
