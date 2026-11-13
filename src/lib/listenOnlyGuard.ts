// =============================================================================
// HYDRA-UMC STUDIO - Listen only for every write: lib/listenOnlyGuard.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Listen only (a switch in the preferences, off by default) already makes the guard of robot commands refuse everything but
// STOP. The administration of the server - services, cameras, settings, users, files - is written by many screens that
// each call fetch themselves, so the rule is also applied once at the door: while Listen only is on, every request that
// writes (anything but GET, HEAD or OPTIONS) is answered here with a 423 and never leaves the browser, except
//   - STOP: the global stop and a robot command that is stop, estop or disable;
//   - the sign-in, the renewal of the session and the sign-out, which write nothing about the machine.
// =============================================================================
import { API_BASE } from './apiBase';
import { getStudioPrefs, type StudioPrefs } from './studioPrefs';
import { LISTEN_ONLY_ALLOWED } from './motionGuard';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SESSION_PATHS = /^\/api\/(login|refresh|logout)\/?$/;
const ROBOT_COMMAND_PATH = /^\/api\/robot\/[^/]+\/command\/?$/;

/** Whether a request may leave the browser in Listen only. Pure: the same request always gets the same answer. */
export function listenOnlyAllows(method: string, pathname: string, body?: unknown): boolean {
  if (READ_METHODS.has(method.toUpperCase())) return true;
  if (SESSION_PATHS.test(pathname)) return true;
  if (pathname.replace(/\/$/, '') === '/api/stop-all') return true;
  if (ROBOT_COMMAND_PATH.test(pathname) && typeof body === 'string') {
    try {
      const parsed: unknown = JSON.parse(body);
      const command = parsed && typeof parsed === 'object' ? (parsed as { command?: unknown }).command : undefined;
      return typeof command === 'string' && LISTEN_ONLY_ALLOWED.has(command);
    } catch {
      return false;
    }
  }
  return false;
}

/** The answer a refused write gets: it never reached the server. */
export function listenOnlyRefusal(): Response {
  return new Response(JSON.stringify({ error: 'Listen only is on: nothing is written from this window except STOP.', code: 'listen-only' }), {
    status: 423,
    headers: { 'Content-Type': 'application/json' },
  });
}

type FetchLike = typeof fetch;

/** The origin of a server address, or null when it is not an absolute address. */
export function originOf(address: string, base?: string): string | null {
  try {
    return new URL(address, base).origin;
  } catch {
    return null;
  }
}

/** The origin of the server this window talks to (the base of its API; this page's own origin when the API is relative). */
export function currentServerOrigin(): string | null {
  return originOf(API_BASE, typeof location !== 'undefined' ? location.href : 'http://localhost/');
}

/** Whether requests to [origin] are read-only: Listen only is on for every server, or for that one. A request to an unknown origin follows the general switch. */
export function listenOnlyActiveFor(origin: string | null, prefs: Pick<StudioPrefs, 'listenOnly' | 'listenOnlyServers'> = getStudioPrefs()): boolean {
  return prefs.listenOnly || (origin !== null && prefs.listenOnlyServers.includes(origin));
}

/** A fetch that applies [listenOnlyAllows] while `isOn(origin)` says Listen only is on for the server of the request (null: its origin is unknown), and is `base` otherwise. */
export function withListenOnly(base: FetchLike, isOn: (origin: string | null) => boolean): FetchLike {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const isRequest = typeof Request !== 'undefined' && input instanceof Request;
    const url = isRequest ? input.url : String(input);
    const here = typeof location !== 'undefined' ? location.href : 'http://localhost/';
    if (!isOn(originOf(url, here))) return base(input, init);
    const method = init?.method ?? (isRequest ? input.method : 'GET');
    let pathname = url;
    try {
      pathname = new URL(url, here).pathname;
    } catch {
      /* a relative path is used as given */
    }
    if (listenOnlyAllows(method, pathname, init?.body ?? undefined)) return base(input, init);
    return Promise.resolve(listenOnlyRefusal());
  };
}

let installed = false;

/** Puts the door on window.fetch once, reading the preference at each request. */
export function installListenOnlyGuard(target: { fetch: FetchLike } = window): void {
  if (installed) return;
  installed = true;
  target.fetch = withListenOnly(target.fetch.bind(target), (origin) => listenOnlyActiveFor(origin));
}
