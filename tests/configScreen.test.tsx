// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/configScreen.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The configuration as a screen: the same tabs as the window, in four groups, none lost; no close button; the two remote access tabs share
// one button; it saves the way the window does.
// =============================================================================
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '../src/i18n';
import { defaultControllers } from '../src/store';
import { HydraStoreProviders } from '../src/storeContexts';
import { CONFIG_GROUPS, Config } from '../src/components/Config';
import { defaultSystemSettings } from '../src/lib/defaultSettings';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function renderScreen() {
  const updateSettings = vi.fn();
  const factoryReset = vi.fn();
  const controller = defaultControllers[0];
  const value = {
    authToken: 'tok', serverReachable: true, settings: defaultSystemSettings(), updateSettings, flushSettingsSave: vi.fn(),
    controllers: defaultControllers, activeController: controller, activeControllerId: controller.id,
    updateController: vi.fn(), updateRobot: vi.fn(), updateCamera: vi.fn(), addController: vi.fn(), removeController: vi.fn(), factoryReset,
  };
  render(<HydraStoreProviders value={value as never}><Config variant="screen" /></HydraStoreProviders>);
  return { updateSettings, factoryReset };
}

const tabButton = (id: string) => document.querySelector(`[data-config-tab="${id}"]`) as HTMLElement;

describe('the groups of the configuration', () => {
  it('hold every tab of the window exactly once', () => {
    const all = [...readFileSync('src/components/Config.tsx', 'utf8').matchAll(/\{ id: '([a-z]+)', label:/g)].map((match) => match[1]);
    const grouped = CONFIG_GROUPS.flatMap((group) => group.tabs.flatMap((item) => (typeof item === 'string' ? [item] : [...item])));
    expect(all).toHaveLength(20);
    expect([...grouped].sort()).toEqual([...all].sort());
  });

  it('have their names in the eight languages', () => {
    for (const language of ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt']) {
      const { nav } = JSON.parse(readFileSync(`src/locales/${language}.json`, 'utf8')) as { nav: Record<string, string> };
      for (const group of CONFIG_GROUPS) expect(nav[`settings_${group.id}`], `${language} ${group.id}`).toBeTruthy();
    }
  });
});

describe('Config as a screen', () => {
  it('shows four groups and no button that closes it, and saves like the window', () => {
    const { updateSettings } = renderScreen();
    expect(screen.getByTestId('config-screen')).toBeTruthy();
    expect(screen.getAllByRole('group')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My bench' } });
    expect(updateSettings).toHaveBeenCalledWith({ serverName: 'My bench' });
  });

  it('opens a tab from its group, and the two remote access tabs from one button', () => {
    renderScreen();
    fireEvent.click(tabButton('preferences'));
    expect(screen.getByTestId('preferences-tab')).toBeTruthy();
    expect(tabButton('remotesetup')).toBeNull();
    fireEvent.click(tabButton('remoteaccess'));
    expect(tabButton('remotesetup')).toBeTruthy();
    fireEvent.click(tabButton('remotesetup'));
    expect(tabButton('remotesetup').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-config-tab="remoteaccess"][aria-current="page"]')).toBeTruthy();
  });

  it('asks before the factory reset', () => {
    const { factoryReset } = renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /factory reset/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(factoryReset).not.toHaveBeenCalled();
  });
});
