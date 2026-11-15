// =============================================================================
// HYDRA-UMC STUDIO - tests/robotCommandTyped.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The robot routes (command, reservation, release, arming, one robot) through the typed client: the route and the body that leave, the If-Match header the
// client now carries, and the exact status and the error body of a refusal reaching the result of the command.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { armJog, fetchRobot } from '../src/lib/accessApi';
import { robotRevisions } from '../src/lib/revisions';
import { postRobotCommand } from '../src/lib/robotCommandPost';

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];

function serve(status: number, body: unknown): void {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return { ok: status < 300, status, json: async () => body } as unknown as Response;
  }));
}

const deps = { attemptTokenRefresh: async () => false, commandSequence: { next: () => 7 } };
const header = (call: Call, name: string) => new Headers(call.init.headers).get(name);

beforeEach(() => { calls = []; robotRevisions.setMode('standard'); robotRevisions.forget(); });
afterEach(() => { vi.unstubAllGlobals(); robotRevisions.forget(); });

describe('the robot command through the typed client', () => {
  it('posts to the route of the robot with the body and the revision it last saw as If-Match (a discrete command; the jog and the speed go without)', async () => {
    robotRevisions.learn(3, 'r1');
    serve(200, { success: true, revision: 'r2' });
    const result = await postRobotCommand(deps, 3, 'home', { axis: 'x' });
    expect(result).toMatchObject({ ok: true, status: 200, revision: 'r2' });
    expect(calls[0].url).toBe('/api/robot/3/command');
    expect(calls[0].init.method).toBe('POST');
    expect(header(calls[0], 'If-Match')).toBe('"r1"');
    expect(header(calls[0], 'Content-Type')).toBe('application/json');
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({ command: 'home', params: { axis: 'x' } });
    expect(robotRevisions.known(3)).toBe('r2');
  });

  it('hands the exact status and the error body of a refusal to the result', async () => {
    serve(412, { error: 'the robot changed', revision: 'r9' });
    const stale = await postRobotCommand(deps, 3, 'jog', {});
    expect(stale).toMatchObject({ ok: false, status: 412, code: 'revision_changed', detail: 'the robot changed' });
    serve(403, { error: 'no', code: 'server-read-only' });
    expect(await postRobotCommand(deps, 3, 'jog', {})).toMatchObject({ ok: false, status: 403, code: 'server_read_only' });
    serve(423, {});
    expect(await postRobotCommand(deps, 3, 'jog', {})).toMatchObject({ ok: false, status: 423, code: 'robot_disabled' });
  });

  it('reports a lost network as a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await postRobotCommand(deps, 3, 'jog', {})).toMatchObject({ ok: false, status: 0, code: 'network' });
  });

  it('refreshes the session once on a 401 and sends the command again', async () => {
    const statuses = [401, 200];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      const status = statuses.shift() ?? 200;
      return { ok: status < 300, status, json: async () => ({ success: true }) } as unknown as Response;
    }));
    const result = await postRobotCommand({ ...deps, attemptTokenRefresh: async () => true }, 3, 'jog', {});
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(2);
  });
});

describe('arming the jog and reading one robot through the typed client', () => {
  it('arms with its own route and body, and reads when the arming ends', async () => {
    serve(200, { success: true, armed: true, expiresAt: 1234 });
    const armed = await armJog(4, true, 5000);
    expect(armed).toMatchObject({ expiresAt: 1234 });
    expect(calls[0].url).toBe('/api/robot/4/jog-arm');
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({ armed: true, ttlMs: 5000 });
  });

  it('reads one robot with its revision, and gives null for a refusal', async () => {
    serve(200, { robot: { id: 4 }, revision: 'rv', cellId: 'c1' });
    expect(await fetchRobot(4)).toEqual({ robot: { id: 4 }, revision: 'rv', cellId: 'c1' });
    expect(calls[0].url).toBe('/api/robot/4');
    serve(404, { error: 'unknown' });
    expect(await fetchRobot(4)).toBeNull();
  });
});
