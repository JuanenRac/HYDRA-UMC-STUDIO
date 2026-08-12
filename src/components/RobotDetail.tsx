// =============================================================================
// HYDRA-UMC STUDIO - React Component: RobotDetail.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { useRef, useState, useEffect } from 'react';
import { motion, useDragControls } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { type RobotState, useHydraStore, type RobotRole, type ToolType, type RobotModel, unthrottledDelay, globalPlaybacks } from '../store';
import { RotateCcw, Home, Video, AlertOctagon,  Power, Droplets, ArrowUp, ArrowDown, ShieldAlert, Save, Plus, Play, Square, Crosshair, RefreshCw, Upload, Maximize2, Minimize2, Camera as CameraIcon, Trash2, X  } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { VirtualKinematics } from './VirtualKinematics';
import { examples } from '../examples/kinematics';

/**
 * Executes the Cn logic. 
 * This function handles the necessary computations and state updates.
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Stores the  u r t c_ t o o l s configuration or state data. */
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


/**
 * Renders the  camera p i p component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
const CameraPIP = ({ bot, initialX, initialY, label, t }: { bot: RobotState, initialX: number, initialY: number, label: string, t: any }) => {
  const { settings, updateSettings } = useHydraStore();
  const controls = useDragControls();
  const pipConfig = settings.uiLayout?.cameraPips?.[bot.id] || { w: 192, h: 144, x: initialX, y: initialY, isOpen: true };
  const isOpen = pipConfig.isOpen !== false;

  const [size, setSize] = useState({ w: pipConfig.w || 192, h: pipConfig.h || 144 });
  const resizeRef = useRef(false);
  const startSize = useRef({ w: 0, h: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  
  const pipConfigRef = useRef(pipConfig);
  const layoutRef = useRef(settings.uiLayout);
  const sizeRef = useRef(size);
  const settingsRef = useRef(settings);
  const updateSettingsRef = useRef(updateSettings);

  useEffect(() => {
    pipConfigRef.current = pipConfig;
    layoutRef.current = settings.uiLayout;
    settingsRef.current = settings;
    updateSettingsRef.current = updateSettings;
  }, [pipConfig, settings, updateSettings]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => {
    if (!resizeRef.current) {
      setSize({ w: pipConfig.w || 192, h: pipConfig.h || 144 });
    }
  }, [pipConfig.w, pipConfig.h]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!resizeRef.current) return;
      const newW = Math.max(160, startSize.current.w + (e.clientX - startPos.current.x));
      const newH = Math.max(120, startSize.current.h + (e.clientY - startPos.current.y));
      setSize({ w: newW, h: newH });
      sizeRef.current = { w: newW, h: newH };
    };
    const handleUp = () => {
      if (resizeRef.current) {
        document.body.classList.remove('select-none');
        resizeRef.current = false;
        // Save size on drop
        const finalSize = sizeRef.current;
        const freshSettings = settingsRef.current;
        const freshPip = freshSettings.uiLayout?.cameraPips?.[bot.id] || pipConfig;
        updateSettingsRef.current({
          uiLayout: {
            ...freshSettings.uiLayout,
            cameraPips: {
              ...freshSettings.uiLayout?.cameraPips,
              [bot.id]: { ...freshPip, w: finalSize.w, h: finalSize.h }
            }
          }
        });
      }
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [bot.id, updateSettings]);

  if (!isOpen) return null;

  return (
    <motion.div 
      drag
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      initial={{ x: pipConfig.x || initialX, y: pipConfig.y || initialY }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setSize({ w: 192, h: 144 });
        sizeRef.current = { w: 192, h: 144 };
        const freshSettings = settingsRef.current;
        const freshPip = freshSettings.uiLayout?.cameraPips?.[bot.id] || pipConfig;
        updateSettingsRef.current({
          uiLayout: {
            ...freshSettings.uiLayout,
            cameraPips: {
              ...freshSettings.uiLayout?.cameraPips,
              [bot.id]: { ...freshPip, w: 192, h: 144 }
            }
          }
        });
      }}
      onDragEnd={(e, info) => {
        const freshSettings = settingsRef.current;
        const freshPip = freshSettings.uiLayout?.cameraPips?.[bot.id] || pipConfig;
        updateSettingsRef.current({
          uiLayout: {
            ...freshSettings.uiLayout,
            cameraPips: {
              ...freshSettings.uiLayout?.cameraPips,
              [bot.id]: { 
                ...freshPip, 
                x: (freshPip.x || initialX) + info.offset.x, 
                y: (freshPip.y || initialY) + info.offset.y 
              }
            }
          }
        });
      }}
      style={{ width: size.w, height: size.h }}
      className="absolute bottom-4 right-4 bg-slate-950/80 backdrop-blur border border-slate-700 rounded-lg overflow-hidden shadow-2xl z-50 flex flex-col pointer-events-auto"
    >
      <div 
        className="bg-slate-900/90 px-2 py-1 flex justify-between items-center border-b border-slate-800 cursor-move"
        onPointerDown={(e) => {
          e.stopPropagation();
          controls.start(e);
        }}
      >
        <span className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1 truncate"><CameraIcon size={12} className="shrink-0" /> {label}</span>
        <div className="flex items-center gap-2">
          <span className={cn("shrink-0 w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.8)]", bot.online ? "bg-emerald-500" : "bg-rose-500")} />
          <button 
            onClick={(e) => {
              e.stopPropagation();
              updateSettings({
                uiLayout: {
                  ...settings.uiLayout,
                  cameraPips: {
                    ...settings.uiLayout?.cameraPips,
                    [bot.id]: { ...pipConfig, isOpen: false }
                  }
                }
              });
            }}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-black relative flex items-center justify-center pointer-events-none">
         <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(transparent 50%, rgba(0,0,0,0.5) 50%)', backgroundSize: '100% 4px' }} />
         <CameraIcon size={24} className="text-slate-800 pointer-events-none" />
         {bot.playbackState?.isPlaying && (
           <div className="absolute inset-0 border-2 border-emerald-500/30 animate-pulse pointer-events-none" />
         )}
         <div className="absolute bottom-1 left-1 text-[8px] font-mono text-emerald-500/70 pointer-events-none">
           {bot.pos.tx?.toFixed(1) || 0} {bot.pos.ty?.toFixed(1) || 0}
         </div>
      </div>
      <div 
        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-20 flex items-end justify-end p-1"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          document.body.classList.add('select-none');
          resizeRef.current = true;
          startSize.current = size;
          startPos.current = { x: e.clientX, y: e.clientY };
        }}
      >
        <div className="w-2 h-2 border-r-2 border-b-2 border-slate-400 opacity-50 pointer-events-none" />
      </div>
    </motion.div>
  );
};


/**
 * Executes the  robot detail logic. 
 * This function handles the necessary computations and state updates.
 */
export function RobotDetail({ robot }: { robot: RobotState }) {
  const { t } = useTranslation();
  const { updateRobot, saveKinematics, loadKinematics, settings, robots, updateSettings } = useHydraStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jogStep, setJogStep] = useState<number>(1);
  const [selectedExample, setSelectedExample] = useState<string>('');

  const loadExample = (id: string) => {
    setSelectedExample(id);
    const ex = examples.find(e => e.id === id);
    if (ex) {
      updateRobot(robot.id, { recordedPoints: ex.points as any });
    }
  };

  const loadExampleForRobot = (botId: number, exId: string) => {
    const ex = examples.find(e => e.id === exId);
    if (ex) {
      updateRobot(botId, { recordedPoints: ex.points as any });
    }
  };


  const handleStop = () => {
    globalPlaybacks[robot.id] = false;
    robot.combinedWith?.forEach(id => {
      globalPlaybacks[id] = false;
    });
    updateRobot(robot.id, { playbackState: { isPlaying: false, activeStep: -1, speed: 100 } });
    robot.combinedWith?.forEach(id => updateRobot(id, { playbackState: { isPlaying: false, activeStep: -1, speed: 100 } }));
  };

  const handlePlay = async (playAll: boolean = false) => {
    globalPlaybacks[robot.id] = true;
    if (playAll) {
      robot.combinedWith?.forEach(id => {
        globalPlaybacks[id] = true;
      });
    }

    if (robot.recordedPoints.length === 0) return;
    updateRobot(robot.id, { playbackState: { isPlaying: true, activeStep: 0, speed: 100 } });
    const playRobotTrajectory = async (rId: number, points: any[]) => {
      let currentStep = 0;
      
      // Determine initial state
      const initialRState = rId === robot.id ? robot : combinedBotsInfo.find(b => b.id === rId);
      let currentPos = { ...(initialRState?.pos || { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 }) };
      let currentJoints = { ...(initialRState?.joints || { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 }) };

      while (currentStep < points.length) {
        if (!globalPlaybacks[rId]) break;
        const pt = points[currentStep];
        
        let j1 = pt.j1;
        let j2 = pt.j2;
        let j3 = pt.j3;
        let j4 = pt.j4;
        let j5 = pt.j5;
        let j6 = pt.j6;

        // Pseudo-IK if joints are not provided
        if (j1 === undefined) {
           const L1 = 160;
           const L2 = 200;
           const r = Math.sqrt(pt.x*pt.x + pt.y*pt.y) || 0.001;
           const zOff = pt.z - 195;
           const d = Math.sqrt(r*r + zOff*zOff);
           
           j1 = Math.atan2(pt.y, pt.x) * 180 / Math.PI;
           
           let cosJ3 = (r*r + zOff*zOff - L1*L1 - L2*L2) / (2 * L1 * L2);
           cosJ3 = Math.max(-1, Math.min(1, cosJ3));
           j3 = Math.acos(cosJ3) * 180 / Math.PI;
           
           const phi = Math.atan2(r, zOff);
           let cosGamma = (L1*L1 + d*d - L2*L2) / (2*L1*d);
           cosGamma = Math.max(-1, Math.min(1, cosGamma));
           const gamma = Math.acos(cosGamma);
           
           const theta1_rad = phi - gamma;
           j2 = -theta1_rad * 180 / Math.PI;

           j4 = pt.a || 0;
           j5 = -j2 + j3 - 180;
           j6 = pt.c || 0;
        }

        
        let x = pt.x;
        let y = pt.y;
        let z = pt.z;
        let a = pt.a;
        let b = pt.b;
        let c = pt.c;
        if (x === undefined && j1 !== undefined) {
           const j1Rad = j1 * (Math.PI / 180);
           const j2Rad = j2 * (Math.PI / 180);
           const j3Rad = j3 * (Math.PI / 180);
           
           const theta1_rad = -j2Rad;
           const R2 = 160 * Math.sin(theta1_rad) + 200 * Math.sin(theta1_rad + j3Rad);
           const Z2 = 160 * Math.cos(theta1_rad) + 200 * Math.cos(theta1_rad + j3Rad);
           
           x = R2 * Math.cos(j1Rad);
           y = R2 * Math.sin(j1Rad);
           z = Z2 + 195;
           a = j4;
           b = j5 + j2 - j3 + 180;
           c = j6;
        }

        const targetPos = { 
           x: x, y: y, z: z, a: a, b: b, c: c,
           tx: pt.tx !== undefined ? pt.tx : currentPos.tx,
           ty: pt.ty !== undefined ? pt.ty : currentPos.ty,
           trz: pt.trz !== undefined ? pt.trz : currentPos.trz 
         };

        const targetJoints = { j1: j1||0, j2: j2||0, j3: j3||0, j4: j4||0, j5: j5||0, j6: j6||0 };
        
        const startPos = { ...currentPos };
        const startJoints = { ...currentJoints };

        const maxJointDiff = Math.max(
          Math.abs(targetJoints.j1 - (startJoints.j1||0)),
          Math.abs(targetJoints.j2 - (startJoints.j2||0)),
          Math.abs(targetJoints.j3 - (startJoints.j3||0)),
          Math.abs(targetJoints.j4 - (startJoints.j4||0)),
          Math.abs(targetJoints.j5 - (startJoints.j5||0)),
          Math.abs(targetJoints.j6 - (startJoints.j6||0))
        );
        const xyDist = Math.sqrt(Math.pow((targetPos.tx || 0) - (startPos.tx || 0), 2) + Math.pow((targetPos.ty || 0) - (startPos.ty || 0), 2));
        const effectiveDist = Math.max(maxJointDiff * 2, xyDist, 0.1);

        const baseVelocity = 50; 
        const currentVelocity = baseVelocity * ((playbackSpeedRef.current || 100) / 100);
        const durationMs = (effectiveDist / currentVelocity) * 1000;
        
        const steps = Math.max(1, Math.floor(durationMs / 16));
        
        for (let i = 1; i <= steps; i++) {
          if (!globalPlaybacks[rId]) break;
          const t = i / steps;
          const lerp = (s: number, e: number, t: number) => s + (e - s) * t;
          
          const interpPos = {
              x: lerp(startPos.x || 0, targetPos.x || 0, t),
              y: lerp(startPos.y || 0, targetPos.y || 0, t),
              z: lerp(startPos.z || 0, targetPos.z || 0, t),
              a: lerp(startPos.a || 0, targetPos.a || 0, t),
              b: lerp(startPos.b || 0, targetPos.b || 0, t),
              c: lerp(startPos.c || 0, targetPos.c || 0, t),
              tx: targetPos.tx !== undefined ? lerp(startPos.tx || 0, targetPos.tx, t) : undefined,
              ty: targetPos.ty !== undefined ? lerp(startPos.ty || 0, targetPos.ty, t) : undefined,
              trz: targetPos.trz !== undefined ? lerp(startPos.trz || 0, targetPos.trz, t) : undefined,
          };
          
          const interpJoints = {
              j1: lerp(startJoints.j1 || 0, targetJoints.j1 || 0, t),
              j2: lerp(startJoints.j2 || 0, targetJoints.j2 || 0, t),
              j3: lerp(startJoints.j3 || 0, targetJoints.j3 || 0, t),
              j4: lerp(startJoints.j4 || 0, targetJoints.j4 || 0, t),
              j5: lerp(startJoints.j5 || 0, targetJoints.j5 || 0, t),
              j6: lerp(startJoints.j6 || 0, targetJoints.j6 || 0, t),
          };

          const xyUpdate = initialRState?.hasXYTable && (interpPos.tx !== undefined || interpPos.ty !== undefined) ? {
            xyTable: {
              ...initialRState.xyTable!,
              pos: { x: interpPos.tx ?? initialRState.xyTable!.pos.x, y: interpPos.ty ?? initialRState.xyTable!.pos.y }
            }
          } : {};

          updateRobot(rId, { 
            pos: interpPos as any, 
            joints: interpJoints, 
            playbackState: { isPlaying: true, activeStep: currentStep, speed: 100 }, 
            ...xyUpdate 
          });
          
          await unthrottledDelay();
        }
        
        currentPos = { ...targetPos } as any;
        currentJoints = { ...targetJoints };

        if (!globalPlaybacks[rId]) break;
        currentStep++;
      }
      updateRobot(rId, { playbackState: { isPlaying: false, activeStep: -1, speed: 100 } });
    };
    playRobotTrajectory(robot.id, robot.recordedPoints);
    if (playAll) {
      combinedBotsInfo.forEach(bot => {
        if (bot.recordedPoints.length > 0) {
          updateRobot(bot.id, { playbackState: { isPlaying: true, activeStep: 0, speed: 100 } });
          playRobotTrajectory(bot.id, bot.recordedPoints);
        }
      });
    }
  };

  
  const [rightPanelWidth, setRightPanelWidth] = useState(settings.uiLayout?.rightPanelWidth || 320);
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false);
  const rightPanelResizeStartRef = useRef({ width: 0, x: 0 });
  const rightPanelWidthRef = useRef(rightPanelWidth);
  const uiLayoutRef = useRef(settings.uiLayout);

  useEffect(() => {
    rightPanelWidthRef.current = rightPanelWidth;
    uiLayoutRef.current = settings.uiLayout;
  }, [rightPanelWidth, settings.uiLayout]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (isResizingRightPanel) {
        const dx = rightPanelResizeStartRef.current.x - e.clientX;
        const newWidth = Math.max(250, Math.min(800, rightPanelResizeStartRef.current.width + dx));
        setRightPanelWidth(newWidth);
      }
    };
    const handleUp = () => {
      document.body.classList.remove('select-none');
      setIsResizingRightPanel(false);
      updateSettings({
        uiLayout: {
          ...uiLayoutRef.current,
          rightPanelWidth: rightPanelWidthRef.current,
        }
      });
    };
    
    if (isResizingRightPanel) {
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isResizingRightPanel, updateSettings]);

      const [rightTab, setRightTab] = useState<'trajectories' | 'config' | 'io'>('trajectories');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlMode, setControlMode] = useState<'translate' | 'rotate' | 'scale' | 'none'>('none');
  const toggleControl = (mode: 'translate' | 'rotate' | 'scale') => setControlMode(prev => prev === mode ? 'none' : mode);

  const hasXYTable = robot.hasXYTable;
  const xyTable = robot.xyTable;

  const combinedBotsInfo = (robot.combinedWith || []).map(id => robots.find(r => r.id === id)).filter(Boolean) as RobotState[];
  const hasAnyPoints = robot.recordedPoints.length > 0 || combinedBotsInfo.some(b => b.recordedPoints.length > 0);
  const isStartAll = combinedBotsInfo.length > 0;

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(100);
    const playbackSpeedRef = useRef(100);

  // Sync ref
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    if (robot.playbackState?.isPlaying && robot.playbackState?.activeStep !== null && robot.playbackState?.activeStep !== -1) {
      const el = document.getElementById(`step-${robot.id}-${robot.playbackState?.activeStep}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [robot.playbackState?.activeStep, robot.playbackState?.isPlaying, robot.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      
    };
  }, []);

  const [reset3DKey, setReset3DKey] = useState(0);
  const [threeDHeight, setThreeDHeight] = useState<number | undefined>(settings.uiLayout?.threeDHeight);
  const dragRef = useRef(false);
  const startDragY = useRef(0);
  const startHeight = useRef(0);
  const currentHeightRef = useRef(threeDHeight);
  
  useEffect(() => {
    currentHeightRef.current = threeDHeight;
  }, [threeDHeight]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const newHeight = Math.max(200, startHeight.current + (e.clientY - startDragY.current));
      setThreeDHeight(newHeight);
    };
    const handleUp = () => {
      if (dragRef.current) {
        document.body.classList.remove('select-none');
        dragRef.current = false;
        if (currentHeightRef.current) {
          updateSettings({ uiLayout: { ...uiLayoutRef.current, threeDHeight: currentHeightRef.current } });
        }
      }
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [updateSettings]);

  const handleAddPoint = () => {
    updateRobot(robot.id, {
      recordedPoints: [...robot.recordedPoints, { 
        j1: Number(robot.joints.j1.toFixed(3)), 
        j2: Number(robot.joints.j2.toFixed(3)), 
        j3: Number(robot.joints.j3.toFixed(3)), 
        j4: Number(robot.joints.j4.toFixed(3)), 
        j5: Number(robot.joints.j5.toFixed(3)), 
        j6: Number(robot.joints.j6.toFixed(3)), 
        ...(robot.hasXYTable ? {
          tx: Number((robot.pos.tx || 0).toFixed(3)), 
          ty: Number((robot.pos.ty || 0).toFixed(3)), 
          trz: Number((robot.pos.trz || 0).toFixed(3))
        } : {})
      }]
    });
  };

  const toggleValve = (index: number) => {
    const newValves = [...robot.valves] as [boolean, boolean];
    newValves[index] = !newValves[index];
    updateRobot(robot.id, { valves: newValves });
  };

  const togglePump = (index: number) => {
    const newPumps = [...robot.pumps] as [boolean, boolean];
    newPumps[index] = !newPumps[index];
    updateRobot(robot.id, { pumps: newPumps });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", robot.online ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]")} />
            {robot.name}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded-md uppercase font-bold tracking-wider">{robot.model}</span>
            <span className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded-md uppercase font-bold tracking-wider">{robot.tool}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Panel: 3D View */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div 
            className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col group shrink-0 min-h-[200px]"
            style={{ flex: threeDHeight ? `0 0 ${threeDHeight}px` : '1 1 0%' }}
          >
            <VirtualKinematics key={reset3DKey} robot={robot} controlMode={controlMode} />

            <div className="absolute bottom-4 left-4 z-50 flex gap-2 pointer-events-auto">
              <button 
                onClick={() => toggleControl('translate')}
                className={cn("p-2 rounded bg-slate-950/80 border backdrop-blur-sm transition-colors", controlMode === 'translate' ? "border-sky-500 text-sky-400" : "border-slate-800 text-slate-400 hover:text-slate-300")}
                title={t('robot_detail.move', 'Move')}
              >
                <ArrowUp size={16} />
              </button>
              <button 
                onClick={() => toggleControl('rotate')}
                className={cn("p-2 rounded bg-slate-950/80 border backdrop-blur-sm transition-colors", controlMode === 'rotate' ? "border-sky-500 text-sky-400" : "border-slate-800 text-slate-400 hover:text-slate-300")}
                title={t('robot_detail.rotate', 'Rotate')}
              >
                <RotateCcw size={16} />
              </button>
              <button 
                onClick={() => toggleControl('scale')}
                className={cn("p-2 rounded bg-slate-950/80 border backdrop-blur-sm transition-colors", controlMode === 'scale' ? "border-sky-500 text-sky-400" : "border-slate-800 text-slate-400 hover:text-slate-300")}
                title={t('robot_detail.resize', 'Resize')}
              >
                <Maximize2 size={16} />
              </button>
              <div className="w-px h-6 bg-slate-800 self-center mx-1"></div>
              <button 
                onClick={() => {
                  updateRobot(robot.id, { 
                    cameraView: undefined,
                    centerCameraTrigger: Date.now()
                  });
                }}
                className="p-2 rounded bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-300 backdrop-blur-sm transition-colors"
                title={t('robot_detail.center_view', 'Center View')}
              >
                <Crosshair size={16} />
              </button>
            </div>

            <div className="absolute top-4 right-4 z-50 flex gap-2 pointer-events-auto">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-300 backdrop-blur-sm transition-colors"
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>

            {/* Closed Camera Icons (Bottom Right) */}
            <div className="absolute bottom-4 right-4 z-50 flex gap-2 pointer-events-auto">
              {[robot, ...combinedBotsInfo].map(bot => {
                const pipConfig = settings.uiLayout?.cameraPips?.[bot.id];
                if (pipConfig?.isOpen === false) {
                  return (
                    <button 
                      key={bot.id}
                      onClick={() => {
                        updateSettings({
                          uiLayout: {
                            ...settings.uiLayout,
                            cameraPips: {
                              ...settings.uiLayout?.cameraPips,
                              [bot.id]: { ...pipConfig, isOpen: true }
                            }
                          }
                        });
                      }}
                      className="p-2 rounded bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-emerald-500/50 backdrop-blur-sm transition-colors flex items-center gap-1"
                      title={`Show ${bot.name} Camera`}
                    >
                      <CameraIcon size={16} />
                      <span className="text-[10px] font-bold max-w-[60px] truncate">{bot.name}</span>
                    </button>
                  );
                }
                return null;
              })}
            </div>

            {/* Camera PIP Windows */}
            <CameraPIP 
              bot={robot} 
              initialX={0} 
              initialY={0} 
              label={robot.name} 
              t={t} 
            />
            {combinedBotsInfo.map((bot, index) => (
              <CameraPIP 
                key={bot.id} 
                bot={bot} 
                initialX={-200 * (index + 1)} 
                initialY={0} 
                label={bot.name} 
                t={t} 
              />
            ))}
            
            {/* Horizontal Resize Handle for 3D View */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center z-20 hover:bg-white/5 transition-colors"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                document.body.classList.add('select-none');
                dragRef.current = true;
                startHeight.current = e.currentTarget.parentElement?.offsetHeight || 0;
                startDragY.current = e.clientY;
              }}
            >
              <div className="w-12 h-1 rounded-full bg-slate-500/50" />
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-h-0 pr-2 pb-2">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pointer-events-auto shrink-0">
            {/* E-STOP Button (First, Glowing, Blinking) */}
            <button 
              onClick={() => {
                handleStop();
                updateRobot(robot.id, { online: false });
                if (isStartAll) {
                  robot.combinedWith?.forEach(id => updateRobot(id, { online: false }));
                }
              }}
              className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-red-600 hover:bg-red-500 text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_20px_rgba(220,38,38,0.8)] border border-red-500 animate-pulse"
            >
              <AlertOctagon size={16} /> {isStartAll ? t('robot_detail.estop_all', 'E-STOP ALL') : t('robot_detail.estop', 'E-STOP')}
            </button>

            {/* START/STOP Button */}
            {!robot.playbackState?.isPlaying ? (
              <button 
                onClick={() => handlePlay(isStartAll)}
                disabled={robot.recordedPoints.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400"
              >
                <Play size={16} /> {isStartAll ? t('robot_detail.start_all', 'START ALL') : t('robot_detail.start', 'START')}
              </button>
            ) : (
              <button 
                onClick={handleStop}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(244,63,94,0.5)] border border-rose-400"
              >
                <Square size={16} /> {isStartAll ? t('robot_detail.stop_all', 'STOP ALL') : t('robot_detail.stop', 'STOP')}
              </button>
            )}

            {/* HOME Button */}
            <button 
              onClick={() => updateRobot(robot.id, { pos: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 }, joints: { j1: 0, j2: -45, j3: 45, j4: 0, j5: 90, j6: 0 } })}
              className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-yellow-500 hover:bg-yellow-400 text-yellow-950 text-sm font-bold uppercase tracking-widest rounded-lg transition-all border border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]"
            >
              <Home size={16} /> HOME
            </button>

            {/* HOME XY Button */}
            {robot.hasXYTable && (
              <button 
                onClick={() => updateRobot(robot.id, { 
    pos: { ...robot.pos, tx: 0, ty: 0 },
    xyTable: robot.xyTable ? { ...robot.xyTable, pos: { x: 0, y: 0 } } : robot.xyTable
  })}
                className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-yellow-500 hover:bg-yellow-400 text-yellow-950 text-sm font-bold uppercase tracking-widest rounded-lg transition-all border border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]"
              >
                <Home size={16} /> HOME XY
              </button>
            )}

            {/* RESET Button */}
            <button 
              onClick={() => {
                handleStop();
                updateRobot(robot.id, { 
                   pos: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 }, 
                   joints: { j1: 0, j2: -45, j3: 45, j4: 0, j5: 90, j6: 0 }
                });
              }}
              className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all border border-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.3)]"
            >
              <RefreshCw size={16} /> RESET
            </button>

            {/* RESET 3D Button */}
            <button 
              onClick={() => setReset3DKey(k => k + 1)}
              className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all border border-teal-500 shadow-[0_0_15px_rgba(13,148,136,0.3)]"
            >
              <Video size={16} /> RESET 3D
            </button>

            {/* EXPORT / LOAD Buttons */}
            <button 
              onClick={() => saveKinematics(robot.id)}
              disabled={robot.recordedPoints.length === 0 || robot.playbackState?.isPlaying}
              className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-400"
            >
              <Save size={16} /> {t('robot_detail.export', 'Export')}
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
              <Upload size={16} /> {t('robot_detail.load', 'Load')}
            </button>
          </div>

          {/* Joint Controls */}
          <div className={cn("bg-slate-900 border border-slate-800 rounded-xl p-4 shrink-0 shadow-sm", isFullscreen && "hidden")}>
            <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
              <div className="flex flex-wrap items-center gap-3">
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleAddPoint}
                    className="px-4 py-2 min-h-[44px] bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/30 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors"
                  >
                    {t('robot_detail.add_point', '+ Add Point')}
                  </button>
                  <button 
                    onClick={() => updateRobot(robot.id, { recordedPoints: [] })}
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 min-h-[44px]">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('robot_detail.speed', 'Speed:')}</span>
                  <input 
                    type="range" 
                    min="10" 
                    max="500" 
                    step="10" 
                    value={playbackSpeed} 
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="w-24 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                  <span className="text-xs font-mono text-sky-400 w-8">{playbackSpeed}%</span>
                </div>

                <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 min-h-[44px]">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('robot_detail.step', 'Step:')}</span>
                  <select value={jogStep} onChange={e => setJogStep(Number(e.target.value))} className="bg-transparent border-none text-sm outline-none font-mono text-slate-200">
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
            </div>
            
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

            {hasXYTable && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-wider"><Crosshair size={16} /> {t('robot_detail.xy_table_controls', 'XY Table Controls')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(['tx', 'ty'] as const).map(axis => {
                    const maxVal = axis === 'tx' ? (robot.xyTable?.tableSize?.width || 500) : (robot.xyTable?.tableSize?.length || 500);
                    return (
                    <div key={axis} className="flex flex-col gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase">{axis}</span>
                        <span className="text-xs font-mono text-sky-400">{robot.pos[axis]?.toFixed(2) || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => {
    const newVal = Math.max(0, (robot.pos[axis] || 0) - jogStep);
    updateRobot(robot.id, { 
      pos: { ...robot.pos, [axis]: newVal },
      xyTable: robot.xyTable ? { ...robot.xyTable, pos: { ...robot.xyTable.pos, [axis === 'tx' ? 'x' : 'y']: newVal } } : robot.xyTable
    });
  }} className="p-2 bg-slate-900 hover:bg-slate-800 rounded text-slate-300">-</button>
                        <input type="range" min="0" max={maxVal} value={robot.pos[axis] || 0} onChange={e => {
    const newVal = Number(e.target.value);
    updateRobot(robot.id, { 
      pos: { ...robot.pos, [axis]: newVal },
      xyTable: robot.xyTable ? { ...robot.xyTable, pos: { ...robot.xyTable.pos, [axis === 'tx' ? 'x' : 'y']: newVal } } : robot.xyTable
    });
  }} className="flex-1" />
                        <button onClick={() => {
    const newVal = Math.min(maxVal, (robot.pos[axis] || 0) + jogStep);
    updateRobot(robot.id, { 
      pos: { ...robot.pos, [axis]: newVal },
      xyTable: robot.xyTable ? { ...robot.xyTable, pos: { ...robot.xyTable.pos, [axis === 'tx' ? 'x' : 'y']: newVal } } : robot.xyTable
    });
  }} className="p-2 bg-slate-900 hover:bg-slate-800 rounded text-slate-300">+</button>
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

        {!isFullscreen && (
          <div 
            className="hidden lg:flex w-2 cursor-col-resize hover:bg-slate-700/50 rounded mx-[-12px] z-10 shrink-0 items-center justify-center transition-colors touch-none"
            onPointerDown={(e) => {
              e.preventDefault();
              document.body.classList.add('select-none');
              setIsResizingRightPanel(true);
              rightPanelResizeStartRef.current = { width: rightPanelWidth, x: e.clientX };
            }}
          >
            <div className="w-0.5 h-12 bg-slate-600 rounded-full" />
          </div>
        )}

        {/* Right Panel */}
        <div 
          className={cn("w-full lg:w-auto flex flex-col shrink-0 min-h-0 gap-4 transition-all duration-75", isFullscreen && "hidden")}
          style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? rightPanelWidth : '100%' }}
        >
          {/* Top Panel: Config, I/O, Points */}
          <div className="flex flex-col flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-0">
            <div className="flex items-center border-b border-slate-800 bg-slate-900 overflow-x-auto custom-scrollbar shrink-0">
              <button 
                onClick={() => setRightTab('trajectories')} 
                className={cn("flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors", rightTab === 'trajectories' ? "text-sky-400 border-b-2 border-sky-400 bg-slate-800" : "text-slate-400 hover:text-slate-300")}
              >
                {t('robot_detail.examples_tab', 'Examples')}
              </button>
              <button 
                onClick={() => setRightTab('config')} 
                className={cn("flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors", rightTab === 'config' ? "text-sky-400 border-b-2 border-sky-400 bg-slate-800" : "text-slate-400 hover:text-slate-300")}
              >
                {t('robot_detail.config', 'Config')}
              </button>
              <button 
                onClick={() => setRightTab('io')} 
                className={cn("flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors", rightTab === 'io' ? "text-sky-400 border-b-2 border-sky-400 bg-slate-800" : "text-slate-400 hover:text-slate-300")}
              >
                {t('robot_detail.io', 'I/O')}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">
              {rightTab === 'trajectories' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t('robot_detail.examples', 'Examples')}</label>
                    <select 
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none"
                      value={selectedExample}
                      onChange={(e) => loadExample(e.target.value)}
                      disabled={robot.playbackState?.isPlaying}
                    >
                      <option value="">{t('robot_detail.select', '-- Select --')}</option>
                      {examples.map(e => (
                        <option key={e.id} value={e.id}>{e.name} ({e.points.length} pts)</option>
                      ))}
                    </select>
                  </div>
                  {combinedBotsInfo.length > 0 && (
                    <div className="pt-2 border-t border-slate-800">
                      <label className="block text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">{t('robot_detail.combined_robots', 'Combined Robots')}</label>
                      <div className="space-y-3">
                        {combinedBotsInfo.map(bot => (
                          <div key={bot.id} className="bg-slate-900/50 p-2 rounded border border-slate-800/50">
                            <div className="text-xs text-slate-300 font-medium mb-1">{bot.name} ({bot.recordedPoints.length} pts)</div>
                            <select 
                              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 outline-none"
                              onChange={(e) => loadExampleForRobot(bot.id, e.target.value)}
                              defaultValue=""
                              disabled={robot.playbackState?.isPlaying}
                            >
                              <option value="">{t('robot_detail.select_example', '-- Select Example --')}</option>
                              {examples.map(e => (
                                <option key={e.id} value={e.id}>{e.name} ({e.points.length} pts)</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {rightTab === 'config' && (
                <div className="space-y-6">
                  
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3 mt-4">
                    <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{t('robot_detail.model_and_tools', 'Model & Tools')}</h4>
                    
                    <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('robot_detail.model', 'Model')}</label>
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
                      {settings.customModels?.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('robot_detail.role', 'Role')}</label>
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
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('robot_detail.urtc_tool', 'URTC Tool')}</label>
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
                  <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{t('robot_detail.virtual_environment', 'Virtual Environment')}</h4>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-slate-400">{t('robot_detail.combine_with_robot', 'Combine with Robot')}</span>
                    
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
                    {t('robot_detail.combine_desc', 'Shows the selected robot in the 3D view. Parameters are configured in its own menu.')}
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
                      <span className="text-xs font-semibold uppercase tracking-wider">{t('robot_detail.valve_1', 'Valve 1')}</span>
                    </button>
                    <button 
                      onClick={() => toggleValve(1)}
                      className={cn("flex flex-col items-center justify-center min-h-[64px] py-2 px-1 rounded-lg border transition-colors", 
                        robot.valves[1] ? "bg-sky-500/10 text-sky-400 glow-border-sky" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:glow-border-sky transition-all hover:glow-border-sky hover:text-sky-400 transition-all"
                      )}
                    >
                      <Droplets size={20} className="mb-2" />
                      <span className="text-xs font-semibold uppercase tracking-wider">{t('robot_detail.valve_2', 'Valve 2')}</span>
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
                    <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">{t('robot_detail.endstops_upper', 'ENDSTOPS')}</h4>
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
          
          {/* Bottom Panel: Points & Trajectories Table */}
          <div className="flex flex-col flex-[1.2] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-0">
            <div className="p-3 bg-slate-900 border-b border-slate-800 shrink-0">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">{t('robot_detail.points_table', 'Points Table')}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">
              <div className="space-y-2">
                {robot.recordedPoints.map((pt, i) => (
                  <div id={`step-${robot.id}-${i}`} key={i} className={cn("bg-slate-900 border rounded p-2 text-xs flex flex-col gap-1 transition-colors", robot.playbackState?.activeStep === i ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "border-slate-800")}>
                    <div className="flex justify-between items-center border-b border-slate-800/50 pb-1 mb-1">
                      <div className="flex items-center gap-2">
                        {robot.playbackState?.activeStep === i ? (
                          <Play size={12} className="text-emerald-400 animate-pulse fill-emerald-400" />
                        ) : (
                          <span className="w-3" />
                        )}
                        <span className={cn("font-mono font-bold", robot.playbackState?.activeStep === i ? "text-emerald-400" : "text-slate-400")}>{t('robot_detail.step_upper', 'STEP')} {i}</span>
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
                      <span className="text-slate-500 flex justify-between"><span>J1:</span><span className="text-indigo-400">{pt.j1 !== undefined ? pt.j1.toFixed(1) : '0.0'}</span></span>
                      <span className="text-slate-500 flex justify-between"><span>J2:</span><span className="text-indigo-400">{pt.j2 !== undefined ? pt.j2.toFixed(1) : '0.0'}</span></span>
                      <span className="text-slate-500 flex justify-between"><span>J3:</span><span className="text-indigo-400">{pt.j3 !== undefined ? pt.j3.toFixed(1) : '0.0'}</span></span>
                      <span className="text-slate-500 flex justify-between"><span>J4:</span><span className="text-indigo-400">{pt.j4 !== undefined ? pt.j4.toFixed(1) : '0.0'}</span></span>
                      <span className="text-slate-500 flex justify-between"><span>J5:</span><span className="text-indigo-400">{pt.j5 !== undefined ? pt.j5.toFixed(1) : '0.0'}</span></span>
                      <span className="text-slate-500 flex justify-between"><span>J6:</span><span className="text-indigo-400">{pt.j6 !== undefined ? pt.j6.toFixed(1) : '0.0'}</span></span>
                    </div>
                    {pt.tx !== undefined && pt.ty !== undefined && (
                      <div className="grid grid-cols-6 gap-x-2 gap-y-1 font-mono text-[10px] mt-1 border-t border-slate-800/50 pt-1">
                        <span className="text-slate-500 flex justify-between col-start-1"><span>TX:</span><span className="text-amber-400">{pt.tx.toFixed(1)}</span></span>
                        <span className="text-slate-500 flex justify-between col-start-2"><span>TY:</span><span className="text-amber-400">{pt.ty.toFixed(1)}</span></span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
