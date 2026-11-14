// =============================================================================
// HYDRA-UMC STUDIO - src/lib/selfUpdate.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// Updating the programs of the machine from Configuration: what the SERVER reports (GET /api/admin/self-update), the start of an update or of a way back,
// and the following of the job until it ends. The server restarts in the middle of its own update, so the answers fail for a while: the follower keeps
// asking (a short interval, a limit of time with a message, never a screen that waits for ever) and ends when the job ends, whatever it says.
import { asObject, asText } from './panelApi';
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export const SELF_UPDATE_COMPONENTS = ['server', 'studio', 'os-agent'] as const;
export type SelfUpdateComponent = (typeof SELF_UPDATE_COMPONENTS)[number];
export const SELF_UPDATE_STEPS = ['checking', 'downloading', 'verifying', 'applying', 'restarting', 'done', 'failed'] as const;
export type SelfUpdateStep = (typeof SELF_UPDATE_STEPS)[number];
/** The steps shown as a line of progress (failed is not a step but the end of one). */
export const PROGRESS_STEPS = ['checking', 'downloading', 'verifying', 'applying', 'restarting', 'done'] as const;
export const SELF_UPDATE_FAILURES = [
  'no_release', 'already_current', 'no_signed_package', 'download_failed', 'package_too_large', 'signature_invalid',
  'no_earlier_release', 'start_failed', 'rolled_back', 'deploy_failed', 'timeout', 'interrupted',
] as const;

export type ItemState = 'current' | 'behind' | 'ahead' | 'unknown';
export interface SelfUpdateItem { id: SelfUpdateComponent; repo: string; installed: string | null; previous: string | null; latest: string | null; state: ItemState; signedPackage: boolean }
export interface SelfUpdateLogLine { at: string; step: SelfUpdateStep; text: string }
export interface SelfUpdateJob {
  id: string; action: 'apply' | 'rollback'; component: SelfUpdateComponent; state: SelfUpdateStep;
  fromVersion: string | null; targetVersion: string | null; startedAt: string; updatedAt: string; error: string | null; detail: string; log: SelfUpdateLogLine[]; by: string;
}
export interface SelfUpdateStatus { checkedAt: string | null; owner: string; rateLimited: boolean; items: SelfUpdateItem[]; applyEnabled: boolean; job: SelfUpdateJob | null }

const isComponent = (value: unknown): value is SelfUpdateComponent => typeof value === 'string' && (SELF_UPDATE_COMPONENTS as readonly string[]).includes(value);
const isStep = (value: unknown): value is SelfUpdateStep => typeof value === 'string' && (SELF_UPDATE_STEPS as readonly string[]).includes(value);

export function parseSelfUpdateJob(data: unknown): SelfUpdateJob | null {
  const body = asObject(data);
  const id = asText(body.id);
  if (!id || !isComponent(body.component) || !isStep(body.state)) return null;
  const log = Array.isArray(body.log)
    ? body.log.map((line) => asObject(line)).filter((line) => isStep(line.step) && typeof line.text === 'string')
      .map((line) => ({ at: String(line.at ?? ''), step: line.step as SelfUpdateStep, text: String(line.text) })).slice(-60)
    : [];
  return {
    id, action: body.action === 'rollback' ? 'rollback' : 'apply', component: body.component, state: body.state,
    fromVersion: asText(body.fromVersion), targetVersion: asText(body.targetVersion), startedAt: String(body.startedAt ?? ''), updatedAt: String(body.updatedAt ?? ''),
    error: asText(body.error), detail: String(body.detail ?? '').slice(0, 300), log, by: String(body.by ?? ''),
  };
}

export function parseSelfUpdateStatus(data: unknown): SelfUpdateStatus {
  const body = asObject(data);
  const items = Array.isArray(body.items)
    ? body.items.map((entry) => asObject(entry)).filter((entry) => isComponent(entry.id)).map((entry): SelfUpdateItem => ({
      id: entry.id as SelfUpdateComponent, repo: String(entry.repo ?? ''), installed: asText(entry.installed), previous: asText(entry.previous), latest: asText(entry.latest),
      state: entry.state === 'current' || entry.state === 'behind' || entry.state === 'ahead' ? entry.state : 'unknown', signedPackage: entry.signedPackage === true,
    }))
    : [];
  return { checkedAt: asText(body.checkedAt), owner: String(body.owner ?? ''), rateLimited: body.rateLimited === true, items, applyEnabled: body.applyEnabled === true, job: parseSelfUpdateJob(body.job) };
}

/** Whether a job is still going on (the server may be restarting; it has not said it ended). */
export const jobRunning = (job: SelfUpdateJob | null): boolean => job !== null && job.state !== 'done' && job.state !== 'failed';

/** The index of the step of the line of progress a job is at (-1 when it failed before the first one). */
export function progressIndex(job: SelfUpdateJob): number {
  if (job.state === 'failed') return Math.max(-1, ...job.log.map((line) => PROGRESS_STEPS.indexOf(line.step as (typeof PROGRESS_STEPS)[number])).filter((index) => index >= 0));
  return PROGRESS_STEPS.indexOf(job.state as (typeof PROGRESS_STEPS)[number]);
}

/** The translation key of the sentence that says why a job failed. */
export const failureKey = (code: string | null): string => (code !== null && (SELF_UPDATE_FAILURES as readonly string[]).includes(code) ? `selfupdate.err_${code}` : 'selfupdate.err_generic');

export type StartResult = { ok: true; job: SelfUpdateJob } | { ok: false; status: number; reason: 'disabled' | 'forbidden' | 'busy' | 'refused' | 'network' };

/** Asks the server to start an update (or a way back) of one program. The confirmation travels with it; Studio asks the person before it calls this. */
export async function startSelfUpdate(action: 'apply' | 'rollback', component: SelfUpdateComponent): Promise<StartResult> {
  try {
    const res = await authFetch(apiUrl(`/api/admin/self-update/${action}`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ component, confirm: true }) });
    if (res.status === 404) return { ok: false, status: 404, reason: 'disabled' };
    if (res.status === 401 || res.status === 403) return { ok: false, status: res.status, reason: 'forbidden' };
    if (res.status === 409) return { ok: false, status: 409, reason: 'busy' };
    if (!res.ok) return { ok: false, status: res.status, reason: 'refused' };
    const job = parseSelfUpdateJob(await res.json().catch(() => ({})));
    return job ? { ok: true, job } : { ok: false, status: res.status, reason: 'refused' };
  } catch {
    return { ok: false, status: 0, reason: 'network' };
  }
}

export type PollRead = { kind: 'job'; job: SelfUpdateJob } | { kind: 'wait' } | { kind: 'stop'; reason: 'forbidden' | 'disabled' };

/** One look at the job. A refused connection, a proxy that answers 502 to 504 while the server restarts and a body that is not a job all mean "wait": none of them says the update failed. */
export async function readJob(id: string): Promise<PollRead> {
  try {
    const res = await authFetch(apiUrl(`/api/admin/self-update/jobs/${encodeURIComponent(id)}`));
    if (res.status === 401 || res.status === 403) return { kind: 'stop', reason: 'forbidden' };
    if (!res.ok) return { kind: 'wait' };
    const job = parseSelfUpdateJob(await res.json().catch(() => ({})));
    return job && job.id === id ? { kind: 'job', job } : { kind: 'wait' };
  } catch {
    return { kind: 'wait' };
  }
}

export interface FollowOptions {
  id: string;
  read: (id: string) => Promise<PollRead>;
  onJob: (job: SelfUpdateJob) => void;
  /** Called on every look that got no answer, with the seconds since the last answer. */
  onWaiting: (silentSeconds: number) => void;
  intervalMs?: number;
  /** How long without an answer before giving up with a message (the server may take a while to come back). */
  silenceLimitMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  cancelled?: () => boolean;
}
export type FollowEnd = { kind: 'ended'; job: SelfUpdateJob } | { kind: 'silent'; seconds: number } | { kind: 'stopped'; reason: 'forbidden' | 'disabled' | 'cancelled' };

/** Follows a job until it ends (done or failed), asking again and again while the server is away; gives up only after `silenceLimitMs` without a single answer. */
export async function followJob(options: FollowOptions): Promise<FollowEnd> {
  const interval = options.intervalMs ?? 1500;
  const limit = options.silenceLimitMs ?? 240_000;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); }));
  let lastAnswer = now();
  for (;;) {
    if (options.cancelled?.()) return { kind: 'stopped', reason: 'cancelled' };
    const seen = await options.read(options.id);
    if (options.cancelled?.()) return { kind: 'stopped', reason: 'cancelled' };
    if (seen.kind === 'stop') return { kind: 'stopped', reason: seen.reason };
    if (seen.kind === 'job') {
      lastAnswer = now();
      options.onJob(seen.job);
      if (!jobRunning(seen.job)) return { kind: 'ended', job: seen.job };
    } else {
      const silent = now() - lastAnswer;
      options.onWaiting(Math.floor(silent / 1000));
      if (silent >= limit) return { kind: 'silent', seconds: Math.floor(silent / 1000) };
    }
    await sleep(interval);
  }
}
