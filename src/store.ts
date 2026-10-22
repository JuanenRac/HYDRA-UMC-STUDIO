// =============================================================================
// HYDRA-UMC STUDIO - Global State Management and Context: store.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { createContext, useContext } from 'react';
import type { CommandIssue, CommandResult } from './lib/commandResult';
import type { StopAllReport } from './lib/stopAll';

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

/** Every real robot model this ecosystem has kinematics/mesh support for
 * (ROBOT_MANUFACTURERS' own keys), excluding the "Generic" placeholder -
 * used by the Robots catalog panel and the Config tab's own model picker.
 * DOF is parsed straight out of each model's own name string (every one
 * already ends in "(N-DOF)") rather than duplicated in a second map. */
export const REAL_ROBOT_MODELS: RobotModel[] = (Object.keys(ROBOT_MANUFACTURERS) as RobotModel[]).filter(m => m !== 'Generic (6-DOF)');

export function robotModelDof(model: RobotModel): number {
  const match = model.match(/\((\d+)-DOF\)/);
  return match ? Number(match[1]) : 6;
}

/** Whether `model` should appear as a choosable option in the Config
 * tab's model picker - true if it's the robot's own CURRENT model
 * (never hide an already-assigned model out from under a robot just
 * because it was later deactivated in the Robots catalog panel), or if
 * the Robots catalog panel hasn't deactivated it. Undefined/missing
 * `enabledRobotModels` (no catalog panel visit yet, or a settings.json
 * saved before this feature existed) reads as "everything enabled",
 * matching this ecosystem's own "old settings.json keeps working
 * unchanged" convention for every other optional settings field. */
export function isModelSelectable(model: RobotModel, currentModel: RobotModel, enabledRobotModels: Record<string, boolean> | undefined): boolean {
  if (model === currentModel) return true;
  return enabledRobotModels?.[model] !== false;
}
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
  width?: number; // usable PCB width in mm, integer 40..1000
  depth?: number; // usable PCB depth in mm, integer 40..1000
  color?: string; // STL material override, #RRGGBB
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
  customSize?: boolean; // Explicit opt-in: legacy size fields must not distort catalog meshes.
  modelId?: string; // Stable catalog ID; missing/unknown IDs display the 160x120 model.
  pumpActive: boolean;
  valveActive: boolean;
}

/** Defines the data structure and expected properties for  heated bed module entities. */
export interface HeatedBedModule extends SharedModuleGeneric {
  modelId?: string; // 5 mm STL preset; size remains the configured footprint.
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
  recordedPoints: { motionType?: string; j1: number; j2: number; j3: number; j4: number; j5: number; j6: number; tx?: number; ty?: number; trz?: number; x?: number; y?: number; z?: number; a?: number; b?: number; c?: number }[];
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
  /** Real, server-synced jog step (mm for XYZ jog, degrees for joint/base
   * rotation) - shared across every client viewing this robot (Android,
   * iOS, STUDIO desktop/tablet) rather than each keeping its own
   * independent local default. Optional/undefined on any settings.json
   * saved before this field existed - every reader falls back to `?? 1`. */
  jogStep?: number;
  /** Bumped (Date.now()) by the atomic 'reset3D' command whenever ANY
   * client's own "RESET 3D" button is pressed - every OTHER connected
   * client (including Android's embedded WebView copy of this same page)
   * watches for this changing and remounts its own VirtualKinematics to
   * match, so a purely local camera-framing reset now visibly reaches
   * every viewer instead of just the one pressed. Real request from live
   * testing: "verse en studio... y viceversa, asi se ve sincronización". */
  reset3DTrigger?: number;

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

/** Type definition representing  camera type configurations or states.
 * The "IP Vision Camera ... Stream" values exist because a real IP
 * camera often exposes more than one real stream at once (this
 * ecosystem's own Hipcam cameras: /11 main 2560x1920, /12 sub 800x600 -
 * see HYDRA-UMC-VISION-STREAMER's own ATTRIBUTION notes) - a camera
 * slot pointed at one stream needs its own distinct label from one
 * pointed at another stream of the same physical camera, not all
 * showing as a generic "IP camera". The plain "...Sub Stream" template-
 * literal member covers exactly-2-streams cameras (the only real case
 * this ecosystem has confirmed so far); "...Sub Stream ${number}"
 * covers a camera that turns out to expose 3 or more (see
 * ipStreamLabels() below for exactly how many/which labels a given
 * camera actually gets - never a fixed pair). Purely a label (like the
 * USB/Thermal values already were) - which real stream a slot actually
 * captures is still entirely controlled by its own rtspPath field. */
export type CameraType =
  | 'USB Vision Camera'
  | 'IP Vision Camera Main Stream'
  | 'IP Vision Camera Sub Stream'
  | `IP Vision Camera Sub Stream ${number}`
  | 'Thermal (MLX90640)'
  | 'Thermal (MLX90641)'
  | 'Thermal (MLX90642)';

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

/** Where this camera's own real frames actually come from - matches
 * HYDRA-UMC-VISION-STREAMER's own CameraConfig.source_type (config.py),
 * the real thing that decides which real backend `stream serve` opens
 * (a local V4L2 device vs a real RTSP connection). Defaults to "usb" so
 * every camera entry saved before this field existed keeps working
 * unchanged (undefined reads the same as "usb" everywhere this is
 * checked). */
export type CameraSourceType = 'usb' | 'ip';

/** Defines the data structure and expected properties for  camera state entities. */
export interface CameraState {
  id: number;
  connected: boolean;
  type: CameraType;
  assignedRobotId?: number;
  sourceType?: CameraSourceType;
  // USB (sourceType === 'usb', the default): a real V4L2 device path or
  // index, e.g. "/dev/video0" - VISION-STREAMER's own CameraConfig.device.
  hardwareSource?: string;
  // IP (sourceType === 'ip'): a real RTSP camera's own connection
  // details - VISION-STREAMER's own CameraConfig host/rtspPort/rtspPath/
  // username/password fields, camelCased. rtspPort defaults to 554 on
  // the read side (see RTSP_DEFAULT_PORT below) the same way
  // VISION-STREAMER's own config.py does, so an entry that never set it
  // explicitly still means the real RTSP default, not port 0.
  ipHost?: string;
  rtspPort?: number;
  rtspPath?: string;
  ipUsername?: string;
  ipPassword?: string;
  // Every real RTSP path the last "Discover Path" run actually found
  // for THIS camera (server.ts's own discoverRtspPath()'s full
  // `paths` list, not just the first) - drives ipStreamLabels() above,
  // so the type combobox only ever offers as many Main/Sub/Sub N
  // options as this camera genuinely has real streams for. Undefined
  // until discovery has actually been run at least once.
  discoveredStreamPaths?: string[];
  yoloEnabled: boolean;
  detections: { label: string; confidence: number; box: { x: number; y: number; w: number; h: number } }[];
}

export const RTSP_DEFAULT_PORT = 554;

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
  /** Per-model on/off switch for the Robots catalog panel's own
   * activate/deactivate toggle - a model missing from this map (or the
   * map itself missing) reads as enabled, see isModelSelectable() above. */
  enabledRobotModels?: Record<string, boolean>;
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
    /** Whether the DSI kiosk app (HYDRA-UMC-DSI, X-Hydra-Client: dsi) can discover/use this server. Its own hydra_api_client.dart already sent this header before the server ever recognized it - see server.ts's own remoteAccessAllowed() comment for the real gap this closed. */
    dsi?: boolean;
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
    /** PickAndPlace.tsx's own split between its Module Settings panel
     * (this percent) and its 3D viewer (the rest) - default 40 gives the
     * viewer 60%, 1.5x the settings panel's own width. */
    pickAndPlaceSettingsWidthPercent?: number;
  };
}

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
  // same reasoning as createDefaultRobots above - `connected`
  // used to default to true for the first 2 example cameras, a fixture
  // value indistinguishable from a real detected camera.
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
 * `status` starts 'offline' - it used to start 'online' before
 * this app had ever actually heard from a real Server, and this field is
 * itself part of the `controllers` array the debounced save effect POSTs
 * back to settings.json, so that fake 'online' claim could persist
 * indefinitely. The "System Online/Offline" badge (Dashboard.tsx) no
 * longer even reads this field - it reads HydraProvider's own
 * `serverReachable`, a real, non-persisted signal set from the actual
 * fetch/WebSocket connection lifecycle. This `status` field remains only
 * for schema/backward-compat with an older settings.json that still has
 * it. */
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
   * valve/pump/speed/tool today) - see the delta-sync design.
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
  ) => Promise<CommandResult>;
  /**
   * The global STOP: stops EVERY robot of every controller (whichever one is selected) and switches every valve and
   * pump off with one POST /api/stop-all - any signed-in account, no confirmation, a reservation held by someone
   * else never blocks it. A network failure is retried once, an expired session is renewed once, a 429 or a 404
   * falls back to the per-robot stop, and when nothing answers the "stop not confirmed" issue stays on screen until
   * a later stop gets an answer. Nothing is written to `online` (that is telemetry).
   */
  emergencyStop: () => Promise<void>;
  /** The newest answer of the global STOP, robot by robot, until it is dismissed; null when there is none. */
  stopAllReport: StopAllReport | null;
  dismissStopAllReport: () => void;
  /** True while a global STOP is on the wire. */
  stopAllPending: boolean;
  /** The problem the last command (or emergency stop) ran into, until it is dismissed; null when there is none. */
  commandIssue: CommandIssue | null;
  dismissCommandIssue: () => void;
  /** Puts a client-side problem on screen the same way a failed command is (a jog step refused before it was sent, for example). */
  reportCommandIssue: (issue: Omit<CommandIssue, 'id'>) => void;
  updateCamera: (id: number, updates: Partial<CameraState>) => void;
  /** Forces the real debounced settings save (the same POST /api/settings
   * the 500ms auto-save timer below already sends) to happen right now
   * instead of waiting - the "Apply Now" affordance a camera config edit
   * needs for real, immediate feedback (HYDRA-UMC-SERVER's own camera
   * process supervisor only reconciles a camera's real stream process
   * once its new config actually lands there). Never throws - a real
   * failure (network, or a non-2xx response - an expired session, a
   * non-admin role) sets `settingsSaveError` instead, see that field's
   * own comment. */
  flushSettingsSave: () => Promise<void>;
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
  /** real, live "has a real Server actually answered/is the
   * WebSocket actually open right now" signal - never a fixture default,
   * never persisted into settings.json. Drives the "System Online/
   * Offline" badge; see its own useState comment in HydraProvider. */
  serverReachable: boolean;
  /** Non-null exactly when the most recent POST /api/settings (debounced
   * auto-save, flushSettingsSave(), or factoryReset()) actually failed -
   * a real, human-readable reason. Null once a save has genuinely
   * succeeded. See its own useState comment in HydraProvider for the
   * real production bug (camera streams left running after being
   * "stopped") this exists to make visible instead of silent. */
  settingsSaveError: string | null;
  /** 'login_required' when the server answered the first read of the settings with a refusal (no session): the robots on screen are then the built-in sample, not the system. */
  settingsLoadError: 'login_required' | 'server' | null;
}

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
