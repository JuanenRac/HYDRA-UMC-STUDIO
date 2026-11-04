// =============================================================================
// HYDRA-UMC STUDIO - tests/sceneFiles.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { downloadJson, kinematicsFileName, readSceneFile, readTrajectoryFile, type DownloadHost } from '../src/lib/sceneFiles';
import { createDefaultRobots } from '../src/store';

const point = { j1: 0, j2: -10, j3: 20, j4: 0, j5: 0, j6: 0 };

describe('kinematicsFileName', () => {
  it('replaces the spaces of the name', () => {
    expect(kinematicsFileName('Arm one', undefined)).toBe('kinematics_Arm_one.json');
  });
  it('leads with the Works folder, its slashes replaced', () => {
    expect(kinematicsFileName('Arm', 'lab/bench')).toBe('lab_bench_kinematics_Arm.json');
  });
});

describe('readTrajectoryFile', () => {
  it('reads a list of points', () => {
    const result = readTrajectoryFile(JSON.stringify([point]));
    expect(result.kind).toBe('points');
  });
  it('reads one pose with a numeric x', () => {
    expect(readTrajectoryFile('{"x": 1, "y": 2}')).toEqual({ kind: 'pose', pose: { x: 1, y: 2 } });
  });
  it('refuses text that is not JSON, an object without x and bad points', () => {
    expect(readTrajectoryFile('{')).toEqual({ kind: 'error', detail: 'not valid JSON' });
    expect(readTrajectoryFile('{"y": 1}')).toEqual({ kind: 'error', detail: 'not a trajectory' });
    expect(readTrajectoryFile('null')).toEqual({ kind: 'error', detail: 'not a trajectory' });
    expect(readTrajectoryFile(JSON.stringify([{ ...point, j4: 'ninety' }]))).toEqual({ kind: 'error', detail: 'point 1: j4 is not a number' });
  });
});

describe('readSceneFile', () => {
  it('reads the robots the interface itself exports', () => {
    const robots = createDefaultRobots();
    const result = readSceneFile(JSON.stringify(robots));
    expect(result.ok).toBe(true);
  });
  it('refuses text that is not JSON and what is not a scene', () => {
    expect(readSceneFile('nope')).toEqual({ ok: false, detail: 'not valid JSON' });
    expect(readSceneFile('{}').ok).toBe(false);
  });
});

describe('downloadJson', () => {
  it('attaches, clicks and detaches the link, then frees the address', () => {
    const calls: string[] = [];
    const link = { href: '', download: '', click: () => calls.push('click') };
    const host: DownloadHost = {
      createObjectURL: () => 'blob:x',
      revokeObjectURL: url => calls.push(`revoke ${url}`),
      createLink: () => link,
      attach: () => calls.push('attach'),
      detach: () => calls.push('detach'),
    };
    downloadJson('scene.json', [1], host);
    expect(link.href).toBe('blob:x');
    expect(link.download).toBe('scene.json');
    expect(calls).toEqual(['attach', 'click', 'detach', 'revoke blob:x']);
  });
});
