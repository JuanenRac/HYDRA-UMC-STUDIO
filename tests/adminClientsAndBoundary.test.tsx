// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/adminClientsAndBoundary.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The panel of connected apps: administrators only, the account token on the call, administrators first and then by name, the counts, how long ago each one connected,
// what is shown for what the server did not say, the two kinds of failure, and a read on demand. And the boundary that keeps one broken panel from blanking the page.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '../src/i18n';
import { HydraStoreProviders } from '../src/storeContexts';
import { AdminClients } from '../src/components/AdminClients';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

vi.mock('../src/components/ConnectionHistory', () => ({ ConnectionHistory: () => <div data-testid="connection-history" /> }));

const NOW = Date.parse('2026-03-01T12:00:00Z');
const ago = (seconds: number): string => new Date(NOW - seconds * 1000).toISOString();

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function serve(handler: () => { status: number; body: unknown } | Error): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    const reply = handler();
    if (reply instanceof Error) throw reply;
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as unknown as Response;
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

const renderClients = (value: Record<string, unknown> = {}) =>
  render(<HydraStoreProviders value={{ authToken: 'secret-token', isAdmin: true, ...value } as never}><AdminClients /></HydraStoreProviders>);

const client = (over: Record<string, unknown> = {}) => ({ username: 'ana', role: 'operator', remoteAddress: '10.0.0.7', connectedAt: ago(5), remoteApiVersion: 2, connected: true, ...over });

describe('AdminClients', () => {
  it('says that only administrators can see it, and asks the server for nothing that matters', async () => {
    const spy = serve(() => ({ status: 200, body: { clients: [client()] } }));
    renderClients({ isAdmin: false });
    expect(screen.getByText('Only admin accounts can view this panel.')).toBeTruthy();
    expect(screen.queryByText('ana')).toBeNull();
    await Promise.resolve();
    expect(screen.queryByTestId('connection-history')).toBeNull();
    expect(spy.mock.calls.every(([url]) => String(url).includes('/api/admin/clients'))).toBe(true);
  });

  it('shows that it is loading, then reads with the token of the account', async () => {
    const spy = serve(() => ({ status: 200, body: { clients: [client()] } }));
    renderClients();
    expect(screen.getByText('Loading...')).toBeTruthy();
    await screen.findByText('ana');
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/admin\/clients$/);
    expect((init as RequestInit).headers).toEqual({ Authorization: 'Bearer secret-token' });
  });

  it('sends no Authorization header when there is no token', async () => {
    const spy = serve(() => ({ status: 200, body: { clients: [] } }));
    renderClients({ authToken: null });
    await screen.findByText('No apps connected right now.');
    expect((spy.mock.calls[0][1] as RequestInit).headers).toEqual({});
  });

  it('lists the administrators first and then everyone by name, with the counts', async () => {
    serve(() => ({
      status: 200,
      body: {
        clients: [
          client({ username: 'zoe', role: 'operator' }),
          client({ username: 'bob', role: 'viewer' }),
          client({ username: 'root', role: 'admin' }),
          client({ username: 'adm2', role: 'admin' }),
        ],
      },
    }));
    renderClients();
    await screen.findByText('root');
    const names = ['adm2', 'root', 'bob', 'zoe'].map((n) => screen.getByText(n));
    const order = names.map((el) => el.compareDocumentPosition(names[0]));
    expect(order.slice(1).every((position) => position & Node.DOCUMENT_POSITION_PRECEDING)).toBe(true);
    const text = document.body.textContent ?? '';
    expect(text.indexOf('adm2')).toBeLessThan(text.indexOf('root'));
    expect(text.indexOf('root')).toBeLessThan(text.indexOf('bob'));
    expect(text.indexOf('bob')).toBeLessThan(text.indexOf('zoe'));
    const connected = screen.getByText('Connected').parentElement as HTMLElement;
    const admins = screen.getByText('Admins').parentElement as HTMLElement;
    expect(within(connected).getByText('4')).toBeTruthy();
    expect(within(admins).getByText('2')).toBeTruthy();
  });

  it('shows how long ago each one connected in seconds, minutes, and hours with minutes', async () => {
    serve(() => ({
      status: 200,
      body: {
        clients: [
          client({ username: 'a', connectedAt: ago(0) }),
          client({ username: 'b', connectedAt: ago(59) }),
          client({ username: 'c', connectedAt: ago(60) }),
          client({ username: 'd', connectedAt: ago(59 * 60 + 59) }),
          client({ username: 'e', connectedAt: ago(3600) }),
          client({ username: 'f', connectedAt: ago(3600 * 5 + 60 * 7 + 3) }),
          client({ username: 'g', connectedAt: ago(-30) }),
        ],
      },
    }));
    renderClients();
    await screen.findByText('a');
    const durationOf = (name: string) => {
      const row = screen.getByText(name).closest('div.rounded-xl') as HTMLElement;
      return within(row).getAllByText(/^(\d+s|\d+m|\d+h \d+m|-)$/)[0].textContent;
    };
    expect(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(durationOf)).toEqual(['0s', '59s', '1m', '59m', '1h 0m', '5h 7m', '0s']);
  });

  it('shows a dash for a time that is missing or is not a date, and says what it does not know', async () => {
    serve(() => ({
      status: 200,
      body: { clients: [{ username: null, role: null, remoteAddress: null, connectedAt: null, remoteApiVersion: null, connected: false }, client({ username: 'x', connectedAt: 'not a date' })] },
    }));
    renderClients();
    await screen.findByText('Unknown');
    expect(screen.getByText('Unknown address')).toBeTruthy();
    expect(screen.getByText('Schema v?')).toBeTruthy();
    expect(screen.getByText('?')).toBeTruthy();
    expect(screen.getAllByText('-').length).toBe(2);
    expect(screen.getByTitle('Closing')).toBeTruthy();
    expect(screen.getByTitle('Open')).toBeTruthy();
  });

  it('says that nothing is connected, with no counts', async () => {
    serve(() => ({ status: 200, body: { clients: [] } }));
    renderClients();
    expect(await screen.findByText('No apps connected right now.')).toBeTruthy();
    expect(screen.queryByText('Admins')).toBeNull();
    expect(screen.getByTestId('connection-history')).toBeTruthy();
  });

  it('treats an answer without the list as an empty one', async () => {
    serve(() => ({ status: 200, body: {} }));
    renderClients();
    expect(await screen.findByText('No apps connected right now.')).toBeTruthy();
  });

  it('shows the explanation of the server when it refuses, or the status when it gives none', async () => {
    let reply: { status: number; body: unknown } = { status: 403, body: { error: 'admin only' } };
    serve(() => reply);
    renderClients();
    expect(await screen.findByText('admin only')).toBeTruthy();
    reply = { status: 500, body: {} };
    fireEvent.click(screen.getByText('Refresh'));
    expect(await screen.findByText('HTTP 500')).toBeTruthy();
  });

  it('says that the list could not be loaded when the call itself fails, and takes the message away on the next good read', async () => {
    let fail = true;
    serve(() => (fail ? new Error('offline') : { status: 200, body: { clients: [client()] } }));
    renderClients();
    expect(await screen.findByText('Could not load connected apps.')).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByText('Refresh'));
    await screen.findByText('ana');
    expect(screen.queryByText('Could not load connected apps.')).toBeNull();
  });

  it('reads again when asked and keeps the list while it does', async () => {
    const spy = serve(() => ({ status: 200, body: { clients: [client()] } }));
    renderClients();
    await screen.findByText('ana');
    const before = spy.mock.calls.length;
    fireEvent.click(screen.getByText('Refresh'));
    await waitFor(() => expect(spy.mock.calls.length).toBe(before + 1));
    expect(screen.getByText('ana')).toBeTruthy();
  });

  it('reads every five seconds by itself and says so', async () => {
    const intervals: number[] = [];
    const real = window.setInterval;
    vi.spyOn(window, 'setInterval').mockImplementation(((handler: TimerHandler, ms?: number, ...rest: unknown[]) => {
      if (typeof ms === 'number') intervals.push(ms);
      return real.call(window, handler as () => void, ms, ...rest);
    }) as unknown as typeof window.setInterval);
    serve(() => ({ status: 200, body: { clients: [client()] } }));
    renderClients();
    await screen.findByText('ana');
    expect(screen.getByText('Refreshes every 5s.')).toBeTruthy();
    expect(intervals).toContain(5000);
    expect(intervals).toContain(1000);
  });
});

function Broken(): never {
  throw new Error('a panel broke');
}

describe('ErrorBoundary', () => {
  it('shows its children when nothing broke', () => {
    render(<ErrorBoundary><p>fine panel</p></ErrorBoundary>);
    expect(screen.getByText('fine panel')).toBeTruthy();
    expect(screen.queryByText('Something went wrong rendering this panel.')).toBeNull();
  });

  it('replaces a panel that throws with a sentence, a hint and a reload button, and writes what happened to the console', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<ErrorBoundary><Broken /></ErrorBoundary>);
    expect(screen.getByText('Something went wrong rendering this panel.')).toBeTruthy();
    expect(screen.getByText(/usually clears up after a reload/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Reload/ })).toBeTruthy();
    const mine = logged.mock.calls.find((call) => call[0] === 'HYDRA-UMC STUDIO render crash:');
    expect(mine).toBeTruthy();
    expect((mine![1] as Error).message).toBe('a panel broke');
    expect(typeof mine![2]).toBe('string');
  });

  it('keeps the rest of the page: a sibling outside the boundary is still there', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<div><p>the menu</p><ErrorBoundary><Broken /></ErrorBoundary></div>);
    expect(screen.getByText('the menu')).toBeTruthy();
  });
});
