// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: RobotDetail.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { useRef, useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { RotaryKnob } from "./RotaryKnob";
import { FuturisticSlider } from "./FuturisticSlider";
import { motion, useDragControls } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { type RobotState, useHydraStore, type ToolType, type RobotModel, ROBOT_MANUFACTURERS, globalPlaybacks } from '../store';
import { apiUrl } from '../lib/apiBase';
import { RotateCcw, RotateCw, Home, AlertOctagon,  Power, Droplets, ArrowUp, ArrowDown, Save, Play, Square, Pause, Crosshair, RefreshCw, Maximize2, Minimize2, Camera as CameraIcon, Trash2, X, FolderOpen, Edit2, Repeat, Download, Grid3x3, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { VirtualKinematics } from './VirtualKinematics';
import { Joystick3D } from './Joystick3D';
import { examples } from '../examples/kinematics';
import { PAROL6_HOME_POSE } from '../examples/parol6Kinematics';
import { FAZE4_HOME_POSE } from '../examples/faze4Kinematics';
import { AR3_HOME_POSE } from '../examples/ar3Kinematics';
import { AR4_HOME_POSE } from '../examples/ar4Kinematics';
import { UR3E_HOME_POSE } from '../examples/ur3eKinematics';
import { UR5E_HOME_POSE } from '../examples/ur5eKinematics';
import { UR10E_HOME_POSE } from '../examples/ur10eKinematics';
import { UR16E_HOME_POSE } from '../examples/ur16eKinematics';
import { UR20_HOME_POSE } from '../examples/ur20Kinematics';
import { XARM6_HOME_POSE } from '../examples/xarm6Kinematics';
import { LITE6_HOME_POSE } from '../examples/lite6Kinematics';
import { EDO_HOME_POSE } from '../examples/edoKinematics';
import { GEN3LITE_HOME_POSE } from '../examples/gen3LiteKinematics';
import { M710IC_HOME_POSE } from '../examples/m710icKinematics';
import { SOARM100_HOME_POSE } from '../examples/soArm100Kinematics';
import { GEN2_HOME_POSE } from '../examples/gen2Kinematics';
import { PIPER_HOME_POSE } from '../examples/piperKinematics';
import { Z1_HOME_POSE } from '../examples/z1Kinematics';
import { VX300S_HOME_POSE } from '../examples/vx300sKinematics';
import { WX250S_HOME_POSE } from '../examples/wx250sKinematics';
import { KOCH_HOME_POSE } from '../examples/kochKinematics';
import { UR3CLASSIC_HOME_POSE } from '../examples/ur3ClassicKinematics';
import { UR5CLASSIC_HOME_POSE } from '../examples/ur5ClassicKinematics';
import { UR10CLASSIC_HOME_POSE } from '../examples/ur10ClassicKinematics';
import { convertToCartesian } from '../examples/utils';
import { jointsToCartesianForModel, jointLimitsFor, resolveTargetJoints } from '../examples/robotKinematicsDispatch';

/**
 * Executes the Cn logic. 
 * This function handles the necessary computations and state updates.
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Stable identity for a recordedPoints[] row, keyed off object reference rather
// than array index. Reorder (ArrowUp/ArrowDown) and delete swap/splice the SAME
// point objects in place, so identity survives a reorder even though position
// doesn't - unlike `key={i}`/an index-based "currently editing" state, which
// silently re-points at whatever object now occupies that index after a
// reorder/delete and can merge one point's edit into a different point's data.
const pointKeyMap = new WeakMap<object, number>();
let pointKeySeq = 0;
function pointKeyFor(pt: object): number {
  let k = pointKeyMap.get(pt);
  if (k === undefined) {
    k = ++pointKeySeq;
    pointKeyMap.set(pt, k);
  }
  return k;
}

// Generic home pose (j2:-45,j3:45,j5:90) is fine for the shared-convention rigs, but
// robots with their own real kinematics need their own reachable, sensible pose instead.
function homePoseFor(model: RobotModel) {
  if (model === 'Parol6 (6-DOF)') return { ...PAROL6_HOME_POSE };
  if (model === 'Faze4 (6-DOF)') return { ...FAZE4_HOME_POSE };
  if (model === 'AR3 (6-DOF)') return { ...AR3_HOME_POSE };
  if (model === 'AR4 (6-DOF)') return { ...AR4_HOME_POSE };
  if (model === 'UR3e (6-DOF)') return { ...UR3E_HOME_POSE };
  if (model === 'UR5e (6-DOF)') return { ...UR5E_HOME_POSE };
  if (model === 'UR10e (6-DOF)') return { ...UR10E_HOME_POSE };
  if (model === 'UR16e (6-DOF)') return { ...UR16E_HOME_POSE };
  if (model === 'UR20 (6-DOF)') return { ...UR20_HOME_POSE };
  if (model === 'xArm6 (6-DOF)') return { ...XARM6_HOME_POSE };
  if (model === 'Lite 6 (6-DOF)') return { ...LITE6_HOME_POSE };
  if (model === 'e.DO (6-DOF)') return { ...EDO_HOME_POSE };
  if (model === 'Gen3 Lite (6-DOF)') return { ...GEN3LITE_HOME_POSE };
  if (model === 'M-710iC (6-DOF)') return { ...M710IC_HOME_POSE };
  if (model === 'SO-ARM100 (5-DOF)') return { ...SOARM100_HOME_POSE };
  if (model === 'Gen2 (6-DOF)') return { ...GEN2_HOME_POSE };
  if (model === 'PiPER (6-DOF)') return { ...PIPER_HOME_POSE };
  if (model === 'Z1 (6-DOF)') return { ...Z1_HOME_POSE };
  if (model === 'ViperX 300 (6-DOF)') return { ...VX300S_HOME_POSE };
  if (model === 'WidowX 250 (6-DOF)') return { ...WX250S_HOME_POSE };
  if (model === 'Koch v1.1 (5-DOF)') return { ...KOCH_HOME_POSE };
  if (model === 'UR3 (6-DOF)') return { ...UR3CLASSIC_HOME_POSE };
  if (model === 'UR5 (6-DOF)') return { ...UR5CLASSIC_HOME_POSE };
  if (model === 'UR10 (6-DOF)') return { ...UR10CLASSIC_HOME_POSE };
  return { j1: 0, j2: -45, j3: 45, j4: 0, j5: 90, j6: 0 };
}

// jointLimitsFor moved to robotKinematicsDispatch.ts (imported above) so
// GamepadController.tsx's own per-joint jog can reuse the exact same
// clamping instead of duplicating this ternary chain a second time.

// resolveTargetJoints moved to robotKinematicsDispatch.ts (imported above) so
// GamepadController.tsx's own Cartesian XYZ jog can reuse the exact same
// per-model inverse-kinematics dispatch instead of duplicating this
// 23-branch chain a second time - same reasoning as jointLimitsFor's own
// move there (see that function's comment in robotKinematicsDispatch.ts).

// Stock examples (examples/list/*.ts) always store {j1..j6} computed against the SHARED
// generic 160mm/200mm formula (examples/utils.ts's cartesianToJoints), regardless of which
// robot ends up loading them - those numbers are only meaningful when read back through
// that SAME formula's forward kinematics (convertToCartesian), not as literal per-robot
// joint angles. Stamping the resulting Cartesian x/y/z/a/b/c onto each point once, here at
// load time, means every downstream consumer (PathVisualizer's drawn path, this file's own
// own playback loop below) can just use pt.x/y/z directly instead of re-guessing which
// formula a stored {j1..j6} was meant for - see robotKinematicsDispatch.ts's header comment
// for the full reasoning. j1..j6 are kept alongside (unused by the 4 real-kinematics robots
// once x is present, but still what the Generic model's own playback/UI reads).
function withCartesian(pt: any) {
  if (pt.x !== undefined) return pt;
  const c = convertToCartesian(pt);
  return { ...pt, x: c.x, y: c.y, z: c.z, a: c.a, b: c.b, c: c.c };
}

// A Work library is intentionally portable: legacy files contain generic
// {j1..j6} values generated by examples/utils.ts, while compact arrays are
// already native joints from a specific robot. Before either reaches Server,
// resolve it into one explicit, model-native trajectory. This is the boundary
// that prevents the same Work from making Faze4 and Parol6 follow unrelated
// joint paths merely because their folders contain files with the same name.
function normalizeTrajectoryForRobot(rawPoints: unknown, targetRobot: Pick<RobotState, 'model' | 'joints'>) {
  if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
    throw new Error('A trajectory must contain at least one point');
  }

  return rawPoints.map((rawPoint, index) => {
    if (Array.isArray(rawPoint)) {
      if (rawPoint.length < 3 || !rawPoint.slice(0, 3).every((value) => typeof value === 'number' && Number.isFinite(value))) {
        throw new Error(`Compact trajectory point ${index + 1} requires finite j1, j2 and j3 values`);
      }
      const joints = {
        j1: rawPoint[0], j2: rawPoint[1], j3: rawPoint[2],
        j4: targetRobot.joints.j4 ?? 0, j5: targetRobot.joints.j5 ?? 0, j6: targetRobot.joints.j6 ?? 0,
      };
      return {
        motionType: 'model-joints',
        ...joints,
        ...jointsToCartesianForModel(targetRobot.model, joints),
      };
    }

    if (!rawPoint || typeof rawPoint !== 'object') {
      throw new Error(`Trajectory point ${index + 1} must be an object or a compact joint triplet`);
    }

    const source = rawPoint as Record<string, unknown>;
    if (source.motionType === 'model-joints') {
      const nativeFields = ['j1', 'j2', 'j3', 'j4', 'j5', 'j6'];
      if (!nativeFields.every((field) => typeof source[field] === 'number' && Number.isFinite(source[field] as number))) {
        throw new Error(`Native trajectory point ${index + 1} requires finite j1 through j6 values`);
      }
      const joints = {
        j1: source.j1 as number, j2: source.j2 as number, j3: source.j3 as number,
        j4: source.j4 as number, j5: source.j5 as number, j6: source.j6 as number,
      };
      const { motionType: _motionType, ...metadata } = source;
      return {
        ...metadata,
        motionType: 'model-joints',
        ...joints,
        ...jointsToCartesianForModel(targetRobot.model, joints),
      };
    }

    // No `motionType` means portable/generic authoring data. Its stored
    // joints must first be read through the generic FK before resolving the
    // resulting Cartesian pose for the selected robot model.
    const cartesian = withCartesian(source);
    if (![cartesian.x, cartesian.y, cartesian.z].every((value) => typeof value === 'number' && Number.isFinite(value))) {
      throw new Error(`Trajectory point ${index + 1} has no valid Cartesian position`);
    }
    const fallback = {
      j1: typeof source.j1 === 'number' ? source.j1 : targetRobot.joints.j1,
      j2: typeof source.j2 === 'number' ? source.j2 : targetRobot.joints.j2,
      j3: typeof source.j3 === 'number' ? source.j3 : targetRobot.joints.j3,
      j4: typeof source.j4 === 'number' ? source.j4 : targetRobot.joints.j4,
      j5: typeof source.j5 === 'number' ? source.j5 : targetRobot.joints.j5,
      j6: typeof source.j6 === 'number' ? source.j6 : targetRobot.joints.j6,
    };
    const joints = resolveTargetJoints(
      targetRobot.model,
      cartesian.x, cartesian.y, cartesian.z,
      cartesian.a ?? 0, cartesian.b ?? 0, cartesian.c ?? 0,
      fallback,
    );
    const { j1: _j1, j2: _j2, j3: _j3, j4: _j4, j5: _j5, j6: _j6,
      x: _x, y: _y, z: _z, a: _a, b: _b, c: _c, motionType: _motionType, ...metadata } = source;
    return {
      ...metadata,
      motionType: 'model-joints',
      ...joints,
      x: cartesian.x, y: cartesian.y, z: cartesian.z,
      a: cartesian.a ?? 0, b: cartesian.b ?? 0, c: cartesian.c ?? 0,
    };
  });
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
const CameraPIP = ({ bot, initialX, initialY, label, t: _t }: { bot: RobotState, initialX: number, initialY: number, label: string, t: any }) => {
  const { settings, updateSettings, cameras } = useHydraStore();
  // Real gap closed: this panel used to always show a decorative
  // CameraIcon regardless of connection state - HYDRA-UMC-SERVER's own
  // GET /api/camera/:id/stream is a real proxy now (see that repo's own
  // CHANGELOG), so this renders the real MJPEG stream via a plain <img>
  // (a browser natively understands multipart/x-mixed-replace on an
  // <img> src - no <video>/MSE plumbing needed for MJPEG specifically)
  // once a camera is actually assigned and connected, same isVisionActive
  // gating this file's own top-level component already uses elsewhere.
  const camera = cameras.find(c => c.assignedRobotId === bot.id);
  const isStreaming = bot.visionEnabled && (camera?.connected ?? false);
  const controls = useDragControls();
  const savedPipConfig = settings.uiLayout?.cameraPips?.[bot.id];
  // Memoized so the fallback object keeps ONE stable identity across
  // renders (as long as initialX/initialY themselves don't change) instead
  // of being a brand-new object literal every render - that fresh identity
  // was making the ref-sync effect below re-run on every single render of
  // this panel, not just when the saved pip config or initialX/Y actually
  // changed.
  const defaultPipConfig = useMemo(
    () => ({ w: 192, h: 144, x: initialX, y: initialY, isOpen: true }),
    [initialX, initialY]
  );
  const pipConfig = savedPipConfig || defaultPipConfig;
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
        // Reads pipConfigRef (kept fresh by the ref-sync effect above)
        // rather than closing over pipConfig directly - handleUp is
        // registered once via addEventListener and this effect only
        // re-attaches it on [bot.id, updateSettings], so a direct pipConfig
        // closure would go stale the moment settings changed without
        // bot.id/updateSettings themselves changing.
        const freshPip = freshSettings.uiLayout?.cameraPips?.[bot.id] || pipConfigRef.current;
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
         {isStreaming && camera ? (
           <img
             src={apiUrl(`/api/camera/${camera.id}/stream`)}
             alt={`${label} camera`}
             className="absolute inset-0 w-full h-full object-cover pointer-events-none"
           />
         ) : (
           <>
             <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(transparent 50%, rgba(0,0,0,0.5) 50%)', backgroundSize: '100% 4px' }} />
             <CameraIcon size={24} className="text-slate-800 pointer-events-none" />
           </>
         )}
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

/** Step sizes offered by every jog control (joints, XYZ, XY table) - same list the classic (non-floating) Step combobox always used. */
const JOG_STEP_OPTIONS = [0.1, 1, 5, 10, 22.5, 25, 45, 50, 90, 100];

/**
 * Floating, draggable overlay for the 3D viewport - Step size, Speed/
 * Acceleration knobs, and the J1-J6 grid, all normally rendered BELOW the
 * viewport (see the classic Joint Controls panel further down this file).
 * The XYZ jog Joystick3D and (when present) the XY table controls live in
 * their OWN separate floating windows (JoystickOverlay/XYTableOverlay,
 * right below) rather than in here. `isFloatingLayout`
 * (this file's own flag, currently `robot.id === 1`) gates all three
 * overlays together - not baked into the shared classic layout for every
 * robot, so extending this to A2-A8 is a one-line change to that flag,
 * not new component work.
 */
function JointControlsOverlay({
  robot, jogStep, onJogStepChange, playbackSpeed, playbackAcceleration, onSpeedChange, onAccelerationChange, onJointChange, t,
}: {
  robot: RobotState;
  jogStep: number;
  onJogStepChange: (v: number) => void;
  playbackSpeed: number;
  playbackAcceleration: number;
  onSpeedChange: (v: number) => void;
  onAccelerationChange: (v: number) => void;
  onJointChange: (j: 'j1' | 'j2' | 'j3' | 'j4' | 'j5' | 'j6', v: number) => void;
  t: any;
}) {
  const controls = useDragControls();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      initial={{ x: 16, y: 16 }}
      className="absolute top-0 left-0 z-40 bg-slate-950/85 backdrop-blur border border-slate-700 rounded-xl shadow-2xl pointer-events-auto w-[300px] max-w-[90%]"
    >
      <div
        className="bg-slate-900/90 px-3 py-1.5 flex justify-between items-center border-b border-slate-800 cursor-move rounded-t-xl"
        onPointerDown={(e) => { e.stopPropagation(); controls.start(e); }}
      >
        <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">{t('robot_detail.joint_controls_overlay', 'Joint Controls')}</span>
        <button onClick={() => setCollapsed(c => !c)} className="text-slate-400 hover:text-white transition-colors text-[10px] font-bold px-2">
          {collapsed ? '▸' : '▾'}
        </button>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 bg-slate-900/80 px-2 py-1.5 rounded-lg border border-slate-800">
            <span className="text-[9px] text-slate-400 font-bold uppercase w-14 shrink-0">{t('robot_detail.step', 'Step:')}</span>
            <select
              value={jogStep}
              onChange={e => onJogStepChange(Number(e.target.value))}
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] font-mono text-slate-200 outline-none"
            >
              {JOG_STEP_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 px-2 py-1.5 rounded-lg border border-slate-800">
            <span className="text-[9px] text-slate-400 font-bold uppercase w-14 shrink-0">{t('robot_detail.speed', 'Speed:')}</span>
            <RotaryKnob min={10} max={500} value={playbackSpeed} onChange={onSpeedChange} size={28} step={jogStep} />
            <div className="flex-1"><FuturisticSlider min={10} max={500} value={playbackSpeed} onChange={onSpeedChange} step={jogStep} /></div>
            <span className="text-[9px] font-mono text-sky-400 w-8 text-right shrink-0">{playbackSpeed}%</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 px-2 py-1.5 rounded-lg border border-slate-800">
            <span className="text-[9px] text-slate-400 font-bold uppercase w-14 shrink-0">{t('robot_detail.acceleration', 'Acceleration:')}</span>
            <RotaryKnob min={10} max={500} value={playbackAcceleration} onChange={onAccelerationChange} size={28} step={jogStep} />
            <div className="flex-1"><FuturisticSlider min={10} max={500} value={playbackAcceleration} onChange={onAccelerationChange} step={jogStep} /></div>
            <span className="text-[9px] font-mono text-amber-400 w-8 text-right shrink-0">{playbackAcceleration}%</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const).map(j => {
              const [jMin, jMax] = jointLimitsFor(robot.model, j);
              return (
                <div key={j} className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{j}</span>
                    <span className="text-[9px] font-mono text-sky-400">{robot.joints[j]?.toFixed(1)}°</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotaryKnob min={jMin} max={jMax} value={robot.joints[j]} onChange={val => onJointChange(j, val)} size={26} step={jogStep} />
                    <FuturisticSlider min={jMin} max={jMax} value={robot.joints[j]} onChange={val => onJointChange(j, val)} className="flex-1" step={jogStep} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Floating, draggable overlay holding the XYZ jog Joystick3D, plus 2
 * dedicated base-rotation (J1) buttons underneath it - requested directly:
 * jogging the tool point (XYZ, via Joystick3D) and rotating the base are
 * the two things an operator actually wants side by side in one window,
 * rather than opening the separate J1-J6 grid (JointControlsOverlay) just
 * to nudge J1. Split out of JointControlsOverlay into its own window
 * originally (see that component's own header comment for the full
 * context/spec pointer).
 */
function JoystickOverlay({
  jogStep, onXYZJog, onJ1Jog, j1Value, j1Limits, t,
}: {
  jogStep: number;
  onXYZJog: (dx: number, dy: number, dz: number) => void;
  onJ1Jog: (direction: 1 | -1) => void;
  j1Value: number;
  j1Limits: [number, number];
  t: any;
}) {
  const controls = useDragControls();
  const [collapsed, setCollapsed] = useState(false);
  const [j1Min, j1Max] = j1Limits;

  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      initial={{ x: 332, y: 16 }}
      className="absolute top-0 left-0 z-40 bg-slate-950/85 backdrop-blur border border-slate-700 rounded-xl shadow-2xl pointer-events-auto w-fit max-w-[90%]"
    >
      <div
        className="bg-slate-900/90 px-3 py-1.5 flex justify-between items-center border-b border-slate-800 cursor-move rounded-t-xl"
        onPointerDown={(e) => { e.stopPropagation(); controls.start(e); }}
      >
        <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">{t('robot_detail.xyz_jog', 'XYZ Jog')} ({jogStep})</span>
        <button onClick={() => setCollapsed(c => !c)} className="text-slate-400 hover:text-white transition-colors text-[10px] font-bold px-2">
          {collapsed ? '▸' : '▾'}
        </button>
      </div>
      {!collapsed && (
        <div className="p-3 flex flex-col items-center gap-2">
          <Joystick3D onJog={onXYZJog} />
          <div className="flex items-center gap-2 w-full pt-2 border-t border-slate-800">
            <button
              onClick={() => onJ1Jog(-1)}
              disabled={j1Value <= j1Min}
              title={t('robot_detail.base_rotate_ccw', 'Rotate base counter-clockwise')}
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800 rounded-lg py-1.5 text-slate-300 transition-colors"
            >
              <RotateCcw size={14} />
            </button>
            <span className="text-[9px] font-mono text-sky-400 shrink-0 w-14 text-center" title={t('robot_detail.base_rotation', 'Base (J1)')}>
              J1 {j1Value.toFixed(1)}°
            </span>
            <button
              onClick={() => onJ1Jog(1)}
              disabled={j1Value >= j1Max}
              title={t('robot_detail.base_rotate_cw', 'Rotate base clockwise')}
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800 rounded-lg py-1.5 text-slate-300 transition-colors"
            >
              <RotateCw size={14} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Floating, draggable overlay for the XY table's own tx/ty jog controls -
 * split out of the classic (non-floating) Joint Controls panel into its
 * own window inside the 3D view, visible ONLY while this robot actually
 * HAS an XY table (`robot.hasXYTable`) - RobotDetail only mounts this when
 * that's true, so it disappears entirely the moment the table is disabled
 * rather than showing an empty/inert window.
 */
function XYTableOverlay({
  robot, jogStep, onAxisChange, t,
}: {
  robot: RobotState;
  jogStep: number;
  onAxisChange: (axis: 'tx' | 'ty', value: number) => void;
  t: any;
}) {
  const controls = useDragControls();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      initial={{ x: 332, y: 140 }}
      className="absolute top-0 left-0 z-40 bg-slate-950/85 backdrop-blur border border-slate-700 rounded-xl shadow-2xl pointer-events-auto w-[260px] max-w-[90%]"
    >
      <div
        className="bg-slate-900/90 px-3 py-1.5 flex justify-between items-center border-b border-slate-800 cursor-move rounded-t-xl"
        onPointerDown={(e) => { e.stopPropagation(); controls.start(e); }}
      >
        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">{t('robot_detail.xy_table_controls', 'XY Table Controls')}</span>
        <button onClick={() => setCollapsed(c => !c)} className="text-slate-400 hover:text-white transition-colors text-[10px] font-bold px-2">
          {collapsed ? '▸' : '▾'}
        </button>
      </div>
      {!collapsed && (
        <div className="p-3 space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {(['tx', 'ty'] as const).map(axis => {
            const maxVal = axis === 'tx' ? (robot.xyTable?.tableSize?.width || 500) : (robot.xyTable?.tableSize?.length || 500);
            return (
              <div key={axis} className="flex flex-col gap-1.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{axis}</span>
                  <span className="text-[9px] font-mono text-sky-400">{robot.pos[axis]?.toFixed(2) || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotaryKnob min={0} max={maxVal} value={robot.pos[axis] || 0} onChange={val => onAxisChange(axis, val)} size={30} step={jogStep} />
                  <FuturisticSlider min={0} max={maxVal} value={robot.pos[axis] || 0} onChange={val => onAxisChange(axis, val)} className="flex-1" step={jogStep} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Executes the  robot detail logic.
 * This function handles the necessary computations and state updates.
 */
export function RobotDetail({ robot, viewportOnly = false, onNavigateToRobot }: { robot: RobotState, viewportOnly?: boolean, onNavigateToRobot?: (robotId: number) => void }) {
  const { t } = useTranslation();
  const { updateRobot, sendRobotCommand, loadKinematics, settings, robots, updateSettings, authToken, cameras } = useHydraStore();
  // Real bug this fixes, reported live: a robot's Camera PIP still showed
  // in the 3D viewport with every camera actually disconnected. `visionEnabled`
  // is a robot-level flag MEANT to mirror its assigned camera's own
  // `connected` state (CamerasView.tsx's toggleConnection/retryConnection
  // both write both together) - but it also has its own `true` seed default
  // (store.tsx) independent of any camera ever really connecting, and can
  // drift from the real camera state if a camera gets reassigned to a
  // different robot (see CamerasView.tsx's own assignedRobotId comment) or
  // toggled through a path that only touches one of the two fields.
  // `cam?.connected` (looked up the same assignedRobotId way Dashboard.tsx's
  // own OverviewPanel already does, not a positional id match) is the
  // actually-authoritative signal - requiring BOTH true is the safe
  // direction to fix this in: it can only ever hide a PIP that
  // visionEnabled alone would have wrongly shown, never show one that's
  // genuinely supposed to be hidden.
  const isVisionActive = (bot: RobotState) => bot.visionEnabled && (cameras.find(c => c.assignedRobotId === bot.id)?.connected ?? false);
  // Real request from live device testing: condense the viewportOnly action
  // row (E-STOP/START/PAUSE/HOME/HOME XY/RESET/RESET 3D/REPEAT/Add-Delete
  // Point) to icon-only buttons on Android specifically, to free up
  // vertical space for the 3D view - explicitly NOT for STUDIO's own
  // desktop/tablet browser UI, where the text labels stay exactly as they
  // are. ThreeDScreen.kt's WebView appends a real, distinctive token to its
  // own User-Agent string precisely so this page could tell the two apart
  // without a URL flag that any other embedder (a future iOS WebView,
  // say) would also trip - see that file's own comment on why it's
  // appended rather than replacing the UA outright.
  const isAndroidApp = typeof navigator !== 'undefined' && navigator.userAgent.includes('HYDRA-UMC-ANDROID-CONTROL');
  const robotsRef = useRef(robots);
  useEffect(() => { robotsRef.current = robots; }, [robots]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadWorkFileRef = useRef<HTMLInputElement>(null);
  // Real, server-synced setting (robot.jogStep) rather than component-local
  // state - real feedback from live multi-client testing: the jog step
  // shown/used on one client (Android) never matched another (STUDIO
  // desktop), since each had always kept its own independent default. Kept
  // as the same `jogStep`/`setJogStep` names every sub-panel below already
  // reads/calls, so only this definition needed to change - `?? 1` covers
  // any already-saved settings.json from before this field existed.
  //
  // Routed through the atomic 'jogStep' command (sendRobotCommand), not
  // updateRobot - updateRobot's optimistic-local + 500ms-debounced-
  // full-tree save never broadcasts to any OTHER connected client (see
  // handleReset's own comment below for the full reasoning, same gap),
  // which would have meant a step chosen on one client still silently
  // never appeared on another - the exact bug this field exists to fix.
  const jogStep = robot.jogStep ?? 1;
  const setJogStep = (v: number) => sendRobotCommand(robot.id, 'jogStep', { value: v }, () => ({ jogStep: v }));
  const [selectedExample, setSelectedExample] = useState<string>(robot.selectedExample || '');
  const [workFiles, setWorkFiles] = useState<string[]>([]);
  const [selectedWorkFile, setSelectedWorkFile] = useState<string>(robot.selectedWorkFile || '');
  // Real "adjust state during render" pattern (React's own recommended
  // replacement for a reset-only effect): both selectedExample and
  // selectedWorkFile are just local edit buffers seeded from THIS robot's
  // own saved fields, and both need resetting together the instant the
  // panel starts showing a different robot - tracking the robot.id we
  // last reset for is what tells "switched robot" apart from "this robot's
  // own field changed underneath us" without an effect.
  const [resetForRobotId, setResetForRobotId] = useState(robot.id);
  if (robot.id !== resetForRobotId) {
    setResetForRobotId(robot.id);
    setSelectedExample(robot.selectedExample || '');
    setSelectedWorkFile(robot.selectedWorkFile || '');
  }
  const [editingPointKey, setEditingPointKey] = useState<number | null>(null);
  const [editingPointData, setEditingPointData] = useState<any>({});

  // Guards against an out-of-order response: fetchWorks() is called both from
  // the effect below (whenever worksFolderPath changes) and manually after
  // save/upload - nothing stopped an OLDER in-flight request from resolving
  // AFTER a newer one and overwriting workFiles with stale data. Bumping this
  // ref on every call and checking it's still the latest call before each
  // setState turns a superseded response into a no-op instead of a race.
  const worksFetchIdRef = useRef(0);

  // Depends on the resolved PATH STRING for this one robot, not the whole
  // settings.worksPaths object - that object is a fresh reference every
  // time ANY setting anywhere changes (see store.tsx's own applyServerData,
  // which used to make this worse by reshaping settings on every WebSocket
  // broadcast), so depending on it directly re-ran this real network fetch
  // (GET /${folderPath}/index.json) on every single jog tick from ANY
  // connected client the instant a robot panel was open - the concrete
  // mechanism behind this panel specifically (not other module panels,
  // which have no such fetch) being far slower than everything else in
  // the app. A plain string only changes reference (and re-triggers
  // fetchWorks's own identity, and thus the effect below) when this
  // robot's OWN folder path value actually changes.
  const worksFolderPath = settings.worksPaths?.[robot.id] || `WORKS/${robot.name.replace(/\s+/g, '')}`;
  const fetchWorks = useCallback(async () => {
    const fetchId = ++worksFetchIdRef.current;
    try {
      const res = await fetch(apiUrl(`/${worksFolderPath}/index.json`));
      if (fetchId !== worksFetchIdRef.current) return;
      if (res.ok) {
        const files = await res.json();
        if (fetchId !== worksFetchIdRef.current) return;
        setWorkFiles(files);
      } else {
        setWorkFiles([]);
      }
    } catch {
      if (fetchId === worksFetchIdRef.current) setWorkFiles([]);
    }
  }, [worksFolderPath]);

  // Genuine "synchronize with an external system" effect (a real fetch of
  // this robot's WORKS folder listing) - the sanctioned use the lint
  // rule's own text carves out, not the "derive local state" case it's
  // meant to catch.
  useEffect(() => {
    fetchWorks(); // eslint-disable-line -- real fetch, not a derived-state reset
  }, [fetchWorks]);

  const handleSaveWorkFile = async () => {
    if (robot.recordedPoints.length === 0) return;
    const defaultName = selectedWorkFile ? selectedWorkFile.replace('.json', '') : 'trayectoria_1';
    let fileName = window.prompt(t('robot_detail.save_filename', 'Nombre del archivo (sin .json):'), defaultName);
    if (!fileName) return;
    if (!fileName.endsWith('.json')) fileName += '.json';
    
    try {
      const folderPath = settings.worksPaths?.[robot.id] || `WORKS/${robot.name.replace(/\s+/g, '')}`;
      // Server now requires a bearer token on this route (see server.ts's
      // own comment on POST /api/upload-work) - without this header every
      // save silently 401s for a logged-in user.
      const res = await fetch(apiUrl('/api/upload-work'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({
          folderPath,
          fileName: fileName,
          content: robot.recordedPoints
        })
      });
      if (res.ok) {
        await fetchWorks();
        setSelectedWorkFile(fileName);
        updateRobot(robot.id, { selectedWorkFile: fileName });
      } else {
        console.error('Failed to save work file');
      }
    } catch (err) {
      console.error('Error saving file', err);
    }
  };

  // Exports robot.recordedPoints as standard G-code (audit idea:
  // "Permitir la exportación de trayectorias a archivos G-Code estándar").
  // Uses each point's own Cartesian pose (x/y/z/a/b/c, deriving it via the
  // same withCartesian() every example/upload already goes through - a
  // point recorded from the live 3D view already carries it, one loaded
  // from an older WORKS/ file predating this might not) rather than joint
  // angles: G-code is a Cartesian TOOL-PATH format, not a joint-space one,
  // and every existing G-code consumer (CAM viewers, most CNC post-
  // processors) expects X/Y/Z/(A/B/C) words, not J1-J6. A/B/C are emitted
  // as the rotary-axis words several real G-code dialects (RepRap-derived
  // firmware, 5/6-axis mill posts) already use for exactly this - not a
  // universal standard for 6-DOF orientation, so the header comment below
  // says so explicitly rather than implying this is a validated post for
  // any specific downstream machine/viewer.
  const handleExportGCode = () => {
    if (robot.recordedPoints.length === 0) return;
    const points = robot.recordedPoints.map(withCartesian);
    const fmt = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(3) : undefined);
    const lines = [
      `; HYDRA-UMC STUDIO - G-code export`,
      `; Robot: ${robot.name}`,
      `; Points: ${points.length}`,
      `; NOTE: A/B/C are this robot's own tool orientation (degrees), following the`,
      `;       same A/B/C convention several real G-code dialects use for rotary`,
      `;       axes - not a universal 6-DOF standard. Verify against your actual`,
      `;       downstream machine/viewer before running this on real hardware.`,
      `G21 ; millimeters`,
      `G90 ; absolute positioning`,
    ];
    points.forEach((pt, i) => {
      const words = [`G1`];
      const x = fmt(pt.x), y = fmt(pt.y), z = fmt(pt.z), a = fmt(pt.a), b = fmt(pt.b), c = fmt(pt.c);
      if (x !== undefined) words.push(`X${x}`);
      if (y !== undefined) words.push(`Y${y}`);
      if (z !== undefined) words.push(`Z${z}`);
      if (a !== undefined) words.push(`A${a}`);
      if (b !== undefined) words.push(`B${b}`);
      if (c !== undefined) words.push(`C${c}`);
      lines.push(`${words.join(' ')} ; point ${i + 1}`);
    });
    lines.push(`M2 ; end of program`);

    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${robot.name.replace(/\s+/g, '_')}.gcode`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadWorkFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const content = JSON.parse(ev.target?.result as string);
        const folderPath = settings.worksPaths?.[robot.id] || `WORKS/${robot.name.replace(/\s+/g, '')}`;

        // Same bearer-token requirement as handleSaveWorkFile above.
        const res = await fetch(apiUrl('/api/upload-work'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
          body: JSON.stringify({
            folderPath,
            fileName: file.name,
            content
          })
        });

        if (res.ok) {
          await fetchWorks();
          loadWorkFile(file.name);
        } else {
          console.error('Failed to upload work file');
        }
      } catch (err) {
        console.error('Error parsing or uploading file', err);
      }
    };
    reader.readAsText(file);
    if (uploadWorkFileRef.current) uploadWorkFileRef.current.value = '';
  };

  const loadWorkFile = async (fileName: string) => {
    setSelectedWorkFile(fileName);
    if (!fileName) {
      updateRobot(robot.id, { selectedWorkFile: fileName });
      return;
    }
    try {
      const folderPath = settings.worksPaths?.[robot.id] || `WORKS/${robot.name.replace(/\s+/g, '')}`;
      const res = await fetch(apiUrl(`/${folderPath}/${fileName}`));
      if (res.ok) {
        const rawPoints = await res.json();
        // Resolve every portable Work into this robot's actual joints before
        // it enters state or Server. Legacy generic files and compact native
        // joint files therefore share one explicit, testable loading path.
        const points = normalizeTrajectoryForRobot(rawPoints, robot);
        // A Work must reach Server before the operator can press Play. The
        // former updateRobot() path waited for the general 500 ms settings
        // debounce, so Server often replayed the previous Work even though
        // this panel already displayed the newly loaded points. The atomic
        // trajectory command persists, resets the cursor and broadcasts the
        // same points as one operation.
        await sendRobotCommand(
          robot.id,
          'trajectory',
          { points, selectedWorkFile: fileName },
          () => ({
            selectedWorkFile: fileName,
            recordedPoints: points,
            playbackState: {
              ...(robot.playbackState || {}),
              isPlaying: false,
              playing: false,
              isPaused: false,
              paused: false,
              activeStep: -1,
              isFinished: false,
              finished: false,
            },
          }),
        );
      } else {
        updateRobot(robot.id, { selectedWorkFile: fileName });
      }
    } catch (e) {
      console.error(e);
      updateRobot(robot.id, { selectedWorkFile: fileName });
    }
  };

  const loadExample = async (id: string) => {
    console.log("Loading example:", id);
    setSelectedExample(id);
    const ex = examples.find(e => e.id === id);
    if (!ex) {
      updateRobot(robot.id, { selectedExample: id });
      return;
    }
    try {
      const points = normalizeTrajectoryForRobot(ex.points.map(withCartesian), robot);
      await sendRobotCommand(
        robot.id,
        'trajectory',
        { points, selectedExample: id },
        () => ({
          selectedExample: id,
          recordedPoints: points,
          playbackState: {
            ...(robot.playbackState || {}),
            isPlaying: false, playing: false, isPaused: false, paused: false,
            activeStep: -1, isFinished: false, finished: false,
          },
        }),
      );
    } catch (error) {
      console.error('Unable to prepare example trajectory', error);
      updateRobot(robot.id, { selectedExample: id });
    }
  };

  const loadExampleForRobot = async (botId: number, exId: string) => {
    const ex = examples.find(e => e.id === exId);
    const targetRobot = robots.find((candidate) => candidate.id === botId);
    if (!ex || !targetRobot) return;
    try {
      const points = normalizeTrajectoryForRobot(ex.points.map(withCartesian), targetRobot);
      await sendRobotCommand(
        botId,
        'trajectory',
        { points, selectedExample: exId },
        () => ({
          selectedExample: exId,
          recordedPoints: points,
          playbackState: {
            ...(targetRobot.playbackState || {}),
            isPlaying: false, playing: false, isPaused: false, paused: false,
            activeStep: -1, isFinished: false, finished: false,
          },
        }),
      );
    } catch (error) {
      console.error('Unable to prepare combined robot example trajectory', error);
    }
  };


  // stop/play fire the atomic command (server-side fans out to
  // combinedWith itself via affectedIds - see server.ts's own switch) with
  // a matching localMutate covering self + combinedWith locally too, so
  // the UI reflects it instantly instead of waiting on the WS round-trip -
  // see store.tsx's own sendRobotCommand comment. Mirrors exactly what
  // server.ts's own "stop"/"play" case now does (isFinished/finished reset
  // included - see that case's own comment) so the optimistic mutation and
  // the real delta that follows agree, instead of one silently overwriting
  // the other's own isFinished value moments later.
  const handleStop = () => {
    globalPlaybacks[robot.id] = false;
    robot.combinedWith?.forEach(id => {
      globalPlaybacks[id] = false;
    });
    sendRobotCommand(
      robot.id,
      'stop',
      undefined,
      (r) => ({ playbackState: { ...(r.playbackState || {}), isPlaying: false, activeStep: -1, isPaused: false, paused: false, isFinished: false } }),
      [robot.id, ...(robot.combinedWith || [])]
    );
  };

  const handlePlay = async (playAll: boolean = false) => {
    // globalPlaybacks is a deliberate module-level escape hatch from React
    // state, not an oversight: playRobotTrajectory's own while-loop below
    // polls it on every step to decide whether to keep looping, and a
    // combined sibling robot's own RobotDetail instance reads the SAME
    // shared object by id - real React state can't be shared across
    // sibling component instances or read from a tight async loop without
    // forcing a re-render per step. Every write site is a real event
    // handler (onClick) or an effect reacting to playbackState arriving
    // from elsewhere (never during render), so this mutation is safe.
    globalPlaybacks[robot.id] = true; // eslint-disable-line -- see comment above; not a render-time write
    if (playAll) {
      robot.combinedWith?.forEach(id => {
        globalPlaybacks[id] = true;
      });
    }

    if (robot.recordedPoints.length === 0) return;
    // Only THIS robot mutated optimistically here, matching the original
    // scope of this local update - a combined sibling's own playbackState
    // still lands correctly (the server always fans "play" out to
    // combinedWith - see server.ts's own affectedIds), it just does so via
    // that sibling's own component reacting to ITS OWN
    // robot.playbackState.isPlaying changing once the delta arrives (the
    // effect just below watching that exact field), same propagation path
    // this app already relied on before sendRobotCommand existed.
    sendRobotCommand(
      robot.id,
      'play',
      undefined,
      (r) => ({ playbackState: { ...(r.playbackState || {}), isPlaying: true, activeStep: 0, isPaused: false, paused: false, isFinished: false } })
    );
    // playRobotTrajectory (the ~215-line local interpolation loop that
    // used to live here, recorded-point by recorded-point with a real
    // velocity/acceleration curve) is removed:
    // server.ts's own V0 playback engine (see its own header comment) is
    // now the SOLE driver of playback motion, for every client including
    // this one - it replays this robot's recordedPoints itself and
    // broadcasts a real delta on every step, which this component
    // already renders reactively via robot.pos/robot.joints/
    // robot.playbackState like any other incoming state. Two independent
    // drivers writing the same robot's position (this loop AND the
    // server, both real, both timed) would be a real problem on physical
    // hardware, not just a UI glitch - see the "Started from outside"
    // effect this same change also removed below, which existed only to
    // start this loop when another client's own 'play' command arrived.
    // The server's engine is deliberately a linear point-to-point
    // replay, not yet this loop's own smooth curve - see server.ts's own
    // comment on that scope boundary. Full history in git.
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

  // Was scoped to robot A1 only as a proof of concept; it now applies to every robot.
  // Speed/Acceleration/Step/J1-J6 live in JointControlsOverlay, XYZ jog in
  // JoystickOverlay, and (when hasXYTable) the XY table controls in
  // XYTableOverlay - all three float ON the 3D viewport instead of the
  // classic panel below it, which is why this used to be a per-robot flag
  // rather than a constant: none of those 3 components have anything A1-
  // specific baked in (robot/jogStep/handlers are plain props), so turning
  // this into `true` for every robot needed no other change.
  const isFloatingLayout = true;

  const hasXYTable = robot.hasXYTable;

  const combinedBotsInfo = (robot.combinedWith || []).map(id => robots.find(r => r.id === id)).filter(Boolean) as RobotState[];
  const isStartAll = combinedBotsInfo.length > 0;

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(robot.playbackState?.speed || 100);
  const [playbackAcceleration, setPlaybackAcceleration] = useState<number>(robot.playbackState?.acceleration || 100);

  // Real "adjust state during render" pattern: playbackSpeed/Acceleration
  // are optimistic local buffers (handleSpeedChange/handleAccelerationChange
  // below set them immediately, ahead of the server round-trip), but they
  // also need to pick up a value that arrived from elsewhere (another
  // client, or the server's own confirmation) once robot.playbackState
  // catches up - same condition the effects used, just evaluated every
  // render instead of only on a dependency change, so it also covers a
  // robot switch without needing robot.id listed separately.
  if (robot.playbackState?.speed !== undefined && robot.playbackState.speed !== playbackSpeed) {
    setPlaybackSpeed(robot.playbackState.speed);
  }
  if (robot.playbackState?.acceleration !== undefined && robot.playbackState.acceleration !== playbackAcceleration) {
    setPlaybackAcceleration(robot.playbackState.acceleration);
  }

  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    // Atomic 'speed' command - see toggleValve's own comment above.
    sendRobotCommand(robot.id, 'speed', { speed: newSpeed }, (r) => ({ playbackState: { ...(r.playbackState || {}), speed: newSpeed } }));
  };

  // We'd always had a speed control here but never one for acceleration -
  // same 10-500% scale as speed, same RotaryKnob+FuturisticSlider pair.
  const handleAccelerationChange = (newAcceleration: number) => {
    setPlaybackAcceleration(newAcceleration);
    sendRobotCommand(robot.id, 'speed', { acceleration: newAcceleration }, (r) => ({ playbackState: { ...(r.playbackState || {}), acceleration: newAcceleration } }));
  };
  const playbackPausedRef = useRef(false);
  useEffect(() => {
    playbackPausedRef.current = robot.playbackState?.isPaused || false;
  }, [robot.playbackState?.isPaused]);


  // Removed: this effect used to call handlePlay()/
  // handleStop() locally whenever robot.playbackState.isPlaying toggled
  // from an external source (another client's own play/stop command),
  // so that THIS tab's own local playRobotTrajectory loop would start
  // driving motion too. Now that server.ts's own V0 playback engine is
  // the sole driver (see handlePlay's own comment above), that call would
  // be actively harmful, not just redundant: handlePlay() still sends a
  // real 'play' command, and server.ts's 'play' case always resets
  // activeStep to 0 - so this effect reacting to the server's OWN
  // broadcast by resending 'play' would restart the trajectory from the
  // beginning in a loop, never actually progressing. No replacement is
  // needed: this component already renders robot.pos/robot.joints/
  // robot.playbackState reactively from whatever the server broadcasts,
  // same as every other client.

  useEffect(() => {
    if (robot.playbackState?.isPlaying && robot.playbackState?.activeStep !== null && robot.playbackState?.activeStep !== -1) {
      const el = document.getElementById(`step-${robot.id}-${robot.playbackState?.activeStep}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [robot.playbackState?.activeStep, robot.playbackState?.isPlaying, robot.id]);

  // Real regression fix, live-reproduced: server.ts's own V0 playback engine
  // (startServerPlayback) broadcasts each recordedPoints[] entry's {j1..j6}
  // AS-IS, unmodified - correct only for the truly generic model, where
  // those numbers ARE the robot's real joints. For every model with its own
  // real kinematics (Parol6/Faze4/AR3/AR4/UR*/xArm6/... - resolveTargetJoints's
  // own long dispatch above), a loaded example's {j1..j6} was computed
  // against the shared GENERIC 160mm/200mm formula instead (see withCartesian's
  // own comment) - applying those numbers directly as this robot's real
  // joints is what made played-back examples/WORKS files move the arm
  // through incoherent, nonsensical poses instead of the intended path.
  // STUDIO's OWN removed client-side playback loop used to re-solve this
  // exact way (see resolveTargetJoints's header comment: "re-solve the
  // resolved Cartesian target... against that robot's own real kinematics
  // instead, so recorded/played trajectories move it sensibly") - moving
  // playback server-side dropped that step, since server.ts has no access
  // to any of these per-model IK solvers (they're pure three.js-dependent
  // TS, not a quick port). Re-deriving it here, purely client-side, restores the exact same
  // correctness for every connected client (STUDIO's browser tab AND
  // Android's WebView-embedded copy of this same page) without needing
  // server.ts to know anything about per-model kinematics at all -
  // `robot.pos`'s x/y/z/a/b/c is already the real, robot-agnostic Cartesian
  // target this point means to reach, exactly like a live jog. Scoped to
  // ONLY fire during active playback (not every robot.pos change) so a
  // direct joint-slider edit (onJointChange, which never touches
  // robot.pos) is never fought with a stale re-derivation.
  // useLayoutEffect, not useEffect: fires before the browser paints the
  // just-arrived (wrong) broadcast joints, so the correction lands in the
  // very next commit instead of one extra visible frame of the wrong pose.
  const playbackTrajectoryMode = (robot.playbackState as any)?.trajectoryMode;
  useLayoutEffect(() => {
    if (!robot.playbackState?.isPlaying) return;
    if (playbackTrajectoryMode === 'model-joints') return;
    const target = playbackTrajectoryMode === 'legacy-generic'
      ? withCartesian(robot.joints)
      : robot.pos;
    if (typeof target?.x !== 'number') return;
    const resolved = resolveTargetJoints(
      robot.model, target.x, target.y, target.z,
      target.a ?? 0, target.b ?? 0, target.c ?? 0,
      robot.joints,
    );
    const changed = (['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const).some(
      (k) => Math.abs((resolved[k] ?? 0) - (robot.joints[k] ?? 0)) > 0.01
    );
    if (changed) {
      updateRobot(robot.id, { joints: resolved });
    }
  }, [
    robot.pos, robot.pos?.x, robot.pos?.y, robot.pos?.z, robot.pos?.a, robot.pos?.b, robot.pos?.c,
    robot.joints, robot.playbackState?.isPlaying, robot.model, robot.id, updateRobot,
    playbackTrajectoryMode,
  ]);

  const [reset3DKey, setReset3DKey] = useState(0);
  // Cross-client RESET 3D sync - watches robot.reset3DTrigger (bumped by
  // handleReset3D on ANY client via the atomic 'reset3D' command, this
  // client's own press included) and remounts VirtualKinematics locally
  // whenever it changes, so this camera-only reset now really reaches
  // every other connected client instead of just the one pressed. Skips
  // the very first render (a ref, not state) so loading a robot that
  // already has a `reset3DTrigger` from a past session doesn't remount the
  // freshly-mounted 3D view a second time for nothing.
  const sawReset3DTrigger = useRef(false);
  useEffect(() => {
    if (robot.reset3DTrigger === undefined) return;
    if (sawReset3DTrigger.current) setReset3DKey(k => k + 1);
    sawReset3DTrigger.current = true;
  }, [robot.reset3DTrigger]);
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
    // Stamp this robot's own real Cartesian tool-tip position (via its own FK) onto the
    // point at the moment it's recorded - see withCartesian()'s comment above for why this
    // matters: without it, this point's {j1..j6} would later be ambiguous (this robot's own
    // native joints vs. the shared generic formula's), which is exactly what made loaded
    // examples draw/play back wrong for Parol6/Faze4/AR3/AR4.
    const cart = jointsToCartesianForModel(robot.model, robot.joints);
    updateRobot(robot.id, {
      recordedPoints: [...robot.recordedPoints, {
        j1: Number(robot.joints.j1.toFixed(3)),
        j2: Number(robot.joints.j2.toFixed(3)),
        j3: Number(robot.joints.j3.toFixed(3)),
        j4: Number(robot.joints.j4.toFixed(3)),
        j5: Number(robot.joints.j5.toFixed(3)),
        j6: Number(robot.joints.j6.toFixed(3)),
        x: Number(cart.x.toFixed(3)),
        y: Number(cart.y.toFixed(3)),
        z: Number(cart.z.toFixed(3)),
        a: Number(cart.a.toFixed(3)),
        b: Number(cart.b.toFixed(3)),
        c: Number(cart.c.toFixed(3)),
        ...(robot.hasXYTable ? {
          tx: Number((robot.pos.tx || 0).toFixed(3)),
          ty: Number((robot.pos.ty || 0).toFixed(3)),
          trz: Number((robot.pos.trz || 0).toFixed(3))
        } : {})
      }]
    });
  };

  // XYZ jog for the floating Joystick3D overlay (currently robot A1 only, see
  // JointControlsOverlay above) - nudges the Cartesian target by dx/dy/dz *
  // jogStep, then re-solves joints through this robot's own real kinematics
  // (resolveTargetJoints, same helper the trajectory player above uses) so
  // the 3D pose stays consistent instead of just moving pos.x/y/z blindly.
  //
  // Fires the atomic 'jog' command instead of updateRobot - one call per
  // non-zero axis (the server only moves one pos axis per command), each
  // carrying this SAME resolved `newJoints` as an override so the final
  // robot.joints lands on STUDIO's own per-model IK result regardless of
  // which of the up to 3 calls the server processes last, rather than the
  // server's own calculateJoints() (a single generic formula that would
  // silently diverge from what this same model's real kinematics chain
  // needs - see server.ts's own jog case comment / DISEÑO_SYNC_DELTAS.txt).
  // localMutate mirrors the exact same pos+joints locally per axis so the
  // UI moves instantly, rolled back per-axis if that axis's own request
  // fails (see store.tsx's own sendRobotCommand comment).
  const handleXYZJog = (dx: number, dy: number, dz: number) => {
    const cart = jointsToCartesianForModel(robot.model, robot.joints);
    const x = cart.x + dx * jogStep;
    const y = cart.y + dy * jogStep;
    const z = cart.z + dz * jogStep;
    const newJoints = resolveTargetJoints(robot.model, x, y, z, cart.a, cart.b, cart.c, robot.joints);
    const axes: { axis: 'x' | 'y' | 'z'; amount: number; value: number }[] = [
      { axis: 'x' as const, amount: dx * jogStep, value: x },
      { axis: 'y' as const, amount: dy * jogStep, value: y },
      { axis: 'z' as const, amount: dz * jogStep, value: z },
    ].filter((a) => a.amount !== 0);
    for (const a of axes) {
      sendRobotCommand(
        robot.id,
        'jog',
        { axis: a.axis, amount: a.amount, target: 'robot', joints: newJoints },
        (r) => ({ pos: { ...r.pos, [a.axis]: a.value, a: cart.a, b: cart.b, c: cart.c }, joints: newJoints })
      );
    }
  };

  // Dedicated base-rotation (J1) jog, alongside the Cartesian XYZ jog above -
  // requested directly: 2 dedicated base-rotation buttons rather than
  // needing to open the separate J1-J6 grid (JointControlsOverlay) just to
  // nudge the base. Deliberately pure joint-space, NOT round-tripped
  // through Cartesian pos+resolveTargetJoints the way handleXYZJog is:
  // rotating J1 alone doesn't need inverse kinematics at all (unlike
  // dx/dy/dz, which do), so going straight to the joint value is both
  // simpler and can't introduce a wrong-solution IK ambiguity. Still keeps
  // `robot.pos` consistent afterward via forward kinematics (same
  // jointsToCartesianForModel used above) rather than leaving it stale,
  // and clamps to this model's own real J1 limits (jointLimitsFor, same
  // helper the J1-J6 grid's own knob/slider already use) so a jog can't
  // walk the joint value outside what a real robot could ever reach.
  const handleJ1Jog = (direction: 1 | -1) => {
    const [j1Min, j1Max] = jointLimitsFor(robot.model, 'j1');
    const newJ1 = Math.min(j1Max, Math.max(j1Min, robot.joints.j1 + direction * jogStep));
    if (newJ1 === robot.joints.j1) return; // already at a real limit - no-op, not a clamped-but-sent command
    const newJoints = { ...robot.joints, j1: newJ1 };
    const newCart = jointsToCartesianForModel(robot.model, newJoints);
    sendRobotCommand(
      robot.id,
      'jog',
      // axis:'x'/amount:0 is a real no-op on the server's own robot.pos.x -
      // the actual desired state is the `joints` override right below,
      // same sanctioned mechanism handleXYZJog already uses (see
      // server.ts's own jog case comment on that override).
      { axis: 'x', amount: 0, target: 'robot', joints: newJoints },
      () => ({ pos: { ...robot.pos, x: newCart.x, y: newCart.y, z: newCart.z, a: newCart.a, b: newCart.b, c: newCart.c }, joints: newJoints })
    );
  };

  // Real pose reset ("HOME"/"RESET" buttons) - was updateRobot(), the
  // optimistic-local + 500ms-debounced-full-tree-save path meant for UI
  // *preferences* (layout, panel state) - it never broadcasts to any OTHER
  // connected client (a second STUDIO window, or the Android app's own
  // embedded WebView copy of this same page), so a reset triggered on one
  // client silently never appeared on another, in either direction. Real
  // feedback from live testing. Routed through the same atomic
  // sendRobotCommand() channel handleXYZJog/handleJ1Jog above already use,
  // which the server both persists AND broadcasts to every other client.
  // HOME and RESET share this same pos+joints reset - only RESET also
  // stops playback (handleStop), matching each button's own original
  // behavior before this fix.
  const resetPose = (alsoStop: boolean) => {
    if (alsoStop) handleStop();
    const newJoints = homePoseFor(robot.model);
    sendRobotCommand(
      robot.id,
      'reset',
      { target: 'robot', joints: newJoints },
      (r) => ({ pos: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0, tx: r.pos?.tx, ty: r.pos?.ty, trz: r.pos?.trz }, joints: newJoints })
    );
  };
  const handleHome = () => resetPose(false);
  const handleReset = () => resetPose(true);

  // Same real-broadcast fix as handleReset above, for the XY table's own
  // separate "HOME XY" button - resets only pos.tx/ty + xyTable.pos, not
  // the arm's own pos/joints.
  const handleResetXY = () => {
    sendRobotCommand(
      robot.id,
      'reset',
      { target: 'xytable' },
      (r) => ({
        pos: { ...r.pos, tx: 0, ty: 0 },
        xyTable: r.xyTable ? { ...r.xyTable, pos: { x: 0, y: 0 } } : r.xyTable,
      })
    );
  };

  // "RESET 3D" only ever remounts THIS client's own VirtualKinematics
  // (camera framing, not real robot state) - the reset3DKey effect below
  // still drives that local remount for every client uniformly (this one
  // included), but the trigger now comes from robot.reset3DTrigger via
  // that effect instead of being bumped directly here, so a press on any
  // client (Android's embedded WebView included) now remounts the 3D view
  // on every OTHER connected client too, not just the one pressed. Real
  // request from live testing ("verse en studio... y viceversa, asi se ve
  // sincronización").
  const handleReset3D = () => {
    sendRobotCommand(robot.id, 'reset3D', undefined, () => ({ reset3DTrigger: Date.now() }));
  };

  // Same real-broadcast fix as handleReset above, for the XY table's own
  // position sliders (both the floating XYTableOverlay and the docked "XY
  // Table Controls" panel below) - `absolute: true` tells the server to SET
  // the axis to `amount` instead of adding it, reusing the same validated
  // 'jog' command/case rather than a bespoke one.
  const handleXYAxisChange = (axis: 'tx' | 'ty', val: number) => {
    sendRobotCommand(
      robot.id,
      'jog',
      { axis: axis === 'tx' ? 'x' : 'y', amount: val, target: 'xytable', absolute: true },
      (r) => ({
        pos: { ...r.pos, [axis]: val },
        xyTable: r.xyTable ? { ...r.xyTable, pos: { ...r.xyTable.pos, [axis === 'tx' ? 'x' : 'y']: val } } : r.xyTable,
      })
    );
  };

  const toggleValve = (index: number) => {
    // Atomic /api/robot/:id/command instead of updateRobot + the 500ms
    // debounced full-tree POST /api/settings - see DISEÑO_SYNC_DELTAS.txt
    // CAUSA A / store.tsx's own sendRobotCommand comment. localMutate gives
    // instant optimistic feedback (rolled back if the request fails);
    // every other client's state updates via the WS delta round-trip,
    // same as before.
    const newValves = [...robot.valves] as [boolean, boolean];
    newValves[index] = !newValves[index];
    sendRobotCommand(robot.id, 'valve', { index, state: newValves[index] }, () => ({ valves: newValves }));
  };

  const togglePump = (index: number) => {
    const newPumps = [...robot.pumps] as [boolean, boolean];
    newPumps[index] = !newPumps[index];
    sendRobotCommand(robot.id, 'pump', { index, state: newPumps[index] }, () => ({ pumps: newPumps }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {!viewportOnly && (
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
      )}

      <div className="flex-1 flex overflow-hidden pt-2 px-2 pb-0 gap-2 min-h-0">
        {/* Left Panel: 3D View */}
        <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
          <div
            // min-h-0 defensively added on the viewportOnly flex-1 chain
            // (here and its two ancestors above) while chasing the Android
            // 3D-viewport bug - turned out NOT to be the actual cause (that
            // was HYDRA-UMC-ANDROID-CONTROL's own WebView never getting real
            // LayoutParams from Compose, see ThreeDScreen.kt), confirmed by
            // this exact chain rendering with real height in a real desktop
            // browser even without it. Left in anyway: it's the correct,
            // standard defensive class for a flex-1 child nested this many
            // levels deep (avoids the well-known min-height:auto-wins-over-
            // flex-grow gotcha regardless of what content ever ends up
            // inside), not just dead weight from a wrong guess.
            className={cn("relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col group shrink-0", viewportOnly ? "flex-1 min-h-0" : "min-h-[200px]")}
            style={!viewportOnly ? { flex: threeDHeight ? `0 0 ${threeDHeight}px` : '1 1 0%' } : {}}
          >
            <VirtualKinematics key={reset3DKey} robot={robot} controlMode={controlMode} onSelectRobot={onNavigateToRobot} lowPower={viewportOnly} />

            {!viewportOnly && (
              <>
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
              </>
            )}

            {isFloatingLayout && !viewportOnly && (
              <JointControlsOverlay
                robot={robot}
                jogStep={jogStep}
                onJogStepChange={setJogStep}
                playbackSpeed={playbackSpeed}
                playbackAcceleration={playbackAcceleration}
                onSpeedChange={handleSpeedChange}
                onAccelerationChange={handleAccelerationChange}
                onJointChange={(j, val) => updateRobot(robot.id, { joints: { ...robot.joints, [j]: val } })}
                t={t}
              />
            )}

            {isFloatingLayout && !viewportOnly && (
              <JoystickOverlay
                jogStep={jogStep}
                onXYZJog={handleXYZJog}
                onJ1Jog={handleJ1Jog}
                j1Value={robot.joints.j1}
                j1Limits={jointLimitsFor(robot.model, 'j1')}
                t={t}
              />
            )}

            {isFloatingLayout && !viewportOnly && hasXYTable && (
              <XYTableOverlay
                robot={robot}
                jogStep={jogStep}
                onAxisChange={handleXYAxisChange}
                t={t}
              />
            )}

            {/* Closed Camera Icons (Bottom Right) - only for a bot whose
                camera is actually enabled, matching the PIP's own gating
                just below: reopening a PIP for a disabled camera would just
                do nothing, so don't offer a dead "Show Camera" button for
                it. */}
            <div className="absolute bottom-4 right-4 z-50 flex gap-2 pointer-events-auto">
              {[robot, ...combinedBotsInfo].filter(isVisionActive).map(bot => {
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

            {/* Camera PIP Windows - gated on visionEnabled too, not just
                online, so a robot with its camera explicitly turned off
                (OverviewPanel/CamerasView's own vision toggle, which writes
                this same field) doesn't get a PIP window anyway just for
                being online. */}
            {robot.online && isVisionActive(robot) && (
              <CameraPIP
                bot={robot}
                initialX={0}
                initialY={0}
                label={robot.name}
                t={t}
              />
            )}
            {combinedBotsInfo.map((bot, index) => (bot.online && isVisionActive(bot)) ? (
              <CameraPIP
                key={bot.id}
                bot={bot}
                initialX={-200 * (index + 1)}
                initialY={0}
                label={bot.name}
                t={t}
              />
            ) : null)}
            
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

            {/* Real per-orientation redesign requested live for the
                Android embedded viewport (viewportOnly): a translucent
                overlay INSIDE the 3D viewport itself (not a second flex
                sibling below it, see this file's own comment on the now-
                removed classic panel above) so the 3D view genuinely
                fills the screen in both orientations. Portrait shows only
                E-STOP/START-STOP/PAUSE-CONTINUE - the same 3 controls the
                classic row always led with; landscape (more width, less
                height to spare) folds every other control back in at a
                smaller size instead of hiding them, replacing their old
                solid colored backgrounds with the same uniform translucent
                style already used for the move/rotate/resize/center
                buttons above - real per the operator's own request. */}
            {viewportOnly && (
              <div className="absolute z-50 pointer-events-auto bottom-2 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center landscape:gap-1 portrait:gap-1.5 bg-slate-950/70 backdrop-blur-md border border-slate-800 rounded-xl landscape:p-1 portrait:p-1.5 max-w-[calc(100%-1rem)]">
                <button
                  onClick={() => {
                    handleStop();
                    updateRobot(robot.id, { online: false });
                    if (isStartAll) {
                      robot.combinedWith?.forEach(id => updateRobot(id, { online: false }));
                    }
                  }}
                  className="flex items-center justify-center landscape:p-1.5 portrait:p-2.5 landscape:min-h-[36px] landscape:min-w-[36px] portrait:min-h-[44px] portrait:min-w-[44px] bg-slate-950/80 hover:bg-red-950 border border-slate-800 hover:border-red-800 text-red-400 rounded-lg transition-colors animate-pulse"
                  title={isStartAll ? t('robot_detail.estop_all', 'E-STOP ALL') : t('robot_detail.estop', 'E-STOP')}
                >
                  <AlertOctagon size={18} />
                </button>

                {!robot.playbackState?.isPlaying ? (
                  <button
                    onClick={() => handlePlay(isStartAll)}
                    disabled={robot.recordedPoints.length === 0}
                    className="flex items-center justify-center landscape:p-1.5 portrait:p-2.5 landscape:min-h-[36px] landscape:min-w-[36px] portrait:min-h-[44px] portrait:min-w-[44px] bg-slate-950/80 hover:bg-emerald-950 disabled:opacity-40 border border-slate-800 hover:border-emerald-800 text-emerald-400 rounded-lg transition-colors"
                    title={isStartAll ? t('robot_detail.start_all', 'START ALL') : t('robot_detail.start', 'START')}
                  >
                    <Play size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    className="flex items-center justify-center landscape:p-1.5 portrait:p-2.5 landscape:min-h-[36px] landscape:min-w-[36px] portrait:min-h-[44px] portrait:min-w-[44px] bg-slate-950/80 hover:bg-red-950 border border-slate-800 hover:border-red-800 text-red-400 rounded-lg transition-colors"
                    title={isStartAll ? t('robot_detail.stop_all', 'STOP ALL') : t('robot_detail.stop', 'STOP')}
                  >
                    <Square size={18} />
                  </button>
                )}

                <button
                  onClick={() => {
                    const isPaused = robot.playbackState?.isPaused || false;
                    sendRobotCommand(
                      robot.id,
                      'pause',
                      { paused: !isPaused },
                      (r) => ({ playbackState: { ...(r.playbackState || {}), isPlaying: true, playing: true, isPaused: !isPaused, paused: !isPaused, requestPause: !isPaused, requestStop: false, isFinished: false, finished: false } }),
                      isStartAll ? [robot.id, ...(robot.combinedWith || [])] : [robot.id]
                    );
                  }}
                  disabled={!robot.playbackState?.isPlaying}
                  className="flex items-center justify-center landscape:p-1.5 portrait:p-2.5 landscape:min-h-[36px] landscape:min-w-[36px] portrait:min-h-[44px] portrait:min-w-[44px] bg-slate-950/80 disabled:opacity-40 border border-slate-800 hover:border-amber-800 text-amber-400 rounded-lg transition-colors"
                  title={robot.playbackState?.isPaused ? t('robot_detail.continue', 'CONTINUE') : (isStartAll ? t('robot_detail.pause_all', 'PAUSE ALL') : t('robot_detail.pause', 'PAUSE'))}
                >
                  {robot.playbackState?.isPaused ? <Play size={18} /> : <Pause size={18} />}
                </button>

                {/* Landscape-only: every other control, folded into this
                    same translucent panel instead of hidden entirely -
                    real per the operator's own request (more width to
                    spare once the phone is held sideways). */}
                <div className="hidden landscape:flex items-center gap-1">
                  <div className="w-px h-5 bg-slate-700 mx-0.5" />

                  <button onClick={handleHome} className="flex items-center justify-center p-1.5 min-h-[36px] min-w-[36px] bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors" title="HOME">
                    <Home size={16} />
                  </button>

                  {robot.hasXYTable && (
                    <button onClick={handleResetXY} className="flex items-center justify-center p-1.5 min-h-[36px] min-w-[36px] bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors" title="HOME XY">
                      <Grid3x3 size={16} />
                    </button>
                  )}

                  <button onClick={handleReset} className="flex items-center justify-center p-1.5 min-h-[36px] min-w-[36px] bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors" title="RESET">
                    <RefreshCw size={16} />
                  </button>

                  <button onClick={handleReset3D} className="flex items-center justify-center p-1.5 min-h-[36px] min-w-[36px] bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors" title="RESET 3D">
                    <RotateCcw size={16} />
                  </button>

                  <button onClick={() => updateRobot(robot.id, { playbackState: { ...(robot.playbackState || { isPlaying: false, activeStep: 0, speed: 100 }), isLooping: !robot.playbackState?.isLooping } })} className={cn("flex items-center justify-center p-1.5 min-h-[36px] min-w-[36px] border rounded-lg transition-colors", robot.playbackState?.isLooping ? "bg-fuchsia-950 border-fuchsia-800 text-fuchsia-400" : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200")} title={t('robot_detail.repeat', 'Repeat')}>
                    <Repeat size={16} className={cn(robot.playbackState?.isLooping && "animate-spin-slow")} />
                  </button>

                  <button onClick={handleAddPoint} className="flex items-center justify-center p-1.5 min-h-[36px] min-w-[36px] bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-sky-400 rounded-lg transition-colors" title={t('robot_detail.add_point', '+ Add Point')}>
                    <Plus size={16} />
                  </button>
                  <button onClick={() => updateRobot(robot.id, { recordedPoints: [] })} className="flex items-center justify-center p-1.5 min-h-[36px] min-w-[36px] bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-rose-400 rounded-lg transition-colors" title={t('robot_detail.delete_points', 'Delete points')}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* This whole action-row/joint-controls panel used to be a
              second flex-1 sibling of the 3D viewport above, splitting
              the available height roughly in half regardless of
              orientation - the real cause of "the 3D view doesn't fill
              the screen" reported live on the Android embedded viewport
              (viewportOnly). Gone entirely there now; its own real
              replacement (RobotDetail-*.tsx has none rendered outside of
              it - see the overlay panel inside the 3D viewport div
              above, gated on viewportOnly the other way around) covers
              the same controls without taking a share of the layout. */}
          {!viewportOnly && (
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
              className={cn("flex items-center justify-center gap-2 min-h-[48px] bg-red-600 hover:bg-red-500 text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_20px_rgba(220,38,38,0.8)] border border-red-500 animate-pulse", isAndroidApp ? "px-3 py-2 min-h-[40px]" : "px-4 py-3")}
              title={isStartAll ? t('robot_detail.estop_all', 'E-STOP ALL') : t('robot_detail.estop', 'E-STOP')}
            >
              <AlertOctagon size={16} /> {!isAndroidApp && (isStartAll ? t('robot_detail.estop_all', 'E-STOP ALL') : t('robot_detail.estop', 'E-STOP'))}
            </button>

            {/* START/STOP Button */}
            {!robot.playbackState?.isPlaying ? (
              <button
                onClick={() => handlePlay(isStartAll)}
                disabled={robot.recordedPoints.length === 0}
                className={cn("flex-1 flex items-center justify-center gap-2 min-h-[48px] bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(34,197,94,0.6)] border border-green-400", isAndroidApp ? "px-3 py-2 min-h-[40px] flex-initial" : "px-4 py-3")}
                title={isStartAll ? t('robot_detail.start_all', 'START ALL') : t('robot_detail.start', 'START')}
              >
                <Play size={16} /> {!isAndroidApp && (isStartAll ? t('robot_detail.start_all', 'START ALL') : t('robot_detail.start', 'START'))}
              </button>
            ) : (
              <button
                onClick={handleStop}
                className={cn("flex-1 flex items-center justify-center gap-2 min-h-[48px] bg-red-600 hover:bg-red-500 text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(220,38,38,0.6)] border border-red-500", isAndroidApp ? "px-3 py-2 min-h-[40px] flex-initial" : "px-4 py-3")}
                title={isStartAll ? t('robot_detail.stop_all', 'STOP ALL') : t('robot_detail.stop', 'STOP')}
              >
                <Square size={16} /> {!isAndroidApp && (isStartAll ? t('robot_detail.stop_all', 'STOP ALL') : t('robot_detail.stop', 'STOP'))}
              </button>
            )}

            {/* PAUSE / CONTINUE Button */}
            <button
              onClick={() => {
                const isPaused = robot.playbackState?.isPaused || false;
                // Atomic 'pause' command - server.ts's own case already
                // fans this out to combinedWith via affectedIds on its
                // own, so one call covers the whole group server-side;
                // localMutate's own affectedIds list below only controls
                // which robots get the INSTANT optimistic update (matches
                // this button's original isStartAll-gated scope - a
                // sibling not included here still ends up paused once its
                // own delta arrives, same as PLAY's own comment above).
                sendRobotCommand(
                  robot.id,
                  'pause',
                  { paused: !isPaused },
                  (r) => ({ playbackState: { ...(r.playbackState || {}), isPlaying: true, playing: true, isPaused: !isPaused, paused: !isPaused, requestPause: !isPaused, requestStop: false, isFinished: false, finished: false } }),
                  isStartAll ? [robot.id, ...(robot.combinedWith || [])] : [robot.id]
                );
              }}
              disabled={!robot.playbackState?.isPlaying}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 min-h-[48px] text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all border disabled:opacity-50 disabled:cursor-not-allowed",
                isAndroidApp ? "px-3 py-2 min-h-[40px] flex-initial" : "px-4 py-3",
                robot.playbackState?.isPaused ? 'bg-blue-500 hover:bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)] border-blue-400' : 'bg-amber-500 hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)] border-amber-400'
              )}
              title={robot.playbackState?.isPaused ? t('robot_detail.continue', 'CONTINUE') : (isStartAll ? t('robot_detail.pause_all', 'PAUSE ALL') : t('robot_detail.pause', 'PAUSE'))}
            >
              {robot.playbackState?.isPaused ? (
                <><Play size={16} /> {!isAndroidApp && t('robot_detail.continue', 'CONTINUE')}</>
              ) : (
                <><Pause size={16} /> {!isAndroidApp && (isStartAll ? t('robot_detail.pause_all', 'PAUSE ALL') : t('robot_detail.pause', 'PAUSE'))}</>
              )}
            </button>

            {/* HOME Button */}
            <button
              onClick={handleHome}
              className={cn("flex items-center justify-center gap-2 min-h-[48px] bg-yellow-500 hover:bg-yellow-400 text-yellow-950 text-sm font-bold uppercase tracking-widest rounded-lg transition-all border border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]", isAndroidApp ? "px-3 py-2 min-h-[40px]" : "px-4 py-3")}
              title="HOME"
            >
              <Home size={16} /> {!isAndroidApp && "HOME"}
            </button>

            {/* HOME XY Button - a distinct Grid3x3 icon from plain HOME
                (both used the same Home icon before - reported live as
                confusing on Android's now icon-only layout, but the
                mismatch existed for STUDIO's own text+icon buttons too;
                fixed for both). */}
            {robot.hasXYTable && (
              <button
                onClick={handleResetXY}
                className={cn("flex items-center justify-center gap-2 min-h-[48px] bg-yellow-500 hover:bg-yellow-400 text-yellow-950 text-sm font-bold uppercase tracking-widest rounded-lg transition-all border border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]", isAndroidApp ? "px-3 py-2 min-h-[40px]" : "px-4 py-3")}
                title="HOME XY"
              >
                <Grid3x3 size={16} /> {!isAndroidApp && "HOME XY"}
              </button>
            )}

            {/* RESET Button */}
            <button
              onClick={handleReset}
              className={cn("flex items-center justify-center gap-2 min-h-[48px] bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all border border-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.3)]", isAndroidApp ? "px-3 py-2 min-h-[40px]" : "px-4 py-3")}
              title="RESET"
            >
              <RefreshCw size={16} /> {!isAndroidApp && "RESET"}
            </button>

            {/* RESET 3D Button - RotateCcw instead of the old Video icon
                (a camera/record glyph, which read as unrelated to what
                this button actually does: remount the 3D viewport). */}
            <button
              onClick={handleReset3D}
              className={cn("flex items-center justify-center gap-2 min-h-[48px] bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all border border-teal-500 shadow-[0_0_15px_rgba(13,148,136,0.3)]", isAndroidApp ? "px-3 py-2 min-h-[40px]" : "px-4 py-3")}
              title="RESET 3D"
            >
              <RotateCcw size={16} /> {!isAndroidApp && "RESET 3D"}
            </button>

            {/* LOAD Button only (EXPORT removed) */}
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={(e) => loadKinematics(robot.id, e)}
            />
            <button
              onClick={() => updateRobot(robot.id, { playbackState: { ...(robot.playbackState || { isPlaying: false, activeStep: 0, speed: 100 }), isLooping: !robot.playbackState?.isLooping } })}
              className={cn(
                "flex items-center justify-center gap-2 min-h-[48px] text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all border",
                isAndroidApp ? "px-3 py-2 min-h-[40px]" : "px-4 py-3",
                robot.playbackState?.isLooping
                  ? "bg-fuchsia-700 border-fuchsia-400 shadow-[inset_0_4px_8px_rgba(0,0,0,0.8),0_0_10px_rgba(217,70,239,0.5)] translate-y-[2px]"
                  : "bg-fuchsia-500 hover:bg-fuchsia-400 border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.5)] hover:-translate-y-[1px]"
              )}
              title={t('robot_detail.repeat', 'Repeat')}
            >
              <Repeat size={16} className={cn(robot.playbackState?.isLooping && "animate-spin-slow")} /> {!isAndroidApp && t('robot_detail.repeat', 'Repeat')}
            </button>

            {/* Add/Delete Point mini-frame - floating layout only (see
                isFloatingLayout's own header comment). Non-floating robots
                keep these 2 buttons in the classic Joint Controls panel
                below, unchanged - this is purely a layout move, same
                handlers either way. */}
            {isFloatingLayout && (
              <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1">
                <button
                  onClick={handleAddPoint}
                  className={cn("bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/30 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center", isAndroidApp ? "p-2 min-h-[40px] min-w-[40px]" : "px-4 py-2 min-h-[44px]")}
                  title={t('robot_detail.add_point', '+ Add Point')}
                >
                  {isAndroidApp ? <Plus size={16} /> : t('robot_detail.add_point', '+ Add Point')}
                </button>
                <button
                  onClick={() => updateRobot(robot.id, { recordedPoints: [] })}
                  className={cn("flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors", isAndroidApp ? "p-2 min-h-[40px] min-w-[40px]" : "p-2 min-h-[44px] min-w-[44px]")}
                  title={t('robot_detail.delete_points', 'Delete points')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Joint Controls - classic layout only (isFloatingLayout puts
              Step/Speed/Acceleration/Joints in JointControlsOverlay, XYZ
              jog in JoystickOverlay, XY table in XYTableOverlay, and
              Add/Delete Point in the button row above - nothing left to
              show here, so the whole panel goes away and the 3D view above
              expands to fill the freed vertical space via its own existing
              flex:1 sizing). */}
          {!isFloatingLayout && (
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
                {!isFloatingLayout && (
                <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 min-h-[44px]">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('robot_detail.speed', 'Speed:')}</span>
                  <RotaryKnob
                    min={10}
                    max={500}
                    value={playbackSpeed}
                    onChange={handleSpeedChange}
                    size={40}
                    step={jogStep}
                  />
                  <div className="w-32 ml-2">
                    <FuturisticSlider
                      min={10}
                      max={500}
                      value={playbackSpeed}
                      onChange={handleSpeedChange}
                      step={jogStep}
                    />
                  </div>
                  <span className="text-xs font-mono text-sky-400 w-10 text-right">{playbackSpeed}%</span>
                </div>
                )}

                {!isFloatingLayout && (
                <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 min-h-[44px]">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('robot_detail.acceleration', 'Acceleration:')}</span>
                  <RotaryKnob
                    min={10}
                    max={500}
                    value={playbackAcceleration}
                    onChange={handleAccelerationChange}
                    size={40}
                    step={jogStep}
                  />
                  <div className="w-32 ml-2">
                    <FuturisticSlider
                      min={10}
                      max={500}
                      value={playbackAcceleration}
                      onChange={handleAccelerationChange}
                      step={jogStep}
                    />
                  </div>
                  <span className="text-xs font-mono text-amber-400 w-10 text-right">{playbackAcceleration}%</span>
                </div>
                )}

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

            {/* No isFloatingLayout hint paragraph here anymore - this whole
                panel is now wrapped in `{!isFloatingLayout && (...)}` above,
                so a floating-layout hint inside it could never actually
                render; the floating windows (JointControlsOverlay,
                JoystickOverlay, XYTableOverlay) are self-explanatory on
                their own. */}

            {!isFloatingLayout && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const).map(j => {
                  // Parol6/AR4 have real, narrower per-joint limits (from their own URDF/
                  // config) than the generic +/-180 range every other model uses - clamping
                  // the sliders to them keeps jogging from wandering into unreachable/
                  // self-colliding angles. Faze4/AR3 declare every joint "continuous" in
                  // their own URDFs (genuinely no limit), so they keep the generic range.
                  const [jMin, jMax] = jointLimitsFor(robot.model, j);
                  return (
                  <div key={j} className="flex flex-col gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase">{j}</span>
                      <span className="text-xs font-mono text-sky-400">{robot.joints[j as keyof typeof robot.joints]?.toFixed(2)}°</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <RotaryKnob
                        min={jMin}
                        max={jMax}
                        value={robot.joints[j as keyof typeof robot.joints]}
                        onChange={val => updateRobot(robot.id, { joints: { ...robot.joints, [j]: val } })}
                        size={44}
                        step={jogStep}
                      />
                      <FuturisticSlider min={jMin} max={jMax} value={robot.joints[j as keyof typeof robot.joints]} onChange={val => updateRobot(robot.id, { joints: { ...robot.joints, [j]: val } })} className="flex-1" step={jogStep} />
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

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
                      <div className="flex items-center gap-4">
                        <RotaryKnob
                          min={0}
                          max={maxVal}
                          value={robot.pos[axis] || 0}
                          onChange={val => handleXYAxisChange(axis, val)}
                          size={44}
                          step={jogStep}
                        />
                        <FuturisticSlider
                          min={0}
                          max={maxVal}
                          value={robot.pos[axis] || 0}
                          onChange={val => handleXYAxisChange(axis, val)}
                          className="flex-1"
                          step={jogStep}
                        />
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            )}
          </div>
          )}
          </div>
          )}
        </div>

        {!isFullscreen && !viewportOnly && (
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
        {!viewportOnly && (
          <div
            className={cn("w-full lg:w-auto flex flex-col shrink-0 min-h-0 gap-2 transition-all duration-75", isFullscreen && "hidden")}
            style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? rightPanelWidth : '100%' }}
          >
          {/* Top Panel: Config, I/O, Points */}
          <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-0 shrink-0 max-h-[50%]">
            <div className="flex items-center border-b border-slate-800 bg-slate-900 overflow-x-auto custom-scrollbar shrink-0">
              <button 
                onClick={() => setRightTab('trajectories')} 
                className={cn("flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors", rightTab === 'trajectories' ? "text-sky-400 border-b-2 border-sky-400 bg-slate-800" : "text-slate-400 hover:text-slate-300")}
              >
                {t('robot_detail.trajectories_tab', 'Trajectories')}
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
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t('robot_detail.works_robot', 'Works Robot')}</label>
                    <div className="flex items-center gap-2">
                      <select 
                        className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none"
                        value={selectedWorkFile}
                        onChange={(e) => loadWorkFile(e.target.value)}
                        disabled={robot.playbackState?.isPlaying}
                      >
                        <option value="">{t('robot_detail.select', '-- Select --')}</option>
                        {workFiles.map(file => (
                          <option key={file} value={file}>{file}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleSaveWorkFile}
                        disabled={robot.playbackState?.isPlaying || robot.recordedPoints.length === 0}
                        className="flex items-center justify-center w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors disabled:opacity-50 shrink-0"
                        title={t('robot_detail.save_trajectory', 'Save')}
                      >
                        <Save size={20} />
                      </button>
                      <button
                        onClick={() => uploadWorkFileRef.current?.click()}
                        disabled={robot.playbackState?.isPlaying}
                        className="flex items-center justify-center w-10 h-10 bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors disabled:opacity-50 shrink-0"
                        title={t('robot_detail.upload_trajectory', 'Open / Add')}
                      >
                        <FolderOpen size={20} />
                      </button>
                      <button
                        onClick={handleExportGCode}
                        disabled={robot.recordedPoints.length === 0}
                        className="flex items-center justify-center w-10 h-10 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors disabled:opacity-50 shrink-0"
                        title={t('robot_detail.export_gcode', 'Export as G-code')}
                      >
                        <Download size={20} />
                      </button>
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        ref={uploadWorkFileRef}
                        onChange={handleUploadWorkFile}
                      />
                    </div>
                  </div>
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
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {t('robot_detail.model', 'Model')}
                      {ROBOT_MANUFACTURERS[robot.model] && (
                        <span className="text-slate-500 normal-case font-normal"> &middot; {ROBOT_MANUFACTURERS[robot.model]}</span>
                      )}
                    </label>
                    <select
                      value={robot.model}
                      onChange={e => updateRobot(robot.id, { model: e.target.value as any })}
                      className="bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none"
                    >
                      <optgroup label="Source Robotics">
                        <option value="Parol6 (6-DOF)">Parol6 (6-DOF)</option>
                        <option value="Faze4 (6-DOF)">Faze4 (6-DOF)</option>
                      </optgroup>
                      <optgroup label="Annin Robotics">
                        <option value="AR3 (6-DOF)">AR3 (6-DOF)</option>
                        <option value="AR4 (6-DOF)">AR4 (6-DOF)</option>
                      </optgroup>
                      <optgroup label="Universal Robots">
                        <option value="UR3e (6-DOF)">UR3e (6-DOF)</option>
                        <option value="UR5e (6-DOF)">UR5e (6-DOF)</option>
                        <option value="UR10e (6-DOF)">UR10e (6-DOF)</option>
                        <option value="UR16e (6-DOF)">UR16e (6-DOF)</option>
                        <option value="UR20 (6-DOF)">UR20 (6-DOF)</option>
                        <option value="UR3 (6-DOF)">UR3 (6-DOF, classic)</option>
                        <option value="UR5 (6-DOF)">UR5 (6-DOF, classic)</option>
                        <option value="UR10 (6-DOF)">UR10 (6-DOF, classic)</option>
                      </optgroup>
                      <optgroup label="UFACTORY">
                        <option value="xArm6 (6-DOF)">xArm6 (6-DOF)</option>
                        <option value="Lite 6 (6-DOF)">Lite 6 (6-DOF)</option>
                      </optgroup>
                      <optgroup label="Comau">
                        <option value="e.DO (6-DOF)">e.DO (6-DOF)</option>
                      </optgroup>
                      <optgroup label="Kinova">
                        <option value="Gen3 Lite (6-DOF)">Gen3 Lite (6-DOF)</option>
                        <option value="Gen2 (6-DOF)">Gen2 (6-DOF)</option>
                      </optgroup>
                      <optgroup label="FANUC">
                        <option value="M-710iC (6-DOF)">M-710iC (6-DOF)</option>
                      </optgroup>
                      <optgroup label="The Robot Studio">
                        <option value="SO-ARM100 (5-DOF)">SO-ARM100 (5-DOF)</option>
                      </optgroup>
                      <optgroup label="AgileX">
                        <option value="PiPER (6-DOF)">PiPER (6-DOF)</option>
                      </optgroup>
                      <optgroup label="Unitree">
                        <option value="Z1 (6-DOF)">Z1 (6-DOF)</option>
                      </optgroup>
                      <optgroup label="Trossen Robotics">
                        <option value="ViperX 300 (6-DOF)">ViperX 300 (6-DOF)</option>
                        <option value="WidowX 250 (6-DOF)">WidowX 250 (6-DOF)</option>
                      </optgroup>
                      <optgroup label="Koch / Low-Cost Robot Arm">
                        <option value="Koch v1.1 (5-DOF)">Koch v1.1 (5-DOF)</option>
                      </optgroup>
                      <optgroup label="Generic">
                        <option value="Generic (6-DOF)">Generic (6-DOF)</option>
                      </optgroup>
                      {settings.customModels && settings.customModels.length > 0 && (
                        <optgroup label={t('robot_detail.custom_models', 'Custom')}>
                          {settings.customModels.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </optgroup>
                      )}
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
                      onChange={e => sendRobotCommand(robot.id, 'tool', { tool: e.target.value }, () => ({ tool: e.target.value as any }))}
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
                              // Dedupe defensively on every write, not just here - a stale
                              // `robot` closure (or any future double-fire of this handler)
                              // must not be able to grow this array unbounded: without this
                              // guard a robot's combinedWith can silently balloon to dozens of
                              // duplicate entries (the same handful of ids repeated over and
                              // over); a prior case had 144 entries and 3 ids repeated 48x.
                              const current = robot.combinedWith || [];
                              const next = e.target.checked
                                ? (current.includes(r.id) ? current : [...current, r.id])
                                : current.filter(id => id !== r.id);
                              updateRobot(robot.id, { combinedWith: Array.from(new Set(next)) });
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

                  {/* Robot Controller Board (STM32G474RET6, Tier 1) - real hardware status,
                      surfaced here so it's visible without switching to Flasher/Tester. See
                      HYDRA-UMC's own docs/CANBUS_STM32G474.TXT and docs/PINOUT_STM32G474_ROBOT_CONTROLLER.TXT. */}
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                      {t('robot_detail.controller_board_upper', 'ROBOT CONTROLLER BOARD')}
                      <span className={cn("w-2 h-2 rounded-full", robot.controllerBoard ? "bg-emerald-500" : "bg-slate-700")} />
                    </h4>
                    {robot.controllerBoard ? (
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <span className="text-slate-500">{t('robot_detail.hardware_id', 'Hardware ID')}</span>
                        <span className="font-mono text-slate-200 text-right">{robot.controllerBoard.hardwareId || '?'}</span>
                        <span className="text-slate-500">{t('flasher.current_version', 'Firmware')}</span>
                        <span className="font-mono text-emerald-400 text-right">{robot.controllerBoard.firmwareVersion || '?'}</span>
                        <span className="text-slate-500">{t('flasher.bootloader', 'Bootloader')}</span>
                        <span className="font-mono text-slate-300 text-right">{robot.controllerBoard.bootloaderVersion || '?'}</span>
                      </div>
                    ) : (
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-500">
                        {t('robot_detail.controller_board_unknown', 'No version known - query it from HYDRA-UMC → Tester.')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Bottom Panel: Points & Trajectories Table */}
          <div className="flex flex-col flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-0">
            <div className="p-3 bg-slate-900 border-b border-slate-800 shrink-0 flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">{t('robot_detail.points_table', 'Points Table')}</span>
              <div className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-md flex items-center gap-2 shadow-inner">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('robot_detail.steps', 'Steps:')}</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{robot.recordedPoints.length}</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">
              <div className="space-y-2">
                {robot.recordedPoints.map((pt, i) => {
                const ptKey = pointKeyFor(pt);
                return (
                  <div id={`step-${robot.id}-${i}`} key={ptKey} className={cn("bg-slate-900 border rounded p-2 text-xs flex flex-col gap-1 transition-colors", robot.playbackState?.activeStep === i ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "border-slate-800")}>
                    <div className="flex justify-between items-center border-b border-slate-800/50 pb-1 mb-1">
                      <div className="flex items-center gap-2">
                        {robot.playbackState?.activeStep === i ? (
                          <Play size={12} className="text-emerald-400 animate-pulse fill-emerald-400" />
                        ) : (
                          <span className="w-3" />
                        )}
                        <span className={cn("font-mono font-bold", robot.playbackState?.activeStep === i ? "text-emerald-400" : "text-slate-400")}>{t('robot_detail.step_upper', 'STEP')} {i}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => {
                          if (i === 0) return;
                          const newPts = [...robot.recordedPoints];
                          const temp = newPts[i];
                          newPts[i] = newPts[i - 1];
                          newPts[i - 1] = temp;
                          updateRobot(robot.id, { recordedPoints: newPts });
                        }} className="text-slate-500 hover:text-sky-400 p-1 disabled:opacity-20 transition-colors" disabled={i === 0}>
                          <ArrowUp size={14} />
                        </button>
                        <button onClick={() => {
                          if (i === robot.recordedPoints.length - 1) return;
                          const newPts = [...robot.recordedPoints];
                          const temp = newPts[i];
                          newPts[i] = newPts[i + 1];
                          newPts[i + 1] = temp;
                          updateRobot(robot.id, { recordedPoints: newPts });
                        }} className="text-slate-500 hover:text-sky-400 p-1 disabled:opacity-20 transition-colors" disabled={i === robot.recordedPoints.length - 1}>
                          <ArrowDown size={14} />
                        </button>
                        <button onClick={() => {
                          setEditingPointKey(ptKey);
                          setEditingPointData(pt);
                        }} className="text-slate-500 hover:text-amber-400 p-1 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => {
                          const newPts = [...robot.recordedPoints];
                          newPts.splice(i, 1);
                          updateRobot(robot.id, { recordedPoints: newPts });
                        }} className="text-slate-500 hover:text-rose-400 p-1 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {editingPointKey === ptKey ? (
                      <div className="flex flex-col gap-2 mt-1">
                        <div className="grid grid-cols-6 gap-2">
                          {['j1', 'j2', 'j3', 'j4', 'j5', 'j6'].map((jKey) => (
                            <div key={jKey} className="flex flex-col gap-1">
                              <label className="text-[9px] text-slate-500 uppercase">{jKey}</label>
                              <input 
                                type="number"
                                className="bg-slate-950 border border-slate-800 rounded px-1 py-1.5 text-[10px] font-mono text-slate-200 outline-none w-full focus:border-sky-500 transition-colors"
                                value={editingPointData[jKey as keyof typeof editingPointData] ?? 0}
                                onChange={(e) => setEditingPointData({ ...editingPointData, [jKey]: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                          ))}
                        </div>
                        {(pt.tx !== undefined || editingPointData.tx !== undefined) && (
                          <div className="grid grid-cols-6 gap-2">
                            <div className="flex flex-col gap-1 col-span-2">
                              <label className="text-[9px] text-slate-500 uppercase">TX</label>
                              <input 
                                type="number"
                                className="bg-slate-950 border border-slate-800 rounded px-1 py-1.5 text-[10px] font-mono text-slate-200 outline-none w-full focus:border-sky-500 transition-colors"
                                value={editingPointData.tx ?? 0}
                                onChange={(e) => setEditingPointData({ ...editingPointData, tx: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="flex flex-col gap-1 col-span-2">
                              <label className="text-[9px] text-slate-500 uppercase">TY</label>
                              <input 
                                type="number"
                                className="bg-slate-950 border border-slate-800 rounded px-1 py-1.5 text-[10px] font-mono text-slate-200 outline-none w-full focus:border-sky-500 transition-colors"
                                value={editingPointData.ty ?? 0}
                                onChange={(e) => setEditingPointData({ ...editingPointData, ty: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex justify-end gap-2 mt-2 border-t border-slate-800/50 pt-2">
                          <button onClick={() => setEditingPointKey(null)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors">
                            Cancel
                          </button>
                          <button onClick={() => {
                            const newPts = [...robot.recordedPoints];
                            // Locate the point by stable identity (ptKey), not by `i` - if the
                            // list was reordered/edited elsewhere while this form was open, `i`
                            // may no longer point at the same object. This is exactly what
                            // `i` still correctly resolves to inside a fresh render where this
                            // row matched editingPointKey, but re-deriving defensively here
                            // keeps Save correct even if that assumption ever changes.
                            const targetIndex = newPts.findIndex(p => pointKeyFor(p) === ptKey);
                            if (targetIndex === -1) { setEditingPointKey(null); return; }
                            const merged = { ...newPts[targetIndex], ...editingPointData };
                            // j1..j6 just changed above - re-derive x/y/z/a/b/c from the edited
                            // joints (via this robot's own FK) so they don't go stale and get
                            // preferred over the edit by PathVisualizer/playback (both read
                            // pt.x first when present - see robotKinematicsDispatch.ts).
                            const cart = jointsToCartesianForModel(robot.model, merged);
                            newPts[targetIndex] = { ...merged, x: cart.x, y: cart.y, z: cart.z, a: cart.a, b: cart.b, c: cart.c };
                            updateRobot(robot.id, { recordedPoints: newPts });
                            setEditingPointKey(null);
                          }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow-lg shadow-emerald-900/20 transition-colors">
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                );
                })}
                {robot.recordedPoints.length === 0 && (
                  <div className="text-center text-slate-500 py-4 text-sm">
                    No points recorded
                  </div>
                )}
              </div>
            </div>

            {/* Playback Progress Bar */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
              <div className="bg-slate-950 rounded-lg p-3 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] border border-slate-800 flex flex-col gap-2 relative overflow-hidden">
                <div className="flex justify-between items-end relative z-10">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('robot_detail.progress', 'Progress')}</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                    {robot.playbackState?.isFinished 
                      ? 100 
                      : (robot.recordedPoints.length > 0 
                        ? Math.round((Math.max(0, robot.playbackState?.activeStep || 0) / Math.max(1, robot.recordedPoints.length - 1)) * 100) 
                        : 0)}{'%'}
                  </span>
                </div>
                <div className="bg-slate-900/50 rounded-full h-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] overflow-hidden relative border border-slate-800 z-10">
                  <div 
                    className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.2)] transition-all duration-300 ease-out relative"
                    style={{ width: (robot.playbackState?.isFinished ? '100%' : (robot.recordedPoints.length > 0 ? `${(Math.max(0, robot.playbackState?.activeStep || 0) / Math.max(1, robot.recordedPoints.length - 1)) * 100}%` : '0%')) }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
