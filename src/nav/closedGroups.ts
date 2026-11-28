// =============================================================================
// HYDRA-UMC STUDIO - src/nav/closedGroups.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// Which groups of the side menu are folded. The choice of the person is kept in this browser; until there is one, every group is open if the
// whole menu fits on the screen, else only "Operate" and the group of the screen shown.
import { NAV_GROUPS, type NavGroup } from './navModel';

export const CLOSED_GROUPS_KEY = 'hydra_nav_closed';
/** The height of a heading and of an entry (a finger needs 44 px), and of the top and status bars. */
export const GROUP_PX = 36;
export const ENTRY_PX = 44;
const BARS_PX = 104;

export function readClosedGroups(): NavGroup[] | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(CLOSED_GROUPS_KEY) ?? 'null') as unknown;
    return Array.isArray(value) ? NAV_GROUPS.filter((group) => value.includes(group)) : null;
  } catch {
    return null;
  }
}

export function writeClosedGroups(closed: readonly NavGroup[]): void {
  try {
    window.localStorage.setItem(CLOSED_GROUPS_KEY, JSON.stringify(closed));
  } catch {
    // a blocked storage only means the choice is not remembered
  }
}

export function defaultClosedGroups(height: number, sizes: ReadonlyArray<{ group: NavGroup; entries: number }>, current: NavGroup | undefined): NavGroup[] {
  const needed = sizes.reduce((sum, item) => sum + GROUP_PX + item.entries * ENTRY_PX, 0);
  if (needed <= height - BARS_PX) return [];
  return sizes.map((item) => item.group).filter((group) => group !== 'operate' && group !== current);
}
