// =============================================================================
// HYDRA-UMC STUDIO - calls about reservations, arming and limits: accessApi.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The requests of contract v2 block 1: reserve and release a robot, arm its jog, list the reservations, read and
// change the safety limits. Every request that names a robot carries the controller id of this window in its body.
// Each answer is turned into the same typed result as a robot command, so a refusal reads the same everywhere.
// =============================================================================
import { apiUrl } from './apiBase';
import { authFetch } from './session';
import { getControllerId } from './controllerSession';
import { interpretCommandResponse, networkFailure, type CommandResult } from './commandResult';
import { parseClaims, type ClaimEntry } from './claims';
import { parseSafetyLimits, type SafetyLimitsState } from './safetyLimits';

async function post(path: string, body: Record<string, unknown>): Promise<{ result: CommandResult; data: Record<string, unknown> }> {
  try {
    const res = await authFetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, controllerId: getControllerId() }),
    });
    let data: unknown = null;
    try { data = await res.json(); } catch { /* an answer without a JSON body */ }
    return { result: interpretCommandResponse(res.status, res.ok, data), data: data && typeof data === 'object' ? (data as Record<string, unknown>) : {} };
  } catch (error) {
    return { result: networkFailure(error instanceof Error ? error.message : undefined), data: {} };
  }
}

export interface ClaimOptions { ttlMs?: number; force?: boolean; reason?: string }

export async function claimRobot(robotId: number, options: ClaimOptions = {}): Promise<CommandResult> {
  return (await post(`/api/robot/${robotId}/claim`, { ...options })).result;
}

export async function releaseRobot(robotId: number, reason?: string): Promise<CommandResult> {
  return (await post(`/api/robot/${robotId}/release`, reason ? { reason } : {})).result;
}

export interface ArmResult { result: CommandResult; expiresAt: number | null }

/** Arms (true) or disarms (false) the jog of a robot; `expiresAt` is when the arming ends. */
export async function armJog(robotId: number, armed: boolean, ttlMs?: number): Promise<ArmResult> {
  const { result, data } = await post(`/api/robot/${robotId}/jog-arm`, ttlMs ? { armed, ttlMs } : { armed });
  return { result, expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : null };
}

/** GET /api/claims; null when the server could not be read or predates the route. */
export async function fetchClaims(): Promise<ClaimEntry[] | null> {
  try {
    const res = await authFetch(apiUrl('/api/claims'));
    if (!res.ok) return null;
    return parseClaims(await res.json());
  } catch {
    return null;
  }
}

export interface SafetyRead { state: SafetyLimitsState; jogArmedUntil: number | null }

/** GET /api/safety-limits (with the robot, also when its jog is armed); null when the server could not be read or predates the route. */
export async function fetchSafetyLimits(robotId?: number): Promise<SafetyRead | null> {
  try {
    const res = await authFetch(apiUrl(robotId === undefined ? '/api/safety-limits' : `/api/safety-limits?robotId=${robotId}`));
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const robot = body && typeof body === 'object' ? (body as Record<string, unknown>).robot : null;
    const until = robot && typeof robot === 'object' ? (robot as Record<string, unknown>).jogArmedUntil : null;
    return { state: parseSafetyLimits(body), jogArmedUntil: typeof until === 'number' ? until : null };
  } catch {
    return null;
  }
}

export interface SaveLimitsResult { result: CommandResult; state: SafetyLimitsState | null }

/** PUT /api/admin/safety-limits (administrators only). */
export async function putSafetyLimits(patch: Record<string, unknown>): Promise<SaveLimitsResult> {
  try {
    const res = await authFetch(apiUrl('/api/admin/safety-limits'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    let data: unknown = null;
    try { data = await res.json(); } catch { /* an answer without a JSON body */ }
    const result = interpretCommandResponse(res.status, res.ok, data);
    return { result, state: res.ok ? parseSafetyLimits(data) : null };
  } catch (error) {
    return { result: networkFailure(error instanceof Error ? error.message : undefined), state: null };
  }
}
