// =============================================================================
// HYDRA-UMC STUDIO - React Component: FramPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The F-RAM of the kinematic brain, under the Flasher: a self-test that leaves the contents as they were, and an erase that writes zeros over the whole chip. Both are
// offered only when the version query said so (`capabilities.fram_erase`: the bridge has them on and so does the server, where they are off by default). The erase
// needs the word ERASE typed in a dialog; the server and the bridge ask for it again. Nothing here has run on a board.
// =============================================================================
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { FRAM_ERASE_WORD, framEraseWordMatches, hardwareFramOperation, type FramOperation, type FramOperationResult } from '../lib/canOta';
import { isDismissKey } from '../lib/dialogKeys';

export function FramPanel({ authToken, supported, disabled = false, onResult }: {
  authToken: string | null;
  /** null: the version was not read yet; false: the server or the bridge does not offer the operations. */
  supported: boolean | null;
  /** Another operation (a flash) is running on the same link. */
  disabled?: boolean;
  onResult?: (operation: FramOperation, result: FramOperationResult) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState('');
  const [last, setLast] = useState<{ operation: FramOperation; result: FramOperationResult } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => { if (asking) inputRef.current?.focus(); }, [asking]);
  // A change of the answer of the server (another target, another version read) closes a dialog that was asked under the old one.
  useEffect(() => { if (supported !== true) { setAsking(false); setTyped(''); } }, [supported]);

  async function run(operation: FramOperation, word = '') {
    setBusy(true);
    const result = await hardwareFramOperation(operation, authToken, word);
    setBusy(false);
    setLast({ operation, result });
    onResult?.(operation, result);
  }

  const canAct = supported === true && !busy && !disabled;
  const statusText = last ? t(`flasher.fram_status.${last.result.status}`, { defaultValue: t('flasher.fram_status.unknown') }) : '';

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3" data-testid="fram-panel">
      <h3 className="text-sm font-bold text-slate-200">{t('flasher.fram_title')}</h3>
      {supported === null && <p className="text-xs text-slate-500">{t('flasher.fram_unknown')}</p>}
      {supported === false && (
        <p className="flex items-start gap-2 text-xs text-amber-400"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {t('flasher.fram_unsupported')}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!canAct} onClick={() => void run('selftest')} data-testid="fram-selftest"
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
          {t('flasher.fram_selftest')}
        </button>
        <button type="button" disabled={!canAct} onClick={() => { setTyped(''); setAsking(true); }} data-testid="fram-erase"
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-900/40 text-red-300 border border-red-800 hover:bg-red-900/60 disabled:opacity-40 disabled:cursor-not-allowed">
          {t('flasher.fram_erase')}
        </button>
      </div>
      {busy && <p className="text-xs text-slate-400">{t('flasher.fram_busy')}</p>}
      {last && !busy && (
        <p className={last.result.ok ? 'flex items-start gap-2 text-xs text-emerald-400' : 'flex items-start gap-2 text-xs text-red-400'} role="status" data-testid="fram-result">
          {last.result.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <XCircle size={14} className="mt-0.5 shrink-0" />}
          {last.result.ok
            ? t(last.operation === 'erase' ? 'flasher.fram_result_erase_ok' : 'flasher.fram_result_selftest_ok', { value: last.result.value })
            : t('flasher.fram_result_failed', { operation: t(`flasher.fram_operation_${last.operation}`), status: statusText })}
        </p>
      )}

      {asking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onKeyDown={(e) => { if (isDismissKey(e.key)) setAsking(false); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md bg-slate-900 border border-red-800 rounded-xl p-5 space-y-3">
            <h4 id={titleId} className="flex items-center gap-2 text-sm font-bold text-red-300"><AlertTriangle size={16} /> {t('flasher.fram_erase_title')}</h4>
            <p className="text-xs text-slate-300">{t('flasher.fram_erase_body', { word: FRAM_ERASE_WORD })}</p>
            <input ref={inputRef} type="text" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false}
              placeholder={t('flasher.fram_erase_placeholder', { word: FRAM_ERASE_WORD })} data-testid="fram-erase-word"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-slate-200" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAsking(false)} className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 border border-slate-700">{t('common.cancel', 'Cancel')}</button>
              <button type="button" disabled={!framEraseWordMatches(typed)} data-testid="fram-erase-confirm"
                onClick={() => { const word = typed; setAsking(false); setTyped(''); void run('erase', word); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed">
                {t('flasher.fram_erase_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
