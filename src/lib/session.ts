// =============================================================================
// HYDRA-UMC STUDIO - session tokens: session.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Where the access token and the refresh token live, and the one way every call to the server gets its
// Authorization header.
//
// - A login typed into this page is kept in sessionStorage by default: it survives a reload of the tab but not
//   closing it, and no other tab or later visit can read it. Ticking "keep me signed in on this device" at login keeps
//   it in localStorage instead, so a restart of the browser and a second tab stay signed in. An older login already in
//   localStorage keeps working.
// - A token that arrives in the address is kept in sessionStorage only: it dies with that view, is not shared with
//   other tabs of the same origin and is never written to the storage a script of the page can read after the view
//   is gone. The apps open their embedded 3D view with it in the fragment (`#token=`), which a browser never sends
//   to a server and no proxy or access log records; the query form (`?token=`) is still read for an app that has
//   not moved yet. Either way it is removed from the address as soon as it is read.
// - The refresh token lives in the same storage as the access token it belongs to.
// =============================================================================

import {
  DEFAULT_REFRESH_TOKEN_KEY,
  DEFAULT_TOKEN_KEY,
  createSession,
  extractLaunchToken as kitExtractLaunchToken,
  type SessionStores,
} from 'hydra-umc-studio-kit';

export const TOKEN_KEY = DEFAULT_TOKEN_KEY;
export const REFRESH_TOKEN_KEY = DEFAULT_REFRESH_TOKEN_KEY;

type Stores = SessionStores;

// The kit holds the rules above. A session is made on every call, so the storages of the page are looked up at the moment of use (as before) and a
// test can pass its own.
const sessionOf = (stores?: Stores) => createSession(stores ? { stores } : {});

/** The access token of this page: the one a launch address brought (sessionStorage) wins over a saved login. */
export function readToken(stores?: Stores): string | null {
  return sessionOf(stores).readToken();
}

export function readRefreshToken(stores?: Stores): string | null {
  return sessionOf(stores).readRefreshToken();
}

/**
 * The token a launch address carries, and the address without it. The fragment form (`#token=...`) wins over the
 * query form (`?token=...`); other parameters and fragment entries are kept. Null when there is no token or the
 * address cannot be parsed.
 */
export function extractLaunchToken(href: string): { token: string; cleanedUrl: string } | null {
  return kitExtractLaunchToken(href, { acceptQuery: true });
}

/** A token received in the address: kept for this view only, and a saved one cannot be mistaken for it later. */
export function saveLaunchToken(token: string, stores?: Stores): void {
  sessionOf(stores).saveLaunchToken(token);
}

/**
 * A login typed into this page (or a refresh of one). By default it lasts as long as the tab ([persist] false);
 * with [persist] true it is kept across browser restarts and shared by the tabs of this browser.
 */
export function saveLoginTokens(token: string, refreshToken: string | undefined, stores?: Stores, persist = false): void {
  sessionOf(stores).saveLoginTokens(token, refreshToken, persist);
}

/** Replaces the access token wherever it currently lives (a silent refresh keeps a launch token a launch token). */
export function replaceToken(token: string, refreshToken: string | undefined, stores?: Stores): void {
  sessionOf(stores).replaceToken(token, refreshToken);
}

export function clearTokens(stores?: Stores): void {
  sessionOf(stores).clear();
}

/** The Authorization header for the current session, or none when signed out. */
export function authHeaders(extra: Record<string, string> = {}, stores?: Stores): Record<string, string> {
  return sessionOf(stores).authHeaders(extra);
}

/** fetch() with the session's Authorization header added (a header the caller sets itself is kept). */
export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = readToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
