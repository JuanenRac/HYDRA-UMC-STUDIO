// =============================================================================
// HYDRA-UMC STUDIO - local and global settings: settingsScope.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The settings of the system are of two kinds. The global ones (what is connected, the integrations, the paths, the
// security) belong to the installation: only an administrator changes them, and the server refuses everyone else.
// The local ones (the theme, the language, the layout of the panels) are a choice of the person in front of the
// screen: an operator or a viewer changes them, they stay in this browser under that account and never reach the
// server. Which keys are local is in src/config/localSettings.json.
// =============================================================================
import localSettings from '../config/localSettings.json';
import type { SystemSettings } from '../store';

export const LOCAL_SETTING_KEYS: readonly string[] = localSettings.keys;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface SettingsParts {
  local: Partial<SystemSettings>;
  global: Partial<SystemSettings>;
  hasLocal: boolean;
  hasGlobal: boolean;
}

/** Cuts an update of the settings into the local part and the global part. */
export function splitSettingsUpdate(updates: Partial<SystemSettings>): SettingsParts {
  const local: Record<string, unknown> = {};
  const global: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) (LOCAL_SETTING_KEYS.includes(key) ? local : global)[key] = value;
  return { local: local as Partial<SystemSettings>, global: global as Partial<SystemSettings>, hasLocal: Object.keys(local).length > 0, hasGlobal: Object.keys(global).length > 0 };
}

export const overlayKey = (username: string): string => `hydra.localSettings.${username}`;

/** The local choices saved for an account; empty when there are none, the storage is missing or what it holds is not an object. */
export function loadOverlay(storage: StorageLike | null | undefined, username: string): Partial<SystemSettings> {
  try {
    const raw = storage?.getItem(overlayKey(username));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return splitSettingsUpdate(parsed as Partial<SystemSettings>).local;
  } catch {
    return {};
  }
}

/** Saves the local choices of an account (only local keys are kept). A full or missing storage only means the choice does not last. */
export function saveOverlay(storage: StorageLike | null | undefined, username: string, overlay: Partial<SystemSettings>): void {
  try {
    storage?.setItem(overlayKey(username), JSON.stringify(splitSettingsUpdate(overlay).local));
  } catch {
    /* the choice only lasts while the page lives */
  }
}

/** The settings of the server with the local choices over them; the same object when nothing changes. */
export function applyOverlay(settings: SystemSettings, overlay: Partial<SystemSettings>): SystemSettings {
  const local = splitSettingsUpdate(overlay).local as Record<string, unknown>;
  const current = settings as unknown as Record<string, unknown>;
  const changed = Object.keys(local).some((k) => JSON.stringify(current[k]) !== JSON.stringify(local[k]));
  return changed ? ({ ...settings, ...local } as SystemSettings) : settings;
}

/** The account name inside a session token (no check of the signature: only used to find the local choices). */
export function usernameFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload?.username === 'string' && payload.username !== '' ? payload.username : null;
  } catch {
    return null;
  }
}
