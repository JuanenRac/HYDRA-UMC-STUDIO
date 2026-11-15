// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/ros2Security.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The requirement of SROS2 of the ROS 2 bridge: how the answers are read, what body a change sends (always with the confirmation), when the bridge would
// refuse, the screen (off by default, a confirmation before any change, the value of the file apart from the value the running bridge started with) and
// the fallback that only prepares the lines when the server cannot reach the bridge.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../src/i18n';
import { Ros2SecurityPanel } from '../src/components/Ros2SecurityPanel';
import {
  SROS2_ENVIRONMENT, parseRos2Security, ros2SecurityApi, ros2SecurityBlockedReason, ros2SecurityBody, ros2SecurityChangeNeedsConfirmation, sros2Preparation,
} from '../src/lib/ros2Security';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const off = { requireSros2: false, active: false, restartNeeded: false, canChange: true, environmentReady: false };

function serve(handler: (init: RequestInit | undefined) => { status: number; body: unknown }): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const reply = handler(init);
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as unknown as Response;
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

const posts = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST');

describe('the lines it prepares when the server cannot reach the bridge', () => {
  it('has nothing to add by default', () => {
    expect(sros2Preparation(false)).toBeNull();
  });
  it('prepares the one key and the environment the bridge checks', () => {
    const prepared = sros2Preparation(true);
    expect(JSON.parse(prepared?.config ?? '')).toEqual({ security: { require_sros2: true } });
    expect(prepared?.environment).toBe(SROS2_ENVIRONMENT);
    expect(SROS2_ENVIRONMENT.map(line => line.split('=')[0])).toEqual(['ROS_SECURITY_ENABLE', 'ROS_SECURITY_STRATEGY', 'ROS_SECURITY_KEYSTORE']);
  });
});

describe('the reading and the body', () => {
  it('reads the requirement as a boolean and nothing else', () => {
    expect(parseRos2Security(off)).toEqual(off);
    expect(parseRos2Security({ requireSros2: 'yes' })).toBeNull();
    expect(parseRos2Security(null)).toBeNull();
    expect(parseRos2Security({ requireSros2: true })).toEqual({ requireSros2: true, active: false, restartNeeded: false, canChange: false, environmentReady: false });
  });
  it('sends the confirmation in both directions', () => {
    expect(ros2SecurityBody(true)).toEqual({ requireSros2: true, confirm: true });
    expect(ros2SecurityBody(false)).toEqual({ requireSros2: false, confirm: true });
    expect(ros2SecurityChangeNeedsConfirmation(false, true)).toBe(true);
    expect(ros2SecurityChangeNeedsConfirmation(true, true)).toBe(false);
  });
  it('knows what the bridge would refuse', () => {
    expect(ros2SecurityBlockedReason(off, true)).toBe('');
    expect(ros2SecurityBlockedReason({ ...off, canChange: false }, true)).toBe('blocked_no_change');
    expect(ros2SecurityBlockedReason({ ...off, canChange: false }, false)).toBe('');
  });
  it('tells a missing route, a bridge not configured, a bridge that does not answer and a refused account apart', async () => {
    serve(() => ({ status: 404, body: {} }));
    expect(await ros2SecurityApi.read()).toEqual({ ok: false, failure: 'unsupported' });
    serve(() => ({ status: 503, body: { available: false } }));
    expect(await ros2SecurityApi.read()).toEqual({ ok: false, failure: 'not_configured' });
    serve(() => ({ status: 503, body: { error: 'The ROS 2 bridge is unavailable' } }));
    expect(await ros2SecurityApi.read()).toEqual({ ok: false, failure: 'unreachable' });
    serve(() => ({ status: 403, body: {} }));
    expect(await ros2SecurityApi.read()).toMatchObject({ ok: false, failure: 'forbidden' });
  });
});

describe('Ros2SecurityPanel with the settings of the bridge', () => {
  it('shows the requirement off by default and keeps Save disabled until it changes', async () => {
    serve(() => ({ status: 200, body: off }));
    render(<Ros2SecurityPanel />);
    await waitFor(() => expect(screen.getByTestId('ros2-security-live')).toBeTruthy());
    expect(screen.getByTestId('ros2-security-state').textContent).toBe(i18n.t('ros2Security.state_file_off'));
    expect(screen.getByTestId('ros2-security-active').textContent).toBe(i18n.t('ros2Security.active_off'));
    expect((screen.getByTestId('ros2-security-require') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId('ros2-security-save') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId('ros2-security-restart')).toBeNull();
  });

  it('asks for a confirmation before turning it on and sends confirm: true only after it, saying that it applies at the restart', async () => {
    const spy = serve((init) => (init?.method === 'POST'
      ? { status: 200, body: { ...off, requireSros2: true, restartNeeded: true, changed: true, appliesAfterRestart: true } }
      : { status: 200, body: off }));
    render(<Ros2SecurityPanel />);
    await waitFor(() => expect(screen.getByTestId('ros2-security-require')).toBeTruthy());
    fireEvent.click(screen.getByTestId('ros2-security-require'));
    fireEvent.click(screen.getByTestId('ros2-security-save'));
    expect(screen.getByText(i18n.t('ros2Security.confirm_on_title'))).toBeTruthy();
    expect(posts(spy)).toHaveLength(0);
    fireEvent.click(screen.getByText(i18n.t('ros2Security.confirm_on_button')));
    await waitFor(() => expect(screen.getByTestId('ros2-security-saved')).toBeTruthy());
    expect(JSON.parse(String((posts(spy)[0][1] as RequestInit).body))).toEqual({ requireSros2: true, confirm: true });
    expect(screen.getByTestId('ros2-security-state').textContent).toBe(i18n.t('ros2Security.state_file_on'));
    expect(screen.getByTestId('ros2-security-active').textContent).toBe(i18n.t('ros2Security.active_off'));
    expect(screen.getByTestId('ros2-security-restart')).toBeTruthy();
    expect(screen.getByTestId('ros2-security-saved').textContent).toBe(i18n.t('ros2Security.saved'));
  });

  it('turning it off asks for a confirmation too', async () => {
    const on = { ...off, requireSros2: true, active: true, environmentReady: true };
    const spy = serve((init) => (init?.method === 'POST' ? { status: 200, body: off } : { status: 200, body: on }));
    render(<Ros2SecurityPanel />);
    await waitFor(() => expect((screen.getByTestId('ros2-security-require') as HTMLInputElement).checked).toBe(true));
    expect(screen.getByTestId('ros2-security-env-state').textContent).toBe(i18n.t('ros2Security.env_ready'));
    fireEvent.click(screen.getByTestId('ros2-security-require'));
    fireEvent.click(screen.getByTestId('ros2-security-save'));
    expect(screen.getByText(i18n.t('ros2Security.confirm_off_title'))).toBeTruthy();
    expect(posts(spy)).toHaveLength(0);
  });

  it('warns that the bridge would refuse to start when the ROS 2 security variables are not set', async () => {
    serve(() => ({ status: 200, body: off }));
    render(<Ros2SecurityPanel />);
    await waitFor(() => expect(screen.getByTestId('ros2-security-env-state')).toBeTruthy());
    expect(screen.getByTestId('ros2-security-env-state').textContent).toBe(i18n.t('ros2Security.env_not_ready'));
  });

  it('does not offer a change the bridge would refuse', async () => {
    serve(() => ({ status: 200, body: { ...off, canChange: false } }));
    render(<Ros2SecurityPanel />);
    await waitFor(() => expect(screen.getByTestId('ros2-security-require')).toBeTruthy());
    fireEvent.click(screen.getByTestId('ros2-security-require'));
    expect(screen.getByTestId('ros2-security-blocked').textContent).toBe(i18n.t('ros2Security.blocked_no_change'));
    expect((screen.getByTestId('ros2-security-save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the reason of the bridge when it refuses the change', async () => {
    serve((init) => (init?.method === 'POST' ? { status: 409, body: { error: 'the file would not load' } } : { status: 200, body: off }));
    render(<Ros2SecurityPanel />);
    await waitFor(() => expect(screen.getByTestId('ros2-security-require')).toBeTruthy());
    fireEvent.click(screen.getByTestId('ros2-security-require'));
    fireEvent.click(screen.getByTestId('ros2-security-save'));
    fireEvent.click(screen.getByText(i18n.t('ros2Security.confirm_on_button')));
    await waitFor(() => expect(screen.getByTestId('ros2-security-problem')).toBeTruthy());
    expect(screen.getByTestId('ros2-security-problem').textContent).toContain('the file would not load');
  });
});

describe('Ros2SecurityPanel when the server cannot reach the bridge', () => {
  it('says why, says it cannot read the bridge, and sends nothing but the reading', async () => {
    const spy = serve(() => ({ status: 503, body: { available: false } }));
    render(<Ros2SecurityPanel />);
    await waitFor(() => expect(screen.getByTestId('ros2-security-fallback')).toBeTruthy());
    expect(screen.getByTestId('ros2-security-problem').textContent).toBe(i18n.t('ros2Security.not_configured'));
    expect(screen.getByTestId('ros2-security-honest').textContent).toBe(i18n.t('ros2Security.not_reported'));
    expect((screen.getByTestId('ros2-security-require') as HTMLInputElement).checked).toBe(false);
    expect(screen.getByTestId('ros2-security-state').textContent).toBe(i18n.t('ros2Security.state_off'));
    expect(screen.queryByTestId('ros2-security-lines')).toBeNull();
    expect(posts(spy)).toHaveLength(0);
  });

  it('shows the lines to add by hand when switched on, and hides them again when switched off', async () => {
    const spy = serve(() => ({ status: 404, body: {} }));
    render(<Ros2SecurityPanel />);
    await waitFor(() => expect(screen.getByTestId('ros2-security-fallback')).toBeTruthy());
    expect(screen.getByTestId('ros2-security-problem').textContent).toBe(i18n.t('ros2Security.unsupported'));
    fireEvent.click(screen.getByTestId('ros2-security-require'));
    expect(screen.getByTestId('ros2-security-config').textContent).toContain('"require_sros2": true');
    expect(screen.getByTestId('ros2-security-env').textContent).toContain('ROS_SECURITY_STRATEGY=Enforce');
    expect(screen.getByTestId('ros2-security-state').textContent).toBe(i18n.t('ros2Security.state_on'));
    fireEvent.click(screen.getByTestId('ros2-security-require'));
    expect(screen.queryByTestId('ros2-security-lines')).toBeNull();
    expect(posts(spy)).toHaveLength(0);
  });

  it('says that the bridge does not answer when the server cannot reach it', async () => {
    serve(() => ({ status: 503, body: { error: 'The ROS 2 bridge is unavailable' } }));
    render(<Ros2SecurityPanel />);
    await waitFor(() => expect(screen.getByTestId('ros2-security-problem')).toBeTruthy());
    expect(screen.getByTestId('ros2-security-problem').textContent).toBe(i18n.t('ros2Security.unreachable'));
  });
});
