// =============================================================================
// HYDRA-UMC STUDIO - the state of the gamepad mode in this window: lib/gamepadSession.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Whether the operator armed the gamepad mode, and the notice that stays on screen after a pad was lost or the mode was disarmed by a
// safety rule. It lives in memory only: a reloaded window always starts disarmed, whatever the settings say.
// =============================================================================
import { useSyncExternalStore } from 'react';
import type { GamepadModeStatus } from './gamepadMode';

/** Why the mode is no longer armed, shown until the operator dismisses it or arms the mode again. */
export type GamepadNotice = 'lost' | null;

export interface GamepadSessionState {
  armed: boolean;
  notice: GamepadNotice;
  status: GamepadModeStatus;
}

const INITIAL: GamepadSessionState = { armed: false, notice: null, status: 'off' };
let state: GamepadSessionState = INITIAL;
const listeners = new Set<() => void>();

const publish = (next: GamepadSessionState) => {
  if (next.armed === state.armed && next.notice === state.notice && next.status === state.status) return;
  state = next;
  listeners.forEach((listener) => listener());
};

export const getGamepadSession = (): GamepadSessionState => state;
export const subscribeGamepadSession = (listener: () => void): (() => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const useGamepadSession = (): GamepadSessionState => useSyncExternalStore(subscribeGamepadSession, getGamepadSession, getGamepadSession);

/** The operator armed the mode (after the confirmation). */
export const armGamepad = (): void => publish({ armed: true, notice: null, status: 'ready' });
/** The operator disarmed the mode. */
export const disarmGamepad = (): void => publish({ armed: false, notice: null, status: 'off' });
/** A safety rule disarmed the mode: the notice stays on screen. */
export const disarmGamepadWithNotice = (notice: Exclude<GamepadNotice, null>): void => publish({ armed: false, notice, status: 'off' });
export const dismissGamepadNotice = (): void => publish({ ...state, notice: null });
export const setGamepadStatus = (status: GamepadModeStatus): void => publish({ ...state, status });
/** For tests. */
export const resetGamepadSession = (): void => publish(INITIAL);
