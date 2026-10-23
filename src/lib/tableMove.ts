// =============================================================================
// HYDRA-UMC STUDIO - the atomic move of the XY table: tableMove.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The "table" command of the server moves the XY table of one robot in one request ({ x, y, rz?, mode }) instead of
// one jog per axis: the server checks the whole move against the jog limits of the model and applies all of it or
// none of it. This file builds that request, checks it against the limits this window already knows (the server
// checks again), and, for a server that predates the command, turns it into the jogs that did the same before.
// =============================================================================
import { jogLimitsFor, type SafetyLimitsConfig } from './safetyLimits';
import type { CommandResult } from './commandResult';

export type TableMode = 'absolute' | 'relative';

export interface TableParams { x: number; y: number; rz?: number; mode: TableMode }

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** The parameters of a table move, or null when they are not numbers. */
export function tableParams(x: unknown, y: unknown, mode: TableMode, rz?: unknown): TableParams | null {
  if (!finite(x) || !finite(y)) return null;
  if (rz !== undefined && !finite(rz)) return null;
  return { x, y, ...(rz !== undefined ? { rz } : {}), mode };
}

export interface TableCheck { ok: boolean; limit: number; kind: 'amount' | 'absolute' | null }

/**
 * Whether a table move is inside the limits of the model before it is sent: every number of a relative move within
 * the largest jog, every number of an absolute move (and the position a relative one ends in) within the largest
 * absolute position.
 */
export function checkTable(
  limits: SafetyLimitsConfig,
  model: unknown,
  params: Record<string, unknown> | undefined,
  current?: { x?: number; y?: number; rz?: number },
): TableCheck {
  const jog = jogLimitsFor(limits, model);
  const relative = params?.mode === 'relative';
  const requested: Array<[string, unknown]> = [['x', params?.x], ['y', params?.y]];
  if (params?.rz !== undefined) requested.push(['rz', params.rz]);
  for (const [, value] of requested) {
    if (!finite(value)) continue;
    const limit = relative ? jog.maxAmount : jog.maxAbsolute;
    if (Math.abs(value) > limit) return { ok: false, limit, kind: relative ? 'amount' : 'absolute' };
  }
  if (relative && current) {
    for (const [axis, value] of requested) {
      if (!finite(value)) continue;
      const base = axis === 'x' ? current.x : axis === 'y' ? current.y : current.rz;
      if (Math.abs((base ?? 0) + value) > jog.maxAbsolute) return { ok: false, limit: jog.maxAbsolute, kind: 'absolute' };
    }
  }
  return { ok: true, limit: relative ? jog.maxAmount : jog.maxAbsolute, kind: null };
}

/** An older server answers 400 "unknown command" to a command it does not have. */
export function isUnknownCommand(result: CommandResult): boolean {
  return !result.ok && result.status === 400 && result.serverCode === null && /unknown command/i.test(result.detail ?? '');
}

/** The jogs that did the same on a server without the table command (one per axis that moves; no rotation). */
export function tableAsJogs(params: Record<string, unknown>): Array<Record<string, unknown>> {
  const absolute = params.mode !== 'relative';
  const jogs: Array<Record<string, unknown>> = [];
  for (const axis of ['x', 'y'] as const) {
    const amount = params[axis];
    if (!finite(amount)) continue;
    if (!absolute && amount === 0) continue;
    jogs.push({ axis, amount, target: 'xytable', ...(absolute ? { absolute: true } : {}) });
  }
  return jogs;
}

let tableSupported = true;

/** Whether the server was last seen to understand the table command (true until it says otherwise). */
export function serverHasTableCommand(): boolean { return tableSupported; }
export function markTableCommand(supported: boolean): void { tableSupported = supported; }
