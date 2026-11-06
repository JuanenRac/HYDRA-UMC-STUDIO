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
 * Catches the render errors of the panels. Every panel of Dashboard.tsx (CamerasView included) is React.lazy()-split into its own content-hashed
 * chunk (vite.config.ts explains why), so without a boundary one uncaught exception in ANY panel unmounts the WHOLE React tree and leaves a blank,
 * near-black page. A stale browser tab left open across a redeploy hits exactly that: it imports the OLD-hashed chunk, which the redeploy
 * overwrote, and the 404 cannot be recovered by the JS engine. See the `vite:preloadError` listener in main.tsx for the other half (it reloads once
 * for exactly that stale-chunk case); this boundary is the backstop for every OTHER kind of render crash.
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
