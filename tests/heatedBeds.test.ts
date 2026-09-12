// =============================================================================
// HYDRA-UMC-STUDIO - Heated bed geometry and safe configuration regressions
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { HEATED_BED_MODELS, heatedBedModel, heatedBedSize, selectHeatedBed, resizeHeatedBed } from '../src/heatedBeds';
import type { HeatedBedModule } from '../src/store';

describe('heated bed STL catalog', () => {
  it('contains the four requested footprints, all exactly 5 mm high', () => {
    expect(HEATED_BED_MODELS.map(m => m.id)).toEqual(['100x100x5', '200x100x5', '200x200x5', '255x255x5']);
    for (const m of HEATED_BED_MODELS) {
      const data = readFileSync(new URL('../public/models/heated-beds/' + m.file, import.meta.url));
      const count = data.readUInt32LE(80);
      expect(count).toBeGreaterThan(100);
      expect(data.length).toBe(84 + count * 50);
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let n = 0; n < count; n++) for (let v = 0; v < 3; v++) for (let a = 0; a < 3; a++) {
        const value = data.readFloatLE(84 + n * 50 + 12 + v * 12 + a * 4);
        expect(Number.isFinite(value)).toBe(true);
        min[a] = Math.min(min[a], value); max[a] = Math.max(max[a], value);
      }
      expect(min).toEqual([0, 0, 0]);
      expect(max).toEqual([m.width, m.length, 5]);
    }
  });
  it('preserves heater state and old dimensions, changes footprint only', () => {
    const source: HeatedBedModule = { enabled: true, targetTemp: 80, currentTemp1: 75, currentTemp2: 74,
      ssrActive: true, size: { width: 500, length: 500 }, worldPos: { x: 12, y: 34 }, worldRot: 1, renderScale: 1 };
    expect(heatedBedSize(source)).toEqual({ width: 500, length: 500 });
    for (const m of HEATED_BED_MODELS) {
      const selected = selectHeatedBed(source, m.id);
      expect(selected.size).toEqual({ width: m.width, length: m.length });
      expect(selected.ssrActive).toBe(true);
      expect(selected.targetTemp).toBe(80);
      expect(selected.worldPos).toEqual(source.worldPos);
      const custom = resizeHeatedBed(selected, 'width', m.width + 5);
      expect(custom.size.width).toBe(m.width + 5);
      expect(custom.size.length).toBe(m.length);
    }
    for (const bad of [NaN, Infinity, -5, 0, 24, 5001, 25.5]) expect(resizeHeatedBed(source, 'width', bad)).toBe(source);
    expect(selectHeatedBed(source, '../../outside')).toBe(source);
    expect(heatedBedModel('unknown').id).toBe('200x200x5');
    expect(source.size.width).toBe(500);
  });
  it('has model, help and error messages in every UI language', () => {
    for (const locale of ['en','es','fr','it','de','zh','ja']) {
      const data = JSON.parse(readFileSync(new URL('../src/locales/' + locale + '.json', import.meta.url), 'utf8'));
      for (const key of ['heated_model','heated_model_note','heated_model_error']) expect(data.modules[key]?.length).toBeGreaterThan(0);
    }
  });
});
