// =============================================================================
// HYDRA-UMC STUDIO - src/lib/studioPrefs.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The personal preferences of this browser: which level of the Help opens first, how dense the interface is, and whether the
// animations are reduced. They live in localStorage only (a convenience of this browser, never sent to the server), are read
// defensively (a blocked or damaged storage gives the defaults) and are applied to the page as attributes of the root element.
import { useSyncExternalStore } from 'react';
import { bool, browserStorage, createPrefs, oneOf, type Prefs, type Validator } from 'hydra-umc-studio-kit';

export const MAX_LISTEN_ONLY_SERVERS = 50;
/** A list of short texts without repeats, at most MAX_LISTEN_ONLY_SERVERS long; anything else takes the default (an empty list). */
export const originList: Validator<string[]> = (value) => {
  if (!Array.isArray(value) || value.length > MAX_LISTEN_ONLY_SERVERS) return undefined;
  if (!value.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 200)) return undefined;
  return [...new Set(value as string[])];
};

export const HELP_LEVELS = ['all', 'basic', 'advanced', 'technical'] as const;
export const DENSITIES = ['comfortable', 'compact'] as const;
export type StudioPrefs = {
  helpLevel: (typeof HELP_LEVELS)[number];
  density: (typeof DENSITIES)[number];
  reduceMotion: boolean;
  /** Listen only: this window shows the robots and their data but sends no robot command except STOP and the safe-mode disable. */
  listenOnly: boolean;
  /** Listen only for some servers only: the origins (scheme, host and port) whose requests this window keeps read-only. */
  listenOnlyServers: string[];
};

export const STUDIO_PREFS_KEY = 'hydra_studio_prefs';
export const STUDIO_DEFAULTS: StudioPrefs = { helpLevel: 'all', density: 'comfortable', reduceMotion: false, listenOnly: false, listenOnlyServers: [] };

let prefs: Prefs<StudioPrefs> | null = null;

function store(): Prefs<StudioPrefs> {
  prefs ??= createPrefs<StudioPrefs>({
    storage: browserStorage('localStorage'),
    key: STUDIO_PREFS_KEY,
    defaults: STUDIO_DEFAULTS,
    schema: { helpLevel: oneOf(...HELP_LEVELS), density: oneOf(...DENSITIES), reduceMotion: bool, listenOnly: bool, listenOnlyServers: originList },
  });
  return prefs;
}

export function getStudioPrefs(): StudioPrefs {
  return store().get();
}

export function setStudioPrefs(patch: Partial<StudioPrefs>): void {
  store().set(patch);
  applyStudioPrefs(getStudioPrefs());
}

export function resetStudioPrefs(): void {
  store().reset();
  applyStudioPrefs(getStudioPrefs());
}

/** Writes the preferences on the root element, where the style sheet reads them. */
export function applyStudioPrefs(value: StudioPrefs, root: HTMLElement | undefined = typeof document === 'undefined' ? undefined : document.documentElement): void {
  if (!root) return;
  root.dataset.density = value.density;
  root.dataset.motion = value.reduceMotion ? 'reduced' : 'full';
}

const subscribe = (listener: () => void): (() => void) => store().subscribe(listener);

export function useStudioPrefs(): StudioPrefs {
  return useSyncExternalStore(subscribe, getStudioPrefs, getStudioPrefs);
}
