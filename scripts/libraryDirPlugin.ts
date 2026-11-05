// =============================================================================
// HYDRA-UMC STUDIO - Vite plugin for the common model library: scripts/libraryDirPlugin.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// With HYDRA_UMC_LIBRARY_DIR set to an existing folder (see scripts/library_dir.mjs) the dev and preview servers answer `/models/...`
// from that folder instead of `public/models`, and a production build copies that folder into `dist/models` over what the public
// folder brought. Without the variable the plugin does nothing at all.
import fs from 'node:fs';
import path from 'node:path';
import type { Connect, Plugin } from 'vite';
import { resolveModelFile, sharedDir } from './library_dir.mjs';

const TYPES: Record<string, string> = {
  '.stl': 'model/stl', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.amf': 'application/octet-stream', '.3mf': 'application/octet-stream', '.urdf': 'application/xml', '.xml': 'application/xml',
};

/** The middleware that serves `/models/...` from `root`; a request it cannot answer goes on to the next handler. */
export function modelsMiddleware(root: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = req.url ?? '';
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const match = /^\/models\/(.+)$/.exec(url);
    const file = match ? resolveModelFile(root, match[1]) : null;
    if (!file) return next();
    res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
    res.setHeader('Content-Length', String(fs.statSync(file).size));
    if (req.method === 'HEAD') return void res.end();
    fs.createReadStream(file).pipe(res);
  };
}

export function libraryDirPlugin(env: NodeJS.ProcessEnv = process.env): Plugin {
  const root = sharedDir(env);
  return {
    name: 'hydra-library-dir',
    configureServer(server) {
      if (root) server.middlewares.use(modelsMiddleware(root));
    },
    configurePreviewServer(server) {
      if (root) server.middlewares.use(modelsMiddleware(root));
    },
    closeBundle() {
      if (!root) return;
      fs.cpSync(root, path.resolve('dist', 'models'), { recursive: true, filter: (source) => !path.basename(source).startsWith('.') });
    },
  };
}
