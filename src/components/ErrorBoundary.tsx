// =============================================================================
// HYDRA-UMC STUDIO - Render Crash Recovery: ErrorBoundary.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import i18n from '../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Real gap closed: every one of Dashboard.tsx's own panels (CamerasView
 * included) is React.lazy()-split into its own content-hashed chunk
 * (vite.config.ts's own comment explains why), and NOTHING in this app
 * used to catch a render error - so a single uncaught exception in ANY
 * one panel unmounted the WHOLE React tree, leaving a blank page (this
 * app's own background is near-black, so that reads as a literal "black
 * screen" - confirmed for real on the CM5's own kiosk display: a stale
 * browser tab left open across a redeploy tried to dynamically import()
 * its OLD-hashed CamerasView-<oldhash>.js chunk, which the redeploy had
 * just overwritten with a new hash - a 404 the browser's own JS engine
 * has no way to recover from on its own). See main.tsx's own
 * `vite:preloadError` listener for the OTHER half of this same real fix
 * (auto-reloads once for exactly that stale-chunk case, before this
 * boundary would ever need to show the fallback below at all) - this
 * boundary is the backstop for every OTHER kind of render crash.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('HYDRA-UMC STUDIO render crash:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex-1 flex flex-col items-center justify-center gap-4 text-slate-400 p-8">
          <AlertTriangle size={32} className="text-rose-400" />
          <p className="text-sm text-slate-300 font-semibold">{i18n.t('errorBoundary.title', 'Something went wrong rendering this panel.')}</p>
          <p className="text-xs text-slate-500 max-w-md text-center">
            {i18n.t('errorBoundary.hint', 'This usually clears up after a reload - especially right after HYDRA-UMC STUDIO itself was just updated on this server.')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500/20 text-sky-400 border border-sky-500/40 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-sky-500/30 transition-colors"
          >
            <RefreshCw size={14} /> {i18n.t('errorBoundary.reload', 'Reload')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
