// =============================================================================
// HYDRA-UMC STUDIO - src/lib/opsProposals.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The proposals of the node watchdog (OPS-AGENT) that wait for a person. They go through the SERVER (GET /api/ops-agent/proposals and
// POST /api/ops-agent/proposals/decide), which speaks to the watchdog over its signed channel; the watchdog keeps the proposals and the
// last word. Approving carries `confirm: true`, rejecting does not; the person who decides is the signed-in account, which the SERVER
// names, so no name is sent from here. The reading is defensive: a server without the route (404) or without the channel set up (503,
// available false) is told apart from an account that may not use it (401/403).
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export interface PendingProposal {
  incidentId: string;
  sourceNode: string;
  detectedAt: string;
  severity: string;
  component: string;
  symptom: string;
  receivedAt: string;
}

export interface DecidedProposal {
  incidentId: string;
  decision: 'approved' | 'rejected';
  by: string;
  decidedAt: string;
}

export interface ProposalLists {
  pending: PendingProposal[];
  decided: DecidedProposal[];
}

export type ProposalFailure = 'unsupported' | 'not_configured' | 'forbidden' | 'not_pending' | 'network' | 'http';
export type ProposalResult<T> = { ok: true; value: T } | { ok: false; failure: ProposalFailure; status?: number; reason?: string };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const text = (value: unknown): string => (typeof value === 'string' ? value.slice(0, 500) : '');

/** The lists in an answer of the route; null when the answer holds no `pending` list. Entries that are not objects are dropped. */
export function parseProposals(data: unknown): ProposalLists | null {
  const r = object(data);
  if (!Array.isArray(r.pending)) return null;
  const pending: PendingProposal[] = [];
  for (const item of r.pending) {
    const entry = object(item);
    const incident = object(entry.incident);
    const incidentId = text(incident.incidentId);
    if (!incidentId) continue;
    pending.push({
      incidentId, sourceNode: text(incident.sourceNode), detectedAt: text(incident.detectedAt), severity: text(incident.severity),
      component: text(incident.component), symptom: text(incident.symptom), receivedAt: text(entry.receivedAt),
    });
  }
  const decided: DecidedProposal[] = [];
  for (const item of Array.isArray(r.decided) ? r.decided : []) {
    const entry = object(item);
    const incidentId = text(entry.incidentId);
    if (!incidentId || (entry.decision !== 'approved' && entry.decision !== 'rejected')) continue;
    decided.push({ incidentId, decision: entry.decision, by: text(entry.by), decidedAt: text(entry.decidedAt) });
  }
  return { pending, decided };
}

/** The body of a decision. Approving carries `confirm: true`; rejecting never does. */
export function decisionBody(incidentId: string, decision: 'approved' | 'rejected'): { incidentId: string; decision: 'approved' | 'rejected'; confirm?: true } {
  return decision === 'approved' ? { incidentId, decision, confirm: true } : { incidentId, decision };
}

/** Approving opens the incident for the maintenance work, so it is the decision that is confirmed on screen. */
export const decisionNeedsConfirmation = (decision: 'approved' | 'rejected'): boolean => decision === 'approved';

async function call<T>(request: () => Promise<Response>, read: (data: unknown) => T | null): Promise<ProposalResult<T>> {
  try {
    const res = await request();
    const data = await res.json().catch(() => ({}));
    if (res.status === 404 && object(data).code !== 'operation-failed') return { ok: false, failure: 'unsupported' };
    if (res.status === 404) return { ok: false, failure: 'not_pending', status: 404 };
    if (res.status === 503 && object(data).available === false) return { ok: false, failure: 'not_configured' };
    if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden', status: res.status };
    const reason = typeof object(data).reason === 'string' ? (object(data).reason as string).slice(0, 300) : typeof object(data).error === 'string' ? (object(data).error as string).slice(0, 300) : undefined;
    if (!res.ok) return { ok: false, failure: 'http', status: res.status, ...(reason ? { reason } : {}) };
    const value = read(data);
    return value ? { ok: true, value } : { ok: false, failure: 'http', status: res.status };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

export const opsProposalsApi = {
  list: () => call(() => authFetch(apiUrl('/api/ops-agent/proposals')), parseProposals),
  decide: (incidentId: string, decision: 'approved' | 'rejected') =>
    call(() => authFetch(apiUrl('/api/ops-agent/proposals/decide'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(decisionBody(incidentId, decision)),
    }), (data) => (object(data).decision === decision ? object(data) : null)),
};
