// =============================================================================
// HYDRA-UMC STUDIO - Content-Security-Policy of the built page: scripts/csp.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The policy the production build puts in index.html, and how to change it. Scripts may only come from the
// page's own origin, so an injected <script> or inline handler does not run. Styles stay inline-friendly (the
// UI sets style attributes), and the 3D engine needs blob workers and WebAssembly. Connections are limited to the
// page's own origin, the server named by VITE_API_BASE_URL when the build has one (and its WebSocket), and the two
// hosts of GitHub that the firmware update reads (and the storage hosts a release asset is redirected to); a script that got in cannot send the session anywhere else.
//
// HYDRA_STUDIO_CSP chooses at build time: "default" (the policy below), "off" (no policy at all, for a
// deployment that sets the header itself) or a complete policy of your own, used as given. A deployment whose
// cameras or server live on other hosts than these sets its own policy there.
// =============================================================================

/** The only third-party hosts the app reads from itself: the release feed of the firmware update and the storage hosts a release asset is sent from. */
export const GITHUB_CONNECT_HOSTS: readonly string[] = ['https://api.github.com', 'https://raw.githubusercontent.com', 'https://objects.githubusercontent.com', 'https://release-assets.githubusercontent.com'];

export const DEFAULT_CSP_DIRECTIVES: Readonly<Record<string, readonly string[]>> = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'wasm-unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:', 'http:', 'https:'],
  'media-src': ["'self'", 'blob:', 'http:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", ...GITHUB_CONNECT_HOSTS, 'blob:', 'data:'],
  'worker-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

/** The origin of a server address (VITE_API_BASE_URL) and the address of its WebSocket, or nothing when it is not an http(s) address. */
export function serverConnectSources(apiBase: string | undefined): string[] {
  try {
    const url = new URL((apiBase ?? '').trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return [];
    return [url.origin, `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`];
  } catch {
    return [];
  }
}

/** The default policy as one header value; `apiBase` is the server address the build was given, which the page may connect to. */
export function defaultCsp(apiBase?: string): string {
  const extra = serverConnectSources(apiBase);
  return Object.entries(DEFAULT_CSP_DIRECTIVES)
    .map(([name, sources]) => `${name} ${(name === 'connect-src' ? [...sources, ...extra] : sources).join(' ')}`)
    .join('; ');
}

/** The policy for a HYDRA_STUDIO_CSP value: null for none, the default for unset/"default", else the value as typed. */
export function resolveCsp(setting: string | undefined, apiBase?: string): string | null {
  const value = (setting ?? '').trim();
  if (value === '' || value.toLowerCase() === 'default') return defaultCsp(apiBase);
  if (value.toLowerCase() === 'off') return null;
  return value;
}

/** index.html with the policy as a <meta> tag right after <head>; unchanged when there is no policy. */
export function injectCsp(html: string, policy: string | null): string {
  if (policy === null || html.includes('Content-Security-Policy')) return html;
  const escaped = policy.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return html.replace(/<head>/i, `<head>\n    <meta http-equiv="Content-Security-Policy" content="${escaped}" />`);
}
