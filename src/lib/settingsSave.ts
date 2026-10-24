// =============================================================================
// HYDRA-UMC STUDIO - src/lib/settingsSave.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// Who may save the settings tree. POST /api/settings (the whole tree: settings, controllers, their robots and the
// recorded points) is administrator-only on the server. An operator's session can drive the robots through the
// atomic commands, but every edit of the tree it makes (a camera view, a recorded point, a panel width) used to be
// sent anyway, refused with a 403 and shown as a pulsing "Save failed - Retry". The edit now stays in this window,
// nothing is sent, and the header says so once instead of failing after every change.

/** False for an operator's or a viewer's session: it does not send the settings tree, which the server would refuse. */
export function settingsSaveAllowed(role: string | null): boolean {
  return role !== 'operator' && role !== 'viewer';
}

/** True when this window holds edits of the settings tree that the account cannot save on the server. */
export function settingsLocalOnly(role: string | null, edited: boolean): boolean {
  return edited && !settingsSaveAllowed(role);
}
