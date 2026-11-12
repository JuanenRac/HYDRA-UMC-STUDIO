// =============================================================================
// HYDRA-UMC STUDIO - src/lib/storeDefaults.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// The values the state of the application starts from before any server has answered: the example robots, cameras and controllers and the idle
// stage of a Kinematic Brain. Moved out of store.ts unchanged; store.ts re-exports every name, so no import elsewhere changes.

import type { CameraState, HydraController, KinematicBrainStage, RobotRole, RobotState, ToolType } from '../store';
import type { RobotModel } from './robotModels';

/** Default/idle values for a freshly-added controller's own Kinematic Brain stage. */
export const createDefaultKinematicBrainStage = (): KinematicBrainStage => ({
  xyTable: { x: 0, y1: 0, y2: 0, z: 0, tableSize: { width: 600, length: 400, height: 150 } },
  heatedBed: { targetTemp: 0, currentTemp1: 24, currentTemp2: 24, ssrActive: false },
  atcRevolver: { toolCount: 6, currentIndex: 0, targetIndex: 0, homed: false },
  conveyor: { installed: false, running: false, speedPercent: 0 },
  endstops: { xMin: false, xMax: false, y1Min: false, y1Max: false, y2Min: false, y2Max: false, zMin: false, zMax: false, e0Min: false, e0Max: false, e1Min: false, e1Max: false },
  fans: [false, false, false],
  pumps: Array(10).fill(false),
  valves: Array(10).fill(false),
});

/**
 * Renders the Create default robots component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const createDefaultRobots = (): RobotState[] => {
  // online/urtcConnected/controllerBoard/urtcHead/urtcExpansion used
  // to be true/populated for the first 3 example robots, presenting
  // fixture data as evidence of a real hardware connection the very first
  // time this app renders (before any real Server has ever answered) -
  // and, since this seed is what gets POSTed back via the debounced save
  // effect, that fake "connected" claim could persist into settings.json
  // itself. Every LIVE field here now starts false/undefined - a fresh
  // install shows real, useful example robots (models/roles/tools/joint
  // angles below), never a fake live connection. See defaultControllers'
  // own header comment and HydraProvider's serverReachable state for the
  // real, non-persisted signal that now drives the "System Online/
  // Offline" badge instead.
  const bots = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `Robot A${i + 1}`,
    online: false,
    model: (i % 2 === 0 ? 'Parol6 (6-DOF)' : 'Faze4 (6-DOF)') as RobotModel,
    role: 'Idle' as RobotRole,
    tool: 'None' as ToolType,
    urtcConnected: false,
    controllerBoard: undefined,
    urtcHead: undefined,
    urtcExpansion: undefined,
    pos: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
    joints: { j1: 0, j2: -45, j3: 45, j4: 0, j5: 90, j6: 0 },
    valves: [false, false] as [boolean, boolean],
    pumps: [false, false] as [boolean, boolean],
    endstops: { x1: false, x2: false, y1: false, y2: false, z0: false },
    recordedPoints: [],
    playbackState: { isPlaying: false, activeStep: 0, speed: 100, isLooping: false },
    hasXYTable: false,
    visionEnabled: true,
    camera: { connected: i < 2, type: 'USB Vision Camera', yoloEnabled: false, detections: [] },

    juanenPnP: { enabled: false, size: { width: 500, length: 500 }, axisX: 0, axisY: 0, axisZ: 0, nozzle1Rotation: 0, nozzle2Rotation: 0 },
    lumenPnP: { enabled: false, size: { width: 500, length: 500 }, axisX: 0, axisY: 0, axisZ: 0, nozzle1Rotation: 0, nozzle2Rotation: 0 },
    juanenCNC: { enabled: false, size: { width: 500, length: 500 } },
    juanenLaser: { enabled: false, size: { width: 500, length: 500 } },
    vacuumTable: { enabled: false, modelId: '160x120x15', size: { width: 160, length: 120 }, pumpActive: false, valveActive: false },
    heatedBed: { enabled: false, size: { width: 200, length: 200 }, targetTemp: 60, currentTemp1: 25, currentTemp2: 25, ssrActive: false },

    rackSystem: {
      enabled: false,
      rack1: {
        type: 'Input',
        capacity: 24,
        usableSlots: Array(24).fill(true),
        basePickupPos: { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, tx: 0, ty: 0 }
      },
      rack2: {
        type: 'Output',
        capacity: 24,
        usableSlots: Array(24).fill(true),
        basePickupPos: { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, tx: 0, ty: 0 }
      }
    } as any,
    xyTable: {
      pos: { x: 0, y: 0 },
      tableSize: { width: 500, length: 500 },
    },
  }));
  bots[0].role = 'Pnp';
  bots[0].tool = 'Vacuum / Pneumatic Gripper';
  bots[0].hasXYTable = true;
  bots[1].role = 'CNC';
  bots[1].tool = 'Engraving Laser Diode (10W optical)';
  bots[2].role = 'Inspection';
  bots[2].tool = 'AOI (Automated Optical Inspection) System';
  return bots;
};

/**
 * Renders the Create default cameras component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const createDefaultCameras = (): CameraState[] => {
  // same reasoning as createDefaultRobots above - `connected` starts false: a true on the first 2 example cameras would be a fixture value
  // indistinguishable from a real detected camera.
  return Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    connected: false,
    type: 'USB Vision Camera',
    assignedRobotId: i + 1,
    hardwareSource: `USB_DEV_${i}`,
    // No detections are made up: boxes drawn over a real video must come from the real detector, never from a fixture.
    yoloEnabled: false,
    detections: [],
  }));
};

/** Stores the Default controllers configuration or state data.
 * `status` starts 'offline': it is part of the `controllers` array the debounced save effect POSTs back to settings.json, so a fake 'online' claim
 * made before this app has heard from a real Server could persist indefinitely. The "System Online/Offline" badge (Dashboard.tsx) does not read
 * this field; it reads HydraProvider's `serverReachable`, a real, non-persisted signal set from the actual fetch/WebSocket connection lifecycle.
 * This `status` field remains only for schema/backward-compat with an older settings.json that still has it. */
export const defaultControllers: HydraController[] = [
  {
    id: '192.168.1.100',
    name: 'HYDRA-UMC Master',
    ip: '192.168.1.100',
    status: 'offline',
    fdcanBaudrate: 1000,
    fdcanDataBaudrate: 5000,
    robots: createDefaultRobots(),
    cameras: createDefaultCameras(),
    kinematicBrain: { firmwareVersion: '0.9.0', bootloaderVersion: '0.0.0', hardwareId: 'KB-001' },
    kinematicBrainStage: createDefaultKinematicBrainStage(),
  },
  {
    id: '192.168.1.101',
    name: 'HYDRA-UMC Node 2',
    ip: '192.168.1.101',
    status: 'offline',
    fdcanBaudrate: 500,
    fdcanDataBaudrate: 4000,
    robots: createDefaultRobots().map(r => ({ ...r, online: false, urtcConnected: false })),
    cameras: createDefaultCameras().map(c => ({ ...c, connected: false })),
  }
];
