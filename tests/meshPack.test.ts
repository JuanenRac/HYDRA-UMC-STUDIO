// =============================================================================
// HYDRA-UMC STUDIO - tests/meshPack.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The mesh package: the pinned manifest tells the truth about the meshes of the
// tree; the default source never touches the network; a package is installed
// only when its SHA-256 and the SHA-256 of every file match; a tampered,
// oversized or path-escaping package installs nothing; only https (or loopback
// http) addresses are accepted. The download runs against a local server on
// 127.0.0.1 serving a small package built here in the same format.
// =============================================================================
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  MESH_DIR,
  MESSAGES,
  MeshPackError,
  defaultCacheDir,
  ensure,
  languageCode,
  loadManifest,
  loadSettings,
  packageMatches,
  say,
  scan,
  type MeshEntry,
  type MeshSettings,
} from '../scripts/mesh_pack.mjs';

const sha = (data: Buffer) => createHash('sha256').update(data).digest('hex');

function tarEntry(name: string, data: Buffer): Buffer {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, 'utf8');
  header.write('0000644\0', 100, 'ascii');
  header.write('0000000\0', 108, 'ascii');
  header.write('0000000\0', 116, 'ascii');
  header.write(data.length.toString(8).padStart(11, '0') + '\0', 124, 'ascii');
  header.write('00000000000\0', 136, 'ascii');
  header.write('        ', 148, 'ascii');
  header.write('0', 156, 'ascii');
  header.write('ustar\0' + '00', 257, 'ascii');
  let sum = 0;
  for (const byte of header) sum += byte;
  header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 'ascii');
  const padding = Buffer.alloc((512 - (data.length % 512)) % 512);
  return Buffer.concat([header, data, padding]);
}

function makePackage(blobs: Record<string, Buffer>, extra: Array<[string, Buffer]> = []): Buffer {
  const parts = Object.keys(blobs).sort().map((digest) => tarEntry(`blobs/${digest}`, blobs[digest]));
  for (const [name, data] of extra) parts.push(tarEntry(name, data));
  parts.push(Buffer.alloc(1024));
  return zlib.gzipSync(Buffer.concat(parts));
}

function serve(payload: Buffer) {
  const state = { hits: 0 };
  const server = http.createServer((_req, res) => {
    state.hits += 1;
    res.writeHead(200, { 'Content-Length': payload.length });
    res.end(payload);
  });
  return new Promise<{ url: string; state: { hits: number }; close: () => Promise<void> }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}/pack.tgz`,
        state,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}

const a = Buffer.from('solid a\n'.repeat(50));
const b = Buffer.from('glTF-b'.repeat(80));
const entries: MeshEntry[] = [
  { path: 'robots/x/a.stl', sha256: sha(a), size: a.length },
  { path: 'robots/y/a.stl', sha256: sha(a), size: a.length },
  { path: 'machine/b.glb', sha256: sha(b), size: b.length },
];
const silent = () => {};

let tmp = '';
let manifestPath = '';
const pkg = makePackage({ [sha(a)]: a, [sha(b)]: b });

function writeManifest(payload: Buffer, files: MeshEntry[] = entries): string {
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ schema: 1, pack: { file: 'p.tgz', url: '', sha256: sha(payload), size: payload.length }, files }),
  );
  return manifestPath;
}
// every call keeps its package cache inside the temporary folder (never in the home folder of whoever runs the tests)
let cacheCounter = 0;
const settings = (source: string, url: string, cache?: string, pkgPath = ''): MeshSettings => ({
  source,
  url,
  timeout: 10,
  cache: cache ?? path.join(tmp, `cache-${cacheCounter++}`),
  package: pkgPath,
});

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'meshpack-test-'));
  manifestPath = path.join(tmp, 'meshes.pack.json');
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('the pinned manifest', () => {
  it('tells the truth about the meshes of the tree', () => {
    const manifest = loadManifest();
    expect(manifest.files.length).toBeGreaterThan(100);
    const paths = manifest.files.map((f) => f.path);
    expect(paths).toEqual([...new Set(paths)].sort());
    // a file that is present must be the pinned one; the missing ones are brought by `ensure` (the test setup calls it)
    const present = scan(manifest, undefined, true).filter((e) => fs.existsSync(path.join(MESH_DIR, ...e.path.split('/'))));
    expect(present).toEqual([]);
    expect((manifest.pack.url ?? '').startsWith('https://')).toBe(true);
  }, 120_000);

  it('defaults to the auto source (the tree does not carry the meshes)', () => {
    expect(loadSettings(undefined, {}).source).toBe('auto');
  });
});

describe('messages and settings', () => {
  it('has eight languages with the same keys and placeholders', () => {
    expect(Object.keys(MESSAGES).sort()).toEqual(['de', 'en', 'es', 'fr', 'it', 'ja', 'pt', 'zh']);
    const holders = (text: string) => (text.match(/\{[a-z_]+\}/g) ?? []).sort();
    for (const table of Object.values(MESSAGES)) {
      expect(Object.keys(table).sort()).toEqual(Object.keys(MESSAGES.en).sort());
      for (const key of Object.keys(table)) expect(holders(table[key])).toEqual(holders(MESSAGES.en[key]));
    }
    expect(MESSAGES.pt.local).toContain('transfere');
    expect(say('installed', 'ja', { count: 3 })).toContain('3');
  });

  it('picks the language from the environment', () => {
    expect(languageCode({ LANG: 'pt_PT.UTF-8' })).toBe('pt');
    expect(languageCode({ LANG: 'xx' })).toBe('en');
  });

  it('reads the file, lets the environment override it and survives a damaged file', () => {
    const cfg = path.join(tmp, 'cfg.json');
    fs.writeFileSync(cfg, '{"source":"auto","url":"https://example.invalid/p.tgz"}');
    expect(loadSettings(cfg, {})).toMatchObject({ source: 'auto', url: 'https://example.invalid/p.tgz' });
    expect(loadSettings(cfg, { HYDRA_UMC_MESH_SOURCE: 'download', HYDRA_UMC_MESH_URL: 'https://e.invalid/x' })).toMatchObject({
      source: 'download',
      url: 'https://e.invalid/x',
    });
    fs.writeFileSync(cfg, 'not json');
    expect(loadSettings(cfg, {}).source).toBe('auto');
  });
});

describe('ensure against a local server', () => {
  it('local never touches the network or the disk; auto fetches only what is missing; download repairs', async () => {
    const man = writeManifest(pkg);
    const dir = path.join(tmp, 'meshes');
    const cacheMain = path.join(tmp, 'cache-main');
    const server = await serve(pkg);
    try {
      const logs: string[] = [];
      expect(await ensure({ settings: settings('local', server.url, cacheMain), manifestPath: man, meshDir: dir, log: (l) => logs.push(l), lang: 'en' })).toBe(0);
      expect(server.state.hits).toBe(0);
      expect(fs.existsSync(dir)).toBe(false);

      expect(await ensure({ settings: settings('auto', server.url, cacheMain), manifestPath: man, meshDir: dir, log: (l) => logs.push(l), lang: 'en' })).toBe(3);
      expect(fs.readFileSync(path.join(dir, 'robots/y/a.stl')).equals(a)).toBe(true);
      expect(fs.readFileSync(path.join(dir, 'machine/b.glb')).equals(b)).toBe(true);
      expect(server.state.hits).toBe(1);
      expect(logs.some((l) => l.includes('Installed'))).toBe(true);

      expect(await ensure({ settings: settings('auto', server.url, cacheMain), manifestPath: man, meshDir: dir, log: silent })).toBe(0);
      expect(server.state.hits).toBe(1);

      fs.writeFileSync(path.join(dir, 'machine/b.glb'), Buffer.alloc(b.length, 120));
      expect(await ensure({ settings: settings('auto', server.url, cacheMain), manifestPath: man, meshDir: dir, log: silent })).toBe(0);
      expect(await ensure({ settings: settings('download', server.url, cacheMain), manifestPath: man, meshDir: dir, log: silent })).toBe(1);
      expect(fs.readFileSync(path.join(dir, 'machine/b.glb')).equals(b)).toBe(true);
      expect(server.state.hits).toBe(1); // the cached package serves the repair

      fs.unlinkSync(path.join(dir, 'robots/x/a.stl'));
      expect(await ensure({ settings: settings('auto', server.url, cacheMain), manifestPath: man, meshDir: dir, log: silent })).toBe(1);
      const leftovers = fs.readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith('.part'));
      expect(leftovers).toEqual([]);

      // the package stays in the cache and is reused with no network
      expect(fs.existsSync(path.join(cacheMain, 'p.tgz'))).toBe(true);
      expect(fs.readdirSync(cacheMain).filter((f) => f.endsWith('.part'))).toEqual([]);
      fs.rmSync(dir, { recursive: true });
      logs.length = 0;
      expect(await ensure({ settings: settings('auto', server.url, cacheMain), manifestPath: man, meshDir: dir, log: (l) => logs.push(l), lang: 'en' })).toBe(3);
      expect(server.state.hits).toBe(1);
      expect(logs.some((l) => l.includes('already stored'))).toBe(true);

      // a damaged cached package is thrown away and fetched again
      fs.writeFileSync(path.join(cacheMain, 'p.tgz'), 'junk');
      fs.rmSync(dir, { recursive: true });
      expect(await ensure({ settings: settings('auto', server.url, cacheMain), manifestPath: man, meshDir: dir, log: silent })).toBe(3);
      expect(server.state.hits).toBe(2);
      expect(packageMatches(path.join(cacheMain, 'p.tgz'), JSON.parse(fs.readFileSync(man, 'utf8')).pack)).toBe(true);
    } finally {
      await server.close();
    }
  });
});

describe('working offline', () => {
  const dead = 'http://127.0.0.1:9/none.tgz';

  it('a package given by path installs with no network and no cache', async () => {
    const man = writeManifest(pkg);
    const given = path.join(tmp, 'given.tgz');
    fs.writeFileSync(given, pkg);
    const cache = path.join(tmp, 'nocache');
    const dir = path.join(tmp, 'offline-meshes');
    expect(await ensure({ settings: settings('auto', dead, cache, given), manifestPath: man, meshDir: dir, log: silent })).toBe(3);
    expect(fs.existsSync(cache)).toBe(false);
  });

  it('a wrong or missing package file is refused and installs nothing', async () => {
    const man = writeManifest(pkg);
    const wrong = path.join(tmp, 'wrong.tgz');
    fs.writeFileSync(wrong, Buffer.concat([pkg, Buffer.from('0')]));
    for (const file of [wrong, path.join(tmp, 'missing.tgz')]) {
      const dir = path.join(tmp, `off-${path.basename(file)}`);
      await expect(ensure({ settings: settings('auto', dead, undefined, file), manifestPath: man, meshDir: dir, log: silent })).rejects.toMatchObject({ key: 'package_file_bad' });
      expect(fs.existsSync(dir)).toBe(false);
    }
  });

  it('no network and no cache fails with the way out, leaving nothing half written', async () => {
    const man = writeManifest(pkg);
    const cache = path.join(tmp, 'empty-cache');
    const error = await ensure({ settings: settings('auto', dead, cache), manifestPath: man, meshDir: path.join(tmp, 'off4'), log: silent }).catch((e) => e);
    expect(error).toBeInstanceOf(MeshPackError);
    expect(error.key).toBe('failed');
    expect(Object.keys(error.fields)).toEqual(expect.arrayContaining(['file', 'url', 'cache']));
    expect(say('hint_network', 'en', error.fields)).toContain('HYDRA_UMC_MESH_PACKAGE');
    expect(fs.readdirSync(cache).filter((f) => f.endsWith('.part'))).toEqual([]);
  });

  it('the cache folder and the package path come from the environment', () => {
    const s = loadSettings(path.join(tmp, 'none.json'), { HYDRA_UMC_MESH_CACHE: '/c', HYDRA_UMC_MESH_PACKAGE: '/p.tgz' });
    expect(s).toMatchObject({ cache: '/c', package: '/p.tgz' });
    expect(defaultCacheDir().startsWith(os.homedir())).toBe(true);
  });
});

describe('refusals install nothing', () => {
  async function refused(payload: Buffer, pinned: Buffer = payload): Promise<string | null> {
    const dir = path.join(tmp, `fresh-${sha(payload).slice(0, 8)}-${sha(pinned).slice(0, 8)}`);
    const server = await serve(payload);
    try {
      const man = writeManifest(pinned);
      try {
        await ensure({ settings: settings('auto', server.url), manifestPath: man, meshDir: dir, log: silent });
      } catch (error) {
        if (error instanceof MeshPackError && !fs.existsSync(dir)) return error.key;
        throw error;
      }
      return null;
    } finally {
      await server.close();
    }
  }

  it('a package with another hash', async () => {
    expect(await refused(makePackage({ [sha(a)]: a }), pkg)).toBe('package_bad');
  });

  it('a blob that does not match its name', async () => {
    expect(await refused(makePackage({ [sha(a)]: Buffer.concat([a, Buffer.from('!')]), [sha(b)]: b }))).toBe('package_bad');
  });

  it('an entry outside blobs/', async () => {
    expect(await refused(makePackage({ [sha(a)]: a, [sha(b)]: b }, [['../evil', Buffer.from('x')]]))).toBe('package_bad');
  });

  it('a package that lacks a wanted blob', async () => {
    expect(await refused(makePackage({ [sha(a)]: a }))).toBe('package_bad');
  });

  it('an oversized answer', async () => {
    const dir = path.join(tmp, 'big');
    const server = await serve(Buffer.concat([pkg, Buffer.from('0000000000')]));
    try {
      const man = writeManifest(pkg);
      await expect(ensure({ settings: settings('auto', server.url), manifestPath: man, meshDir: dir, log: silent })).rejects.toMatchObject({ key: 'package_bad' });
      expect(fs.existsSync(dir)).toBe(false);
    } finally {
      await server.close();
    }
  });

  it('a manifest path with ..', () => {
    writeManifest(pkg, [{ path: '../outside.stl', sha256: sha(a), size: a.length }]);
    expect(() => loadManifest(manifestPath)).toThrow(MeshPackError);
  });

  it('an address that is not https (or loopback http)', async () => {
    const man = writeManifest(pkg);
    for (const url of ['http://example.com/p.tgz', 'ftp://127.0.0.1/p.tgz', 'file:///etc/passwd']) {
      await expect(ensure({ settings: settings('auto', url), manifestPath: man, meshDir: path.join(tmp, 'ins'), log: silent })).rejects.toMatchObject({ key: 'insecure' });
    }
  });

  it('an unknown source and a missing address', async () => {
    const man = writeManifest(pkg);
    await expect(ensure({ settings: settings('sometimes', ''), manifestPath: man, meshDir: path.join(tmp, 'm'), log: silent })).rejects.toMatchObject({ key: 'bad_source' });
    await expect(ensure({ settings: settings('auto', ''), manifestPath: man, meshDir: path.join(tmp, 'nu'), log: silent })).rejects.toMatchObject({ key: 'no_url' });
  });
});
