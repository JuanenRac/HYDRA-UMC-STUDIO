// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/liveActivity.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The Live Activity on the lock screen: off by default with the level that shows only the state, a confirmation to turn it on or to raise the level (and never to
// lower it), nothing above the level the server allows, a value fixed by the environment locked, nothing shown for a server that predates it, and the eight languages.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { LiveActivityPanel } from '../src/components/LiveActivityPanel';
import { LIVE_LEVELS, allowedLevels, liveActivityApi, liveBody, liveChange, liveNeedsConfirmation, liveRank, parseLiveActivity, type LiveActivityState } from '../src/lib/liveActivity';
import en from '../src/locales/en.json';
import es from '../src/locales/es.json';
import de from '../src/locales/de.json';
import fr from '../src/locales/fr.json';
import itLocale from '../src/locales/it.json';
import ja from '../src/locales/ja.json';
import zh from '../src/locales/zh.json';
import pt from '../src/locales/pt.json';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const answer = (over: { enabled?: boolean; level?: string; src?: string; levelSrc?: string; max?: string; push?: boolean } = {}) => ({
  push: {
    enabled: { value: over.push ?? true, source: 'config' },
    liveActivity: { enabled: { value: over.enabled ?? false, source: over.src ?? 'default' }, level: { value: over.level ?? 'status', source: over.levelSrc ?? 'default' }, maxLevel: over.max ?? 'full' },
  },
});
const state = (over = {}) => parseLiveActivity(answer(over)) as LiveActivityState;

function serve(handler: (init: RequestInit | undefined) => { status: number; body: unknown }): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const reply = handler(init);
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as unknown as Response;
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}
const puts = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'PUT');

describe('the reading and the body', () => {
  it('reads the block, off by default with the level that shows only the state', () => {
    const s = state();
    expect(s.enabled).toEqual({ value: false, source: 'default' });
    expect(s.level).toEqual({ value: 'status', source: 'default' });
    expect(s.maxLevel).toBe('full');
    expect(s.pushOn).toBe(true);
  });

  it('refuses an answer that does not have the shape', () => {
    for (const bad of [null, {}, { push: {} }, { push: { liveActivity: {} } }, answer({ level: 'everything' }), { push: { liveActivity: { enabled: { value: 'yes', source: 'default' }, level: { value: 'status', source: 'default' } } } }, answer({ src: 'nowhere' })]) {
      expect(parseLiveActivity(bad)).toBeNull();
    }
  });

  it('a maximum that is not one of the levels is the highest there is, and push off is told', () => {
    expect(state({ max: 'weird' }).maxLevel).toBe('full');
    expect(state({ push: false }).pushOn).toBe(false);
  });

  it('offers no level above the maximum the server allows', () => {
    expect(allowedLevels(state({ max: 'full' }))).toEqual(['status', 'progress', 'full']);
    expect(allowedLevels(state({ max: 'progress' }))).toEqual(['status', 'progress']);
    expect(allowedLevels(state({ max: 'status' }))).toEqual(['status']);
    expect(LIVE_LEVELS.map(liveRank)).toEqual([0, 1, 2]);
  });

  it('needs a confirmation to turn the card on or to raise the level, never to turn it off or lower it', () => {
    const off = state();
    expect(liveNeedsConfirmation(off, { enabled: true })).toBe(true);
    expect(liveNeedsConfirmation(off, { level: 'progress' })).toBe(true);
    expect(liveNeedsConfirmation(off, { level: 'full' })).toBe(true);
    expect(liveNeedsConfirmation(off, { level: 'status' })).toBe(false);
    const on = state({ enabled: true, level: 'full' });
    expect(liveNeedsConfirmation(on, { enabled: false })).toBe(false);
    expect(liveNeedsConfirmation(on, { level: 'progress' })).toBe(false);
    expect(liveNeedsConfirmation(on, { level: 'status' })).toBe(false);
    expect(liveNeedsConfirmation(on, { enabled: true, level: 'full' })).toBe(false);
  });

  it('the body carries only what changes and the confirmation exactly when it is needed', () => {
    const off = state();
    expect(liveBody(off, { enabled: true, level: 'progress' })).toEqual({ push: { liveActivity: { enabled: true, level: 'progress', confirm: true } } });
    expect(liveBody(off, { enabled: false })).toEqual({ push: { liveActivity: {} } });
    const on = state({ enabled: true, level: 'full' });
    expect(liveBody(on, { level: 'status' })).toEqual({ push: { liveActivity: { level: 'status' } } });
    expect(liveBody(on, { enabled: false })).toEqual({ push: { liveActivity: { enabled: false } } });
  });

  it('never sends a value the environment fixes, nor a level above the maximum', () => {
    expect(liveChange(state({ src: 'env', enabled: false }), { enabled: true, level: 'status' })).toEqual({});
    expect(liveChange(state({ levelSrc: 'env' }), { enabled: false, level: 'full' })).toEqual({});
    expect(liveChange(state({ max: 'progress' }), { enabled: false, level: 'full' })).toEqual({});
    expect(liveChange(state({ max: 'progress' }), { enabled: true, level: 'progress' })).toEqual({ enabled: true, level: 'progress' });
  });

  it('tells a missing block, a refused account, a failure and the network apart', async () => {
    serve(() => ({ status: 200, body: {} }));
    expect(await liveActivityApi.read()).toMatchObject({ ok: false, failure: 'unsupported' });
    serve(() => ({ status: 404, body: {} }));
    expect(await liveActivityApi.read()).toEqual({ ok: false, failure: 'unsupported' });
    serve(() => ({ status: 403, body: {} }));
    expect(await liveActivityApi.read()).toMatchObject({ failure: 'forbidden' });
    serve(() => ({ status: 500, body: { error: 'x'.repeat(400) } }));
    const failed = await liveActivityApi.read();
    expect((failed as { reason?: string }).reason).toHaveLength(300);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await liveActivityApi.read()).toEqual({ ok: false, failure: 'network' });
    expect(await liveActivityApi.write(state(), { enabled: true })).toEqual({ ok: false, failure: 'network' });
  });

  it('a change that changes nothing sends nothing', async () => {
    const spy = serve(() => ({ status: 200, body: answer() }));
    const result = await liveActivityApi.write(state(), { enabled: false, level: 'status' });
    expect(result.ok).toBe(true);
    expect(puts(spy)).toHaveLength(0);
  });
});

describe('LiveActivityPanel', () => {
  it('shows the card off, the state-only level chosen, and nothing to save', async () => {
    serve(() => ({ status: 200, body: answer() }));
    render(<LiveActivityPanel />);
    await waitFor(() => expect(screen.getByTestId('live-activity-enabled')).toBeTruthy());
    expect((screen.getByTestId('live-activity-enabled') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId('live-activity-level-status') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId('live-activity-save') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('live-activity-level-full')).toBeTruthy();
  });

  it('asks before turning it on and sends the confirmation only after it', async () => {
    let on = false;
    const spy = serve((init) => (init?.method === 'PUT' ? ((on = true), { status: 200, body: { success: true } }) : { status: 200, body: answer({ enabled: on, src: on ? 'config' : 'default' }) }));
    render(<LiveActivityPanel />);
    await waitFor(() => expect(screen.getByTestId('live-activity-enabled')).toBeTruthy());
    fireEvent.click(screen.getByTestId('live-activity-enabled'));
    fireEvent.click(screen.getByTestId('live-activity-save'));
    expect(screen.getByText('Show the robots on the lock screen?')).toBeTruthy();
    expect(puts(spy)).toHaveLength(0);
    fireEvent.click(screen.getByText('Show it'));
    await waitFor(() => expect((screen.getByTestId('live-activity-enabled') as HTMLInputElement).checked).toBe(true));
    expect(JSON.parse(String((puts(spy)[0][1] as RequestInit).body))).toEqual({ push: { liveActivity: { enabled: true, confirm: true } } });
  });

  it('the confirmation of the highest level says what the lock screen will show', async () => {
    serve(() => ({ status: 200, body: answer({ enabled: true, src: 'config' }) }));
    render(<LiveActivityPanel />);
    await waitFor(() => expect(screen.getByTestId('live-activity-level-full')).toBeTruthy());
    fireEvent.click(screen.getByTestId('live-activity-level-full'));
    fireEvent.click(screen.getByTestId('live-activity-save'));
    expect(screen.getByText(/whole panel of the robot/)).toBeTruthy();
  });

  it('cancelling the confirmation sends nothing', async () => {
    const spy = serve(() => ({ status: 200, body: answer() }));
    render(<LiveActivityPanel />);
    await waitFor(() => expect(screen.getByTestId('live-activity-enabled')).toBeTruthy());
    fireEvent.click(screen.getByTestId('live-activity-level-progress'));
    fireEvent.click(screen.getByTestId('live-activity-save'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(puts(spy)).toHaveLength(0);
  });

  it('lowering the level needs no confirmation', async () => {
    let level = 'full';
    const spy = serve((init) => (init?.method === 'PUT' ? ((level = 'status'), { status: 200, body: { success: true } }) : { status: 200, body: answer({ enabled: true, src: 'config', level, levelSrc: 'config' }) }));
    render(<LiveActivityPanel />);
    await waitFor(() => expect((screen.getByTestId('live-activity-level-full') as HTMLInputElement).checked).toBe(true));
    fireEvent.click(screen.getByTestId('live-activity-level-status'));
    fireEvent.click(screen.getByTestId('live-activity-save'));
    await waitFor(() => expect(puts(spy)).toHaveLength(1));
    expect(JSON.parse(String((puts(spy)[0][1] as RequestInit).body))).toEqual({ push: { liveActivity: { level: 'status' } } });
  });

  it('offers only the levels the server allows', async () => {
    serve(() => ({ status: 200, body: answer({ max: 'progress' }) }));
    render(<LiveActivityPanel />);
    await waitFor(() => expect(screen.getByTestId('live-activity-level-progress')).toBeTruthy());
    expect(screen.queryByTestId('live-activity-level-full')).toBeNull();
  });

  it('says so when push is off, and locks what the environment fixes', async () => {
    serve(() => ({ status: 200, body: answer({ push: false, src: 'env', levelSrc: 'env' }) }));
    render(<LiveActivityPanel />);
    await waitFor(() => expect(screen.getByTestId('live-activity-push-off')).toBeTruthy());
    expect(screen.getByTestId('live-activity-locked')).toBeTruthy();
    expect((screen.getByTestId('live-activity-enabled') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('live-activity-level-progress') as HTMLInputElement).disabled).toBe(true);
  });

  it('shows the reason when the server refuses the change', async () => {
    serve((init) => (init?.method === 'PUT' ? { status: 400, body: { error: 'confirm is needed' } } : { status: 200, body: answer() }));
    render(<LiveActivityPanel />);
    await waitFor(() => expect(screen.getByTestId('live-activity-enabled')).toBeTruthy());
    fireEvent.click(screen.getByTestId('live-activity-enabled'));
    fireEvent.click(screen.getByTestId('live-activity-save'));
    fireEvent.click(screen.getByText('Show it'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('confirm is needed'));
  });

  it('shows nothing for a server that predates the Live Activity', async () => {
    serve(() => ({ status: 200, body: {} }));
    const { container } = render(<LiveActivityPanel />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(container.querySelector('[data-testid="live-activity-panel"]')).toBeNull();
  });
});

const LOCALES: Record<string, Record<string, unknown>> = { en, es, de, fr, it: itLocale, ja, zh, pt };
const block = (locale: Record<string, unknown>) => locale.liveActivity as Record<string, string>;

describe('the eight languages', () => {
  it('has every text in every language with the same placeholders', () => {
    const keys = Object.keys(block(en)).sort();
    expect(keys.length).toBeGreaterThanOrEqual(24);
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

  it('translates what the person confirms (not left in English)', () => {
    for (const name of ['es', 'de', 'fr', 'it', 'ja', 'zh', 'pt']) {
      const b = block(LOCALES[name]);
      for (const key of ['title', 'desc', 'confirm_message_full', 'lock_screen_note', 'level_full_hint']) expect(b[key], `${name}.${key}`).not.toBe(block(en)[key]);
    }
  });

  it('has a sentence for each level', () => {
    for (const level of LIVE_LEVELS) {
      for (const key of [`level_${level}`, `level_${level}_hint`, `confirm_message_${level}`]) expect(block(en)[key], key).toBeTruthy();
    }
  });
});
