// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/remoteAccessSetupTab.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The remote access setup: which kinds of app may find the server (the same setting as the Remote Access tab), the address and its QR code,
// the warning when the page was opened from the machine itself, and "close all", which asks before it changes anything.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '../src/i18n';
import { HydraStoreProviders } from '../src/storeContexts';
import { RemoteAccessSetupTab } from '../src/components/config/RemoteAccessSetupTab';
import { addressReachableFromOutside, allowedClients, clientAllowed, closeAllPatch, serverAddress } from '../src/lib/remoteSetupView';

afterEach(() => { cleanup(); });

function renderTab(remoteAccess: Record<string, boolean> | undefined, origin: string) {
  const updateSettings = vi.fn();
  const value = { settings: { remoteAccess }, updateSettings, flushSettingsSave: vi.fn() };
  render(<HydraStoreProviders value={value as never}><RemoteAccessSetupTab origin={origin} /></HydraStoreProviders>);
  return { updateSettings };
}

describe('remoteSetupView', () => {
  it('lets a client with no choice of its own follow the old combined switch, and allows it when there is neither', () => {
    expect(clientAllowed(undefined, 'ios')).toBe(true);
    expect(clientAllowed({ enabled: false }, 'ios')).toBe(false);
    expect(clientAllowed({ enabled: false, ios: true }, 'ios')).toBe(true);
    expect(allowedClients({ enabled: false, dsi: true })).toEqual(['dsi']);
  });

  it('builds the patch that closes every kind of app and keeps the rest of the setting', () => {
    expect(closeAllPatch({ enabled: true, ios: true })).toEqual({ enabled: true, suite: false, android: false, ios: false, watch: false, dsi: false });
    expect(allowedClients(closeAllPatch(undefined))).toEqual([]);
  });

  it('tells an address a phone can use from one only the machine can', () => {
    expect(addressReachableFromOutside('http://192.168.0.180:18100')).toBe(true);
    expect(addressReachableFromOutside('http://hydra.local')).toBe(true);
    expect(addressReachableFromOutside('http://localhost:5173')).toBe(false);
    expect(addressReachableFromOutside('http://127.0.0.1:18100')).toBe(false);
    expect(addressReachableFromOutside('not an address')).toBe(false);
    expect(serverAddress('http://x:1///')).toBe('http://x:1');
  });
});

describe('RemoteAccessSetupTab', () => {
  it('shows the address with its QR code and no warning for an address a phone can use', () => {
    renderTab({ suite: true, android: true, ios: false, watch: false, dsi: true }, 'http://192.168.0.180:18100');
    expect(screen.getByTestId('remote-setup-address').textContent).toBe('http://192.168.0.180:18100');
    expect(screen.getByTestId('remote-setup-qr')).toBeTruthy();
    expect(screen.queryByTestId('remote-setup-local')).toBeNull();
    expect(screen.getByTestId('remote-setup-count').textContent).toContain('3 of 5');
    expect((screen.getByTestId('remote-setup-ios') as HTMLInputElement).checked).toBe(false);
  });

  it('warns when the page was opened from the machine itself', () => {
    renderTab(undefined, 'http://localhost:5173');
    expect(screen.getByTestId('remote-setup-local').textContent).toContain('localhost');
  });

  it('changes one kind of app at a time with the same setting as the Remote Access tab', () => {
    const { updateSettings } = renderTab({ suite: true, android: true, ios: true, watch: true, dsi: true }, 'http://hydra.local');
    fireEvent.click(screen.getByTestId('remote-setup-watch'));
    expect(updateSettings).toHaveBeenCalledWith({ remoteAccess: { suite: true, android: true, ios: true, watch: false, dsi: true } });
  });

  it('asks before it closes everything', () => {
    const { updateSettings } = renderTab({ suite: true, android: true, ios: true, watch: true, dsi: true }, 'http://hydra.local');
    fireEvent.click(screen.getByTestId('remote-setup-close-all'));
    expect(updateSettings).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(updateSettings).toHaveBeenCalledWith({ remoteAccess: { suite: false, android: false, ios: false, watch: false, dsi: false } });
  });

  it('has nothing to close when every kind of app is already closed', () => {
    renderTab({ suite: false, android: false, ios: false, watch: false, dsi: false }, 'http://hydra.local');
    expect((screen.getByTestId('remote-setup-close-all') as HTMLButtonElement).disabled).toBe(true);
  });
});
