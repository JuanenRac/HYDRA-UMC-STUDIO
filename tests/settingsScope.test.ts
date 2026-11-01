// =============================================================================
// HYDRA-UMC STUDIO - tests/settingsScope.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { LOCAL_SETTING_KEYS, applyOverlay, loadOverlay, overlayKey, saveOverlay, splitSettingsUpdate, usernameFromToken } from '../src/lib/settingsScope';

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe('local and global settings', () => {
  it('reads the keys that stay in this browser from the configuration file', () => {
    expect(LOCAL_SETTING_KEYS).toEqual(['theme', 'language', 'uiLayout']);
  });

  it('splits an update into the part that stays here and the part the administrator owns', () => {
    const parts = splitSettingsUpdate({ theme: 'Nord', serverName: 'Cell', language: 'de' } as never);
    expect(parts.local).toEqual({ theme: 'Nord', language: 'de' });
    expect(parts.global).toEqual({ serverName: 'Cell' });
    expect(parts.hasLocal && parts.hasGlobal).toBe(true);
    expect(splitSettingsUpdate({ theme: 'Nord' } as never).hasGlobal).toBe(false);
    expect(splitSettingsUpdate({ serverName: 'x' } as never).hasLocal).toBe(false);
    expect(splitSettingsUpdate({}).hasLocal).toBe(false);
  });

  it('keeps the local choices of each account apart and ignores anything that is not a local key', () => {
    const storage = memory();
    saveOverlay(storage, 'ana', { theme: 'Nord', serverName: 'hack' } as never);
    expect(loadOverlay(storage, 'ana')).toEqual({ theme: 'Nord' });
    expect(loadOverlay(storage, 'bob')).toEqual({});
    expect(overlayKey('ana')).not.toBe(overlayKey('bob'));
  });

  it('survives a storage that is missing, full or holds nonsense', () => {
    expect(loadOverlay(null, 'ana')).toEqual({});
    const broken = { getItem: () => '{not json', setItem: () => { throw new Error('full'); } };
    expect(loadOverlay(broken, 'ana')).toEqual({});
    expect(() => saveOverlay(broken, 'ana', { theme: 'x' } as never)).not.toThrow();
    const array = { getItem: () => '[1,2]', setItem: () => undefined };
    expect(loadOverlay(array, 'ana')).toEqual({});
  });

  it('puts the local choices over the settings of the server and nothing else', () => {
    const merged = applyOverlay({ theme: 'Dracula', language: 'en', serverName: 'Cell' } as never, { theme: 'Nord' } as never);
    expect(merged).toEqual({ theme: 'Nord', language: 'en', serverName: 'Cell' });
    const same = { theme: 'Nord' } as never;
    expect(applyOverlay(same, { theme: 'Nord' } as never)).toBe(same);
  });

  it('reads the account name from the session token', () => {
    const token = `h.${btoa(JSON.stringify({ username: 'ana', role: 'operator' })).replace(/=+$/, '')}.s`;
    expect(usernameFromToken(token)).toBe('ana');
    expect(usernameFromToken('nonsense')).toBeNull();
    expect(usernameFromToken(null)).toBeNull();
  });
});
