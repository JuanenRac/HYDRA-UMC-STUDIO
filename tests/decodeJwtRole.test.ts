// =============================================================================
// HYDRA-UMC STUDIO - tests/decodeJwtRole.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real unit tests for store.tsx's own decodeJwtRole() - found missing while
// auditing the code: STUDIO, the main
// client, had zero tests of its own session/credentials handling, unlike
// IOS-CONTROL/ANDROID/SERVER. This is the one pure, DOM-free piece of that
// handling (a token that arrived via a ?token= URL param, or a stale/
// corrupted localStorage value, must degrade to null - never throw and take
// the whole app down with it) - the rest (login()/logout()/the WS 1008 ->
// forced-logout reconnect guard) needs a full component/hook render (jsdom +
// @testing-library/react, neither set up in this project yet - see
// vitest.config.ts's own header comment on why this suite stays DOM-free)
// and is out of this pass's own scope.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { decodeJwtRole } from '../src/store';

function b64url(json: unknown): string {
  return Buffer.from(JSON.stringify(json)).toString('base64url');
}

describe('decodeJwtRole', () => {
  it('reads a real role claim out of a real-shaped JWT payload', () => {
    const token = `header.${b64url({ username: 'op1', role: 'admin' })}.signature`;
    expect(decodeJwtRole(token)).toBe('admin');
  });

  it('returns null for a null token (no session yet)', () => {
    expect(decodeJwtRole(null)).toBeNull();
  });

  it('returns null for an empty string token', () => {
    expect(decodeJwtRole('')).toBeNull();
  });

  it('returns null when the payload segment is missing entirely (no dots)', () => {
    expect(decodeJwtRole('not-a-jwt-at-all')).toBeNull();
  });

  it('returns null when the payload is not valid base64 (never throws)', () => {
    expect(decodeJwtRole('header.###not-base64###.signature')).toBeNull();
  });

  it('returns null when the decoded payload is not valid JSON (never throws)', () => {
    const notJson = Buffer.from('this is not json').toString('base64url');
    expect(decodeJwtRole(`header.${notJson}.signature`)).toBeNull();
  });

  it('returns null when the payload has no role field at all', () => {
    const token = `header.${b64url({ username: 'op1' })}.signature`;
    expect(decodeJwtRole(token)).toBeNull();
  });

  it('returns null when role is present but not a string (a stale/corrupted value, not a real role)', () => {
    const token = `header.${b64url({ username: 'op1', role: 42 })}.signature`;
    expect(decodeJwtRole(token)).toBeNull();
  });

  it('handles the URL-safe base64 characters (-/_) a real JWT payload can contain, not just plain base64', () => {
    // A role string long/specific enough that JSON.stringify's own base64
    // encoding is likely to produce at least one -/_ character for real,
    // not just in theory - proves the .replace(/-/g,'+').replace(/_/g,'/')
    // conversion in decodeJwtRole itself is actually exercised, not just
    // present in the source.
    const raw = Buffer.from(JSON.stringify({ username: 'op1', role: 'admin', scope: 'read/write?query>>>' }));
    const urlSafe = raw.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(decodeJwtRole(`header.${urlSafe}.signature`)).toBe('admin');
  });
});
