// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, connection test button: components/config/TestConnectionButton.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// Moved out of Config.tsx unchanged. A module-level component (not declared inside the render of the dialog, which a component re-created
// every render would lose its identity for): all state lives in the parent's `testStates`/`onTest`, so this is purely presentational.
import { useTranslation } from 'react-i18next';
import { CheckCircle2, RefreshCw, Wrench, XCircle } from 'lucide-react';
import type { TestState } from '../../hooks/useConnectionTests';
import { cn } from '../robotDetail/shared';

export function TestConnectionButton({ state, onTest }: { state: TestState; onTest: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onTest}
      disabled={state === 'testing'}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border",
        state === 'reachable' && "bg-emerald-500/10 border-emerald-500/50 text-emerald-400",
        state === 'unreachable' && "bg-rose-500/10 border-rose-500/50 text-rose-400",
        (state === 'idle' || state === 'testing') && "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200",
      )}
    >
      {state === 'testing' && <RefreshCw size={12} className="animate-spin" />}
      {state === 'reachable' && <CheckCircle2 size={12} />}
      {state === 'unreachable' && <XCircle size={12} />}
      {(state === 'idle') && <Wrench size={12} />}
      {state === 'testing' ? t('config.testing_connection') : state === 'reachable' ? t('config.connection_reachable') : state === 'unreachable' ? t('config.connection_unreachable') : t('config.test_connection')}
    </button>
  );
}
