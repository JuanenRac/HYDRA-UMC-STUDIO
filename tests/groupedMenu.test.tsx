// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/groupedMenu.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The grouped side menu: every screen is reached from one entry, groups fold and are remembered, administration is for administrators,
// and the row over a screen chooses the robot or the screens that share an entry.
// =============================================================================
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '../src/i18n';
import { HydraStoreProviders } from '../src/storeContexts';
import { GroupedSidebar } from '../src/nav/GroupedSidebar';
import { ScreenChooser } from '../src/nav/ScreenChooser';
import { CLOSED_GROUPS_KEY, defaultClosedGroups, readClosedGroups } from '../src/nav/closedGroups';
import { MENU, NAV_GROUPS, SCREENS, VIEW_IDS, VIEW_TABS, entryOf } from '../src/nav/navModel';
import { defaultControllers } from '../src/store';
import { getSelectedRobotId } from '../src/lib/selectedRobot';

const LANGUAGES = ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt'];

afterEach(() => { cleanup(); window.localStorage.clear(); });

const provide = (ui: React.ReactNode, over: Record<string, unknown> = {}) =>
  render(<HydraStoreProviders value={{ isAdmin: true, robots: defaultControllers[0].robots, ...over } as never}>{ui}</HydraStoreProviders>);
const openAll = () => { for (const heading of document.querySelectorAll('[data-nav-group][aria-expanded="false"]')) fireEvent.click(heading); };
const entries = () => [...document.querySelectorAll('[data-nav]')].map((element) => element.getAttribute('data-nav'));

describe('the entries of the grouped menu', () => {
  it('hold every screen exactly once, in its own group', () => {
    expect(MENU.flatMap((item) => item.views).sort()).toEqual([...VIEW_IDS].sort());
    for (const item of MENU) for (const view of item.views) expect(SCREENS[view].group, view).toBe(item.group);
    for (const item of MENU) if (item.views.length > 1) for (const view of item.views) expect(VIEW_TABS[view], view).toBeTruthy();
  });

  it('have their names and the names of the groups in the eight languages', () => {
    const keys = [...MENU.map((item) => item.label), ...Object.values(VIEW_TABS), ...NAV_GROUPS.map((group) => `nav.group_${group}`)] as string[];
    for (const language of LANGUAGES) {
      const catalog = JSON.parse(readFileSync(`src/locales/${language}.json`, 'utf8')) as Record<string, unknown>;
      for (const key of keys) {
        const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], catalog);
        // the supervisor tab keeps the default it had in the classic menu
        if (key !== 'ecosystem.menu_supervisor') expect(typeof value, `${language} ${key}`).toBe('string');
      }
    }
  });

  it('keep every group open when the whole menu fits, else Operate and the current one', () => {
    const sizes = [{ group: 'operate' as const, entries: 4 }, { group: 'work' as const, entries: 3 }, { group: 'ecosystem' as const, entries: 6 }];
    expect(defaultClosedGroups(2000, sizes, 'work')).toEqual([]);
    expect(defaultClosedGroups(480, sizes, 'ecosystem')).toEqual(['work']);
    expect(defaultClosedGroups(480, sizes, undefined)).toEqual(['work', 'ecosystem']);
  });
});

describe('GroupedSidebar', () => {
  it('opens a screen from its entry and marks the one shown', () => {
    const go = vi.fn();
    provide(<GroupedSidebar open view="overview" go={go} />);
    openAll();
    expect(entries()).toEqual(MENU.map((item) => item.id));
    expect(document.querySelector('[data-nav="overview"]')?.getAttribute('aria-current')).toBe('page');
    fireEvent.click(document.querySelector('[data-nav="xytable"]')!);
    expect(go).toHaveBeenCalledWith('xytable');
    fireEvent.click(document.querySelector('[data-nav="settings"]')!);
    expect(go).toHaveBeenCalledWith('settings');
  });

  it('does not offer administration to an account that is not an administrator', () => {
    provide(<GroupedSidebar open view="overview" go={vi.fn()} />, { isAdmin: false });
    openAll();
    expect(document.querySelector('[data-nav-group="admin"]')).toBeNull();
    expect(entries()).toEqual(MENU.filter((item) => item.group !== 'admin').map((item) => item.id));
  });

  it('folds a group, remembers it, and opens the group of a screen opened elsewhere', () => {
    const view = provide(<GroupedSidebar open view="overview" go={vi.fn()} />);
    openAll();
    fireEvent.click(document.querySelector('[data-nav-group="work"]')!);
    expect(document.querySelector('[data-nav="cnc"]')).toBeNull();
    expect(readClosedGroups()).toContain('work');
    view.rerender(<HydraStoreProviders value={{ isAdmin: true, robots: [] } as never}><GroupedSidebar open view="cnc" go={vi.fn()} /></HydraStoreProviders>);
    expect(document.querySelector('[data-nav="cnc"]')).not.toBeNull();
  });

  it('takes a damaged memory as no memory', () => {
    window.localStorage.setItem(CLOSED_GROUPS_KEY, '{oops');
    expect(readClosedGroups()).toBeNull();
    window.localStorage.setItem(CLOSED_GROUPS_KEY, '["work","nonsense"]');
    expect(readClosedGroups()).toEqual(['work']);
  });
});

describe('ScreenChooser', () => {
  it('chooses the robot over the robot panel', () => {
    provide(<ScreenChooser view="robot" setView={vi.fn()} selectedRobotId={1} />);
    const second = defaultControllers[0].robots[1];
    fireEvent.click(screen.getByRole('button', { name: new RegExp(second.name) }));
    expect(getSelectedRobotId()).toBe(second.id);
  });

  it('chooses among the screens of one entry and is not drawn for the others', () => {
    const setView = vi.fn();
    provide(<ScreenChooser view="adminLogs" setView={setView} selectedRobotId={1} />);
    expect(entryOf('adminAudit')?.id).toBe('adminLogs');
    fireEvent.click(screen.getByRole('button', { name: /audit record/i }));
    expect(setView).toHaveBeenCalledWith('adminAudit');
    cleanup();
    provide(<ScreenChooser view="cnc" setView={setView} selectedRobotId={1} />);
    expect(screen.queryByTestId('screen-chooser')).toBeNull();
  });
});
