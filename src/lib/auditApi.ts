// =============================================================================
// HYDRA-UMC STUDIO - reading the audit record: auditApi.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// GET /api/audit is for administrators. A refusal is turned into the same typed result as any other call so the screen
// can say why (not an administrator, session ended, an older server without the route, the record switched off).
// =============================================================================
import { apiUrl } from './apiBase';
import { authFetch } from './session';
import { auditQueryString, parseAudit, type AuditQuery, type AuditRead } from './audit';
import { interpretCommandResponse, networkFailure, type CommandResult } from './commandResult';

export interface AuditResult { result: CommandResult; read: AuditRead | null }

export async function fetchAudit(query: AuditQuery = {}): Promise<AuditResult> {
  try {
    const res = await authFetch(apiUrl(`/api/audit${auditQueryString(query)}`));
    let data: unknown = null;
    try { data = await res.json(); } catch { /* an answer without a JSON body */ }
    const result = interpretCommandResponse(res.status, res.ok, data);
    return { result, read: res.ok ? parseAudit(data) : null };
  } catch (error) {
    return { result: networkFailure(error instanceof Error ? error.message : undefined), read: null };
  }
}

/** The lines as the server stores them (`?format=jsonl`), for saving to a file; null when they could not be read. */
export async function fetchAuditJsonl(query: AuditQuery = {}): Promise<string | null> {
  try {
    const suffix = auditQueryString({ ...query, verify: false });
    const res = await authFetch(apiUrl(`/api/audit${suffix ? `${suffix}&` : '?'}format=jsonl`));
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}
