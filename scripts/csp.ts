// =============================================================================
// HYDRA-UMC STUDIO - Content-Security-Policy of the built page: scripts/csp.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The policy the production build puts in index.html, and how to change it. Scripts may only come from the
// page's own origin, so an injected <script> or inline handler does not run. Styles stay inline-friendly (the
// UI sets style attributes), and the 3D engine needs blob workers and WebAssembly. Connections are limited to
// http(s)/ws(s) because the server may live on another host (VITE_API_BASE_URL).
//
// HYDRA_STUDIO_CSP chooses at build time: "default" (the policy below), "off" (no policy at all, for a
// deployment that sets the header itself) or a complete policy of your own, used as given.
// =============================================================================

export const DEFAULT_CSP_DIRECTIVES: Readonly<Record<string, readonly string[]>> = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'wasm-unsafe-eval'", 'https://www.gstatic.com'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:', 'http:', 'https:'],
  'media-src': ["'self'", 'blob:', 'http:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", 'http:', 'https:', 'ws:', 'wss:', 'blob:', 'data:'],
  'worker-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

/** The default policy as one header value. */
export function defaultCsp(): string {
  return Object.entries(DEFAULT_CSP_DIRECTIVES)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
}

/** The policy for a HYDRA_STUDIO_CSP value: null for none, the default for unset/"default", else the value as typed. */
export function resolveCsp(setting: string | undefined): string | null {
  const value = (setting ?? '').trim();
  if (value === '' || value.toLowerCase() === 'default') return defaultCsp();
  if (value.toLowerCase() === 'off') return null;
  return value;
}

/** index.html with the policy as a <meta> tag right after <head>; unchanged when there is no policy. */
export function injectCsp(html: string, policy: string | null): string {
  if (policy === null || html.includes('Content-Security-Policy')) return html;
  const escaped = policy.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return html.replace(/<head>/i, `<head>\n    <meta http-equiv="Content-Security-Policy" content="${escaped}" />`);
}
