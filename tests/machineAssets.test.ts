// =============================================================================
// HYDRA-UMC-STUDIO - Independent machine mesh routing and parse checks
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { expect, it } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { MACHINE_ASSETS, machineAssetPath } from '../src/machineAssets';

it('routes all four machines to independent roots and the editable copies to STL', () => {
  expect(new Set(Object.values(MACHINE_ASSETS).map(m=>m.directory)).size).toBe(4);
  for (const type of Object.keys(MACHINE_ASSETS) as (keyof typeof MACHINE_ASSETS)[]) {
    const spec=MACHINE_ASSETS[type];
    expect(machineAssetPath(type,'parts/back-leg')).toBe('/models/'+spec.directory+'/parts/back-leg.'+spec.format);
    expect(spec.format).toBe(type==='lumenPnP'?'glb':'stl');
  }
});
it('ships a complete editable STL set for each derivative, without stale GLB copies', () => {
  const root=new URL('../public/models/',import.meta.url);
  const original=readdirSync(new URL('lumenpnp/',root),{recursive:true}).filter(f=>String(f).endsWith('.stl')).map(String);
  expect(original.length).toBe(167);
  for(const directory of ['juanenpnp','juanencnc','juanenlaser']){
    const base=new URL(directory+'/',root);
    expect(existsSync(new URL('ATTRIBUTION.txt',base))).toBe(true);
    expect(readdirSync(base,{recursive:true}).some(f=>String(f).endsWith('.glb'))).toBe(false);
    for(const relative of original){
      const bytes=readFileSync(new URL(relative.replaceAll('\\','/'),base));
      const geo=new STLLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
      const pos=geo.getAttribute('position');
      expect(pos.count).toBeGreaterThan(0);
      expect(Array.from(pos.array).every(Number.isFinite)).toBe(true);
      geo.dispose();
    }
  }
}, 30000);
