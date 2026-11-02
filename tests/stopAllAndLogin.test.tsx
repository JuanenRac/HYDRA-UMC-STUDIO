// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/stopAllAndLogin.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Component tests with a real DOM for the two screens an operator meets first: the global STOP (button, keyboard chord and
// the report of what it did) and the login gate (credentials, second step, read-only entry and the kiosk power buttons).
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { HydraStoreProviders } from '../src/storeContexts';
import { StopAllButton, StopAllReportBanner, StopAllShortcut } from '../src/components/StopAll';
import { AuthGate } from '../src/components/AuthGate';
import type { StopAllReport } from '../src/lib/stopAll';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function provide(value: Record<string, unknown>, ui: React.ReactNode) {
  return render(<HydraStoreProviders value={value as never}>{ui}</HydraStoreProviders>);
}

function report(over: Partial<StopAllReport> = {}): StopAllReport {
  return {
    success: true,
    stoppedCount: 2,
    failedCount: 0,
    persisted: true,
    viaFallback: false,
    robots: [
      { robotId: 1, controllerId: 'c1', name: 'Arm A', stopped: true, valvesOff: 1, pumpsOff: 2, reservedBy: null, error: null },
      { robotId: 2, controllerId: 'c1', name: 'Arm B', stopped: true, valvesOff: 0, pumpsOff: 0, reservedBy: 'ana', error: null },
    ],
    ...over,
  };
}

describe('the global STOP button', () => {
  it('stops everything with ONE click and no confirmation', () => {
    const emergencyStop = vi.fn();
    provide({ emergencyStop, stopAllPending: false, commandIssue: null }, <StopAllButton />);
    fireEvent.click(screen.getByTestId('stop-all'));
    expect(emergencyStop).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is named with its keyboard chord for assistive technology', () => {
    provide({ emergencyStop: vi.fn(), stopAllPending: false, commandIssue: null }, <StopAllButton variant="footer" />);
    const button = screen.getByTestId('stop-all');
    expect(button.getAttribute('aria-label')).toContain('Ctrl+Shift+Space');
    expect(button.textContent).toContain('STOP');
  });
});

describe('the STOP keyboard chord', () => {
  function press(init: KeyboardEventInit) {
    // fireEvent returns false when the event was cancelled, that is when the chord was taken
    return !fireEvent.keyDown(window, init);
  }

  it('Ctrl+Shift+Space presses STOP even with a text field focused, and is not passed on to the page', () => {
    const emergencyStop = vi.fn();
    provide({ emergencyStop }, <><input aria-label="note" /><StopAllShortcut /></>);
    screen.getByLabelText('note').focus();
    expect(press({ code: 'Space', ctrlKey: true, shiftKey: true })).toBe(true);
    expect(emergencyStop).toHaveBeenCalledTimes(1);
  });

  it('ignores a chord with another modifier, a plain Space and a held key', () => {
    const emergencyStop = vi.fn();
    provide({ emergencyStop }, <StopAllShortcut />);
    expect(press({ code: 'Space' })).toBe(false);
    expect(press({ code: 'Space', ctrlKey: true })).toBe(false);
    expect(press({ code: 'Space', ctrlKey: true, shiftKey: true, altKey: true })).toBe(false);
    expect(press({ code: 'Space', ctrlKey: true, shiftKey: true, metaKey: true })).toBe(false);
    expect(press({ code: 'Space', ctrlKey: true, shiftKey: true, repeat: true })).toBe(false);
    expect(emergencyStop).not.toHaveBeenCalled();
  });

  it('stops listening when it is removed', () => {
    const emergencyStop = vi.fn();
    const view = provide({ emergencyStop }, <StopAllShortcut />);
    view.unmount();
    press({ code: 'Space', ctrlKey: true, shiftKey: true });
    expect(emergencyStop).not.toHaveBeenCalled();
  });
});

describe('the report of the STOP', () => {
  it('shows nothing before a stop', () => {
    provide({ stopAllReport: null, dismissStopAllReport: vi.fn(), emergencyStop: vi.fn() }, <StopAllReportBanner />);
    expect(screen.queryByTestId('stop-all-report')).toBeNull();
  });

  it('a clean result is a polite status that fades by itself after 8 seconds', () => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    provide({ stopAllReport: report(), dismissStopAllReport: dismiss, emergencyStop: vi.fn() }, <StopAllReportBanner />);
    const banner = screen.getByTestId('stop-all-report');
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.textContent).toContain('STOP: 2 stopped, 0 failed');
    expect(banner.textContent).toContain('valves off 1, pumps off 2');
    expect(banner.textContent).toContain('reserved by ana');
    expect(screen.queryByText('Try STOP again')).toBeNull();
    act(() => { vi.advanceTimersByTime(7999); });
    expect(dismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('a robot that did not stop is an assertive alert that stays and offers to try again', () => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    const emergencyStop = vi.fn();
    const failed = report({
      success: false,
      stoppedCount: 1,
      failedCount: 1,
      robots: [
        { robotId: 1, controllerId: null, name: 'Arm A', stopped: true, valvesOff: 0, pumpsOff: 0, reservedBy: null, error: null },
        { robotId: 2, controllerId: null, name: 'Arm B', stopped: false, valvesOff: 0, pumpsOff: 0, reservedBy: null, error: 'timeout' },
      ],
    });
    provide({ stopAllReport: failed, dismissStopAllReport: dismiss, emergencyStop }, <StopAllReportBanner />);
    const banner = screen.getByTestId('stop-all-report');
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.getAttribute('aria-live')).toBe('assertive');
    expect(banner.textContent).toContain('Arm B: NOT stopped - timeout');
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(dismiss).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Try STOP again'));
    expect(emergencyStop).toHaveBeenCalledTimes(1);
  });

  it('a stop the server could not save, and a stop by robot, are said in plain words; the cross dismisses', () => {
    const dismiss = vi.fn();
    provide(
      { stopAllReport: report({ persisted: false, viaFallback: true }), dismissStopAllReport: dismiss, emergencyStop: vi.fn() },
      <StopAllReportBanner />,
    );
    const banner = screen.getByTestId('stop-all-report');
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.textContent).toContain('The stop is applied, but the server could not save it.');
    expect(banner.textContent).toContain('Stopped robot by robot');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});

function gate(over: Record<string, unknown> = {}) {
  const login = vi.fn(async () => undefined);
  const reportCommandIssue = vi.fn();
  const value = { authToken: null, login, loginError: null, loginNeedsCode: false, reportCommandIssue, commandIssue: null, ...over };
  provide(value, <AuthGate><div data-testid="app">the app</div></AuthGate>);
  return { login, reportCommandIssue };
}

describe('the login gate', () => {
  it('lets a signed-in session straight through', () => {
    gate({ authToken: 'h.p.s' });
    expect(screen.getByTestId('app')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Username')).toBeNull();
  });

  it('asks for the credentials first and signs in with them, for the tab only by default', async () => {
    const { login } = gate();
    expect(screen.queryByTestId('app')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'ana' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/ }));
    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(login).toHaveBeenCalledWith('ana', 'secret', false, undefined);
  });

  it('"keep me signed in" is off until ticked and is passed on when it is', async () => {
    const { login } = gate();
    const keep = screen.getByRole('checkbox') as HTMLInputElement;
    expect(keep.checked).toBe(false);
    fireEvent.click(keep);
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'ana' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/ }));
    await waitFor(() => expect(login).toHaveBeenCalledWith('ana', 'x', true, undefined));
  });

  it('shows the answer of a refused login', () => {
    gate({ loginError: 'Wrong user or password' });
    expect(screen.getByText('Wrong user or password')).toBeTruthy();
  });

  it('asks for the second step only when the account needs it and sends the code with the credentials', async () => {
    const { login } = gate({ loginNeedsCode: true });
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'ana' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Two-step code or recovery code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/ }));
    await waitFor(() => expect(login).toHaveBeenCalledWith('ana', 'x', false, '123456'));
  });

  it('does not show the code field for an account without a second step', () => {
    gate();
    expect(screen.queryByLabelText('Two-step code or recovery code')).toBeNull();
  });

  it('"Continue read-only" opens the app without a session', () => {
    gate();
    fireEvent.click(screen.getByText('Continue read-only'));
    expect(screen.getByTestId('app')).toBeTruthy();
  });
});

describe('the kiosk power buttons of the login gate', () => {
  it('ask first: nothing is sent until the dialog is confirmed, and Cancel sends nothing', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    gate();
    fireEvent.click(screen.getByTitle('Shut Down'));
    expect(screen.getByRole('dialog').textContent).toContain('Shut down this device now?');
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a confirmed restart posts to the reboot route and the button says so', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    gate();
    fireEvent.click(screen.getByTitle('Restart'));
    expect(screen.getByRole('dialog').textContent).toContain('Restart this device now?');
    fireEvent.click(screen.getAllByRole('button').find((b) => b.textContent === 'Confirm') as HTMLElement);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/system/reboot');
    expect(init.method).toBe('POST');
    expect(screen.getByText('Restarting…')).toBeTruthy();
  });

  it('a refusal (not the device itself) recovers the buttons and reports why', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 403 }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    const { reportCommandIssue } = gate();
    fireEvent.click(screen.getByTitle('Shut Down'));
    fireEvent.click(screen.getAllByRole('button').find((b) => b.textContent === 'Confirm') as HTMLElement);
    await waitFor(() => expect(reportCommandIssue).toHaveBeenCalledTimes(1));
    expect(reportCommandIssue).toHaveBeenCalledWith({ code: 'power_failed', command: 'shutdown', robotIds: [], detail: '403' });
    expect((screen.getByTitle('Shut Down') as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByTitle('Restart') as HTMLButtonElement).disabled).toBe(false);
  });
});
