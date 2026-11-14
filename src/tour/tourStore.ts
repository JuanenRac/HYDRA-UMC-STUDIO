// =============================================================================
// HYDRA-UMC STUDIO - src/tour/tourStore.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Which tour is open and at which step. A small store outside React so that the Help, the dashboard and the preferences can start, move or close a tour
// without passing props. A tour does not start when the tours are switched off (tourPrefs.ts) or when the id is not one of the tours.
// =============================================================================
import { useSyncExternalStore } from 'react';
import { getTourPrefs } from './tourPrefs';
import { tourById } from './tours';

export type ActiveTour = { id: string; index: number };

let active: ActiveTour | null = null;
const listeners = new Set<() => void>();
const emit = (): void => listeners.forEach((listener) => listener());

export function getActiveTour(): ActiveTour | null {
  return active;
}

/** Opens the tour `id` at its first step. Returns false (and opens nothing) when the tours are switched off or the tour does not exist. */
export function startTour(id: string): boolean {
  if (!getTourPrefs().tours || !tourById(id)) return false;
  active = { id, index: 0 };
  emit();
  return true;
}

/** Moves by `delta` steps; going past the last step ends the tour, going before the first stays on it. */
export function stepTour(delta: number): void {
  if (!active) return;
  const tour = tourById(active.id);
  if (!tour) return;
  const next = active.index + delta;
  if (next >= tour.steps.length) active = null;
  else active = { id: active.id, index: Math.max(0, next) };
  emit();
}

export function stopTour(): void {
  if (!active) return;
  active = null;
  emit();
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function useActiveTour(): ActiveTour | null {
  return useSyncExternalStore(subscribe, getActiveTour, getActiveTour);
}
