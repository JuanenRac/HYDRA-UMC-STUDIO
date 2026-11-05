// =============================================================================
// HYDRA-UMC STUDIO - tests/robotDeltaSettingsUpdate.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The pure parts the state provider relies on: reading and applying a targeted robot delta of the server, and the
// decision of who may change which setting.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { deltaTargetExists, parseRobotDelta, patchControllers } from '../src/lib/robotDelta';
import { planSettingsUpdate } from '../src/lib/settingsUpdate';
import { defaultControllers, type HydraController } from '../src/store';
import { defaultSystemSettings } from '../src/lib/defaultSettings';

const ctrl = (): HydraController => JSON.parse(JSON.stringify(defaultControllers[0]));

describe('reading a robot delta', () => {
  it('accepts a well formed message', () => {
    const d = parseRobotDelta({ controllerId: 'c', robotId: 2, patch: { x: 1 }, cameraId: 3, cameraPatch: { y: 2 } });
    expect(d).toEqual({ controllerId: 'c', robotId: 2, patch: { x: 1 }, cameraId: 3, cameraPatch: { y: 2 } });
  });

  it('refuses a malformed one', () => {
    expect(parseRobotDelta(undefined)).toBeNull();
    expect(parseRobotDelta({ controllerId: 1, robotId: 2, patch: {} })).toBeNull();
    expect(parseRobotDelta({ controllerId: 'c', robotId: '2', patch: {} })).toBeNull();
    expect(parseRobotDelta({ controllerId: 'c', robotId: 2 })).toBeNull();
    expect(parseRobotDelta({ controllerId: 'c', robotId: 2, patch: 5 })).toBeNull();
  });
});

describe('the target of a robot delta', () => {
  it('exists only when both the controller and the robot are known', () => {
    const c = ctrl();
    const robotId = c.robots[0].id;
    expect(deltaTargetExists([c], { controllerId: c.id, robotId })).toBe(true);
    expect(deltaTargetExists([c], { controllerId: c.id, robotId: 987654 })).toBe(false);
    expect(deltaTargetExists([c], { controllerId: 'other', robotId })).toBe(false);
    expect(deltaTargetExists([], { controllerId: c.id, robotId })).toBe(false);
  });
});

describe('applying a robot delta', () => {
  it('merges the patch into the targeted robot only', () => {
    const c = ctrl();
    const id = c.robots[0].id;
    const out = patchControllers([c], { controllerId: c.id, robotId: id, patch: { jogStep: 7 } });
    expect((out[0].robots[0] as unknown as { jogStep: number }).jogStep).toBe(7);
    expect(out[0].robots.slice(1)).toEqual(c.robots.slice(1));
    expect(out[0].cameras).toBe(c.cameras);
  });

  it('leaves the other controllers as the same objects', () => {
    const a = ctrl();
    const b = { ...ctrl(), id: 'b' };
    const out = patchControllers([a, b], { controllerId: 'b', robotId: b.robots[0].id, patch: { jogStep: 3 } });
    expect(out[0]).toBe(a);
    expect(out[1]).not.toBe(b);
  });

  it('patches the camera when a camera patch comes with its id', () => {
    const c = ctrl();
    if (c.cameras.length === 0) return;
    const cam = c.cameras[0];
    const out = patchControllers([c], { controllerId: c.id, robotId: c.robots[0].id, patch: {}, cameraId: cam.id, cameraPatch: { connected: false } });
    expect(out[0].cameras[0].connected).toBe(false);
  });

  it('ignores a camera id without a camera patch', () => {
    const c = ctrl();
    const out = patchControllers([c], { controllerId: c.id, robotId: c.robots[0].id, patch: {}, cameraId: 1 });
    expect(out[0].cameras).toBe(c.cameras);
  });
});

describe('who may change which setting', () => {
  it('an administrator changes any setting', () => {
    expect(planSettingsUpdate(true, { theme: 'light' } as never, defaultSystemSettings())).toEqual({ mode: 'global' });
  });

  it('another account keeps the local settings and has the global ones refused', () => {
    const plan = planSettingsUpdate(false, { theme: 'light', worksPaths: { 1: 'x' } } as never, { ...defaultSystemSettings(), theme: 'dark' } as never);
    expect(plan.mode).toBe('local');
    if (plan.mode !== 'local') return;
    expect(plan.refusedKeys).toEqual(['worksPaths']);
    expect(plan.local).toEqual({ theme: 'light' });
    expect(plan.changes).toBe(true);
  });

  it('a local value equal to the current one changes nothing', () => {
    const cur = { ...defaultSystemSettings(), theme: 'dark' } as never;
    const plan = planSettingsUpdate(false, { theme: 'dark' } as never, cur);
    expect(plan).toMatchObject({ mode: 'local', refusedKeys: [], changes: false });
  });

  it('an update with only global settings keeps nothing', () => {
    const plan = planSettingsUpdate(false, { worksPaths: {} } as never, defaultSystemSettings());
    expect(plan).toEqual({ mode: 'local', refusedKeys: ['worksPaths'], local: {}, changes: false });
  });
});
