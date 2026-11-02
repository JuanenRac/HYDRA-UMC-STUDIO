// =============================================================================
// HYDRA-UMC STUDIO - the check of a trajectory before Play: trajectoryPreview.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Before Play the operator may see the path the robot is about to follow (from above, from the side and from the front)
// together with what is wrong with it: a joint outside the limits of the model, a step that swings a joint a long way,
// a point whose pose does not match the one its joints give. The switch is kept in this browser and is off by default
// (Play then starts at once, as it always did); the numbers (largest step, rows listed, size of the views) are in
// src/config/trajectoryPreview.json. Pure: the same points always give the same report.
// =============================================================================
import config from '../config/trajectoryPreview.json';
import { jointLimitsFor, jointsToCartesianForModel } from '../examples/robotKinematicsDispatch';
import { JOINT_NAMES, type JointName } from '../examples/jogSafety';
import { positionResidualMm } from './reachCheck';
import type { RobotState } from '../store';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
type Point = RobotState['recordedPoints'][number];

export const PREVIEW_STORAGE_KEY: string = config.storageKey;
export const PREVIEW_LISTED_ISSUES: number = config.listedIssues;
export const PREVIEW_VIEW = config.view;

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

/** The polyline of the path in the coordinates of a view of `width` x `height` (the plane is chosen by name), fitted with `padding`. */
export function projectPath(path: PreviewReport['path'], plane: PreviewPlane, width: number = PREVIEW_VIEW.width, height: number = PREVIEW_VIEW.height, padding: number = PREVIEW_VIEW.padding): Array<{ x: number; y: number }> {
  if (path.length === 0) return [];
  const pick = (p: PreviewReport['path'][number]) => (plane === 'top' ? { u: p.x, v: p.y } : plane === 'side' ? { u: p.y, v: p.z } : { u: p.x, v: p.z });
  const flat = path.map(pick);
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
