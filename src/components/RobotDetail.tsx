import { useRef, useState, useEffect } from 'react';
import { type RobotState, useHydraStore, type RobotRole, type ToolType, type RobotModel } from '../store';
import { Power, Droplets, ArrowUp, ArrowDown, ShieldAlert, Save, Plus, Play, Square, Crosshair, RefreshCw, Upload, Maximize2, Minimize2, Camera as CameraIcon, Trash2 } from 'lucide-react';
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
  const { updateRobot, saveKinematics, loadKinematics } = useHydraStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jogStep, setJogStep] = useState<number>(1);
  const [selectedExample, setSelectedExample] = useState<string>('');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [rightTab, setRightTab] = useState<'trajectories' | 'config' | 'io'>('trajectories');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const hasXYTable = robot.hasXYTable;
  const xyTable = robot.xyTable;

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(100);
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
        ...(hasXYTable && xyTable ? { tx: xyTable.pos.x, ty: xyTable.pos.y } : {}) 
      }]
    });
  };

  const loadExample = (id: string) => {
    setSelectedExample(id);
    if (!id) return;
    const example = examples.find(e => e.id === id);
    if (example) {
      updateRobot(robot.id, { recordedPoints: example.points });
    }
  };

  const startTrajectory = async () => {
    if (robot.recordedPoints.length === 0) return;
    setIsPlaying(true);
    isPlayingRef.current = true;
    
    const baseDuration = 1000; // ms per point segment
    let currentPos = { ...robot.pos };
    let currentTablePos = hasXYTable && xyTable ? { ...xyTable.pos } : null;
    
    for (let i = 0; i < robot.recordedPoints.length; i++) {
      if (!isPlayingRef.current) break;
      const targetPt = robot.recordedPoints[i];
      const startPt = { ...currentPos };
      const startTable = currentTablePos ? { ...currentTablePos } : null;
      
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

        const currentJoints = computePseudoIK(interpolatedPos);
        
        let updatePayload: Partial<RobotState> = { pos: interpolatedPos, joints: currentJoints };
        
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
  };

  const stopTrajectory = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
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
    <div className="w-full h-full flex flex-col gap-3">
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
            onClick={handleResetPos}
            className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-slate-800 hover:bg-slate-700 hover:glow-border-sky border border-slate-700 transition-all text-slate-200 text-sm font-semibold rounded-lg transition-colors shadow-md"
          >
            <RefreshCw size={16} /> Reset
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
            className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-slate-800 hover:bg-slate-700 hover:glow-border-sky border border-slate-700 transition-all text-slate-200 text-sm font-semibold rounded-lg transition-colors shadow-md"
          >
            <Upload size={16} /> Load JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Left Col: Kinematics & 3D */}
        <div className="lg:col-span-2 flex flex-col gap-4 h-full min-h-0">
          {/* 3D View */}
          <div className={cn(
            "bg-slate-900 border border-slate-800 rounded-xl p-1 overflow-hidden flex-1 min-h-[300px] relative shadow-inner",
            isFullscreen && "fixed inset-0 z-50 rounded-none border-none"
          )}>
            <VirtualKinematics robot={robot} />
            
            <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
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
                <select 
                  className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 min-h-[48px] text-sm text-sky-400 font-mono font-bold focus:outline-none focus:border-sky-500"
                  value={jogStep}
                  onChange={(e) => setJogStep(Number(e.target.value))}
                >
                  <option value={0.1}>0.1</option>
                  <option value={1}>1.0</option>
                  <option value={5}>5.0</option>
                  <option value={10}>10.0</option>
                  <option value={45}>45.0</option>
                </select>
                <button 
                  onClick={handleAddPoint}
                  className="flex items-center gap-2 px-5 py-3 min-h-[48px] bg-sky-500 text-slate-950 text-sm font-bold rounded-lg transition-colors shadow-[0_0_15px_rgba(0,229,255,0.6)] border border-sky-400"
                >
                  <Plus size={20} /> Add Point
                </button>
              </div>
            </div>
            
            {jogMode === 'cartesian' ? (
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                {(['x', 'y', 'z', 'a', 'b', 'c'] as const).map((axis) => (
                  <div key={axis} className="bg-slate-950 border border-slate-800 rounded-lg p-2 flex flex-col items-center gap-1">
                    <div className="text-xs font-bold text-slate-500 uppercase">{axis}</div>
                    <div className="text-base font-mono font-bold text-sky-400 mb-2">{ (robot.pos[axis] || 0).toFixed(2)}</div>
                    <div className="flex gap-2 w-full justify-between">
                      <button onClick={() => handleJog(axis, -1)} className="p-2 min-h-[48px] min-w-[40px] flex items-center justify-center flex-1 bg-slate-800 hover:bg-slate-700 hover:glow-border-sky border border-slate-700 transition-all rounded-lg text-slate-300">
                        <ArrowDown size={20} />
                      </button>
                      <button onClick={() => handleJog(axis, 1)} className="p-2 min-h-[48px] min-w-[40px] flex items-center justify-center flex-1 bg-slate-800 hover:bg-slate-700 hover:glow-border-sky border border-slate-700 transition-all rounded-lg text-slate-300">
                        <ArrowUp size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {(['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const).map((joint, i) => (
                  <div key={joint} className="bg-slate-950 border border-slate-800 rounded-lg p-2 flex items-center gap-3">
                    <div className="w-14 text-center shrink-0">
                      <div className="text-xs font-bold text-slate-500 uppercase">J{i+1}</div>
                      <div className="text-sm font-mono font-bold text-sky-400">{robot.joints[joint].toFixed(1)}°</div>
                    </div>
                    <button onClick={() => handleJointJog(joint, -1)} className="p-2 min-h-[48px] min-w-[44px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 hover:glow-border-sky border border-slate-700 transition-all rounded-lg text-slate-300 shrink-0">
                      <ArrowDown size={20} />
                    </button>
                    <input 
                      type="range"
                      min="-180"
                      max="180"
                      step={0.1}
                      value={robot.joints[joint]}
                      onChange={(e) => handleJointSlider(joint, Number(e.target.value))}
                      className="flex-1 min-w-[40px] h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <button onClick={() => handleJointJog(joint, 1)} className="p-2 min-h-[48px] min-w-[44px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 hover:glow-border-sky border border-slate-700 transition-all rounded-lg text-slate-300 shrink-0">
                      <ArrowUp size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {hasXYTable && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-wider"><Crosshair size={16} /> XY Table Controls</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 flex flex-col items-center gap-1">
                    <div className="text-xs font-bold text-slate-500 uppercase">Table X</div>
                    <div className="text-base font-mono font-bold text-amber-400">{xyTable.pos.x.toFixed(2)} mm</div>
                    <div className="flex gap-2 w-full justify-between">
                      <button onClick={() => handleTableJog('x', -1)} className="p-2 min-h-[48px] min-w-[40px] flex items-center justify-center flex-1 bg-slate-800 hover:bg-slate-700 hover:glow-border-sky border border-slate-700 transition-all rounded-lg text-slate-300">
                        <ArrowDown size={20} />
                      </button>
                      <button onClick={() => handleTableJog('x', 1)} className="p-2 min-h-[48px] min-w-[40px] flex items-center justify-center flex-1 bg-slate-800 hover:bg-slate-700 hover:glow-border-sky border border-slate-700 transition-all rounded-lg text-slate-300">
                        <ArrowUp size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 flex flex-col items-center gap-1">
                    <div className="text-xs font-bold text-slate-500 uppercase">Table Y</div>
                    <div className="text-base font-mono font-bold text-amber-400">{xyTable.pos.y.toFixed(2)} mm</div>
                    <div className="flex gap-2 w-full justify-between">
                      <button onClick={() => handleTableJog('y', -1)} className="p-2 min-h-[48px] min-w-[40px] flex items-center justify-center flex-1 bg-slate-800 hover:bg-slate-700 hover:glow-border-sky border border-slate-700 transition-all rounded-lg text-slate-300">
                        <ArrowDown size={20} />
                      </button>
                      <button onClick={() => handleTableJog('y', 1)} className="p-2 min-h-[48px] min-w-[40px] flex items-center justify-center flex-1 bg-slate-800 hover:bg-slate-700 hover:glow-border-sky border border-slate-700 transition-all rounded-lg text-slate-300">
                        <ArrowUp size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Tools & I/O */}
        <div className="lg:col-span-1 flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden min-h-0">
          
          <div className="flex gap-2 p-2 border-b border-slate-800 bg-slate-950">
            <button 
              onClick={() => setRightTab('trajectories')}
              className={cn("flex-1 py-3 px-3 rounded-lg text-sm font-semibold transition-colors", rightTab === 'trajectories' ? "bg-emerald-500/20 text-emerald-400 glow-border-emerald" : "text-slate-400 hover:text-slate-300 hover:bg-slate-900 border border-transparent")}
            >
              Trajectories
            </button>
            <button 
              onClick={() => setRightTab('config')}
              className={cn("flex-1 py-3 px-3 rounded-lg text-sm font-semibold transition-colors", rightTab === 'config' ? "bg-sky-500/20 text-sky-400 glow-border-sky" : "text-slate-400 hover:text-slate-300 hover:bg-slate-900 border border-transparent")}
            >
              Config
            </button>
            <button 
              onClick={() => setRightTab('io')}
              className={cn("flex-1 py-3 px-3 rounded-lg text-sm font-semibold transition-colors", rightTab === 'io' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm" : "text-slate-400 hover:text-slate-300 hover:bg-slate-900 border border-transparent")}
            >
              I/O
            </button>
          </div>

          <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
            {rightTab === 'trajectories' && (
              <div className="space-y-6 h-full flex flex-col">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Load Example Kinematics</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 min-h-[48px] text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    value={selectedExample}
                    onChange={(e) => loadExample(e.target.value)}
                    disabled={isPlaying}
                  >
                    <option value="">-- Select Example --</option>
                    {examples.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.points.length} pts)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                    <span>Playback Speed</span>
                    <span className="text-emerald-400">{playbackSpeed}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="300" 
                    step="10" 
                    value={playbackSpeed} 
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                <div className="flex-1 min-h-[150px] overflow-y-auto custom-scrollbar border border-slate-800 rounded-lg bg-slate-950">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">#</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase text-right">Robot J1-J6 / XYZABC (mm/°)</th>
                        {hasXYTable && <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase text-right">Table XY (mm)</th>}
                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {robot.recordedPoints.map((pt, i) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-900/50 group">
                          <td className="px-3 py-2 text-xs font-mono text-slate-400">{i + 1}</td>
                          <td className="px-3 py-2 text-xs font-mono text-slate-300 text-right">
                            {pt.x.toFixed(1)}, {pt.y.toFixed(1)}, {pt.z.toFixed(1)} <br/> {pt.a.toFixed(1)}°, {pt.b.toFixed(1)}°, {pt.c.toFixed(1)}°
                          </td>
                          {hasXYTable && (
                            <td className="px-3 py-2 text-xs font-mono text-amber-400/80 text-right">
                              {pt.tx?.toFixed(1) ?? '0.0'}, {pt.ty?.toFixed(1) ?? '0.0'}
                            </td>
                          )}
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => handleRemovePoint(i)} className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {robot.recordedPoints.length === 0 && (
                        <tr>
                          <td colSpan={hasXYTable ? 4 : 3} className="px-3 py-8 text-center text-xs text-slate-500">
                            No points recorded.<br/>Jog the robot and click "Record Point".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <button 
                    onClick={() => saveKinematics(robot.id)}
                    disabled={robot.recordedPoints.length === 0 || isPlaying}
                    className="flex justify-center items-center gap-2 px-4 py-3 min-h-[48px] bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition-colors"
                  >
                    <Save size={16} /> Export
                  </button>
                  {isPlaying ? (
                    <button 
                      onClick={stopTrajectory}
                      className="flex justify-center items-center gap-2 px-4 py-3 min-h-[48px] bg-rose-500 text-slate-950 font-bold text-sm rounded-lg transition-colors shadow-[0_0_15px_rgba(255,102,0,0.6)] border border-rose-400"
                    >
                      <Square size={16} className="fill-white" /> Stop
                    </button>
                  ) : (
                    <button 
                      onClick={startTrajectory}
                      disabled={robot.recordedPoints.length === 0}
                      className="flex justify-center items-center gap-2 px-4 py-3 min-h-[48px] bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm rounded-lg transition-colors shadow-[0_0_15px_rgba(0,255,102,0.6)] border border-emerald-400"
                    >
                      <Play size={16} className="fill-white" /> Start
                    </button>
                  )}
                </div>
              </div>
            )}

            {rightTab === 'config' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Model</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 min-h-[48px] text-sm text-slate-200 focus:outline-none focus:border-sky-400 focus:glow-border-sky transition-all"
                    value={robot.model}
                    onChange={(e) => updateRobot(robot.id, { model: e.target.value as RobotModel })}
                  >
                    <option value="Parol6">Parol6 (6-DOF)</option>
                    <option value="Faze4">Faze4 (6-DOF)</option>
                    <option value="Generic">Generic (6-DOF)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Role</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 min-h-[48px] text-sm text-slate-200 focus:outline-none focus:border-sky-400 focus:glow-border-sky transition-all"
                    value={robot.role}
                    onChange={(e) => updateRobot(robot.id, { role: e.target.value as RobotRole })}
                  >
                    <option value="Idle">Idle</option>
                    <option value="PnP">Pick & Place</option>
                    <option value="CNC">CNC / Laser</option>
                    <option value="3D_Print">3D Printing</option>
                    <option value="Inspection">Inspection</option>
                  </select>
                </div>

                
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Crosshair size={14} className={robot.urtcConnected ? "text-emerald-400" : "text-slate-500"} /> 
                      URTC Tool Interface
                    </label>
                    <button 
                      onClick={() => updateRobot(robot.id, { urtcConnected: !robot.urtcConnected })}
                      className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors", robot.urtcConnected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-500 border border-slate-700")}
                    >
                      {robot.urtcConnected ? 'Linked' : 'Offline'}
                    </button>
                  </div>
                  <select 
                    disabled={!robot.urtcConnected}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 min-h-[48px] text-sm text-slate-200 focus:outline-none focus:border-sky-400 focus:glow-border-sky transition-all disabled:opacity-50"

                    value={robot.tool}
                    onChange={(e) => updateRobot(robot.id, { tool: e.target.value as ToolType })}
                  >
                    {URTC_TOOLS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
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
