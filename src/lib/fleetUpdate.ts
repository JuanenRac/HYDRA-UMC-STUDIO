// =============================================================================
// HYDRA-UMC STUDIO - src/lib/fleetUpdate.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// Updating every program installed on the device from Configuration: the progress file the SERVER reads from the tool of the device (GET /api/admin/fleet-update), the
// look (plan), the start of the update of the programs asked and the taking up of one that was cut. The server restarts at the end of its own update, so the answers fail
// for a while: the follower keeps asking, says how long it has waited, ends when the run ends and, after a limit of silence, says so and offers to look again instead of
// staying stuck.
import { asObject, asText } from './panelApi';
import { ServerHttpError, serverClient } from './serverClient';

export const FLEET_STATES = ['planned', 'running', 'done', 'failed', 'blocked', 'interrupted'] as const;
export type FleetState = (typeof FLEET_STATES)[number];
export const ROW_STATES = ['waiting', 'running', 'done', 'failed', 'rolled_back', 'interrupted', 'skipped', 'blocked'] as const;
export type RowState = (typeof ROW_STATES)[number];
export const ROW_ACTIONS = ['update', 'current', 'skip', 'review'] as const;
export type RowAction = (typeof ROW_ACTIONS)[number];
/** The steps of one program, in the order the device goes through them. */
export const FLEET_STEPS = ['disk', 'fetching', 'backup', 'building', 'installing', 'verifying', 'done'] as const;
export const FLEET_ERRORS = ['low_disk', 'fetch_failed', 'tag_mismatch', 'tag_unsigned', 'checkout_failed', 'backup_failed', 'build_failed', 'installer_failed', 'version_mismatch', 'not_healthy', 'journal_errors', 'sdk_not_importable', 'interrupted', 'unexpected',
  // the root helper of the device (signed packages)
  'signature_invalid', 'bad_package', 'wrong_python', 'missing_system_package', 'needs_first_setup', 'first_install_off', 'not_installed', 'not_newer', 'deploy_failed', 'restart_failed',
  'units_failed', 'account_failed', 'migration_failed', 'write_failed', 'download_failed', 'layout_unknown', 'no_earlier_release', 'rollback_failed'] as const;
/** Why the root helper did nothing with a request (the look on screen stays, with a new identifier). */
export const FLEET_REFUSALS = ['confirmation_needed', 'plan_old', 'plan_changed', 'totp_not_set_up', 'totp_locked', 'totp_required', 'totp_invalid'] as const;
export const FLEET_REASONS = ['special_stack', 'no_release', 'version_unreadable', 'installed_newer', 'unit_inactive', 'repo_dirty', 'goes_with_server', 'not_asked', 'no_checkout', 'migrated_needs_packages', 'migrated_no_package', 'own_package', 'needs_newer_rustc', 'no_signed_package', 'first_install'] as const;
/** What the server needs free to build and install, in MB (the device checks the same numbers). */
export const SERVER_NEEDS_MB = 2500;

export interface FleetRow {
  name: string; kind: string; repo: string; installed: string | null; latest: string | null; action: RowAction; reason: string; state: RowState; step: string; substep: string; substeps: number;
  detail: string; error: string; elapsedS: number; freeMb: number | null; needMb: number | null; unitRestored: boolean | null; log: Array<{ at: string; text: string }>;
  /** Root helper only: the version kept to go back to. */
  previous: string | null;
}
export interface FleetReport { id: string; mode: 'plan' | 'run'; state: FleetState; updatedAt: string; error: string; stoppedAt: string; requireSignedTags: boolean; rootFreeMb: number | null; workspaceFreeMb: number | null; services: FleetRow[]; helper: 'root' | null; planId: string; totpRequired: boolean }
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
    previous: asText(row.previous),
  }));
  return {
    id: String(body.id ?? ''), mode: body.mode === 'run' ? 'run' : 'plan', state: oneOf(FLEET_STATES, body.state, 'planned'), updatedAt: String(body.updatedAt ?? ''), error: String(body.error ?? ''),
    stoppedAt: String(body.stoppedAt ?? ''), requireSignedTags: body.requireSignedTags === true, rootFreeMb: whole(disk.rootFreeMb), workspaceFreeMb: whole(disk.workspaceFreeMb), services,
    helper: body.helper === 'root' ? 'root' : null, planId: String(body.planId ?? ''), totpRequired: body.helper === 'root' && body.totpRequired !== false,
  };
}

export function parseFleetStatus(data: unknown): FleetStatus {
  const body = asObject(data);
  return { applyEnabled: body.applyEnabled === true, busy: body.busy === true, report: parseFleetReport(body.report) };
}

export const runActive = (report: FleetReport | null): boolean => report !== null && report.state === 'running';
/** The programs the plan marks to update, in order. The root helper updates Studio from its own package; the other tool updates it with the server. */
export const updatable = (report: FleetReport | null): FleetRow[] => (report?.services ?? []).filter((row) => row.action === 'update' && (row.kind !== 'frontend' || report?.helper === 'root'));
/** How many programs are up to date, to be updated and left alone. */
export const summary = (report: FleetReport): { current: number; update: number; other: number } => {
  const current = report.services.filter((row) => row.action === 'current').length;
  const update = report.services.filter((row) => row.action === 'update').length;
  return { current, update, other: report.services.length - current - update };
};
export const refusalKey = (code: string): string | null => ((FLEET_REFUSALS as readonly string[]).includes(code) ? `fleet.refused_${code}` : null);
/** What the second step brings to the root helper: the identifier of the look shown and the one-time code. Empty for the other ways. */
export interface FleetConfirmation { planId?: string; code?: string }
export const confirmationOf = (report: FleetReport | null, code: string): FleetConfirmation => (report?.helper === 'root' ? { ...(report.planId ? { planId: report.planId } : {}), ...(code ? { code } : {}) } : {});
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

async function send(run: () => Promise<unknown>): Promise<Outcome> {
  try {
    return { ok: true, status: parseFleetStatus((await run()) ?? {}) };
  } catch (error) {
    if (!(error instanceof ServerHttpError)) return { ok: false, status: 0, reason: 'network' };
    const status = error.status;
    if (status === 404) return { ok: false, status: 404, reason: 'disabled' };
    if (status === 401 || status === 403) return { ok: false, status, reason: 'forbidden' };
    if (status === 409) return { ok: false, status: 409, reason: 'busy' };
    return { ok: false, status, reason: 'refused' };
  }
}

export const planFleet = (): Promise<Outcome> => send(() => serverClient.postAdminFleetUpdatePlan());
export const applyFleet = (services: string[], confirmation: FleetConfirmation = {}): Promise<Outcome> => {
  const body = { services, confirm: true as const, ...confirmation };
  return send(() => serverClient.postAdminFleetUpdateApply({ body }));
};
export const resumeFleet = (service: string, confirmation: FleetConfirmation = {}): Promise<Outcome> => {
  const body = { service, confirm: true as const, ...confirmation };
  return send(() => serverClient.postAdminFleetUpdateResume({ body }));
};
/** Back to the version kept (root helper only): the resume route with `rollback`. */
export const rollbackFleet = (service: string, confirmation: FleetConfirmation = {}): Promise<Outcome> => {
  const body = { service, confirm: true as const, rollback: true, ...confirmation };
  return send(() => serverClient.postAdminFleetUpdateResume({ body }));
};

export type FleetRead = { kind: 'status'; status: FleetStatus } | { kind: 'wait' } | { kind: 'stop' };

/** One look at the progress. A refused connection, a proxy that answers 502 to 504 while the server restarts and a body that is not the file all mean "wait". */
export async function readFleet(): Promise<FleetRead> {
  try {
    const body = asObject(await serverClient.getAdminFleetUpdate());
    return 'report' in body ? { kind: 'status', status: parseFleetStatus(body) } : { kind: 'wait' };
  } catch (error) {
    return error instanceof ServerHttpError && (error.status === 401 || error.status === 403) ? { kind: 'stop' } : { kind: 'wait' };
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
