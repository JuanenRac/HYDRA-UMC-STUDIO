// =============================================================================
// HYDRA-UMC STUDIO - src/nav/navModel.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The one list of the screens of the dashboard: the internal key of each screen (the `activeTab`, also used by the tours, the gamepad and
// `?robotId`), the group it belongs to, whether only an administrator is offered it and which tab of the Help explains it. The menu, the
// screen switch, the Help and the assistant read it, so a new screen cannot be added in one place and forgotten in another.
import type { HelpTab } from '../assistant/helpTabs';

export const NAV_GROUPS = ['operate', 'work', 'equipment', 'boards', 'ecosystem', 'admin'] as const;
export type NavGroup = typeof NAV_GROUPS[number];

type Entry = { group: NavGroup; help: HelpTab; admin?: boolean };

/** In the order of the menu. */
export const SCREENS = {
  overview: { group: 'operate', help: 'start' },
  robot: { group: 'operate', help: 'robots' },
  cameras: { group: 'operate', help: 'cameras_gamepad' },
  cameraMedia: { group: 'operate', help: 'cameras_gamepad' },
  pickandplace: { group: 'work', help: 'modules' },
  cnc: { group: 'work', help: 'modules' },
  laser: { group: 'work', help: 'modules' },
  robots: { group: 'equipment', help: 'robots' },
  xytable: { group: 'equipment', help: 'modules' },
  atctools: { group: 'equipment', help: 'modules' },
  rack: { group: 'equipment', help: 'modules' },
  vacuumtable: { group: 'equipment', help: 'modules' },
  heatedbed: { group: 'equipment', help: 'modules' },
  hydraFlasher: { group: 'boards', help: 'firmware_settings' },
  hydraTester: { group: 'boards', help: 'firmware_settings' },
  kinematicBrainStage: { group: 'boards', help: 'firmware_settings' },
  flasher: { group: 'boards', help: 'firmware_settings' },
  tester: { group: 'boards', help: 'firmware_settings' },
  ecosystemServices: { group: 'ecosystem', help: 'ecosystem' },
  ecosystemMap: { group: 'ecosystem', help: 'ecosystem' },
  ecosystemHealth: { group: 'ecosystem', help: 'ecosystem' },
  ecosystemPlanning: { group: 'ecosystem', help: 'ecosystem' },
  ecosystemTelemetry: { group: 'ecosystem', help: 'ecosystem' },
  aiFamilyStatus: { group: 'ecosystem', help: 'ecosystem' },
  aiDashboard: { group: 'ecosystem', help: 'ecosystem' },
  adminClients: { group: 'admin', help: 'accounts_access', admin: true },
  adminLogs: { group: 'admin', help: 'accounts_access', admin: true },
  adminAudit: { group: 'admin', help: 'accounts_access', admin: true },
  adminSafety: { group: 'admin', help: 'accounts_access', admin: true },
  adminServer: { group: 'admin', help: 'accounts_access', admin: true },
  systemSupervisor: { group: 'admin', help: 'ecosystem', admin: true },
  /** The configuration: a window over the screen in the classic menu. */
  settings: { group: 'admin', help: 'firmware_settings' },
} as const satisfies Record<string, Entry>;

export type ViewId = keyof typeof SCREENS;
export const VIEW_IDS = Object.keys(SCREENS) as ViewId[];

export function screenOf(view: string): Entry | undefined {
  return Object.prototype.hasOwnProperty.call(SCREENS, view) ? SCREENS[view as ViewId] : undefined;
}
