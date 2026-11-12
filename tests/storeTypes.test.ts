// =============================================================================
// HYDRA-UMC STUDIO - tests/storeTypes.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The shapes of the state live in src/types/hydra.ts and store.ts re-exports every one of them, so no import in the app changes: the types file holds
// only types (nothing runs there) and each of its names is still reachable through the store.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (relative: string) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
const types = read('../src/types/hydra.ts');
const store = read('../src/store.ts');
const declared = [...types.matchAll(/^export (?:type|interface) (\w+)/gm)].map((m) => m[1]);

describe('src/types/hydra.ts', () => {
  it('declares the shapes of the robots, cameras, controllers, settings and context', () => {
    expect(declared).toEqual(expect.arrayContaining(['RobotState', 'CameraState', 'HydraController', 'SystemSettings', 'HydraStoreContextType', 'KinematicBrainStage']));
    expect(declared.length).toBeGreaterThanOrEqual(19);
  });

  it('holds only types: no value is exported and nothing runs', () => {
    expect(types).not.toMatch(/^export (?:const|function|class|enum|let|var|default)\b/m);
    expect(types).not.toMatch(/^import (?!type\b)/m);
  });

  it('has every name re-exported by the store, which keeps no copy of its own', () => {
    for (const name of declared) {
      expect(store, name).toMatch(new RegExp(`export type \\{[^}]*\\b${name}\\b[^}]*\\} from './types/hydra'`));
      expect(store, name).not.toMatch(new RegExp(`^export (?:type|interface) ${name}\\b`, 'm'));
    }
  });
});

describe('src/store.ts', () => {
  it('is left with the values: the stream labels, the default port, the context and its hook', () => {
    expect(store).toMatch(/export const ipStreamLabels\b/);
    expect(store).toMatch(/export const RTSP_DEFAULT_PORT\b/);
    expect(store).toMatch(/export const HydraContext\b/);
    expect(store).toMatch(/export const useHydraStore\b/);
    expect(store.split('\n').length).toBeLessThan(120);
  });
});
