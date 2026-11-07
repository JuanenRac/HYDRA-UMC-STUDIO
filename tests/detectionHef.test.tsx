// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/detectionHef.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The switch of the loaded-model reports of the DETECTION-HEF service: off by default, a confirmation before turning it on (and the
// confirmation travels in the request only then), a switch fixed by the environment locked, nothing shown for a server that predates it,
// and the eight languages.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { DetectionHefPanel } from '../src/components/DetectionHefPanel';
import { detectionHefApi, detectionHefBody, detectionHefNeedsConfirmation, parseDetectionHef } from '../src/lib/detectionHef';
import en from '../src/locales/en.json';
import es from '../src/locales/es.json';
import de from '../src/locales/de.json';
import fr from '../src/locales/fr.json';
import itLocale from '../src/locales/it.json';
import ja from '../src/locales/ja.json';
import zh from '../src/locales/zh.json';
import pt from '../src/locales/pt.json';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const answer = (value: boolean, source = 'default') => ({ detectionHef: { acceptLoadedReports: { value, source } } });

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
  it('reads the block and refuses an answer that does not have the shape', () => {
    expect(parseDetectionHef(answer(false))).toEqual({ acceptLoadedReports: { value: false, source: 'default' } });
    expect(parseDetectionHef(answer(true, 'config'))).toEqual({ acceptLoadedReports: { value: true, source: 'config' } });
    expect(parseDetectionHef({})).toBeNull();
    expect(parseDetectionHef(null)).toBeNull();
    expect(parseDetectionHef({ detectionHef: {} })).toBeNull();
    expect(parseDetectionHef(answer('yes' as unknown as boolean))).toBeNull();
    expect(parseDetectionHef(answer(true, 'nowhere'))).toBeNull();
    expect(parseDetectionHef({ detectionHef: [] })).toBeNull();
  });

  it('carries the confirmation only when turning the switch on', () => {
    expect(detectionHefBody(true)).toEqual({ detectionHef: { acceptLoadedReports: true, confirm: true } });
    expect(detectionHefBody(false)).toEqual({ detectionHef: { acceptLoadedReports: false } });
    expect(detectionHefNeedsConfirmation(false, true)).toBe(true);
    expect(detectionHefNeedsConfirmation(true, true)).toBe(false);
    expect(detectionHefNeedsConfirmation(true, false)).toBe(false);
    expect(detectionHefNeedsConfirmation(false, false)).toBe(false);
  });

  it('tells a missing block, a refused account and a failure apart', async () => {
    serve(() => ({ status: 200, body: {} }));
    expect(await detectionHefApi.read()).toMatchObject({ ok: false, failure: 'unsupported' });
    serve(() => ({ status: 404, body: {} }));
    expect(await detectionHefApi.read()).toEqual({ ok: false, failure: 'unsupported' });
    serve(() => ({ status: 403, body: {} }));
    expect(await detectionHefApi.read()).toMatchObject({ ok: false, failure: 'forbidden' });
    serve(() => ({ status: 500, body: { error: 'x'.repeat(400) } }));
    const failed = await detectionHefApi.read();
    expect(failed).toMatchObject({ ok: false, failure: 'http', status: 500 });
    expect((failed as { reason?: string }).reason).toHaveLength(300);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await detectionHefApi.read()).toEqual({ ok: false, failure: 'network' });
    expect(await detectionHefApi.write(true)).toEqual({ ok: false, failure: 'network' });
  });
});

describe('DetectionHefPanel', () => {
  it('shows the switch off by default and nothing to save', async () => {
    serve(() => ({ status: 200, body: answer(false) }));
    render(<DetectionHefPanel />);
    await waitFor(() => expect(screen.getByTestId('detection-hef-enabled')).toBeTruthy());
    expect((screen.getByTestId('detection-hef-enabled') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId('detection-hef-save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('asks for a confirmation before turning it on and sends confirm: true only after it', async () => {
    let on = false;
    const spy = serve((init) => {
      if (init?.method === 'PUT') { on = true; return { status: 200, body: { success: true } }; }
      return { status: 200, body: answer(on, on ? 'config' : 'default') };
    });
    render(<DetectionHefPanel />);
    await waitFor(() => expect(screen.getByTestId('detection-hef-enabled')).toBeTruthy());
    fireEvent.click(screen.getByTestId('detection-hef-enabled'));
    fireEvent.click(screen.getByTestId('detection-hef-save'));
    expect(screen.getByText('Accept the reports of loaded models?')).toBeTruthy();
    expect(puts(spy)).toHaveLength(0);
    fireEvent.click(screen.getByText('Accept'));
    await waitFor(() => expect((screen.getByTestId('detection-hef-enabled') as HTMLInputElement).checked).toBe(true));
    expect(JSON.parse(String((puts(spy)[0][1] as RequestInit).body))).toEqual({ detectionHef: { acceptLoadedReports: true, confirm: true } });
  });

  it('does not send anything when the confirmation is cancelled', async () => {
    const spy = serve(() => ({ status: 200, body: answer(false) }));
    render(<DetectionHefPanel />);
    await waitFor(() => expect(screen.getByTestId('detection-hef-enabled')).toBeTruthy());
    fireEvent.click(screen.getByTestId('detection-hef-enabled'));
    fireEvent.click(screen.getByTestId('detection-hef-save'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(puts(spy)).toHaveLength(0);
  });

  it('turning it off needs no confirmation', async () => {
    let on = true;
    const spy = serve((init) => {
      if (init?.method === 'PUT') { on = false; return { status: 200, body: { success: true } }; }
      return { status: 200, body: answer(on, 'config') };
    });
    render(<DetectionHefPanel />);
    await waitFor(() => expect((screen.getByTestId('detection-hef-enabled') as HTMLInputElement).checked).toBe(true));
    fireEvent.click(screen.getByTestId('detection-hef-enabled'));
    fireEvent.click(screen.getByTestId('detection-hef-save'));
    await waitFor(() => expect(puts(spy)).toHaveLength(1));
    expect(JSON.parse(String((puts(spy)[0][1] as RequestInit).body))).toEqual({ detectionHef: { acceptLoadedReports: false } });
  });

  it('locks the switch when the environment fixes it', async () => {
    serve(() => ({ status: 200, body: answer(true, 'env') }));
    render(<DetectionHefPanel />);
    await waitFor(() => expect(screen.getByTestId('detection-hef-locked')).toBeTruthy());
    expect((screen.getByTestId('detection-hef-enabled') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('detection-hef-save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the reason when the server refuses the change', async () => {
    serve((init) => (init?.method === 'PUT' ? { status: 400, body: { error: 'confirm is needed' } } : { status: 200, body: answer(false) }));
    render(<DetectionHefPanel />);
    await waitFor(() => expect(screen.getByTestId('detection-hef-enabled')).toBeTruthy());
    fireEvent.click(screen.getByTestId('detection-hef-enabled'));
    fireEvent.click(screen.getByTestId('detection-hef-save'));
    fireEvent.click(screen.getByText('Accept'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('confirm is needed'));
  });

  it('shows nothing for a server that predates the setting', async () => {
    serve(() => ({ status: 200, body: {} }));
    const { container } = render(<DetectionHefPanel />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(container.querySelector('[data-testid="detection-hef-panel"]')).toBeNull();
  });
});

const LOCALES: Record<string, Record<string, unknown>> = { en, es, de, fr, it: itLocale, ja, zh, pt };
const block = (locale: Record<string, unknown>) => locale.detectionHef as Record<string, string>;

describe('the eight languages', () => {
  it('has every text in every language with the same placeholders', () => {
    const keys = Object.keys(block(en)).sort();
    expect(keys.length).toBeGreaterThanOrEqual(14);
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

  it('translates the confirmation in every language other than English', () => {
    for (const name of ['es', 'de', 'fr', 'it', 'ja', 'zh', 'pt']) {
      const b = block(LOCALES[name]);
      for (const key of ['confirm_title', 'confirm_message', 'confirm_button', 'desc']) expect(b[key], `${name}.${key}`).not.toBe(block(en)[key]);
    }
  });
});
