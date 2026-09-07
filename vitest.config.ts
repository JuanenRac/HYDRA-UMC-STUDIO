// =============================================================================
// HYDRA-UMC STUDIO - Vitest Configuration: vitest.config.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Deliberately its own file, not a `test` block merged into vite.config.ts:
// that file's own dev-server proxy/manualChunks settings are about serving
// the app, not about running tests, and keeping them apart means neither
// config has to reason about the other's own concerns. Every real test
// under tests/ is pure logic (kinematics math, no DOM/browser API), so the
// default 'node' environment is enough - no jsdom dependency needed.
// =============================================================================

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
