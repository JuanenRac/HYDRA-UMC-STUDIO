// =============================================================================
// HYDRA-UMC STUDIO - src/lib/fleetUpdate.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// Updating every program installed on the device from Configuration: the progress file the SERVER reads from the tool of the device (GET /api/admin/fleet-update), the
// look (plan), the start of the update of the programs asked and the taking up of one that was cut. The server restarts at the end of its own update, so the answers fail
// for a while: the follower keeps asking, says how long it has waited, ends when the run ends and, after a limit of silence, says so and offers to look again instead of
// staying stuck.
import { apiUrl } from './apiBase';
import { asObject, asText } from './panelApi';
import { authFetch } from './session';

export const FLEET_STATES = ['planned', 'running', 'done', 'failed', 'blocked', 'interrupted'] as const;
export type FleetState = (typeof FLEET_STATES)[number];
export const ROW_STATES = ['waiting', 'running', 'done', 'failed', 'rolled_back', 'interrupted', 'skipped', 'blocked'] as const;
export type RowState = (typeof ROW_STATES)[number];
export const ROW_ACTIONS = ['update', 'current', 'skip', 'review'] as const;
export type RowAction = (typeof ROW_ACTIONS)[number];
/** The steps of one program, in the order the device goes through them. */
export const FLEET_STEPS = ['disk', 'fetching', 'backup', 'building', 'installing', 'verifying', 'done'] as const;
export const FLEET_ERRORS = ['low_disk', 'fetch_failed', 'tag_mismatch', 'tag_unsigned', 'checkout_failed', 'backup_failed', 'build_failed', 'installer_failed', 'version_mismatch', 'not_healthy', 'journal_errors', 'sdk_not_importable', 'interrupted', 'unexpected'] as const;
export const FLEET_REASONS = ['special_stack', 'no_release', 'version_unreadable', 'installed_newer', 'unit_inactive', 'repo_dirty', 'goes_with_server', 'not_asked', 'no_checkout'] as const;
/** What the server needs free to build and install, in MB (the device checks the same numbers). */
export const SERVER_NEEDS_MB = 2500;

export interface FleetRow {
  name: string; kind: string; repo: string; installed: string | null; latest: string | null; action: RowAction; reason: string; state: RowState; step: string; substep: string; substeps: number;
  detail: string; error: string; elapsedS: number; freeMb: number | null; needMb: number | null; unitRestored: boolean | null; log: Array<{ at: string; text: string }>;
}
export interface FleetReport { id: string; mode: 'plan' | 'run'; state: FleetState; updatedAt: string; error: string; stoppedAt: string; requireSignedTags: boolean; rootFreeMb: number | null; workspaceFreeMb: number | null; services: FleetRow[] }
export interface FleetStatus { applyEnabled: boolean; busy: boolean; report: FleetReport | null }

const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T => (typeof value === 'string' && (list as readonly string[]).includes(value) ? (value as T) : fallback);
const whole = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null);

export function parseFleetReport(data: unknown): FleetReport | null {
  const body = asObject(data);
  if (!Array.isArray(body.services) || !(FLEET_STATES as readonly string[]).includes(String(body.state))) return null;
  const disk = asObject(body.disk);
  const services = body.services.map((item) => asObject(item)).filter((row) => asText(row.name) !== null).map((row): FleetRow => ({
    name: String(row.name), kind: String(row.kind ?? 'svc'), repo: String(row.repo ?? ''), installed: asText(row.installed), latest: asText(row.latest), action: oneOf(ROW_ACTIONS, row.action, 'skip'),
    reason: String(row.reason ?? ''), state: oneOf(ROW_STATES, row.state, 'waiting'), step: String(row.step ?? ''), substep: String(row.substep ?? ''), substeps: whole(row.substeps) ?? 0,
    detail: String(row.detail ?? '').slice(0, 200), error: String(row.error ?? ''), elapsedS: whole(row.elapsedS) ?? 0, freeMb: whole(row.freeMb), needMb: whole(row.needMb),
    unitRestored: typeof row.unitRestored === 'boolean' ? row.unitRestored : null,
    log: Array.isArray(row.log) ? row.log.map((l) => asObject(l)).map((l) => ({ at: String(l.at ?? ''), text: String(l.text ?? '') })).slice(-30) : [],
  }));
  return {
    id: String(body.id ?? ''), mode: body.mode === 'run' ? 'run' : 'plan', state: oneOf(FLEET_STATES, body.state, 'planned'), updatedAt: String(body.updatedAt ?? ''), error: String(body.error ?? ''),
    stoppedAt: String(body.stoppedAt ?? ''), requireSignedTags: body.requireSignedTags === true, rootFreeMb: whole(disk.rootFreeMb), workspaceFreeMb: whole(disk.workspaceFreeMb), services,
  };
}

export function parseFleetStatus(data: unknown): FleetStatus {
  const body = asObject(data);
  return { applyEnabled: body.applyEnabled === true, busy: body.busy === true, report: parseFleetReport(body.report) };
}

export const runActive = (report: FleetReport | null): boolean => report !== null && report.state === 'running';
/** The programs the plan marks to update, in order. */
export const updatable = (report: FleetReport | null): FleetRow[] => (report?.services ?? []).filter((row) => row.action === 'update' && row.kind !== 'frontend');
/** A program that can be taken up again by itself. */
export const resumable = (row: FleetRow): boolean => row.state === 'interrupted' || row.state === 'failed' || row.state === 'rolled_back' || row.state === 'blocked';
/** How far a program is through its steps, 0 to 1. */
export function stepProgress(row: FleetRow): number {
  if (row.state === 'done') return 1;
  const index = (FLEET_STEPS as readonly string[]).indexOf(row.step);
  if (index < 0) return 0;
  return Math.min(0.95, index / (FLEET_STEPS.length - 1));
}
export const errorKey = (code: string): string => ((FLEET_ERRORS as readonly string[]).includes(code) ? `fleet.err_${code}` : 'fleet.err_unexpected');
export const reasonKey = (code: string): string | null => ((FLEET_REASONS as readonly string[]).includes(code) ? `fleet.reason_${code}` : null);
/** Whether there is too little disk for the server to be built, given what the last look found. */
export const diskLowForServer = (report: FleetReport | null): boolean => {
  if (!report) return false;
  const server = report.services.find((row) => row.name === 'server');
  if (!server || server.action !== 'update') return false;
  const free = Math.min(report.rootFreeMb ?? Number.MAX_SAFE_INTEGER, report.workspaceFreeMb ?? Number.MAX_SAFE_INTEGER);
  return free < SERVER_NEEDS_MB;
};

export type Outcome = { ok: true; status: FleetStatus } | { ok: false; status: number; reason: 'disabled' | 'forbidden' | 'busy' | 'refused' | 'network' };

async function send(route: string, body?: unknown): Promise<Outcome> {
  try {
    const res = await authFetch(apiUrl(route), body === undefined ? { method: 'POST' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.status === 404) return { ok: false, status: 404, reason: 'disabled' };
    if (res.status === 401 || res.status === 403) return { ok: false, status: res.status, reason: 'forbidden' };
    if (res.status === 409) return { ok: false, status: 409, reason: 'busy' };
    if (!res.ok) return { ok: false, status: res.status, reason: 'refused' };
    return { ok: true, status: parseFleetStatus(await res.json().catch(() => ({}))) };
  } catch {
    return { ok: false, status: 0, reason: 'network' };
  }
}

export const planFleet = (): Promise<Outcome> => send('/api/admin/fleet-update/plan', {});
export const applyFleet = (services: string[]): Promise<Outcome> => send('/api/admin/fleet-update/apply', { services, confirm: true });
export const resumeFleet = (service: string): Promise<Outcome> => send('/api/admin/fleet-update/resume', { service, confirm: true });

export type FleetRead = { kind: 'status'; status: FleetStatus } | { kind: 'wait' } | { kind: 'stop' };

/** One look at the progress. A refused connection, a proxy that answers 502 to 504 while the server restarts and a body that is not the file all mean "wait". */
export async function readFleet(): Promise<FleetRead> {
  try {
    const res = await authFetch(apiUrl('/api/admin/fleet-update'));
    if (res.status === 401 || res.status === 403) return { kind: 'stop' };
    if (!res.ok) return { kind: 'wait' };
    const body = asObject(await res.json().catch(() => ({})));
    return 'report' in body ? { kind: 'status', status: parseFleetStatus(body) } : { kind: 'wait' };
  } catch {
    return { kind: 'wait' };
  }
}

export interface FollowFleetOptions {
  read: () => Promise<FleetRead>;
  onStatus: (status: FleetStatus) => void;
  onWaiting: (silentSeconds: number) => void;
  intervalMs?: number;
  silenceLimitMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  cancelled?: () => boolean;
}
export type FollowFleetEnd = { kind: 'ended'; status: FleetStatus } | { kind: 'silent'; seconds: number } | { kind: 'stopped'; reason: 'forbidden' | 'cancelled' };

/** Follows the run until the file stops saying it is running, asking again and again while the server is away; gives up with a message only after the limit of silence. */
export async function followFleet(options: FollowFleetOptions): Promise<FollowFleetEnd> {
  const interval = options.intervalMs ?? 2000;
  const limit = options.silenceLimitMs ?? 300_000;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); }));
  let lastAnswer = now();
  for (;;) {
    if (options.cancelled?.()) return { kind: 'stopped', reason: 'cancelled' };
    const seen = await options.read();
    if (options.cancelled?.()) return { kind: 'stopped', reason: 'cancelled' };
    if (seen.kind === 'stop') return { kind: 'stopped', reason: 'forbidden' };
    if (seen.kind === 'status') {
      lastAnswer = now();
      options.onStatus(seen.status);
      if (!runActive(seen.status.report)) return { kind: 'ended', status: seen.status };
    } else {
      const silent = now() - lastAnswer;
      options.onWaiting(Math.floor(silent / 1000));
      if (silent >= limit) return { kind: 'silent', seconds: Math.floor(silent / 1000) };
    }
    await sleep(interval);
  }
}
