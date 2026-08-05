import React, { createContext, useContext, useState } from 'react';

export type RobotModel = 'Parol6' | 'Faze4' | 'Generic';
export type RobotRole = 'PnP' | 'CNC' | '3D_Print' | 'Inspection' | 'Idle';
export type ToolType = 
  | 'None'
  | 'Vacuum Nozzle'
  | '10W Optical Laser'
  | '20W Optical Laser'
  | '40W CO2 Laser'
  | 'Hotend Extruder (0.4mm)'
  | 'Hotend Extruder (High Flow)'
  | 'Dual Extruder'
  | 'Microscope Camera'
  | '4K Vision Camera'
  | '2-Finger Parallel Gripper'
  | '3-Finger Adaptive Gripper'
  | 'Pneumatic Suction Array'
  | 'Solder Paste Dispenser'
  | 'Glue Dispenser'
  | 'Soldering Iron'
  | 'Automatic Screwdriver'
  | 'Pen / Marker Holder'
  | 'Touch Probe'
  | 'ER11 CNC Spindle'
  | 'Polishing Wheel'
  | 'Air Blow Gun'
  | 'Electromagnet'
  | 'UV Curing Lamp'
  | 'Rotary Tool (Dremel)'
  | 'Custom Tool';

export interface RobotState {
  id: number;
  name: string;
  online: boolean;
  model: RobotModel;
  role: RobotRole;
  tool: ToolType;
  pos: { x: number; y: number; z: number; a: number; b: number; c: number };
  valves: [boolean, boolean]; // electrovalvulas
  pumps: [boolean, boolean]; // bombas
  endstops: { x: boolean; y: boolean; z: boolean }; // finales de carrera
  recordedPoints: { x: number; y: number; z: number; a: number; b: number; c: number; tx?: number; ty?: number }[];
}

export interface XYTableState {
  assignedRobotId: number | null;
  pos: { x: number; y: number };
  tableSize: { width: number; length: number };
}

interface HydraStoreContextType {
  robots: RobotState[];
  xyTable: XYTableState;
  updateRobot: (id: number, updates: Partial<RobotState>) => void;
  updateXYTable: (updates: Partial<XYTableState>) => void;
  saveKinematics: (id: number) => void;
  loadKinematics: (id: number, e: React.ChangeEvent<HTMLInputElement>) => void;
}

const defaultRobots: RobotState[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: `Robot A${i + 1}`,
  online: i < 3,
  model: i % 2 === 0 ? 'Parol6' : 'Faze4',
  role: 'Idle',
  tool: 'None',
  pos: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
  valves: [false, false],
  pumps: [false, false],
  endstops: { x: false, y: false, z: false },
  recordedPoints: [],
}));

defaultRobots[0].role = 'PnP';
defaultRobots[0].tool = 'Vacuum Nozzle';
defaultRobots[1].role = 'CNC';
defaultRobots[1].tool = '10W Optical Laser';
defaultRobots[2].role = 'Inspection';
defaultRobots[2].tool = 'Microscope Camera';

const HydraContext = createContext<HydraStoreContextType | null>(null);

export const HydraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [robots, setRobots] = useState<RobotState[]>(defaultRobots);
  const [xyTable, setXyTable] = useState<XYTableState>({
    assignedRobotId: null,
    pos: { x: 0, y: 0 },
    tableSize: { width: 500, length: 500 },
  });

  const updateRobot = (id: number, updates: Partial<RobotState>) => {
    setRobots((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const updateXYTable = (updates: Partial<XYTableState>) => {
    setXyTable((prev) => ({ ...prev, ...updates }));
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
      } catch (err) {
        console.error('Invalid kinematics file');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <HydraContext.Provider value={{ robots, xyTable, updateRobot, updateXYTable, saveKinematics, loadKinematics }}>
      {children}
    </HydraContext.Provider>
  );
};

export const useHydraStore = () => {
  const ctx = useContext(HydraContext);
  if (!ctx) throw new Error('useHydraStore must be used within HydraProvider');
  return ctx;
};
