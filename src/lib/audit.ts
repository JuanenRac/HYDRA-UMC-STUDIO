// =============================================================================
// HYDRA-UMC STUDIO - the audit record of the server: audit.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// GET /api/audit (administrators only) gives the newest entries of an append-only log: every line carries the SHA-256
// of the line before it (`prev`) and its own (`hash`), so a line that is changed or removed later shows when the chain
// is checked. The server can check the whole record (`?verify=1`); this window can also check what it was given:
// every hash is computed again here and every line that follows its predecessor directly must name it. Pure.
// =============================================================================
import { sha256Hex } from './sha256';

export interface AuditEntry {
  seq: number;
  ts: string;
  type: string;
  outcome: 'ok' | 'refused' | 'failed';
  username: string | null;
  controllerId: string | null;
  ip: string | null;
  robotId: number | null;
  detail: Record<string, unknown> | null;
  prev: string;
  hash: string;
  /** The line as the server sent it, without the hash: what the hash is the SHA-256 of. */
  raw: Record<string, unknown>;
}

export interface ServerVerification { ok: boolean; entries: number; brokenAtSeq: number | null; reason: string | null }

export interface AuditRead {
  enabled: boolean;
  lockedOff: boolean;
  entries: AuditEntry[];
  verification: ServerVerification | null;
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

/** The types of entry the server writes (the filter of the screen); others are shown as they come. */
export const AUDIT_TYPES: readonly string[] = ['claim', 'force-claim', 'release', 'force-release', 'jog-arm', 'safety-limits', 'stop-all'];

function parseEntry(value: unknown): AuditEntry | null {
  if (!isObject(value)) return null;
  const { seq, ts, type, outcome, prev, hash } = value;
  if (typeof seq !== 'number' || !Number.isInteger(seq) || typeof ts !== 'string' || typeof type !== 'string') return null;
  if (typeof prev !== 'string' || typeof hash !== 'string') return null;
  const raw: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value)) if (key !== 'hash') raw[key] = field;
  return {
    seq,
    ts,
    type,
    outcome: outcome === 'refused' || outcome === 'failed' ? outcome : 'ok',
    username: text(value.username),
    controllerId: text(value.controllerId),
    ip: text(value.ip),
    robotId: typeof value.robotId === 'number' ? value.robotId : null,
    detail: isObject(value.detail) ? value.detail : null,
    prev,
    hash,
    raw,
  };
}

/** The answer of GET /api/audit; lines that are not entries are dropped. */
export function parseAudit(body: unknown): AuditRead {
  const object = isObject(body) ? body : {};
  const entries = Array.isArray(object.entries) ? object.entries.map(parseEntry).filter((e): e is AuditEntry => e !== null) : [];
  const v = isObject(object.verification) ? object.verification : null;
  return {
    enabled: object.enabled !== false,
    lockedOff: object.lockedOff === true,
    entries,
    verification: v
      ? { ok: v.ok === true, entries: typeof v.entries === 'number' ? v.entries : 0, brokenAtSeq: typeof v.brokenAtSeq === 'number' ? v.brokenAtSeq : null, reason: text(v.reason) }
      : null,
  };
}

export interface ChainCheck {
  /** Every hash matched and every line that follows directly names its predecessor. */
  ok: boolean;
  checked: number;
  /** Links between neighbours that could be compared (a filter or a rotated file leaves gaps that can not). */
  links: number;
  gaps: number;
  brokenAtSeq: number | null;
  reason: 'changed' | 'link' | null;
}

const hashOfLine = (raw: Record<string, unknown>): string => sha256Hex(new TextEncoder().encode(JSON.stringify(raw)));

/** Checks the hash of every line and the link between lines that are neighbours (sequence numbers one apart). */
export function checkChain(entries: AuditEntry[]): ChainCheck {
  let links = 0;
  let gaps = 0;
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (hashOfLine(entry.raw) !== entry.hash) return { ok: false, checked: i, links, gaps, brokenAtSeq: entry.seq, reason: 'changed' };
    if (i === 0) continue;
    const before = entries[i - 1];
    if (entry.seq === before.seq + 1) {
      links += 1;
      if (entry.prev !== before.hash) return { ok: false, checked: i + 1, links, gaps, brokenAtSeq: entry.seq, reason: 'link' };
    } else {
      gaps += 1;
    }
  }
  return { ok: true, checked: entries.length, links, gaps, brokenAtSeq: null, reason: null };
}

/** A short line of the detail of an entry for the table: `key=value` pairs, bounded. */
export function detailLine(detail: Record<string, unknown> | null, max = 140): string {
  if (!detail) return '';
  const parts = Object.entries(detail).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
  const joined = parts.join(' ');
  return joined.length > max ? `${joined.slice(0, max - 3)}...` : joined;
}

export interface AuditQuery { limit?: number; type?: string; robotId?: number; afterSeq?: number; verify?: boolean }

/** The query string of GET /api/audit for a filter (limit 1 to 1000). */
export function auditQueryString(query: AuditQuery): string {
  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set('limit', String(Math.min(1000, Math.max(1, Math.floor(query.limit)))));
  if (query.type) params.set('type', query.type);
  if (query.robotId !== undefined) params.set('robotId', String(query.robotId));
  if (query.afterSeq !== undefined) params.set('afterSeq', String(query.afterSeq));
  if (query.verify) params.set('verify', '1');
  const joined = params.toString();
  return joined ? `?${joined}` : '';
}
