// =============================================================================
// HYDRA-UMC STUDIO - tests/restPaths.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Fixes the list of server routes this app calls: a route can only be added or dropped on purpose (update the fixture), and when
// the shared contracts are checked out next to this repository every route must exist in the server contract.
// =============================================================================
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sources(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

/** Every `/api/...` literal in the sources, with template expressions shown as `{p}` and any query string removed. */
export function calledRoutes(): string[] {
  const found = new Set<string>();
  for (const file of sources(join(ROOT, 'src'))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/[`'"](\/api\/(?:\$\{[^}]*\}|[^`'"\s$)])*)/g)) {
      let route = m[1].replace(/\$\{[^}]*\}?/g, '{p}').split('?')[0];
      route = route.replace(/([^/])\{p\}.*$/, '$1').replace(/\/+$/, '');
      if (route.length > 5) found.add(route);
    }
  }
  return [...found].sort();
}

describe('server routes called by the app', () => {
  it('match the recorded list', () => {
    const recorded = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'rest_routes.json'), 'utf8')) as string[];
    expect(calledRoutes()).toEqual(recorded);
  });

  const contract = join(ROOT, '..', 'HYDRA-UMC-SDK', 'contracts', 'openapi', 'v1', 'server.full.openapi.json');
  it.skipIf(!existsSync(contract))('exist in the server contract next to this repository', () => {
    const paths = Object.keys((JSON.parse(readFileSync(contract, 'utf8')) as { paths: Record<string, unknown> }).paths);
    const matches = (route: string, path: string): boolean =>
      new RegExp('^' + route.replace(/\{p\}/g, '[^/]+') + '$').test(path.replace(/\{[^}]+\}/g, 'x'));
    // Routes the server already serves but the shared contract does not list yet; remove each one once the contract has it.
    const notYetInContract = ['/api/connections/clients', '/api/connections/events'];
    const unknown = calledRoutes().filter((r) => !notYetInContract.includes(r)).filter((r) => !paths.some((p) => matches(r, p)));
    expect(unknown).toEqual([]);
  });
});
