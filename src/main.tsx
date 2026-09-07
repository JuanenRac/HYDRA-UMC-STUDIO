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

// Real fix for a real production crash confirmed on the CM5's own kiosk
// display: every panel in Dashboard.tsx is React.lazy()-loaded from its
// own content-hashed chunk (vite.config.ts), fetched by filename from
// whatever index.html/main bundle is already sitting in the browser. A
// browser tab left open across a redeploy (this app's normal state on a
// kiosk screen) still references the OLD chunk hashes - which a redeploy
// overwrites - so navigating to any not-yet-visited panel after a deploy
// 404s on its own chunk. Vite emits this exact case as its own
// `vite:preloadError` event specifically so an app can recover instead of
// crashing (see ErrorBoundary.tsx for the other half of this fix, and
// its own comment for the full story) - one full reload always fetches
// the CURRENT index.html, which references the CURRENT chunk hashes, so
// this is a complete, permanent fix, not a workaround. The sessionStorage
// guard stops a genuinely broken deploy (missing file for a real reason,
// not just a stale reference) from reload-looping forever.
const PRELOAD_ERROR_KEY = 'hydra-umc-studio:reloaded-after-preload-error';
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem(PRELOAD_ERROR_KEY)) return; // already tried once this load - a real missing file, not a stale reference, don't loop forever
  sessionStorage.setItem(PRELOAD_ERROR_KEY, '1');
  window.location.reload();
});
// This load itself got this far without a preload error, so the guard above
// has done its job - clear it so a LATER, genuinely new stale-chunk error
// (the next time this same long-lived kiosk tab survives across a future
// deploy) still gets one real auto-reload attempt too, instead of being
// silently swallowed by a flag left over from today.
window.setTimeout(() => sessionStorage.removeItem(PRELOAD_ERROR_KEY), 10_000);

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
