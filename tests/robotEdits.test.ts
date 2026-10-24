import { describe, expect, it } from 'vitest';
import { createEditQueue, planRobotEdits } from '../src/lib/robotEdits';
import { settingsSaveAllowed } from '../src/lib/settingsSave';
import { blockedBySim, INITIAL_MODE_STATE, withMode } from '../src/lib/liveSim';

const robot: any = {
  id: 1, model: 'Parol6 (6-DOF)', role: 'Idle', recordedPoints: [], combinedWith: [],
  playbackState: { isPlaying: false, activeStep: 0, speed: 100, isLooping: false },
  hasXYTable: false, xyTable: { pos: { x: 1, y: 2 }, tableSize: { width: 300, length: 200 } },
};

describe('which commands say what a panel changed', () => {
  it('maps points, model, role and the combination', () => {
    const plan = planRobotEdits(robot, { recordedPoints: [{ j1: 1 } as any], model: 'UR5e (6-DOF)' as any, role: 'CNC', combinedWith: [2, 3] });
    expect(plan.rest).toEqual([]);
    expect(plan.commands.map((c) => c.command)).toEqual(['points', 'model', 'role', 'combine']);
    expect(plan.commands[3].params).toEqual({ with: [2, 3] });
  });

  it('turns a change of the repeat flag alone into loop, and anything else in the playback into the tree', () => {
    expect(planRobotEdits(robot, { playbackState: { ...robot.playbackState, isLooping: true } }).commands).toEqual([{ command: 'loop', params: { value: true } }]);
    const mixed = planRobotEdits(robot, { playbackState: { ...robot.playbackState, isLooping: true, speed: 50 } });
    expect(mixed.commands).toEqual([]);
    expect(mixed.rest).toEqual(['playbackState']);
    expect(planRobotEdits(robot, { playbackState: { ...robot.playbackState } }).commands).toEqual([]);
  });

  it('sends the layout of the XY table in one command and leaves its position to the table command', () => {
    const layout = planRobotEdits(robot, { hasXYTable: true, xyTable: { ...robot.xyTable, worldRot: 90, tableSize: { width: 400, length: 200 } } });
    expect(layout.rest).toEqual([]);
    expect(layout.commands).toEqual([{ command: 'xyTableConfig', params: { enabled: true, worldRot: 90, tableSize: { width: 400, length: 200 } } }]);
    const moved = planRobotEdits(robot, { xyTable: { ...robot.xyTable, pos: { x: 9, y: 2 } } });
    expect(moved.commands).toEqual([]);
    expect(moved.rest).toEqual(['xyTable']);
  });

  it('plans joints only when asked, and leaves unknown fields to the tree', () => {
    const joints = { j1: 1, j2: 2, j3: 3, j4: 4, j5: 5, j6: 6 };
    expect(planRobotEdits(robot, { joints }).rest).toEqual(['joints']);
    expect(planRobotEdits(robot, { joints }, { joints: true }).commands).toEqual([{ command: 'joints', params: { joints } }]);
    const other = planRobotEdits(robot, { name: 'x' } as any);
    expect(other.commands).toEqual([]);
    expect(other.rest).toEqual(['name']);
  });

  it('keeps the joints of a robot in Sim local', () => {
    expect(blockedBySim(withMode(INITIAL_MODE_STATE, 1, 'sim'), [1], 'joints')).toBe(true);
  });
});

describe('the queue of edits', () => {
  it('keeps one in flight per robot and command and only the newest of the ones that wait', async () => {
    const sent: unknown[] = [];
    let release: Array<() => void> = [];
    const queue = createEditQueue<string>((_id, edit) => new Promise((resolve) => { sent.push(edit.params); release.push(() => resolve('ok')); }));
    const a = queue.enqueue(1, { command: 'joints', params: { n: 1 } });
    const b = queue.enqueue(1, { command: 'joints', params: { n: 2 } });
    const c = queue.enqueue(1, { command: 'joints', params: { n: 3 } });
    const other = queue.enqueue(2, { command: 'joints', params: { n: 9 } });
    expect(sent).toEqual([{ n: 1 }, { n: 9 }]);
    expect(queue.inFlight()).toBe(2);
    release.shift()!(); release.shift()!();
    expect(await a).toBe('ok');
    expect(await b).toBeNull();
    await other;
    await Promise.resolve();
    expect(sent).toEqual([{ n: 1 }, { n: 9 }, { n: 3 }]);
    release.shift()!();
    expect(await c).toBe('ok');
    expect(queue.inFlight()).toBe(0);
  });

  it('survives a send that throws', async () => {
    const queue = createEditQueue<string>(async () => { throw new Error('boom'); });
    expect(await queue.enqueue(1, { command: 'points', params: {} })).toBeNull();
    expect(queue.inFlight()).toBe(0);
  });
});

describe('who saves the tree', () => {
  it('never a viewer', () => {
    expect(settingsSaveAllowed('viewer')).toBe(false);
  });
});

import { flashSigningOptions, isOlderVersion, normalizeSignature, parseVersion } from '../src/lib/canOta';

describe('what a signed flash needs', () => {
  const sig = 'Ab'.repeat(64);
  it('reads versions and compares them like the bootloader', () => {
    expect(parseVersion('v1.2.3-rc')).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseVersion('0.9')).toEqual({ major: 0, minor: 9, patch: 0 });
    expect(parseVersion('x')).toBeNull();
    expect(isOlderVersion({ major: 0, minor: 9, patch: 9 }, { major: 1, minor: 0, patch: 0 })).toBe(true);
    expect(isOlderVersion({ major: 1, minor: 0, patch: 1 }, { major: 1, minor: 0, patch: 1 })).toBe(false);
  });
  it('accepts only 128 hexadecimal digits as a signature', () => {
    expect(normalizeSignature(`${sig}\n`)).toBe(sig.toLowerCase());
    expect(normalizeSignature('abc')).toBeNull();
    expect(normalizeSignature(undefined)).toBeNull();
  });
  it('asks for the installed version only when the image is older', () => {
    expect(flashSigningOptions('0.2.5', '0.2.9', sig)).toEqual({ versionPatch: 5, signature: sig.toLowerCase(), downgradeFrom: '0.2.9' });
    expect(flashSigningOptions('0.3.0', '0.2.9', null)).toEqual({ versionPatch: 0, signature: null, downgradeFrom: null });
    expect(flashSigningOptions('0.3.0', undefined, sig).downgradeFrom).toBeNull();
  });
});
