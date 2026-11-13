// =============================================================================
// HYDRA-UMC STUDIO - tests/listenOnlyServers.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Listen only for one server: the origins kept read-only are a preference of this browser (off by default), the door of fetch refuses writes only
// to those origins, and the switch of the preferences tab changes the list for the server this window talks to.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '../src/i18n';
import { PreferencesTab } from '../src/components/config/PreferencesTab';
import { currentServerOrigin, listenOnlyActiveFor, originOf, withListenOnly } from '../src/lib/listenOnlyGuard';
import { MAX_LISTEN_ONLY_SERVERS, STUDIO_DEFAULTS, getStudioPrefs, originList, resetStudioPrefs, setStudioPrefs } from '../src/lib/studioPrefs';
import en from '../src/locales/en.json';
import es from '../src/locales/es.json';
import de from '../src/locales/de.json';
import fr from '../src/locales/fr.json';
import itLocale from '../src/locales/it.json';
import ja from '../src/locales/ja.json';
import zh from '../src/locales/zh.json';
import pt from '../src/locales/pt.json';

beforeEach(() => {
  window.localStorage.clear();
  resetStudioPrefs();
});

afterEach(() => cleanup());

describe('the list of read-only servers', () => {
  it('is empty by default', () => {
    expect(STUDIO_DEFAULTS.listenOnlyServers).toEqual([]);
    expect(getStudioPrefs().listenOnlyServers).toEqual([]);
  });

  it('keeps a clean list and drops anything else', () => {
    expect(originList(['http://a:1', 'http://a:1', 'http://b:2'])).toEqual(['http://a:1', 'http://b:2']);
    for (const bad of ['http://a', [1], [''], ['x'.repeat(201)], null, {}, Array.from({ length: MAX_LISTEN_ONLY_SERVERS + 1 }, (_, i) => `http://h${i}`)]) {
      expect(originList(bad)).toBeUndefined();
    }
    setStudioPrefs({ listenOnlyServers: 'http://a' as never });
    expect(getStudioPrefs().listenOnlyServers).toEqual([]);
  });

  it('is read back from the browser', () => {
    setStudioPrefs({ listenOnlyServers: ['http://a:1'] });
    expect(window.localStorage.getItem('hydra_studio_prefs')).toContain('"listenOnlyServers":["http://a:1"]');
  });
});

describe('listenOnlyActiveFor', () => {
  it('follows the general switch, or the list for that origin', () => {
    const none = { listenOnly: false, listenOnlyServers: [] };
    expect(listenOnlyActiveFor('http://a:1', none)).toBe(false);
    expect(listenOnlyActiveFor('http://a:1', { listenOnly: true, listenOnlyServers: [] })).toBe(true);
    expect(listenOnlyActiveFor('http://a:1', { listenOnly: false, listenOnlyServers: ['http://a:1'] })).toBe(true);
    expect(listenOnlyActiveFor('http://b:2', { listenOnly: false, listenOnlyServers: ['http://a:1'] })).toBe(false);
    expect(listenOnlyActiveFor(null, { listenOnly: false, listenOnlyServers: ['http://a:1'] })).toBe(false);
  });

  it('reads an origin from an address', () => {
    expect(originOf('http://10.0.0.5:3000/api/x')).toBe('http://10.0.0.5:3000');
    expect(originOf('/api/x', 'http://h:1/page')).toBe('http://h:1');
    expect(originOf('not a url')).toBeNull();
    expect(currentServerOrigin()).not.toBeNull();
  });
});

describe('the door of fetch with a list of servers', () => {
  const ok = () => Promise.resolve(new Response('{}', { status: 200 }));
  const onlyA = (origin: string | null) => origin === 'http://a:1';

  it('refuses a write to the listed server and lets the same write go to another', async () => {
    const base = vi.fn(ok);
    const guarded = withListenOnly(base as unknown as typeof fetch, onlyA);
    const refused = await guarded('http://a:1/api/settings', { method: 'POST', body: '{}' });
    expect(refused.status).toBe(423);
    expect(base).not.toHaveBeenCalled();
    await guarded('http://b:2/api/settings', { method: 'POST', body: '{}' });
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('still lets a read and a STOP go to the listed server', async () => {
    const base = vi.fn(ok);
    const guarded = withListenOnly(base as unknown as typeof fetch, onlyA);
    await guarded('http://a:1/api/settings');
    await guarded('http://a:1/api/stop-all', { method: 'POST' });
    expect(base).toHaveBeenCalledTimes(2);
  });
});

describe('the switch of the preferences tab', () => {
  it('adds and removes the origin of this server, and is disabled while the general switch is on', () => {
    render(<PreferencesTab />);
    const box = screen.getByTestId('prefs-listen-only-server') as HTMLInputElement;
    const origin = currentServerOrigin() as string;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(getStudioPrefs().listenOnlyServers).toEqual([origin]);
    fireEvent.click(box);
    expect(getStudioPrefs().listenOnlyServers).toEqual([]);
    fireEvent.click(screen.getByTestId('prefs-listen-only'));
    expect((screen.getByTestId('prefs-listen-only-server') as HTMLInputElement).disabled).toBe(true);
  });
});

describe('the texts', () => {
  it('exist in the eight languages with the server placeholder', () => {
    for (const [code, locale] of Object.entries({ en, es, de, fr, it: itLocale, ja, zh, pt })) {
      const prefs = (locale as unknown as { prefs: Record<string, string> }).prefs;
      expect(prefs.listen_only_server, code).toContain('{{server}}');
      expect(prefs.listen_only_server_hint.length, code).toBeGreaterThan(20);
    }
  });
});
