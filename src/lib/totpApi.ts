// =============================================================================
// HYDRA-UMC STUDIO - src/lib/totpApi.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The calls of the second factor of the sign-in (SERVER routes /api/totp/status|begin|confirm|disable and the
// administrator's DELETE /api/users/:username/totp) with their answers read defensively: a server that predates the
// routes answers 404 and the screen says so instead of showing a broken form. Nothing here stores a secret: the key and
// the recovery codes only live in the component that shows them, until the operator closes it.
import type { HydraServerClient } from '../generated/hydra-server-client';
import { makeClient, ServerHttpError } from './serverClient';

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

type Run = (client: HydraServerClient) => Promise<unknown>;

async function call<T>(run: Run, read: (data: unknown) => T | null, fetcher?: typeof fetch, isDisable = false): Promise<TotpResult<T>> {
  try {
    const data = await run(makeClient(fetcher));
    const value = read(data);
    return value === null ? { ok: false, failure: { kind: 'http', status: 200 } } : { ok: true, value };
  } catch (error) {
    if (!(error instanceof ServerHttpError)) return { ok: false, failure: { kind: 'network' } };
    // A wrong code on /disable answers 401 without totpRequired: the password was already checked first, so it is the code.
    const failure = failureOf(error.status, error.body, { get: () => error.retryAfter });
    return { ok: false, failure: isDisable && failure.kind === 'password' && /code/i.test(String(object(error.body).error ?? '')) ? { kind: 'code' } : failure };
  }
}

const done = (): true => true;

export const totpApi = {
  status: (fetcher?: typeof fetch) => call(client => client.getTotpStatus(), parseStatus, fetcher),
  begin: (password: string, fetcher?: typeof fetch) => call(client => client.postTotpBegin({ body: { password } }), parseEnrolment, fetcher),
  confirm: (code: string, fetcher?: typeof fetch) => call(client => client.postTotpConfirm({ body: { code: normalizeCode(code) } }), parseRecoveryCodes, fetcher),
  disable: (password: string, code: string, fetcher?: typeof fetch) => call(client => client.postTotpDisable({ body: { password, code: normalizeCode(code) } }), done, fetcher, true),
  reset: (username: string, fetcher?: typeof fetch) => call(client => client.deleteUsersByUsernameTotp({ path: { username } }), done, fetcher),
};

/** What the sign-in answered when it wants the second step: 401 with totpRequired, or the wait (429) that comes with it. */
export function loginNeedsCode(status: number, data: unknown): boolean {
  return (status === 401 || status === 429) && object(data).totpRequired === true;
}
