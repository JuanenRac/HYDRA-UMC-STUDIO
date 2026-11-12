// =============================================================================
// HYDRA-UMC STUDIO - The dev-server proxy rules: scripts/devProxy.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// In development the app calls relative paths and the Vite dev server forwards them to the real server. /api and
// /ws are always forwarded. The folders of raw data files the server serves outside /api (the Works of the robots,
// WORKS by default) are a list of prefixes in dev-proxy.config.json, so a Works path outside WORKS/ can be forwarded
// by editing that file, not the code:
//
//   { "target": "http://localhost:3000", "paths": ["/WORKS", "/MY-WORKS"] }
//
// HYDRA_STUDIO_PROXY_TARGET overrides the target. A prefix that is not safe to forward (the root, a pattern, a path
// of the dev server itself) is left out and said so; nothing is forwarded that was not asked for by name.
// =============================================================================

export const DEFAULT_PROXY_TARGET = 'http://localhost:3000';
export const DEFAULT_PROXY_PATHS: readonly string[] = ['/WORKS'];

/** What the dev server answers by itself: forwarding these would break hot reload and the page. */
const RESERVED_PATHS = ['/src', '/node_modules', '/index.html', '/api', '/ws'];
const RESERVED_STARTS = ['/@', '/__'];

export interface ProxyRule {
  target: string;
  changeOrigin: true;
  ws?: true;
}

export interface DevProxy {
  rules: Record<string, ProxyRule>;
  /** One sentence for each value of the file that was not used. */
  warnings: string[];
}

/** The canonical form of a prefix ("/WORKS/" -> "/WORKS"), or why it cannot be forwarded. */
export function checkProxyPath(value: unknown): { path: string } | { problem: string } {
  if (typeof value !== 'string') return { problem: 'it is not text' };
  const path = value.trim().replace(/\/+$/, '');
  if (path === '') return { problem: 'it is the root of the dev server' };
  if (!path.startsWith('/')) return { problem: 'it does not start with "/"' };
  if (/[\s*?#\\^$()[\]{}|]/.test(path)) return { problem: 'it holds a blank or a pattern character' };
  if (path.split('/').some((part) => part === '..' || part === '.')) return { problem: 'it holds a dot segment' };
  const lower = path.toLowerCase();
  for (const reserved of RESERVED_PATHS) {
    if (lower === reserved || lower.startsWith(`${reserved}/`)) return { problem: `${reserved} belongs to the dev server or is always forwarded` };
  }
  for (const start of RESERVED_STARTS) {
    if (lower.startsWith(start)) return { problem: `${start}... belongs to the dev server` };
  }
  return { path };
}

/** A target that is an http(s) address with no credentials, or null. */
export function checkProxyTarget(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** The proxy rules for the text of dev-proxy.config.json (undefined when there is no file) and the environment. */
export function resolveDevProxy(configText: string | undefined, env: Record<string, string | undefined> = {}): DevProxy {
  const warnings: string[] = [];
  let target = DEFAULT_PROXY_TARGET;
  let wanted: readonly unknown[] = DEFAULT_PROXY_PATHS;

  if (configText !== undefined) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(configText);
    } catch {
      parsed = undefined;
      warnings.push('dev-proxy.config.json is not valid JSON: the defaults are used');
    }
    if (parsed !== undefined) {
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        warnings.push('dev-proxy.config.json is not an object: the defaults are used');
      } else {
        const file = parsed as Record<string, unknown>;
        if ('target' in file) {
          const checked = checkProxyTarget(file.target);
          if (checked) target = checked;
          else warnings.push('"target" is not an http(s) address without credentials: the default is used');
        }
        if ('paths' in file) {
          if (Array.isArray(file.paths)) wanted = file.paths;
          else warnings.push('"paths" is not a list: the default is used');
        }
      }
    }
  }

  const fromEnv = (env.HYDRA_STUDIO_PROXY_TARGET ?? '').trim();
  if (fromEnv !== '') {
    const checked = checkProxyTarget(fromEnv);
    if (checked) target = checked;
    else warnings.push('HYDRA_STUDIO_PROXY_TARGET is not an http(s) address without credentials: it is ignored');
  }

  const rules: Record<string, ProxyRule> = {
    '/api': { target, changeOrigin: true },
    '/ws': { target, ws: true, changeOrigin: true },
  };
  for (const value of wanted) {
    const checked = checkProxyPath(value);
    if ('problem' in checked) {
      warnings.push(`${JSON.stringify(value)} is not forwarded: ${checked.problem}`);
    } else if (!(checked.path in rules)) {
      rules[checked.path] = { target, changeOrigin: true };
    }
  }
  return { rules, warnings };
}
