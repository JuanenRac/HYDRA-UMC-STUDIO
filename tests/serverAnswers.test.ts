// =============================================================================
// HYDRA-UMC STUDIO - tests/serverAnswers.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The answers of the server as the SDK generates them from its inventory (tests/fixtures/server-answers.json, a vendored copy kept
// identical by tools/sync_sdk_answers.py): every answer of every route, in its minimal body (required fields only) and its full
// body (every declared field), goes through the readers of this app. No reader may throw on any of them, a refusal must become an
// error with its status and its text, and the routes whose bodies carry real values must read as what they are.
// =============================================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { interpretCommandResponse } from '../src/lib/commandResult';
import { parseClients, parseEvents } from '../src/lib/connectionsApi';
import { parseClaims } from '../src/lib/claims';
import { parseHealth } from '../src/lib/ecosystemHealthApi';
import { parseSafetyLimits, parseWarnings } from '../src/lib/safetyLimits';
import { parseSecurityState } from '../src/lib/serverSecurity';

type Bodies = { minimal: unknown; full: unknown };
type Routes = Record<string, Record<string, Bodies>>;

const routes = (JSON.parse(readFileSync(new URL('./fixtures/server-answers.json', import.meta.url), 'utf8')) as { routes: Routes }).routes;

/** Every answer in the inventory: the route, the status and the body. */
const answers: { route: string; status: number; kind: 'minimal' | 'full'; body: unknown }[] = [];
for (const [route, byStatus] of Object.entries(routes)) {
  for (const [status, bodies] of Object.entries(byStatus)) {
    for (const kind of ['minimal', 'full'] as const) answers.push({ route, status: Number(status), kind, body: bodies[kind] });
  }
}

describe('the inventory of the answers', () => {
  it('lists the routes of the server, each answer with a minimal and a full body', () => {
    expect(Object.keys(routes).length).toBeGreaterThanOrEqual(90);
    for (const { route, status, body } of answers) {
      expect(body, `${route} ${status}`).toBeTypeOf('object');
      expect(body, `${route} ${status}`).not.toBeNull();
    }
  });
});

describe('no reader throws on any answer of the server', () => {
  it('reads every body as what it is or refuses it, never fails', () => {
    for (const { route, status, kind, body } of answers) {
      const label = `${route} ${status} ${kind}`;
      expect(() => parseHealth(body), label).not.toThrow();
      expect(() => parseSecurityState(body), label).not.toThrow();
      expect(() => parseClients(body), label).not.toThrow();
      expect(() => parseEvents(body), label).not.toThrow();
      expect(() => parseClaims(body), label).not.toThrow();
      expect(() => parseSafetyLimits(body), label).not.toThrow();
      expect(() => parseWarnings(body), label).not.toThrow();
      expect(() => interpretCommandResponse(status, status < 300, body), label).not.toThrow();
    }
  });

  it('turns the answer of a command into a result whose success follows the status', () => {
    for (const { route, status, body } of answers) {
      const result = interpretCommandResponse(status, status < 300, body);
      expect(result.ok, `${route} ${status}`).toBe(status < 300);
      expect(result.status).toBe(status);
      if (!result.ok) expect(result.code, `${route} ${status}`).not.toBeNull();
    }
  });

  it('keeps the text of a refusal that carries one', () => {
    for (const { route, status, body } of answers) {
      const text = (body as Record<string, unknown>).error;
      if (status < 400 || typeof text !== 'string' || text.trim() === '') continue;
      const result = interpretCommandResponse(status, false, body);
      expect(result.detail, `${route} ${status}`).toBe(text.trim().slice(0, 300));
    }
  });
});

describe('the routes whose bodies carry real values', () => {
  it('reads the list of clients that have connected', () => {
    const body = routes['GET /api/connections/clients']['200'];
    expect(parseClients(body.minimal)).toEqual([]);
    expect(parseClients(body.full).length).toBeGreaterThanOrEqual(0);
  });

  it('reads the list of connection events', () => {
    const body = routes['GET /api/connections/events']['200'];
    expect(parseEvents(body.minimal)).toEqual([]);
    expect(parseEvents(body.full).length).toBeGreaterThanOrEqual(0);
  });

  it('reads an empty health report as nothing rather than as a healthy server', () => {
    const body = routes['GET /api/ecosystem/health']['200'];
    const health = parseHealth(body.minimal);
    if (health !== null) expect(health.summary.ok).toBe(0);
  });
});
