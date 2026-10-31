// =============================================================================
// HYDRA-UMC STUDIO - tests/ecosystemHealthApi.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The reading of the health of the ecosystem that the server offers: what is accepted, what is turned into unknown, the filters, the
// order of the cards, the age of the last answer against a simulated clock, and each way the route can fail.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ago, filterServices, loadEcosystemHealth, parseCertificate, parseHealth, parseService, parseWarning, sortBySeverity } from '../src/lib/ecosystemHealthApi';

const service = (over: Record<string, unknown> = {}) => ({
  name: 'HYDRA-UMC-ALPHA', family: 'hydra', role: 'service', state: 'ok', reason: 'health_ok', version_expected: '1.0.0.0', version_reported: '1.0.0.0',
  drift: false, last_seen_utc: '2030-01-01T00:00:00.000Z', latency_ms: 4, ...over,
});
const report = (services: unknown[], over: Record<string, unknown> = {}) => ({
  schema_version: '1.0', generated_at_utc: '2030-01-01T00:00:10.000Z', available: true,
  summary: { total: 99, ok: 99, degraded: 0, down: 0, unknown: 0, drift: 0 }, services, certificate: null, warnings: [], ...over,
});

afterEach(() => vi.unstubAllGlobals());

function answer(status: number, body: unknown): void {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: status < 300, status, json: async () => body }) as unknown as Response));
}

describe('reading a service', () => {
  it('reads the closed fields and nothing else', () => {
    expect(parseService({ ...service(), port: 8095, systemd_unit: 'x.service', password: 'x' })).toEqual({
      name: 'HYDRA-UMC-ALPHA', family: 'hydra', role: 'service', state: 'ok', reason: 'health_ok', versionExpected: '1.0.0.0', versionReported: '1.0.0.0',
      drift: false, lastSeen: '2030-01-01T00:00:00.000Z', latencyMs: 4,
    });
  });

  it('shows a state or reason it does not know as unknown or none instead of dropping the service, and refuses one without a name', () => {
    expect(parseService(service({ state: 'on-fire', reason: 'weird' }))).toMatchObject({ state: 'unknown', reason: null });
    expect(parseService(service({ name: '' }))).toBeNull();
    expect(parseService(null)).toBeNull();
    expect(parseService(service({ last_seen_utc: 'yesterday', latency_ms: 1.5, drift: 'yes' }))).toMatchObject({ lastSeen: null, latencyMs: null, drift: false });
  });
});

describe('reading the whole answer', () => {
  it('counts the summary from the services it kept, not from the numbers the server sent', () => {
    const health = parseHealth(report([service(), service({ name: 'B', state: 'down' }), service({ name: 'C', state: 'degraded', drift: true }), service({ name: '' })]));
    expect(health?.summary).toEqual({ total: 3, ok: 1, degraded: 1, down: 1, unknown: 0, drift: 1 });
  });

  it('refuses what is not the route at all and keeps available false when the server says so', () => {
    expect(parseHealth({})).toBeNull();
    expect(parseHealth({ schema_version: '2.0', services: [] })).toBeNull();
    expect(parseHealth(null)).toBeNull();
    expect(parseHealth(report([], { available: false }))?.available).toBe(false);
  });

  it('reads the certificate and the warnings and drops what it does not know', () => {
    expect(parseCertificate({ state: 'expiring', not_after_utc: '2030-02-01T00:00:00.000Z', days_left: 12, warn_days: 30 })).toEqual({ state: 'expiring', notAfter: '2030-02-01T00:00:00.000Z', daysLeft: 12, warnDays: 30 });
    expect(parseCertificate({ state: 'shiny' })).toBeNull();
    expect(parseCertificate(null)).toBeNull();
    expect(parseWarning({ code: 'version_drift', service: 'A' })).toEqual({ code: 'version_drift', service: 'A' });
    expect(parseWarning({ code: 'certificate_expired' })).toEqual({ code: 'certificate_expired' });
    expect(parseWarning({ code: 'nonsense' })).toBeNull();
    const health = parseHealth(report([], { warnings: [{ code: 'service_down', service: 'A' }, { code: 'nonsense' }, 3] }));
    expect(health?.warnings).toEqual([{ code: 'service_down', service: 'A' }]);
  });
});

describe('filters and order', () => {
  const list = parseHealth(report([
    service({ name: 'Ok' }), service({ name: 'Down', state: 'down' }), service({ name: 'Drift', drift: true, version_reported: '0.9.0.0' }),
    service({ name: 'Degraded', state: 'degraded' }), service({ name: 'Mystery', state: 'unknown' }),
  ]))!.services;

  it('keeps one state or only the services with another version', () => {
    expect(filterServices(list, 'all')).toHaveLength(5);
    expect(filterServices(list, 'down').map(s => s.name)).toEqual(['Down']);
    expect(filterServices(list, 'ok').map(s => s.name)).toEqual(['Ok', 'Drift']);
    expect(filterServices(list, 'drift').map(s => s.name)).toEqual(['Drift']);
    expect(filterServices(list, 'unknown').map(s => s.name)).toEqual(['Mystery']);
  });

  it('puts what needs attention first and the rest by name', () => {
    expect(sortBySeverity(list).map(s => s.name)).toEqual(['Down', 'Degraded', 'Mystery', 'Drift', 'Ok']);
    expect(list.map(s => s.name)[0]).toBe('Ok'); // the input is not changed
  });
});

describe('the age of the last answer, against a simulated clock', () => {
  const at = Date.parse('2030-01-01T00:00:00.000Z');
  it('is short enough for a card', () => {
    expect(ago('2030-01-01T00:00:00.000Z', at + 5_000)).toBe('5s');
    expect(ago('2030-01-01T00:00:00.000Z', at + 12 * 60_000)).toBe('12m');
    expect(ago('2030-01-01T00:00:00.000Z', at + (3 * 60 + 4) * 60_000)).toBe('3h 4m');
    expect(ago('2030-01-01T00:00:00.000Z', at + 5 * 86_400_000)).toBe('5d');
    expect(ago('2030-01-01T00:00:00.000Z', at - 1000)).toBe('0s');
    expect(ago(null, at)).toBeNull();
    expect(ago('nonsense', at)).toBeNull();
  });
});

describe('loading it', () => {
  it('returns the health on a good answer', async () => {
    answer(200, report([service()]));
    const result = await loadEcosystemHealth();
    expect(result.ok && result.value.services).toHaveLength(1);
  });

  it('tells apart a route that is off or missing, a refused account, a server error, a bad body and no network', async () => {
    answer(404, {});
    expect(await loadEcosystemHealth()).toEqual({ ok: false, failure: 'unsupported' });
    answer(403, {});
    expect(await loadEcosystemHealth()).toEqual({ ok: false, failure: 'forbidden', status: 403 });
    answer(401, {});
    expect(await loadEcosystemHealth()).toEqual({ ok: false, failure: 'forbidden', status: 401 });
    answer(503, {});
    expect(await loadEcosystemHealth()).toEqual({ ok: false, failure: 'http', status: 503 });
    answer(200, { hello: 'world' });
    expect(await loadEcosystemHealth()).toEqual({ ok: false, failure: 'malformed' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    expect(await loadEcosystemHealth()).toEqual({ ok: false, failure: 'network' });
  });
});
