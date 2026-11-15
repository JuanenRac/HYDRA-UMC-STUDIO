// =============================================================================
// HYDRA-UMC STUDIO - calls about reservations, arming and limits: accessApi.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The requests of contract v2 block 1: reserve and release a robot, arm its jog, list the reservations, read and
// change the safety limits. Every request that names a robot carries the controller id of this window in its body.
// Each answer is turned into the same typed result as a robot command, so a refusal reads the same everywhere.
// =============================================================================
import { serverClient, settle } from './serverClient';
import { getControllerId } from './controllerSession';
import { interpretCommandResponse, networkFailure, type CommandResult } from './commandResult';
import { parseClaims, type ClaimEntry } from './claims';
import { parseSafetyLimits, type SafetyLimitsState } from './safetyLimits';
import { robotRevisions, revisionOf } from './revisions';

/**
 * One POST. With `conditional`, the revision this window last saw of the robot goes along as If-Match (when the mode
 * of this window and the state of the tracker allow it) and the revision of the answer is kept for the next write.
 */
async function post<B>(
  body: B,
  send: (headers: { 'If-Match'?: string }, body: B & { controllerId: string }) => Promise<unknown>,
  conditional?: { robotId: number; command: string },
): Promise<{ result: CommandResult; data: Record<string, unknown> }> {
  const ticket = conditional ? robotRevisions.begin(conditional.robotId, conditional.command) : null;
  const headers: { 'If-Match'?: string } = {};
  if (ticket?.ifMatch) headers['If-Match'] = ticket.ifMatch;
  try {
    // the status and the body of a refusal come back with the answer, so the result reads the same as for a command
    const { status, data } = await settle(() => send(headers, { ...body, controllerId: getControllerId() }));
    if (conditional && ticket) robotRevisions.finish(conditional.robotId, ticket.seq, revisionOf(data));
    return { result: interpretCommandResponse(status, status < 300, data), data: data && typeof data === 'object' ? (data as Record<string, unknown>) : {} };
  } catch (error) {
    if (conditional && ticket) robotRevisions.finish(conditional.robotId, ticket.seq, null);
    return { result: networkFailure(error instanceof Error ? error.message : undefined), data: {} };
  }
}

/** `unconditional` keeps If-Match off the request (renewing one's own reservation must not fail because the robot moved). */
export interface ClaimOptions { ttlMs?: number; force?: boolean; reason?: string; unconditional?: boolean }

export async function claimRobot(robotId: number, options: ClaimOptions = {}): Promise<CommandResult> {
  const { unconditional, ...body } = options;
  return (await post(body, (headers, payload) => serverClient.postRobotByIdClaim({ path: { id: robotId }, headers, body: payload }), unconditional || body.force ? undefined : { robotId, command: 'claim' })).result;
}

export async function releaseRobot(robotId: number, reason?: string): Promise<CommandResult> {
  const payload: { reason?: string } = reason ? { reason } : {};
  return (await post(payload, (headers, sent) => serverClient.postRobotByIdRelease({ path: { id: robotId }, headers, body: sent }), { robotId, command: 'release' })).result;
}

export interface RobotRead { robot: Record<string, unknown>; revision: string | null; cellId: string | null }

/** GET /api/robot/:id: one robot with its revision (also kept for the next write); null when it could not be read or the server predates the route. */
export async function fetchRobot(robotId: number): Promise<RobotRead | null> {
  try {
    const body: unknown = await serverClient.getRobotById({ path: { id: robotId } });
    if (!body || typeof body !== 'object') return null;
    const record = body as Record<string, unknown>;
    if (!record.robot || typeof record.robot !== 'object') return null;
    const revision = revisionOf(record);
    robotRevisions.learn(robotId, revision);
    return { robot: record.robot as Record<string, unknown>, revision, cellId: typeof record.cellId === 'string' ? record.cellId : null };
  } catch {
    return null;
  }
}

export interface ArmResult { result: CommandResult; expiresAt: number | null }

/** Arms (true) or disarms (false) the jog of a robot; `expiresAt` is when the arming ends. */
export async function armJog(robotId: number, armed: boolean, ttlMs?: number): Promise<ArmResult> {
  const payload: { armed: boolean; ttlMs?: number } = ttlMs ? { armed, ttlMs } : { armed };
  const { result, data } = await post(payload, (_headers, sent) => serverClient.postRobotByIdJogArm({ path: { id: robotId }, body: sent }));
  return { result, expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : null };
}

/** GET /api/claims; null when the server could not be read or predates the route. */
export async function fetchClaims(): Promise<ClaimEntry[] | null> {
  try {
    return parseClaims(await serverClient.getClaims());
  } catch {
    return null;
  }
}

export interface SafetyRead { state: SafetyLimitsState; jogArmedUntil: number | null }

/** GET /api/safety-limits (with the robot, also when its jog is armed); null when the server could not be read or predates the route. */
export async function fetchSafetyLimits(robotId?: number): Promise<SafetyRead | null> {
  try {
    const body: unknown = await serverClient.getSafetyLimits(robotId === undefined ? undefined : { query: { robotId: String(robotId) } });
    const robot = body && typeof body === 'object' ? (body as Record<string, unknown>).robot : null;
    const until = robot && typeof robot === 'object' ? (robot as Record<string, unknown>).jogArmedUntil : null;
    return { state: parseSafetyLimits(body), jogArmedUntil: typeof until === 'number' ? until : null };
  } catch {
    return null;
  }
}

type SafetyLimitsPatch = Parameters<typeof serverClient.putAdminSafetyLimits>[0]['body'];

export interface SaveLimitsResult { result: CommandResult; state: SafetyLimitsState | null }

/** PUT /api/admin/safety-limits (administrators only). */
export async function putSafetyLimits(patch: Record<string, unknown>): Promise<SaveLimitsResult> {
  try {
    const { status, data } = await settle(() => serverClient.putAdminSafetyLimits({ body: patch as SafetyLimitsPatch }));
    const result = interpretCommandResponse(status, status < 300, data);
    return { result, state: status < 300 ? parseSafetyLimits(data) : null };
  } catch (error) {
    return { result: networkFailure(error instanceof Error ? error.message : undefined), state: null };
  }
}
