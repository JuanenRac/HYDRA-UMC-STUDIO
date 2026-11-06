// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/notificationsTab.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The state of the push notifications: read for administrators only, never asked for by anyone else, with off, no credentials and ready
// told apart, and no switch that the server could not honour.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { HydraStoreProviders } from '../src/storeContexts';
import { NotificationsTab } from '../src/components/config/NotificationsTab';
import { isKnownEvent, parsePush, pushVerdict } from '../src/lib/notificationsView';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function serve(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async () => ({ ok: status < 300, status, json: async () => body }) as unknown as Response);
  vi.stubGlobal('fetch', spy);
  return spy;
}

function renderTab(isAdmin: boolean) {
  render(<HydraStoreProviders value={{ authToken: 'tok', isAdmin } as never}><NotificationsTab /></HydraStoreProviders>);
}

describe('notificationsView', () => {
  it('reads the state defensively', () => {
    expect(parsePush({ enabled: true, configured: false, problem: 'missing_key', devices: 3, sandbox: true, events: { globalStop: true, jobFinished: false, junk: 'x' } }))
      .toEqual({ enabled: true, configured: false, problem: 'missing_key', devices: 3, sandbox: true, events: [{ id: 'globalStop', on: true }, { id: 'jobFinished', on: false }] });
    expect(parsePush(null)).toEqual({ enabled: false, configured: false, problem: null, devices: 0, sandbox: false, events: [] });
  });

  it('tells off, no credentials and ready apart', () => {
    expect(pushVerdict(parsePush({ enabled: false, configured: true }))).toBe('off');
    expect(pushVerdict(parsePush({ enabled: true, configured: false }))).toBe('needs_credentials');
    expect(pushVerdict(parsePush({ enabled: true, configured: true }))).toBe('ready');
  });

  it('knows the events it has a text for', () => {
    expect(isKnownEvent('jobFinished')).toBe(true);
    expect(isKnownEvent('somethingNew')).toBe(false);
  });
});

describe('NotificationsTab', () => {
  it('shows an administrator the state and the events, with no switch', async () => {
    serve(200, { enabled: true, configured: true, problem: null, devices: 2, sandbox: false, events: { jobFinished: true, globalStop: true, somethingNew: false } });
    renderTab(true);
    await waitFor(() => expect(screen.getByTestId('notifications-verdict').dataset.verdict).toBe('ready'));
    expect(screen.getByTestId('notifications-devices').textContent).toContain('2 phone');
    const events = screen.getAllByTestId('notifications-event');
    expect(events).toHaveLength(3);
    expect(events.map((row) => row.textContent).join('|')).toContain('A global stop was issued');
    expect(events.map((row) => row.textContent).join('|')).toContain('somethingNew');
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByTestId('notifications-read-only').textContent).toContain('no route');
  });

  it('says that push is off, and why it cannot send', async () => {
    serve(200, { enabled: true, configured: false, problem: 'missing_key', devices: 0, events: {} });
    renderTab(true);
    await waitFor(() => expect(screen.getByTestId('notifications-verdict').dataset.verdict).toBe('needs_credentials'));
    expect(screen.getByTestId('notifications-problem').textContent).toContain('missing_key');
  });

  it('does not ask the server anything when the account is not an administrator', async () => {
    const spy = serve(200, {});
    renderTab(false);
    expect(screen.getByTestId('notifications-admin-only')).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it('says plainly when the account is refused or the server predates the route', async () => {
    serve(403, {});
    renderTab(true);
    await waitFor(() => expect(screen.getByTestId('notifications-error').textContent).toContain('not allowed'));
    cleanup();
    serve(404, {});
    renderTab(true);
    await waitFor(() => expect(screen.getByTestId('notifications-error').textContent).toContain('does not offer'));
  });
});
