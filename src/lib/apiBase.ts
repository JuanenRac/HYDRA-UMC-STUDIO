// =============================================================================
// HYDRA-UMC STUDIO - Backend API base URL resolution: src/lib/apiBase.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// HYDRA-UMC STUDIO is now a pure Vite/React client - the Express/WebSocket
// backend that used to live in this same repo's own server.ts is a
// separate project, HYDRA-UMC-SERVER (github.com/JuanenRac/HYDRA-UMC-SERVER),
// reached over the network exactly like HYDRA-UMC SUITE/ANDROID-CONTROL/
// IOS-CONTROL/DSI already reach it.
//
// Two strategies work together here, one for dev and one for prod - both
// documented, deliberately not just one:
//
//   - DEV (`npm run dev`, import.meta.env.DEV true): every call site below
//     keeps using a RELATIVE path ('/api/settings', '/ws', '/WORKS/...').
//     vite.config.ts's own server.proxy transparently forwards those to
//     http://localhost:3000 - no CORS involved, nothing for a developer to
//     configure, and the exact same relative-path code that runs in
//     production still works unmodified against the proxy.
//   - PROD (a real `vite build` output, served statically from anywhere -
//     the CM5 itself, or a completely different host): there is no dev
//     server left to proxy anything, so every call needs a real absolute
//     origin. Defaults to this same page's own hostname on port 3000
//     (matches today's "everything on the CM5" deployment - STUDIO's
//     static files and HYDRA-UMC-SERVER both reachable at the robot's own
//     IP), overridable with VITE_API_BASE_URL (see .env.example) for the
//     case where the frontend is hosted somewhere other than the machine
//     actually running the backend.
//
// Every fetch()/WebSocket call in src/ that talks to the backend goes
// through apiUrl()/wsUrl() below instead of hardcoding a path - this is
// the ONE place that decides whether that path is relative (dev, proxied)
// or absolute (prod, configurable).
// =============================================================================

const rawConfiguredBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const configuredBase = rawConfiguredBase ? rawConfiguredBase.replace(/\/+$/, '') : undefined;

function defaultProdBase(): string {
  const hostname = typeof window !== 'undefined' && window.location.hostname
    ? window.location.hostname
    : 'localhost';
  return `http://${hostname}:3000`;
}

/** '' in dev (relative paths, proxied by vite.config.ts's own server.proxy)
 * - a real absolute origin (VITE_API_BASE_URL, or this same host on :3000)
 * in a production build. */
export const API_BASE: string = import.meta.env.DEV
  ? ''
  : (configuredBase || defaultProdBase());

/** Prefixes a backend path ('/api/settings', '/WORKS/Foo/index.json', ...)
 * with API_BASE - relative in dev (proxied), absolute in prod. */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/** Same idea for the /ws upgrade - matches API_BASE's own host/port, just
 * with ws:/wss: instead of http:/https:. */
export function wsUrl(path: string): string {
  if (API_BASE) {
    const wsProto = API_BASE.startsWith('https:') ? 'wss:' : 'ws:';
    const rest = API_BASE.replace(/^https?:/, '');
    return `${wsProto}${rest}${path}`;
  }
  const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost';
  return `${proto}//${host}${path}`;
}
