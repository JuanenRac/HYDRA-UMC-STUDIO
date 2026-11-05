// =============================================================================
// HYDRA-UMC STUDIO - The reach check of a trajectory before it is sent: hooks/useReachGate.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// A trajectory with points the arm cannot reach is refused, with the list of those points. The operator can accept the
// same trajectory scaled to the reach of this model (about the base of the robot), or cancel. Moved out of the robot
// screen unchanged.
// =============================================================================
import { useState } from 'react';
import type { RobotState } from '../store';
import { buildReachReport, findReachScale, loadReachTolerance, reachNeedsConfirmation, scalePortablePoints, type ReachReport, type ReachScale } from '../lib/reachCheck';
import { withCartesian, browserStorage, normalizeTrajectoryForRobot } from '../lib/robotDetailHelpers';

export interface PendingReach {
  report: ReachReport;
  fit: ReachScale | null;
  sendScaled: (() => Promise<unknown>) | null;
  decline: () => void;
}

export interface ReachScaling {
  raw: unknown[];
  target: Pick<RobotState, 'model' | 'joints'>;
  sendPoints: (points: any[]) => Promise<unknown>;
}

export function useReachGate() {
  // A trajectory with points the arm cannot reach asks first (see src/lib/reachCheck.ts).
  const [pendingReach, setPendingReach] = useState<PendingReach | null>(null);
  const [reachTolerance, setReachTolerance] = useState<number>(() => loadReachTolerance(browserStorage()));

  // `scaling` carries what is needed to build the scaled trajectory; without it only the refusal is offered.
  const sendUnlessUnreachable = async (
    residuals: Array<number | null>,
    decline: () => void,
    send: () => Promise<unknown>,
    scaling?: ReachScaling,
  ) => {
    const tolerance = loadReachTolerance(browserStorage());
    const report = buildReachReport(residuals, tolerance);
    if (!reachNeedsConfirmation(report)) {
      await send();
      return;
    }
    let fit: ReachScale | null = null;
    let sendScaled: (() => Promise<unknown>) | null = null;
    if (scaling) {
      const scaledAt = (scale: number) => scalePortablePoints(scaling.raw, scale, withCartesian);
      fit = findReachScale((scale) => {
        const measured: Array<number | null> = [];
        try { normalizeTrajectoryForRobot(scaledAt(scale), scaling.target, measured); } catch { return [Number.POSITIVE_INFINITY]; }
        return measured;
      }, tolerance, scaling.raw.length > 500 ? 0.1 : 0.05);
      if (fit.scale < 1 && fit.remaining < report.count) {
        const chosen = fit.scale;
        sendScaled = () => scaling.sendPoints(normalizeTrajectoryForRobot(scaledAt(chosen), scaling.target));
      }
    }
    setPendingReach({ report, fit, sendScaled, decline });
  };
  const runPendingReach = () => {
    const pending = pendingReach;
    setPendingReach(null);
    if (pending?.sendScaled) void pending.sendScaled();
  };
  const cancelPendingReach = () => {
    const pending = pendingReach;
    setPendingReach(null);
    pending?.decline();
  };

  return { pendingReach, reachTolerance, setReachTolerance, sendUnlessUnreachable, runPendingReach, cancelPendingReach };
}
