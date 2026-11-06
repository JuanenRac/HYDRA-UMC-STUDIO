// =============================================================================
// HYDRA-UMC STUDIO - The preferences of the person: hooks/useSettingsPreferences.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The change of a setting by the person at the screen: an administrator changes the shared settings,
// any other account only its own choices (theme, language, layout), which stay in this browser (lib/settingsScope.ts).
// =============================================================================
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { planSettingsUpdate } from '../lib/settingsUpdate';
import { settingsSaveAllowed } from '../lib/settingsSave';
import { loadOverlay, saveOverlay, usernameFromToken } from '../lib/settingsScope';
import { browserStorage } from '../lib/robotDetailHelpers';
import type { CommandIssue } from '../lib/commandResult';
import type { SystemSettings } from '../store';

export interface SettingsPreferencesDeps {
  role: Parameters<typeof settingsSaveAllowed>[0];
  authToken: string | null;
  settingsRef: MutableRefObject<SystemSettings>;
  setSettings: Dispatch<SetStateAction<SystemSettings>>;
  skipNextSaveRef: MutableRefObject<boolean>;
  reportCommandIssue: (issue: Omit<CommandIssue, 'id'>) => void;
}

export function useSettingsPreferences({ role, authToken, settingsRef, setSettings, skipNextSaveRef, reportCommandIssue }: SettingsPreferencesDeps) {
  // An administrator changes any setting. Any other account changes only the local ones (theme, language, layout of the
  // panels: lib/settingsScope.ts), which stay in this browser; a global one is refused here and the interface says so
  // (the server refuses it as well).
  const updateSettings = (updates: Partial<SystemSettings>) => {
    const plan = planSettingsUpdate(settingsSaveAllowed(role), updates, settingsRef.current);
    if (plan.mode === 'global') {
      setSettings(prev => ({ ...prev, ...updates }));
      return;
    }
    if (plan.refusedKeys.length > 0) reportCommandIssue({ code: 'settings_admin_only', command: 'settings', robotIds: [], detail: plan.refusedKeys.join(', ') });
    if (Object.keys(plan.local).length === 0) return;
    const username = usernameFromToken(authToken);
    if (plan.changes) skipNextSaveRef.current = true;
    if (username) saveOverlay(browserStorage(), username, { ...loadOverlay(browserStorage(), username), ...plan.local });
    setSettings(prev => ({ ...prev, ...plan.local }));
  };

  return { updateSettings };
}
