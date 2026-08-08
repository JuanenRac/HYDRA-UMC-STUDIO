import React, { createContext, useContext, useState, useMemo } from 'react';

export type RobotModel = 'Parol6' | 'Faze4' | 'Generic';
export type RobotRole = 'PnP' | 'CNC' | '3D_Print' | 'Inspection' | 'Idle';
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

export interface RackConfig {
  type: 'Input' | 'Output' | 'None';
  capacity: number;
  usableSlots: boolean[];
  renderPos?: { x: number; y: number };
  basePickupPos: {
    j1: number; j2: number; j3: number; j4: number; j5: number; j6: number;
    tx: number; ty: number;
  };
}

export interface ATCConfig {
  type: ATCType;
  panelGrid: ATCGrid;
  revolverSlots: number;
  renderPos?: { x: number; y: number };
  revolverPos?: { j1: number; j2: number; j3: number; j4: number; j5: number; j6: number; tx?: number; ty?: number };
  tools: {
    slot: number;
    tool: ToolType;
    pos?: { j1: number; j2: number; j3: number; j4: number; j5: number; j6: number; tx?: number; ty?: number };
  }[];
}

export interface RobotState {
  id: number;
  name: string;
  online: boolean;
  model: RobotModel;
  role: RobotRole;
  tool: ToolType;
  urtcConnected: boolean;
  pos: { x: number; y: number; z: number; a: number; b: number; c: number; tx?: number; ty?: number };
  joints: { j1: number; j2: number; j3: number; j4: number; j5: number; j6: number };
  valves: [boolean, boolean];
  pumps: [boolean, boolean];
  endstops: { x1: boolean; x2: boolean; y1: boolean; y2: boolean; z0: boolean };
  recordedPoints: { x: number; y: number; z: number; a: number; b: number; c: number; tx?: number; ty?: number }[];
  atc?: ATCConfig;
  rackSystem: {
    enabled: boolean;
    rack1: RackConfig;
    rack2: RackConfig;
  };
  hasXYTable: boolean;
  xyTable: {
    pos: { x: number; y: number };
    worldPos?: { x: number; y: number };
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
  autoConnectRobots: boolean;
  theme: string;
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
}

export const createDefaultRobots = (): RobotState[] => {
  const bots = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `Robot A${i + 1}`,
    online: i < 3,
    model: i % 2 === 0 ? 'Parol6' : 'Faze4' as RobotModel,
    role: 'Idle' as RobotRole,
    tool: 'None' as ToolType,
    urtcConnected: i < 3,
    pos: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
    joints: { j1: 0, j2: -45, j3: 45, j4: 0, j5: 90, j6: 0 },
    valves: [false, false] as [boolean, boolean],
    pumps: [false, false] as [boolean, boolean],
    endstops: { x1: false, x2: false, y1: false, y2: false, z0: false },
    recordedPoints: [],
    hasXYTable: false,
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
  bots[0].role = 'PnP';
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
  const [controllers, setControllers] = useState<HydraController[]>(defaultControllers);
  const [activeControllerId, setActiveControllerId] = useState<string>(defaultControllers[0].id);
  const [settings, setSettings] = useState<SystemSettings>({
    autoConnectRobots: false,
    theme: "Dark Mode (Default)"
  });

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

  return (
    <HydraContext.Provider value={{ 
      controllers, activeControllerId, activeController, setActiveControllerId,
      robots, cameras, settings, 
      updateController, updateRobot, updateCamera, updateSettings, 
      saveKinematics, loadKinematics, addController, removeController 
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
