// =============================================================================
// HYDRA-UMC STUDIO - React Component: ConfirmDialog.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Non-blocking replacement for JS's own confirm()/window.confirm(), which
// pauses EVERYTHING (React rendering, the WebSocket message queue, any 3D
// animation loop) on the main thread until the user answers - a real
// external audit finding, since this app keeps a live WebSocket connection
// and a WebGL viewport running underneath every dialog. Same
// centered-card-over-backdrop visual pattern as HelpModal.tsx/Config.tsx
// (bg-black/60 backdrop-blur-sm + bg-slate-900 border border-slate-700
// rounded-xl card) so it reads as part of the same app, not a native
// browser popup.
// =============================================================================

import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({
  open,
  message,
  title,
  confirmLabel,
  cancelLabel,
  danger = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive/irreversible actions (delete, factory reset, e-stop) - true by default since every current caller is one of those. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[420px] max-w-full overflow-hidden flex flex-col">
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-sm uppercase tracking-widest">
            <AlertTriangle size={18} className={danger ? 'text-rose-400' : 'text-sky-400'} />
            {title || t('common.confirm')}
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={danger
              ? "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-white bg-rose-600 hover:bg-rose-500 transition-colors"
              : "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-950 bg-sky-500 hover:bg-sky-400 transition-colors"}
          >
            {confirmLabel || t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
