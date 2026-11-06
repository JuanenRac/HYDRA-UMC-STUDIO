// =============================================================================
// HYDRA-UMC STUDIO - src/lib/ingestSwitches.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// What the sibling services hand to the SERVER and what it keeps, one switch each, all OFF by default: the faults of the machines, the
// outcome of a reproduction scenario, the status of the developer node, the verdicts of the anomaly detector (and their relay to the voice
// interface), the signed record of the voice commands and the check of a signed trajectory proposal. They travel in the `ingest` block of
// GET/PUT /api/admin/server-config. Turning one on (or changing the keys file) carries `confirm: true`; turning one off never does. A
// switch that comes from the environment of the SERVER is locked. The reading is defensive: an answer without the block means a SERVER
// that predates it.
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export const INGEST_KEYS = ['faultFeed', 'scenario', 'developerNode', 'anomalyFeed', 'anomalyVoiceRelay', 'voiceChain', 'proposalVerify'] as const;
export type IngestKey = (typeof INGEST_KEYS)[number];
export type IngestSource = 'env' | 'config' | 'default';

export interface IngestState {
  switches: Record<IngestKey, { value: boolean; source: IngestSource }>;
  proposalKeysFile: { value: string; source: IngestSource };
  /** True while the feeds that read the broker run differently from the saved choice. */
  appliesOnRestart: boolean;
}

export type IngestFailure = 'unsupported' | 'forbidden' | 'network' | 'http';
export type IngestResult<T> = { ok: true; value: T } | { ok: false; failure: IngestFailure; status?: number; reason?: string };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const isSource = (value: unknown): value is IngestSource => value === 'env' || value === 'config' || value === 'default';

/** The `ingest` block of the answer; null when it does not have the shape (a SERVER that predates it). */
export function parseIngestState(data: unknown): IngestState | null {
  const raw = object(object(data).ingest);
  const switches = {} as IngestState['switches'];
  for (const key of INGEST_KEYS) {
    const item = object(raw[key]);
    if (typeof item.value !== 'boolean' || !isSource(item.source)) return null;
    switches[key] = { value: item.value, source: item.source };
  }
  const keys = object(raw.proposalKeysFile);
  if (typeof keys.value !== 'string' || !isSource(keys.source)) return null;
  return { switches, proposalKeysFile: { value: keys.value, source: keys.source }, appliesOnRestart: raw.appliesOnRestart === true };
}

export interface IngestChange {
  switches?: Partial<Record<IngestKey, boolean>>;
  /** A file name inside the data folder of the SERVER; an empty text removes it. */
  proposalKeysFile?: string;
}

export type IngestPatchBody = { ingest: Partial<Record<IngestKey, boolean>> & { proposalKeysFile?: string; confirm?: true } };

/** Turning a switch on, or choosing another keys file, is what needs the operator's confirmation on screen. Turning off, or removing the file, never. */
export function ingestNeedsConfirmation(current: IngestState, change: IngestChange): boolean {
  for (const key of INGEST_KEYS) if (change.switches?.[key] === true && !current.switches[key].value) return true;
  return change.proposalKeysFile !== undefined && change.proposalKeysFile !== '' && change.proposalKeysFile !== current.proposalKeysFile.value;
}

/** The request body: only what changes, and `confirm: true` exactly when the change needs it. */
export function ingestPatchBody(current: IngestState, change: IngestChange): IngestPatchBody {
  const ingest: IngestPatchBody['ingest'] = {};
  for (const key of INGEST_KEYS) {
    const wanted = change.switches?.[key];
    if (wanted !== undefined && wanted !== current.switches[key].value) ingest[key] = wanted;
  }
  if (change.proposalKeysFile !== undefined && change.proposalKeysFile !== current.proposalKeysFile.value) ingest.proposalKeysFile = change.proposalKeysFile;
  if (ingestNeedsConfirmation(current, change)) ingest.confirm = true;
  return { ingest };
}

/** The keys that differ from the saved state and that the screen may send (a locked switch is never sent). */
export function changedSwitches(current: IngestState, wanted: Record<IngestKey, boolean>): Partial<Record<IngestKey, boolean>> {
  const out: Partial<Record<IngestKey, boolean>> = {};
  for (const key of INGEST_KEYS) if (current.switches[key].source !== 'env' && wanted[key] !== current.switches[key].value) out[key] = wanted[key];
  return out;
}

/** The name of a keys file that the SERVER accepts (the same rule as the SERVER): a plain file name, or empty. */
export const validKeysFileName = (name: string): boolean => name === '' || (/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(name) && !name.includes('..'));

function failure(res: Response, data: unknown): IngestResult<never> | null {
  if (res.status === 404) return { ok: false, failure: 'unsupported' };
  if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden', status: res.status };
  if (!res.ok) {
    const reason = typeof object(data).error === 'string' ? (object(data).error as string).slice(0, 300) : undefined;
    return { ok: false, failure: 'http', status: res.status, ...(reason ? { reason } : {}) };
  }
  return null;
}

async function read(): Promise<IngestResult<IngestState>> {
  try {
    const res = await authFetch(apiUrl('/api/admin/server-config'));
    const data = await res.json().catch(() => ({}));
    const bad = failure(res, data);
    if (bad) return bad;
    const state = parseIngestState(data);
    // an answer without the block is a SERVER that predates it: the section stays out of the way
    return state ? { ok: true, value: state } : { ok: false, failure: 'unsupported', status: res.status };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

async function write(current: IngestState, change: IngestChange): Promise<IngestResult<IngestState>> {
  try {
    const body = ingestPatchBody(current, change);
    if (Object.keys(body.ingest).length === 0) return { ok: true, value: current };
    const res = await authFetch(apiUrl('/api/admin/server-config'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    const bad = failure(res, data);
    if (bad) return bad;
    return read();
  } catch {
    return { ok: false, failure: 'network' };
  }
}

export const ingestApi = { read, write };

// ---------------------------------------------------------------------------
// The status of the developer node (GET /api/developer-node/status)
// ---------------------------------------------------------------------------
export interface DeveloperNodeEntry {
  nodeId: string;
  /** Milliseconds since the epoch at which the SERVER stored the status. */
  at: number;
  seq: number;
  /** The fields of the status that are plain texts and numbers, as the node sent them (nothing else is drawn). */
  fields: { name: string; value: string }[];
}
export interface DeveloperNodeStatus {
  nodes: DeveloperNodeEntry[];
  /** The result of checking the signed chain when it was asked for (verify=1). */
  chain: { ok: boolean } | null;
}

const MAX_FIELDS = 24;
const MAX_TEXT = 200;

/** The nodes of an answer, sorted by id; a status field that is not a text, a number or a boolean is left out. Null when the answer has no `nodes`. */
export function parseDeveloperNodeStatus(data: unknown): DeveloperNodeStatus | null {
  const raw = object(data);
  if (!raw.nodes || typeof raw.nodes !== 'object' || Array.isArray(raw.nodes)) return null;
  const nodes: DeveloperNodeEntry[] = [];
  for (const [nodeId, item] of Object.entries(raw.nodes as Record<string, unknown>)) {
    const entry = object(item);
    if (typeof entry.at !== 'number' || typeof entry.seq !== 'number') continue;
    const fields: DeveloperNodeEntry['fields'] = [];
    for (const [name, value] of Object.entries(object(entry.status))) {
      if (fields.length >= MAX_FIELDS) break;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') fields.push({ name: name.slice(0, 64), value: String(value).slice(0, MAX_TEXT) });
    }
    nodes.push({ nodeId, at: entry.at, seq: entry.seq, fields });
  }
  nodes.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  const chain = object(raw.chain);
  return { nodes, chain: typeof chain.ok === 'boolean' ? { ok: chain.ok } : null };
}

async function readDeveloperNodes(verify = false): Promise<IngestResult<DeveloperNodeStatus>> {
  try {
    const res = await authFetch(apiUrl(`/api/developer-node/status${verify ? '?verify=1' : ''}`));
    const data = await res.json().catch(() => ({}));
    const bad = failure(res, data);
    if (bad) return bad;
    const status = parseDeveloperNodeStatus(data);
    return status ? { ok: true, value: status } : { ok: false, failure: 'http', status: res.status };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

export const developerNodeApi = { read: readDeveloperNodes };
