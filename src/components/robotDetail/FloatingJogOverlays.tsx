// =============================================================================
// HYDRA-UMC STUDIO - Floating jog windows: FloatingJogOverlays.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The draggable jog windows shown over the 3D viewport of the robot detail
// screen (joints, XYZ with the base rotation, and the XY table).
// =============================================================================

import { useState } from 'react';
import { motion, useDragControls } from 'motion/react';
import { RotateCcw, RotateCw } from 'lucide-react';
import { RotaryKnob } from '../RotaryKnob';
import { FuturisticSlider } from '../FuturisticSlider';
import { Joystick3D } from '../Joystick3D';
import { jointLimitsFor } from '../../examples/robotKinematicsDispatch';
import type { RobotState } from '../../store';

/** Step sizes offered by every jog control (joints, XYZ, XY table) - same list the classic (non-floating) Step combobox always used. */
export const JOG_STEP_OPTIONS = [0.1, 1, 5, 10, 22.5, 25, 45, 50, 90, 100];

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
export function JointControlsOverlay({
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
          {collapsed ? 'â–¸' : 'â–¾'}
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
            <RotaryKnob min={10} max={500} value={playbackSpeed} onChange={onSpeedChange} size={28} step={5} />
            <div className="flex-1"><FuturisticSlider min={10} max={500} value={playbackSpeed} onChange={onSpeedChange} step={5} /></div>
            <span className="text-[9px] font-mono text-sky-400 w-8 text-right shrink-0">{playbackSpeed}%</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 px-2 py-1.5 rounded-lg border border-slate-800">
            <span className="text-[9px] text-slate-400 font-bold uppercase w-14 shrink-0">{t('robot_detail.acceleration', 'Acceleration:')}</span>
            <RotaryKnob min={10} max={500} value={playbackAcceleration} onChange={onAccelerationChange} size={28} step={5} />
            <div className="flex-1"><FuturisticSlider min={10} max={500} value={playbackAcceleration} onChange={onAccelerationChange} step={5} /></div>
            <span className="text-[9px] font-mono text-amber-400 w-8 text-right shrink-0">{playbackAcceleration}%</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const).map(j => {
              const [jMin, jMax] = jointLimitsFor(robot.model, j);
              return (
                <div key={j} className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{j}</span>
                    <span className="text-[9px] font-mono text-sky-400">{robot.joints[j]?.toFixed(1)}Â°</span>
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
export function JoystickOverlay({
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
          {collapsed ? 'â–¸' : 'â–¾'}
        </button>
      </div>
      {!collapsed && (
        <div className="p-3 flex flex-col items-center gap-2">
          <Joystick3D onJog={onXYZJog} />
          <div className="flex items-center gap-2 w-full pt-2 border-t border-slate-800">
            <button
              onClick={() => onJ1Jog(-1)}
              disabled={j1Value <= j1Min}
              title={t('robot_detail.base_rotate_ccw', 'Rotate base counter-clockwise')} aria-label={t('robot_detail.base_rotate_ccw', 'Rotate base counter-clockwise')}
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800 rounded-lg py-1.5 text-slate-300 transition-colors"
            >
              <RotateCcw size={14} />
            </button>
            <span className="text-[9px] font-mono text-sky-400 shrink-0 w-14 text-center" title={t('robot_detail.base_rotation', 'Base (J1)')}>
              J1 {j1Value.toFixed(1)}Â°
            </span>
            <button
              onClick={() => onJ1Jog(1)}
              disabled={j1Value >= j1Max}
              title={t('robot_detail.base_rotate_cw', 'Rotate base clockwise')} aria-label={t('robot_detail.base_rotate_cw', 'Rotate base clockwise')}
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
export function XYTableOverlay({
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
          {collapsed ? 'â–¸' : 'â–¾'}
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
