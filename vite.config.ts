// =============================================================================
// HYDRA-UMC STUDIO - Vite Bundler Configuration: vite.config.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/data/**']
    },
    // HYDRA-UMC STUDIO is now a pure client of the separate HYDRA-UMC-SERVER
    // backend (see src/lib/apiBase.ts's own header comment for the full
    // dev-vs-prod strategy). In dev, every fetch/WS call in src/ stays a
    // RELATIVE path ('/api/...', '/ws', '/WORKS/...') and this proxy
    // transparently forwards it to the real backend on localhost:3000 - no
    // CORS involved, nothing to configure per-developer. This is the dev-time
    // half of that strategy; the prod-time half is VITE_API_BASE_URL
    // (.env.example), used once there's no dev server left to proxy anything.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/ws': { target: 'http://localhost:3000', ws: true, changeOrigin: true },
      // Raw data files (saved trajectories) served by the backend at the
      // dataPath root, not under /api - see server.ts's own
      // app.use(express.static(dataPath)). WORKS/ is the default
      // worksPaths convention (RobotDetail.tsx); a custom worksPaths value
      // outside WORKS/ isn't covered by this fixed proxy rule in dev, but
      // works fine in production via VITE_API_BASE_URL.
      '/WORKS': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // three.js + @react-three/fiber/drei is the one dependency in this
        // app that's inherently large (a real 3D engine, not something to
        // shrink without removing 3D views entirely) - named explicitly
        // here rather than left to land in an auto-hashed chunk (it used to
        // surface as an opaque "shapes-<hash>.js" over Rollup's default
        // 500kB warning threshold). Every OTHER view in Dashboard.tsx is
        // already React.lazy()-split into its own small chunk, fetched only
        // when its own nav tab is opened - that's the code-splitting fix;
        // this manualChunks rule + the raised warning limit below just stop
        // this one legitimate, unavoidable chunk from looking like a
        // leftover problem once it does.
        manualChunks(id: string) {
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'three-vendor';
          }
        },
      },
    },
    // three-vendor (see above) lands around ~1.15MB minified once every
    // three.js/@react-three module is consolidated into it - real for a 3D
    // engine, not a regression to chase down further, and it's still
    // lazy-loaded (only fetched once a 3D-using view is opened, never part
    // of the initial bundle - see the React.lazy() calls in Dashboard.tsx).
    // 1300 clears that one legitimate chunk while still catching a
    // genuinely oversized NEW chunk in the future.
    chunkSizeWarningLimit: 1300,
  },
})
