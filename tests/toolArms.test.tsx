// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/toolArms.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The arm state of the URTC tools (read only): how the answer is checked against the closed contract, that an old report is never shown
// as safe, the order of the rows, the screen with each kind of answer, and the eight languages of the texts.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { ToolArmsPanel } from '../src/components/ToolArmsPanel';
import { formatAge, parseToolArms, sortToolArms, toolArmLevel, toolArmsApi, type ToolArm } from '../src/lib/toolArms';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import en from '../src/locales/en.json';
import es from '../src/locales/es.json';
import de from '../src/locales/de.json';
import fr from '../src/locales/fr.json';
import itLocale from '../src/locales/it.json';
import ja from '../src/locales/ja.json';
import zh from '../src/locales/zh.json';
import pt from '../src/locales/pt.json';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const arm = (over: Partial<ToolArm> = {}): ToolArm => ({ robot: 'arm1', toolId: 1, armed: false, by: 'urtc', seq: 1, ageSeconds: 2, stale: false, ...over });
const report = (arms: ToolArm[] = [arm()], over: Record<string, unknown> = {}) => ({
  schema_version: '1.0',
  ttlSeconds: 10,
  arms,
  armedCount: arms.filter(a => a.armed && !a.stale).length,
  staleCount: arms.filter(a => a.stale).length,
  ...over,
});

function serve(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async () => ({ ok: status < 300, status, json: async () => body }) as unknown as Response);
  vi.stubGlobal('fetch', spy);
  return spy;
}

describe('the reading', () => {
  it('reads a report of the contract', () => {
    const r = parseToolArms(report([arm({ armed: true }), arm({ robot: 'arm2', toolId: 24, stale: true })]));
    expect(r).toMatchObject({ ttlSeconds: 10, armedCount: 1, staleCount: 1 });
    expect(r?.arms).toHaveLength(2);
  });

  it('reads the empty example of the SDK fixtures', () => {
    const routes = (JSON.parse(readFileSync(join(process.cwd(), 'tests', 'fixtures', 'server-answers.json'), 'utf8')) as { routes: Record<string, Record<string, Record<string, Record<string, unknown>>>> }).routes;
    const minimal = routes['GET /api/tool-arms']['200'].minimal;
    expect(parseToolArms({ ...minimal, schema_version: '1.0', ttlSeconds: 5 })).toEqual({ ttlSeconds: 5, arms: [], armedCount: 0, staleCount: 0 });
  });

  it.each([
    ['another version of the contract', report([], { schema_version: '2.0' })],
    ['a ttl of zero', report([], { ttlSeconds: 0 })],
    ['a ttl that is not a number', report([], { ttlSeconds: '10' })],
    ['a negative count', report([], { armedCount: -1 })],
    ['a count with decimals', report([], { staleCount: 1.5 })],
    ['arms that are not a list', report([], { arms: {} })],
    ['a robot id with a space', report([arm({ robot: 'arm 1' })])],
    ['a robot id that starts with a dot', report([arm({ robot: '.arm' })])],
    ['a robot id of 65 characters', report([arm({ robot: 'a'.repeat(65) })])],
    ['a tool above 24', report([arm({ toolId: 25 })])],
    ['a negative tool', report([arm({ toolId: -1 })])],
    ['an armed flag that is not a boolean', report([{ ...arm(), armed: 'yes' } as unknown as ToolArm])],
    ['a stale flag that is not a boolean', report([{ ...arm(), stale: 1 } as unknown as ToolArm])],
    ['a long reporter', report([arm({ by: 'x'.repeat(65) })])],
    ['a sequence of zero', report([arm({ seq: 0 })])],
    ['a negative age', report([arm({ ageSeconds: -1 })])],
    ['an age that is not finite', report([arm({ ageSeconds: Number.POSITIVE_INFINITY })])],
  ])('refuses %s', (_name, body) => {
    expect(parseToolArms(body)).toBeNull();
  });

  it('refuses a list of more than 256 arms and accepts exactly 256', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => arm({ robot: `r${i}` }));
    expect(parseToolArms(report(many(256)))).not.toBeNull();
    expect(parseToolArms(report(many(257)))).toBeNull();
  });

  it('refuses what is not an object', () => {
    for (const bad of [null, undefined, 3, 'text', [], true]) expect(parseToolArms(bad)).toBeNull();
  });
});

describe('what a row means', () => {
  it('never shows an old report as safe', () => {
    expect(toolArmLevel(arm({ armed: true }))).toBe('armed');
    expect(toolArmLevel(arm({ armed: false }))).toBe('disarmed');
    expect(toolArmLevel(arm({ armed: true, stale: true }))).toBe('warning');
    expect(toolArmLevel(arm({ armed: false, stale: true }))).toBe('unknown');
  });

  it('puts the dangerous rows first, then by robot and tool, without changing the input', () => {
    const rows = [arm({ robot: 'b', toolId: 2 }), arm({ robot: 'a', toolId: 3, armed: true }), arm({ robot: 'a', toolId: 1, stale: true }), arm({ robot: 'c', toolId: 0, armed: true, stale: true })];
    const copy = rows.map(r => ({ ...r }));
    expect(sortToolArms(rows).map(r => `${r.robot}${r.toolId}`)).toEqual(['c0', 'a3', 'a1', 'b2']);
    expect(rows).toEqual(copy);
  });

  it('writes the age with the right unit', () => {
    expect(formatAge(0)).toEqual({ unit: 's', value: 0 });
    expect(formatAge(59.9)).toEqual({ unit: 's', value: 59 });
    expect(formatAge(60)).toEqual({ unit: 'min', value: 1 });
    expect(formatAge(3599)).toEqual({ unit: 'min', value: 59 });
    expect(formatAge(3600)).toEqual({ unit: 'h', value: 1 });
    expect(formatAge(86400)).toEqual({ unit: 'h', value: 24 });
  });
});

describe('the request', () => {
  it('tells every kind of answer apart', async () => {
    serve(200, report());
    expect(await toolArmsApi.read()).toMatchObject({ ok: true });
    serve(404, {});
    expect(await toolArmsApi.read()).toEqual({ ok: false, failure: 'unsupported' });
    for (const status of [502, 503, 504]) { serve(status, {}); expect(await toolArmsApi.read()).toMatchObject({ ok: false, failure: 'unavailable', status }); }
    for (const status of [401, 403]) { serve(status, {}); expect(await toolArmsApi.read()).toMatchObject({ ok: false, failure: 'forbidden', status }); }
    serve(500, {});
    expect(await toolArmsApi.read()).toMatchObject({ ok: false, failure: 'http', status: 500 });
    serve(200, { schema_version: '1.0' });
    expect(await toolArmsApi.read()).toMatchObject({ ok: false, failure: 'shape' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await toolArmsApi.read()).toEqual({ ok: false, failure: 'network' });
  });

  it('only ever reads: no request of the screen changes anything', async () => {
    const spy = serve(200, report());
    render(<ToolArmsPanel />);
    await waitFor(() => expect(screen.getByTestId('tool-arms-summary')).toBeTruthy());
    fireEvent.click(screen.getByTestId('tool-arms-refresh'));
    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(1));
    for (const call of spy.mock.calls as unknown as [unknown, RequestInit | undefined][]) expect((call[1]?.method ?? 'GET').toUpperCase()).toBe('GET');
  });
});

describe('ToolArmsPanel', () => {
  it('lists the tools with the dangerous ones first and an old armed tool as a warning', async () => {
    serve(200, report([arm({ robot: 'z', toolId: 4 }), arm({ robot: 'a', toolId: 2, armed: true }), arm({ robot: 'm', toolId: 7, armed: true, stale: true, ageSeconds: 125 })]));
    render(<ToolArmsPanel />);
    await waitFor(() => expect(screen.getByTestId('tool-arms-list')).toBeTruthy());
    const rows = screen.getByTestId('tool-arms-list').querySelectorAll('li');
    expect([...rows].map(r => r.getAttribute('data-level'))).toEqual(['warning', 'armed', 'disarmed']);
    expect(screen.getByTestId('tool-arm-m-7').textContent).toContain('Armed, report is old');
    expect(screen.getByTestId('tool-arm-m-7').textContent).toContain('2 min');
    expect(screen.getByTestId('tool-arms-summary').textContent).toContain('1 armed, 1 with an old report');
  });

  it('says so when no tool has reported', async () => {
    serve(200, report([]));
    render(<ToolArmsPanel />);
    await waitFor(() => expect(screen.getByTestId('tool-arms-empty')).toBeTruthy());
    expect(screen.queryByTestId('tool-arms-list')).toBeNull();
  });

  it('says the state is not available instead of showing an empty list', async () => {
    serve(503, { error: 'not configured' });
    render(<ToolArmsPanel />);
    await waitFor(() => expect(screen.getByTestId('tool-arms-problem')).toBeTruthy());
    expect(screen.getByTestId('tool-arms-problem').textContent).toContain('not available');
    expect(screen.queryByTestId('tool-arms-list')).toBeNull();
    expect(screen.queryByTestId('tool-arms-empty')).toBeNull();
  });

  it('drops a list it could not read when the next reading fails', async () => {
    let first = true;
    vi.stubGlobal('fetch', vi.fn(async () => {
      const ok = first; first = false;
      return { ok, status: ok ? 200 : 500, json: async () => report([arm({ armed: true })]) } as unknown as Response;
    }));
    render(<ToolArmsPanel />);
    await waitFor(() => expect(screen.getByTestId('tool-arms-list')).toBeTruthy());
    fireEvent.click(screen.getByTestId('tool-arms-refresh'));
    await waitFor(() => expect(screen.getByTestId('tool-arms-problem')).toBeTruthy());
    expect(screen.queryByTestId('tool-arms-list')).toBeNull();
  });
});

const LOCALES: Record<string, Record<string, unknown>> = { en, es, de, fr, it: itLocale, ja, zh, pt };
const block = (locale: Record<string, unknown>) => locale.toolArms as Record<string, string>;

describe('the eight languages', () => {
  it('has every text in every language with the same placeholders', () => {
    const keys = Object.keys(block(en)).sort();
    expect(keys.length).toBeGreaterThanOrEqual(19);
    for (const [name, locale] of Object.entries(LOCALES)) {
      const b = block(locale);
      expect(Object.keys(b).sort(), name).toEqual(keys);
      for (const key of keys) {
        expect(b[key].trim().length, `${name}.${key}`).toBeGreaterThan(0);
        const holes = (text: string) => (text.match(/\{\{\w+\}\}/g) ?? []).sort().join(',');
        expect(holes(b[key]), `${name}.${key}`).toBe(holes(block(en)[key]));
      }
    }
  });

  it('translates the texts that decide what the operator does (not left in English)', () => {
    for (const name of ['es', 'de', 'fr', 'it', 'ja', 'zh', 'pt']) {
      const b = block(LOCALES[name]);
      for (const key of ['title', 'level_warning', 'level_unknown', 'stale_note', 'desc']) expect(b[key], `${name}.${key}`).not.toBe(block(en)[key]);
    }
  });
});
