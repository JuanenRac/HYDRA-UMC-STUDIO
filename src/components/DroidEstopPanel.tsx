// =============================================================================
// HYDRA-UMC STUDIO - Server Admin > Security: DroidEstopPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The switch of the safety zones service that makes it read the emergency stop of the droids. It is OFF by default; a change in either
// direction asks for a confirmation on screen (and the SERVER asks for it again), and every change is recorded by the SERVER. Only an
// administrator sees this screen, and the service refuses any other account.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { droidEstopApi, droidEstopChangeNeedsConfirmation, type DroidEstopFailure, type DroidEstopSettings } from '../lib/droidEstop';

const FAILURE_KEY: Record<DroidEstopFailure, string> = {
  unsupported: 'droidEstop.unsupported',
  not_configured: 'droidEstop.not_configured',
  forbidden: 'droidEstop.forbidden',
  network: 'droidEstop.load_error',
  http: 'droidEstop.load_error',
};

export function DroidEstopPanel() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<DroidEstopSettings | null>(null);
  const [wanted, setWanted] = useState(false);
  const [problem, setProblem] = useState('');
  const [failure, setFailure] = useState<DroidEstopFailure | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    const result = await droidEstopApi.read();
    if (result.ok) { setSettings(result.value); setWanted(result.value.enabled); setProblem(''); setFailure(null); return; }
    setSettings(null);
    setFailure(result.failure);
    setProblem(t(FAILURE_KEY[result.failure]));
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const apply = async () => {
    setSaving(true); setMessage(''); setConfirming(false);
    const result = await droidEstopApi.write(wanted);
    setSaving(false);
    if (result.ok) { setSettings(result.value); setWanted(result.value.enabled); setProblem(''); setMessage(t('droidEstop.saved')); return; }
    setProblem(result.reason ? t('droidEstop.save_error', { reason: result.reason }) : t(FAILURE_KEY[result.failure]));
  };

  const save = () => {
    if (!settings) return;
    if (droidEstopChangeNeedsConfirmation(settings.enabled, wanted)) { setConfirming(true); return; }
    void apply();
  };

  // Nothing to show on a server that has no safety zones service (or one that cannot be switched from here): the section stays out of the way
  // rather than offering a switch that cannot work.
  if (!settings && (failure === 'unsupported' || failure === 'not_configured')) return null;

  return (
    <div className="space-y-2" data-testid="droid-estop-panel">
      <h5 className="text-xs font-bold text-slate-200">{t('droidEstop.title')}</h5>
      <div className="text-[10px] text-slate-500">{t('droidEstop.desc')}</div>
      {problem && <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{problem}</p>}
      {settings && (
        <>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <input type="checkbox" data-testid="droid-estop-enabled" checked={wanted} disabled={saving} onChange={e => { setWanted(e.target.checked); setMessage(''); }} />
            {t('droidEstop.label')}
          </label>
          <span className={`text-[10px] font-bold ${settings.enabled ? 'text-emerald-400' : 'text-slate-400'}`} data-testid="droid-estop-state">
            {settings.enabled ? t('droidEstop.state_on') : t('droidEstop.state_off')}
          </span>
          {settings.enabled && (
            <div className={`text-[10px] ${settings.running ? 'text-slate-500' : 'text-amber-400'}`} data-testid="droid-estop-link">
              {settings.running ? t('droidEstop.running') : t('droidEstop.not_running')}
            </div>
          )}
          {message && <div className="text-[10px] text-emerald-400" role="status">{message}</div>}
          <button
            onClick={save}
            data-testid="droid-estop-save"
            disabled={saving || wanted === settings.enabled}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-50 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold transition-all"
          >
            <Save size={14} /> {t('common.save')}
          </button>
        </>
      )}
      <ConfirmDialog
        open={confirming}
        title={t(wanted ? 'droidEstop.confirm_on_title' : 'droidEstop.confirm_off_title')}
        message={t(wanted ? 'droidEstop.confirm_on_message' : 'droidEstop.confirm_off_message')}
        confirmLabel={t(wanted ? 'droidEstop.confirm_on_button' : 'droidEstop.confirm_off_button')}
        onConfirm={() => void apply()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
