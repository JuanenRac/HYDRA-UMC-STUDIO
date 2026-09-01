// =============================================================================
// HYDRA-UMC STUDIO - Global State Management and Context: store.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { apiUrl, wsUrl } from './lib/apiBase';

/**
 * Renders the Unthrottled delay component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const unthrottledDelay = () => new Promise<void>(resolve => setTimeout(resolve, 16));

/** Stores the Global playbacks configuration or state data. */
export const globalPlaybacks: Record<number, boolean> = {};

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
function decodeJwtRole(token: string | null): string | null {
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
    // ip is new on cnc/laser - port-only was fine when these were pure
    // form state; the real "Test Connection" below needs an actual host
    // to probe, same as openPnP already had.
    cnc: { software: string; enabled: boolean; ip: string; port: number };
    laser: { software: string; enabled: boolean; ip: string; port: number };
    ros2: { enabled: boolean; ip: string; port: number };
    printer3d: { enabled: boolean; software: string; ip: string; port: number };
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
  // Deployment-level Hailo AI accelerator config - same "describes what's
  // physically installed on this deployment" role canOta plays for the
  // CAN-OTA chain above. Two SEPARATE devices, not one: Hailo-8 already
  // drives the real vision/detection pipeline (HYDRA-UMC-VISION-NODE/
  // DETECTION-HEF - see their own hardware.py real device probes), and a
  // Hailo-10 (8GB) is the planned SEPARATE accelerator for cognitive/LLM
  // work (HYDRA-UMC-COGNITIVE-NODE) - defaults to 'none' since that
  // hardware doesn't exist on any real deployment yet, not "hailo10"
  // silently claiming otherwise. modelRegistryPath mirrors
  // DETECTION-HEF's own models_dir concept (its real compiled-HEF
  // registry with sha256 checksum verification) - not a live device
  // query, since neither node exposes an HTTP API of its own yet (see
  // the Ecosystem > AI Family panel for what IS live: the same real
  // /api/ecosystem/status manifest scan every other Ecosystem panel uses).
  aiHailo?: {
    visionDevice?: 'hailo8' | 'none';
    cognitiveDevice?: 'hailo10' | 'none';
    modelRegistryPath?: string;
  };
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
    /** @deprecated legacy single toggle for all 4 remote clients at once - kept as a fallback default for any of the 4 per-client flags below that haven't been explicitly set yet, so a settings.json without them still defaults each client the same way it always did (true). */
    enabled?: boolean;
    /** Whether HYDRA-UMC SUITE (identifies itself via the X-Hydra-Client: suite request header) can discover this server. */
    suite?: boolean;
    /** Whether the Android control app (X-Hydra-Client: android) can discover this server. */
    android?: boolean;
    /** Whether the iOS/Flutter control app (X-Hydra-Client: ios) can discover this server. */
    ios?: boolean;
    /** Whether HYDRA-UMC-WATCH (relayed through the paired phone's own X-Hydra-Client: watch header on POST /api/voice/turn and GET /api/watch/system-status) can use this server - independent of that same phone's own direct "android" access. */
    watch?: boolean;
  };
  serverName?: string;
  // Whether this server accepts a model submission from HYDRA-UMC-EDITOR-URDF
  // (github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF) - that
  // project's own server/client.py POSTs a finished URDF + mesh set to
  // POST /api/models/submit (admin-only), which writes it under
  // data/<destinationFolder>/<category>/<slug>/ and records it in
  // data/model_submissions.json. Defaults to disabled - an operator
  // running EDITOR-URDF against a server that hasn't opted in gets a
  // clear 403 from that endpoint, not files silently landing on disk.
  modelSubmissions?: {
    enabled: boolean;
    /** Relative to the server's own data/ directory - e.g. "models/submitted". Created on first accepted submission if it doesn't exist yet. */
    destinationFolder: string;
  };
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
    controllerBoard: i < 3 ? { firmwareVersion: '0.2.0', bootloaderVersion: '0.0.0', hardwareId: `RCB-${(i + 1).toString().padStart(3, '0')}` } : undefined,
    urtcHead: i < 3 ? { firmwareVersion: '2.1.3', bootloaderVersion: '0.0.0', hardwareId: `URTC-${(i + 1).toString().padStart(3, '0')}`, expansionBoardType: i === 0 ? 3 : 0 } : undefined,
    urtcExpansion: i === 0 ? { firmwareVersion: '0.0.1', bootloaderVersion: '0.0.0', hardwareId: `EXP-${(i + 1).toString().padStart(3, '0')}` } : undefined,
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
  /**
   * Fires the atomic POST /api/robot/:id/command instead of mutating local
   * state + waiting on the 500ms debounced POST /api/settings (see the
   * save-effect below) - for the handful of discrete actions that already
   * have an exact 1:1 case in server.ts's own switch (stop/play/pause/jog/
   * valve/pump/speed/tool today) - see DISEÑO_SYNC_DELTAS.txt CAUSA A.
   *
   * `localMutate`, when given, applies an OPTIMISTIC local update to every
   * robot in `affectedIds` (defaults to just `id`) immediately, before the
   * network round-trip even starts - same pattern as HYDRA-UMC-IOS-CONTROL/
   * ANDROID-CONTROL/DSI's own sendAtomicCommand()/RobotViewModel.kt, ported
   * here now that STUDIO's own WS reconnects on its own (see the WS
   * effect's own comment) and no longer leaves the UI stuck on stale
   * playback state if a command's own broadcast echo is delayed. A failed
   * request rolls the mutation back UNLESS a newer command for that same
   * robot already started since (the same _commandGeneration-style guard
   * those 3 clients use - a stale rollback would overwrite whatever that
   * newer command already applied). Omitting `localMutate` (as every
   * caller before this comment was written does) keeps the old behavior:
   * no local mutation at all, state updates once the server's own
   * broadcast/delta round-trip lands.
   */
  sendRobotCommand: (
    id: number,
    command: string,
    params?: Record<string, unknown>,
    localMutate?: (robot: RobotState) => Partial<RobotState>,
    affectedIds?: number[]
  ) => Promise<void>;
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
  /** This session's role ('admin' | 'operator'), read from authToken's own JWT payload - see decodeJwtRole()'s own comment for why this is a UI-only read, not a security boundary. Null before authToken exists or if it can't be decoded. */
  role: string | null;
  /** `role === 'admin'` - gates the Ecosystem > Connected Apps / Server Logs / Server Admin panels the same way server.ts's own requireAdmin already gates their backing routes (GET /api/admin/*), so a logged-in non-admin session never sees a menu entry that would just 403. */
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loginError: string | null;
  /** Real, live per-page progress from a real POST /api/hardware/canota/flash cycle, pushed over WS as `{type: "canota_progress", payload}` (server.ts's own comment). Null until the first real message arrives; Flasher.tsx owns interpreting/clearing it, same as it already owns phase/percent for the mock transport. */
  canotaProgress: Record<string, unknown> | null;
  /** Real feedback from live testing: AdminLogs.tsx (Server Logs) is conditionally mounted (`{activeTab === 'adminLogs' && <AdminLogs />}` in Dashboard.tsx), so its own local state was wiped every time the operator navigated away and back - clicking Clear, then leaving and returning, showed everything again. Lifted here so it survives navigation for the life of this session. `anchor` is the newest log line at the moment Clear was pressed (or null if the log was empty then) - AdminLogs.tsx only displays what comes after it in each later poll. Null (the default) means "never cleared this session". */
  logsClearedAt: { anchor: string | null } | null;
  setLogsClearedAt: (value: { anchor: string | null } | null) => void;
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
      cnc: { software: 'LinuxCNC', enabled: false, ip: '192.168.1.100', port: 8080 },
      laser: { software: 'LightBurn', enabled: false, ip: '192.168.1.100', port: 8080 },
      ros2: { enabled: false, ip: '192.168.1.100', port: 8000 },
      printer3d: { enabled: false, software: 'OrcaSlicer', ip: '192.168.1.100', port: 8080 },
    },
    customModels: [],
    modelSubmissions: {
      enabled: false,
      destinationFolder: 'models/submitted',
    },
    autoConnectRobots: false,
    theme: "HYDRA-UMC Studio Fasion",
    language: "en",
    worksPaths: {},
    canOta: {
      transport: 'mock',
      robotControllerBoardMcu: 'STM32G474RET6',
      firmwarePaths: {},
    },
    aiHailo: {
      visionDevice: 'hailo8',
      cognitiveDevice: 'none',
      modelRegistryPath: 'models/hailo',
    },
    uiLayout: {
      rightPanelWidth: 320,
      pointsTableHeight: 300,
    },
    remoteAccess: {
      enabled: true,
      suite: true,
      android: true,
      ios: true,
      watch: true,
    },
    serverName: "HYDRA-UMC TEST",
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Session token - lazy-initialized synchronously (not in a useEffect) so the
  // very first render already knows whether we're authenticated, avoiding a
  // flash of a login screen for a WebView launched with a real ?token= (the
  // Android app's embedded 3D view, ThreeDScreen.kt) or a browser tab that
  // already has one saved from a previous login. This app
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
  const role = useMemo(() => decodeJwtRole(authToken), [authToken]);
  const isAdmin = role === 'admin';

  // Real, live per-page flash progress from a real POST /api/hardware/
  // canota/flash cycle (server.ts's own comment on its `canota_progress`
  // WS broadcast) - the HTTP response for that request only reports the
  // final outcome, so Flasher.tsx watches this instead of the fetch's own
  // response for live percent/phase. Cleared back to null whenever a
  // `phase: 'done'`/`'error'` message arrives isn't done here - Flasher.tsx
  // owns when to stop showing it, same as it already owns `phase`/`percent`
  // state for the mock transport.
  const [canotaProgress, setCanotaProgress] = useState<Record<string, unknown> | null>(null);
  // See logsClearedAt's own doc comment on the context type above for why
  // this lives here rather than as AdminLogs.tsx's own local state.
  const [logsClearedAt, setLogsClearedAt] = useState<{ anchor: string | null } | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    setLoginError(null);
    try {
      const res = await fetch(apiUrl('/api/login'), {
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

  // Real bug reported live from the footer's own new Sign Out button
  // (Dashboard.tsx): clearing just authToken did nothing VISIBLE when the
  // session had actually gone through AuthGate's "Continue read-only"
  // path - that flag is separate local state inside AuthGate.tsx, which
  // this function has no reference to and can't reset directly, and
  // AuthGate's own gate is `if (authToken || readOnly)`, so readOnly
  // alone kept the app open regardless of authToken clearing. A full
  // reload resets every component's local state unconditionally (this
  // one included, and any other one on the same class of bug this or a
  // future screen might introduce) rather than trying to track down and
  // individually clear every local flag anything could ever gate on.
  const logout = useCallback(() => {
    localStorage.removeItem('hydra_token');
    setAuthToken(null);
    window.location.reload();
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

  // Cheaper sibling of lastPayloadJsonRef for the 3 hot paths that fire far
  // more often than a full-tree message ever did: applyRobotDelta() (every
  // incoming server delta) and sendRobotCommand()'s own optimistic mutate +
  // failure rollback (every jog/valve/pump/speed/play/pause/stop click, up
  // to 3x per single jog tick - see RobotDetail.tsx's own handleXYZJog).
  // Those 3 call sites used to each JSON.stringify the ENTIRE
  // {settings, controllers, ...} tree (recordedPoints included - multiple
  // MB, see DISEÑO_SYNC_DELTAS.txt's own 3.6MB figure) just to pre-fill
  // lastPayloadJsonRef so the save-effect below wouldn't re-POST their own
  // change right back - i.e. every single delta/command was paying the
  // exact full-tree serialization cost Fase 0/3 existed to eliminate,
  // synchronously on the main thread, which is what actually produced the
  // "3D view at turtle speed" symptom (a multi-MB JSON.stringify blocking
  // the render/animation frame on every jog step or every incoming delta -
  // confirmed by direct read of this file, not a guess). A boolean the
  // save-effect below consumes on its very next run does the same job -
  // "this specific state change already came from a delta/command, no need
  // to persist it again" - without ever touching the multi-MB tree. The
  // content-based lastPayloadJsonRef above is untouched and still used
  // exactly as before for actual full-tree messages (applyServerData,
  // the save-effect's own POST) - those are inherently rare (once per real
  // external change or once per debounce window), so their cost was never
  // the problem.
  const skipNextSaveRef = useRef(false);

  // Mirrors of controllers/activeControllerId, kept in sync via the 2
  // useEffects below - read by applyRobotDelta() (does this delta's robot
  // exist locally?) and by sendRobotCommand()'s own optimistic
  // mutate/rollback (which controller is active?), WITHOUT waiting on a
  // setState callback's own timing (a functional setState updater doesn't
  // run synchronously with the call that scheduled it, so checking "did
  // this delta's robot exist" only makes sense against a ref that's
  // already current, not against React state or a value captured inside
  // the updater after the fact). No settingsRef counterpart any more -
  // its only reader used to be the 3 full-tree JSON.stringify calls
  // skipNextSaveRef replaced (see that ref's own header comment).
  const controllersRef = useRef(controllers);
  useEffect(() => { controllersRef.current = controllers; }, [controllers]);
  const activeControllerIdRef = useRef(activeControllerId);
  useEffect(() => { activeControllerIdRef.current = activeControllerId; }, [activeControllerId]);

  // Per-robot generation counter guarding sendRobotCommand()'s own
  // rollback-on-failure - see that function's own comment and its
  // HYDRA-UMC-IOS-CONTROL/ANDROID-CONTROL/DSI equivalents for the full
  // reasoning (a held jog button/rapid clicks can have several commands
  // for the same robot in flight at once; an early one failing after a
  // later one already applied must not roll back over that newer state).
  const commandGenerationRef = useRef<Record<number, number>>({});

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
        // Assign data.settings directly rather than merging it onto prev
        // (`{...prev, ...data.settings}`) - the server always sends the
        // FULL settings tree (REMOTE_API.md section 2, never a partial
        // diff), and every field this app reads from settings already
        // falls back gracefully via ?./?? when absent (see e.g.
        // remoteAccess/modelSubmissions above), so there's nothing a
        // merge with the previous value protects against. A merge DOES
        // actively break the echo guard above: `{...prev, ...x}`
        // preserves PREV's own key insertion order, which can differ
        // from data.settings's own order (built server-side, potentially
        // with fields added to the schema at different points) - so
        // JSON.stringify()-ing the merged result never exactly equals
        // the dataJson the guard just recorded, and the debounced save
        // effect below (which serializes settings/controllers again to
        // compare against that same recorded string) sees a false
        // mismatch, POSTs a no-op "change" back, which the server
        // broadcasts again, which lands right back here - a full
        // multi-hundred-KB settings.json bouncing over the WebSocket in
        // a tight loop every time ANYONE's edit (e.g. every single jog
        // tick, since that's what drives this branch continuously)
        // comes back around. Assigning data.settings directly keeps the
        // client's own object graph byte-for-byte identical to what the
        // guard already fingerprinted, so the round-trip actually
        // terminates in one hop like the guard's own comment above
        // assumes it does.
        if (data.settings) setSettings(data.settings);
        else setSettings(prev => ({ ...prev, ...data })); // fallback for a pre-nested-envelope settings.json - genuinely incomplete on its own, so a merge onto known-good defaults is correct here, not the bug described above
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
          // Only defaultControllers[0] ("HYDRA-UMC Master") is meant as a
          // real seed here, rewritten below to this actual host - and
          // ONLY that one. defaultControllers[1] ("HYDRA-UMC Node 2",
          // hardcoded at the fixed demo IP 192.168.1.101, never rewritten)
          // used to come along for the ride via JSON.stringify(defaultControllers)
          // wholesale, so a factory reset (which POSTs {} to /api/settings,
          // landing right back in this empty-controllers branch on reload)
          // resurrected that second, fictitious controller every time -
          // exactly the "phantom server entry" a real deployment (which
          // only ever has the one real controller this app is talking to)
          // has no business showing. Slicing to just the one real seed
          // before rewriting fixes that without touching defaultControllers
          // itself (still used elsewhere as a plain not-undefined fallback).
          const def = [JSON.parse(JSON.stringify(defaultControllers[0]))];
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
             cnc: { software: 'LinuxCNC', enabled: false, ip: host, port: 8080 },
             laser: { software: 'LightBurn', enabled: false, ip: host, port: 8080 },
             ros2: { enabled: false, ip: host, port: 8000 },
             printer3d: { enabled: false, software: 'OrcaSlicer', ip: host, port: 8080 },
           }
        }));
        // Same fix, same reason as the empty-data.controllers branch above:
        // only the one real seed controller, not the whole defaultControllers
        // demo array (which includes a second, fixed-IP phantom entry).
        const def = [JSON.parse(JSON.stringify(defaultControllers[0]))];
        def[0].ip = host;
        def[0].id = host;
        setControllers(def);
        setActiveControllerId(host);
      }
      setIsLoaded(true);
  }, []);

  /**
   * Applies a real targeted delta (server.ts's own broadcastRobotDelta(),
   * `{type:"delta", schema:2, controllerId, robotId, patch, cameraId?,
   * cameraPatch?}`) - the schema-2 counterpart of applyServerData() above,
   * which stays exactly as-is for the full-tree "settings" message and for
   * a schema-1 "delta" from a client the server hasn't heard declare
   * schema 2 (see server.ts's own per-connection `schema` and
   * DISEÑO_SYNC_DELTAS.txt section 2).
   *
   * Validates against controllersRef (never React state directly - see
   * that ref's own comment) before touching anything: if the targeted
   * robot doesn't exist locally yet, the delta is discarded and a full
   * GET /api/settings reload is forced instead of ever creating a "ghost"
   * robot from a partial patch (section 5b's mitigation (b), non-optional).
   */
  const applyRobotDelta = useCallback((msg: any) => {
    const { controllerId, robotId, patch, cameraId, cameraPatch } = msg;
    if (typeof controllerId !== 'string' || typeof robotId !== 'number' || !patch || typeof patch !== 'object') return;
    const controller = controllersRef.current.find(c => c.id === controllerId);
    const robotExists = controller?.robots?.some(r => r.id === robotId);
    if (!controller || !robotExists) {
      const headers: Record<string, string> = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      fetch(apiUrl('/api/settings'), { headers }).then(r => r.json()).then(data => applyServerData(data)).catch(() => {});
      return;
    }
    setControllers(prev => {
      const next = prev.map((c) => {
        if (c.id !== controllerId) return c;
        const robots = c.robots.map((r) => (r.id === robotId ? { ...r, ...patch } : r));
        const cameras = (cameraId !== undefined && cameraPatch) ? c.cameras.map((cam) => (cam.id === cameraId ? { ...cam, ...cameraPatch } : cam)) : c.cameras;
        return { ...c, robots, cameras };
      });
      // Marks the save-effect's very next run as "already in sync, skip" -
      // without this, applying a delta (which necessarily changes the
      // `controllers` reference) would look to that effect like a fresh
      // local edit, and it would POST the FULL tree right back 500ms
      // later, exactly the round-trip Fase 0/3 exist to eliminate. See
      // skipNextSaveRef's own header comment for why this is a flag now
      // rather than a full JSON.stringify of `next` the way it used to be.
      skipNextSaveRef.current = true;
      return next;
    });
  }, [authToken, applyServerData]);

  useEffect(() => {
    let cancelled = false;

    // GET /api/settings has no authenticate middleware (reads are open) - this
    // still works even before login, so a fresh/unauthenticated tab shows real
    // state immediately. Writes and the WebSocket below are a different story,
    // see authToken's own comment above.
    // Explicit Record<string, string> annotation: without it TS infers the
    // ternary's two branches as distinct object shapes ({Authorization:
    // string} vs {}) and the resulting union doesn't structurally satisfy
    // fetch()'s HeadersInit (which needs a plain Record<string, string> on
    // this branch), even though both are actually valid header objects.
    const headers: Record<string, string> = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

    fetch(apiUrl('/api/settings'), { headers }).then(r => r.json()).then(data => {
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
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    // WS_RECONNECT_MS matches every other client's own fixed 3s reconnect
    // delay (HYDRA-UMC SUITE's own RECONNECT_DELAY_S, the mobile apps' own
    // RECONNECT_DELAY_MS) - this tab previously had NONE at all (a dropped
    // socket - laptop slept, Wi-Fi blipped - just stayed dead until
    // `authToken` happened to change, per DISEÑO_SYNC_DELTAS.txt section 1's
    // own finding). That gap matters more now than it used to: Play/Pause/
    // Stop (see RobotDetail.tsx's own handlePlay/handleStop) stopped
    // optimistically mutating local state as of this same change, relying
    // on this same WS round-trip to reflect what the robot is actually
    // doing - a socket that can't reconnect itself would leave the UI
    // showing stale playback state indefinitely, not just missing a live
    // update.
    const WS_RECONNECT_MS = 3000;

    const openWs = () => {
      if (cancelled || !authToken) return;
      try {
        // ?remoteApiVersion=2 declares this connection understands a real
        // targeted delta (see server.ts's own per-connection `schema` and
        // DISEÑO_SYNC_DELTAS.txt section 3) - the server only ever sends
        // schema 2 to a connection that asked for it, so an older/other
        // deployment of this same server (schema field absent or ignored)
        // just never exercises that branch and this still behaves exactly
        // like before.
        const socket = new WebSocket(wsUrl(`/ws?token=${encodeURIComponent(authToken)}&remoteApiVersion=2`));
        ws = socket;
        // Real diagnostic for a live-reported bug still under investigation:
        // Android's embedded 3D viewport (ThreeDScreen.kt's WebView, this
        // exact page loaded via ?hideUI=true&robotId=...&token=...) was
        // reported as not reflecting play/pause/stop triggered from a
        // separate STUDIO browser tab, and vice versa - console.* here
        // reaches that WebView's own logcat (ThreeDScreenConsole, see
        // ThreeDScreen.kt), so the next real repro attempt can confirm
        // directly whether this embedded session's own WS connection is
        // even opening/staying open and receiving deltas at all, rather
        // than guessing blind. Left in permanently, not stripped after -
        // low-noise (one line per connect + one per delta) and equally
        // useful for a real desktop STUDIO tab's own devtools console.
        socket.onopen = () => {
          console.log(`[WS] connected (robotId param: ${new URLSearchParams(window.location.search).get('robotId') ?? 'none'})`);
        };
        socket.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg?.type === 'delta' && msg.schema === 2 && msg.robotId !== undefined) {
              console.log(`[WS] delta robotId=${msg.robotId} keys=${Object.keys(msg.patch || {}).join(',')}`);
              applyRobotDelta(msg);
            } else if (msg && (msg.type === 'settings' || msg.type === 'delta') && msg.payload) {
              // "delta" without schema 2 (server hasn't heard us declare
              // support, or is an older deployment) and "settings" both
              // carry the SAME full-tree payload shape - only the label
              // differs, see server.ts's own broadcastSettings() - so both
              // apply identically here.
              applyServerData(msg.payload);
            } else if (msg?.type === 'canota_progress' && msg.payload) {
              setCanotaProgress(msg.payload);
            } else if (msg?.error) {
              console.warn('[WS] ' + msg.error);
            }
          } catch {
            // ignore malformed frames rather than tear down the connection
          }
        };
        socket.onclose = (ev) => {
          console.log(`[WS] closed code=${ev.code} reason=${ev.reason || '(none)'}`);
          if (ws === socket) ws = null;
          if (cancelled) return;
          reconnectTimer = setTimeout(openWs, WS_RECONNECT_MS);
        };
        // onerror always precedes onclose for a WebSocket - no separate
        // reconnect scheduling needed here, that would double-schedule.
        socket.onerror = () => {};
      } catch {
        // WebSocket unavailable (very old browser, or a dev proxy that
        // doesn't forward upgrades) - the app still works via the existing
        // fetch-once/debounced-POST path below, just without live push.
        // Retries on the same delay rather than giving up permanently, in
        // case this was a transient dev-proxy hiccup rather than a real
        // capability gap.
        if (!cancelled) reconnectTimer = setTimeout(openWs, WS_RECONNECT_MS);
      }
    };
    if (authToken) openWs();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [applyServerData, applyRobotDelta, authToken]);

  useEffect(() => {
    if (!isLoaded) return;
    // This exact controllers/settings/activeControllerId change already
    // came from applyRobotDelta() or sendRobotCommand() (see
    // skipNextSaveRef's own header comment) - it's already known-in-sync
    // with the server, no need to schedule a save timer (let alone
    // JSON.stringify anything) just to re-discover that fact 500ms later.
    // Consumed (reset to false) so the NEXT change - a genuine local edit,
    // if one follows - is still saved normally.
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
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

      fetch(apiUrl('/api/settings'), {
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

  const sendRobotCommand = async (
    id: number,
    command: string,
    params?: Record<string, unknown>,
    localMutate?: (robot: RobotState) => Partial<RobotState>,
    affectedIds?: number[]
  ) => {
    const ids = affectedIds && affectedIds.length > 0 ? affectedIds : [id];
    // Snapshot (for rollback) and this call's own generation number for
    // every affected robot - captured BEFORE the optimistic mutation
    // below, so a failed send can restore exactly what was there. See this
    // function's own interface-level comment for the full reasoning.
    let snapshots: Record<number, RobotState> = {};
    let myGeneration: Record<number, number> = {};

    if (localMutate) {
      setControllers(prev => {
        const next = prev.map((c) => {
          if (c.id !== activeControllerIdRef.current) return c;
          const robots = c.robots.map((r) => {
            if (!ids.includes(r.id)) return r;
            snapshots[r.id] = r;
            myGeneration[r.id] = commandGenerationRef.current[r.id] = (commandGenerationRef.current[r.id] || 0) + 1;
            return { ...r, ...localMutate(r) };
          });
          return { ...c, robots };
        });
        // Same echo-guard flag as applyRobotDelta() above - an optimistic
        // local mutation changes `controllers` just as much as an applied
        // delta does, and would trigger the exact same needless full-tree
        // POST (and its full-tree JSON.stringify) 500ms later without this.
        skipNextSaveRef.current = true;
        return next;
      });
    }

    const token = localStorage.getItem('hydra_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(apiUrl(`/api/robot/${id}/command`), {
        method: 'POST',
        headers,
        body: JSON.stringify({ command, params }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // Roll back the optimistic mutation - but only for a robot whose
      // generation counter still matches what THIS call incremented it to;
      // a mismatch means a newer command for that same robot already
      // started (and possibly already succeeded) since this one's
      // snapshot was taken, and restoring this stale snapshot now would
      // erase that newer state instead of this failed one's own.
      if (localMutate) {
        setControllers(prev => {
          const next = prev.map((c) => {
            if (c.id !== activeControllerIdRef.current) return c;
            const robots = c.robots.map((r) => {
              if (!(r.id in snapshots)) return r;
              if (commandGenerationRef.current[r.id] !== myGeneration[r.id]) return r;
              return snapshots[r.id];
            });
            return { ...c, robots };
          });
          // Same echo-guard flag as the optimistic mutate above - the
          // rollback itself is just another `controllers` change that the
          // save-effect shouldn't re-POST full-tree.
          skipNextSaveRef.current = true;
          return next;
        });
      }
      // swallowed beyond the rollback above - matches every other write
      // path in this file, see this function's own interface-level comment
    }
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
    // POST /api/settings requires auth like every other write - without this
    // header it would 401/no-op silently since the response is never
    // checked, same root cause described in authToken's own comment above
    // for why the login screen exists.
    const headers: any = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    await fetch(apiUrl("/api/settings"), { method: "POST", headers, body: "{}" });
    window.location.reload();
  };

  return (
    <HydraContext.Provider value={{
      controllers, activeControllerId, activeController, setActiveControllerId,
      robots, cameras, settings,
      updateController, updateRobot, sendRobotCommand, updateCamera, updateSettings,
      saveKinematics, loadKinematics, addController, removeController,
      exportScene, importScene, factoryReset,
      authToken, role, isAdmin, login, logout, loginError,
      canotaProgress,
      logsClearedAt, setLogsClearedAt
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
