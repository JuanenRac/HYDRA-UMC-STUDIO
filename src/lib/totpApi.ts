// =============================================================================
// HYDRA-UMC STUDIO - src/lib/totpApi.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The calls of the second factor of the sign-in (SERVER routes /api/totp/status|begin|confirm|disable and the
// administrator's DELETE /api/users/:username/totp) with their answers read defensively: a server that predates the
// routes answers 404 and the screen says so instead of showing a broken form. Nothing here stores a secret: the key and
// the recovery codes only live in the component that shows them, until the operator closes it.
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export interface TotpStatus { enabled: boolean; recoveryLeft: number }
export interface TotpEnrolment { secret: string; uri: string }

/** Why a call did not work, in terms the screen can translate. */
export type TotpFailure =
  | { kind: 'unsupported' }
  | { kind: 'password' }
  | { kind: 'code' }
  | { kind: 'wait'; seconds: number }
  | { kind: 'already' }
  | { kind: 'forbidden' }
  | { kind: 'http'; status: number }
  | { kind: 'network' };

export type TotpResult<T> = { ok: true; value: T } | { ok: false; failure: TotpFailure };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

export function parseStatus(data: unknown): TotpStatus | null {
  const body = object(data);
  if (typeof body.enabled !== 'boolean') return null;
  const left = typeof body.recoveryLeft === 'number' && Number.isFinite(body.recoveryLeft) && body.recoveryLeft >= 0 ? Math.floor(body.recoveryLeft) : 0;
  return { enabled: body.enabled, recoveryLeft: left };
}

export function parseEnrolment(data: unknown): TotpEnrolment | null {
  const body = object(data);
  if (typeof body.secret !== 'string' || !/^[A-Z2-7]{16,128}$/.test(body.secret)) return null;
  if (typeof body.uri !== 'string' || !body.uri.startsWith('otpauth://totp/')) return null;
  return { secret: body.secret, uri: body.uri };
}

export function parseRecoveryCodes(data: unknown): string[] | null {
  const codes = object(data).recoveryCodes;
  if (!Array.isArray(codes) || codes.length === 0) return null;
  const clean = codes.filter((code): code is string => typeof code === 'string' && /^[0-9a-f]{5}-[0-9a-f]{5}$/.test(code));
  return clean.length === codes.length ? clean : null;
}

/** The key in groups of four letters, easier to type from the screen. */
export function groupedKey(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

/** Codes are typed with spaces or dashes out of place: the digits of an app code are kept as 6 digits, a recovery code as typed. */
export function normalizeCode(text: string): string {
  const trimmed = text.trim();
  const digits = trimmed.replace(/[\s-]/g, '');
  return /^\d{6}$/.test(digits) ? digits : trimmed.toLowerCase();
}

export function failureOf(status: number, data: unknown, headers?: { get(name: string): string | null }): TotpFailure {
  if (status === 404) return { kind: 'unsupported' };
  if (status === 403) return { kind: 'forbidden' };
  if (status === 429) {
    const seconds = Number(headers?.get('Retry-After'));
    return { kind: 'wait', seconds: Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 30 };
  }
  if (status === 409) return { kind: 'already' };
  if (status === 401) return object(data).totpRequired === true ? { kind: 'code' } : { kind: 'password' };
  if (status === 400) return { kind: 'code' };
  return { kind: 'http', status };
}

async function call<T>(method: string, path: string, body: Record<string, unknown> | null, read: (data: unknown) => T | null, fetcher: typeof fetch = authFetch): Promise<TotpResult<T>> {
  try {
    const res = await fetcher(apiUrl(path), {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: unknown = null;
    try { data = await res.json(); } catch { /* an answer without a JSON body */ }
    if (!res.ok) {
      // A wrong code on /disable answers 401 without totpRequired: the password was already checked first, so it is the code.
      const failure = failureOf(res.status, data, res.headers);
      return { ok: false, failure: path.endsWith('/disable') && failure.kind === 'password' && /code/i.test(String(object(data).error ?? '')) ? { kind: 'code' } : failure };
    }
    const value = read(data);
    return value === null ? { ok: false, failure: { kind: 'http', status: res.status } } : { ok: true, value };
  } catch {
    return { ok: false, failure: { kind: 'network' } };
  }
}

const done = (): true => true;

export const totpApi = {
  status: (fetcher?: typeof fetch) => call('GET', '/api/totp/status', null, parseStatus, fetcher),
  begin: (password: string, fetcher?: typeof fetch) => call('POST', '/api/totp/begin', { password }, parseEnrolment, fetcher),
  confirm: (code: string, fetcher?: typeof fetch) => call('POST', '/api/totp/confirm', { code: normalizeCode(code) }, parseRecoveryCodes, fetcher),
  disable: (password: string, code: string, fetcher?: typeof fetch) => call('POST', '/api/totp/disable', { password, code: normalizeCode(code) }, done, fetcher),
  reset: (username: string, fetcher?: typeof fetch) => call('DELETE', `/api/users/${encodeURIComponent(username)}/totp`, null, done, fetcher),
};

/** What the sign-in answered when it wants the second step: 401 with totpRequired, or the wait (429) that comes with it. */
export function loginNeedsCode(status: number, data: unknown): boolean {
  return (status === 401 || status === 429) && object(data).totpRequired === true;
}
