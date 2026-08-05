import { useRef, useState, useEffect } from 'react';
import { type RobotState, useHydraStore, type RobotRole, type ToolType, type RobotModel } from '../store';
import { Power, Droplets, ArrowUp, ArrowDown, ShieldAlert, Save, Plus, Play, Square, Crosshair, RefreshCw, Upload } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { VirtualKinematics } from './VirtualKinematics';
import { examples } from '../examples/kinematics';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const URTC_TOOLS: ToolType[] = [
  'None', 'Vacuum Nozzle', '10W Optical Laser', '20W Optical Laser', '40W CO2 Laser',
  'Hotend Extruder (0.4mm)', 'Hotend Extruder (High Flow)', 'Dual Extruder',
  'Microscope Camera', '4K Vision Camera', '2-Finger Parallel Gripper',
  '3-Finger Adaptive Gripper', 'Pneumatic Suction Array', 'Solder Paste Dispenser',
  'Glue Dispenser', 'Soldering Iron', 'Automatic Screwdriver', 'Pen / Marker Holder',
  'Touch Probe', 'ER11 CNC Spindle', 'Polishing Wheel', 'Air Blow Gun',
  'Electromagnet', 'UV Curing Lamp', 'Rotary Tool (Dremel)', 'Custom Tool'
];

export function RobotDetail({ robot }: { robot: RobotState }) {
  const { xyTable, updateRobot, updateXYTable, saveKinematics, loadKinematics } = useHydraStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jogStep, setJogStep] = useState<number>(1);
  const [selectedExample, setSelectedExample] = useState<string>('');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [rightTab, setRightTab] = useState<'trajectories' | 'config' | 'io'>('trajectories');

  const hasXYTable = xyTable.assignedRobotId === robot.id;

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

  const handleJog = (axis: keyof RobotState['pos'], direction: number) => {
    updateRobot(robot.id, {
      pos: { ...robot.pos, [axis]: robot.pos[axis] + (direction * jogStep) }
    });
  };

  const handleTableJog = (axis: 'x' | 'y', direction: number) => {
    let newPos = xyTable.pos[axis] + (direction * jogStep);
    if (axis === 'x') newPos = Math.max(0, Math.min(newPos, xyTable.tableSize.width));
    if (axis === 'y') newPos = Math.max(0, Math.min(newPos, xyTable.tableSize.length));
    updateXYTable({ pos: { ...xyTable.pos, [axis]: newPos } });
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
    if (hasXYTable) {
      updateXYTable({ pos: { x: 0, y: 0 } });
    }
  };

  const handleAddPoint = () => {
    updateRobot(robot.id, {
      recordedPoints: [...robot.recordedPoints, { 
        ...robot.pos, 
        ...(hasXYTable ? { tx: xyTable.pos.x, ty: xyTable.pos.y } : {}) 
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
    let currentTablePos = { ...xyTable.pos };
    
    for (let i = 0; i < robot.recordedPoints.length; i++) {
      if (!isPlayingRef.current) break;
      const targetPt = robot.recordedPoints[i];
      const startPt = { ...currentPos };
      const startTable = { ...currentTablePos };
      
      const duration = baseDuration / (playbackSpeedRef.current / 100);
      const steps = Math.max(1, Math.floor(duration / 16)); // ~60fps
      
      for (let step = 1; step <= steps; step++) {
        if (!isPlayingRef.current) break;
        const t = step / steps;
        
        currentPos = {
          x: startPt.x + (targetPt.x - startPt.x) * t,
          y: startPt.y + (targetPt.y - startPt.y) * t,
          z: startPt.z + (targetPt.z - startPt.z) * t,
          a: startPt.a + (targetPt.a - startPt.a) * t,
          b: startPt.b + (targetPt.b - startPt.b) * t,
          c: startPt.c + (targetPt.c - startPt.c) * t,
        };
        
        updateRobot(robot.id, { pos: currentPos });
        
        if (hasXYTable && targetPt.tx !== undefined && targetPt.ty !== undefined) {
          currentTablePos = {
            x: startTable.x + (targetPt.tx - startTable.x) * t,
            y: startTable.y + (targetPt.ty - startTable.y) * t,
          };
          updateXYTable({ pos: currentTablePos });
        }
        
        await new Promise(r => setTimeout(r, 16));
      }
    }
    
    setIsPlaying(false);
    isPlayingRef.current = false;
  };

  const stopTrajectory = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
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
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          {robot.name}
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Online</span>
        </h2>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleResetPos}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors"
          >
            <RefreshCw size={14} /> Reset
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
            className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors"
          >
            <Upload size={14} /> Load JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Left Col: Kinematics & 3D */}
        <div className="md:col-span-2 flex flex-col gap-3 h-full">
          {/* 3D View */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 overflow-hidden flex-1 min-h-[250px] relative">
            <VirtualKinematics robot={robot} />
            <div className="absolute top-3 right-3 pointer-events-none">
              <span className="bg-slate-950/80 backdrop-blur text-slate-300 text-[10px] px-2 py-1 rounded border border-slate-800">
                Points: {robot.recordedPoints.length}
              </span>
            </div>
          </div>

          {/* Joint Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 shrink-0">
            <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
              <h3 className="text-sm font-medium text-slate-200">Joint Controls</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Step:</span>
                <select 
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 min-h-[40px] text-xs text-sky-400 font-mono focus:outline-none focus:border-sky-500"
                  value={jogStep}
                  onChange={(e) => setJogStep(Number(e.target.value))}
                >
                  <option value={0.01}>0.01°</option>
                  <option value={0.1}>0.10°</option>
                  <option value={1}>1.00°</option>
                  <option value={2}>2.00°</option>
                  <option value={5}>5.00°</option>
                  <option value={10}>10.00°</option>
                </select>
                <button 
                  onClick={handleAddPoint}
                  className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded transition-colors"
                >
                  <Plus size={14} /> Add Point
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {(['x', 'y', 'z', 'a', 'b', 'c'] as const).map((axis, i) => (
                <div key={axis} className="bg-slate-950 border border-slate-800 rounded p-1.5 flex flex-col items-center gap-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">J{i+1} ({axis})</div>
                  <div className="text-sm font-mono text-sky-400">{robot.pos[axis].toFixed(2)}°</div>
                  <div className="flex gap-1 mt-1 w-full justify-between">
                    <button onClick={() => handleJog(axis, -1)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center flex-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">
                      <ArrowDown size={16} />
                    </button>
                    <button onClick={() => handleJog(axis, 1)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center flex-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">
                      <ArrowUp size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hasXYTable && (
              <div className="mt-3 pt-3 border-t border-slate-800">
                <h3 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5"><Crosshair size={12} /> XY Table Controls</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-950 border border-slate-800 rounded p-1.5 flex flex-col items-center gap-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Table X</div>
                    <div className="text-sm font-mono text-amber-400">{xyTable.pos.x.toFixed(2)} mm</div>
                    <div className="flex gap-1 mt-1 w-full justify-between">
                      <button onClick={() => handleTableJog('x', -1)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center flex-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">
                        <ArrowDown size={16} />
                      </button>
                      <button onClick={() => handleTableJog('x', 1)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center flex-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">
                        <ArrowUp size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded p-1.5 flex flex-col items-center gap-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Table Y</div>
                    <div className="text-sm font-mono text-amber-400">{xyTable.pos.y.toFixed(2)} mm</div>
                    <div className="flex gap-1 mt-1 w-full justify-between">
                      <button onClick={() => handleTableJog('y', -1)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center flex-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">
                        <ArrowDown size={16} />
                      </button>
                      <button onClick={() => handleTableJog('y', 1)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center flex-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">
                        <ArrowUp size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Tools & I/O */}
        <div className="md:col-span-1 flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          
          <div className="flex border-b border-slate-800 bg-slate-950">
            <button 
              onClick={() => setRightTab('trajectories')}
              className={cn("flex-1 py-2 text-xs font-medium transition-colors", rightTab === 'trajectories' ? "text-emerald-400 border-b-2 border-emerald-500" : "text-slate-400 hover:text-slate-300")}
            >
              Trajectories
            </button>
            <button 
              onClick={() => setRightTab('config')}
              className={cn("flex-1 py-2 text-xs font-medium transition-colors", rightTab === 'config' ? "text-sky-400 border-b-2 border-sky-500" : "text-slate-400 hover:text-slate-300")}
            >
              Config
            </button>
            <button 
              onClick={() => setRightTab('io')}
              className={cn("flex-1 py-2 text-xs font-medium transition-colors", rightTab === 'io' ? "text-amber-400 border-b-2 border-amber-500" : "text-slate-400 hover:text-slate-300")}
            >
              I/O
            </button>
          </div>

          <div className="p-3 overflow-y-auto custom-scrollbar flex-1">
            {rightTab === 'trajectories' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Load Example Kinematics</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 min-h-[40px] text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
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
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Playback Speed</span>
                    <span>{playbackSpeed}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="300" 
                    step="10" 
                    value={playbackSpeed} 
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => saveKinematics(robot.id)}
                    disabled={robot.recordedPoints.length === 0 || isPlaying}
                    className="flex justify-center items-center gap-1.5 px-3 py-2 min-h-[40px] bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors"
                  >
                    <Save size={14} /> Export
                  </button>
                  {isPlaying ? (
                    <button 
                      onClick={stopTrajectory}
                      className="flex justify-center items-center gap-1.5 px-3 py-2 min-h-[40px] bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded transition-colors shadow-lg shadow-rose-500/20"
                    >
                      <Square size={14} className="fill-white" /> Stop
                    </button>
                  ) : (
                    <button 
                      onClick={startTrajectory}
                      disabled={robot.recordedPoints.length === 0}
                      className="flex justify-center items-center gap-1.5 px-3 py-2 min-h-[40px] bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500 text-white font-medium text-xs rounded transition-colors shadow-lg shadow-emerald-500/20"
                    >
                      <Play size={14} className="fill-white" /> Start
                    </button>
                  )}
                </div>
              </div>
            )}

            {rightTab === 'config' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Model</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 min-h-[40px] text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    value={robot.model}
                    onChange={(e) => updateRobot(robot.id, { model: e.target.value as RobotModel })}
                  >
                    <option value="Parol6">Parol6 (6-DOF)</option>
                    <option value="Faze4">Faze4 (6-DOF)</option>
                    <option value="Generic">Generic (6-DOF)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Role</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 min-h-[40px] text-xs text-slate-200 focus:outline-none focus:border-sky-500"
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

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Toolhead</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 min-h-[40px] text-xs text-slate-200 focus:outline-none focus:border-sky-500"
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
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => toggleValve(0)}
                    className={cn("flex flex-col items-center justify-center min-h-[50px] py-2 px-1 rounded border transition-colors", 
                      robot.valves[0] ? "bg-sky-500/10 border-sky-500/50 text-sky-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                    )}
                  >
                    <Droplets size={16} className="mb-1" />
                    <span className="text-[10px] font-medium">Valve 1</span>
                  </button>
                  <button 
                    onClick={() => toggleValve(1)}
                    className={cn("flex flex-col items-center justify-center min-h-[50px] py-2 px-1 rounded border transition-colors", 
                      robot.valves[1] ? "bg-sky-500/10 border-sky-500/50 text-sky-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                    )}
                  >
                    <Droplets size={16} className="mb-1" />
                    <span className="text-[10px] font-medium">Valve 2</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => togglePump(0)}
                    className={cn("flex flex-col items-center justify-center min-h-[50px] py-2 px-1 rounded border transition-colors", 
                      robot.pumps[0] ? "bg-amber-500/10 border-amber-500/50 text-amber-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                    )}
                  >
                    <Power size={16} className="mb-1" />
                    <span className="text-[10px] font-medium">Vac 1</span>
                  </button>
                  <button 
                    onClick={() => togglePump(1)}
                    className={cn("flex flex-col items-center justify-center min-h-[50px] py-2 px-1 rounded border transition-colors", 
                      robot.pumps[1] ? "bg-amber-500/10 border-amber-500/50 text-amber-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                    )}
                  >
                    <Power size={16} className="mb-1" />
                    <span className="text-[10px] font-medium">Vac 2</span>
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800">
                  <h4 className="text-[10px] font-medium text-slate-400 mb-1.5 uppercase">Endstops</h4>
                  <div className="flex gap-1.5">
                    {(['x', 'y', 'z'] as const).map(axis => (
                      <div key={axis} className={cn(
                        "flex-1 py-2 min-h-[36px] rounded flex items-center justify-center gap-1 text-[11px] border font-mono uppercase",
                        robot.endstops[axis] 
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          : "bg-slate-950 border-slate-800 text-slate-500"
                      )}>
                        <div className={cn("w-2 h-2 rounded-full", robot.endstops[axis] ? "bg-rose-500" : "bg-slate-700")} />
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
