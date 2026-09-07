// =============================================================================
// HYDRA-UMC STUDIO - React Component: GamepadController.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { useEffect, useRef } from 'react';
import { useHydraStore } from '../store';
import { jointsToCartesianForModel, jointLimitsFor, resolveTargetJoints } from '../examples/robotKinematicsDispatch';

// Cartesian step per held frame, mm - same magnitude as this file's own
// table jog step just below (TX+/TX-/TY+/TY-, also 2mm/frame). Unlike
// RobotDetail.tsx's floating Joystick3D overlay (which reads a
// user-selectable jogStep), a gamepad button has no per-session step
// selector of its own here, so a single fixed real-world value is the
// honest choice rather than inventing a second step control nothing else
// surfaces.
const CARTESIAN_JOG_STEP_MM = 2;

// One real (dx, dy, dz) direction per cartesian action - the 6 single-axis
// moves plus the 4 diagonal XY moves Joystick3D's own corner D-pad buttons
// already make (ArrowUpLeft/UpRight/DownLeft/DownRight - one real jog with
// both dx and dy non-zero at once), added because a gamepad button should
// be able to match that same widget's own layout.
const CARTESIAN_JOG_DELTAS: Record<string, [dx: number, dy: number, dz: number]> = {
  'X+': [1, 0, 0], 'X-': [-1, 0, 0],
  'Y+': [0, 1, 0], 'Y-': [0, -1, 0],
  'Z+': [0, 0, 1], 'Z-': [0, 0, -1],
  'XY++': [1, 1, 0], 'XY+-': [1, -1, 0], 'XY-+': [-1, 1, 0], 'XY--': [-1, -1, 0],
};

const JOINT_KEYS = ['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const;
type JointKey = (typeof JOINT_KEYS)[number];

/**
 * Reads a physical gamepad (navigator.getGamepads(), polled once per
 * animation frame) and maps its buttons/axes to real robot actions via
 * settings.gamepadMapping.
 *
 * Real-time actions (joint/table jog, E-STOP, START/STOP, speed) fire the
 * atomic sendRobotCommand()/POST /api/robot/:id/command path - the SAME
 * one RobotDetail.tsx's own jog buttons/E-STOP/play/pause use - instead
 * of updateRobot()'s 500ms-debounced full-tree POST /api/settings. A held
 * gamepad joystick is inherently low-latency input; routing it through a
 * half-second-delayed save made every other connected client (and this
 * one's own optimistic UI) lag a held stick by up to 500ms, on top of
 * paying that debounce's full-tree serialization cost on every single
 * frame the stick was held (see store.tsx's own sendRobotCommand comment
 * for why that full-tree cost is real, not theoretical). ADD POINT stays
 * on updateRobot() below - recording a point is not a real-time action,
 * and its shape (a full RecordedPoint object) has no atomic command of
 * its own on the server.
 */
export function GamepadController() {
  const { settings, activeController, updateRobot, sendRobotCommand } = useHydraStore();
  const requestRef = useRef<number>(0);
  const lastState = useRef<Record<string, boolean>>({});
  const selectedRobotIdRef = useRef<number>(1);
  const settingsRef = useRef(settings);
  const activeControllerRef = useRef(activeController);
  const updateRobotRef = useRef(updateRobot);
  const sendRobotCommandRef = useRef(sendRobotCommand);

  useEffect(() => {
    settingsRef.current = settings;
    activeControllerRef.current = activeController;
    updateRobotRef.current = updateRobot;
    sendRobotCommandRef.current = sendRobotCommand;
  }, [settings, activeController, updateRobot, sendRobotCommand]);

  useEffect(() => {
    if (!settings.gamepadEnabled) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const poll = () => {
      const gamepads = navigator.getGamepads();
      const gp = gamepads.find(g => g !== null);

      if (gp && settingsRef.current.gamepadMapping) {
        const mapping = settingsRef.current.gamepadMapping;
        const currentState: Record<string, boolean> = {};

        gp.buttons.forEach((b, i) => { currentState[`B${i}`] = b.pressed; });
        const DEADZONE = 0.2;
        gp.axes.forEach((val, i) => {
          currentState[`AXIS_${i}_NEG`] = val < -DEADZONE;
          currentState[`AXIS_${i}_POS`] = val > DEADZONE;
        });

        for (const [input, isPressed] of Object.entries(currentState)) {
          const action = mapping[input];
          if (!action) continue;

          const wasPressed = lastState.current[input] || false;
          const justPressed = isPressed && !wasPressed;

          if (isPressed) {
            const currentRobot = activeControllerRef.current.robots.find(r => r.id === selectedRobotIdRef.current);
            if (!currentRobot) continue;

            if (CARTESIAN_JOG_DELTAS[action]) {
              // Cartesian XYZ jog (single-axis or diagonal) - mirrors
              // RobotDetail.tsx's own handleXYZJog exactly: forward
              // kinematics to find the current tool point, apply the real
              // combined delta (both dx and dy at once for a diagonal, not
              // two independent single-axis solves), resolveTargetJoints
              // ONCE for this model's own real inverse kinematics against
              // that true target, then one real command per non-zero axis
              // - all carrying that SAME resolved `joints` override, same
              // as handleXYZJog's own per-axis send loop - so a
              // gamepad-driven move lands on the identical per-model IK
              // solution the floating Joystick3D overlay would produce for
              // the same button, not a second, possibly-diverging formula.
              const [dx, dy, dz] = CARTESIAN_JOG_DELTAS[action];
              const cart = jointsToCartesianForModel(currentRobot.model, currentRobot.joints);
              const x = cart.x + dx * CARTESIAN_JOG_STEP_MM;
              const y = cart.y + dy * CARTESIAN_JOG_STEP_MM;
              const z = cart.z + dz * CARTESIAN_JOG_STEP_MM;
              const newJoints = resolveTargetJoints(currentRobot.model, x, y, z, cart.a, cart.b, cart.c, currentRobot.joints);
              const axes: { axis: 'x' | 'y' | 'z'; amount: number; value: number }[] = [
                { axis: 'x' as const, amount: dx * CARTESIAN_JOG_STEP_MM, value: x },
                { axis: 'y' as const, amount: dy * CARTESIAN_JOG_STEP_MM, value: y },
                { axis: 'z' as const, amount: dz * CARTESIAN_JOG_STEP_MM, value: z },
              ].filter((a) => a.amount !== 0);
              for (const a of axes) {
                sendRobotCommandRef.current(
                  currentRobot.id,
                  'jog',
                  { axis: a.axis, amount: a.amount, target: 'robot', joints: newJoints },
                  (r) => ({ pos: { ...r.pos, [a.axis]: a.value, a: cart.a, b: cart.b, c: cart.c }, joints: newJoints })
                );
              }
            } else if (action === 'ROT+' || action === 'ROT-') {
              // Base rotation (J1) - the exact same real move as
              // RobotDetail.tsx's own handleJ1Jog, the 2 dedicated buttons
              // that sit right next to Joystick3D in that same floating
              // overlay. Listed as its own action (not only reachable via
              // J1+/J1- below) so a gamepad mapping can group it with the
              // cartesian moves the same way that widget's own layout
              // does - identical outcome to J1+/J1- either way.
              const isPos = action === 'ROT+';
              const step = isPos ? 1.5 : -1.5;
              const [jMin, jMax] = jointLimitsFor(currentRobot.model, 'j1');
              const currentVal = currentRobot.joints.j1 || 0;
              const newVal = Math.min(jMax, Math.max(jMin, currentVal + step));
              if (newVal !== currentVal) {
                const newJoints = { ...currentRobot.joints, j1: newVal };
                const newCart = jointsToCartesianForModel(currentRobot.model, newJoints);
                sendRobotCommandRef.current(
                  currentRobot.id,
                  'jog',
                  { axis: 'x', amount: 0, target: 'robot', joints: newJoints },
                  () => ({
                    pos: { ...currentRobot.pos, x: newCart.x, y: newCart.y, z: newCart.z, a: newCart.a, b: newCart.b, c: newCart.c },
                    joints: newJoints,
                  })
                );
              }
            } else if (action.startsWith('J')) {
              // Action format: J1+, J1- ... J6+, J6-. Fires the atomic
              // 'jog' command with a client-resolved `joints` override -
              // exactly the mechanism RobotDetail.tsx's own handleJ1Jog
              // uses (see that function's own comment on why: the server's
              // generic calculateJoints() doesn't know this model's real
              // per-model kinematics chain). Clamped to this model's real
              // joint limits via the shared jointLimitsFor(), same as
              // every other jog surface - a held gamepad button can't walk
              // a joint past what the real robot could ever reach.
              const jointKey = action.substring(0, 2).toLowerCase() as JointKey;
              if (!JOINT_KEYS.includes(jointKey)) continue;
              const isPos = action.endsWith('+');
              const step = isPos ? 1.5 : -1.5;
              const [jMin, jMax] = jointLimitsFor(currentRobot.model, jointKey);
              const currentVal = (currentRobot.joints as any)[jointKey] || 0;
              const newVal = Math.min(jMax, Math.max(jMin, currentVal + step));
              if (newVal === currentVal) continue; // already at a real limit - no-op, not a clamped-but-sent command

              const newJoints = { ...currentRobot.joints, [jointKey]: newVal };
              const newCart = jointsToCartesianForModel(currentRobot.model, newJoints);
              sendRobotCommandRef.current(
                currentRobot.id,
                'jog',
                { axis: 'x', amount: 0, target: 'robot', joints: newJoints },
                () => ({
                  pos: { ...currentRobot.pos, x: newCart.x, y: newCart.y, z: newCart.z, a: newCart.a, b: newCart.b, c: newCart.c },
                  joints: newJoints,
                })
              );
            } else if (action.startsWith('T')) {
              // Action format: TX+, TY-. Fires the atomic 'jog' command
              // with target:'xytable' - the real server-side branch
              // (server.ts's own jog case) that updates robot.xyTable.pos,
              // rather than robot.pos directly (target:'robot' only
              // accepts the real ROBOT_AXES set - x/y/z/a/b/c - 'tx'/'ty'
              // are this project's own pos-mirror keys, not real server
              // axis names). pos.tx/ty is still mutated locally alongside
              // xyTable.pos so ADD POINT's own pos.tx/ty snapshot (below)
              // stays consistent, same dual-field shape
              // RobotDetail.tsx's XYTableOverlay onAxisChange already uses.
              if (!currentRobot.hasXYTable || !currentRobot.xyTable) continue;
              const axisStr = action.substring(0, 2).toLowerCase(); // "tx" or "ty"
              const tableAxis = axisStr === 'tx' ? 'x' : 'y';
              const isPos = action.endsWith('+');
              const step = isPos ? 2 : -2;
              const xyTable = currentRobot.xyTable;
              const newTableVal = ((xyTable.pos as any)[tableAxis] || 0) + step;

              sendRobotCommandRef.current(
                currentRobot.id,
                'jog',
                { axis: tableAxis, amount: step, target: 'xytable' },
                () => ({
                  pos: { ...currentRobot.pos, [axisStr]: newTableVal },
                  xyTable: { ...xyTable, pos: { ...xyTable.pos, [tableAxis]: newTableVal } },
                })
              );
            } else if (action.startsWith('SPEED')) {
              // SPEED+, SPEED- - mirrors RobotDetail.tsx's own speed
              // slider (sendRobotCommand(id, 'speed', ...)), not the
              // playback-loop-local speed the removed local player used.
              const isPos = action.endsWith('+');
              const pb = currentRobot.playbackState || { isPlaying: false, activeStep: -1, speed: 100 };
              const currentSpeed = pb.speed || 100;
              let newSpeed = isPos ? currentSpeed + 1 : currentSpeed - 1;
              if (newSpeed < 1) newSpeed = 1;
              if (newSpeed > 200) newSpeed = 200;
              if (newSpeed === currentSpeed) continue;
              sendRobotCommandRef.current(
                currentRobot.id,
                'speed',
                { speed: newSpeed },
                (r) => ({ playbackState: { ...(r.playbackState || {}), speed: newSpeed } })
              );
            }
          }

          if (justPressed) {
            const currentRobot = activeControllerRef.current.robots.find(r => r.id === selectedRobotIdRef.current);

            if (action.startsWith('select_robot_')) {
              const id = parseInt(action.replace('select_robot_', ''));
              selectedRobotIdRef.current = id;
            } else if (action === 'E-STOP') {
              // Mirrors RobotDetail.tsx's own E-STOP button: the atomic
              // 'stop' command (server-side fans out to combinedWith on
              // its own via affectedIds) plus updateRobot({online:false})
              // for this robot - see store.tsx's own sendRobotCommand
              // comment for why 'stop' needs the atomic path (instant,
              // no 500ms debounce) while online:false, a rarer/non-
              // real-time flag, stays on the plain settings path.
              if (currentRobot) {
                sendRobotCommandRef.current(
                  currentRobot.id,
                  'stop',
                  undefined,
                  (r) => ({ playbackState: { ...(r.playbackState || {}), isPlaying: false, activeStep: -1, isPaused: false, paused: false, isFinished: false } }),
                  [currentRobot.id, ...(currentRobot.combinedWith || [])]
                );
                updateRobotRef.current(currentRobot.id, { online: false });
              }
            } else if (action === 'E-STOP ALL') {
              activeControllerRef.current.robots.forEach(r => {
                sendRobotCommandRef.current(
                  r.id,
                  'stop',
                  undefined,
                  (robot) => ({ playbackState: { ...(robot.playbackState || {}), isPlaying: false, activeStep: -1, isPaused: false, paused: false, isFinished: false } }),
                  [r.id, ...(r.combinedWith || [])]
                );
                updateRobotRef.current(r.id, { online: false });
              });
            } else if (action === 'START') {
              if (currentRobot && currentRobot.recordedPoints.length > 0) {
                sendRobotCommandRef.current(
                  currentRobot.id,
                  'play',
                  undefined,
                  (r) => ({ playbackState: { ...(r.playbackState || {}), isPlaying: true, activeStep: 0, isPaused: false, paused: false, isFinished: false } })
                );
              }
            } else if (action === 'START ALL') {
              activeControllerRef.current.robots.forEach(r => {
                if (r.recordedPoints.length === 0) return;
                sendRobotCommandRef.current(
                  r.id,
                  'play',
                  undefined,
                  (robot) => ({ playbackState: { ...(robot.playbackState || {}), isPlaying: true, activeStep: 0, isPaused: false, paused: false, isFinished: false } })
                );
              });
            } else if (action === 'STOP') {
              if (currentRobot) {
                sendRobotCommandRef.current(
                  currentRobot.id,
                  'stop',
                  undefined,
                  (r) => ({ playbackState: { ...(r.playbackState || {}), isPlaying: false, activeStep: -1, isPaused: false, paused: false, isFinished: false } }),
                  [currentRobot.id, ...(currentRobot.combinedWith || [])]
                );
              }
            } else if (action === 'STOP ALL') {
              activeControllerRef.current.robots.forEach(r => {
                sendRobotCommandRef.current(
                  r.id,
                  'stop',
                  undefined,
                  (robot) => ({ playbackState: { ...(robot.playbackState || {}), isPlaying: false, activeStep: -1, isPaused: false, paused: false, isFinished: false } }),
                  [r.id, ...(r.combinedWith || [])]
                );
              });
            } else if (action === 'ADD POINT') {
              // Not a real-time action - a recorded point is a full
              // object with no atomic command of its own on the server,
              // so this stays on the plain debounced settings path like
              // every other point-list edit (delete/rename/reorder).
              if (currentRobot) {
                const newPoint = {
                  id: Date.now().toString(),
                  name: `P${currentRobot.recordedPoints.length + 1}`,
                  x: currentRobot.pos.x,
                  y: currentRobot.pos.y,
                  z: currentRobot.pos.z,
                  a: currentRobot.pos.a,
                  b: currentRobot.pos.b,
                  c: currentRobot.pos.c,
                  tx: currentRobot.pos.tx,
                  ty: currentRobot.pos.ty,
                  trz: currentRobot.pos.trz,
                  j1: currentRobot.joints.j1,
                  j2: currentRobot.joints.j2,
                  j3: currentRobot.joints.j3,
                  j4: currentRobot.joints.j4,
                  j5: currentRobot.joints.j5,
                  j6: currentRobot.joints.j6,
                  speed: (currentRobot.playbackState?.speed || 100)
                };
                updateRobotRef.current(currentRobot.id, {
                  // @ts-ignore
                  recordedPoints: [...currentRobot.recordedPoints, newPoint]
                });
              }
            }
          }
        }

        lastState.current = currentState;
      }

      requestRef.current = requestAnimationFrame(poll);
    };

    requestRef.current = requestAnimationFrame(poll);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [settings.gamepadEnabled]);

  return null;
}
