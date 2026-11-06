// =============================================================================
// HYDRA-UMC STUDIO - the check of a trajectory before Play: trajectoryPreview.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Before Play the operator may see the path the robot is about to follow (from above, from the side and from the front)
// together with what is wrong with it: a joint outside the limits of the model, a step that swings a joint a long way,
// a point whose pose does not match the one its joints give. The switch is kept in this browser and is off by default
// (Play then starts at once, as it always did); the numbers (largest step, rows listed, size of the views) are in
// src/config/trajectoryPreview.json. A fourth view turns around the path (the starting angles and the step of the turn are in
// the same file), and a point can be moved to a typed position: the joints that come closest to it are found with the inverse
// kinematics of the model (keeping the orientation the tool has) and the move is refused when the tool would miss it by more than the
// reach tolerance.
// Pure: the same points always give the same report.
// =============================================================================
import config from '../config/trajectoryPreview.json';
import { jointLimitsFor, jointsToCartesianForModel, resolveTargetJoints } from '../examples/robotKinematicsDispatch';
import { JOINT_NAMES, type JointName } from '../examples/jogSafety';
import { positionResidualMm } from './reachCheck';
import type { RobotState } from '../store';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
type Point = RobotState['recordedPoints'][number];

export const PREVIEW_STORAGE_KEY: string = config.storageKey;
export const PREVIEW_LISTED_ISSUES: number = config.listedIssues;
export const PREVIEW_VIEW = config.view;

const inRange = (value: unknown, low: number, high: number, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high ? value : fallback;
/** Starting angles and step of the turn of the fourth view, in degrees (values outside their range fall back to the defaults). */
export const ORBIT_SETTINGS = {
  yawDeg: inRange(config.orbit?.yawDeg, -360, 360, 35),
  pitchDeg: inRange(config.orbit?.pitchDeg, -85, 85, 25),
  stepDeg: inRange(config.orbit?.stepDeg, 1, 90, 15),
};

export type PreviewIssue =
  | { kind: 'joint-limit'; point: number; joint: JointName; valueDeg: number; minDeg: number; maxDeg: number }
  | { kind: 'joint-step'; point: number; joint: JointName; deltaDeg: number }
  | { kind: 'pose-mismatch'; point: number; mm: number };

export interface PreviewReport {
  points: number;
  /** Length of the straight segments between the points, in millimetres. */
  pathLengthMm: number;
  /** The largest swing of any joint between two neighbouring points, in degrees. */
  maxStepDeg: number;
  issues: PreviewIssue[];
  /** True when nothing is wrong. */
  clean: boolean;
  /** The positions drawn: x, y and z in millimetres. */
  path: Array<{ x: number; y: number; z: number }>;
}

export interface PreviewOptions {
  maxStepDeg?: number;
  limitToleranceDeg?: number;
  /** A point whose x, y, z are further than this from its own joints is reported (millimetres). */
  poseToleranceMm?: number;
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function previewEnabled(storage: StorageLike | null | undefined): boolean {
  try {
    const raw = storage?.getItem(PREVIEW_STORAGE_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    /* the default applies */
  }
  return config.enabledByDefault;
}

export function savePreviewEnabled(storage: StorageLike | null | undefined, on: boolean): boolean {
  try {
    storage?.setItem(PREVIEW_STORAGE_KEY, on ? '1' : '0');
  } catch {
    /* the choice simply does not persist */
  }
  return on;
}

/** Checks the points of a trajectory against the model: limits of every joint, swing between points, pose against joints. */
export function analyzeTrajectory(points: readonly Point[], model: RobotState['model'] | undefined, options: PreviewOptions = {}): PreviewReport {
  const maxStep = options.maxStepDeg ?? config.maxJointStepDeg;
  const limitTol = options.limitToleranceDeg ?? config.jointLimitToleranceDeg;
  const poseTol = options.poseToleranceMm ?? 5;
  const issues: PreviewIssue[] = [];
  const path: PreviewReport['path'] = [];
  let maxStepDeg = 0;
  points.forEach((point, index) => {
    for (const joint of JOINT_NAMES) {
      const value = point[joint];
      if (!finite(value)) continue;
      const [min, max] = jointLimitsFor(model as RobotState['model'], joint);
      if (value < min - limitTol || value > max + limitTol) issues.push({ kind: 'joint-limit', point: index, joint, valueDeg: value, minDeg: min, maxDeg: max });
    }
    if (finite(point.x) && finite(point.y) && finite(point.z)) {
      path.push({ x: point.x, y: point.y, z: point.z });
      if (point.motionType === 'model-joints' && [point.j1, point.j2, point.j3, point.j4, point.j5, point.j6].every(finite)) {
        const given = jointsToCartesianForModel(model, point);
        const mm = positionResidualMm({ x: point.x, y: point.y, z: point.z }, given);
        if (mm > poseTol) issues.push({ kind: 'pose-mismatch', point: index, mm });
      }
    } else if (finite(point.j1)) {
      const given = jointsToCartesianForModel(model, point);
      path.push({ x: given.x, y: given.y, z: given.z });
    }
    if (index > 0) {
      const before = points[index - 1];
      let worst: { joint: JointName; deltaDeg: number } | null = null;
      for (const joint of JOINT_NAMES) {
        const a = before[joint];
        const b = point[joint];
        if (!finite(a) || !finite(b)) continue;
        const delta = Math.abs(b - a);
        if (!worst || delta > worst.deltaDeg) worst = { joint, deltaDeg: delta };
      }
      if (worst) {
        if (worst.deltaDeg > maxStep) issues.push({ kind: 'joint-step', point: index, joint: worst.joint, deltaDeg: worst.deltaDeg });
        maxStepDeg = Math.max(maxStepDeg, worst.deltaDeg);
      }
    }
  });
  let length = 0;
  for (let i = 1; i < path.length; i += 1) length += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y, path[i].z - path[i - 1].z);
  return { points: points.length, pathLengthMm: length, maxStepDeg, issues, clean: issues.length === 0, path };
}

export type PreviewPlane = 'top' | 'side' | 'front';

/** Points on a plane (vertical axis upwards) fitted, with their proportions, in a view of `width` x `height`. */
function fitToView(flat: Array<{ u: number; v: number }>, width: number, height: number, padding: number): Array<{ x: number; y: number }> {
  const us = flat.map((p) => p.u);
  const vs = flat.map((p) => p.v);
  const minU = Math.min(...us);
  const maxU = Math.max(...us);
  const minV = Math.min(...vs);
  const maxV = Math.max(...vs);
  const span = Math.max(maxU - minU, maxV - minV, 1e-6);
  const scale = Math.min((width - 2 * padding) / span, (height - 2 * padding) / span);
  const offsetU = (width - (maxU - minU) * scale) / 2;
  const offsetV = (height - (maxV - minV) * scale) / 2;
  // The vertical axis grows upwards on the drawing, downwards on the screen.
  return flat.map((p) => ({ x: offsetU + (p.u - minU) * scale, y: height - (offsetV + (p.v - minV) * scale) }));
}

/** The polyline of the path in the coordinates of a view of `width` x `height` (the plane is chosen by name), fitted with `padding`. */
export function projectPath(path: PreviewReport['path'], plane: PreviewPlane, width: number = PREVIEW_VIEW.width, height: number = PREVIEW_VIEW.height, padding: number = PREVIEW_VIEW.padding): Array<{ x: number; y: number }> {
  if (path.length === 0) return [];
  const pick = (p: PreviewReport['path'][number]) => (plane === 'top' ? { u: p.x, v: p.y } : plane === 'side' ? { u: p.y, v: p.z } : { u: p.x, v: p.z });
  return fitToView(path.map(pick), width, height, padding);
}

/**
 * The path seen from a point that turns around it: `yawDeg` about the vertical axis (0 looks along +y, so x goes right) and
 * `pitchDeg` above the horizon (0 from the side, 90 from straight above). Orthographic, vertical axis upwards.
 */
export function projectOrbit(path: PreviewReport['path'], yawDeg: number, pitchDeg: number, width: number = PREVIEW_VIEW.width, height: number = PREVIEW_VIEW.height, padding: number = PREVIEW_VIEW.padding): Array<{ x: number; y: number }> {
  if (path.length === 0) return [];
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (Math.max(-90, Math.min(90, pitchDeg)) * Math.PI) / 180;
  const [cy, sy, cp, sp] = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch)];
  return fitToView(path.map((p) => ({ u: p.x * cy - p.y * sy, v: p.z * cp + (p.x * sy + p.y * cy) * sp })), width, height, padding);
}

/** The angles after one step of the turn: yaw wraps inside -180..180, pitch stays between -85 and 85. */
export function turnOrbit(yawDeg: number, pitchDeg: number, dYaw: number, dPitch: number, stepDeg: number = ORBIT_SETTINGS.stepDeg): { yawDeg: number; pitchDeg: number } {
  return {
    yawDeg: ((((yawDeg + dYaw * stepDeg + 180) % 360) + 360) % 360) - 180,
    pitchDeg: Math.max(-85, Math.min(85, pitchDeg + dPitch * stepDeg)),
  };
}

/** A typed number of millimetres (a comma is accepted as the decimal mark), or null. */
export function parseMillimetres(text: unknown): number | null {
  if (typeof text === 'number') return Number.isFinite(text) ? text : null;
  if (typeof text !== 'string' || text.trim() === '') return null;
  const value = Number(text.trim().replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

export type MovePointCode = 'ok' | 'invalid' | 'no_kinematics' | 'unreachable';
export interface MovePointResult {
  /** The point moved so that its tool is at the target; null unless `code` is "ok". */
  point: Point | null;
  code: MovePointCode;
  /** How far the tool is from the target, in millimetres (0 when it could not be measured). */
  missMm: number;
}

/**
 * Moves a point so that its tool is at `target` (millimetres): the joints are solved with the inverse kinematics of the model for
 * the orientation the tool has now, and the x, y, z (and the orientation) of the point are re-read from them. Codes: "invalid"
 * (a target that is not finite), "no_kinematics" (the model has no kinematics of its own here), "unreachable" (the closest the
 * tool gets is farther than the tolerance). The point is left as it was unless the code is "ok".
 */
export function movePointToPosition(model: RobotState['model'] | undefined, point: Point, target: { x: number; y: number; z: number }, toleranceMm: number): MovePointResult {
  if (![target.x, target.y, target.z].every(finite)) return { point: null, code: 'invalid', missMm: 0 };
  const current = jointsToCartesianForModel(model, point);
  const own = { j1: point.j1, j2: point.j2, j3: point.j3, j4: point.j4, j5: point.j5, j6: point.j6 };
  const solved = resolveTargetJoints(model, target.x, target.y, target.z, current.a, current.b, current.c, own, { j1: point.j1 });
  // A model without kinematics of its own gets the joints it was handed back, so no position can be turned into joints.
  if (solved === own) return { point: null, code: 'no_kinematics', missMm: 0 };
  const joints = { ...point, j1: solved.j1, j2: solved.j2, j3: solved.j3, j4: solved.j4, j5: solved.j5, j6: solved.j6 };
  const reached = jointsToCartesianForModel(model, joints);
  const missMm = positionResidualMm(target, reached);
  if (!(missMm <= toleranceMm)) return { point: null, code: 'unreachable', missMm };
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return {
    point: { ...joints, j1: round(joints.j1), j2: round(joints.j2), j3: round(joints.j3), j4: round(joints.j4), j5: round(joints.j5), j6: round(joints.j6), x: round(reached.x), y: round(reached.y), z: round(reached.z), a: reached.a, b: reached.b, c: reached.c },
    code: 'ok',
    missMm,
  };
}
