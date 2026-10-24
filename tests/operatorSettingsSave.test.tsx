// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/operatorSettingsSave.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The real provider against a fake server: an administrator's edit of the settings tree is saved after the pause
// of the debounce; an operator's is not sent at all (the server would refuse it with a 403), nothing shows the
// pulsing "Save failed" and the header says the edit stays in this window.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { HydraProvider } from '../src/HydraProvider';
import { defaultControllers, useHydraStore } from '../src/store';
import { TOKEN_KEY } from '../src/lib/session';

function token(role: string): string {
  return `h.${btoa(JSON.stringify({ username: 'ana', id: 'u1', role })).replace(/=+$/, '')}.s`;
}

class QuietSocket {
  static OPEN = 1;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  url: string;
  protocols?: unknown;
  constructor(url: string, protocols?: unknown) {
    this.url = url;
    this.protocols = protocols;
  }
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
}

function Probe() {
  const store = useHydraStore();
  return (
    <div>
      <button onClick={() => store.updateSettings({ serverName: 'Edited cell' })}>edit</button>
      <span data-testid="local-only">{String(store.settingsLocalOnly)}</span>
      <span data-testid="save-error">{store.settingsSaveError ?? ''}</span>
    </div>
  );
}

interface Calls { posts: string[]; gets: string[] }

function startServer(): Calls {
  const calls: Calls = { posts: [], gets: [] };
  const data = { settings: { serverName: 'Cell' }, controllers: defaultControllers, activeControllerId: defaultControllers[0].id };
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const path = String(url).split('?')[0];
    (method === 'POST' ? calls.posts : calls.gets).push(path);
    const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    if (path.endsWith('/api/settings') && method === 'GET') return respond(200, data);
    if (path.endsWith('/api/settings') && method === 'POST') return respond(200, { success: true });
    return respond(404, { error: 'not here' });
  }));
  vi.stubGlobal('WebSocket', QuietSocket);
  return calls;
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function mount(role: string, calls: Calls) {
  window.sessionStorage.setItem(TOKEN_KEY, token(role));
  render(
    <HydraProvider>
      <Probe />
    </HydraProvider>,
  );
  await waitFor(() => expect(calls.gets.some((p) => p.endsWith('/api/settings'))).toBe(true));
  // let the first load settle: the echo of what the server just sent is not an edit
  await new Promise((resolve) => setTimeout(resolve, 700));
  calls.posts.length = 0;
}

describe('saving the settings tree by role', () => {
  it('saves what an administrator edited', async () => {
    const calls = startServer();
    await mount('admin', calls);
    fireEvent.click(screen.getByText('edit'));
    await waitFor(() => expect(calls.posts).toContain('/api/settings'), { timeout: 3000 });
    expect(screen.getByTestId('local-only').textContent).toBe('false');
    expect(screen.getByTestId('save-error').textContent).toBe('');
  });

  it('sends nothing for an operator, shows no failure and says the edit stays here', async () => {
    const calls = startServer();
    await mount('operator', calls);
    fireEvent.click(screen.getByText('edit'));
    await waitFor(() => expect(screen.getByTestId('local-only').textContent).toBe('true'), { timeout: 3000 });
    await new Promise((resolve) => setTimeout(resolve, 800));
    expect(calls.posts).toEqual([]);
    expect(screen.getByTestId('save-error').textContent).toBe('');
  });
});
