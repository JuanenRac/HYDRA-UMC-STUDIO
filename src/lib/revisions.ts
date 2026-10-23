// =============================================================================
// HYDRA-UMC STUDIO - the revision of each robot: revisions.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The server gives every robot a revision (GET /api/robot/:id, and every answer of a command, a reservation or a
// release carries the new one). A write that sends it back as If-Match is refused with 412 when the robot changed in
// between, so this window never overwrites what someone else did to the robot without knowing it. This file keeps the
// last revision seen for each robot and decides when it is sent:
//   - never when none is known (the first write learns it), when another write to the same robot is still on its way
//     (its answer is what makes the revision stale, not a change by someone else), or after this window saved the
//     whole settings tree (that save changes the robot too);
//   - never for STOP, which is never conditional;
//   - by the mode chosen in this browser: off, standard (reservations, the table and the discrete commands; the
//     continuous ones - jog and speed - go unconditional) or strict (everything but STOP).
// The default is standard. No React in here.
// =============================================================================

export type ConditionalMode = 'off' | 'standard' | 'strict';

export const CONDITIONAL_MODE_KEY = 'hydra.conditionalWrites';
export const DEFAULT_CONDITIONAL_MODE: ConditionalMode = 'standard';

/** Commands sent many times a second while a button or a stick is held: a revision can not follow them. */
export const CONTINUOUS_COMMANDS: ReadonlySet<string> = new Set(['jog', 'speed', 'jogStep']);

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function loadConditionalMode(storage: StorageLike | null | undefined): ConditionalMode {
  try {
    const raw = storage?.getItem(CONDITIONAL_MODE_KEY);
    return raw === 'off' || raw === 'strict' || raw === 'standard' ? raw : DEFAULT_CONDITIONAL_MODE;
  } catch {
    return DEFAULT_CONDITIONAL_MODE;
  }
}

export function saveConditionalMode(storage: StorageLike | null | undefined, mode: ConditionalMode): ConditionalMode {
  try { storage?.setItem(CONDITIONAL_MODE_KEY, mode); } catch { /* the choice only lasts while the page lives */ }
  return mode;
}

/** Whether a command carries If-Match in a mode. Reservations are "claim" and "release". STOP never does. */
export function isConditional(mode: ConditionalMode, command: string): boolean {
  if (command === 'stop' || mode === 'off') return false;
  if (mode === 'strict') return true;
  return !CONTINUOUS_COMMANDS.has(command);
}

/** The revision in the body of an answer (`revision`), or null. */
export function revisionOf(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const value = (body as Record<string, unknown>).revision;
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : null;
}

/** The value of the If-Match header for a revision (quoted, as an ETag is). */
export function ifMatchHeader(revision: string): string {
  return `"${revision}"`;
}

interface Known { revision: string; seq: number }

export interface RevisionTracker {
  /** The If-Match value for a write to a robot, or null when none must be sent. Counts the write as on its way. */
  begin(robotId: number, command: string): { ifMatch: string | null; seq: number };
  /** The write was answered: keep the revision it carried (when it is the newest answer) and stop counting it. */
  finish(robotId: number, seq: number, revision: string | null): void;
  /** A revision learned some other way (the 412 answer, GET /api/robot/:id). */
  learn(robotId: number, revision: string | null): void;
  /** Forget what was known (the whole tree was saved from this window, or the user signed out). */
  forget(robotId?: number): void;
  known(robotId: number): string | null;
  setMode(mode: ConditionalMode): void;
  mode(): ConditionalMode;
}

export function createRevisionTracker(initialMode: ConditionalMode = DEFAULT_CONDITIONAL_MODE): RevisionTracker {
  let mode = initialMode;
  let counter = 0;
  const known = new Map<number, Known>();
  const inFlight = new Map<number, number>();
  return {
    begin(robotId, command) {
      counter += 1;
      const seq = counter;
      const busy = (inFlight.get(robotId) ?? 0) > 0;
      inFlight.set(robotId, (inFlight.get(robotId) ?? 0) + 1);
      const entry = known.get(robotId);
      const ifMatch = !busy && entry && isConditional(mode, command) ? ifMatchHeader(entry.revision) : null;
      return { ifMatch, seq };
    },
    finish(robotId, seq, revision) {
      const left = (inFlight.get(robotId) ?? 1) - 1;
      if (left <= 0) inFlight.delete(robotId); else inFlight.set(robotId, left);
      if (revision === null) {
        // An answer without a revision (a refusal, an older server): what was known may be stale now.
        if (left <= 0) known.delete(robotId);
        return;
      }
      const entry = known.get(robotId);
      if (!entry || seq >= entry.seq) known.set(robotId, { revision, seq });
    },
    learn(robotId, revision) {
      if (revision === null) { known.delete(robotId); return; }
      counter += 1;
      known.set(robotId, { revision, seq: counter });
    },
    forget(robotId) {
      if (robotId === undefined) known.clear(); else known.delete(robotId);
    },
    known(robotId) { return known.get(robotId)?.revision ?? null; },
    setMode(next) { mode = next; },
    mode() { return mode; },
  };
}

function browserStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** The tracker of this window, shared by the command path, the reservation calls and the settings screen. */
export const robotRevisions: RevisionTracker = createRevisionTracker(loadConditionalMode(browserStorage()));

/** Changes the mode of this window and keeps the choice in this browser. */
export function chooseConditionalMode(mode: ConditionalMode): void {
  robotRevisions.setMode(saveConditionalMode(browserStorage(), mode));
}
