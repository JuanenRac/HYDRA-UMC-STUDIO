// =============================================================================
// HYDRA-UMC-STUDIO - Vacuum table catalog, STL inventory and selection tests
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { VACUUM_TABLE_MODELS, vacuumTableModel, selectVacuumTable } from '../src/vacuumTables';
import type { VacuumTableModule } from '../src/store';

describe('vacuum table catalog', () => {
  // Generous timeout + a single finiteness assertion (not one expect() per
  // float): the six real STL files total ~11 MB / hundreds of thousands of
  // triangles, and a per-vertex-component expect() call is millions of
  // assertion invocations - enough to blow past vitest's 5 s default on a
  // loaded CI runner even though the parse itself is fast.
  it('ships six valid binary STL files with fixed millimeter dimensions', () => {
    expect(new Set(VACUUM_TABLE_MODELS.map(m => m.id)).size).toBe(6);
    for (const model of VACUUM_TABLE_MODELS) {
      const data = readFileSync(new URL('../public/models/vacuum-tables/' + model.file, import.meta.url));
      const count = data.readUInt32LE(80);
      expect(count).toBeGreaterThan(0);
      expect(data.length).toBe(84 + count * 50);
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      let nonFinite = 0;
      for (let n = 0; n < count; n++) for (let v = 0; v < 3; v++) for (let a = 0; a < 3; a++) {
        const value = data.readFloatLE(84 + n * 50 + 12 + v * 12 + a * 4);
        if (!Number.isFinite(value)) nonFinite++;
        min[a] = Math.min(min[a], value); max[a] = Math.max(max[a], value);
      }
      expect(nonFinite).toBe(0);
      expect(max[0] - min[0]).toBeCloseTo(model.width, 2);
      expect(max[1] - min[1]).toBeCloseTo(model.length, 2);
      expect(max[2] - min[2]).toBeCloseTo(model.totalHeight, 2);
    }
  }, 30000);

  it('preserves controls and pose; rejects unknown IDs without mutating state', () => {
    const module: VacuumTableModule = { enabled: true, size: { width: 100, length: 100 },
      pumpActive: true, valveActive: true, worldPos: { x: 10, y: 20 }, worldRot: 1, renderScale: 1 };
    for (const model of VACUUM_TABLE_MODELS) {
      const result = selectVacuumTable(module, model.id);
      expect(result.modelId).toBe(model.id);
      expect(result.size).toEqual({ width: model.width, length: model.length });
      expect(result.pumpActive && result.valveActive).toBe(true);
      expect(result.worldPos).toEqual(module.worldPos);
      expect(result.worldRot).toBe(1);
    }
    expect(module.size.width).toBe(100);
    expect(selectVacuumTable(module, '../../other')).toBe(module);
    expect(vacuumTableModel(undefined).id).toBe('160x120x15');
    expect(vacuumTableModel('unknown').id).toBe('160x120x15');
  });

  it('provides model labels, compatibility note and error text in all seven locales', () => {
    for (const locale of ['en', 'es', 'fr', 'it', 'de', 'zh', 'ja']) {
      const data = JSON.parse(readFileSync(new URL('../src/locales/' + locale + '.json', import.meta.url), 'utf8'));
      for (const key of ['vacuum_model', 'vacuum_model_note', 'vacuum_model_error']) {
        expect(data.modules[key]).toEqual(expect.any(String));
        expect(data.modules[key].length).toBeGreaterThan(0);
      }
    }
  });
});
