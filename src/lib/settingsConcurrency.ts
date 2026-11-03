// =============================================================================
// HYDRA-UMC STUDIO - src/lib/settingsConcurrency.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// Saving the settings tree with optimistic concurrency. GET /api/settings answers the revision of the tree as an ETag;
// the save is PUT /api/settings with that ETag as If-Match: 412 when the tree is no longer the version this window read,
// 428 when no If-Match was sent. The live state of the robots is part of the tree, so a 412 does not always mean that
// somebody else edited: when the tree on the server is the one this window last received (the push of a robot that moved
// reached us as a socket message, which carries no revision), the save is simply sent again with the fresh ETag. When it
// differs, the server's version replaces the window's and the person is told to apply the change again. A server that
// does not know PUT (404/405) is saved the old way, with POST.

export type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}>;

export type SettingsSaveOutcome =
  | { kind: 'saved'; etag: string | null; body: unknown }
  | { kind: 'conflict'; server: unknown; etag: string | null }
  | { kind: 'failed'; status: number | null };

/** The key order of an object does not matter when two trees are compared. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** True when the tree the server holds is the one this window last synchronised (`lastSyncedJson`). */
export function sameTree(lastSyncedJson: string | null, server: unknown): boolean {
  if (lastSyncedJson === null) return false;
  try {
    return canonicalJson(JSON.parse(lastSyncedJson)) === canonicalJson(server);
  } catch {
    return false;
  }
}

export interface SaveSettingsOptions {
  fetchFn: FetchLike;
  url: string;
  headers: Record<string, string>;
  body: string;
  /** The ETag of the last GET (or of the last save); null when none is known yet. */
  etag: string | null;
  /** The JSON of the tree this window last sent or received. */
  lastSyncedJson: string | null;
  /** A deliberate replacement (factory reset): a stale ETag is refreshed and the save sent again whatever the server holds. */
  force?: boolean;
}

async function readLatest(o: SaveSettingsOptions): Promise<{ server: unknown; etag: string | null } | null> {
  try {
    const readHeaders = { ...o.headers };
    delete readHeaders['Content-Type'];
    const r = await o.fetchFn(o.url, { headers: readHeaders });
    if (!r.ok) return null;
    return { server: await r.json(), etag: r.headers.get('ETag') };
  } catch {
    return null;
  }
}

/** The save of a server that has no PUT /api/settings yet: the whole tree, last writer wins, as before. */
async function post(o: SaveSettingsOptions): Promise<SettingsSaveOutcome> {
  try {
    const r = await o.fetchFn(o.url, { method: 'POST', headers: o.headers, body: o.body });
    if (!r.ok) return { kind: 'failed', status: r.status };
    let body: unknown = null;
    try { body = await r.json(); } catch { /* an answer without a JSON body */ }
    return { kind: 'saved', etag: r.headers.get('ETag'), body };
  } catch {
    return { kind: 'failed', status: null };
  }
}

export async function saveSettingsTree(o: SaveSettingsOptions): Promise<SettingsSaveOutcome> {
  let etag = o.etag;
  let retried = false;
  for (;;) {
    if (!etag) {
      const latest = await readLatest(o);
      if (!latest) return { kind: 'failed', status: null };
      if (!o.force && !sameTree(o.lastSyncedJson, latest.server)) return { kind: 'conflict', server: latest.server, etag: latest.etag };
      etag = latest.etag;
      if (!etag) return post(o); // a server that sends no ETag cannot be asked for one
    }
    let response;
    try {
      response = await o.fetchFn(o.url, { method: 'PUT', headers: { ...o.headers, 'If-Match': etag }, body: o.body });
    } catch {
      return { kind: 'failed', status: null };
    }
    if (response.ok) {
      let body: unknown = null;
      try { body = await response.json(); } catch { /* an answer without a JSON body */ }
      return { kind: 'saved', etag: response.headers.get('ETag'), body };
    }
    if (response.status === 404 || response.status === 405) return post(o);
    if (response.status !== 412 && response.status !== 428) return { kind: 'failed', status: response.status };
    if (retried) return { kind: 'failed', status: response.status };
    const latest = await readLatest(o);
    if (!latest) return { kind: 'failed', status: response.status };
    if (!o.force && !sameTree(o.lastSyncedJson, latest.server)) return { kind: 'conflict', server: latest.server, etag: latest.etag };
    retried = true;
    etag = latest.etag;
    if (!etag) return { kind: 'failed', status: response.status };
  }
}
