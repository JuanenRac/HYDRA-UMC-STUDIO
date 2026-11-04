// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/useAuthSession.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The session hook: the token read on the first render, the sign-in (with its second step), the silent renewal and the sign-out.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useAuthSession } from '../src/hooks/useAuthSession';
import { readRefreshToken, readToken } from '../src/lib/session';

function jwt(payload: Record<string, unknown>): string {
  const part = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part(payload)}.sig`;
}

function answer(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('the first render', () => {
  it('has no token and no role when nobody signed in', () => {
    const { result } = renderHook(() => useAuthSession());
    expect(result.current.authToken).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.accountRef.current.username).toBeNull();
  });

  it('reads the saved token at once and knows the role of its account', () => {
    const saved = jwt({ role: 'admin', username: 'ana' });
    window.localStorage.setItem('hydra_token', saved);
    const { result } = renderHook(() => useAuthSession());
    expect(result.current.authToken).toBe(saved);
    expect(result.current.role).toBe('admin');
    expect(result.current.accountRef.current.username).toBe('ana');
  });
});

describe('the sign-in', () => {
  it('keeps the tokens of a good answer for the tab and reports success', async () => {
    const token = jwt({ role: 'operator', username: 'ana' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(answer(200, { token, refreshToken: 'r1' }));
    const { result } = renderHook(() => useAuthSession());
    let ok = false;
    await act(async () => { ok = await result.current.login('ana', 'secret'); });
    expect(ok).toBe(true);
    expect(result.current.authToken).toBe(token);
    expect(result.current.loginError).toBeNull();
    expect(readToken()).toBe(token);
    expect(readRefreshToken()).toBe('r1');
  });

  it('sends the second step only when it was typed', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(answer(401, { error: 'x' }));
    const { result } = renderHook(() => useAuthSession());
    await act(async () => { await result.current.login('ana', 'secret'); });
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toEqual({ username: 'ana', password: 'secret' });
    await act(async () => { await result.current.login('ana', 'secret', false, '123 456'); });
    expect(JSON.parse(String(spy.mock.calls[1][1]?.body))).toEqual({ username: 'ana', password: 'secret', totp: '123456' });
  });

  it('asks for the code when the account has the second step on', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(answer(401, { totpRequired: true, error: 'code needed' }));
    const { result } = renderHook(() => useAuthSession());
    let ok = true;
    await act(async () => { ok = await result.current.login('ana', 'secret'); });
    expect(ok).toBe(false);
    expect(result.current.loginNeedsCode).toBe(true);
    expect(result.current.loginError).toBeTruthy();
    expect(result.current.authToken).toBeNull();
  });

  it('says the server cannot be reached when the request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network'));
    const { result } = renderHook(() => useAuthSession());
    let ok = true;
    await act(async () => { ok = await result.current.login('ana', 'secret'); });
    expect(ok).toBe(false);
    expect(result.current.loginError).toBeTruthy();
  });
});

describe('the silent renewal', () => {
  it('does nothing without a refresh token', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useAuthSession());
    let ok = true;
    await act(async () => { ok = await result.current.attemptTokenRefresh(); });
    expect(ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('swaps both tokens when the server renews them, and keeps the old ones when it refuses', async () => {
    window.sessionStorage.setItem('hydra_refresh_token', 'r0');
    window.sessionStorage.setItem('hydra_token', jwt({ role: 'operator' }));
    const fresh = jwt({ role: 'operator' });
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(answer(401, { error: 'expired' }));
    const { result } = renderHook(() => useAuthSession());
    const stored = readRefreshToken();
    const before = result.current.authToken;
    let ok = true;
    await act(async () => { ok = await result.current.attemptTokenRefresh(); });
    expect(ok).toBe(false);
    expect(result.current.authToken).toBe(before);
    expect(readRefreshToken()).toBe('r0');
    spy.mockResolvedValueOnce(answer(200, { token: fresh, refreshToken: 'r1' }));
    await act(async () => { ok = await result.current.attemptTokenRefresh(); });
    expect(stored).not.toBeNull();
    expect(ok).toBe(true);
    expect(result.current.authToken).toBe(fresh);
    expect(readRefreshToken()).toBe('r1');
  });
});
