// =============================================================================
// HYDRA-UMC STUDIO - src/lib/toolArms.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The arm state of the URTC tools as the SERVER relays it (GET /api/tool-arms, read only): the last report of each pair of robot and tool,
// how old it is and whether it is stale. A tool is armed when its power stage may act. A stale report is never shown as safe: a stale armed
// tool is a warning and a stale disarmed tool is unknown. Nothing here arms, disarms or stops anything. The reading is defensive and checks
// the closed shape of the contract (one bad row refuses the whole answer, so a half-read list is never shown as the truth).
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export const MAX_TOOL_ARMS = 256;
export const MAX_TOOL_ID = 24;
const ROBOT = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

export interface ToolArm {
  robot: string;
  toolId: number;
  armed: boolean;
  by: string;
  seq: number;
  ageSeconds: number;
  stale: boolean;
}
export interface ToolArmsReport {
  ttlSeconds: number;
  arms: ToolArm[];
  armedCount: number;
  staleCount: number;
}
/** What one row means to the person looking at it. */
export type ToolArmLevel = 'armed' | 'disarmed' | 'warning' | 'unknown';

export type ToolArmsFailure = 'unavailable' | 'unsupported' | 'forbidden' | 'network' | 'http' | 'shape';
export type ToolArmsResult = { ok: true; value: ToolArmsReport } | { ok: false; failure: ToolArmsFailure; status?: number };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const whole = (value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

/** The report in an answer; null when anything does not have the shape of the contract. */
export function parseToolArms(data: unknown): ToolArmsReport | null {
  const r = object(data);
  if (r.schema_version !== '1.0') return null;
  if (typeof r.ttlSeconds !== 'number' || !Number.isFinite(r.ttlSeconds) || r.ttlSeconds <= 0) return null;
  if (!Array.isArray(r.arms) || r.arms.length > MAX_TOOL_ARMS) return null;
  if (!whole(r.armedCount, 0) || !whole(r.staleCount, 0)) return null;
  const arms: ToolArm[] = [];
  for (const raw of r.arms) {
    const a = object(raw);
    if (typeof a.robot !== 'string' || !ROBOT.test(a.robot)) return null;
    if (!whole(a.toolId, 0, MAX_TOOL_ID)) return null;
    if (typeof a.armed !== 'boolean' || typeof a.stale !== 'boolean') return null;
    if (typeof a.by !== 'string' || a.by.length > 64) return null;
    if (!whole(a.seq, 1)) return null;
    if (typeof a.ageSeconds !== 'number' || !Number.isFinite(a.ageSeconds) || a.ageSeconds < 0) return null;
    arms.push({ robot: a.robot, toolId: a.toolId, armed: a.armed, by: a.by, seq: a.seq, ageSeconds: a.ageSeconds, stale: a.stale });
  }
  return { ttlSeconds: r.ttlSeconds, arms, armedCount: r.armedCount, staleCount: r.staleCount };
}

/** A stale armed tool is a warning and a stale disarmed tool is unknown: a stale report is never shown as safe. */
export function toolArmLevel(arm: ToolArm): ToolArmLevel {
  if (arm.stale) return arm.armed ? 'warning' : 'unknown';
  return arm.armed ? 'armed' : 'disarmed';
}

/** The rows in the order a person needs them: dangerous first (warning, armed), then unknown, then disarmed; then by robot and tool. */
export function sortToolArms(arms: ToolArm[]): ToolArm[] {
  const rank: Record<ToolArmLevel, number> = { warning: 0, armed: 1, unknown: 2, disarmed: 3 };
  return [...arms].sort((a, b) => rank[toolArmLevel(a)] - rank[toolArmLevel(b)] || a.robot.localeCompare(b.robot) || a.toolId - b.toolId);
}

/** The age as short text: seconds under a minute, minutes under an hour, otherwise hours. */
export function formatAge(seconds: number): { unit: 's' | 'min' | 'h'; value: number } {
  if (seconds < 60) return { unit: 's', value: Math.floor(seconds) };
  if (seconds < 3600) return { unit: 'min', value: Math.floor(seconds / 60) };
  return { unit: 'h', value: Math.floor(seconds / 3600) };
}

async function read(): Promise<ToolArmsResult> {
  try {
    const res = await authFetch(apiUrl('/api/tool-arms'));
    if (res.status === 404) return { ok: false, failure: 'unsupported' };
    // the SERVER answers 503 while it has no address of the safety zones service, and the service answers 404 while it was not started with --tool-arms
    if (res.status === 502 || res.status === 503 || res.status === 504) return { ok: false, failure: 'unavailable', status: res.status };
    if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden', status: res.status };
    if (!res.ok) return { ok: false, failure: 'http', status: res.status };
    const report = parseToolArms(await res.json().catch(() => null));
    return report ? { ok: true, value: report } : { ok: false, failure: 'shape', status: res.status };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

/** A row may offer the reset only when it is a fresh report of a disarmed tool: an old report is never taken as safe, and an armed tool is never reset from here. */
export const canOfferReset = (arm: ToolArm): boolean => !arm.armed && !arm.stale;

/** The body of the reset: the robot, the tool and the robot id as the person typed it (the SERVER compares them exactly). */
export const resetBody = (arm: ToolArm, typed: string): { robot: string; toolId: number; confirm: string } => ({ robot: arm.robot, toolId: arm.toolId, confirm: typed });

/** The typed text is what the person has to write before the button works: the robot id, exactly. */
export const resetConfirmed = (arm: ToolArm, typed: string): boolean => typed === arm.robot;

export type ResetRefusal = 'armed' | 'moving' | 'report_stale' | 'tool_not_reported' | 'motion_unknown' | 'no_report';
export const RESET_REFUSALS: readonly ResetRefusal[] = ['armed', 'moving', 'report_stale', 'tool_not_reported', 'motion_unknown', 'no_report'];
export type ResetResult =
  | { ok: true }
  | { ok: false; failure: 'off' | 'forbidden' | 'invalid' | 'mismatch' | 'unavailable' | 'rejected' | 'network' | 'http'; status?: number }
  | { ok: false; failure: 'refused'; reason: ResetRefusal; status: 409 };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/** Reset the arm state of one tool changer (POST /api/tool-arms/reset, administrators; the SERVER answers 404 while its switch is off). */
async function reset(arm: ToolArm, typed: string): Promise<ResetResult> {
  try {
    const res = await authFetch(apiUrl('/api/tool-arms/reset'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resetBody(arm, typed)) });
    if (res.status === 200) return { ok: true };
    const data = object(await res.json().catch(() => ({})));
    if (res.status === 404) return { ok: false, failure: 'off' };
    if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden', status: res.status };
    if (res.status === 400) return { ok: false, failure: data.code === 'CONFIRMATION_MISMATCH' ? 'mismatch' : 'invalid', status: 400 };
    if (res.status === 409) {
      const reason = RESET_REFUSALS.find(item => item === data.reason) ?? 'no_report';
      return { ok: false, failure: 'refused', reason, status: 409 };
    }
    if (res.status === 502) return { ok: false, failure: 'rejected', status: 502 };
    if (res.status === 503) return { ok: false, failure: 'unavailable', status: 503 };
    return { ok: false, failure: 'http', status: res.status };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

export const toolArmsApi = { read, reset };
