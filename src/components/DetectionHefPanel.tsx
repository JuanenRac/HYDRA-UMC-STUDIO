// =============================================================================
// HYDRA-UMC STUDIO - Server Admin > Security: DetectionHefPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The switch of the loaded-model reports of the DETECTION-HEF service. It is OFF by default; turning it on asks for a confirmation on screen
// (and the SERVER asks for it again) and every change is recorded. The SERVER writes the settings file that the service re-reads while it
// runs; this screen never touches that file. Only an administrator sees this screen.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { detectionHefApi, detectionHefNeedsConfirmation, type DetectionHefFailure, type DetectionHefState } from '../lib/detectionHef';

const FAILURE_KEY: Record<DetectionHefFailure, string> = {
  unsupported: 'detectionHef.unsupported',
  forbidden: 'detectionHef.forbidden',
  network: 'detectionHef.load_error',
  http: 'detectionHef.load_error',
};

export function DetectionHefPanel() {
  const { t } = useTranslation();
  const [state, setState] = useState<DetectionHefState | null>(null);
  const [wanted, setWanted] = useState(false);
  const [problem, setProblem] = useState('');
  const [failure, setFailure] = useState<DetectionHefFailure | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    const result = await detectionHefApi.read();
    if (result.ok) { setState(result.value); setWanted(result.value.acceptLoadedReports.value); setProblem(''); setFailure(null); return; }
    setState(null);
    setFailure(result.failure);
    setProblem(t(FAILURE_KEY[result.failure]));
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const current = state?.acceptLoadedReports.value ?? false;
  const locked = state?.acceptLoadedReports.source === 'env';

  const apply = async () => {
    setSaving(true); setMessage(''); setConfirming(false);
    const result = await detectionHefApi.write(wanted);
    setSaving(false);
    if (result.ok) { setState(result.value); setWanted(result.value.acceptLoadedReports.value); setProblem(''); setMessage(t('detectionHef.saved')); return; }
    setProblem(result.reason ? t('detectionHef.save_error', { reason: result.reason }) : t(FAILURE_KEY[result.failure]));
  };

  const save = () => {
    if (!state) return;
    if (detectionHefNeedsConfirmation(current, wanted)) { setConfirming(true); return; }
    void apply();
  };

  // A server without the block does not have the feature: the section stays out of the way.
  if (!state && failure === 'unsupported') return null;

  return (
    <div className="space-y-2" data-testid="detection-hef-panel">
      <h5 className="text-xs font-bold text-slate-200">{t('detectionHef.title')}</h5>
      <div className="text-[10px] text-slate-500">{t('detectionHef.desc')}</div>
      {problem && <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{problem}</p>}
      {state && (
        <>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <input type="checkbox" data-testid="detection-hef-enabled" checked={wanted} disabled={saving || locked} onChange={e => { setWanted(e.target.checked); setMessage(''); }} />
            {t('detectionHef.label')}
          </label>
          <div className="text-[10px] text-slate-500 pl-6">{t('detectionHef.hint')}</div>
          {locked && <div className="text-[10px] text-amber-400" role="status" data-testid="detection-hef-locked">{t('detectionHef.locked')}</div>}
          {message && <div className="text-[10px] text-emerald-400" role="status">{message}</div>}
          <button
            onClick={save}
            data-testid="detection-hef-save"
            disabled={saving || locked || wanted === current}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-50 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold transition-all"
          >
            <Save size={14} /> {t('detectionHef.save')}
          </button>
        </>
      )}
      <ConfirmDialog
        open={confirming}
        title={t('detectionHef.confirm_title')}
        message={t('detectionHef.confirm_message')}
        confirmLabel={t('detectionHef.confirm_button')}
        onConfirm={() => void apply()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
