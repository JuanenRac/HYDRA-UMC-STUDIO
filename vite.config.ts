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
    port: 3000,
    strictPort: true,
    watch: {
      ignored: ['**/data/**']
    }
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
