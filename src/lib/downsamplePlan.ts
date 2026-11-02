// =============================================================================
// HYDRA-UMC STUDIO - src/lib/downsamplePlan.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The tier plan of the data lake (how long raw points are kept and how they are rolled up), edited from the Telemetry panel.
//
// The checks here are the same, rule by rule, as the ones the data lake makes when it receives a plan (shape, then coherence, then
// known kinds), and they are strict: a plan that fails any of them cannot be saved from this screen. The data lake still checks the
// plan again on its side, so this is a quick answer while typing, never the only guard. The data lake has no switch to relax its
// rules, so neither has this screen.
//
// Everything goes through the server (/api/telemetry/downsample-plan, administrators only). Every reading is defensive and nothing
// here throws.
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export const MAX_TIERS = 1000;
export const MAX_FINE_PER_COARSE = 1440;
const UNITS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000, y: 31_536_000_000 };
const MAX_DURATION_MS = 100 * UNITS.y;
const TIER_KEYS = ['kind', 'field', 'raw', 'bucket', 'fineBucket', 'rollupRetention', 'fineRetention'] as const;

export type DurationKey = 'raw' | 'bucket' | 'fineBucket' | 'rollupRetention' | 'fineRetention';

/** A row of the editor: every cell is the text the person typed ('' = not set). */
export interface TierDraft {
  kind: string;
  field: string;
  raw: string;
  bucket: string;
  fineBucket: string;
  rollupRetention: string;
  fineRetention: string;
}

export interface PlanDraft {
  tiers: TierDraft[];
  delete: boolean;
}

export const emptyTier = (): TierDraft => ({ kind: '', field: '*', raw: '', bucket: '', fineBucket: '', rollupRetention: '', fineRetention: '' });

// ------------------------------------------------------------------ durations

/** `90s`, `1m`, `1h`, `30d`, `2w`, `5y` or a whole number of milliseconds -> milliseconds; null when it is neither or out of range. */
export function parseDuration(text: string): number | null {
  const value = text.trim().toLowerCase();
  let ms: number;
  if (/^\d+$/.test(value)) {
    ms = Number(value);
  } else {
    const match = /^(\d+)([smhdwy])$/.exec(value);
    if (!match) return null;
    ms = Number(match[1]) * UNITS[match[2]];
  }
  if (!Number.isSafeInteger(ms) || ms <= 0 || ms > MAX_DURATION_MS) return null;
  return ms;
}

/** Milliseconds as the shortest exact text (`3600000` -> `1h`), for showing what the data lake stores. */
export function formatDuration(ms: number): string {
  for (const unit of ['y', 'w', 'd', 'h', 'm', 's']) {
    if (ms % UNITS[unit] === 0) return `${ms / UNITS[unit]}${unit}`;
  }
  return String(ms);
}

// ------------------------------------------------------------------ validation

/** What is wrong. `tier` is the row (null for the whole plan), `key` the cell; `code` picks the message, `params` fill it. */
export interface Issue {
  tier: number | null;
  key: keyof TierDraft | null;
  code: IssueCode;
  params?: Record<string, string | number>;
}

export type IssueCode =
  | 'no_tiers'
  | 'too_many_tiers'
  | 'kind_missing'
  | 'field_missing'
  | 'default_needs_star_field'
  | 'duplicate'
  | 'required'
  | 'bad_duration'
  | 'fine_not_smaller'
  | 'fine_not_divisor'
  | 'fine_too_many'
  | 'fine_retention_needs_fine'
  | 'fine_retention_on_default'
  | 'fine_retention_longer'
  | 'bucket_longer_than_raw'
  | 'rollup_shorter_than_raw'
  | 'fine_retention_shorter_than_raw'
  | 'unknown_kind';

function durationOf(row: TierDraft, key: DurationKey, index: number, issues: Issue[]): number | null {
  const text = row[key].trim();
  if (text === '') return null;
  const ms = parseDuration(text);
  if (ms === null) issues.push({ tier: index, key, code: 'bad_duration', params: { value: text } });
  return ms;
}

/**
 * Every problem of a draft, in the order the data lake checks them: the shape of each row, then the coherence of the widths and the
 * retentions, then the kinds. `knownKinds` are the kinds the data lake says it has (null: not known yet, that check is skipped).
 * An empty list is a plan the data lake accepts.
 */
export function validatePlan(draft: PlanDraft, knownKinds: readonly string[] | null): Issue[] {
  const issues: Issue[] = [];
  if (draft.tiers.length === 0) return [{ tier: null, key: null, code: 'no_tiers' }];
  if (draft.tiers.length > MAX_TIERS) return [{ tier: null, key: null, code: 'too_many_tiers', params: { max: MAX_TIERS } }];

  const parsed: Array<Record<DurationKey, number | null>> = [];
  const seen = new Set<string>();
  draft.tiers.forEach((row, index) => {
    const kind = row.kind.trim();
    const field = row.field.trim();
    if (kind === '') issues.push({ tier: index, key: 'kind', code: 'kind_missing' });
    if (field === '') issues.push({ tier: index, key: 'field', code: 'field_missing' });
    if (kind === '*' && field !== '' && field !== '*') issues.push({ tier: index, key: 'field', code: 'default_needs_star_field' });
    if (kind !== '' && field !== '') {
      const id = `${kind}\u0000${field}`;
      if (seen.has(id)) issues.push({ tier: index, key: 'kind', code: 'duplicate', params: { kind, field } });
      seen.add(id);
    }
    for (const key of ['raw', 'bucket'] as const) {
      if (row[key].trim() === '') issues.push({ tier: index, key, code: 'required' });
    }
    const raw = durationOf(row, 'raw', index, issues);
    const bucket = durationOf(row, 'bucket', index, issues);
    const fine = durationOf(row, 'fineBucket', index, issues);
    const keep = durationOf(row, 'rollupRetention', index, issues);
    const keepFine = durationOf(row, 'fineRetention', index, issues);
    parsed.push({ raw, bucket, fineBucket: fine, rollupRetention: keep, fineRetention: keepFine });

    if (fine !== null && bucket !== null) {
      if (fine >= bucket) issues.push({ tier: index, key: 'fineBucket', code: 'fine_not_smaller' });
      else if (bucket % fine !== 0) issues.push({ tier: index, key: 'fineBucket', code: 'fine_not_divisor' });
      else if (bucket / fine > MAX_FINE_PER_COARSE) issues.push({ tier: index, key: 'fineBucket', code: 'fine_too_many', params: { max: MAX_FINE_PER_COARSE } });
    }
    if (row.fineRetention.trim() !== '') {
      if (row.fineBucket.trim() === '') issues.push({ tier: index, key: 'fineRetention', code: 'fine_retention_needs_fine' });
      else if (kind === '*') issues.push({ tier: index, key: 'fineRetention', code: 'fine_retention_on_default' });
      else if (keep !== null && keepFine !== null && keepFine > keep) issues.push({ tier: index, key: 'fineRetention', code: 'fine_retention_longer' });
    }
  });
  if (issues.length > 0) return issues;

  // Coherence: only for a plan that is well formed, like the data lake.
  parsed.forEach((p, index) => {
    if (p.raw !== null && p.bucket !== null && p.bucket > p.raw) issues.push({ tier: index, key: 'bucket', code: 'bucket_longer_than_raw' });
    if (p.raw !== null && p.rollupRetention !== null && p.rollupRetention < p.raw) issues.push({ tier: index, key: 'rollupRetention', code: 'rollup_shorter_than_raw' });
    if (p.raw !== null && p.fineRetention !== null && p.fineRetention < p.raw) issues.push({ tier: index, key: 'fineRetention', code: 'fine_retention_shorter_than_raw' });
  });
  if (issues.length > 0) return issues;

  if (knownKinds !== null) {
    const known = new Set(knownKinds);
    draft.tiers.forEach((row, index) => {
      const kind = row.kind.trim();
      if (kind !== '*' && !known.has(kind)) issues.push({ tier: index, key: 'kind', code: 'unknown_kind', params: { kind } });
    });
  }
  return issues;
}

// ------------------------------------------------------------------ the document the data lake takes

type WireTier = Record<string, string | number>;

/** The document of the data lake for a draft: whole numbers of milliseconds stay numbers, a duration with a unit is sent as typed. */
export function draftToPlan(draft: PlanDraft): { tiers: WireTier[]; delete: boolean } {
  const tiers = draft.tiers.map((row) => {
    const out: WireTier = { kind: row.kind.trim(), field: row.field.trim() };
    for (const key of TIER_KEYS.slice(2)) {
      const text = row[key].trim().toLowerCase();
      if (text !== '') out[key] = /^\d+$/.test(text) ? Number(text) : text;
    }
    return out;
  });
  return { tiers, delete: draft.delete };
}

/** A draft from a plan document as the data lake stores it (durations as numbers or as text). */
export function planToDraft(plan: unknown): PlanDraft | null {
  if (!isObject(plan) || !Array.isArray(plan.tiers)) return null;
  const tiers: TierDraft[] = [];
  for (const item of plan.tiers) {
    if (!isObject(item) || typeof item.kind !== 'string') return null;
    const row = emptyTier();
    row.kind = item.kind;
    row.field = typeof item.field === 'string' ? item.field : '*';
    for (const key of TIER_KEYS.slice(2)) {
      const value = item[key];
      if (typeof value === 'number' && Number.isFinite(value)) row[key] = formatDuration(value);
      else if (typeof value === 'string') row[key] = value;
    }
    tiers.push(row);
  }
  return { tiers, delete: plan.delete === true };
}

// ------------------------------------------------------------------ the server

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export interface Switches {
  allowDelete: boolean;
  effectiveMode: 'dryRun' | 'delete';
  fineRollups: boolean;
}

export interface AuditEntry {
  atMs: number;
  event: string;
  client: string;
  tiers: number | null;
  deleteRequested: boolean;
}

export interface PlanState {
  draft: PlanDraft;
  hash: string;
  knownKinds: string[];
  switches: Switches;
  audit: AuditEntry[];
}

export interface Effects {
  rawPointsToRollUp: number;
  rollupsToExpire: number;
  fineRollupsToExpire: number;
}

export interface SaveAnswer {
  saved: boolean;
  unchanged: boolean;
  hash: string;
  mode: 'dryRun' | 'delete';
  changes: number;
  warnings: string[];
  effects: Effects | null;
  currentEffects: Effects | null;
}

export type Failure =
  | 'off' // 404: the data lake was not started with the plan administration
  | 'forbidden' // 401/403 without a delete code: not an administrator
  | 'unreachable' // 503
  | 'network'
  | 'malformed'
  | 'plan_changed'
  | 'confirm_delete_required'
  | 'delete_not_allowed'
  | 'invalid_plan'
  | 'incoherent_plan'
  | 'unknown_kind'
  | 'invalid_request'
  | 'write_failed'
  | 'http';

export type Result<T> = { ok: true; value: T } | { ok: false; failure: Failure; status?: number; details?: string[] };

const PLAN_PATH = '/api/telemetry/downsample-plan';
const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

/** The failure for an answer that is not a success: chosen by the `code` of the data lake, never by its English text. */
export function failureFor(status: number, body: unknown): Result<never> {
  const code = isObject(body) && typeof body.code === 'string' ? body.code : '';
  const details = isObject(body) && Array.isArray(body.details) ? body.details.filter((d): d is string => typeof d === 'string').slice(0, 50) : undefined;
  const coded: Failure[] = ['plan_changed', 'confirm_delete_required', 'delete_not_allowed', 'invalid_plan', 'incoherent_plan', 'unknown_kind', 'invalid_request', 'write_failed'];
  const hit = coded.find((c) => c === code);
  if (hit) return { ok: false, failure: hit, status, details };
  if (status === 404) return { ok: false, failure: 'off', status };
  if (status === 401 || status === 403) return { ok: false, failure: 'forbidden', status };
  if (status === 503) return { ok: false, failure: 'unreachable', status };
  return { ok: false, failure: 'http', status };
}

async function call(init?: RequestInit, query = ''): Promise<{ status: number; body: unknown } | null> {
  try {
    const res = await authFetch(apiUrl(PLAN_PATH + query), init);
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

function parseEffects(value: unknown): Effects | null {
  const totals = isObject(value) && isObject(value.totals) ? value.totals : null;
  if (!totals) return null;
  return { rawPointsToRollUp: num(totals.rawPointsToRollUp), rollupsToExpire: num(totals.rollupsToExpire), fineRollupsToExpire: num(totals.fineRollupsToExpire) };
}

/** Reads the plan the data lake is using now. */
export async function loadPlan(): Promise<Result<PlanState>> {
  const answer = await call();
  if (!answer) return { ok: false, failure: 'network' };
  if (answer.status !== 200) return failureFor(answer.status, answer.body);
  const body = answer.body;
  const draft = isObject(body) ? planToDraft(body.plan) : null;
  if (!isObject(body) || !draft || typeof body.hash !== 'string') return { ok: false, failure: 'malformed' };
  const sw = isObject(body.switches) ? body.switches : {};
  return {
    ok: true,
    value: {
      draft,
      hash: body.hash,
      knownKinds: Array.isArray(body.knownKinds) ? body.knownKinds.filter((k): k is string => typeof k === 'string') : [],
      switches: { allowDelete: sw.allowDelete === true, effectiveMode: sw.effectiveMode === 'delete' ? 'delete' : 'dryRun', fineRollups: sw.fineRollups !== false },
      audit: (Array.isArray(body.audit) ? body.audit : []).filter(isObject).slice(-10).map((e) => ({
        atMs: num(e.atMs), event: typeof e.event === 'string' ? e.event : '', client: typeof e.client === 'string' ? e.client : '',
        tiers: typeof e.tiers === 'number' ? e.tiers : null, deleteRequested: e.deleteRequested === true,
      })),
    },
  };
}

/** Asks the data lake what saving `draft` would do (`preview`), or saves it. Only a draft that passed validatePlan should come here. */
export async function putPlan(draft: PlanDraft, hash: string, options: { preview: boolean; confirmDelete?: boolean }): Promise<Result<SaveAnswer>> {
  const request = { plan: draftToPlan(draft), expectedHash: hash, confirmDelete: options.confirmDelete === true };
  const answer = await call({ method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) }, options.preview ? '?preview=1' : '');
  if (!answer) return { ok: false, failure: 'network' };
  if (answer.status !== 200) return failureFor(answer.status, answer.body);
  const body = answer.body;
  if (!isObject(body) || typeof body.hash !== 'string') return { ok: false, failure: 'malformed' };
  return {
    ok: true,
    value: {
      saved: body.saved === true,
      unchanged: body.unchanged === true,
      hash: body.hash,
      mode: body.mode === 'delete' ? 'delete' : 'dryRun',
      changes: Array.isArray(body.changes) ? body.changes.length : 0,
      warnings: Array.isArray(body.warnings) ? body.warnings.filter((w): w is string => typeof w === 'string').slice(0, 50) : [],
      effects: parseEffects(body.effects),
      currentEffects: parseEffects(body.currentEffects),
    },
  };
}
