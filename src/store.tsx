// =============================================================================
// HYDRA-UMC STUDIO - Global State Management and Context: store.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';

/**
 * Renders the Unthrottled delay component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const unthrottledDelay = () => new Promise<void>(resolve => setTimeout(resolve, 16));

/** Stores the Global playbacks configuration or state data. */
export const globalPlaybacks: Record<number, boolean> = {};

/** Type definition representing  robot model configurations or states. */
export type RobotModel =
  | 'Parol6 (6-DOF)' | 'Faze4 (6-DOF)' | 'AR3 (6-DOF)' | 'AR4 (6-DOF)' | 'Generic (6-DOF)'
  | 'UR3e (6-DOF)' | 'UR5e (6-DOF)' | 'UR10e (6-DOF)' | 'UR16e (6-DOF)' | 'UR20 (6-DOF)'
  | 'xArm6 (6-DOF)' | 'Lite 6 (6-DOF)' | 'e.DO (6-DOF)'
  | 'Gen3 Lite (6-DOF)' | 'M-710iC (6-DOF)'
  | 'SO-ARM100 (5-DOF)'
  | 'Gen2 (6-DOF)' | 'PiPER (6-DOF)' | 'Z1 (6-DOF)' | 'ViperX 300 (6-DOF)' | 'WidowX 250 (6-DOF)'
  | 'Koch v1.1 (5-DOF)'
  | 'UR3 (6-DOF)' | 'UR5 (6-DOF)' | 'UR10 (6-DOF)';

/**
 * Manufacturer grouping for the model picker (RobotDetail.tsx's Config tab) -
 * purely a UI label, doesn't affect kinematics/rendering dispatch (that
 * still keys off the RobotModel string itself, same as before). Real
 * manufacturer per ATTRIBUTION.txt in each model's own public/models/
 * folder - Source Robotics (Parol6/Faze4), Annin Robotics (AR3/AR4, same
 * design lineage even though AR3 predates the Annin Robotics brand itself
 * - see public/models/ar3/ATTRIBUTION.txt), Universal Robots (UR3e/UR5e/
 * UR10e/UR16e/UR20, official github.com/UniversalRobots/
 * Universal_Robots_ROS2_Description meshes, BSD-3-Clause).
 */
export const ROBOT_MANUFACTURERS: Record<RobotModel, string> = {
  'Parol6 (6-DOF)': 'Source Robotics',
  'Faze4 (6-DOF)': 'Source Robotics',
  'AR3 (6-DOF)': 'Annin Robotics',
  'AR4 (6-DOF)': 'Annin Robotics',
  'Generic (6-DOF)': 'Generic',
  'UR3e (6-DOF)': 'Universal Robots',
  'UR5e (6-DOF)': 'Universal Robots',
  'UR10e (6-DOF)': 'Universal Robots',
  'UR16e (6-DOF)': 'Universal Robots',
  'UR20 (6-DOF)': 'Universal Robots',
  'xArm6 (6-DOF)': 'UFACTORY',
  'Lite 6 (6-DOF)': 'UFACTORY',
  'e.DO (6-DOF)': 'Comau',
  'Gen3 Lite (6-DOF)': 'Kinova',
  'M-710iC (6-DOF)': 'FANUC',
  'SO-ARM100 (5-DOF)': 'The Robot Studio',
  'Gen2 (6-DOF)': 'Kinova',
  'PiPER (6-DOF)': 'AgileX',
  'Z1 (6-DOF)': 'Unitree',
  'ViperX 300 (6-DOF)': 'Trossen Robotics',
  'WidowX 250 (6-DOF)': 'Trossen Robotics',
  'Koch v1.1 (5-DOF)': 'Koch / Low-Cost Robot Arm',
  'UR3 (6-DOF)': 'Universal Robots (classic)',
  'UR5 (6-DOF)': 'Universal Robots (classic)',
  'UR10 (6-DOF)': 'Universal Robots (classic)',
};
/** Type definition representing  robot role configurations or states. */
export type RobotRole = 'Idle' | 'CNC' | 'Laser' | 'Pnp' | '3D printing' | 'Inspection';
/** Type definition representing  tool type configurations or states. */
export type ToolType = 
  | 'None'
  | 'Soldering Station (T12)'
  | 'SMT Solder Paste Dispenser'
  | 'Thermal Paste / Liquid Dispenser'
  | 'Smart Electric Screwdriver'
  | 'Vacuum / Pneumatic Gripper'
  | 'Drill (BL4260)'
  | 'Gimbal Gripper'
  | 'NEMA Gripper'
  | 'AOI (Automated Optical Inspection) System'
  | 'Engraving Laser Diode (10W optical)'
  | '3D Printing Hotend'
  | '3D Scanner Probe'
  | 'SMT Pick & Place Head'
  | 'Heavy-Duty Electromagnet'
  | 'Spot Welder Head'
  | 'Conformal Coating Airbrush'
  | 'Large-Format Vacuum Gripper'
  | 'Functional Testing Head'
  | 'UV Curing Head'
  | 'Hot Air Rework Nozzle'
  | 'Pneumatic Press-Fit Inserter'
  | 'Wire Harnessing / Crimping Actuator'
  | 'PCB Advanced Inspection'
  | 'Solder Paste Jetting Valve'
  | 'Ultrasonic Welder / Packaging Sealer'
;

/** Type definition representing  a t c type configurations or states. */
export type ATCType = 'vertical_panel' | 'horizontal_panel' | 'revolver';
/** Type definition representing  a t c grid configurations or states. */
export type ATCGrid = '1x1' | '1x2' | '2x1' | '2x2' | '2x3' | '3x2' | '3x3' | '3x4' | '4x3' | '4x4';

/** Defines the data structure and expected properties for  rack config entities. */
export interface RackConfig { renderScale?: number;
  type: 'Input' | 'Output' | 'None';
  capacity: number;
  usableSlots: boolean[];
  renderPos?: { x: number; y: number };
  renderRot?: number;
  basePickupPos: {
    j1: number; j2: number; j3: number; j4: number; j5: number; j6: number;
    tx: number; ty: number;
  };
}

/** Defines the data structure and expected properties for  a t c config entities. */
export interface ATCConfig { renderScale?: number;
  type: ATCType;
  panelGrid: ATCGrid;
  revolverSlots: number;
  renderPos?: { x: number; y: number };
  renderRot?: number;
  revolverPos?: { j1: number; j2: number; j3: number; j4: number; j5: number; j6: number; tx?: number; ty?: number };
  tools: {
    slot: number;
    tool: ToolType;
    pos?: { j1: number; j2: number; j3: number; j4: number; j5: number; j6: number; tx?: number; ty?: number };
  }[];
}


/** Defines the data structure and expected properties for  shared module generic entities. */
export interface SharedModuleGeneric {
  enabled: boolean;
  renderScale?: number;
  worldPos?: { x: number; y: number };
  worldRot?: number;
  size: { width: number; length: number };
}

/** Defines the data structure and expected properties for  vacuum table module entities. */
export interface VacuumTableModule extends SharedModuleGeneric {
  pumpActive: boolean;
  valveActive: boolean;
}

/** Defines the data structure and expected properties for  heated bed module entities. */
export interface HeatedBedModule extends SharedModuleGeneric {
  targetTemp: number;
  currentTemp1: number;
  currentTemp2: number;
  ssrActive: boolean;
}

/**
 * LumenPnP/JuanenPnP real axis pose - no live firmware feed exists for this
 * machine anywhere in the ecosystem yet (it runs its own OpenPnP control
 * software, not HYDRA-UMC's CAN-OTA/REMOTE_API), so this is manually-set,
 * persisted, synced state (same honesty pattern as the Cameras panel's own
 * metadata) rather than a live telemetry readout - the 3D view renders
 * whatever pose is stored here, defaulting to the machine's own home.
 * Real travel limits from the machine's own openpnp/machine.xml
 * (opulo-inc/lumenpnp): X 0-433mm, Y 0-487mm. Z's own soft limits in that
 * file are disabled in favor of a safe-zone check, so 0-90mm here is an
 * estimate from the real CAD's own Z-carriage rail length, not a quoted
 * published spec.
 */
export interface PnPModule extends SharedModuleGeneric {
  axisX: number;   // 0-433mm, real machine.xml soft limit
  axisY: number;   // 0-487mm, real machine.xml soft limit
  axisZ: number;   // 0-90mm, shared by both nozzles (machine.xml's own z2 mirrors z1)
  nozzle1Rotation: number; // degrees, OpenPnP axis "A"
  nozzle2Rotation: number; // degrees, OpenPnP axis "B"
}

/** Firmware/identity state for one board reachable over CAN-OTA (Robot Controller Board or URTC Tool Head) - see HYDRA-UMC's docs/architecture.md. */
export interface CanOtaBoardState {
  firmwareVersion?: string;
  bootloaderVersion?: string;
  hardwareId?: string;
  lastSeen?: number;
}

/**
 * Live state for the Kinematic Brain's OWN local 6-axis stage (STM32H745,
 * docs/PINOUT_STM32H745_KINEMATIC_BRAIN.TXT section 3) - CONFIRMED job per
 * axis (project owner): X/Y1/Y2 = dual-Y XY gantry table, Z = table/head
 * height, E0 = NEMA stepper indexing the ATC (Automatic Tool Changer)
 * revolver/turret (a ROTARY axis sharing the same STEP/DIR/EN interface as
 * the linear axes), E1 = a FUTURE conveyor belt's own NEMA motor (wired and
 * pinned out today, nothing physically installed yet). This is
 * CONTROLLER-level state (one Kinematic Brain per HydraController), not
 * per-robot - see docs/CANBUS_STM32H745.TXT section 4.
 */
export interface KinematicBrainStage {
  xyTable: {
    x: number; y1: number; y2: number; z: number;
    tableSize: { width: number; length: number; height: number };
  };
  heatedBed: { targetTemp: number; currentTemp1: number; currentTemp2: number; ssrActive: boolean };
  atcRevolver: { toolCount: number; currentIndex: number; targetIndex: number; homed: boolean };
  /** installed=false by default - E1/conveyor is wired+pinned but not yet a built feature, see this interface's own header comment. */
  conveyor: { installed: boolean; running: boolean; speedPercent: number };
  // 2 endstops per axis (X,Y1,Y2,Z,E0,E1) = 12 total, docs/PINOUT_STM32H745_KINEMATIC_BRAIN.TXT section 4
  endstops: {
    xMin: boolean; xMax: boolean;
    y1Min: boolean; y1Max: boolean;
    y2Min: boolean; y2Max: boolean;
    zMin: boolean; zMax: boolean;
    e0Min: boolean; e0Max: boolean;
    e1Min: boolean; e1Max: boolean;
  };
  fans: [boolean, boolean, boolean];
  // 8+2 each - docs/PINOUT_STM32H745_KINEMATIC_BRAIN.TXT sections 6-7
  pumps: boolean[];
  valves: boolean[];
}

/** Defines the data structure and expected properties for  robot state entities. */
export interface RobotState {
  id: number;
  name: string;
  online: boolean;
  model: RobotModel;
  role: RobotRole;
  tool: ToolType;
  urtcConnected: boolean;
  // Robot Controller Board (Tier 1, FDCAN1 "STACK A" slot, STM32G474RET6), URTC Tool Head
  // (Tier 2, relayed through the Robot Controller Board's own second CAN port,
  // STM32F303CCT6), and that head's own optional Advanced Expansion Board (Tier 3, only
  // present when urtcHead.expansionBoardType is 3 or 4, STM32F303CBT6) firmware state -
  // see HYDRA-UMC's docs/architecture.md for the addressing scheme. Populated by
  // Flasher.tsx/Tester.tsx once a board answers a version query.
  controllerBoard?: CanOtaBoardState;
  urtcHead?: CanOtaBoardState & { expansionBoardType?: number };
  urtcExpansion?: CanOtaBoardState;
  pos: { x: number; y: number; z: number; a: number; b: number; c: number; tx?: number; ty?: number; trz?: number };
  joints: { j1: number; j2: number; j3: number; j4: number; j5: number; j6: number };
  valves: [boolean, boolean];
  pumps: [boolean, boolean];
  endstops: { x1: boolean; x2: boolean; y1: boolean; y2: boolean; z0: boolean };
  selectedExample?: string;
  selectedWorkFile?: string;
  recordedPoints: { j1: number; j2: number; j3: number; j4: number; j5: number; j6: number; tx?: number; ty?: number; trz?: number; x?: number; y?: number; z?: number; a?: number; b?: number; c?: number }[];
  atc?: ATCConfig;
  rackSystem: {
    enabled: boolean;
    rack1: RackConfig;
    rack2: RackConfig;
  };
  hasXYTable: boolean;
  visionEnabled: boolean;
  playbackState: {
    isPlaying: boolean;
    isPaused?: boolean;
    isFinished?: boolean;
    isLooping?: boolean;
    activeStep: number;
    speed: number;
    /** Kinematics acceleration, percent (10-500, same scale as speed) - always had a speed control here but never one for acceleration, per the project owner. Defaults to 100 (matches this robot's own default un-scaled accel profile). */
    acceleration?: number;
  };
  cameraView?: { position: [number, number, number]; target: [number, number, number] };
  centerCameraTrigger?: number;

  juanenPnP: PnPModule;
  lumenPnP: PnPModule;
  juanenCNC: SharedModuleGeneric;
  juanenLaser: SharedModuleGeneric;
  vacuumTable: VacuumTableModule;
  heatedBed: HeatedBedModule;

  combinedWith?: number[];
  renderScale?: number;
  xyTable: {
    pos: { x: number; y: number };
    worldPos?: { x: number; y: number };
    worldRot?: number;
    renderScale?: number;
    tableSize: { width: number; length: number };
  };
}

/** Type definition representing  camera type configurations or states. */
export type CameraType = 'USB Vision Camera' | 'Thermal (MLX90640)' | 'Thermal (MLX90641)' | 'Thermal (MLX90642)';

/** Defines the data structure and expected properties for  camera state entities. */
export interface CameraState {
  id: number;
  connected: boolean;
  type: CameraType;
  assignedRobotId?: number;
  hardwareSource?: string;
  yoloEnabled: boolean;
  detections: { label: string; confidence: number; box: { x: number; y: number; w: number; h: number } }[];
}

/** Defines the data structure and expected properties for  hydra controller entities. */
export interface HydraController {
  id: string;
  name: string;
  ip: string;
  status: 'online' | 'offline';
  fdcanBaudrate: number;
  fdcanDataBaudrate: number;
  robots: RobotState[];
  cameras: CameraState[];
  // This controller's own STM32H745ZIT6 "kinematic brain" (Tier 0, reached directly over
  // SPI - no FDCAN1 "STACK A" slot involved). See HYDRA-UMC's docs/architecture.md.
  kinematicBrain?: CanOtaBoardState;
  // That same chip's own local 6-axis stage - see KinematicBrainStage's own header comment.
  kinematicBrainStage?: KinematicBrainStage;
}

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

/** Defines the data structure and expected properties for  system settings entities. */
export interface SystemSettings {
  visibleModules: string[];
  integrations: {
    openPnP: { enabled: boolean; ip: string; port: number };
    slic3r: { enabled: boolean; ip: string; port: number };
    prusaSlicer: { enabled: boolean; ip: string; port: number };
    cnc: { software: string; enabled: boolean; port: number };
    laser: { software: string; enabled: boolean; port: number };
  };
  customModels: string[];
  autoConnectRobots: boolean;
  theme: string;
  language: string;
  worksPaths?: Record<string, string>;
  // CAN-OTA firmware flashing/testing (Flasher.tsx / Tester.tsx) - see HYDRA-UMC's own
  // docs/architecture.md for the SPI -> STM32H745 -> FDCAN1 -> Robot Controller Board ->
  // CAN -> URTC Tool Head chain this targets. 'hardware' transport isn't implemented yet
  // (no CM5<->STM32H745 firmware exists to talk to) - 'mock' simulates the whole protocol
  // client-side so the UI is fully usable/demoable ahead of that.
  canOta?: {
    transport: 'mock' | 'hardware';
    robotControllerBoardMcu?: string;
    firmwarePaths?: Record<string, string>;
  };
  gamepadEnabled?: boolean;
  gamepadConnectionType?: 'USB' | 'Bluetooth';
  gamepadMapping?: Record<string, string>;
  // Whether this server responds to GET /api/hydra-info (docs/REMOTE_API.md
  // section 1) - the discovery/identity endpoint HYDRA-UMC SUITE's own
  // subnet scan and the mobile control apps' own discovery flow use to
  // find and identify a server. Defaults to true (matches this feature's
  // own pre-existing always-on behavior, so an existing settings.json
  // with no remoteAccess key doesn't silently stop working for anyone
  // already using SUITE against this server). Deliberately does NOT gate
  // GET/POST /api/settings or the /ws WebSocket - both of those are also
  // how this SAME browser tab talks to its own server, so blocking them
  // would break the core web UI, not just remote apps; only the
  // discovery endpoint is genuinely remote-client-only.
  remoteAccess?: {
    enabled: boolean;
  };
  serverName?: string;
  uiLayout?: {
    rightPanelWidth?: number;
    pointsTableHeight?: number;
    threeDHeight?: number;
    cameraPips?: Record<number, { x?: number, y?: number, w?: number, h?: number, isOpen?: boolean }>;
  };
}

/**
 * Renders the Create default robots component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const createDefaultRobots = (): RobotState[] => {
  const bots = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `Robot A${i + 1}`,
    online: i < 3,
    model: (i % 2 === 0 ? 'Parol6 (6-DOF)' : 'Faze4 (6-DOF)') as RobotModel,
    role: 'Idle' as RobotRole,
    tool: 'None' as ToolType,
    urtcConnected: i < 3,
    controllerBoard: i < 3 ? { firmwareVersion: '1.2.0', bootloaderVersion: '1.0.0', hardwareId: `RCB-${(i + 1).toString().padStart(3, '0')}` } : undefined,
    urtcHead: i < 3 ? { firmwareVersion: '2.1.3', bootloaderVersion: '1.0.0', hardwareId: `URTC-${(i + 1).toString().padStart(3, '0')}`, expansionBoardType: i === 0 ? 3 : 0 } : undefined,
    urtcExpansion: i === 0 ? { firmwareVersion: '1.0.1', bootloaderVersion: '1.0.0', hardwareId: `EXP-${(i + 1).toString().padStart(3, '0')}` } : undefined,
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
    vacuumTable: { enabled: false, size: { width: 100, length: 100 }, pumpActive: false, valveActive: false },
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
  return Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    connected: i < 2,
    type: 'USB Vision Camera',
    assignedRobotId: i + 1,
    hardwareSource: `USB_DEV_${i}`,
    yoloEnabled: i === 0,
    detections: [
      { label: 'PCB_PANEL', confidence: 0.98, box: { x: 10 + (i * 5), y: 20 + (i * 2), w: 50, h: 40 } },
      { label: 'IC_CHIP', confidence: 0.85, box: { x: 30 + (i * 5), y: 40 + (i * 2), w: 15, h: 15 } }
    ]
  }));
};

/** Stores the Default controllers configuration or state data. */
const defaultControllers: HydraController[] = [
  {
    id: '192.168.1.100',
    name: 'HYDRA-UMC Master',
    ip: '192.168.1.100',
    status: 'online',
    fdcanBaudrate: 1000,
    fdcanDataBaudrate: 5000,
    robots: createDefaultRobots(),
    cameras: createDefaultCameras(),
    kinematicBrain: { firmwareVersion: '0.9.0', bootloaderVersion: '1.0.0', hardwareId: 'KB-001' },
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

/** Defines the data structure and expected properties for  hydra store context type entities. */
interface HydraStoreContextType {
  controllers: HydraController[];
  activeControllerId: string;
  activeController: HydraController;
  setActiveControllerId: (id: string) => void;
  robots: RobotState[];
  cameras: CameraState[];
  settings: SystemSettings;
  updateController: (id: string, updates: Partial<HydraController>) => void;
  updateRobot: (id: number, updates: Partial<RobotState>) => void;
  updateCamera: (id: number, updates: Partial<CameraState>) => void;
  updateSettings: (updates: Partial<SystemSettings>) => void;
  addController: (controller: HydraController) => void;
  removeController: (id: string) => void;
  saveKinematics: (id: number) => void;
  loadKinematics: (id: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  exportScene: () => void;
  importScene: (e: React.ChangeEvent<HTMLInputElement>) => void;
  factoryReset: () => void;
  /** Null until a valid session token exists (from a ?token= URL param - e.g. the Android app's embedded 3D WebView - a prior login persisted to localStorage, or a fresh login() call). server.ts requires this for POST /api/settings, POST /api/robot/:id/command, and the /ws upgrade itself - see login()'s own comment for why this exists at all. */
  authToken: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loginError: string | null;
}

/** Stores the  hydra context configuration or state data. */
const HydraContext = createContext<HydraStoreContextType | null>(null);

/**
 * Renders the  hydra provider component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const HydraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [controllers, setControllers] = useState<HydraController[]>(defaultControllers);
  const [activeControllerId, setActiveControllerId] = useState<string>('192.168.1.100');
  const [settings, setSettings] = useState<SystemSettings>({
    visibleModules: ['Vision/Cameras', 'Robots', 'Macros/Tasks', 'Node Network', 'Settings'],
    integrations: {
      openPnP: { enabled: false, ip: '192.168.1.100', port: 8080 },
      slic3r: { enabled: false, ip: '192.168.1.100', port: 8080 },
      prusaSlicer: { enabled: false, ip: '192.168.1.100', port: 8080 },
      cnc: { software: 'LinuxCNC', enabled: false, port: 8080 },
      laser: { software: 'LightBurn', enabled: false, port: 8080 },
    },
    customModels: [],
    autoConnectRobots: false,
    theme: "HYDRA-UMC Studio Fasion",
    language: "en",
    worksPaths: {},
    canOta: {
      transport: 'mock',
      robotControllerBoardMcu: 'STM32G474RET6',
      firmwarePaths: {},
    },
    uiLayout: {
      rightPanelWidth: 320,
      pointsTableHeight: 300,
    },
    remoteAccess: {
      enabled: true,
    },
    serverName: "HYDRA-UMC TEST",
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Session token - lazy-initialized synchronously (not in a useEffect) so the
  // very first render already knows whether we're authenticated, avoiding a
  // flash of a login screen for a WebView launched with a real ?token= (the
  // Android app's embedded 3D view, ThreeDScreen.kt) or a browser tab that
  // already has one saved from a previous login. Found 2026-08-19: this app
  // never actually calls POST /api/login anywhere - server.ts's own
  // `authenticate` middleware unconditionally requires a bearer token on
  // POST /api/settings, POST /api/robot/:id/command, and the /ws upgrade
  // (no "security enabled" toggle despite what REMOTE_API.md implies), so
  // without this, a plain browser tab (no ?token=) could read state but
  // could never save a change or receive a live WebSocket push - it just
  // silently 401'd/1008'd. See AuthGate.tsx for the login screen this powers.
  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const urlToken = new URLSearchParams(window.location.search).get('token');
    if (urlToken) {
      localStorage.setItem('hydra_token', urlToken);
      return urlToken;
    }
    return localStorage.getItem('hydra_token');
  });
  const [loginError, setLoginError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    setLoginError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        setLoginError(data.error || 'Login failed');
        return false;
      }
      localStorage.setItem('hydra_token', data.token);
      setAuthToken(data.token);
      return true;
    } catch {
      setLoginError('Cannot reach server');
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hydra_token');
    setAuthToken(null);
  }, []);

  // Guards against a feedback loop: the server broadcasts every write to
  // every connected client, sender included (simpler than tracking "who
  // sent this", and harmless for any OTHER client) - but without this
  // guard, THIS tab would treat its own echoed-back write as a fresh
  // external change, call setSettings/setControllers with a fresh object
  // reference even though the content is identical, which re-triggers the
  // save-effect below, POSTs again, gets broadcast again, forever. Storing
  // the last applied/sent payload's own JSON and skipping when the
  // incoming (or outgoing) payload matches it exactly breaks the loop at
  // the source - no state update means no re-render means no re-save.
  const lastPayloadJsonRef = useRef<string | null>(null);

  const applyServerData = useCallback((data: any) => {
      if (data && Object.keys(data).length > 0) {
        const dataJson = JSON.stringify(data);
        if (dataJson === lastPayloadJsonRef.current) return;
        lastPayloadJsonRef.current = dataJson;
      }
      let host = '192.168.1.100';
      if (typeof window !== 'undefined' && window.location.hostname) {
        host = window.location.hostname;
      }
      
      if (data && Object.keys(data).length > 0) {
        if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
        else setSettings(prev => ({ ...prev, ...data })); // fallback for old settings.json
        let finalControllers: any[] = [];
        if (data.controllers && data.controllers.length > 0) {
          const parsed = data.controllers;
          parsed.forEach((c: any) => {
            // If the saved controller is from the cloud environment, auto-correct it to the current local host
            if (typeof c.id === 'string' && c.id.includes('.run.app')) {
              c.id = host;
              c.ip = host;
              c.name = `HYDRA-UMC (${host})`;
            }
            c.robots?.forEach((r: any) => {
            if (!r.playbackState) r.playbackState = { isPlaying: false, activeStep: 0, speed: 100 };
            });
          });
          setControllers(parsed);
          finalControllers = parsed;
        } else {
          const def = JSON.parse(JSON.stringify(defaultControllers));
          def[0].ip = host;
          def[0].id = host;
          setControllers(def);
          finalControllers = def;
        }
        let actId = data.activeControllerId || host;
        if (!finalControllers.some(c => c.id === actId)) actId = finalControllers[0]?.id || host;
        setActiveControllerId(actId);
      } else {
        setSettings(prev => ({
           ...prev,
           integrations: {
             openPnP: { enabled: false, ip: host, port: 8080 },
             slic3r: { enabled: false, ip: host, port: 8080 },
             prusaSlicer: { enabled: false, ip: host, port: 8080 },
             cnc: { software: 'LinuxCNC', enabled: false, port: 8080 },
             laser: { software: 'LightBurn', enabled: false, port: 8080 },
           }
        }));
        const def = JSON.parse(JSON.stringify(defaultControllers));
        def[0].ip = host;
        def[0].id = host;
        setControllers(def);
        setActiveControllerId(host);
      }
      setIsLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // GET /api/settings has no authenticate middleware (reads are open) - this
    // still works even before login, so a fresh/unauthenticated tab shows real
    // state immediately. Writes and the WebSocket below are a different story,
    // see authToken's own comment above.
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

    fetch('/api/settings', { headers }).then(r => r.json()).then(data => {
      if (!cancelled) applyServerData(data);
    }).catch(() => {
      if (!cancelled) setIsLoaded(true);
    });

    // Live sync: any client (this tab, another tab, HYDRA-UMC SUITE, a
    // mobile control app) that POSTs /api/settings, POSTs the atomic
    // /api/robot/:id/command, or sends a WS "settings" message gets
    // broadcast back to every connected client, this one included - see
    // server.ts's own broadcastSettings(). Without this, two open tabs (or
    // a native remote client and a tab) silently overwrite each other on
    // their own next unrelated save, since neither ever re-fetches after
    // its initial mount-time load. server.ts's /ws upgrade REQUIRES
    // ?token= unconditionally (closes with code 1008 otherwise, even for
    // this app's own tab) - skip opening it at all without one rather than
    // reconnect-loop against a server that will keep rejecting it.
    let ws: WebSocket | null = null;
    if (authToken) {
      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${proto}//${window.location.host}/ws?token=${encodeURIComponent(authToken)}`);
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            // "delta" (an atomic /api/robot/:id/command write) and "settings" (a full
            // POST /api/settings write) both carry the SAME full-tree payload shape -
            // only the label differs, see server.ts's own broadcastSettings() - so both
            // apply identically here.
            if (msg && (msg.type === 'settings' || msg.type === 'delta') && msg.payload) {
              applyServerData(msg.payload);
            } else if (msg?.error) {
              console.warn('[WS] ' + msg.error);
            }
          } catch {
            // ignore malformed frames rather than tear down the connection
          }
        };
      } catch {
        // WebSocket unavailable (very old browser, or a dev proxy that
        // doesn't forward upgrades) - the app still works via the existing
        // fetch-once/debounced-POST path below, just without live push.
      }
    }

    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [applyServerData, authToken]);

  useEffect(() => {
    if (!isLoaded) return;
    const payload = {
      settings,
      controllers,
      activeControllerId
    };
    const timer = setTimeout(() => {
      const payloadJson = JSON.stringify(payload);
      if (payloadJson === lastPayloadJsonRef.current) return; // unchanged since the last send/receive - nothing to do
      lastPayloadJsonRef.current = payloadJson;

      const token = localStorage.getItem('hydra_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch('/api/settings', {
        method: 'POST',
        headers,
        body: payloadJson
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [settings, controllers, activeControllerId, isLoaded]);

  const activeController = useMemo(() => controllers.find(c => c.id === activeControllerId) || controllers[0] || defaultControllers[0], [controllers, activeControllerId]);
  const robots = activeController?.robots || [];
  const cameras = activeController?.cameras || [];

  const updateController = (id: string, updates: Partial<HydraController>) => {
    setControllers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const updateRobot = (id: number, updates: Partial<RobotState>) => {
    
    setControllers((prev) => prev.map((c) => {
      if (c.id !== activeControllerId) return c;
      return { ...c, robots: c.robots.map(r => (r.id === id ? { ...r, ...updates } : r)) };
    }));
  };

  const updateCamera = (id: number, updates: Partial<CameraState>) => {
    setControllers((prev) => prev.map((c) => {
      if (c.id !== activeControllerId) return c;
      return { ...c, cameras: c.cameras.map(cam => (cam.id === id ? { ...cam, ...updates } : cam)) };
    }));
  };

  const updateSettings = (updates: Partial<SystemSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const addController = (controller: HydraController) => {
    setControllers(prev => [...prev, controller]);
  };

  const removeController = (id: string) => {
    if (controllers.length <= 1) return;
    const newControllers = controllers.filter(c => c.id !== id);
    setControllers(newControllers);
    if (activeControllerId === id) {
      setActiveControllerId(newControllers[0].id);
    }
  };

  const saveKinematics = (id: number) => {
    const robot = robots.find(r => r.id === id);
    if (!robot || robot.recordedPoints.length === 0) return;
    const data = JSON.stringify(robot.recordedPoints, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const prefix = settings.worksPaths?.[robot.id] ? settings.worksPaths[robot.id].replace(/\//g, '_') + '_' : '';
    a.download = `${prefix}kinematics_${robot.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadKinematics = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          updateRobot(id, { recordedPoints: json });
        } else if (json && typeof json.x === 'number') {
          updateRobot(id, { pos: { ...json } });
        }
      } catch {
        console.error('Invalid kinematics file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportScene = () => {
    const data = JSON.stringify(robots, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hydra_scene.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importScene = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          updateController(activeControllerId, { robots: json });
        }
      } catch {
        console.error('Invalid scene file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const factoryReset = async () => {
    // POST /api/settings requires auth like every other write - this call was
    // missing the header entirely before 2026-08-19 (would 401/no-op silently
    // since the response is never checked), same root cause as the missing
    // login screen this same session added (see authToken's own comment).
    const headers: any = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    await fetch("/api/settings", { method: "POST", headers, body: "{}" });
    window.location.reload();
  };

  return (
    <HydraContext.Provider value={{
      controllers, activeControllerId, activeController, setActiveControllerId,
      robots, cameras, settings,
      updateController, updateRobot, updateCamera, updateSettings,
      saveKinematics, loadKinematics, addController, removeController,
      exportScene, importScene, factoryReset,
      authToken, login, logout, loginError
    }}>
      {children}
    </HydraContext.Provider>
  );
};

/**
 * Renders the Use hydra store component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const useHydraStore = () => {
  const ctx = useContext(HydraContext);
  if (!ctx) throw new Error('useHydraStore must be used within HydraProvider');
  return ctx;
};
