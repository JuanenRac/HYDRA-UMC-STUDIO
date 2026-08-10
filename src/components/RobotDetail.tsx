import { useRef, useState, useEffect } from 'react';
import { type RobotState, useHydraStore, type RobotRole, type ToolType, type RobotModel } from '../store';
import { RotateCcw,  Power, Droplets, ArrowUp, ArrowDown, ShieldAlert, Save, Plus, Play, Square, Crosshair, RefreshCw, Upload, Maximize2, Minimize2, Camera as CameraIcon, Trash2  } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { VirtualKinematics } from './VirtualKinematics';
import { examples } from '../examples/kinematics';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const URTC_TOOLS: ToolType[] = [
  'None',
  'Soldering Station (T12)',
  'SMT Solder Paste Dispenser',
  'Thermal Paste / Liquid Dispenser',
  'Smart Electric Screwdriver',
  'Vacuum / Pneumatic Gripper',
  'Drill (BL4260)',
  'Gimbal Gripper',
  'NEMA Gripper',
  'AOI (Automated Optical Inspection) System',
  'Engraving Laser Diode (10W optical)',
  '3D Printing Hotend',
  '3D Scanner Probe',
  'SMT Pick & Place Head',
  'Heavy-Duty Electromagnet',
  'Spot Welder Head',
  'Conformal Coating Airbrush',
  'Large-Format Vacuum Gripper',
  'Functional Testing Head',
  'UV Curing Head',
  'Hot Air Rework Nozzle',
  'Pneumatic Press-Fit Inserter',
  'Wire Harnessing / Crimping Actuator',
  'PCB Advanced Inspection',
  'Solder Paste Jetting Valve',
  'Ultrasonic Welder / Packaging Sealer'
];

export function RobotDetail({ robot }: { robot: RobotState }) {
  const { updateRobot, saveKinematics, loadKinematics, settings, robots } = useHydraStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jogStep, setJogStep] = useState<number>(1);
  const [selectedExample, setSelectedExample] = useState<string>('');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [rightTab, setRightTab] = useState<'trajectories' | 'config' | 'io'>('trajectories');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlMode, setControlMode] = useState<'translate' | 'rotate' | 'scale' | 'none'>('none');
  const toggleControl = (mode: 'translate' | 'rotate' | 'scale') => setControlMode(prev => prev === mode ? 'none' : mode);

  const hasXYTable = robot.hasXYTable;
  const xyTable = robot.xyTable;

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(100);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const playbackSpeedRef = useRef(100);

  // Sync ref
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
    };
  }, []);

  const [jogMode, setJogMode] = useState<'cartesian' | 'joint'>('joint');
  const [pipPos, setPipPos] = useState({ x: 20, y: 20 });
  const [isDraggingPip, setIsDraggingPip] = useState(false);
  const [pipSize, setPipSize] = useState({ w: 192, h: 144 }); // 48rem width equivalent is 192px
  const [isResizingPip, setIsResizingPip] = useState(false);
  const resizeStartRef = useRef({ w: 0, h: 0, x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const pipInitialRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (isDraggingPip) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPipPos({ x: pipInitialRef.current.x - dx, y: pipInitialRef.current.y - dy });
      } else if (isResizingPip) {
        const dx = resizeStartRef.current.x - e.clientX;
        const dy = resizeStartRef.current.y - e.clientY;
        setPipSize({ 
          w: Math.max(120, resizeStartRef.current.w + dx), 
          h: Math.max(90, resizeStartRef.current.h + dy) 
        });
      }
    };
    const handleUp = () => { setIsDraggingPip(false); setIsResizingPip(false); };
    
    if (isDraggingPip || isResizingPip) {
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isDraggingPip, isResizingPip]);

  const [pipConnected, setPipConnected] = useState(false);

  
  const handleJointJog = (joint: keyof RobotState['joints'], direction: number) => {
    const newValue = Math.min(180, Math.max(-180, robot.joints[joint] + (direction * jogStep)));
    updateRobot(robot.id, {
      joints: { ...robot.joints, [joint]: newValue }
    });
  };

  const handleJointSlider = (joint: keyof RobotState['joints'], value: number) => {
    updateRobot(robot.id, {
      joints: { ...robot.joints, [joint]: value }
    });
  };

  // Helper for Pseudo IK to make visual robot arm track Cartesian position
  const computePseudoIK = (pos: RobotState['pos']) => {
    const r = Math.sqrt(pos.x*pos.x + pos.y*pos.y);
    const j1_angle = Math.atan2(pos.y, pos.x) * 180 / Math.PI;
    
    // Tool tip offset: the wrist J5 to tool tip is approx 135mm.
    // So the wrist target Z is pos.z + 135.
    // Base is 170mm + 120mm to Joint 2 = 290mm total Z offset from floor to J2.
    // Therefore, Z distance from J2 to wrist is: (pos.z + 135) - 290
    const zOff = (pos.z + 135) - 290;
    
    const d = Math.sqrt(r*r + zOff*zOff);
    const L1 = 160;
    const L2 = 200;
    const dClamped = Math.max(0.1, Math.min(d, L1 + L2 - 0.1));
    
    // Law of cosines for elbow angle
    const cosElbow = (L1*L1 + L2*L2 - dClamped*dClamped) / (2*L1*L2);
    const elbowAngle = Math.acos(Math.max(-1, Math.min(1, cosElbow)));
    
    // Angle from base to target
    const alpha = Math.atan2(zOff, r);
    // Law of cosines for shoulder angle
    const cosBeta = (L1*L1 + dClamped*dClamped - L2*L2) / (2*L1*dClamped);
    const beta = Math.acos(Math.max(-1, Math.min(1, cosBeta)));
    
    const j2_deg = (alpha + beta) * 180 / Math.PI - 90; // offset so 0 is pointing up
    const j3_deg = 180 - (elbowAngle * 180 / Math.PI);
    
    // Force the tool to point straight down (global Z rotation = -180 deg)
    // Global angle = j2_deg - j3_deg + j5_deg = -180
    let j5_deg = -180 - j2_deg + j3_deg;
    
    // Normalize j5 to be between -180 and 180
    while (j5_deg <= -180) j5_deg += 360;
    while (j5_deg > 180) j5_deg -= 360;

    return {
      j1: j1_angle,
      j2: j2_deg,
      j3: j3_deg,
      j4: pos.a,
      j5: j5_deg,
      j6: pos.c,
    };
  };

  const handleJog = (axis: keyof RobotState['pos'], direction: number) => {
    const newPos = { ...robot.pos, [axis]:  (robot.pos[axis] || 0) + (direction * jogStep) };
    updateRobot(robot.id, {
      pos: newPos,
      joints: computePseudoIK(newPos)
    });
  };

  const handleTableJog = (axis: 'x' | 'y', direction: number) => {
    if (!hasXYTable || !xyTable) return;
    let newPos = xyTable.pos[axis] + (direction * jogStep);
    if (axis === 'x') newPos = Math.max(0, Math.min(newPos, xyTable.tableSize.width));
    if (axis === 'y') newPos = Math.max(0, Math.min(newPos, xyTable.tableSize.length));
    
    updateRobot(robot.id, {
      xyTable: { ...xyTable, pos: { ...xyTable.pos, [axis]: newPos } }
    });
  };

  const toggleValve = (index: 0 | 1) => {
    const newValves = [...robot.valves] as [boolean, boolean];
    newValves[index] = !newValves[index];
    updateRobot(robot.id, { valves: newValves });
  };

  const togglePump = (index: 0 | 1) => {
    const newPumps = [...robot.pumps] as [boolean, boolean];
    newPumps[index] = !newPumps[index];
    updateRobot(robot.id, { pumps: newPumps });
  };

  
  const handleReset3D = () => {
    updateRobot(robot.id, {
      renderScale: 1,
      atc: robot.atc ? { ...robot.atc, renderScale: 1, renderPos: { x: -300, y: 200 }, renderRot: 0, revolverPos: { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, tx: 0, ty: 0 } } : undefined,
      rackSystem: {
        ...robot.rackSystem,
        rack1: { ...robot.rackSystem.rack1, renderScale: 1, renderPos: { x: 300, y: 150 }, renderRot: 0 },
        rack2: { ...robot.rackSystem.rack2, renderScale: 1, renderPos: { x: -300, y: 150 }, renderRot: 0 },
      },
      juanenPnP: { ...robot.juanenPnP, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 },
      lumenPnP: { ...robot.lumenPnP, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 },
      juanenCNC: { ...robot.juanenCNC, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 },
      juanenLaser: { ...robot.juanenLaser, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 },
      vacuumTable: { ...robot.vacuumTable, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 },
      heatedBed: { ...robot.heatedBed, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 },
      xyTable: robot.hasXYTable && robot.xyTable ? { ...robot.xyTable, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 } : robot.xyTable
    } as any);
  };

  const handleResetPos = () => {
    updateRobot(robot.id, { pos: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 } });
    if (hasXYTable && xyTable) {
      updateRobot(robot.id, {
        xyTable: { ...xyTable, pos: { x: 0, y: 0 } }
      });
    }
  };

  const handleAddPoint = () => {
    updateRobot(robot.id, {
      recordedPoints: [...robot.recordedPoints, { 
        ...robot.pos, 
        ...robot.joints,
        ...(hasXYTable && xyTable ? { tx: xyTable.pos.x, ty: xyTable.pos.y } : {}) 
      }]
    });
  };

  const loadExample = (id: string) => {
    setSelectedExample(id);
    if (!id) return;
    const example = examples.find(e => e.id === id);
    if (example) {
      updateRobot(robot.id, { recordedPoints: JSON.parse(JSON.stringify(example.points)) });
    }
  };

  const startTrajectory = async () => {
    if (robot.recordedPoints.length === 0) return;
    setIsPlaying(true);
    isPlayingRef.current = true;
    
    const combinedBots = (robot.combinedWith || []).map(id => robots.find(r => r.id === id)).filter(Boolean) as RobotState[];
    
    const baseDuration = 1000; // ms per point segment
    let currentPos = { ...robot.pos };
    let currentJoints = { ...robot.joints };
    let currentTablePos = hasXYTable && xyTable ? { ...xyTable.pos } : null;
    
    const combinedState = combinedBots.map(b => ({
      id: b.id,
      points: b.recordedPoints || [],
      currentPos: { ...b.pos },
      currentJoints: { ...b.joints },
      currentTablePos: b.hasXYTable && b.xyTable ? { ...b.xyTable.pos } : null,
      hasXYTable: b.hasXYTable,
      xyTable: b.xyTable
    }));
    
    // Find max points length to play them all
    let maxPoints = robot.recordedPoints.length;
    for (const b of combinedState) {
      if (b.points.length > maxPoints) maxPoints = b.points.length;
    }
    
    for (let i = 0; i < maxPoints; i++) {
      setActiveStep(i);
      if (!isPlayingRef.current) break;
      
      const targetPt = robot.recordedPoints[Math.min(i, robot.recordedPoints.length - 1)];
      const startPt = { ...currentPos };
      const startJoints = { ...currentJoints };
      const startTable = currentTablePos ? { ...currentTablePos } : null;
      
      const cTargets = combinedState.map(b => ({
        ...b,
        target: b.points[Math.min(i, Math.max(0, b.points.length - 1))] || b.currentPos,
        startPt: { ...b.currentPos },
        startJoints: { ...b.currentJoints },
        startTable: b.currentTablePos ? { ...b.currentTablePos } : null
      }));
      
      const duration = baseDuration / (playbackSpeedRef.current / 100);
      const steps = Math.max(1, Math.floor(duration / 16)); // ~60fps
      
      for (let step = 1; step <= steps; step++) {
        if (!isPlayingRef.current) break;
        const t = step / steps;
        
        const interpolatedPos = {
          x: startPt.x + (targetPt.x - startPt.x) * t,
          y: startPt.y + (targetPt.y - startPt.y) * t,
          z: startPt.z + (targetPt.z - startPt.z) * t,
          a: startPt.a + (targetPt.a - startPt.a) * t,
          b: startPt.b + (targetPt.b - startPt.b) * t,
          c: startPt.c + (targetPt.c - startPt.c) * t,
        };

        let newJoints;
        if (targetPt.j1 !== undefined && targetPt.j2 !== undefined && targetPt.j3 !== undefined && targetPt.j4 !== undefined && targetPt.j5 !== undefined && targetPt.j6 !== undefined) {
           newJoints = {
             j1: startJoints.j1 + (targetPt.j1 - startJoints.j1) * t,
             j2: startJoints.j2 + (targetPt.j2 - startJoints.j2) * t,
             j3: startJoints.j3 + (targetPt.j3 - startJoints.j3) * t,
             j4: startJoints.j4 + (targetPt.j4 - startJoints.j4) * t,
             j5: startJoints.j5 + (targetPt.j5 - startJoints.j5) * t,
             j6: startJoints.j6 + (targetPt.j6 - startJoints.j6) * t,
           };
        } else {
           newJoints = computePseudoIK(interpolatedPos);
        }
        
        let updatePayload: Partial<RobotState> = { pos: interpolatedPos, joints: newJoints };
        
        if (hasXYTable && startTable && targetPt.tx !== undefined && targetPt.ty !== undefined && xyTable) {
          const interpolatedTablePos = {
            x: startTable.x + (targetPt.tx - startTable.x) * t,
            y: startTable.y + (targetPt.ty - startTable.y) * t,
          };
          updatePayload.xyTable = { ...xyTable, pos: interpolatedTablePos };
          currentTablePos = interpolatedTablePos;
        }
        
        updateRobot(robot.id, updatePayload);
        
        await new Promise(r => setTimeout(r, 16));
      }

      currentPos = { 
        x: targetPt.x, y: targetPt.y, z: targetPt.z, 
        a: targetPt.a, b: targetPt.b, c: targetPt.c 
      };
    }
    
    setIsPlaying(false);
    isPlayingRef.current = false;
    setActiveStep(null);
  };

  const stopTrajectory = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setActiveStep(null);
  };

  const handleRemovePoint = (index: number) => {
    updateRobot(robot.id, {
      recordedPoints: robot.recordedPoints.filter((_, i) => i !== index)
    });
  };

  if (!robot.online) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <ShieldAlert size={48} className="mb-4 opacity-50" />
        <h2 className="text-xl">Robot Offline</h2>
        <p className="text-sm mt-2">Check FDCAN connection to {robot.name}</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full flex flex-col gap-3", isFullscreen && "fixed inset-0 z-50 bg-slate-950 p-4")}>
      {/* Detail Header */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-3">
          {robot.name}
          <span className="px-2 py-1 rounded font-semibold text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">Online</span>
        </h2>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => updateRobot(robot.id, { online: false })}
            className="flex items-center gap-2 px-6 py-3 min-h-[48px] bg-red-600 hover:bg-red-500 border border-red-400 text-white text-sm font-black uppercase tracking-widest rounded-lg transition-all shadow-[0_0_20px_rgba(220,38,38,0.6)] hover:shadow-[0_0_30px_rgba(220,38,38,0.9)] animate-pulse"
          >
            <ShieldAlert size={18} className="fill-white/20" /> E-STOP
          </button>

          <button 
            onClick={() => updateRobot(robot.id, { joints: { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 }, pos: { ...robot.pos, tx: 0, ty: 0, trz: 0 } })}
            className="flex items-center gap-2 px-6 py-3 min-h-[48px] bg-yellow-400 hover:bg-yellow-300 border border-yellow-300 text-slate-950 text-sm font-black uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(250,204,21,0.8)] hover:shadow-[0_0_20px_rgba(250,204,21,1)]"
          >
            HOME
          </button>
          {robot.hasXYTable && (
            <button 
              onClick={() => updateRobot(robot.id, { xyTable: { ...robot.xyTable, pos: { x: 0, y: 0 }, worldPos: { x: 0, y: 0 } } })}
              className="flex items-center gap-2 px-6 py-3 min-h-[48px] bg-yellow-400 hover:bg-yellow-300 border border-yellow-300 text-slate-950 text-sm font-black uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(250,204,21,0.8)] hover:shadow-[0_0_20px_rgba(250,204,21,1)]"
            >
              HOME XY
            </button>
          )}

          
          {isPlaying ? (
            <button 
              onClick={stopTrajectory}
              className="flex justify-center items-center gap-2 px-6 py-3 min-h-[48px] bg-rose-500 text-slate-950 font-bold text-sm uppercase tracking-widest rounded-lg transition-colors shadow-[0_0_15px_rgba(255,102,0,0.6)] border border-rose-400"
            >
              <Square size={16} className="fill-slate-950" /> Stop
            </button>
          ) : (
            <button 
              onClick={startTrajectory}
              disabled={robot.recordedPoints.length === 0}
              className="flex justify-center items-center gap-2 px-6 py-3 min-h-[48px] bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm uppercase tracking-widest rounded-lg transition-colors shadow-[0_0_15px_rgba(0,255,102,0.6)] border border-emerald-400"
            >
              <Play size={16} className="fill-slate-950" /> Start
            </button>
          )}

          <button 
            onClick={handleResetPos}
            className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-cyan-400"
          >
            <RefreshCw size={16} className="fill-slate-950" /> Reset
          </button>
          <button 
            onClick={handleReset3D}
            className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-slate-600"
          >
            <RotateCcw size={16} className="text-white" /> Reset 3D
          </button>
          
          <button 
            onClick={() => saveKinematics(robot.id)}
            disabled={robot.recordedPoints.length === 0 || isPlaying}
            className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-400"
          >
            <Save size={16} /> Export
          </button>
          
          <input 
            type="file" 
            accept=".json" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={(e) => loadKinematics(robot.id, e)} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(217,70,239,0.5)] border border-fuchsia-400"
          >
            <Upload size={16} /> Load
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Left Col: Kinematics & 3D */}
        <div className="flex-1 flex flex-col gap-4 min-h-0 min-w-0">
          {/* 3D View */}
          <div className={cn(
            "bg-slate-900 border border-slate-800 rounded-xl p-1 overflow-hidden flex-1 min-h-[300px] relative shadow-inner",
            isFullscreen && "fixed inset-x-0 bottom-0 top-[140px] z-40 rounded-none border-none bg-slate-950"
          )}>
            <VirtualKinematics robot={robot} controlMode={controlMode} />
            
            <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
              <button 
                className={`px-3 py-1.5 text-xs font-semibold rounded shadow-md border ${controlMode === 'translate' ? 'bg-sky-500 text-white border-sky-400' : 'bg-slate-950/80 backdrop-blur text-slate-300 hover:bg-slate-900 border-slate-800'}`}
                onClick={() => toggleControl('translate')}
              >
                Move
              </button>
              <button 
                className={`px-3 py-1.5 text-xs font-semibold rounded shadow-md border ${controlMode === 'rotate' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-950/80 backdrop-blur text-slate-300 hover:bg-slate-900 border-slate-800'}`}
                onClick={() => toggleControl('rotate')}
              >
                Rotate
              </button>

              <button 
                className={`px-3 py-1.5 text-xs font-semibold rounded shadow-md border ${controlMode === 'scale' ? 'bg-amber-500 text-white border-amber-400' : 'bg-slate-950/80 backdrop-blur text-slate-300 hover:bg-slate-900 border-slate-800'}`}
                onClick={() => toggleControl('scale')}
              >
                Resize
              </button>

              <span className="bg-slate-950/80 backdrop-blur font-mono font-bold text-slate-300 text-xs px-3 py-1.5 rounded border border-slate-800 shadow-md">
                Points: {robot.recordedPoints.length}
              </span>
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="bg-slate-950/80 hover:bg-slate-900 backdrop-blur text-slate-300 p-1.5 rounded border border-slate-800 shadow-md"
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>

            {/* Picture-in-Picture Camera Stream */}
            <div 
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest('.resize-handle')) return;
                e.preventDefault();
                setIsDraggingPip(true);
                dragStartRef.current = { x: e.clientX, y: e.clientY };
                pipInitialRef.current = pipPos;
              }}
              onDoubleClick={() => {
                if (!pipConnected) {
                  setPipConnected(true);
                }
              }}
              style={{ bottom: pipPos.y, right: pipPos.x, width: pipSize.w, height: pipSize.h }}
              className={cn("absolute bg-slate-950 border-2 border-slate-800 rounded-lg overflow-hidden shadow-2xl pointer-events-auto flex flex-col items-center justify-center cursor-move z-10 select-none group", 
                robot.tool.includes('Camera') && !pipConnected && "hover:border-sky-500/50 transition-colors"
              )}>
              
              {robot.tool.includes('Camera') && pipConnected ? (
                <>
                  <div className="w-full h-full bg-black/40 flex items-center justify-center relative overflow-hidden">
                    <CameraIcon size={32} className="text-slate-800" />
                    <div className="absolute inset-0 bg-electric-grid opacity-30 mix-blend-screen pointer-events-none" />
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 text-[9px] font-mono text-emerald-500 bg-slate-900/80 px-1 rounded border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> LIVE
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <CameraIcon size={Math.min(32, pipSize.w / 4)} className={cn("mb-1", robot.tool.includes('Camera') ? "opacity-50 text-slate-500" : "opacity-20 text-slate-700")} />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 text-center px-2">
                    {robot.tool.includes('Camera') ? 'Dbl Click to Connect' : 'No Camera'}
                  </span>
                </>
              )}

              {/* Resize Handle */}
              <div 
                className="resize-handle absolute top-0 left-0 w-6 h-6 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-start justify-start p-1"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsResizingPip(true);
                  resizeStartRef.current = { w: pipSize.w, h: pipSize.h, x: e.clientX, y: e.clientY };
                }}
              >
                <div className="w-2 h-2 border-l-2 border-t-2 border-slate-400" />
              </div>
            </div>
          </div>

          {/* Joint Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shrink-0 shadow-sm">
            <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setJogMode('joint')}
                  className={cn("px-6 py-2 min-h-[44px] rounded-md text-sm font-bold uppercase tracking-wider transition-colors", jogMode === 'joint' ? "bg-sky-500/20 text-sky-400 glow-border-sky" : "text-slate-400 hover:text-slate-300")}
                >
                  Joints
                </button>
                <button
                  onClick={() => setJogMode('cartesian')}
                  className={cn("px-6 py-2 min-h-[44px] rounded-md text-sm font-bold uppercase tracking-wider transition-colors", jogMode === 'cartesian' ? "bg-sky-500/20 text-sky-400 glow-border-sky" : "text-slate-400 hover:text-slate-300")}
                >
                  Cartesian
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Step:</span>
                
                    <select value={jogStep} onChange={e => setJogStep(Number(e.target.value))} className="bg-slate-950 border border-slate-800 rounded p-1 text-sm outline-none font-mono">
                  <option value={0.1}>0.1</option>
                  <option value={1}>1</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={22.5}>22.5</option>
                  <option value={25}>25</option>
                  <option value={45}>45</option>
                  <option value={50}>50</option>
                  <option value={90}>90</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            
            {jogMode === 'joint' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const).map(j => (
                  <div key={j} className="flex flex-col gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase">{j}</span>
                      <span className="text-xs font-mono text-sky-400">{robot.joints[j as keyof typeof robot.joints]?.toFixed(2)}°</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateRobot(robot.id, { joints: { ...robot.joints, [j]: robot.joints[j as keyof typeof robot.joints] - jogStep } })} className="p-2 bg-slate-900 hover:bg-slate-800 rounded text-slate-300">-</button>
                      <input type="range" min="-180" max="180" value={robot.joints[j as keyof typeof robot.joints]} onChange={e => updateRobot(robot.id, { joints: { ...robot.joints, [j]: Number(e.target.value) } })} className="flex-1" />
                      <button onClick={() => updateRobot(robot.id, { joints: { ...robot.joints, [j]: robot.joints[j as keyof typeof robot.joints] + jogStep } })} className="p-2 bg-slate-900 hover:bg-slate-800 rounded text-slate-300">+</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(['x', 'y', 'z', 'a', 'b', 'c'] as const).map(axis => (
                  <div key={axis} className="flex flex-col gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase">{axis}</span>
                      <span className="text-xs font-mono text-sky-400">{robot.pos[axis as keyof typeof robot.pos]?.toFixed(2) || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateRobot(robot.id, { pos: { ...robot.pos, [axis]: (robot.pos[axis as keyof typeof robot.pos] || 0) - jogStep } })} className="p-2 bg-slate-900 hover:bg-slate-800 rounded text-slate-300">-</button>
                      <input type="range" min="-500" max="500" value={robot.pos[axis as keyof typeof robot.pos] || 0} onChange={e => updateRobot(robot.id, { pos: { ...robot.pos, [axis]: Number(e.target.value) } })} className="flex-1" />
                      <button onClick={() => updateRobot(robot.id, { pos: { ...robot.pos, [axis]: (robot.pos[axis as keyof typeof robot.pos] || 0) + jogStep } })} className="p-2 bg-slate-900 hover:bg-slate-800 rounded text-slate-300">+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasXYTable && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-wider"><Crosshair size={16} /> XY Table Controls</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(['tx', 'ty'] as const).map(axis => (
                    <div key={axis} className="flex flex-col gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase">{axis}</span>
                        <span className="text-xs font-mono text-sky-400">{robot.pos[axis]?.toFixed(2) || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateRobot(robot.id, { pos: { ...robot.pos, [axis]: (robot.pos[axis] || 0) - jogStep } })} className="p-2 bg-slate-900 hover:bg-slate-800 rounded text-slate-300">-</button>
                        <input type="range" min="-1000" max="1000" value={robot.pos[axis] || 0} onChange={e => updateRobot(robot.id, { pos: { ...robot.pos, [axis]: Number(e.target.value) } })} className="flex-1" />
                        <button onClick={() => updateRobot(robot.id, { pos: { ...robot.pos, [axis]: (robot.pos[axis] || 0) + jogStep } })} className="p-2 bg-slate-900 hover:bg-slate-800 rounded text-slate-300">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className={cn("w-full lg:w-80 flex flex-col shrink-0 min-h-0 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden", isFullscreen && "hidden")}>
          <div className="flex items-center border-b border-slate-800 bg-slate-900 overflow-x-auto custom-scrollbar shrink-0">
            <button 
              onClick={() => setRightTab('trajectories')} 
              className={cn("flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors", rightTab === 'trajectories' ? "text-sky-400 border-b-2 border-sky-400 bg-slate-800" : "text-slate-400 hover:text-slate-300")}
            >
              Points
            </button>
            <button 
              onClick={() => setRightTab('config')} 
              className={cn("flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors", rightTab === 'config' ? "text-sky-400 border-b-2 border-sky-400 bg-slate-800" : "text-slate-400 hover:text-slate-300")}
            >
              Config
            </button>
            <button 
              onClick={() => setRightTab('io')} 
              className={cn("flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors", rightTab === 'io' ? "text-sky-400 border-b-2 border-sky-400 bg-slate-800" : "text-slate-400 hover:text-slate-300")}
            >
              I/O
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">
            {rightTab === 'trajectories' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Examples</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none"
                    value={selectedExample}
                    onChange={(e) => loadExample(e.target.value)}
                    disabled={isPlaying}
                  >
                    <option value="">-- Select --</option>
                    {examples.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.points.length} pts)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                    <span>Speed</span>
                    <span className="text-sky-400">{playbackSpeed}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="300" 
                    step="10" 
                    value={playbackSpeed} 
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleAddPoint}
                    className="flex-1 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/30 rounded text-sm font-bold uppercase tracking-wider transition-colors"
                  >
                    + Add Point
                  </button>
                  <button 
                    onClick={() => updateRobot(robot.id, { recordedPoints: [] })}
                    className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-sm font-bold uppercase tracking-wider transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {robot.recordedPoints.map((pt, i) => (
                    <div key={i} className={cn("bg-slate-900 border rounded p-2 text-xs flex flex-col gap-1 transition-colors", activeStep === i ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "border-slate-800")}>
                      <div className="flex justify-between items-center border-b border-slate-800/50 pb-1 mb-1">
                        <div className="flex items-center gap-2">
                          {activeStep === i ? (
                            <Play size={12} className="text-emerald-400 animate-pulse fill-emerald-400" />
                          ) : (
                            <span className="w-3" />
                          )}
                          <span className={cn("font-mono font-bold", activeStep === i ? "text-emerald-400" : "text-slate-400")}>STEP {i}</span>
                        </div>
                        <button onClick={() => {
                          const newPts = [...robot.recordedPoints];
                          newPts.splice(i, 1);
                          updateRobot(robot.id, { recordedPoints: newPts });
                        }} className="text-slate-500 hover:text-rose-400 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-6 gap-x-2 gap-y-1 font-mono text-[10px]">
                        <span className="text-slate-500 flex justify-between"><span>X:</span><span className="text-sky-400">{pt.x.toFixed(1)}</span></span>
                        <span className="text-slate-500 flex justify-between"><span>Y:</span><span className="text-sky-400">{pt.y.toFixed(1)}</span></span>
                        <span className="text-slate-500 flex justify-between"><span>Z:</span><span className="text-sky-400">{pt.z.toFixed(1)}</span></span>
                        <span className="text-slate-500 flex justify-between"><span>A:</span><span className="text-sky-400">{pt.a.toFixed(1)}</span></span>
                        <span className="text-slate-500 flex justify-between"><span>B:</span><span className="text-sky-400">{pt.b.toFixed(1)}</span></span>
                        <span className="text-slate-500 flex justify-between"><span>C:</span><span className="text-sky-400">{pt.c.toFixed(1)}</span></span>
                      </div>
                      
                      {(pt.j1 !== undefined || (pt.tx !== undefined && pt.ty !== undefined)) && (
                        <div className="grid grid-cols-6 gap-x-2 gap-y-1 font-mono text-[10px] mt-1 border-t border-slate-800/50 pt-1">
                          {pt.j1 !== undefined ? (
                            <>
                              <span className="text-slate-500 flex justify-between"><span>J1:</span><span className="text-indigo-400">{pt.j1?.toFixed(1)}</span></span>
                              <span className="text-slate-500 flex justify-between"><span>J2:</span><span className="text-indigo-400">{pt.j2?.toFixed(1)}</span></span>
                              <span className="text-slate-500 flex justify-between"><span>J3:</span><span className="text-indigo-400">{pt.j3?.toFixed(1)}</span></span>
                              <span className="text-slate-500 flex justify-between"><span>J4:</span><span className="text-indigo-400">{pt.j4?.toFixed(1)}</span></span>
                              <span className="text-slate-500 flex justify-between"><span>J5:</span><span className="text-indigo-400">{pt.j5?.toFixed(1)}</span></span>
                              <span className="text-slate-500 flex justify-between"><span>J6:</span><span className="text-indigo-400">{pt.j6?.toFixed(1)}</span></span>
                            </>
                          ) : (
                            <span className="col-span-6"></span>
                          )}
                          {pt.tx !== undefined && pt.ty !== undefined && (
                            <>
                              <span className="text-slate-500 flex justify-between col-start-1"><span>TX:</span><span className="text-amber-400">{pt.tx?.toFixed(1)}</span></span>
                              <span className="text-slate-500 flex justify-between col-start-2"><span>TY:</span><span className="text-amber-400">{pt.ty?.toFixed(1)}</span></span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {robot.recordedPoints.length === 0 && (
                    <div className="text-center text-slate-500 py-4 text-sm">
                      No points recorded
                    </div>
                  )}
                </div>
              </div>
            )}

            {rightTab === 'config' && (
              <div className="space-y-6">
                
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3 mt-4">
                  <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Model & Tools</h4>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Model</label>
                    <select 
                      value={robot.model}
                      onChange={e => updateRobot(robot.id, { model: e.target.value as any })}
                      className="bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none"
                    >
                      <option value="Parol6 (6-DOF)">Parol6 (6-DOF)</option>
                      <option value="Faze4 (6-DOF)">Faze4 (6-DOF)</option>
                      <option value="AR3 (6-DOF)">AR3 (6-DOF)</option>
                      <option value="AR4 (6-DOF)">AR4 (6-DOF)</option>
                      <option value="Generic (6-DOF)">Generic (6-DOF)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Role</label>
                    <select 
                      value={robot.role}
                      onChange={e => updateRobot(robot.id, { role: e.target.value as any })}
                      className="bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none"
                    >
                      <option value="Idle">Idle</option>
                      <option value="CNC">CNC</option>
                      <option value="Laser">Laser</option>
                      <option value="Pnp">Pnp</option>
                      <option value="3D printing">3D printing</option>
                      <option value="Inspection">Inspection</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">URTC Tool</label>
                    <select 
                      value={robot.tool}
                      onChange={e => updateRobot(robot.id, { tool: e.target.value as any })}
                      className="bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none"
                    >
                      {URTC_TOOLS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3 mt-4">
                  <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Virtual Environment</h4>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-slate-400">Combine with Robot</span>
                    
                    <div className="flex flex-col gap-2">
                      {robots.filter(r => r.id !== robot.id && r.online).map(r => (
                        <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={(robot.combinedWith || []).includes(r.id)}
                            onChange={(e) => {
                              const current = robot.combinedWith || [];
                              if (e.target.checked) {
                                updateRobot(robot.id, { combinedWith: [...current, r.id] });
                              } else {
                                updateRobot(robot.id, { combinedWith: current.filter(id => id !== r.id) });
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 focus:ring-opacity-50 focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer appearance-none checked:bg-sky-500 checked:border-sky-500 transition-colors relative"
                          />
                          <span className="text-sm text-slate-300">{r.name} (ID: {r.id})</span>
                        </label>
                      ))}
                      {robots.length <= 1 && <span className="text-xs text-slate-500">No other robots available.</span>}
                    </div>

                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Shows the selected robot in the 3D view. Parameters are configured in its own menu.
                  </p>
                </div>
              </div>
            )}


            {rightTab === 'io' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => toggleValve(0)}
                    className={cn("flex flex-col items-center justify-center min-h-[64px] py-2 px-1 rounded-lg border transition-colors", 
                      robot.valves[0] ? "bg-sky-500/10 text-sky-400 glow-border-sky" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:glow-border-sky transition-all hover:glow-border-sky hover:text-sky-400 transition-all"
                    )}
                  >
                    <Droplets size={20} className="mb-2" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Valve 1</span>
                  </button>
                  <button 
                    onClick={() => toggleValve(1)}
                    className={cn("flex flex-col items-center justify-center min-h-[64px] py-2 px-1 rounded-lg border transition-colors", 
                      robot.valves[1] ? "bg-sky-500/10 text-sky-400 glow-border-sky" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:glow-border-sky transition-all hover:glow-border-sky hover:text-sky-400 transition-all"
                    )}
                  >
                    <Droplets size={20} className="mb-2" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Valve 2</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => togglePump(0)}
                    className={cn("flex flex-col items-center justify-center min-h-[64px] py-2 px-1 rounded-lg border transition-colors", 
                      robot.pumps[0] ? "bg-amber-500/10 border-amber-500/50 text-amber-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:glow-border-sky transition-all hover:glow-border-sky hover:text-sky-400 transition-all"
                    )}
                  >
                    <Power size={20} className="mb-2" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Vac 1</span>
                  </button>
                  <button 
                    onClick={() => togglePump(1)}
                    className={cn("flex flex-col items-center justify-center min-h-[64px] py-2 px-1 rounded-lg border transition-colors", 
                      robot.pumps[1] ? "bg-amber-500/10 border-amber-500/50 text-amber-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:glow-border-sky transition-all hover:glow-border-sky hover:text-sky-400 transition-all"
                    )}
                  >
                    <Power size={20} className="mb-2" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Vac 2</span>
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Endstops</h4>
                  <div className="flex gap-2">
                    {(['x1', 'x2', 'y1', 'y2', 'z0'] as const).map(axis => (
                      <div key={axis} className={cn(
                        "flex-1 py-3 min-h-[48px] rounded-lg flex items-center justify-center gap-2 text-sm border font-mono font-bold uppercase",
                        robot.endstops[axis] 
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          : "bg-slate-950 border-slate-800 text-slate-500"
                      )}>
                        <div className={cn("w-2.5 h-2.5 rounded-full", robot.endstops[axis] ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "bg-slate-700")} />
                        {axis}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
