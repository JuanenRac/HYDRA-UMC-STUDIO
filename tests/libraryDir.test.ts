// =============================================================================
// HYDRA-UMC STUDIO - tests/libraryDir.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The one folder of the 3D model library that STUDIO, the desktop app and the STL editor can share (HYDRA_UMC_LIBRARY_DIR): unset or wrong
// it changes nothing; set, the models are served from it (a request can never leave it) and the mesh package never installs over it.
// =============================================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIBRARY_DIR_ENV, meshRoot, resolveModelFile, sharedDir } from '../scripts/library_dir.mjs';
import { libraryDirPlugin, modelsMiddleware } from '../scripts/libraryDirPlugin.ts';

let tmp = '';
let shared = '';

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hydra-library-'));
  shared = path.join(tmp, 'common');
  fs.mkdirSync(path.join(shared, 'robots-6-dof', 'ar3'), { recursive: true });
  fs.writeFileSync(path.join(shared, 'robots-6-dof', 'ar3', 'base.STL'), 'solid x');
  fs.writeFileSync(path.join(tmp, 'secret.txt'), 'outside');
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('the folder', () => {
  it('is the folder of STUDIO when the variable is unset, blank or not a folder', () => {
    const own = path.join(tmp, 'public', 'models');
    expect(sharedDir({})).toBeNull();
    expect(meshRoot(own, {})).toBe(own);
    expect(meshRoot(own, { [LIBRARY_DIR_ENV]: '   ' })).toBe(own);
    expect(meshRoot(own, { [LIBRARY_DIR_ENV]: path.join(tmp, 'secret.txt') })).toBe(own);
    expect(meshRoot(own, { [LIBRARY_DIR_ENV]: path.join(tmp, 'nothing') })).toBe(own);
  });
  it('is the common folder when the variable names one', () => {
    expect(meshRoot(path.join(tmp, 'public', 'models'), { [LIBRARY_DIR_ENV]: shared })).toBe(path.resolve(shared));
  });
});

describe('the models of a request', () => {
  it('are found inside the folder', () => {
    expect(resolveModelFile(shared, 'robots-6-dof/ar3/base.STL')).toBe(path.join(path.resolve(shared), 'robots-6-dof', 'ar3', 'base.STL'));
    expect(resolveModelFile(shared, 'robots-6-dof/ar3/base.STL?v=2')).not.toBeNull();
  });
  it('never leave it, whatever the escapes', () => {
    for (const bad of ['../secret.txt', '..%2Fsecret.txt', 'robots-6-dof/../../secret.txt', '%2e%2e/secret.txt', '..\\secret.txt', 'robots-6-dof/ar3', 'missing.STL', '%00', '%zz']) {
      expect(resolveModelFile(shared, bad)).toBeNull();
    }
  });
});

describe('the middleware', () => {
  const run = (url: string, method = 'GET') => {
    const headers: Record<string, string> = {};
    let ended = false;
    const res: any = { setHeader: (k: string, v: string) => { headers[k] = v; }, end: () => { ended = true; } };
    const next = vi.fn();
    modelsMiddleware(shared)({ url, method } as any, res, next);
    return { next, headers, ended: () => ended };
  };
  it('lets a request outside /models or outside the folder go on', () => {
    expect(run('/api/robots').next).toHaveBeenCalled();
    expect(run('/models/../secret.txt').next).toHaveBeenCalled();
    expect(run('/models/missing.STL').next).toHaveBeenCalled();
    expect(run('/models/robots-6-dof/ar3/base.STL', 'POST').next).toHaveBeenCalled();
  });
  it('answers a model of the folder with its type and size', () => {
    const answer = run('/models/robots-6-dof/ar3/base.STL', 'HEAD');
    expect(answer.next).not.toHaveBeenCalled();
    expect(answer.headers['Content-Type']).toBe('model/stl');
    expect(answer.headers['Content-Length']).toBe(String('solid x'.length));
    expect(answer.ended()).toBe(true);
  });
});

describe('the plugin', () => {
  it('does nothing without the variable', () => {
    const plugin = libraryDirPlugin({}) as any;
    const use = vi.fn();
    plugin.configureServer({ middlewares: { use } });
    plugin.configurePreviewServer({ middlewares: { use } });
    plugin.closeBundle();
    expect(use).not.toHaveBeenCalled();
  });
  it('serves from the folder in the dev and preview servers when the variable names one', () => {
    const plugin = libraryDirPlugin({ [LIBRARY_DIR_ENV]: shared }) as any;
    const use = vi.fn();
    plugin.configureServer({ middlewares: { use } });
    plugin.configurePreviewServer({ middlewares: { use } });
    expect(use).toHaveBeenCalledTimes(2);
  });
});

describe('the mesh package', () => {
  it('installs nothing over the common folder and says so in the language', async () => {
    vi.stubEnv(LIBRARY_DIR_ENV, shared);
    vi.resetModules();
    const pack = await import('../scripts/mesh_pack.mjs');
    expect(pack.MESH_DIR).toBe(path.resolve(shared));
    const lines: string[] = [];
    const written = await pack.ensure({ source: 'download', log: (line: string) => lines.push(line), lang: 'pt' });
    expect(written).toBe(0);
    expect(lines).toEqual([pack.say('shared', 'pt', { path: pack.MESH_DIR })]);
    expect(fs.readdirSync(shared)).toEqual(['robots-6-dof']);
  });
  it('has the sentence in the eight languages', async () => {
    const pack = await import('../scripts/mesh_pack.mjs');
    for (const code of ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt']) expect(pack.MESSAGES[code].shared).toContain('{path}');
  });
});
