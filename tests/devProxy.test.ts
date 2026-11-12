// =============================================================================
// HYDRA-UMC STUDIO - tests/devProxy.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkProxyPath, checkProxyTarget, DEFAULT_PROXY_PATHS, resolveDevProxy } from '../scripts/devProxy';

describe('the paths the dev server forwards to the server', () => {
  it('forwards /api, /ws and WORKS to localhost:3000 when there is no file', () => {
    const { rules, warnings } = resolveDevProxy(undefined);
    expect(Object.keys(rules)).toEqual(['/api', '/ws', '/WORKS']);
    expect(rules['/api']).toEqual({ target: 'http://localhost:3000', changeOrigin: true });
    expect(rules['/ws']).toEqual({ target: 'http://localhost:3000', ws: true, changeOrigin: true });
    expect(warnings).toEqual([]);
  });

  it('the file in the repository says what the defaults say', () => {
    const file = JSON.parse(readFileSync('dev-proxy.config.json', 'utf8')) as { target: string; paths: string[] };
    expect(file.paths).toEqual([...DEFAULT_PROXY_PATHS]);
    expect(resolveDevProxy(JSON.stringify(file)).rules).toEqual(resolveDevProxy(undefined).rules);
  });

  it('forwards the prefixes of the list, in their canonical form and once', () => {
    const text = JSON.stringify({ paths: ['/WORKS/', '/MY-WORKS', ' /MY-WORKS ', '/data/jobs'] });
    const { rules, warnings } = resolveDevProxy(text);
    expect(Object.keys(rules)).toEqual(['/api', '/ws', '/WORKS', '/MY-WORKS', '/data/jobs']);
    expect(warnings).toEqual([]);
  });

  it('an empty list forwards only /api and /ws', () => {
    expect(Object.keys(resolveDevProxy('{"paths": []}').rules)).toEqual(['/api', '/ws']);
  });

  it('the target of the file and then the environment decide where everything goes', () => {
    const fromFile = resolveDevProxy('{"target": "http://192.168.0.180:3000/"}');
    expect(new Set(Object.values(fromFile.rules).map((r) => r.target))).toEqual(new Set(['http://192.168.0.180:3000']));
    const fromEnv = resolveDevProxy('{"target": "http://192.168.0.180:3000"}', { HYDRA_STUDIO_PROXY_TARGET: 'https://hydra.local:3443' });
    expect(new Set(Object.values(fromEnv.rules).map((r) => r.target))).toEqual(new Set(['https://hydra.local:3443']));
  });

  it('refuses a target that is not an http(s) address or carries credentials, and says so', () => {
    for (const bad of ['ftp://host', 'localhost:3000', 'http://user:pw@host:3000', '', 42, null]) {
      expect(checkProxyTarget(bad)).toBeNull();
    }
    const r = resolveDevProxy('{"target": "http://user:pw@host:3000"}', { HYDRA_STUDIO_PROXY_TARGET: 'javascript:alert(1)' });
    expect(r.rules['/api'].target).toBe('http://localhost:3000');
    expect(r.warnings).toHaveLength(2);
  });

  it('leaves out, with a reason, every prefix that is not safe to forward', () => {
    const bad = ['/', '', 'WORKS', '/a b', '/WORK*', '^/regex', '/a/../b', '/src', '/src/main.tsx', '/node_modules/x', '/@vite/client', '/@fs/etc', '/__vite_ping', '/index.html', '/api', '/ws', 7];
    for (const value of bad) expect('problem' in checkProxyPath(value), JSON.stringify(value)).toBe(true);
    const r = resolveDevProxy(JSON.stringify({ paths: [...bad, '/WORKS'] }));
    expect(Object.keys(r.rules)).toEqual(['/api', '/ws', '/WORKS']);
    expect(r.warnings).toHaveLength(bad.length);
  });

  it('a file that is not JSON, not an object or has the wrong types falls back to the defaults', () => {
    for (const text of ['{broken', '[]', 'null', '"x"']) {
      const r = resolveDevProxy(text);
      expect(Object.keys(r.rules)).toEqual(Object.keys(resolveDevProxy(undefined).rules));
      expect(r.warnings).toHaveLength(1);
    }
    const r = resolveDevProxy('{"target": 3, "paths": "/WORKS"}');
    expect(r.rules['/api'].target).toBe('http://localhost:3000');
    expect(Object.keys(r.rules)).toEqual(['/api', '/ws', '/WORKS']);
    expect(r.warnings).toHaveLength(2);
  });
});
