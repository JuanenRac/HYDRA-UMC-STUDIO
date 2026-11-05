// =============================================================================
// HYDRA-UMC STUDIO - One folder for the 3D model library: scripts/library_dir.mjs
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// STUDIO serves `public/models` and the desktop app reads `assets/meshes`: the same layout (category / model / files). When
// HYDRA_UMC_LIBRARY_DIR names an existing folder, STUDIO serves the models from it, and so do the desktop app and the STL editor, so a
// model is edited in one place. Unset (the default), or naming something that is not a folder, STUDIO keeps serving its own
// `public/models`: a wrong value never points the build at an unexpected place.
// Plain JavaScript so that scripts/mesh_pack.mjs (run by node directly) and the Vite config share it.

import fs from 'node:fs';
import path from 'node:path';

export const LIBRARY_DIR_ENV = 'HYDRA_UMC_LIBRARY_DIR';

/** The common library folder, or null when the variable is unset or does not name an existing folder. */
export function sharedDir(env = process.env) {
  const value = String(env[LIBRARY_DIR_ENV] ?? '').trim();
  if (!value) return null;
  const resolved = path.resolve(value);
  try {
    return fs.statSync(resolved).isDirectory() ? resolved : null;
  } catch {
    return null;
  }
}

/** The folder the models are served from: the common library folder when there is one, else `fallback` (STUDIO's `public/models`). */
export function meshRoot(fallback, env = process.env) {
  return sharedDir(env) ?? fallback;
}

/**
 * The file a request path of `/models/...` names inside `root`, or null when it leads outside `root`, is not a file or cannot be read.
 * `requestPath` is the part after `/models/`; it may carry a query string and percent-escapes.
 */
export function resolveModelFile(root, requestPath) {
  let relative;
  try {
    relative = decodeURIComponent(String(requestPath).split('?')[0].split('#')[0]);
  } catch {
    return null;
  }
  if (!relative || relative.includes('\0')) return null;
  const base = path.resolve(root);
  const target = path.resolve(base, relative);
  if (target !== base && !target.startsWith(base + path.sep)) return null;
  try {
    return fs.statSync(target).isFile() ? target : null;
  } catch {
    return null;
  }
}
