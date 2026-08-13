// =============================================================================
// HYDRA-UMC STUDIO - Global State Management and Context: store.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { createContext, useContext, useState, useMemo } from 'react';

/**
 * Renders the Unthrottled delay component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const unthrottledDelay = () => new Promise<void>(resolve => setTimeout(resolve, 16));

/** Stores the Global playbacks configuration or state data. */
export const globalPlaybacks: Record<number, boolean> = {};

/** Type definition representing  robot model configurations or states. */
export type RobotModel = 'Parol6 (6-DOF)' | 'Faze4 (6-DOF)' | 'AR3 (6-DOF)' | 'AR4 (6-DOF)' | 'Generic (6-DOF)';
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

/** Firmware/identity state for one board reachable over CAN-OTA (Robot Controller Board or URTC Tool Head) - see HYDRA-UMC's docs/architecture.md. */
export interface CanOtaBoardState {
  firmwareVersion?: string;
  bootloaderVersion?: string;
  hardwareId?: string;
  lastSeen?: number;
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
  // Robot Controller Board (Tier 2, FDCAN1 "STACK A" slot) and URTC Tool Head (Tier 3,
  // relayed through the Robot Controller Board's own second CAN port) firmware state -
  // see HYDRA-UMC's docs/architecture.md for the addressing scheme. Populated by
  // Flasher.tsx/Tester.tsx once a board answers a version query.
  controllerBoard?: CanOtaBoardState;
  urtcHead?: CanOtaBoardState;
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
  playbackState: {
    isPlaying: boolean;
    isPaused?: boolean;
    isFinished?: boolean;
    isLooping?: boolean;
    activeStep: number;
    speed: number;
  };
  cameraView?: { position: [number, number, number]; target: [number, number, number] };
  centerCameraTrigger?: number;

  juanenPnP: SharedModuleGeneric;
  lumenPnP: SharedModuleGeneric;
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
}

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
  uiLayout?: {
    rightPanelWidth?: number;
    pointsTableHeight?: number;
    threeDHeight?: number;
    cameraPips?: Record<number, { x?: number, y?: number, w?: number, h?: number, isOpen?: boolean }>;
  };
}

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
    urtcHead: i < 3 ? { firmwareVersion: '2.1.3', bootloaderVersion: '1.0.0', hardwareId: `URTC-${(i + 1).toString().padStart(3, '0')}` } : undefined,
    pos: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
    joints: { j1: 0, j2: -45, j3: 45, j4: 0, j5: 90, j6: 0 },
    valves: [false, false] as [boolean, boolean],
    pumps: [false, false] as [boolean, boolean],
    endstops: { x1: false, x2: false, y1: false, y2: false, z0: false },
    recordedPoints: [],
    playbackState: { isPlaying: false, activeStep: 0, speed: 100, isLooping: false },
    hasXYTable: false,

    juanenPnP: { enabled: false, size: { width: 500, length: 500 } },
    lumenPnP: { enabled: false, size: { width: 500, length: 500 } },
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
    }
  });
  const [isLoaded, setIsLoaded] = useState(false);

  React.useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
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
    }).catch(() => {
      setIsLoaded(true);
    });
  }, []);

  React.useEffect(() => {
    if (!isLoaded) return;
    const payload = {
      settings,
      controllers,
      activeControllerId
    };
    const timer = setTimeout(() => {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    window.location.reload();
  };

  return (
    <HydraContext.Provider value={{ 
      controllers, activeControllerId, activeController, setActiveControllerId,
      robots, cameras, settings, 
      updateController, updateRobot, updateCamera, updateSettings, 
      saveKinematics, loadKinematics, addController, removeController,
      exportScene, importScene, factoryReset
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
