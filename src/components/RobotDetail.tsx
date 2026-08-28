// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: RobotDetail.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { useRef, useState, useEffect } from 'react';
import { RotaryKnob } from "./RotaryKnob";
import { FuturisticSlider } from "./FuturisticSlider";
import { motion, useDragControls } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { type RobotState, useHydraStore, type ToolType, type RobotModel, ROBOT_MANUFACTURERS, unthrottledDelay, globalPlaybacks } from '../store';
import { apiUrl } from '../lib/apiBase';
import { RotateCcw, Home, Video, AlertOctagon,  Power, Droplets, ArrowUp, ArrowDown, Save, Play, Square, Pause, Crosshair, RefreshCw, Maximize2, Minimize2, Camera as CameraIcon, Trash2, X, FolderOpen, Edit2, Repeat, Download } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { VirtualKinematics } from './VirtualKinematics';
import { Joystick3D } from './Joystick3D';
import { examples } from '../examples/kinematics';
import { parol6CartesianToJoints, PAROL6_JOINT_LIMITS_DEG, PAROL6_HOME_POSE } from '../examples/parol6Kinematics';
import { faze4CartesianToJoints, FAZE4_HOME_POSE } from '../examples/faze4Kinematics';
import { ar3CartesianToJoints, AR3_HOME_POSE } from '../examples/ar3Kinematics';
import { ar4CartesianToJoints, AR4_HOME_POSE, AR4_JOINT_LIMITS_DEG } from '../examples/ar4Kinematics';
import { ur3eCartesianToJoints, UR3E_HOME_POSE, UR3E_JOINT_LIMITS_DEG } from '../examples/ur3eKinematics';
import { ur5eCartesianToJoints, UR5E_HOME_POSE, UR5E_JOINT_LIMITS_DEG } from '../examples/ur5eKinematics';
import { ur10eCartesianToJoints, UR10E_HOME_POSE, UR10E_JOINT_LIMITS_DEG } from '../examples/ur10eKinematics';
import { ur16eCartesianToJoints, UR16E_HOME_POSE, UR16E_JOINT_LIMITS_DEG } from '../examples/ur16eKinematics';
import { ur20CartesianToJoints, UR20_HOME_POSE, UR20_JOINT_LIMITS_DEG } from '../examples/ur20Kinematics';
import { xarm6CartesianToJoints, XARM6_HOME_POSE, XARM6_JOINT_LIMITS_DEG } from '../examples/xarm6Kinematics';
import { lite6CartesianToJoints, LITE6_HOME_POSE, LITE6_JOINT_LIMITS_DEG } from '../examples/lite6Kinematics';
import { edoCartesianToJoints, EDO_HOME_POSE } from '../examples/edoKinematics';
import { gen3LiteCartesianToJoints, GEN3LITE_HOME_POSE, GEN3LITE_JOINT_LIMITS_DEG } from '../examples/gen3LiteKinematics';
import { m710icCartesianToJoints, M710IC_HOME_POSE } from '../examples/m710icKinematics';
import { soArm100CartesianToJoints, SOARM100_HOME_POSE } from '../examples/soArm100Kinematics';
import { gen2CartesianToJoints, GEN2_HOME_POSE, GEN2_JOINT_LIMITS_DEG } from '../examples/gen2Kinematics';
import { piperCartesianToJoints, PIPER_HOME_POSE, PIPER_JOINT_LIMITS_DEG } from '../examples/piperKinematics';
import { z1CartesianToJoints, Z1_HOME_POSE } from '../examples/z1Kinematics';
import { vx300sCartesianToJoints, VX300S_HOME_POSE } from '../examples/vx300sKinematics';
import { wx250sCartesianToJoints, WX250S_HOME_POSE } from '../examples/wx250sKinematics';
import { kochCartesianToJoints, KOCH_HOME_POSE } from '../examples/kochKinematics';
import { ur3ClassicCartesianToJoints, UR3CLASSIC_HOME_POSE } from '../examples/ur3ClassicKinematics';
import { ur5ClassicCartesianToJoints, UR5CLASSIC_HOME_POSE } from '../examples/ur5ClassicKinematics';
import { ur10ClassicCartesianToJoints, UR10CLASSIC_HOME_POSE } from '../examples/ur10ClassicKinematics';
import { convertToCartesian } from '../examples/utils';
import { jointsToCartesianForModel } from '../examples/robotKinematicsDispatch';

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

// Parol6/AR4/the real UR/xArm/Lite6/Gen3Lite/Gen2/PiPER rigs have real, narrower
// per-joint limits (from their own URDF/config) than the generic +/-180 range every
// other model uses - shared by the classic Joint Controls grid and the A1 floating
// overlay so both clamp jogging identically instead of duplicating this ternary chain.
function jointLimitsFor(model: RobotModel, j: 'j1' | 'j2' | 'j3' | 'j4' | 'j5' | 'j6'): [number, number] {
  if (model === 'Parol6 (6-DOF)') return PAROL6_JOINT_LIMITS_DEG[j];
  if (model === 'AR4 (6-DOF)') return AR4_JOINT_LIMITS_DEG[j];
  if (model === 'UR3e (6-DOF)') return UR3E_JOINT_LIMITS_DEG[j];
  if (model === 'UR5e (6-DOF)') return UR5E_JOINT_LIMITS_DEG[j];
  if (model === 'UR10e (6-DOF)') return UR10E_JOINT_LIMITS_DEG[j];
  if (model === 'UR16e (6-DOF)') return UR16E_JOINT_LIMITS_DEG[j];
  if (model === 'UR20 (6-DOF)') return UR20_JOINT_LIMITS_DEG[j];
  if (model === 'xArm6 (6-DOF)') return XARM6_JOINT_LIMITS_DEG[j];
  if (model === 'Lite 6 (6-DOF)') return LITE6_JOINT_LIMITS_DEG[j];
  if (model === 'Gen3 Lite (6-DOF)') return GEN3LITE_JOINT_LIMITS_DEG[j];
  if (model === 'Gen2 (6-DOF)') return GEN2_JOINT_LIMITS_DEG[j];
  if (model === 'PiPER (6-DOF)') return PIPER_JOINT_LIMITS_DEG[j];
  return [-180, 180];
}

// Parol6Arm.tsx/Faze4Arm.tsx/AR3Arm.tsx/AR4Arm.tsx are each driven by their own real
// URDF joint chain, not the shared 160mm/200mm planar convention the generic joints
// above were computed against - re-solve the resolved Cartesian target (x,y,z,a,b,c,
// itself a robot-agnostic workspace point regardless of which formula produced it)
// against that robot's own real kinematics instead, so recorded/played trajectories
// move it sensibly.
function resolveTargetJoints(
  model: RobotModel | undefined,
  x: number, y: number, z: number, a: number, b: number, c: number,
  genericJoints: { j1: number; j2: number; j3: number; j4: number; j5: number; j6: number }
) {
  if (model === 'Parol6 (6-DOF)') return parol6CartesianToJoints(x, y, z, a, b, c);
  if (model === 'AR4 (6-DOF)') return ar4CartesianToJoints(x, y, z, a, b, c);
  if (model === 'Faze4 (6-DOF)') return faze4CartesianToJoints(x, y, z, a, b, c);
  if (model === 'AR3 (6-DOF)') return ar3CartesianToJoints(x, y, z, a, b, c);
  if (model === 'UR3e (6-DOF)') return ur3eCartesianToJoints(x, y, z, a, b, c);
  if (model === 'UR5e (6-DOF)') return ur5eCartesianToJoints(x, y, z, a, b, c);
  if (model === 'UR10e (6-DOF)') return ur10eCartesianToJoints(x, y, z, a, b, c);
  if (model === 'UR16e (6-DOF)') return ur16eCartesianToJoints(x, y, z, a, b, c);
  if (model === 'UR20 (6-DOF)') return ur20CartesianToJoints(x, y, z, a, b, c);
  if (model === 'xArm6 (6-DOF)') return xarm6CartesianToJoints(x, y, z, a, b, c);
  if (model === 'Lite 6 (6-DOF)') return lite6CartesianToJoints(x, y, z, a, b, c);
  if (model === 'e.DO (6-DOF)') return edoCartesianToJoints(x, y, z, a, b, c);
  if (model === 'Gen3 Lite (6-DOF)') return gen3LiteCartesianToJoints(x, y, z, a, b, c);
  if (model === 'M-710iC (6-DOF)') return m710icCartesianToJoints(x, y, z, a, b, c);
  if (model === 'SO-ARM100 (5-DOF)') return soArm100CartesianToJoints(x, y, z, a, b, c);
  if (model === 'Gen2 (6-DOF)') return gen2CartesianToJoints(x, y, z, a, b, c);
  if (model === 'PiPER (6-DOF)') return piperCartesianToJoints(x, y, z, a, b, c);
  if (model === 'Z1 (6-DOF)') return z1CartesianToJoints(x, y, z, a, b, c);
  if (model === 'ViperX 300 (6-DOF)') return vx300sCartesianToJoints(x, y, z, a, b, c);
  if (model === 'WidowX 250 (6-DOF)') return wx250sCartesianToJoints(x, y, z, a, b, c);
  if (model === 'Koch v1.1 (5-DOF)') return kochCartesianToJoints(x, y, z, a, b, c);
  if (model === 'UR3 (6-DOF)') return ur3ClassicCartesianToJoints(x, y, z, a, b, c);
  if (model === 'UR5 (6-DOF)') return ur5ClassicCartesianToJoints(x, y, z, a, b, c);
  if (model === 'UR10 (6-DOF)') return ur10ClassicCartesianToJoints(x, y, z, a, b, c);
  return genericJoints;
}

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
 * Floating, draggable overlay holding just the XYZ jog Joystick3D - split
 * out of JointControlsOverlay into its own window (see that component's
 * own header comment for the full context/spec pointer).
 */
function JoystickOverlay({
  jogStep, onXYZJog, t,
}: {
  jogStep: number;
  onXYZJog: (dx: number, dy: number, dz: number) => void;
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
        <div className="p-3 flex justify-center">
          <Joystick3D onJog={onXYZJog} />
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
  const { updateRobot, sendRobotCommand, loadKinematics, settings, robots, updateSettings, authToken } = useHydraStore();
  const robotsRef = useRef(robots);
  useEffect(() => { robotsRef.current = robots; }, [robots]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadWorkFileRef = useRef<HTMLInputElement>(null);
  const [jogStep, setJogStep] = useState<number>(1);
  const [selectedExample, setSelectedExample] = useState<string>(robot.selectedExample || '');
  useEffect(() => { setSelectedExample(robot.selectedExample || ''); }, [robot.id]);
  const [workFiles, setWorkFiles] = useState<string[]>([]);
  const [selectedWorkFile, setSelectedWorkFile] = useState<string>(robot.selectedWorkFile || '');
  useEffect(() => { setSelectedWorkFile(robot.selectedWorkFile || ''); }, [robot.id]);
  const [editingPointKey, setEditingPointKey] = useState<number | null>(null);
  const [editingPointData, setEditingPointData] = useState<any>({});

  // Guards against an out-of-order response: fetchWorks() is called both from
  // the effect below (whenever worksFolderPath changes) and manually after
  // save/upload - nothing stopped an OLDER in-flight request from resolving
  // AFTER a newer one and overwriting workFiles with stale data. Bumping this
  // ref on every call and checking it's still the latest call before each
  // setState turns a superseded response into a no-op instead of a race.
  const worksFetchIdRef = useRef(0);
  const fetchWorks = async () => {
    const fetchId = ++worksFetchIdRef.current;
    try {
      const folderPath = settings.worksPaths?.[robot.id] || `WORKS/${robot.name.replace(/\s+/g, '')}`;
      const res = await fetch(apiUrl(`/${folderPath}/index.json`));
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
  };

  // Depends on the resolved PATH STRING for this one robot, not the whole
  // settings.worksPaths object - that object is a fresh reference every
  // time ANY setting anywhere changes (see store.tsx's own applyServerData,
  // which used to make this worse by reshaping settings on every WebSocket
  // broadcast), so depending on it directly re-ran this real network fetch
  // (GET /${folderPath}/index.json) on every single jog tick from ANY
  // connected client the instant a robot panel was open - the concrete
  // mechanism behind this panel specifically (not other module panels,
  // which have no such fetch) being far slower than everything else in
  // the app. A plain string only changes reference (and re-triggers this
  // effect) when this robot's OWN folder path value actually changes.
  const worksFolderPath = settings.worksPaths?.[robot.id] || `WORKS/${robot.name.replace(/\s+/g, '')}`;
  useEffect(() => {
    fetchWorks();
  }, [worksFolderPath]);

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
        const points = await res.json();
        updateRobot(robot.id, { selectedWorkFile: fileName, recordedPoints: points });
      } else {
        updateRobot(robot.id, { selectedWorkFile: fileName });
      }
    } catch (e) {
      console.error(e);
      updateRobot(robot.id, { selectedWorkFile: fileName });
    }
  };

  const loadExample = (id: string) => {
console.log("Loading example:", id);
    setSelectedExample(id);
    const ex = examples.find(e => e.id === id);
    if (ex) {
      console.log("Updating robot with example points", ex.points.length);
      if (ex && ex.points) {
        updateRobot(robot.id, { selectedExample: id, recordedPoints: ex.points.map(withCartesian) });
      } else {
        updateRobot(robot.id, { selectedExample: id });
      }
    } else {
      updateRobot(robot.id, { selectedExample: id });
    }

  };

  const loadExampleForRobot = (botId: number, exId: string) => {
    const ex = examples.find(e => e.id === exId);
    if (ex) {
      updateRobot(botId, { recordedPoints: ex.points.map(withCartesian) });
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
    globalPlaybacks[robot.id] = true;
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
    const playRobotTrajectory = async (rId: number, points: any[]) => {
      let isLooping = true;
      while (isLooping && globalPlaybacks[rId]) {
        let currentStep = 0;
        
        // Determine initial state
        const initialRState = rId === robot.id ? robot : combinedBotsInfo.find(b => b.id === rId);
        let currentPos = { ...(initialRState?.pos || { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 }) };
        let currentJoints = { ...(initialRState?.joints || { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 }) };

        while (currentStep < points.length) {
          if (!globalPlaybacks[rId]) break; while(playbackPausedRef.current) { if (!globalPlaybacks[rId]) break; await unthrottledDelay(); } if (!globalPlaybacks[rId]) break;
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

        const targetJoints = resolveTargetJoints(
          initialRState?.model,
          x || 0, y || 0, z || 0, a || 0, b || 0, c || 0,
          { j1: j1||0, j2: j2||0, j3: j3||0, j4: j4||0, j5: j5||0, j6: j6||0 }
        );

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
        let t = 0;
        // Real elapsed time per tick instead of assuming unthrottledDelay()'s
        // requested 16ms always elapses exactly - setTimeout only guarantees
        // "at least" that long, and can run well over it under GC pauses, a
        // busy main thread, or a backgrounded/throttled tab. null on the
        // first tick of each move (and right after a pause) falls back to
        // the old fixed 16ms rather than a near-zero measured delta, and a
        // clamp keeps a single abnormally long tick (e.g. regaining focus
        // after being backgrounded) from jumping the arm most of the way to
        // its target in one frame.
        let lastTickAt: number | null = null;

        while (t < 1) {
          if (!globalPlaybacks[rId]) break;
          while(playbackPausedRef.current) {
              if (!globalPlaybacks[rId]) break;
              lastTickAt = null; // don't let paused time count as movement once resumed
              await unthrottledDelay();
          }
          if (!globalPlaybacks[rId]) break;

          const now = performance.now();
          const dtMs = lastTickAt === null ? 16 : Math.min(now - lastTickAt, 250);
          lastTickAt = now;

          const rState = robotsRef.current.find(r => r.id === rId);
          // Acceleration control - we'd always had a speed control here but
          // never one for acceleration (project owner). Trapezoidal-ish
          // velocity envelope over the move's own progress `t`: ramps from 0
          // up to full velocity over the first rampFraction of the move,
          // cruises, then ramps back down over the last rampFraction - a
          // real speed-vs-time shape, not just a label on the same constant-
          // velocity motion as before. Lower acceleration% -> longer ramp
          // (gentler, more visible acceleration/deceleration); higher -> a
          // near-instant ramp (closest to the old constant-velocity feel).
          // Default (100%) keeps a small, mostly-unnoticeable ramp so
          // existing recordings/robots that never touch this control still
          // look close to how they did before this feature existed.
          const accelPercent = rState?.playbackState?.acceleration || 100;
          const rampFraction = Math.min(0.45, Math.max(0.02, 0.15 * (100 / accelPercent)));
          const accelEnvelope = t < rampFraction ? (t / rampFraction)
            : t > 1 - rampFraction ? ((1 - t) / rampFraction)
            : 1;
          const currentVelocity = baseVelocity * ((rState?.playbackState?.speed || 100) / 100) * Math.max(0.05, accelEnvelope);
          const distancePerTick = currentVelocity * (dtMs / 1000);
          
          let tStep = distancePerTick / effectiveDist;
          if (effectiveDist < 0.001) tStep = 1;
          
          t += tStep;
          if (t > 1) t = 1;

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
              // Defensive fallback, same as VirtualKinematics.tsx's own
              // tableW/tableL/px/py - a partial xyTable (missing .pos)
              // reached this component for real once, see that file's own
              // comment for the full root cause.
              pos: { x: interpPos.tx ?? initialRState.xyTable!.pos?.x ?? 0, y: interpPos.ty ?? initialRState.xyTable!.pos?.y ?? 0 }
            }
          } : {};

          updateRobot(rId, { 
            pos: interpPos as any, 
            joints: interpJoints, 
            playbackState: { ...(robotsRef.current.find(r => r.id === rId)?.playbackState || {}), isPlaying: true, activeStep: currentStep, speed: robotsRef.current.find(r => r.id === rId)?.playbackState?.speed || 100, isFinished: false }, 
            ...xyUpdate 
          });
          
          await unthrottledDelay();
        }
        
        currentPos = { ...targetPos } as any;
        currentJoints = { ...targetJoints };

        if (!globalPlaybacks[rId]) break; while(playbackPausedRef.current) { if (!globalPlaybacks[rId]) break; await unthrottledDelay(); } if (!globalPlaybacks[rId]) break;
        currentStep++;
      }
      
      if (!globalPlaybacks[rId]) break;
      const latestState = robotsRef.current.find((r: any) => r.id === rId);
      isLooping = latestState?.playbackState?.isLooping ?? false;
      
      if (isLooping) {
        updateRobot(rId, { playbackState: { ...(latestState?.playbackState || {}), isPlaying: true, activeStep: 0, speed: latestState?.playbackState?.speed || 100, isFinished: false, isLooping: true } });
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    const finalState = robotsRef.current.find((r: any) => r.id === rId); updateRobot(rId, { playbackState: { ...(finalState?.playbackState || {}), isPlaying: false, activeStep: -1, speed: finalState?.playbackState?.speed || 100, isFinished: true, isLooping: finalState?.playbackState?.isLooping } });
  };
    playRobotTrajectory(robot.id, robot.recordedPoints);
    if (playAll) {
      combinedBotsInfo.forEach(bot => {
        if (bot.recordedPoints.length > 0) {
          const otherBotState = robotsRef.current.find(r => r.id === bot.id);
          updateRobot(bot.id, { playbackState: { ...(otherBotState?.playbackState || {}), isPlaying: true, activeStep: 0, speed: otherBotState?.playbackState?.speed || 100, isFinished: false } });
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

  useEffect(() => {
    if (robot.playbackState?.speed !== undefined && robot.playbackState.speed !== playbackSpeed) {
      setPlaybackSpeed(robot.playbackState.speed);
    }
  }, [robot.playbackState?.speed, robot.id]);

  useEffect(() => {
    if (robot.playbackState?.acceleration !== undefined && robot.playbackState.acceleration !== playbackAcceleration) {
      setPlaybackAcceleration(robot.playbackState.acceleration);
    }
  }, [robot.playbackState?.acceleration, robot.id]);

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


  useEffect(() => {
    if (robot.playbackState?.isPlaying && !globalPlaybacks[robot.id]) {
      // Started from outside
      handlePlay((robot.combinedWith?.length || 0) > 0);
    } else if (!robot.playbackState?.isPlaying && globalPlaybacks[robot.id]) {
      handleStop();
    }
  }, [robot.playbackState?.isPlaying]);

  useEffect(() => {
    if (robot.playbackState?.isPlaying && robot.playbackState?.activeStep !== null && robot.playbackState?.activeStep !== -1) {
      const el = document.getElementById(`step-${robot.id}-${robot.playbackState?.activeStep}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [robot.playbackState?.activeStep, robot.playbackState?.isPlaying, robot.id]);

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
      { axis: 'x', amount: dx * jogStep, value: x },
      { axis: 'y', amount: dy * jogStep, value: y },
      { axis: 'z', amount: dz * jogStep, value: z },
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

      <div className="flex-1 flex overflow-hidden pt-2 px-2 pb-0 gap-2">
        {/* Left Panel: 3D View */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div 
            className={cn("relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col group shrink-0", viewportOnly ? "flex-1" : "min-h-[200px]")}
            style={!viewportOnly ? { flex: threeDHeight ? `0 0 ${threeDHeight}px` : '1 1 0%' } : {}}
          >
            <VirtualKinematics key={reset3DKey} robot={robot} controlMode={controlMode} onSelectRobot={onNavigateToRobot} />

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
              <JoystickOverlay jogStep={jogStep} onXYZJog={handleXYZJog} t={t} />
            )}

            {isFloatingLayout && !viewportOnly && hasXYTable && (
              <XYTableOverlay
                robot={robot}
                jogStep={jogStep}
                onAxisChange={(axis, val) => updateRobot(robot.id, {
                  pos: { ...robot.pos, [axis]: val },
                  xyTable: robot.xyTable ? { ...robot.xyTable, pos: { ...robot.xyTable.pos, [axis === 'tx' ? 'x' : 'y']: val } } : robot.xyTable,
                })}
                t={t}
              />
            )}

            {/* Closed Camera Icons (Bottom Right) - only for a bot whose
                camera is actually enabled, matching the PIP's own gating
                just below: reopening a PIP for a disabled camera would just
                do nothing, so don't offer a dead "Show Camera" button for
                it. */}
            <div className="absolute bottom-4 right-4 z-50 flex gap-2 pointer-events-auto">
              {[robot, ...combinedBotsInfo].filter(bot => bot.visionEnabled).map(bot => {
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
            {robot.online && robot.visionEnabled && (
              <CameraPIP
                bot={robot}
                initialX={0}
                initialY={0}
                label={robot.name}
                t={t}
              />
            )}
            {combinedBotsInfo.map((bot, index) => (bot.online && bot.visionEnabled) ? (
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
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(34,197,94,0.6)] border border-green-400"
              >
                <Play size={16} /> {isStartAll ? t('robot_detail.start_all', 'START ALL') : t('robot_detail.start', 'START')}
              </button>
            ) : (
              <button 
                onClick={handleStop}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-red-600 hover:bg-red-500 text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(220,38,38,0.6)] border border-red-500"
              >
                <Square size={16} /> {isStartAll ? t('robot_detail.stop_all', 'STOP ALL') : t('robot_detail.stop', 'STOP')}
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
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${robot.playbackState?.isPaused ? 'bg-blue-500 hover:bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)] border-blue-400' : 'bg-amber-500 hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)] border-amber-400'}`}
            >
              {robot.playbackState?.isPaused ? (
                <><Play size={16} /> {t('robot_detail.continue', 'CONTINUE')}</>
              ) : (
                <><Pause size={16} /> {isStartAll ? t('robot_detail.pause_all', 'PAUSE ALL') : t('robot_detail.pause', 'PAUSE')}</>
              )}
            </button>

            {/* HOME Button */}
            <button
              onClick={() => updateRobot(robot.id, { pos: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 }, joints: homePoseFor(robot.model) })}
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
                                      joints: homePoseFor(robot.model)
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
                "flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all border",
                robot.playbackState?.isLooping
                  ? "bg-fuchsia-700 border-fuchsia-400 shadow-[inset_0_4px_8px_rgba(0,0,0,0.8),0_0_10px_rgba(217,70,239,0.5)] translate-y-[2px]"
                  : "bg-fuchsia-500 hover:bg-fuchsia-400 border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.5)] hover:-translate-y-[1px]"
              )}
            >
              <Repeat size={16} className={cn(robot.playbackState?.isLooping && "animate-spin-slow")} /> {t('robot_detail.repeat', 'Repeat')}
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
                          onChange={val => {
                            updateRobot(robot.id, {
                              pos: { ...robot.pos, [axis]: val },
                              xyTable: robot.xyTable ? { ...robot.xyTable, pos: { ...robot.xyTable.pos, [axis === 'tx' ? 'x' : 'y']: val } } : robot.xyTable
                            });
                          }}
                          size={44}
                          step={jogStep}
                        />
                        <FuturisticSlider
                          min={0}
                          max={maxVal}
                          value={robot.pos[axis] || 0}
                          onChange={val => {
                            updateRobot(robot.id, {
                              pos: { ...robot.pos, [axis]: val },
                              xyTable: robot.xyTable ? { ...robot.xyTable, pos: { ...robot.xyTable.pos, [axis === 'tx' ? 'x' : 'y']: val } } : robot.xyTable
                            });
                          }}
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
