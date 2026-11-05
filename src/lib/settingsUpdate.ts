// =============================================================================
// HYDRA-UMC STUDIO - Who may change which setting: lib/settingsUpdate.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The decision of updateSettings: an administrator changes any setting; any other account changes only the local ones
// (theme, language, layout of the panels), which stay in this browser, and a global one is refused. Pure: the provider
// does the effects. Moved out of HydraProvider unchanged.
// =============================================================================
import { splitSettingsUpdate } from './settingsScope';
import type { SystemSettings } from '../store';

export type SettingsUpdatePlan =
  | { mode: 'global' }
  | {
      mode: 'local';
      /** Keys of the global settings that were asked for and are refused (empty when none). */
      refusedKeys: string[];
      /** The local settings to keep; empty when the update had none. */
      local: Partial<SystemSettings>;
      /** Whether the local settings change the current ones (then the next save is skipped, the server does not need them). */
      changes: boolean;
    };

export function planSettingsUpdate(mayEditGlobal: boolean, updates: Partial<SystemSettings>, current: SystemSettings): SettingsUpdatePlan {
  if (mayEditGlobal) return { mode: 'global' };
  const parts = splitSettingsUpdate(updates);
  const refusedKeys = parts.hasGlobal ? Object.keys(parts.global) : [];
  if (!parts.hasLocal) return { mode: 'local', refusedKeys, local: {}, changes: false };
  const next = { ...current, ...parts.local };
  return { mode: 'local', refusedKeys, local: parts.local as Partial<SystemSettings>, changes: JSON.stringify(next) !== JSON.stringify(current) };
}
