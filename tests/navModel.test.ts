// =============================================================================
// HYDRA-UMC STUDIO - tests/navModel.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The one list of screens: every screen is drawn, can be reached from the menu and is explained by a tab of the Help of its own.
// =============================================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HELP_TABS, helpTabOf } from '../src/assistant/helpTabs';
import { TOPICS } from '../src/assistant/knowledge';
import { NAV_GROUPS, SCREENS, VIEW_IDS, screenOf } from '../src/nav/navModel';
import { TOURS } from '../src/tour/tours';

const read = (file: string): string => readFileSync(file, 'utf8');

describe('the list of screens', () => {
  it('gives every screen a known group and a tab of the Help that exists', () => {
    for (const view of VIEW_IDS) {
      expect(NAV_GROUPS, view).toContain(SCREENS[view].group);
      expect(HELP_TABS, view).toContain(helpTabOf(view));
    }
  });

  it('explains each screen with its own tab and not with "getting started"', () => {
    expect(VIEW_IDS.filter((view) => view !== 'overview' && helpTabOf(view) === 'start')).toEqual([]);
    for (const view of ['xytable', 'atctools', 'rack', 'pickandplace', 'cnc', 'laser', 'vacuumtable', 'heatedbed']) expect(helpTabOf(view), view).toBe('modules');
    expect(helpTabOf('robots')).toBe('robots');
    expect(helpTabOf('ecosystemMap')).toBe('ecosystem');
    expect(helpTabOf('adminSafety')).toBe('accounts_access');
    expect(helpTabOf('adminAudit')).toBe('accounts_access');
    expect(helpTabOf('nothing')).toBe('start');
    expect(screenOf('toString')).toBeUndefined();
  });

  it('draws every screen', () => {
    const host = read('src/nav/ScreenHost.tsx');
    for (const view of VIEW_IDS) {
      if (view === 'settings') continue;
      expect(host.includes(`view === '${view}'`) || host.includes(`  ${view}: () =>`), view).toBe(true);
    }
  });

  it('reaches every screen from the classic menu', () => {
    const menu = read('src/nav/ClassicSidebar.tsx');
    const industrial = ['robots', 'xytable', 'atctools', 'rack', 'pickandplace', 'cnc', 'laser', 'vacuumtable', 'heatedbed'];
    for (const view of VIEW_IDS) {
      if (view === 'settings' || industrial.includes(view)) continue;
      expect(menu.includes(`'${view}'`), view).toBe(true);
    }
    expect(menu).toContain("['Robots', 'XY Table', 'ATC Tools', 'Rack', 'PickAndPlace', 'CNC', 'Laser', 'VacuumTable', 'HeatedBed']");
  });

  it('is what the tours and the questions of the assistant point at', () => {
    for (const tour of TOURS) for (const step of tour.steps) if (step.view) expect(screenOf(step.view), `${tour.id}: ${step.view}`).toBeDefined();
    for (const topic of TOPICS) expect(screenOf(topic.view), `${topic.id}: ${topic.view}`).toBeDefined();
  });
});
