// =============================================================================
// HYDRA-UMC STUDIO - which robot the operator is working with: selectedRobot.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// One value, shared by the dashboard (the robot opened in the list) and the gamepad (the robot its sticks move).
// The gamepad used to be fixed on robot 1 whatever was on screen, so an operator looking at A3 moved A1.
// =============================================================================

import { useSyncExternalStore } from 'react';

let current = 1;
const listeners = new Set<() => void>();

export function getSelectedRobotId(): number {
  return current;
}

export function setSelectedRobotId(id: number): void {
  if (!Number.isInteger(id) || id === current) return;
  current = id;
  listeners.forEach((listener) => listener());
}

export function subscribeSelectedRobot(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The selected robot id, re-rendering the component when it changes. */
export function useSelectedRobotId(): number {
  return useSyncExternalStore(subscribeSelectedRobot, getSelectedRobotId, getSelectedRobotId);
}
