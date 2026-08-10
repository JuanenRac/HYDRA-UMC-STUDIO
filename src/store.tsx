import React, { createContext, useContext, useState, useMemo } from 'react';

export type RobotModel = 'Parol6 (6-DOF)' | 'Faze4 (6-DOF)' | 'AR3 (6-DOF)' | 'AR4 (6-DOF)' | 'Generic (6-DOF)';
export type RobotRole = 'Idle' | 'CNC' | 'Laser' | 'Pnp' | '3D printing' | 'Inspection';
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

export type ATCType = 'vertical_panel' | 'horizontal_panel' | 'revolver';
export type ATCGrid = '1x1' | '1x2' | '2x1' | '2x2' | '2x3' | '3x2' | '3x3' | '3x4' | '4x3' | '4x4';

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


export interface SharedModuleGeneric {
  enabled: boolean;
  renderScale?: number;
  worldPos?: { x: number; y: number };
  worldRot?: number;
  size: { width: number; length: number };
}

export interface VacuumTableModule extends SharedModuleGeneric {
  pumpActive: boolean;
  valveActive: boolean;
}

export interface HeatedBedModule extends SharedModuleGeneric {
  targetTemp: number;
  currentTemp1: number;
  currentTemp2: number;
  ssrActive: boolean;
}

export interface RobotState {
  id: number;
  name: string;
  online: boolean;
  model: RobotModel;
  role: RobotRole;
  tool: ToolType;
  urtcConnected: boolean;
  pos: { x: number; y: number; z: number; a: number; b: number; c: number; tx?: number; ty?: number; trz?: number };
  joints: { j1: number; j2: number; j3: number; j4: number; j5: number; j6: number };
  valves: [boolean, boolean];
  pumps: [boolean, boolean];
  endstops: { x1: boolean; x2: boolean; y1: boolean; y2: boolean; z0: boolean };
  recordedPoints: { x: number; y: number; z: number; a: number; b: number; c: number; tx?: number; ty?: number; trz?: number; j1?: number; j2?: number; j3?: number; j4?: number; j5?: number; j6?: number }[];
  atc?: ATCConfig;
  rackSystem: {
    enabled: boolean;
    rack1: RackConfig;
    rack2: RackConfig;
  };
  hasXYTable: boolean;
  playbackState: {
    isPlaying: boolean;
    activeStep: number;
    speed: number;
  };

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

export type CameraType = 'USB Vision Camera' | 'Thermal (MLX90640)' | 'Thermal (MLX90641)' | 'Thermal (MLX90642)';

export interface CameraState {
  id: number;
  connected: boolean;
  type: CameraType;
  yoloEnabled: boolean;
  detections: { label: string; confidence: number; box: { x: number; y: number; w: number; h: number } }[];
}

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
  uiLayout?: {
    rightPanelWidth?: number;
    pointsTableHeight?: number;
  };
}

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
}

export const createDefaultRobots = (): RobotState[] => {
  const bots = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `Robot A${i + 1}`,
    online: i < 3,
    model: (i % 2 === 0 ? 'Parol6 (6-DOF)' : 'Faze4 (6-DOF)') as RobotModel,
    role: 'Idle' as RobotRole,
    tool: 'None' as ToolType,
    urtcConnected: i < 3,
    pos: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
    joints: { j1: 0, j2: -45, j3: 45, j4: 0, j5: 90, j6: 0 },
    valves: [false, false] as [boolean, boolean],
    pumps: [false, false] as [boolean, boolean],
    endstops: { x1: false, x2: false, y1: false, y2: false, z0: false },
    recordedPoints: [],
    playbackState: { isPlaying: false, activeStep: 0, speed: 100 },
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

const HydraContext = createContext<HydraStoreContextType | null>(null);

export const HydraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [controllers, setControllers] = useState<HydraController[]>(() => {
    try {
      const saved = localStorage.getItem('hydra_controllers');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    
    let host = '192.168.1.100';
    if (typeof window !== 'undefined' && window.location.hostname) {
      host = window.location.hostname;
    }
    const def = JSON.parse(JSON.stringify(defaultControllers));
    def[0].ip = host;
    def[0].id = host;
    return def;
  });
  const [activeControllerId, setActiveControllerId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('hydra_active_controller_id');
      if (saved) return saved;
    } catch(e) {}
    
    let host = '192.168.1.100';
    if (typeof window !== 'undefined' && window.location.hostname) {
      host = window.location.hostname;
    }
    return host;
  });
  const [settings, setSettings] = useState<SystemSettings>(() => {
    let host = '192.168.1.100';
    if (typeof window !== 'undefined' && window.location.hostname) {
      host = window.location.hostname;
    }
    
    try {
      const saved = localStorage.getItem('hydra_settings');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {
    visibleModules: ['Vision/Cameras', 'Robots', 'Macros/Tasks', 'Node Network', 'Settings'],
    integrations: {
      openPnP: { enabled: false, ip: host, port: 8080 },
      slic3r: { enabled: false, ip: host, port: 8080 },
      prusaSlicer: { enabled: false, ip: host, port: 8080 },
      cnc: { software: 'LinuxCNC', enabled: false, port: 8080 },
      laser: { software: 'LightBurn', enabled: false, port: 8080 },
    },
    customModels: [],
    autoConnectRobots: false,
    theme: "Dark Mode (Default)",
    language: "en",
    uiLayout: {
      rightPanelWidth: 320,
      pointsTableHeight: 300,
    }
    };
  });

  React.useEffect(() => {
    localStorage.setItem('hydra_settings', JSON.stringify(settings));
  }, [settings]);

  React.useEffect(() => {
    localStorage.setItem('hydra_controllers', JSON.stringify(controllers));
  }, [controllers]);

  React.useEffect(() => {
    localStorage.setItem('hydra_active_controller_id', activeControllerId);
  }, [activeControllerId]);

  const activeController = useMemo(() => controllers.find(c => c.id === activeControllerId) || controllers[0], [controllers, activeControllerId]);
  const robots = activeController.robots;
  const cameras = activeController.cameras;

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
    a.download = `kinematics_${robot.name.replace(/\s+/g, '_')}.json`;
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

  return (
    <HydraContext.Provider value={{ 
      controllers, activeControllerId, activeController, setActiveControllerId,
      robots, cameras, settings, 
      updateController, updateRobot, updateCamera, updateSettings, 
      saveKinematics, loadKinematics, addController, removeController,
      exportScene, importScene
    }}>
      {children}
    </HydraContext.Provider>
  );
};

export const useHydraStore = () => {
  const ctx = useContext(HydraContext);
  if (!ctx) throw new Error('useHydraStore must be used within HydraProvider');
  return ctx;
};
