// =============================================================================
// HYDRA-UMC STUDIO - src/lib/studioPrefs.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The personal preferences of this browser: which level of the Help opens first, how dense the interface is, and whether the
// animations are reduced. They live in localStorage only (a convenience of this browser, never sent to the server), are read
// defensively (a blocked or damaged storage gives the defaults) and are applied to the page as attributes of the root element.
import { useSyncExternalStore } from 'react';
import { bool, browserStorage, createPrefs, oneOf, type Prefs } from 'hydra-umc-studio-kit';

export const HELP_LEVELS = ['all', 'basic', 'advanced', 'technical'] as const;
export const DENSITIES = ['comfortable', 'compact'] as const;
export type StudioPrefs = {
  helpLevel: (typeof HELP_LEVELS)[number];
  density: (typeof DENSITIES)[number];
  reduceMotion: boolean;
};

export const STUDIO_PREFS_KEY = 'hydra_studio_prefs';
export const STUDIO_DEFAULTS: StudioPrefs = { helpLevel: 'all', density: 'comfortable', reduceMotion: false };

let prefs: Prefs<StudioPrefs> | null = null;

function store(): Prefs<StudioPrefs> {
  prefs ??= createPrefs<StudioPrefs>({
    storage: browserStorage('localStorage'),
    key: STUDIO_PREFS_KEY,
    defaults: STUDIO_DEFAULTS,
    schema: { helpLevel: oneOf(...HELP_LEVELS), density: oneOf(...DENSITIES), reduceMotion: bool },
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
