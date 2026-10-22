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
  | 'claimed'         // 409: another operator holds the robot (a server that gives no reason)
  | 'claim_other_account'     // 409 other-account: another account holds the robot
  | 'claim_other_controller'  // 409 other-controller: this account holds it from another window or device
  | 'claim_controller_required' // 409 or 400 controller-id-required: the reservation names a controller and this request sent none
  | 'jog_not_armed'  // 403 jog-not-armed: the jog has to be armed first
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
  /** The stable `code` the server put next to its explanation (for example "other-controller"), when there was one. */
  serverCode: string | null;
  /** Non-blocking remarks the server attached to an accepted command (a speed outside its range, for example). */
  warnings: string[];
}

/** The failure code for a status, refined by the stable `code` of the answer when the server gave one. */
export function failureCodeFor(status: number, serverCode: string | null): CommandFailureCode {
  if (serverCode === 'other-account') return 'claim_other_account';
  if (serverCode === 'other-controller') return 'claim_other_controller';
  if (serverCode === 'controller-id-required') return 'claim_controller_required';
  if (serverCode === 'jog-not-armed') return 'jog_not_armed';
  return failureCodeForStatus(status);
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
  if (ok) return { ok: true, status, code: null, detail: null, serverCode: null, warnings };
  const serverCode = textOf(object.code);
  return { ok: false, status, code: failureCodeFor(status, serverCode), detail: textOf(object.error), serverCode, warnings };
}

export function networkFailure(detail?: string): CommandResult {
  return { ok: false, status: 0, code: 'network', detail: detail ? detail.slice(0, 300) : null, serverCode: null, warnings: [] };
}

/** A problem the interface keeps on screen until it is dismissed (or retried). */
export interface CommandIssue {
  id: number;
  /** Which sentence to show: a failure code, or one of the client-side codes. */
  code: CommandFailureCode | 'jog_jump' | 'estop_failed' | 'warnings' | 'power_failed' | 'import_invalid' | 'sim_blocked' | 'jog_limit' | 'temperature_limit' | 'jog_server_limit';
  command: string;
  /** Robots the issue is about. */
  robotIds: number[];
  detail: string | null;
}

/** For a bulk command (the global stop): which robots failed, and the most telling code among them. */
export function summarizeBulk(results: { robotId: number; result: CommandResult }[]): { failed: number[]; code: CommandFailureCode | null; detail: string | null } {
  const failed = results.filter((r) => !r.result.ok);
  if (failed.length === 0) return { failed: [], code: null, detail: null };
  const order: CommandFailureCode[] = ['network', 'session_expired', 'forbidden', 'jog_not_armed', 'server', 'claim_other_account', 'claim_other_controller', 'claim_controller_required', 'claimed', 'not_found', 'rejected'];
  const present = new Set(failed.map((r) => r.result.code));
  const code = order.find((c) => present.has(c)) ?? 'rejected';
  const detail = failed.find((r) => r.result.code === code)?.result.detail ?? null;
  return { failed: failed.map((r) => r.robotId), code, detail };
}
