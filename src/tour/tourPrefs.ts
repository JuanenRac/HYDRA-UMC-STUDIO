// =============================================================================
// HYDRA-UMC STUDIO - src/tour/tourPrefs.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The switch of the guided tours: when it is off, the buttons that start a tour are not shown and a tour that is open closes. It lives in
// localStorage only (a convenience of this browser, never sent to the server) and a blocked or damaged storage gives the default (on).
// =============================================================================
import { useSyncExternalStore } from 'react';
import { bool, browserStorage, createPrefs, type Prefs } from 'hydra-umc-studio-kit';

export type TourPrefs = { tours: boolean };
export const TOUR_PREFS_KEY = 'hydra_studio_tours';
export const TOUR_DEFAULTS: TourPrefs = { tours: true };

let prefs: Prefs<TourPrefs> | null = null;

function store(): Prefs<TourPrefs> {
  prefs ??= createPrefs<TourPrefs>({ storage: browserStorage('localStorage'), key: TOUR_PREFS_KEY, defaults: TOUR_DEFAULTS, schema: { tours: bool } });
  return prefs;
}

export function getTourPrefs(): TourPrefs {
  return store().get();
}

export function setTourPrefs(patch: Partial<TourPrefs>): void {
  store().set(patch);
}

export function resetTourPrefs(): void {
  store().reset();
}

const subscribe = (listener: () => void): (() => void) => store().subscribe(listener);

export function useTourPrefs(): TourPrefs {
  return useSyncExternalStore(subscribe, getTourPrefs, getTourPrefs);
}
