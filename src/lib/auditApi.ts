// =============================================================================
// HYDRA-UMC STUDIO - reading the audit record: auditApi.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// GET /api/audit is for administrators. A refusal is turned into the same typed result as any other call so the screen
// can say why (not an administrator, session ended, an older server without the route, the record switched off).
// =============================================================================
import type { HydraServerClient } from '../generated/hydra-server-client';
import { auditQueryObject, parseAudit, type AuditQuery, type AuditRead } from './audit';
import { interpretCommandResponse, networkFailure, type CommandResult } from './commandResult';
import { serverClient, settle } from './serverClient';

export interface AuditResult { result: CommandResult; read: AuditRead | null }

export async function fetchAudit(query: AuditQuery = {}, client: HydraServerClient = serverClient): Promise<AuditResult> {
  try {
    const { status, data } = await settle(() => client.getAudit({ query: auditQueryObject(query) }));
    const ok = status === 200;
    const result = interpretCommandResponse(status, ok, data);
    return { result, read: ok ? parseAudit(data) : null };
  } catch (error) {
    return { result: networkFailure(error instanceof Error ? error.message : undefined), read: null };
  }
}

/** The lines as the server stores them (`?format=jsonl`), for saving to a file; null when they could not be read. */
export async function fetchAuditJsonl(query: AuditQuery = {}, client: HydraServerClient = serverClient): Promise<string | null> {
  try {
    return await client.getAuditAsText({ query: { ...auditQueryObject({ ...query, verify: false }), format: 'jsonl' } });
  } catch {
    return null;
  }
}
