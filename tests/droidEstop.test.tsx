// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/droidEstop.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The switch of the safety zones service that reads the emergency stop of the droids: how the answers are read, what body a change sends (always with the
// confirmation), and the screen: off by default, a confirmation before any change, nothing shown when the server has no such service, the eight languages.
// =============================================================================
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { DroidEstopPanel } from '../src/components/DroidEstopPanel';
import { droidEstopApi, droidEstopBody, droidEstopChangeNeedsConfirmation, parseDroidEstop } from '../src/lib/droidEstop';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const off = { enabled: false, default: false, running: false };

function serve(handler: (init: RequestInit | undefined) => { status: number; body: unknown }): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const reply = handler(init);
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as unknown as Response;
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

const posts = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST');

describe('the reading and the body', () => {
  it('reads the switch as a boolean and nothing else', () => {
    expect(parseDroidEstop(off)).toEqual({ enabled: false, running: false });
    expect(parseDroidEstop({ enabled: true, running: true })).toEqual({ enabled: true, running: true });
    expect(parseDroidEstop({ enabled: 'yes' })).toBeNull();
    expect(parseDroidEstop(null)).toBeNull();
  });
  it('sends the confirmation in both directions', () => {
    expect(droidEstopBody(true)).toEqual({ enabled: true, confirm: true });
    expect(droidEstopBody(false)).toEqual({ enabled: false, confirm: true });
    expect(droidEstopChangeNeedsConfirmation(false, true)).toBe(true);
    expect(droidEstopChangeNeedsConfirmation(true, true)).toBe(false);
  });
  it('tells a missing route, a service not configured, a refused account, a refusal and a lost network apart', async () => {
    serve(() => ({ status: 404, body: {} }));
    expect(await droidEstopApi.read()).toEqual({ ok: false, failure: 'unsupported' });
    serve(() => ({ status: 503, body: { available: false } }));
    expect(await droidEstopApi.read()).toEqual({ ok: false, failure: 'not_configured' });
    serve(() => ({ status: 403, body: {} }));
    expect(await droidEstopApi.read()).toMatchObject({ ok: false, failure: 'forbidden' });
    serve(() => ({ status: 502, body: { error: 'the setting could not be changed' } }));
    expect(await droidEstopApi.write(true)).toMatchObject({ ok: false, failure: 'http', status: 502, reason: 'the setting could not be changed' });
    serve(() => ({ status: 200, body: { nothing: 1 } }));
    expect(await droidEstopApi.read()).toMatchObject({ ok: false, failure: 'http' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await droidEstopApi.read()).toEqual({ ok: false, failure: 'network' });
  });
});

describe('DroidEstopPanel', () => {
  it('shows the switch off by default and keeps Save disabled until it changes', async () => {
    serve(() => ({ status: 200, body: off }));
    render(<DroidEstopPanel />);
    await waitFor(() => expect(screen.getByTestId('droid-estop-state')).toBeTruthy());
    expect(screen.getByTestId('droid-estop-state').textContent).toContain('Off');
    expect((screen.getByTestId('droid-estop-enabled') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId('droid-estop-save') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId('droid-estop-link')).toBeNull();
  });

  it('asks for a confirmation before turning it on and sends confirm: true only after it', async () => {
    const spy = serve((init) => (init?.method === 'POST' ? { status: 200, body: { enabled: true, running: true, changed: true } } : { status: 200, body: off }));
    render(<DroidEstopPanel />);
    await waitFor(() => expect(screen.getByTestId('droid-estop-enabled')).toBeTruthy());
    fireEvent.click(screen.getByTestId('droid-estop-enabled'));
    fireEvent.click(screen.getByTestId('droid-estop-save'));
    expect(screen.getByText('Read the droid emergency stop?')).toBeTruthy();
    expect(posts(spy)).toHaveLength(0);
    fireEvent.click(screen.getByText('Read it'));
    await waitFor(() => expect(screen.getByTestId('droid-estop-state').textContent).toContain('On'));
    expect(JSON.parse(String((posts(spy)[0][1] as RequestInit).body))).toEqual({ enabled: true, confirm: true });
    expect(screen.getByTestId('droid-estop-link').textContent).toContain('is up');
  });

  it('turning it off asks for a confirmation too, and a cancel sends nothing', async () => {
    const spy = serve((init) => (init?.method === 'POST' ? { status: 200, body: off } : { status: 200, body: { enabled: true, running: false } }));
    render(<DroidEstopPanel />);
    await waitFor(() => expect((screen.getByTestId('droid-estop-enabled') as HTMLInputElement).checked).toBe(true));
    expect(screen.getByTestId('droid-estop-link').textContent).toContain('is down');
    fireEvent.click(screen.getByTestId('droid-estop-enabled'));
    fireEvent.click(screen.getByTestId('droid-estop-save'));
    expect(screen.getByText('Stop reading the droid emergency stop?')).toBeTruthy();
    fireEvent.click(screen.getByText('Cancel'));
    expect(posts(spy)).toHaveLength(0);
  });

  it('shows the reason when the service refuses the change and keeps the earlier state', async () => {
    serve((init) => (init?.method === 'POST' ? { status: 502, body: { error: 'the setting could not be changed (OSError); it stays as it was' } } : { status: 200, body: off }));
    render(<DroidEstopPanel />);
    await waitFor(() => expect(screen.getByTestId('droid-estop-enabled')).toBeTruthy());
    fireEvent.click(screen.getByTestId('droid-estop-enabled'));
    fireEvent.click(screen.getByTestId('droid-estop-save'));
    fireEvent.click(screen.getByText('Read it'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('stays as it was'));
    expect(screen.getByTestId('droid-estop-state').textContent).toContain('Off');
  });

  it('shows the message of an account that may not use it', async () => {
    serve(() => ({ status: 403, body: {} }));
    render(<DroidEstopPanel />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Only an administrator'));
  });

  it('shows nothing when the server has no such service or it cannot be switched from here', async () => {
    for (const reply of [{ status: 503, body: { available: false } }, { status: 404, body: {} }]) {
      serve(() => reply);
      const { container, unmount } = render(<DroidEstopPanel />);
      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 20));
      expect(container.querySelector('[data-testid="droid-estop-panel"]')).toBeNull();
      unmount();
    }
  });
});

describe('the eight languages', () => {
  const LANGUAGES = ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt'];
  const read = (language: string) => (JSON.parse(readFileSync(`src/locales/${language}.json`, 'utf8')) as { droidEstop: Record<string, string> }).droidEstop;
  it('has the same keys and the same blanks in every language', () => {
    const english = read('en');
    for (const language of LANGUAGES) {
      const texts = read(language);
      expect(Object.keys(texts).sort(), language).toEqual(Object.keys(english).sort());
      for (const key of Object.keys(english)) {
        expect(texts[key].trim().length, `${language}.${key}`).toBeGreaterThan(0);
        expect(texts[key].includes('{{reason}}'), `${language}.${key}`).toBe(english[key].includes('{{reason}}'));
      }
    }
  });
  it('translates every text except the placeholders', () => {
    const english = read('en');
    for (const language of LANGUAGES.filter((l) => l !== 'en')) {
      const texts = read(language);
      for (const key of ['title', 'desc', 'label', 'confirm_on_message']) expect(texts[key], `${language}.${key}`).not.toBe(english[key]);
    }
  });
});
