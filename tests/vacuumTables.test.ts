// =============================================================================
// HYDRA-UMC-STUDIO - Vacuum table catalog, STL inventory and selection tests
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { VACUUM_TABLE_MODELS, vacuumTableModel, selectVacuumTable, vacuumTableSize, resizeVacuumTable } from '../src/vacuumTables';
import type { VacuumTableModule } from '../src/store';

describe('vacuum table catalog', () => {
  it('resizes independently, preserves controls, restores presets and ignores malformed sizes', () => {
    const source: VacuumTableModule = { enabled: true, modelId: '232x217x15', size: { width: 999, length: 999 }, pumpActive: true, valveActive: true, worldPos: { x: 4, y: 9 }, worldRot: 1, renderScale: 1 };
    expect(vacuumTableSize(source)).toEqual({ width: 232, length: 217 });
    const custom = resizeVacuumTable(resizeVacuumTable(source, 'width', 237), 'length', 150);
    expect(vacuumTableSize(custom)).toEqual({ width: 237, length: 150 });
    expect(custom.pumpActive && custom.valveActive).toBe(true);
    expect(custom.worldPos).toEqual(source.worldPos);
    expect(source.size.width).toBe(999);
    for (const bad of [NaN, Infinity, 0, -5, 5001, 12.5]) expect(resizeVacuumTable(custom, 'width', bad)).toBe(custom);
    expect(vacuumTableSize(selectVacuumTable(custom, '232x217x15'))).toEqual({ width: 232, length: 217 });
  });
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
