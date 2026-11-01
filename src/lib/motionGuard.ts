// =============================================================================
// HYDRA-UMC STUDIO - the guard of every motion command: motionGuard.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// One place decides whether a command that moves a robot may leave this window. Before, the three checks lived in
// three files (Sim mode in liveSim, the size of a jog in safetyLimits and tableMove, the swing of a joint in
// examples/jogSafety) and each caller joined them in its own order. Here they are joined once:
//   1. a real command (one that moves or switches something on) is refused for a robot put in Sim;
//   2. a jog is bounded by the limits of the model the server reports;
//   3. a table move is bounded by the same limits, as a whole;
//   4. a single step that swings any joint a long way is not sent (guardJogStep).
// The server checks all of it again; this only spares the trip and says why. A stop is never refused.
// =============================================================================
import { excessiveJogStep } from '../examples/jogSafety';
import type { CommandIssue } from './commandResult';
import { blockedBySim, type ModeState } from './liveSim';
import { checkJog, type SafetyLimitsConfig } from './safetyLimits';
import { checkTable } from './tableMove';

export type GuardIssue = Omit<CommandIssue, 'id'>;

/** The answer of the guard: let the command through, or what to tell the operator and the code of a refused result. */
export type GuardVerdict = { ok: true } | { ok: false; issue: GuardIssue; serverCode: 'sim-mode' | 'jog-limit' };

export interface GuardRequest {
  command: string;
  params?: Record<string, unknown>;
  /** Every robot the command is about (a group command lists them all). */
  robotIds: number[];
  /** Model of the first robot, for the limits. */
  model?: unknown;
  limits: SafetyLimitsConfig;
  modes: ModeState;
  /** Where the table of the robot stands now, for a relative move. */
  tablePosition?: { x?: number; y?: number; rz?: number };
}

const PASS: GuardVerdict = { ok: true };

const limitDetail = (check: { kind: 'amount' | 'absolute' | null; limit: number }) => `${check.kind === 'absolute' ? 'abs ' : ''}${check.limit}`;

/** Whether `command` may be sent now. Pure: the same request always gets the same answer. */
export function guardCommand(request: GuardRequest): GuardVerdict {
  const { command, params, robotIds, model, limits, modes } = request;
  if (blockedBySim(modes, robotIds, command)) {
    return { ok: false, issue: { code: 'sim_blocked', command, robotIds, detail: null }, serverCode: 'sim-mode' };
  }
  if (command === 'jog') {
    const check = checkJog(limits, model, params);
    if (!check.ok) return { ok: false, issue: { code: 'jog_limit', command, robotIds, detail: limitDetail(check) }, serverCode: 'jog-limit' };
  }
  if (command === 'table') {
    const check = checkTable(limits, model, params, request.tablePosition);
    if (!check.ok) return { ok: false, issue: { code: 'jog_limit', command, robotIds, detail: limitDetail(check) }, serverCode: 'jog-limit' };
  }
  return PASS;
}

type Joints = Parameters<typeof excessiveJogStep>[0];

/** Whether a step from `from` to `to` joints may be sent: not when it swings any joint more than the largest allowed step. */
export function guardJogStep(step: { robotId: number; from: Joints; to: Joints }): GuardVerdict {
  const jump = excessiveJogStep(step.from, step.to);
  if (!jump) return PASS;
  return {
    ok: false,
    issue: { code: 'jog_jump', command: 'jog', robotIds: [step.robotId], detail: `${jump.joint.toUpperCase()} (${jump.deltaDeg.toFixed(0)}°)` },
    serverCode: 'jog-limit',
  };
}
