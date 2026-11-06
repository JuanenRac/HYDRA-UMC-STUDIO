// =============================================================================
// HYDRA-UMC STUDIO - src/lib/planningApi.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// What the planning view reads and asks, all of it through the relay of the server to the local services (/api/ai/<service>/...):
//   - the dry run of a plan (POST /plan/simulate of the semantic planner). It never executes anything: an answer that does not say
//     `executable: false` and `executed: false` is refused as malformed instead of being shown;
//   - the estimates of the job dispatcher (GET /dispatch/eta), read only;
//   - the remaining-useful-life estimate of the anomaly detector (POST /rul), from points typed or pasted;
//   - whether the window statistics of the data lake are switched on (a read of /windows: 404 means off);
//   - a version train, shown from the file written by `train plan --json` of the updater (read from a file on this computer, never
//     from the network, and never applied).
// Every reading is defensive: a service whose switch is off answers 404 and the screen says so; nothing here throws.
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export type Failure = 'off' | 'forbidden' | 'unreachable' | 'network' | 'invalid' | 'malformed' | 'http';
export type Result<T> = { ok: true; value: T } | { ok: false; failure: Failure; status?: number; message?: string };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const str = (value: unknown): string | null => (typeof value === 'string' ? value : null);

function failureFor(status: number, body: unknown): Result<never> {
  if (status === 404) return { ok: false, failure: 'off', status };
  if (status === 401 || status === 403) return { ok: false, failure: 'forbidden', status };
  if (status === 503) return { ok: false, failure: 'unreachable', status };
  if (status === 400 || status === 413) return { ok: false, failure: 'invalid', status, message: isObject(body) && typeof body.error === 'string' ? body.error : undefined };
  return { ok: false, failure: 'http', status };
}

async function call(path: string, init?: RequestInit): Promise<{ status: number; body: unknown } | null> {
  try {
    const res = await authFetch(apiUrl(path), init);
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ the dry run of a plan

export const MAX_PLAN_STEPS = 10000;

/** The text of a request for the dry run: a JSON object with a list of steps (at most MAX_PLAN_STEPS); null otherwise. */
export function parsePlanRequest(text: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(parsed) || !Array.isArray(parsed.steps) || parsed.steps.length === 0 || parsed.steps.length > MAX_PLAN_STEPS) return null;
  return parsed;
}

export interface Violation {
  rule: string;
  stepId: string | null;
  message: string;
  suggestion: string | null;
}

export interface TimelineEntry {
  stepId: string;
  robot: string;
  primitive: string;
  startMs: number;
  endMs: number;
}

export interface Simulation {
  /** `unchecked` is what the kinematic check says when part of the plan (the orientation of the tool) is not shown: it is never an acceptance. */
  verdict: 'accepted' | 'rejected' | 'unchecked';
  violations: Violation[];
  /** What was not shown (only with the verdict `unchecked`, or a rejection that also left something unchecked). */
  unchecked: Violation[];
  timeline: TimelineEntry[];
  makespanMs: number | null;
}

function parseViolations(list: unknown): Violation[] {
  const found: Violation[] = [];
  if (!Array.isArray(list)) return found;
  for (const item of list) {
    if (!isObject(item) || typeof item.rule !== 'string') continue;
    const suggestion = item.suggestion;
    found.push({
      rule: item.rule,
      stepId: str(item.step_id),
      message: str(item.message) ?? '',
      suggestion: suggestion === undefined || suggestion === null ? null : typeof suggestion === 'string' ? suggestion : JSON.stringify(suggestion),
    });
  }
  return found;
}

/** The answer of the dry run; null when it is not the answer of a dry run (including one that claims to have executed or to be executable). */
export function parseSimulation(raw: unknown): Simulation | null {
  if (!isObject(raw)) return null;
  if (raw.executable !== false || raw.executed !== false) return null;
  if (raw.verdict !== 'accepted' && raw.verdict !== 'rejected' && raw.verdict !== 'unchecked') return null;
  const violations = parseViolations(raw.violations);
  const unchecked = parseViolations(raw.unchecked);
  const timeline: TimelineEntry[] = [];
  if (Array.isArray(raw.timeline)) {
    for (const item of raw.timeline) {
      if (!isObject(item)) continue;
      const start = num(item.start_ms);
      const end = num(item.end_ms);
      if (str(item.step_id) === null || start === null || end === null) continue;
      timeline.push({ stepId: item.step_id as string, robot: str(item.robot) ?? '', primitive: str(item.primitive) ?? '', startMs: start, endMs: end });
    }
  }
  // an accepted plan that lists a violation is not an accepted plan
  if (raw.verdict === 'accepted' && (violations.length > 0 || unchecked.length > 0)) return null;
  // `unchecked` needs something that was not shown, and a broken limit makes it a rejection, never an unchecked
  if (raw.verdict === 'unchecked' && (violations.length > 0 || unchecked.length === 0)) return null;
  return { verdict: raw.verdict, violations, unchecked, timeline, makespanMs: num(raw.makespan_ms) };
}

export async function simulatePlan(request: Record<string, unknown>): Promise<Result<Simulation>> {
  const answer = await call('/api/ai/semantic-planner/plan/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
  if (!answer) return { ok: false, failure: 'network' };
  if (answer.status !== 200) return failureFor(answer.status, answer.body);
  const value = parseSimulation(answer.body);
  return value ? { ok: true, value } : { ok: false, failure: 'malformed', status: answer.status };
}

/** The kinematic check of the same plan (POST /plan/trajectory-check): the verdict can be `unchecked`, which the screen must never paint as an acceptance. */
export async function checkTrajectory(request: Record<string, unknown>): Promise<Result<Simulation>> {
  const answer = await call('/api/ai/semantic-planner/plan/trajectory-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
  if (!answer) return { ok: false, failure: 'network' };
  if (answer.status !== 200) return failureFor(answer.status, answer.body);
  const value = parseSimulation(answer.body);
  return value ? { ok: true, value } : { ok: false, failure: 'malformed', status: answer.status };
}

// ------------------------------------------------------------------ the estimates of the dispatcher

export interface EtaJob {
  jobId: string;
  status: string;
  estimated: boolean;
  robotId: string | null;
  startMs: number | null;
  endMs: number | null;
  durationMs: number | null;
  /** Why there is no estimate (only when `estimated` is false). */
  reason: string | null;
  lowMs: number | null;
  highMs: number | null;
}

export interface Eta {
  generatedAtMs: number;
  drainMs: number | null;
  jobs: EtaJob[];
}

export function parseEta(raw: unknown): Eta | null {
  if (!isObject(raw) || !Array.isArray(raw.jobs)) return null;
  const generatedAtMs = num(raw.generatedAtMs);
  if (generatedAtMs === null) return null;
  const jobs: EtaJob[] = [];
  for (const item of raw.jobs) {
    if (!isObject(item) || typeof item.jobId !== 'string' || typeof item.status !== 'string') continue;
    jobs.push({
      jobId: item.jobId,
      status: item.status,
      estimated: item.estimated === true,
      robotId: str(item.robotId),
      startMs: num(item.startMs),
      endMs: num(item.endMs),
      durationMs: num(item.durationMs),
      reason: str(item.reason),
      lowMs: num(item.endLowMs),
      highMs: num(item.endHighMs),
    });
  }
  return { generatedAtMs, drainMs: num(raw.drainMs), jobs };
}

export async function loadEta(): Promise<Result<Eta>> {
  const answer = await call('/api/ai/job-dispatcher/dispatch/eta');
  if (!answer) return { ok: false, failure: 'network' };
  if (answer.status !== 200) return failureFor(answer.status, answer.body);
  const value = parseEta(answer.body);
  return value ? { ok: true, value } : { ok: false, failure: 'malformed', status: answer.status };
}

/** "3 min 20 s" style text for a duration in milliseconds. */
export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return '-';
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

// ------------------------------------------------------------------ the remaining useful life

export const MAX_RUL_POINTS = 1000;

export interface RulPoint {
  t: number;
  score: number;
}

/** Points typed or pasted, one per line as `seconds, score` (a comma, a semicolon, a tab or spaces between them); null when a line is not that or there are too many. */
export function parseRulPoints(text: string): RulPoint[] | null {
  const points: RulPoint[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') continue;
    const parts = line.split(/[\s,;]+/).filter(Boolean);
    if (parts.length !== 2) return null;
    const t = Number(parts[0]);
    const score = Number(parts[1]);
    if (!Number.isFinite(t) || !Number.isFinite(score)) return null;
    points.push({ t, score });
    if (points.length > MAX_RUL_POINTS) return null;
  }
  return points.length > 0 ? points : null;
}

export const RUL_STATUSES = ['insufficient_data', 'not_rising', 'limit_reached', 'estimated'] as const;
export type RulStatus = (typeof RUL_STATUSES)[number];

export interface RulEstimate {
  status: RulStatus;
  points: number | null;
  slopePerDay: number | null;
  currentValue: number | null;
  daysToLimit: number | null;
  daysLow: number | null;
  daysHigh: number | null;
}

export function parseRul(raw: unknown): RulEstimate | null {
  if (!isObject(raw) || !(RUL_STATUSES as readonly unknown[]).includes(raw.status)) return null;
  return {
    status: raw.status as RulStatus,
    points: num(raw.points),
    slopePerDay: num(raw.slopePerDay),
    currentValue: num(raw.currentValue),
    daysToLimit: num(raw.daysToLimit),
    daysLow: num(raw.daysLow),
    daysHigh: num(raw.daysHigh),
  };
}

export async function estimateRul(points: RulPoint[], limit: number): Promise<Result<RulEstimate>> {
  const answer = await call('/api/ai/anomaly-detector/rul', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ points, limit }) });
  if (!answer) return { ok: false, failure: 'network' };
  if (answer.status !== 200) return failureFor(answer.status, answer.body);
  const value = parseRul(answer.body);
  return value ? { ok: true, value } : { ok: false, failure: 'malformed', status: answer.status };
}

// ------------------------------------------------------------------ the switches of the data lake

export type SwitchState = 'on' | 'off' | 'unknown';

/** Are the window statistics of the data lake on? A data lake with the switch off answers 404; one with it on answers 400 to a read without parameters. */
export async function probeWindowStatistics(): Promise<SwitchState> {
  const answer = await call('/api/ai/datalake/windows');
  if (!answer) return 'unknown';
  if (answer.status === 404) return 'off';
  if (answer.status === 200 || answer.status === 400) return 'on';
  return 'unknown';
}

// ------------------------------------------------------------------ a version train, as `train plan --json` wrote it

export const TRAIN_ACTIONS = ['install', 'update', 'downgrade', 'keep', 'blocked'] as const;
export type TrainAction = (typeof TRAIN_ACTIONS)[number];

export interface TrainItem {
  name: string;
  action: TrainAction;
  version: string;
  installedVersion: string | null;
  reason: string | null;
}

export interface TrainPlan {
  train: string;
  ok: boolean;
  problems: string[];
  items: TrainItem[];
}

/** The output of `train plan --json` (schema 1.x); null when it is not that. A newer major version is refused instead of guessed at. */
export function parseTrainPlan(text: string): TrainPlan | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(raw) || typeof raw.schema_version !== 'string' || !/^1\.\d+$/.test(raw.schema_version)) return null;
  if (typeof raw.train !== 'string' || typeof raw.ok !== 'boolean' || !Array.isArray(raw.items)) return null;
  const items: TrainItem[] = [];
  for (const item of raw.items) {
    if (!isObject(item) || typeof item.name !== 'string' || !(TRAIN_ACTIONS as readonly unknown[]).includes(item.action)) return null;
    items.push({
      name: item.name,
      action: item.action as TrainAction,
      version: str(item.version) ?? '',
      installedVersion: str(item.installed_version),
      reason: str(item.reason),
    });
  }
  const problems = Array.isArray(raw.problems) ? raw.problems.filter((p): p is string => typeof p === 'string') : [];
  return { train: raw.train, ok: raw.ok, problems, items };
}
