// =============================================================================
// HYDRA-UMC STUDIO - tests/totpApi.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The calls and the reading of the answers of the second factor of the sign-in.
// =============================================================================
import { describe, expect, it, vi } from 'vitest';
import { failureOf, groupedKey, loginNeedsCode, normalizeCode, parseEnrolment, parseRecoveryCodes, parseStatus, totpApi } from '../src/lib/totpApi';

function reply(status: number, body: unknown, headers: Record<string, string> = {}): typeof fetch {
  return vi.fn(async () => ({ ok: status < 300, status, json: async () => body, headers: { get: (name: string) => headers[name] ?? null } }) as unknown as Response) as unknown as typeof fetch;
}

describe('reading the answers', () => {
  it('reads the state and refuses anything else', () => {
    expect(parseStatus({ enabled: true, recoveryLeft: 7 })).toEqual({ enabled: true, recoveryLeft: 7 });
    expect(parseStatus({ enabled: false })).toEqual({ enabled: false, recoveryLeft: 0 });
    expect(parseStatus({ enabled: 'yes' })).toBeNull();
    expect(parseStatus(null)).toBeNull();
  });

  it('accepts only a real otpauth address and a base32 key', () => {
    const good = { secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/HYDRA-UMC:admin?secret=JBSWY3DPEHPK3PXP' };
    expect(parseEnrolment(good)).toEqual(good);
    expect(parseEnrolment({ ...good, uri: 'https://example.com/' })).toBeNull();
    expect(parseEnrolment({ ...good, secret: 'not base32!' })).toBeNull();
  });

  it('accepts the recovery codes only when every one has the shape the server makes', () => {
    expect(parseRecoveryCodes({ recoveryCodes: ['0a1b2-c3d4e', 'ffeed-00112'] })).toEqual(['0a1b2-c3d4e', 'ffeed-00112']);
    expect(parseRecoveryCodes({ recoveryCodes: ['0a1b2-c3d4e', '<script>'] })).toBeNull();
    expect(parseRecoveryCodes({ recoveryCodes: [] })).toBeNull();
    expect(parseRecoveryCodes({})).toBeNull();
  });
});

describe('codes and keys as typed', () => {
  it('groups the key by four', () => {
    expect(groupedKey('JBSWY3DPEHPK3PXP')).toBe('JBSW Y3DP EHPK 3PXP');
  });
  it('keeps an app code as six digits however it was spaced, and a recovery code as typed in lower case', () => {
    expect(normalizeCode(' 123 456 ')).toBe('123456');
    expect(normalizeCode('123-456')).toBe('123456');
    expect(normalizeCode('0A1B2-C3D4E')).toBe('0a1b2-c3d4e');
  });
});

describe('failures', () => {
  it('tells apart what the screen can say', () => {
    expect(failureOf(404, null)).toEqual({ kind: 'unsupported' });
    expect(failureOf(403, null)).toEqual({ kind: 'forbidden' });
    expect(failureOf(409, null)).toEqual({ kind: 'already' });
    expect(failureOf(401, { error: 'Invalid credentials' })).toEqual({ kind: 'password' });
    expect(failureOf(401, { totpRequired: true })).toEqual({ kind: 'code' });
    expect(failureOf(400, {})).toEqual({ kind: 'code' });
    expect(failureOf(429, {}, { get: () => '42' })).toEqual({ kind: 'wait', seconds: 42 });
    expect(failureOf(429, {})).toEqual({ kind: 'wait', seconds: 30 });
    expect(failureOf(500, {})).toEqual({ kind: 'http', status: 500 });
  });

  it('knows when a sign-in wants the second step', () => {
    expect(loginNeedsCode(401, { totpRequired: true })).toBe(true);
    expect(loginNeedsCode(429, { totpRequired: true })).toBe(true);
    expect(loginNeedsCode(401, { error: 'Invalid credentials' })).toBe(false);
    expect(loginNeedsCode(200, { totpRequired: true })).toBe(false);
  });
});

describe('the calls', () => {
  it('asks for the state', async () => {
    const f = reply(200, { enabled: true, recoveryLeft: 3 });
    expect(await totpApi.status(f)).toEqual({ ok: true, value: { enabled: true, recoveryLeft: 3 } });
    expect((f as any).mock.calls[0][0]).toBe('/api/totp/status');
  });

  it('sends the password to begin and a normalised code to confirm', async () => {
    const begin = reply(200, { success: true, secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/HYDRA-UMC:a?secret=JBSWY3DPEHPK3PXP' });
    expect((await totpApi.begin('pw', begin)).ok).toBe(true);
    expect(JSON.parse((begin as any).mock.calls[0][1].body)).toEqual({ password: 'pw' });
    const confirm = reply(200, { success: true, recoveryCodes: ['0a1b2-c3d4e'] });
    expect(await totpApi.confirm('123 456', confirm)).toEqual({ ok: true, value: ['0a1b2-c3d4e'] });
    expect(JSON.parse((confirm as any).mock.calls[0][1].body)).toEqual({ code: '123456' });
  });

  it('names the wrong password and the wrong code apart when turning it off', async () => {
    expect(await totpApi.disable('bad', '123456', reply(401, { error: 'Invalid credentials' }))).toEqual({ ok: false, failure: { kind: 'password' } });
    expect(await totpApi.disable('pw', '000000', reply(401, { error: 'A current code or an unused recovery code is required' }))).toEqual({ ok: false, failure: { kind: 'code' } });
    expect(await totpApi.disable('pw', '123456', reply(200, { success: true }))).toEqual({ ok: true, value: true });
  });

  it('reports a wait with its seconds, a missing route and a dead network', async () => {
    expect(await totpApi.disable('pw', '1', reply(429, {}, { 'Retry-After': '60' }))).toEqual({ ok: false, failure: { kind: 'wait', seconds: 60 } });
    expect(await totpApi.status(reply(404, {}))).toEqual({ ok: false, failure: { kind: 'unsupported' } });
    const dead = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect(await totpApi.status(dead)).toEqual({ ok: false, failure: { kind: 'network' } });
  });

  it('lets an administrator remove the second step of an account', async () => {
    const f = reply(200, { success: true });
    expect((await totpApi.reset('ana lópez', f)).ok).toBe(true);
    expect((f as any).mock.calls[0][0]).toBe('/api/users/ana%20l%C3%B3pez/totp');
    expect((f as any).mock.calls[0][1].method).toBe('DELETE');
  });
});
