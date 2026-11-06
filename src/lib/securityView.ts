// =============================================================================
// HYDRA-UMC STUDIO - src/lib/securityView.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The security summary of the server: the signing keys of the sign-in tokens (SERVER routes GET /api/admin/jwt-keys and
// POST /api/admin/jwt-keys/rotate) and the checks drawn from them and from the second factor of the signed-in account. Only the
// public state of a key is ever read (its id and dates); the private part never leaves the server.
import { apiUrl } from './apiBase';
import { authFetch } from './session';
import { asObject, asText } from './panelApi';

export interface KeyInfo { kid: string; createdAt: number; retiredAt: number | null; active: boolean; acceptedUntil: number | null }
export interface KeysState { algorithm: string | null; keys: KeyInfo[] }

const seconds = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null);

export function parseKeys(data: unknown): KeysState {
  const body = asObject(data);
  const list = Array.isArray(body.keys) ? body.keys : [];
  const keys = list
    .map((item) => asObject(item))
    .filter((item) => asText(item.kid) !== null && seconds(item.createdAt) !== null)
    .map((item): KeyInfo => ({ kid: String(item.kid), createdAt: seconds(item.createdAt) ?? 0, retiredAt: seconds(item.retiredAt), active: item.active === true, acceptedUntil: seconds(item.acceptedUntil) }));
  return { algorithm: asText(body.algorithm), keys };
}

/** Why a rotation did not happen, in the codes of the server. */
export type RotateFailure = 'asymmetric_off' | 'file' | 'forbidden' | 'unsupported' | 'http' | 'network';
export type RotateResult = { ok: true; kid: string; state: KeysState } | { ok: false; failure: RotateFailure };

export async function rotateKey(fetcher: typeof authFetch = authFetch): Promise<RotateResult> {
  try {
    const res = await fetcher(apiUrl('/api/admin/jwt-keys/rotate'), { method: 'POST' });
    const body = asObject(await res.json().catch(() => ({})));
    if (res.status === 404) return { ok: false, failure: 'unsupported' };
    if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden' };
    if (res.status === 409) return { ok: false, failure: 'asymmetric_off' };
    if (res.status === 500) return { ok: false, failure: 'file' };
    if (!res.ok) return { ok: false, failure: 'http' };
    return { ok: true, kid: asText(body.kid) ?? '', state: parseKeys(body) };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

export type CheckId = 'second_factor' | 'asymmetric_keys';
export interface SecurityCheck { id: CheckId; ok: boolean | null }

/** Each check is true, false, or null when the answer is not known (the server did not say). */
export function securityChecks(secondFactorOn: boolean | null, algorithm: string | null): SecurityCheck[] {
  return [
    { id: 'second_factor', ok: secondFactorOn },
    { id: 'asymmetric_keys', ok: algorithm === null ? null : algorithm === 'EdDSA' },
  ];
}

/** The active key of a list (the newest one that is not retired). */
export function activeKey(keys: readonly KeyInfo[]): KeyInfo | null {
  return keys.filter((key) => key.active).sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

export function dateOf(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}
