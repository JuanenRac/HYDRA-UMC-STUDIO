// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/providerLiveAndPreferences.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The two parts moved out of the provider: the state of the live link with the server (useLiveStatus) and the change of a setting by the
// person at the screen (useSettingsPreferences): an administrator changes the shared settings, any other account only its own choices.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useLiveStatus } from '../src/hooks/useLiveStatus';
import { useSettingsPreferences } from '../src/hooks/useSettingsPreferences';
import { LOCAL_SETTING_KEYS, overlayKey } from '../src/lib/settingsScope';
import { defaultSystemSettings } from '../src/lib/defaultSettings';
import type { SystemSettings } from '../src/store';

beforeEach(() => { window.localStorage.clear(); });
afterEach(cleanup);

describe('useLiveStatus', () => {
  it('starts with nothing confirmed: not reachable, no save error, nothing refused, no progress', () => {
    const { result } = renderHook(() => useLiveStatus());
    expect(result.current.serverReachable).toBe(false);
    expect(result.current.settingsSaveError).toBeNull();
    expect(result.current.operatorEdited).toBe(false);
    expect(result.current.settingsLoadError).toBeNull();
    expect(result.current.canotaProgress).toBeNull();
    expect(result.current.logsClearedAt).toBeNull();
  });

  it('keeps each value apart from the others', () => {
    const { result } = renderHook(() => useLiveStatus());
    act(() => {
      result.current.setServerReachable(true);
      result.current.setSettingsLoadError('login_required');
      result.current.setCanotaProgress({ phase: 'flashing', percent: 40 });
      result.current.setLogsClearedAt({ anchor: 'a' });
    });
    expect(result.current.serverReachable).toBe(true);
    expect(result.current.settingsLoadError).toBe('login_required');
    expect(result.current.canotaProgress).toEqual({ phase: 'flashing', percent: 40 });
    expect(result.current.logsClearedAt).toEqual({ anchor: 'a' });
    expect(result.current.settingsSaveError).toBeNull();
    act(() => { result.current.setSettingsSaveError('failed'); result.current.setOperatorEdited(true); });
    expect(result.current.settingsSaveError).toBe('failed');
    expect(result.current.operatorEdited).toBe(true);
  });

  it('gives the setters the same identity on every render', () => {
    const { result, rerender } = renderHook(() => useLiveStatus());
    const before = result.current.setServerReachable;
    rerender();
    expect(result.current.setServerReachable).toBe(before);
  });
});

function tokenOf(username: string): string {
  const payload = btoa(JSON.stringify({ username })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `h.${payload}.s`;
}

function setup(role: 'admin' | 'operator' | 'viewer' | null, token: string | null) {
  let settings: SystemSettings = defaultSystemSettings();
  const settingsRef = { current: settings };
  const setSettings = vi.fn((update: SystemSettings | ((prev: SystemSettings) => SystemSettings)) => {
    settings = typeof update === 'function' ? update(settings) : update;
    settingsRef.current = settings;
  });
  const skipNextSaveRef = { current: false };
  const reportCommandIssue = vi.fn();
  const { result } = renderHook(() => useSettingsPreferences({ role, authToken: token, settingsRef, setSettings: setSettings as never, skipNextSaveRef, reportCommandIssue }));
  return { update: result.current.updateSettings, settings: () => settings, setSettings, skipNextSaveRef, reportCommandIssue };
}

describe('useSettingsPreferences', () => {
  const localKey = LOCAL_SETTING_KEYS[0] as keyof SystemSettings;

  it('lets an administrator change any setting', () => {
    const { update, settings, reportCommandIssue, skipNextSaveRef } = setup('admin', tokenOf('boss'));
    update({ serverName: 'Bench' });
    expect(settings().serverName).toBe('Bench');
    expect(reportCommandIssue).not.toHaveBeenCalled();
    expect(skipNextSaveRef.current).toBe(false);
    expect(window.localStorage.length).toBe(0);
  });

  it('keeps the local choices of another account in this browser and refuses the shared ones, saying which', () => {
    const { update, settings, reportCommandIssue, skipNextSaveRef } = setup('operator', tokenOf('ana'));
    const value = JSON.parse(JSON.stringify(settings()[localKey])) === 'x' ? 'y' : 'x';
    update({ [localKey]: value, serverName: 'Hacked' } as Partial<SystemSettings>);
    expect(settings().serverName).not.toBe('Hacked');
    expect((settings() as unknown as Record<string, unknown>)[localKey as string]).toBe(value);
    expect(reportCommandIssue).toHaveBeenCalledWith({ code: 'settings_admin_only', command: 'settings', robotIds: [], detail: 'serverName' });
    expect(JSON.parse(window.localStorage.getItem(overlayKey('ana')) ?? '{}')).toEqual({ [localKey as string]: value });
    expect(skipNextSaveRef.current).toBe(true);
  });

  it('does nothing when a viewer asks only for a shared setting, except saying it is refused', () => {
    const { update, settings, setSettings, reportCommandIssue, skipNextSaveRef } = setup('viewer', tokenOf('vi'));
    const before = settings();
    update({ serverName: 'Nope' });
    expect(settings()).toBe(before);
    expect(setSettings).not.toHaveBeenCalled();
    expect(reportCommandIssue).toHaveBeenCalledTimes(1);
    expect(skipNextSaveRef.current).toBe(false);
    expect(window.localStorage.length).toBe(0);
  });

  it('keeps the local choice on screen even without a name to save it under', () => {
    const { update, settings, reportCommandIssue } = setup('operator', null);
    const value = 'zz';
    update({ [localKey]: value } as Partial<SystemSettings>);
    expect((settings() as unknown as Record<string, unknown>)[localKey as string]).toBe(value);
    expect(reportCommandIssue).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
  });
});
