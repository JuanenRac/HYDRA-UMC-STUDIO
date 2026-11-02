import { describe, expect, it } from 'vitest';
import { PREVIEW_STORAGE_KEY, analyzeTrajectory, previewEnabled, projectPath, savePreviewEnabled } from '../src/lib/trajectoryPreview';

const store = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return { data, getItem: (k: string) => (k in data ? data[k] : null), setItem: (k: string, v: string) => { data[k] = v; } };
};
const point = (j1: number, extra: Record<string, unknown> = {}) => ({ j1, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, x: j1, y: 0, z: 100, ...extra });

describe('the check of a trajectory before Play', () => {
  it('is off until the operator switches it on, and remembers the choice', () => {
    const s = store();
    expect(previewEnabled(s)).toBe(false);
    savePreviewEnabled(s, true);
    expect(s.data[PREVIEW_STORAGE_KEY]).toBe('1');
    expect(previewEnabled(s)).toBe(true);
    expect(previewEnabled(null)).toBe(false);
  });

  it('reports a clean trajectory with its length', () => {
    const report = analyzeTrajectory([point(0, { x: 0 }), point(10, { x: 30 }), point(20, { x: 30, y: 40 })], undefined);
    expect(report.clean).toBe(true);
    expect(report.points).toBe(3);
    expect(report.pathLengthMm).toBeCloseTo(70, 5);
    expect(report.maxStepDeg).toBe(10);
  });

  it('reports a joint outside the limits and a swing over the largest step', () => {
    const report = analyzeTrajectory([point(0), point(200), point(10)], undefined, { maxStepDeg: 90 });
    expect(report.clean).toBe(false);
    expect(report.issues.some((i) => i.kind === 'joint-limit' && i.point === 1 && i.joint === 'j1')).toBe(true);
    expect(report.issues.filter((i) => i.kind === 'joint-step').map((i) => i.point)).toEqual([1, 2]);
  });

  it('fits the drawing in its box on each plane', () => {
    const path = [{ x: 0, y: 0, z: 0 }, { x: 100, y: 50, z: 200 }];
    for (const plane of ['top', 'side', 'front'] as const) {
      for (const p of projectPath(path, plane, 220, 170, 12)) {
        expect(p.x).toBeGreaterThanOrEqual(12 - 1e-9);
        expect(p.x).toBeLessThanOrEqual(208 + 1e-9);
        expect(p.y).toBeGreaterThanOrEqual(12 - 1e-9);
        expect(p.y).toBeLessThanOrEqual(158 + 1e-9);
      }
    }
    expect(projectPath([], 'top')).toEqual([]);
  });
});
