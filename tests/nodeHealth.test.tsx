// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/nodeHealth.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The health of the controller boards as the brain heard it (GET /api/node-health): what is accepted, each way the route can fail, the panel as rendered
// (nothing at all when the server does not offer it, plain sentences for a slot never heard and for a brain that does not answer), the switch of Server Admin and
// the eight languages.
// =============================================================================
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { NodeHealthPanel } from '../src/components/NodeHealthPanel';
import { loadAllNodeHealth, loadNodeHealth, panelIsHidden, parseNodeHealth, slotState, type NodeHealthResult } from '../src/lib/nodeHealthApi';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const heard = (slot: number, over: Record<string, unknown> = {}) => ({
  online: true, slot, heard: true, ageMs: 2500, sequence: 7, flags: 17, flagNames: ['estop_latched', 'application_confirmed'], txErrors: 1, rxErrors: 2, stalls: 0, uptimeS: 48, source: 'brain-health', ...over,
});

describe('reading a slot', () => {
  it('reads the closed fields of a heard frame and nothing else', () => {
    expect(parseNodeHealth({ ...heard(2), password: 'x' }, 2)).toEqual({
      online: true, slot: 2, heard: true, ageMs: 2500, sequence: 7, flagNames: ['estop_latched', 'application_confirmed'], txErrors: 1, rxErrors: 2, stalls: 0, uptimeS: 48,
    });
  });

  it('reads a slot never heard and a brain that does not answer, without inventing numbers', () => {
    const never = parseNodeHealth({ online: true, slot: 5, heard: false }, 5)!;
    expect([never.online, never.heard, never.ageMs, never.sequence, never.flagNames, slotState(never)]).toEqual([true, false, null, null, [], 'never']);
    const silent = parseNodeHealth({ online: false, slot: 3, heard: null }, 3)!;
    expect([silent.online, silent.heard, slotState(silent)]).toEqual([false, null, 'silent']);
  });

  it('refuses what is not an answer for that slot', () => {
    for (const bad of [null, 5, 'x', {}, { online: 'yes', slot: 2 }, heard(3), heard(2, { heard: 'maybe' }), heard(2, { ageMs: -1 }), heard(2, { ageMs: 25401 }), heard(2, { sequence: 256 }),
      heard(2, { flagNames: 'x' }), heard(2, { flagNames: [1] }), heard(2, { uptimeS: 4081 }), heard(2, { txErrors: 1.5 })]) {
      expect(parseNodeHealth(bad, 2), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe('asking the server', () => {
  function answer(status: number, body: unknown): void {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: status < 300, status, json: async () => body }) as unknown as Response));
  }

  it('asks for the slot and returns what the server says', async () => {
    answer(200, heard(2));
    const result = await loadNodeHealth(2);
    expect(result.ok && result.value.sequence).toBe(7);
    expect(String((vi.mocked(fetch).mock.calls[0] as unknown[])[0])).toContain('/api/node-health?slot=2');
  });

  it('tells each way it can fail', async () => {
    answer(404, null);
    expect(await loadNodeHealth(0)).toEqual({ ok: false, failure: 'unsupported' });
    answer(403, null);
    expect(await loadNodeHealth(0)).toEqual({ ok: false, failure: 'forbidden', status: 403 });
    answer(503, null);
    expect(await loadNodeHealth(0)).toEqual({ ok: false, failure: 'http', status: 503 });
    answer(200, { nonsense: true });
    expect(await loadNodeHealth(0)).toEqual({ ok: false, failure: 'malformed' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    expect(await loadNodeHealth(0)).toEqual({ ok: false, failure: 'network' });
  });

  it('asks for the eight slots, and hides the panel unless the server offers it', async () => {
    answer(404, null);
    const off = await loadAllNodeHealth();
    expect(off).toHaveLength(8);
    expect(panelIsHidden(off)).toBe(true);
    const mixed: NodeHealthResult[] = [{ ok: false, failure: 'http', status: 503 }, { ok: false, failure: 'unsupported' }];
    expect(panelIsHidden(mixed)).toBe(false);
    expect(panelIsHidden([{ ok: false, failure: 'network' }, { ok: false, failure: 'malformed' }])).toBe(true);
    expect(panelIsHidden([])).toBe(true);
  });
});

describe('the panel as rendered', () => {
  function serveSlots(statusOf: (slot: number) => number, bodyOf: (slot: number) => unknown): void {
    vi.stubGlobal('fetch', vi.fn(async (url: unknown) => {
      const slot = Number(new URL(String(url), 'http://x').searchParams.get('slot'));
      const status = statusOf(slot);
      return { ok: status < 300, status, json: async () => bodyOf(slot) } as unknown as Response;
    }));
  }

  it('shows nothing at all when the server does not offer the route', async () => {
    serveSlots(() => 404, () => null);
    const { container } = render(<NodeHealthPanel />);
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThanOrEqual(8));
    expect(container.querySelector('[data-testid="node-health"]')).toBeNull();
  });

  it('says what each slot is: a heard frame with its numbers, a slot never heard, a brain that does not answer', async () => {
    serveSlots(() => 200, (slot) => (slot === 2 ? heard(2) : slot === 5 ? { online: true, slot, heard: false } : { online: false, slot, heard: null }));
    render(<NodeHealthPanel />);
    await waitFor(() => expect(screen.getAllByTestId('node-health-row')).toHaveLength(8));
    const rows = screen.getAllByTestId('node-health-row');
    expect(rows[2].getAttribute('data-state')).toBe('heard');
    expect(rows[2].textContent).toContain('2.5');
    expect(rows[2].textContent).toContain('tx 1, rx 2');
    expect(screen.getAllByTestId('node-health-flags')[0].textContent).toBe('Emergency stop latched, Application confirmed');
    expect(rows[5].getAttribute('data-state')).toBe('never');
    expect(rows[5].textContent).not.toContain('tx ');
    expect(rows[0].getAttribute('data-state')).toBe('silent');
  });

  it('says there is no reading for a slot the bridge could not give', async () => {
    serveSlots((slot) => (slot === 1 ? 503 : 200), (slot) => ({ online: true, slot, heard: false }));
    render(<NodeHealthPanel />);
    await waitFor(() => expect(screen.getAllByTestId('node-health-row')).toHaveLength(8));
    expect(screen.getAllByTestId('node-health-row')[1].getAttribute('data-state')).toBe('unknown');
  });
});

describe('the eight languages', () => {
  const LANGUAGES = ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt'];
  const load = (language: string) => JSON.parse(readFileSync(`src/locales/${language}.json`, 'utf8')) as { nodeHealth: Record<string, string>; ecosystem: Record<string, string> };
  const holes = (text: string) => (text.match(/\{\{\w+\}\}/g) ?? []).sort().join(',');

  it('has every text of the panel and of the switch in every language, with the same placeholders', () => {
    const en = load('en');
    const keys = Object.keys(en.nodeHealth).sort();
    expect(keys.length).toBe(21);
    for (const language of LANGUAGES) {
      const catalog = load(language);
      expect(Object.keys(catalog.nodeHealth).sort(), language).toEqual(keys);
      for (const key of keys) {
        expect(catalog.nodeHealth[key].trim().length, `${language}.${key}`).toBeGreaterThan(0);
        expect(holes(catalog.nodeHealth[key]), `${language}.${key}`).toBe(holes(en.nodeHealth[key]));
      }
      for (const key of ['title', 'label', 'help', 'save']) expect(catalog.ecosystem[`admin_security_node_health_${key}`]?.trim().length, `${language} admin ${key}`).toBeGreaterThan(0);
    }
  });

  it('names every flag the board can send', () => {
    const names = ['estop_latched', 'bus_off_seen', 'watchdog_reset_at_start', 'setup_failed_at_start', 'application_confirmed', 'drivers_enabled', 'setup_failed_safe_state'];
    for (const language of LANGUAGES) for (const name of names) expect(load(language).nodeHealth[`flag_${name}`], `${language} ${name}`).toBeTruthy();
  });
});
