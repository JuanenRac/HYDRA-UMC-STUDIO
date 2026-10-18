// =============================================================================
// HYDRA-UMC STUDIO - what a robot command answered: commandResult.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// POST /api/robot/:id/command used to be fire-and-forget: a failure only rolled the optimistic change back, so a
// STOP that never reached the server looked exactly like one that did. Every answer is now turned into a typed
// result, and a failure into a code the interface can say out loud in the user's language.
// =============================================================================

/** Why a command did not reach the robot, as a code the interface has a translated sentence for. */
export type CommandFailureCode =
  | 'session_expired' // 401: the access token ran out (a refresh is tried first)
  | 'forbidden'       // 403: this account may not do that
  | 'not_found'       // 404: the server knows no such robot
  | 'claimed'         // 409: another operator holds the robot
  | 'rejected'        // any other 4xx: the server refused the command
  | 'server'          // 5xx
  | 'network';        // no answer at all

export interface CommandResult {
  ok: boolean;
  /** HTTP status; 0 when there was no answer. */
  status: number;
  code: CommandFailureCode | null;
  /** The server's own explanation, when it gave one (kept verbatim; it is shown next to the translated sentence). */
  detail: string | null;
  /** Non-blocking remarks the server attached to an accepted command (a speed outside its range, for example). */
  warnings: string[];
}

export function failureCodeForStatus(status: number): CommandFailureCode {
  if (status === 0) return 'network';
  if (status === 401) return 'session_expired';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'claimed';
  if (status >= 500) return 'server';
  return 'rejected';
}

function textOf(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim().slice(0, 300) : null;
}

/** Reads the answer of a command: the status, and the `error` / `warnings` of a JSON body when there is one. */
export function interpretCommandResponse(status: number, ok: boolean, body: unknown): CommandResult {
  const object = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  // The server's warnings are strings or objects with a `message` ({robotId, field, requested, message}).
  const warnings = Array.isArray(object.warnings)
    ? object.warnings
      .map((w) => textOf(w && typeof w === 'object' ? (w as Record<string, unknown>).message : w))
      .filter((w): w is string => w !== null)
    : [];
  if (ok) return { ok: true, status, code: null, detail: null, warnings };
  return { ok: false, status, code: failureCodeForStatus(status), detail: textOf(object.error), warnings };
}

export function networkFailure(detail?: string): CommandResult {
  return { ok: false, status: 0, code: 'network', detail: detail ? detail.slice(0, 300) : null, warnings: [] };
}

/** A problem the interface keeps on screen until it is dismissed (or retried). */
export interface CommandIssue {
  id: number;
  /** Which sentence to show: a failure code, or one of the client-side codes. */
  code: CommandFailureCode | 'jog_jump' | 'estop_failed' | 'warnings' | 'power_failed' | 'import_invalid';
  command: string;
  /** Robots the issue is about. */
  robotIds: number[];
  detail: string | null;
}

/** For a bulk command (the global stop): which robots failed, and the most telling code among them. */
export function summarizeBulk(results: { robotId: number; result: CommandResult }[]): { failed: number[]; code: CommandFailureCode | null; detail: string | null } {
  const failed = results.filter((r) => !r.result.ok);
  if (failed.length === 0) return { failed: [], code: null, detail: null };
  const order: CommandFailureCode[] = ['network', 'session_expired', 'forbidden', 'server', 'claimed', 'not_found', 'rejected'];
  const present = new Set(failed.map((r) => r.result.code));
  const code = order.find((c) => present.has(c)) ?? 'rejected';
  const detail = failed.find((r) => r.result.code === code)?.result.detail ?? null;
  return { failed: failed.map((r) => r.robotId), code, detail };
}
