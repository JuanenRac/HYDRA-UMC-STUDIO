// =============================================================================
// HYDRA-UMC STUDIO - React Component: GamepadController.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import { jointsToCartesianForModel, jointLimitsFor, resolveTargetJoints } from '../examples/robotKinematicsDispatch';
import { guardJogStep } from '../lib/motionGuard';
import { createInFlightCounter } from '../lib/inputThrottle';
import { getSelectedRobotId, setSelectedRobotId } from '../lib/selectedRobot';
import { claimsSnapshot } from '../lib/claimsFeed';
import { claimStanding, decodeJwtUsername } from '../lib/claims';
import { getControllerId } from '../lib/controllerSession';
import {
  createGamepadModeEngine, limitedStep, parseGamepadMode, type GamepadModeEvent, type GamepadModeEngine,
} from '../lib/gamepadMode';
import { disarmGamepad, disarmGamepadWithNotice, dismissGamepadNotice, setGamepadStatus, useGamepadSession } from '../lib/gamepadSession';
import type { RobotState } from '../store';
import { useCommandFeedback, useFleet, useSession, useSettingsStore } from '../storeContexts';

// Cartesian step of a full push, mm - the same magnitude as the table step just below. The speed limit of the mode (and how far the
// stick is pushed) scales it; a gamepad button has no step selector of its own here.
const CARTESIAN_JOG_STEP_MM = 2;
const JOINT_JOG_STEP_DEG = 1.5;
const TABLE_JOG_STEP_MM = 2;

// One real (dx, dy, dz) direction per cartesian action - the 6 single-axis moves plus the 4 diagonal XY moves Joystick3D's own corner
// D-pad buttons already make.
const CARTESIAN_JOG_DELTAS: Record<string, [dx: number, dy: number, dz: number]> = {
  'X+': [1, 0, 0], 'X-': [-1, 0, 0],
  'Y+': [0, 1, 0], 'Y-': [0, -1, 0],
  'Z+': [0, 0, 1], 'Z-': [0, 0, -1],
  'XY++': [1, 1, 0], 'XY+-': [1, -1, 0], 'XY-+': [-1, 1, 0], 'XY--': [-1, -1, 0],
};

const JOINT_KEYS = ['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const;
type JointKey = (typeof JOINT_KEYS)[number];

/**
 * The gamepad mode. It reads a physical gamepad (navigator.getGamepads(), once per animation frame) and turns it into robot commands, but
 * only while the operator has armed the mode (lib/gamepadSession.ts: off in every new window, armed after a confirmation, with a robot
 * this window has reserved). What decides - dead zone, speed limit, rate, STOP first, lost pad, focus - is lib/gamepadMode.ts; its numbers
 * are in settings.gamepadMode and the mapping of inputs in settings.gamepadMapping.
 *
 * Real-time actions fire the atomic sendRobotCommand()/POST /api/robot/:id/command path, the SAME one the jog buttons of the robot panel
 * use. ADD POINT stays on updateRobot(): a recorded point is not a real-time action.
 */
export function GamepadController() {
  const { t } = useTranslation();
  const { emergencyStop, reportCommandIssue } = useCommandFeedback();
  const { settings } = useSettingsStore();
  const { authToken } = useSession();
  const { activeController, updateRobot, sendRobotCommand } = useFleet();
  const session = useGamepadSession();
  const requestRef = useRef<number>(0);
  const settingsRef = useRef(settings);
  const activeControllerRef = useRef(activeController);
  const updateRobotRef = useRef(updateRobot);
  const sendRobotCommandRef = useRef(sendRobotCommand);
  const emergencyStopRef = useRef(emergencyStop);
  const reportCommandIssueRef = useRef(reportCommandIssue);
  const tokenRef = useRef(authToken);
  const unanswered = useRef(createInFlightCounter());
  const engineRef = useRef<GamepadModeEngine | null>(null);

  const config = useMemo(() => parseGamepadMode(settings.gamepadMode), [settings.gamepadMode]);
  const configRef = useRef(config);

  // Every command goes through here so the number of unanswered ones is known.
  const sendTracked = (...args: Parameters<typeof sendRobotCommand>) => unanswered.current.track(sendRobotCommandRef.current(...args));

  useEffect(() => {
    settingsRef.current = settings;
    activeControllerRef.current = activeController;
    updateRobotRef.current = updateRobot;
    sendRobotCommandRef.current = sendRobotCommand;
    emergencyStopRef.current = emergencyStop;
    reportCommandIssueRef.current = reportCommandIssue;
    tokenRef.current = authToken;
  }, [settings, activeController, updateRobot, sendRobotCommand, emergencyStop, reportCommandIssue, authToken]);

  // The switch of the feature goes off: the mode goes off with it.
  useEffect(() => {
    if (!settings.gamepadEnabled) disarmGamepad();
  }, [settings.gamepadEnabled]);

  // The numbers changed: a new engine (it starts waiting for every input to be let go).
  useEffect(() => {
    configRef.current = config;
    engineRef.current = createGamepadModeEngine(config);
  }, [config]);

  useEffect(() => {
    if (!settings.gamepadEnabled || !session.armed) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      engineRef.current?.reset();
      return;
    }

    // One event of the engine, carried out. A STOP and a lost pad are the global stop: what was counted as unanswered is forgotten.
    const carryOut = (event: GamepadModeEvent) => {
      const currentRobot = activeControllerRef.current.robots.find((r) => r.id === getSelectedRobotId());
      if (event.type === 'stop') {
        unanswered.current.reset();
        void emergencyStopRef.current();
      } else if (event.type === 'lost') {
        unanswered.current.reset();
        void emergencyStopRef.current();
        disarmGamepadWithNotice('lost');
        engineRef.current?.reset();
      } else if (event.type === 'hold') {
        if (currentRobot) holdAction(currentRobot, event.action, event.scale);
      } else if (event.type === 'press') {
        pressAction(currentRobot, event.action);
      }
    };

    const holdAction = (currentRobot: RobotState, action: string, scale: number) => {
      if (CARTESIAN_JOG_DELTAS[action]) {
        // Cartesian XYZ jog (single-axis or diagonal) - mirrors RobotDetail.tsx's own handleXYZJog: forward kinematics to find the current
        // tool point, the combined delta, the model's own inverse kinematics ONCE, then one command per non-zero axis carrying the same
        // resolved joints.
        const [dx, dy, dz] = CARTESIAN_JOG_DELTAS[action];
        const step = limitedStep(CARTESIAN_JOG_STEP_MM, scale);
        const cart = jointsToCartesianForModel(currentRobot.model, currentRobot.joints);
        const x = cart.x + dx * step;
        const y = cart.y + dy * step;
        const z = cart.z + dz * step;
        const newJoints = resolveTargetJoints(currentRobot.model, x, y, z, cart.a, cart.b, cart.c, currentRobot.joints, currentRobot.joints);
        const verdict = guardJogStep({ robotId: currentRobot.id, from: currentRobot.joints, to: newJoints });
        if (!verdict.ok) {
          reportCommandIssueRef.current(verdict.issue);
          return;
        }
        const axes = [
          { axis: 'x' as const, amount: dx * step, value: x },
          { axis: 'y' as const, amount: dy * step, value: y },
          { axis: 'z' as const, amount: dz * step, value: z },
        ].filter((a) => a.amount !== 0);
        for (const a of axes) {
          sendTracked(
            currentRobot.id,
            'jog',
            { axis: a.axis, amount: a.amount, target: 'robot', joints: newJoints },
            (r) => ({ pos: { ...r.pos, [a.axis]: a.value, a: cart.a, b: cart.b, c: cart.c }, joints: newJoints })
          );
        }
      } else if (action === 'ROT+' || action === 'ROT-' || /^J[1-6][+-]$/.test(action)) {
        // Base rotation (J1) or one joint: the same real move as RobotDetail.tsx's handleJ1Jog, clamped to the limits of the model.
        const jointKey: JointKey = action.startsWith('ROT') ? 'j1' : (action.substring(0, 2).toLowerCase() as JointKey);
        if (!JOINT_KEYS.includes(jointKey)) return;
        const step = limitedStep(JOINT_JOG_STEP_DEG, scale) * (action.endsWith('+') ? 1 : -1);
        const [jMin, jMax] = jointLimitsFor(currentRobot.model, jointKey);
        const currentVal = (currentRobot.joints as any)[jointKey] || 0;
        const newVal = Math.min(jMax, Math.max(jMin, currentVal + step));
        if (newVal === currentVal) return; // already at a real limit: nothing is sent
        const newJoints = { ...currentRobot.joints, [jointKey]: newVal };
        const newCart = jointsToCartesianForModel(currentRobot.model, newJoints);
        sendTracked(
          currentRobot.id,
          'jog',
          { axis: 'x', amount: 0, target: 'robot', joints: newJoints },
          () => ({
            pos: { ...currentRobot.pos, x: newCart.x, y: newCart.y, z: newCart.z, a: newCart.a, b: newCart.b, c: newCart.c },
            joints: newJoints,
          })
        );
      } else if (action.startsWith('T')) {
        // Table move TX+, TY-: one atomic relative 'table' move (the table of the robot, if it has one).
        if (!currentRobot.hasXYTable || !currentRobot.xyTable) return;
        const axisStr = action.substring(0, 2).toLowerCase(); // "tx" or "ty"
        const tableAxis = axisStr === 'tx' ? 'x' : 'y';
        const step = limitedStep(TABLE_JOG_STEP_MM, scale) * (action.endsWith('+') ? 1 : -1);
        const xyTable = currentRobot.xyTable;
        const newTableVal = ((xyTable.pos as any)[tableAxis] || 0) + step;
        sendTracked(
          currentRobot.id,
          'table',
          { x: tableAxis === 'x' ? step : 0, y: tableAxis === 'y' ? step : 0, mode: 'relative' },
          () => ({
            pos: { ...currentRobot.pos, [axisStr]: newTableVal },
            xyTable: { ...xyTable, pos: { ...xyTable.pos, [tableAxis]: newTableVal } },
          })
        );
      } else if (action.startsWith('SPEED')) {
        // SPEED+, SPEED-: the speed of the playback, 10 to a ceiling that follows the speed limit of the mode (500 at 100 percent).
        const ceiling = Math.max(10, Math.round(500 * configRef.current.maxSpeedPercent / 100));
        const pb = currentRobot.playbackState || { isPlaying: false, activeStep: -1, speed: 100 };
        const currentSpeed = pb.speed || 100;
        const newSpeed = Math.min(ceiling, Math.max(10, currentSpeed + (action.endsWith('+') ? 1 : -1)));
        if (newSpeed === currentSpeed) return;
        sendTracked(
          currentRobot.id,
          'speed',
          { speed: newSpeed },
          (r) => ({ playbackState: { ...(r.playbackState || {}), speed: newSpeed } })
        );
      }
    };

    const pressAction = (currentRobot: RobotState | undefined, action: string) => {
      const robots = activeControllerRef.current.robots;
      if (action.startsWith('select_robot_')) {
        setSelectedRobotId(parseInt(action.replace('select_robot_', ''), 10));
      } else if (action === 'NEXT_ROBOT' || action === 'PREV_ROBOT') {
        if (robots.length === 0) return;
        const index = robots.findIndex((r) => r.id === getSelectedRobotId());
        const next = (index + (action === 'NEXT_ROBOT' ? 1 : -1) + robots.length) % robots.length;
        setSelectedRobotId(robots[next].id);
      } else if (action === 'START') {
        if (currentRobot && currentRobot.recordedPoints.length > 0) {
          sendTracked(currentRobot.id, 'play', undefined,
            (r) => ({ playbackState: { ...(r.playbackState || {}), isPlaying: true, activeStep: 0, isPaused: false, paused: false, isFinished: false } }));
        }
      } else if (action === 'START ALL') {
        robots.forEach((r) => {
          if (r.recordedPoints.length === 0) return;
          sendTracked(r.id, 'play', undefined,
            (robot) => ({ playbackState: { ...(robot.playbackState || {}), isPlaying: true, activeStep: 0, isPaused: false, paused: false, isFinished: false } }));
        });
      } else if (action === 'STOP') {
        if (currentRobot) {
          sendTracked(currentRobot.id, 'stop', undefined,
            (r) => ({ playbackState: { ...(r.playbackState || {}), isPlaying: false, activeStep: -1, isPaused: false, paused: false, isFinished: false } }),
            [currentRobot.id, ...(currentRobot.combinedWith || [])]);
        }
      } else if (action === 'STOP ALL') {
        robots.forEach((r) => {
          sendTracked(r.id, 'stop', undefined,
            (robot) => ({ playbackState: { ...(robot.playbackState || {}), isPlaying: false, activeStep: -1, isPaused: false, paused: false, isFinished: false } }),
            [r.id, ...(r.combinedWith || [])]);
        });
      } else if (action === 'ADD POINT') {
        // Not a real-time action: a recorded point is a full object with no atomic command of its own on the server.
        if (currentRobot) {
          const newPoint = {
            id: Date.now().toString(),
            name: `P${currentRobot.recordedPoints.length + 1}`,
            x: currentRobot.pos.x, y: currentRobot.pos.y, z: currentRobot.pos.z,
            a: currentRobot.pos.a, b: currentRobot.pos.b, c: currentRobot.pos.c,
            tx: currentRobot.pos.tx, ty: currentRobot.pos.ty, trz: currentRobot.pos.trz,
            j1: currentRobot.joints.j1, j2: currentRobot.joints.j2, j3: currentRobot.joints.j3,
            j4: currentRobot.joints.j4, j5: currentRobot.joints.j5, j6: currentRobot.joints.j6,
            speed: (currentRobot.playbackState?.speed || 100),
            // Native joint values of this robot: played as they are (see RobotDetail's own Add Point).
            motionType: 'model-joints',
          };
          updateRobotRef.current(currentRobot.id, {
            // @ts-ignore
            recordedPoints: [...currentRobot.recordedPoints, newPoint],
          });
        }
      }
    };

    let lastStatus = '';
    const poll = () => {
      const engine = engineRef.current;
      if (engine) {
        const pad = Array.from(navigator.getGamepads?.() ?? []).find((g): g is Gamepad => !!g) ?? null;
        const selected = activeControllerRef.current.robots.find((r) => r.id === getSelectedRobotId());
        const standing = claimStanding(claimsSnapshot()?.find((c) => c.robotId === getSelectedRobotId()), getControllerId(), decodeJwtUsername(tokenRef.current));
        const canMove = !!selected && (!configRef.current.requireClaim || standing === 'mine');
        const focused = !document.hidden && document.hasFocus();
        const { events, status } = engine.step({
          pad, armed: true, focused, canMove, unanswered: unanswered.current.count(), nowMs: performance.now(),
          mapping: settingsRef.current.gamepadMapping ?? {},
        });
        if (status !== lastStatus) { lastStatus = status; setGamepadStatus(status); }
        // The stop is the only event of its frame; any other event is carried out in the order the engine gave.
        for (const event of events) carryOut(event);
      }
      requestRef.current = requestAnimationFrame(poll);
    };

    requestRef.current = requestAnimationFrame(poll);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [settings.gamepadEnabled, session.armed]);

  if (!session.notice) return null;
  return (
    <div role="alert" data-testid="gamepad-notice" className="fixed top-14 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 rounded-lg border border-rose-500/60 bg-rose-950/90 text-rose-100 shadow-2xl text-sm">
      <AlertTriangle size={18} className="shrink-0 text-rose-300" />
      <span>{t(`gamepad_config.mode.notice_${session.notice}`)}</span>
      <button type="button" onClick={dismissGamepadNotice} aria-label={t('common.close')} className="p-1 rounded hover:bg-rose-800/60">
        <X size={14} />
      </button>
    </div>
  );
}
