// =============================================================================
// HYDRA-UMC STUDIO - Targeted robot delta of the server: lib/robotDelta.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The pure part of applying {type:"delta", controllerId, robotId, patch, cameraId?, cameraPatch?}: reading the message and
// merging the patch into the controllers. Moved out of HydraProvider unchanged.
// =============================================================================
import type { HydraController } from '../store';

export interface RobotDelta {
  controllerId: string;
  robotId: number;
  patch: Record<string, unknown>;
  cameraId?: number;
  cameraPatch?: Record<string, unknown>;
}

/** The delta when the message is well formed, otherwise null. */
export function parseRobotDelta(msg: any): RobotDelta | null {
  const { controllerId, robotId, patch, cameraId, cameraPatch } = msg ?? {};
  if (typeof controllerId !== 'string' || typeof robotId !== 'number' || !patch || typeof patch !== 'object') return null;
  return { controllerId, robotId, patch, cameraId, cameraPatch };
}

/** Whether the controller and the robot the delta targets are known; a delta for an unknown robot is never turned into a new one. */
export function deltaTargetExists(controllers: HydraController[], delta: Pick<RobotDelta, 'controllerId' | 'robotId'>): boolean {
  const controller = controllers.find((c) => c.id === delta.controllerId);
  return !!controller && !!controller.robots?.some((r) => r.id === delta.robotId);
}

/** The controllers with the patch merged into the targeted robot (and camera). The other controllers are returned as they are. */
export function patchControllers(prev: HydraController[], delta: RobotDelta): HydraController[] {
  const { controllerId, robotId, patch, cameraId, cameraPatch } = delta;
  return prev.map((c) => {
    if (c.id !== controllerId) return c;
    const robots = c.robots.map((r) => (r.id === robotId ? { ...r, ...patch } : r));
    const cameras = (cameraId !== undefined && cameraPatch) ? c.cameras.map((cam) => (cam.id === cameraId ? { ...cam, ...cameraPatch } : cam)) : c.cameras;
    return { ...c, robots, cameras };
  });
}
