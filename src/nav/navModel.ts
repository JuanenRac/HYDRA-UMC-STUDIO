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

export type MenuEntry = {
  /** The id of the entry; the screen it opens first is the first of `views`. */
  id: string;
  group: NavGroup;
  /** The catalogue key of its name. */
  label: string;
  /** The screens it holds; with more than one, the screen shows a row to choose among them. */
  views: readonly ViewId[];
  /** The part of the page the tours light up. */
  tour?: string;
};

const entry = (group: NavGroup, label: string, ...views: [ViewId, ...ViewId[]]): MenuEntry => ({ id: views[0], group, label, views });

/** The grouped side menu, in order. */
export const MENU: readonly MenuEntry[] = [
  { ...entry('operate', 'dashboard.overview', 'overview'), tour: 'nav-overview' },
  entry('operate', 'nav.robots', 'robot'),
  { ...entry('operate', 'nav.cameras', 'cameras'), tour: 'nav-cameras' },
  entry('operate', 'nav.recordings', 'cameraMedia'),
  entry('work', 'nav.pickandplace', 'pickandplace'),
  entry('work', 'nav.cnc', 'cnc'),
  entry('work', 'nav.laser', 'laser'),
  entry('equipment', 'nav.catalog', 'robots'),
  entry('equipment', 'nav.xytable', 'xytable'),
  entry('equipment', 'nav.toolchanger', 'atctools'),
  entry('equipment', 'nav.rack', 'rack'),
  entry('equipment', 'nav.vacuumtable', 'vacuumtable'),
  entry('equipment', 'nav.heatedbed', 'heatedbed'),
  entry('boards', 'nav.hydra_firmware', 'hydraFlasher'),
  entry('boards', 'nav.hydra_tests', 'hydraTester'),
  entry('boards', 'nav.kinematic', 'kinematicBrainStage'),
  entry('boards', 'nav.urtc_firmware', 'flasher'),
  entry('boards', 'nav.urtc_tests', 'tester'),
  entry('ecosystem', 'common.services', 'ecosystemServices'),
  entry('ecosystem', 'nav.map', 'ecosystemMap'),
  entry('ecosystem', 'nav.health', 'ecosystemHealth'),
  entry('ecosystem', 'nav.planning', 'ecosystemPlanning'),
  entry('ecosystem', 'common.telemetry', 'ecosystemTelemetry'),
  entry('ecosystem', 'nav.ai', 'aiFamilyStatus', 'aiDashboard'),
  entry('admin', 'nav.connections', 'adminClients'),
  entry('admin', 'nav.logs_audit', 'adminLogs', 'adminAudit'),
  entry('admin', 'nav.safety', 'adminSafety'),
  entry('admin', 'nav.server', 'adminServer', 'systemSupervisor'),
  entry('admin', 'nav.settings', 'settings'),
];

/** The names of the screens that share an entry, for the row that chooses among them. */
export const VIEW_TABS: Partial<Record<ViewId, string>> = {
  aiFamilyStatus: 'ecosystem.menu_ai_family',
  aiDashboard: 'ecosystem.menu_ai_dashboard',
  adminLogs: 'ecosystem.menu_logs',
  adminAudit: 'ecosystem.menu_audit',
  adminServer: 'ecosystem.menu_admin',
  systemSupervisor: 'ecosystem.menu_supervisor',
};

/** The entry of the menu that holds a screen. */
export function entryOf(view: string): MenuEntry | undefined {
  return MENU.find((item) => (item.views as readonly string[]).includes(view));
}
