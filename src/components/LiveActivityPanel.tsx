// =============================================================================
// HYDRA-UMC STUDIO - Server Admin > Security: LiveActivityPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The Live Activity of a robot on the lock screen of an iPhone, and what it may show there: only the state (the default), the state and the progress, or
// everything of the panel. The card is OFF by default; turning it on or raising the level asks for a confirmation on screen (and the SERVER asks for it again)
// because a lock screen is read by whoever holds the phone. Lowering the level or turning the card off never asks. Only an administrator sees this screen.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { allowedLevels, liveActivityApi, liveChange, liveNeedsConfirmation, type LiveActivityState, type LiveFailure, type LiveLevel } from '../lib/liveActivity';

const FAILURE_KEY: Record<LiveFailure, string> = {
  unsupported: 'liveActivity.unsupported',
  forbidden: 'liveActivity.forbidden',
  network: 'liveActivity.load_error',
  http: 'liveActivity.load_error',
};

export function LiveActivityPanel() {
  const { t } = useTranslation();
  const [state, setState] = useState<LiveActivityState | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [level, setLevel] = useState<LiveLevel>('status');
  const [problem, setProblem] = useState('');
  const [failure, setFailure] = useState<LiveFailure | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const adopt = useCallback((value: LiveActivityState) => {
    setState(value); setEnabled(value.enabled.value); setLevel(value.level.value);
  }, []);

  const load = useCallback(async () => {
    const result = await liveActivityApi.read();
    if (result.ok) { adopt(result.value); setProblem(''); setFailure(null); return; }
    setState(null);
    setFailure(result.failure);
    setProblem(t(FAILURE_KEY[result.failure]));
  }, [adopt, t]);

  useEffect(() => { void load(); }, [load]);

  const change = state ? liveChange(state, { enabled, level }) : {};
  const hasChange = Object.keys(change).length > 0;

  const apply = async () => {
    if (!state) return;
    setSaving(true); setMessage(''); setConfirming(false);
    const result = await liveActivityApi.write(state, change);
    setSaving(false);
    if (result.ok) { adopt(result.value); setProblem(''); setMessage(t('liveActivity.saved')); return; }
    setProblem(result.reason ? t('liveActivity.save_error', { reason: result.reason }) : t(FAILURE_KEY[result.failure]));
  };

  const save = () => {
    if (!state || !hasChange) return;
    if (liveNeedsConfirmation(state, change)) { setConfirming(true); return; }
    void apply();
  };

  // A server without the block does not have the feature: the section stays out of the way.
  if (!state && failure === 'unsupported') return null;

  return (
    <div className="space-y-2" data-testid="live-activity-panel">
      <h5 className="text-xs font-bold text-slate-200">{t('liveActivity.title')}</h5>
      <div className="text-[10px] text-slate-500">{t('liveActivity.desc')}</div>
      {problem && <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{problem}</p>}
      {state && (
        <>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <input type="checkbox" data-testid="live-activity-enabled" checked={enabled} disabled={saving || state.enabled.source === 'env'} onChange={e => { setEnabled(e.target.checked); setMessage(''); }} />
            {t('liveActivity.label')}
          </label>
          {!state.pushOn && <div className="text-[10px] text-amber-400" role="status" data-testid="live-activity-push-off">{t('liveActivity.push_off')}</div>}
          <fieldset className="space-y-1" disabled={saving || state.level.source === 'env'}>
            <legend className="text-[10px] font-bold text-slate-300">{t('liveActivity.level_title')}</legend>
            {allowedLevels(state).map(item => (
              <label key={item} className="flex items-start gap-2 text-xs text-slate-200">
                <input type="radio" name="live-activity-level" data-testid={`live-activity-level-${item}`} checked={level === item} disabled={saving || state.level.source === 'env'} onChange={() => { setLevel(item); setMessage(''); }} />
                <span><span className="font-bold">{t(`liveActivity.level_${item}`)}</span><br /><span className="text-[10px] text-slate-500">{t(`liveActivity.level_${item}_hint`)}</span></span>
              </label>
            ))}
          </fieldset>
          <div className="text-[10px] text-slate-500">{t('liveActivity.lock_screen_note')}</div>
          {(state.enabled.source === 'env' || state.level.source === 'env') && <div className="text-[10px] text-amber-400" role="status" data-testid="live-activity-locked">{t('liveActivity.locked')}</div>}
          {message && <div className="text-[10px] text-emerald-400" role="status">{message}</div>}
          <button
            onClick={save}
            data-testid="live-activity-save"
            disabled={saving || !hasChange}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-50 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold transition-all"
          >
            <Save size={14} /> {t('liveActivity.save')}
          </button>
        </>
      )}
      <ConfirmDialog
        open={confirming}
        title={t('liveActivity.confirm_title')}
        message={t(`liveActivity.confirm_message_${level}`)}
        confirmLabel={t('liveActivity.confirm_button')}
        onConfirm={() => void apply()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
