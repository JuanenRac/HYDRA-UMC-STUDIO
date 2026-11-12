// =============================================================================
// HYDRA-UMC STUDIO - Global State Management and Context: store.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { createContext, useContext } from 'react';

import type { RobotModel } from './lib/robotModels';
export { ROBOT_MANUFACTURERS, REAL_ROBOT_MODELS, robotModelDof, isModelSelectable } from './lib/robotModels';
export type { RobotModel } from './lib/robotModels';
export { createDefaultKinematicBrainStage, createDefaultRobots, createDefaultCameras, defaultControllers } from './lib/storeDefaults';
import type { RobotRole, ToolType, ATCType, ATCGrid, RackConfig, ATCConfig, SharedModuleGeneric, VacuumTableModule, HeatedBedModule, PnPModule, CanOtaBoardState, KinematicBrainStage, RobotState, CameraType, CameraSourceType, CameraState, HydraController, SystemSettings, HydraStoreContextType } from './types/hydra';
export type { RobotRole, ToolType, ATCType, ATCGrid, RackConfig, ATCConfig, SharedModuleGeneric, VacuumTableModule, HeatedBedModule, PnPModule, CanOtaBoardState, KinematicBrainStage, RobotState, CameraType, CameraSourceType, CameraState, HydraController, SystemSettings, HydraStoreContextType } from './types/hydra';

/**
 * Reads `role` out of a Server JWT's own payload (server.ts's own
 * `jwt.sign({ username, role }, ...)`) without verifying the signature -
 * this is a UI-only read (which admin-only panels to even show), never a
 * security boundary. The server re-checks `requireAdmin` on every real
 * admin request regardless of what this returns, the same way it already
 * does for every other client (STUDIO, admin-ui, Android). Returns null for
 * a malformed/missing token rather than throwing - a token that arrived via
 * a ?token= URL param (see authToken's own comment below) or a stale/
 * corrupted localStorage value must degrade to "unknown role", never crash
 * the app.
 */
export function decodeJwtRole(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const decoded = JSON.parse(json);
    return typeof decoded.role === 'string' ? decoded.role : null;
  } catch {
    return null;
  }
}


/** Real label set for an IP camera's own stream picker, derived from
 * how many real RTSP streams `discoverRtspPath()` actually found for
 * THIS camera (`discoveredStreamPaths`, server.ts's own
 * `RtspDescribeResult.paths` persisted client-side) - never a fixed
 * Main/Sub pair, since a real camera on this ecosystem's own network
 * can expose 1, 2, or more real streams at once. No discovery run yet
 * (undefined/empty) reads the same as "1 stream, unconfirmed" - the
 * only honest default when nothing's actually been probed. Exactly 2
 * streams keeps the plain "Sub Stream" label (matches this ecosystem's
 * own real Hipcam units, which only ever have the one real sub stream);
 * 3 or more numbers every stream after the first ("Sub Stream 1", "Sub
 * Stream 2", ...) so each one stays individually selectable. */
export const ipStreamLabels = (paths: string[] | undefined): CameraType[] => {
  const count = paths && paths.length > 0 ? paths.length : 1;
  if (count <= 1) return ['IP Vision Camera Main Stream'];
  if (count === 2) return ['IP Vision Camera Main Stream', 'IP Vision Camera Sub Stream'];
  return [
    'IP Vision Camera Main Stream',
    ...Array.from({ length: count - 1 }, (_, i) => `IP Vision Camera Sub Stream ${i + 1}` as CameraType),
  ];
};

export const RTSP_DEFAULT_PORT = 554;



/** Stores the  hydra context configuration or state data. */
export const HydraContext = createContext<HydraStoreContextType | null>(null);

/**
 * Renders the Use hydra store component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const useHydraStore = () => {
  const ctx = useContext(HydraContext);
  if (!ctx) throw new Error('useHydraStore must be used within HydraProvider');
  return ctx;
};
