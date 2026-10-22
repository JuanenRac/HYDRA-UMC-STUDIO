// =============================================================================
// HYDRA-UMC STUDIO - shared state of access and safety: accessStore.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Two small stores read by many panels and by the command path alike, kept outside React so the provider can
// consult them at the moment a command is sent: the limits the server reported, and the Live or Sim mode of each
// robot. Panels subscribe with useSyncExternalStore.
// =============================================================================
import { useSyncExternalStore } from 'react';
import { FALLBACK_STATE, type SafetyLimitsState } from './safetyLimits';
import { INITIAL_MODE_STATE, loadModes, saveModes, withDefaultMode, withMode, type ModeState, type RobotMode } from './liveSim';

function browserStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next: T) => {
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

// ----- limits of the server ---------------------------------------------------------------------------------------------
const limitsStore = createStore<SafetyLimitsState>(FALLBACK_STATE);

export const getSafetyState = (): SafetyLimitsState => limitsStore.get();
export const setSafetyState = (state: SafetyLimitsState): void => limitsStore.set(state);
export const useSafetyState = (): SafetyLimitsState => useSyncExternalStore(limitsStore.subscribe, limitsStore.get, limitsStore.get);

// ----- Live or Sim --------------------------------------------------------------------------------------------------------
let modeStore = createStore<ModeState>(INITIAL_MODE_STATE);
let modesLoaded = false;
function ensureModes(): void {
  if (modesLoaded) return;
  modesLoaded = true;
  modeStore.set(loadModes(browserStorage()));
}

export const getModeState = (): ModeState => { ensureModes(); return modeStore.get(); };
export function setRobotMode(robotId: number, mode: RobotMode): void {
  ensureModes();
  const next = withMode(modeStore.get(), robotId, mode);
  modeStore.set(next);
  saveModes(browserStorage(), next);
}
export function setDefaultRobotMode(mode: RobotMode): void {
  ensureModes();
  const next = withDefaultMode(modeStore.get(), mode);
  modeStore.set(next);
  saveModes(browserStorage(), next);
}
export const useModeState = (): ModeState => {
  ensureModes();
  return useSyncExternalStore(modeStore.subscribe, modeStore.get, modeStore.get);
};

/** Tests: forgets what was loaded and starts again from `state`. */
export function resetAccessStores(state: ModeState = INITIAL_MODE_STATE): void {
  modeStore = createStore<ModeState>(state);
  modesLoaded = true;
  limitsStore.set(FALLBACK_STATE);
}
