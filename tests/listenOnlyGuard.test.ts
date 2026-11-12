// =============================================================================
// HYDRA-UMC STUDIO - tests/listenOnlyGuard.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Listen only at the door of fetch: every write is refused with a 423 and never reaches the server, except STOP, the sign-in and the
// renewal and end of the session; reads go through, and so does everything when it is off.
// =============================================================================
import { describe, expect, it, vi } from 'vitest';
import { listenOnlyAllows, withListenOnly } from '../src/lib/listenOnlyGuard';

const body = (command: string) => JSON.stringify({ command });

describe('listenOnlyAllows', () => {
  it('lets every read through', () => {
    for (const method of ['GET', 'get', 'HEAD', 'OPTIONS']) expect(listenOnlyAllows(method, '/api/settings')).toBe(true);
  });

  it('lets STOP, the safe-mode disable and the session through', () => {
    expect(listenOnlyAllows('POST', '/api/stop-all')).toBe(true);
    for (const command of ['stop', 'estop', 'disable']) expect(listenOnlyAllows('POST', '/api/robot/3/command', body(command))).toBe(true);
    for (const path of ['/api/login', '/api/refresh', '/api/logout']) expect(listenOnlyAllows('POST', path, '{}')).toBe(true);
  });

  it('refuses every other robot command, and a command with no readable body', () => {
    for (const command of ['jog', 'play', 'pause', 'reset', 'enable', 'tool', 'valve', 'pump', 'speed', 'vision']) {
      expect(listenOnlyAllows('POST', '/api/robot/3/command', body(command)), command).toBe(false);
    }
    expect(listenOnlyAllows('POST', '/api/robot/3/command', 'not json')).toBe(false);
    expect(listenOnlyAllows('POST', '/api/robot/3/command')).toBe(false);
  });

  it('refuses the writes of the administration: services, cameras, settings, users, files, shutdown', () => {
    const writes: [string, string][] = [
      ['POST', '/api/settings'], ['PUT', '/api/settings'], ['POST', '/api/system/reboot'], ['POST', '/api/system/shutdown'],
      ['POST', '/api/camera/1/recording/start'], ['POST', '/api/ecosystem/services/hydra-server/restart'], ['DELETE', '/api/users/bob'],
      ['PATCH', '/api/users/bob'], ['POST', '/api/admin/safety-limits'], ['POST', '/api/totp/disable'], ['PUT', '/WORKS/a.json'],
    ];
    for (const [method, path] of writes) expect(listenOnlyAllows(method, path, '{}'), `${method} ${path}`).toBe(false);
  });
});

describe('withListenOnly', () => {
  const ok = () => Promise.resolve(new Response('{}', { status: 200 }));

  it('is the plain fetch while Listen only is off', async () => {
    const base = vi.fn(ok);
    const guarded = withListenOnly(base as unknown as typeof fetch, () => false);
    await guarded('/api/settings', { method: 'POST', body: '{}' });
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('answers a refused write with 423 and does not call the server', async () => {
    const base = vi.fn(ok);
    const guarded = withListenOnly(base as unknown as typeof fetch, () => true);
    const res = await guarded('http://10.0.0.5:3000/api/system/reboot', { method: 'POST' });
    expect(res.status).toBe(423);
    expect(((await res.json()) as { code: string }).code).toBe('listen-only');
    expect(base).not.toHaveBeenCalled();
  });

  it('sends a read and a STOP on to the server', async () => {
    const base = vi.fn(ok);
    const guarded = withListenOnly(base as unknown as typeof fetch, () => true);
    await guarded('/api/settings');
    await guarded('/api/stop-all', { method: 'POST' });
    await guarded('/api/robot/1/command', { method: 'POST', body: body('stop') });
    expect(base).toHaveBeenCalledTimes(3);
  });

  it('reads the switch at every request', async () => {
    const base = vi.fn(ok);
    let on = false;
    const guarded = withListenOnly(base as unknown as typeof fetch, () => on);
    await guarded('/api/settings', { method: 'POST', body: '{}' });
    on = true;
    expect((await guarded('/api/settings', { method: 'POST', body: '{}' })).status).toBe(423);
    expect(base).toHaveBeenCalledTimes(1);
  });
});
