/**
 * How the screens of the Dashboard map to the tabs of the Help, and how the paragraphs of a tab are read (the Help text lives in the locale files, under "help.tabs").
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0
 */
import type { TFunction } from 'i18next';
import { screenOf } from '../nav/navModel';

export const HELP_TABS = ['start', 'robots', 'trajectories', 'modules', 'cameras_gamepad', 'firmware_settings', 'accounts_access', 'ecosystem'] as const;
export type HelpTab = typeof HELP_TABS[number];

/** The Help tab that explains a Dashboard screen: each screen names its own in the list of navigation. */
export function helpTabOf(view: string): HelpTab {
  return screenOf(view)?.help ?? 'start';
}

/** The paragraphs of a Help tab in the language of the interface (empty when the tab has none). */
export function paragraphsOfTab(t: TFunction | ((key: string, options?: Record<string, unknown>) => unknown), tab: string): string[] {
  const value = (t as (key: string, options?: Record<string, unknown>) => unknown)(`help.tabs.${tab}.paragraphs`, { returnObjects: true });
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
