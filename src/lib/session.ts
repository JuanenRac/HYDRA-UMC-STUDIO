// =============================================================================
// HYDRA-UMC STUDIO - session tokens: session.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Where the access token and the refresh token live, and the one way every call to the server gets its
// Authorization header.
//
// - A login typed into this page is kept in localStorage, so a reload or a second tab stays signed in.
// - A token that arrives in the address (`?token=`, how the Android and iOS apps open their embedded 3D view) is
//   kept in sessionStorage only: it dies with that view, is not shared with other tabs of the same origin and is
//   never written to the storage a script of the page can read after the view is gone.
// =============================================================================

export const TOKEN_KEY = 'hydra_token';
export const REFRESH_TOKEN_KEY = 'hydra_refresh_token';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserStorage(kind: 'localStorage' | 'sessionStorage'): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    return window[kind];
  } catch {
    return null; // storage blocked (private mode, embedded view without storage)
  }
}

interface Stores { local: StorageLike | null; session: StorageLike | null }

function defaultStores(): Stores {
  return { local: browserStorage('localStorage'), session: browserStorage('sessionStorage') };
}

function safeGet(store: StorageLike | null, key: string): string | null {
  try { return store ? store.getItem(key) : null; } catch { return null; }
}

function safeSet(store: StorageLike | null, key: string, value: string): void {
  try { store?.setItem(key, value); } catch { /* quota or blocked: the session lasts as long as the page */ }
}

function safeRemove(store: StorageLike | null, key: string): void {
  try { store?.removeItem(key); } catch { /* nothing to remove */ }
}

/** The access token of this page: the one a launch address brought (sessionStorage) wins over a saved login. */
export function readToken(stores: Stores = defaultStores()): string | null {
  return safeGet(stores.session, TOKEN_KEY) ?? safeGet(stores.local, TOKEN_KEY);
}

export function readRefreshToken(stores: Stores = defaultStores()): string | null {
  return safeGet(stores.local, REFRESH_TOKEN_KEY);
}

/** A token received in the address: kept for this view only, and a saved one cannot be mistaken for it later. */
export function saveLaunchToken(token: string, stores: Stores = defaultStores()): void {
  safeSet(stores.session, TOKEN_KEY, token);
}

/** A login typed into this page (or a refresh of one): kept across reloads. */
export function saveLoginTokens(token: string, refreshToken: string | undefined, stores: Stores = defaultStores()): void {
  // A new login replaces whatever the launch address brought.
  safeRemove(stores.session, TOKEN_KEY);
  safeSet(stores.local, TOKEN_KEY, token);
  if (typeof refreshToken === 'string') safeSet(stores.local, REFRESH_TOKEN_KEY, refreshToken);
}

/** Replaces the access token wherever it currently lives (a silent refresh keeps a launch token a launch token). */
export function replaceToken(token: string, refreshToken: string | undefined, stores: Stores = defaultStores()): void {
  if (safeGet(stores.session, TOKEN_KEY) !== null) {
    safeSet(stores.session, TOKEN_KEY, token);
  } else {
    safeSet(stores.local, TOKEN_KEY, token);
  }
  if (typeof refreshToken === 'string') safeSet(stores.local, REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(stores: Stores = defaultStores()): void {
  safeRemove(stores.session, TOKEN_KEY);
  safeRemove(stores.local, TOKEN_KEY);
  safeRemove(stores.local, REFRESH_TOKEN_KEY);
}

/** The Authorization header for the current session, or none when signed out. */
export function authHeaders(extra: Record<string, string> = {}, stores: Stores = defaultStores()): Record<string, string> {
  const token = readToken(stores);
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

/** fetch() with the session's Authorization header added (a header the caller sets itself is kept). */
export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = readToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
