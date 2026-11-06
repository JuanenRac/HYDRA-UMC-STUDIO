// =============================================================================
// HYDRA-UMC STUDIO - Backend API base URL resolution: src/lib/apiBase.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// HYDRA-UMC STUDIO is a pure Vite/React client - the Express/WebSocket backend is a separate project, HYDRA-UMC-SERVER
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

import { apiUrl as kitApiUrl, resolveApiBase, wsUrl as kitWsUrl } from 'hydra-umc-studio-kit';

/** '' in dev (relative paths, proxied by vite.config.ts's own server.proxy)
 * - a real absolute origin (VITE_API_BASE_URL, or this same page's origin) in a production build.
 * The rules live in the shared kit; the page location is passed in here. The port is this page's own: the page may be served from a port other than 3000
 * (the Android 3D-viewport WebView loads it with whatever port was configured), and behind a reverse proxy on 80/443 the page has no port. The scheme is this
 * page's own too: with TLS the server serves STUDIO over https:, and a request built on a hardcoded http: origin would be refused as mixed content. */
export const API_BASE: string = resolveApiBase({
  configured: import.meta.env.VITE_API_BASE_URL as string | undefined,
  dev: import.meta.env.DEV,
  location: typeof window !== 'undefined' ? window.location : null,
});

/** Prefixes a backend path ('/api/settings', '/WORKS/Foo/index.json', ...)
 * with API_BASE - relative in dev (proxied), absolute in prod. */
export function apiUrl(path: string): string {
  // Only a path that starts with a slash goes through the kit; anything else (the empty path, a query) is appended as it always was.
  return path.startsWith('/') ? kitApiUrl(API_BASE, path) : `${API_BASE}${path}`;
}

/** Same idea for the /ws upgrade - matches API_BASE's own host/port, just
 * with ws:/wss: instead of http:/https:. */
export function wsUrl(path: string): string {
  return kitWsUrl(API_BASE, path, typeof window !== 'undefined' ? window.location : null);
}
