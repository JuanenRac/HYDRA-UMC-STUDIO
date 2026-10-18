// =============================================================================
// HYDRA-UMC STUDIO - the global STOP: stopAll.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// POST /api/stop-all stops every robot of every controller and switches every valve and pump off, in one call, for
// any signed-in account. This is the client layer HydraProvider uses: the request (no body, bearer token, a short
// timeout), the reading of the answer robot by robot, and the decision to fall back to the per-robot stop when the
// route is rate limited (429) or missing (404, an older server). Nothing here asks for a confirmation.
// =============================================================================

import { apiUrl } from './apiBase';
import { authHeaders } from './session';
import { failureCodeForStatus, type CommandFailureCode } from './commandResult';

/** One robot of the answer of POST /api/stop-all. */
export interface StopAllRobot {
  robotId: number;
  controllerId: string | null;
  name: string;
  stopped: boolean;
  valvesOff: number;
  pumpsOff: number;
  /** Set when another account holds a reservation on this robot: the stop went through anyway. */
  reservedBy: string | null;
  error: string | null;
}

export interface StopAllReport {
  success: boolean;
  stoppedCount: number;
  failedCount: number;
  /** False when the stop is applied and broadcast but the server could not write its settings file. */
  persisted: boolean;
  robots: StopAllRobot[];
  /** True when the report was put together from per-robot stop commands (rate limit or older server). */
  viaFallback: boolean;
}

/** A report the operator must look at: a robot that did not stop, or a stop the server could not save. */
export function reportNeedsAttention(report: StopAllReport): boolean {
  return report.failedCount > 0 || !report.persisted || !report.success;
}

/** The answer of one attempt at POST /api/stop-all. */
export type StopAllAttempt =
  | { kind: 'report'; report: StopAllReport }
  /** 429 or 404: use the per-robot stop instead. */
  | { kind: 'fallback'; status: number }
  /** No usable answer: the stop is NOT confirmed. */
  | { kind: 'failed'; status: number; code: CommandFailureCode; detail: string | null; sessionExpired: boolean };

/** True for the answers that mean "the global route is not usable right now, stop robot by robot". */
export function shouldFallBackToPerRobot(status: number): boolean {
  return status === 429 || status === 404;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim().slice(0, 300) : null;
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

/** Reads the body of a 200 answer; null when it is not the shape the contract promises. */
export function parseStopAllBody(body: unknown): StopAllReport | null {
  if (!body || typeof body !== 'object') return null;
  const object = body as Record<string, unknown>;
  if (!Array.isArray(object.robots)) return null;
  const robots: StopAllRobot[] = [];
  for (const entry of object.robots) {
    if (!entry || typeof entry !== 'object') continue;
    const r = entry as Record<string, unknown>;
    const robotId = typeof r.robotId === 'number' ? r.robotId : Number(r.robotId);
    if (!Number.isFinite(robotId)) continue;
    robots.push({
      robotId,
      controllerId: text(r.controllerId),
      name: text(r.name) ?? `#${robotId}`,
      stopped: r.stopped === true,
      valvesOff: count(r.valvesOff),
      pumpsOff: count(r.pumpsOff),
      reservedBy: text(r.reservedBy),
      error: text(r.error),
    });
  }
  const stoppedCount = typeof object.stoppedCount === 'number' ? count(object.stoppedCount) : robots.filter((r) => r.stopped).length;
  const failedCount = typeof object.failedCount === 'number' ? count(object.failedCount) : robots.filter((r) => !r.stopped).length;
  return {
    success: object.success === true,
    stoppedCount,
    failedCount,
    persisted: object.persisted !== false,
    robots,
    viaFallback: false,
  };
}

/** Turns the status and body of one attempt into a StopAllAttempt. */
export function interpretStopAllResponse(status: number, ok: boolean, body: unknown): StopAllAttempt {
  if (ok) {
    const report = parseStopAllBody(body);
    if (report) return { kind: 'report', report };
    return { kind: 'failed', status, code: 'rejected', detail: null, sessionExpired: false };
  }
  if (shouldFallBackToPerRobot(status)) return { kind: 'fallback', status };
  const object = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const expiredCode = object.code === 'TOKEN_EXPIRED' || object.code === 'TOKEN_INVALID';
  return {
    kind: 'failed',
    status,
    code: failureCodeForStatus(status),
    detail: text(object.error),
    sessionExpired: status === 401 || (status === 403 && expiredCode),
  };
}

export interface StopAllRequestOptions {
  fetchImpl?: typeof fetch;
  /** The Authorization header source; the session's by default. */
  headers?: () => Record<string, string>;
  timeoutMs?: number;
}

/** One POST /api/stop-all (no body), never throwing: a network failure or a timeout is a 'failed' attempt with status 0. */
export async function requestStopAll(options: StopAllRequestOptions = {}): Promise<StopAllAttempt> {
  const doFetch = options.fetchImpl ?? fetch;
  const headers = options.headers ? options.headers() : authHeaders();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 3000);
  try {
    const res = await doFetch(apiUrl('/api/stop-all'), { method: 'POST', headers, signal: controller.signal });
    let body: unknown = null;
    try { body = await res.json(); } catch { /* an answer without a JSON body */ }
    return interpretStopAllResponse(res.status, res.ok, body);
  } catch (error) {
    return {
      kind: 'failed',
      status: 0,
      code: 'network',
      detail: error instanceof Error ? error.message.slice(0, 300) : null,
      sessionExpired: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** The same request, repeated once after a short pause when nobody answered (a network failure, not a refusal). */
export async function requestStopAllWithRetry(options: StopAllRequestOptions & { retryDelayMs?: number } = {}): Promise<StopAllAttempt> {
  const first = await requestStopAll(options);
  if (first.kind === 'failed' && first.code === 'network') {
    await new Promise<void>((resolve) => setTimeout(resolve, options.retryDelayMs ?? 250));
    return requestStopAll(options);
  }
  return first;
}

/** The keyboard shortcut of the STOP: a modifier chord that is never typed by accident, and never fires on a held key. */
export const STOP_ALL_SHORTCUT_LABEL = 'Ctrl+Shift+Space';

export function isStopAllShortcut(event: { code: string; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean; repeat: boolean }): boolean {
  return event.code === 'Space' && event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey && !event.repeat;
}
