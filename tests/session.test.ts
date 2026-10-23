// =============================================================================
// HYDRA-UMC STUDIO - tests/session.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import {
  REFRESH_TOKEN_KEY,
  TOKEN_KEY,
  authHeaders,
  clearTokens,
  extractLaunchToken,
  readRefreshToken,
  readToken,
  replaceToken,
  saveLaunchToken,
  saveLoginTokens,
} from '../src/lib/session';

function memoryStore() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}

function stores() {
  const local = memoryStore();
  const session = memoryStore();
  return { local, session, both: { local, session } };
}

describe('the token that arrives in the address', () => {
  it('is kept for this view only, never in the persistent storage', () => {
    const s = stores();
    saveLaunchToken('launch.jwt', s.both);
    expect(readToken(s.both)).toBe('launch.jwt');
    expect(s.session.data.get(TOKEN_KEY)).toBe('launch.jwt');
    expect(s.local.data.has(TOKEN_KEY)).toBe(false);
  });
  it('wins over a saved login while the view lives', () => {
    const s = stores();
    saveLoginTokens('saved.jwt', 'saved.refresh', s.both);
    saveLaunchToken('launch.jwt', s.both);
    expect(readToken(s.both)).toBe('launch.jwt');
  });
  it('stays a launch token when it is silently refreshed', () => {
    const s = stores();
    saveLaunchToken('launch.jwt', s.both);
    replaceToken('renewed.jwt', 'renewed.refresh', s.both);
    expect(s.session.data.get(TOKEN_KEY)).toBe('renewed.jwt');
    expect(s.local.data.has(TOKEN_KEY)).toBe(false);
    expect(readRefreshToken(s.both)).toBe('renewed.refresh');
  });
});

describe('extractLaunchToken', () => {
  const page = 'https://cell.local:3000/';
  it('reads the token from the fragment and leaves a clean address', () => {
    expect(extractLaunchToken(`${page}?hideUI=true&robotId=2#token=abc.def.ghi`)).toEqual({
      token: 'abc.def.ghi',
      cleanedUrl: `${page}?hideUI=true&robotId=2`,
    });
  });
  it('still reads the query form of an app that has not moved yet, and removes it', () => {
    expect(extractLaunchToken(`${page}?hideUI=true&token=abc&robotId=2`)).toEqual({
      token: 'abc',
      cleanedUrl: `${page}?hideUI=true&robotId=2`,
    });
  });
  it('prefers the fragment when both are present and removes both', () => {
    expect(extractLaunchToken(`${page}?token=from-query#token=from-fragment`)).toEqual({ token: 'from-fragment', cleanedUrl: page });
  });
  it('keeps the other fragment entries', () => {
    expect(extractLaunchToken(`${page}#view=3d&token=t1`)).toEqual({ token: 't1', cleanedUrl: `${page}#view=3d` });
  });
  it('keeps a token that needs percent-decoding intact', () => {
    expect(extractLaunchToken(`${page}#token=a%2Bb%3D`)?.token).toBe('a+b=');
  });
  it('returns null without a token, with an empty one, or for an address that is not a URL', () => {
    expect(extractLaunchToken(`${page}?hideUI=true`)).toBeNull();
    expect(extractLaunchToken(`${page}#token=`)).toBeNull();
    expect(extractLaunchToken(`${page}?token=`)).toBeNull();
    expect(extractLaunchToken('not a url')).toBeNull();
  });
});

describe('a login typed into the page', () => {
  it('lasts as long as the tab by default and replaces a launch token', () => {
    const s = stores();
    saveLaunchToken('launch.jwt', s.both);
    saveLoginTokens('login.jwt', 'login.refresh', s.both);
    expect(readToken(s.both)).toBe('login.jwt');
    expect(s.session.data.get(TOKEN_KEY)).toBe('login.jwt');
    expect(s.session.data.get(REFRESH_TOKEN_KEY)).toBe('login.refresh');
    expect(s.local.data.has(TOKEN_KEY)).toBe(false);
    expect(s.local.data.has(REFRESH_TOKEN_KEY)).toBe(false);
  });
  it('is kept across browser restarts only when the person asked for it', () => {
    const s = stores();
    saveLoginTokens('login.jwt', 'login.refresh', s.both, true);
    expect(readToken(s.both)).toBe('login.jwt');
    expect(s.local.data.get(TOKEN_KEY)).toBe('login.jwt');
    expect(s.local.data.get(REFRESH_TOKEN_KEY)).toBe('login.refresh');
    expect(s.session.data.has(TOKEN_KEY)).toBe(false);
  });
  it('a later login without the choice removes what an earlier persistent one left', () => {
    const s = stores();
    saveLoginTokens('old.jwt', 'old.refresh', s.both, true);
    saveLoginTokens('new.jwt', 'new.refresh', s.both);
    expect(s.local.data.has(TOKEN_KEY)).toBe(false);
    expect(s.local.data.has(REFRESH_TOKEN_KEY)).toBe(false);
    expect(readToken(s.both)).toBe('new.jwt');
    expect(readRefreshToken(s.both)).toBe('new.refresh');
  });
  it('an older login already in localStorage keeps working and is renewed in place', () => {
    const s = stores();
    s.local.data.set(TOKEN_KEY, 'legacy.jwt');
    s.local.data.set(REFRESH_TOKEN_KEY, 'legacy.refresh');
    expect(readToken(s.both)).toBe('legacy.jwt');
    expect(readRefreshToken(s.both)).toBe('legacy.refresh');
    replaceToken('renewed.jwt', 'renewed.refresh', s.both);
    expect(s.local.data.get(TOKEN_KEY)).toBe('renewed.jwt');
    expect(s.session.data.has(TOKEN_KEY)).toBe(false);
  });
  it('keeps the old refresh token when a login brings none', () => {
    const s = stores();
    saveLoginTokens('a', 'r1', s.both);
    saveLoginTokens('b', undefined, s.both);
    expect(readRefreshToken(s.both)).toBe('r1');
  });
});

describe('clearTokens and authHeaders', () => {
  it('signs out of both storages', () => {
    const s = stores();
    saveLoginTokens('a', 'r', s.both, true);
    saveLoginTokens('c', 'r2', s.both);
    saveLaunchToken('b', s.both);
    clearTokens(s.both);
    expect(s.local.data.size + s.session.data.size).toBe(0);
    expect(readToken(s.both)).toBe(null);
    expect(readRefreshToken(s.both)).toBe(null);
  });
  it('adds the bearer header only when signed in, and keeps the caller\'s headers', () => {
    const s = stores();
    expect(authHeaders({ 'Content-Type': 'application/json' }, s.both)).toEqual({ 'Content-Type': 'application/json' });
    saveLoginTokens('tok', undefined, s.both);
    expect(authHeaders({ 'Content-Type': 'application/json' }, s.both)).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer tok',
    });
  });
  it('works without any storage at all', () => {
    const none = { local: null, session: null };
    expect(readToken(none)).toBe(null);
    saveLoginTokens('x', 'y', none);
    expect(authHeaders({}, none)).toEqual({});
  });
  it('survives a storage that throws', () => {
    const broken = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    const both = { local: broken, session: broken };
    expect(readToken(both)).toBe(null);
    expect(() => saveLoginTokens('x', 'y', both)).not.toThrow();
    expect(() => clearTokens(both)).not.toThrow();
  });
});
