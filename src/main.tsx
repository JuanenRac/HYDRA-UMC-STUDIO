// =============================================================================
// HYDRA-UMC STUDIO - Application Entry Point: main.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'

/** Stores the Root configuration or state data. */
let root = (window as any)._reactRoot;
if (!root) {
  root = createRoot(document.getElementById('root')!);
  (window as any)._reactRoot = root;
}
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)
