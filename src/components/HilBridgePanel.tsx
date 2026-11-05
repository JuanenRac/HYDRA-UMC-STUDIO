// =============================================================================
// HYDRA-UMC STUDIO - Server Admin > Security: HilBridgePanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The switch of the HIL bridge that makes a real command need a pass verdict of the twin for its trajectory. It is OFF by default; a change
// in either direction asks for a confirmation on screen (and the SERVER asks for it again), and every change is recorded by the SERVER. Only
// an administrator sees this screen, and the bridge refuses any other account.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { hilBridgeApi, hilBridgeBlockedReason, hilBridgeChangeNeedsConfirmation, type HilBridgeFailure, type HilBridgeSettings } from '../lib/hilBridge';

const FAILURE_KEY: Record<HilBridgeFailure, string> = {
  unsupported: 'hilBridge.unsupported',
  not_configured: 'hilBridge.not_configured',
  forbidden: 'hilBridge.forbidden',
  network: 'hilBridge.load_error',
  http: 'hilBridge.load_error',
};

export function HilBridgePanel() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<HilBridgeSettings | null>(null);
  const [wanted, setWanted] = useState(false);
  const [problem, setProblem] = useState('');
  const [failure, setFailure] = useState<HilBridgeFailure | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    const result = await hilBridgeApi.read();
    if (result.ok) { setSettings(result.value); setWanted(result.value.requireTwinPass); setProblem(''); setFailure(null); return; }
    setSettings(null);
    setFailure(result.failure);
    setProblem(t(FAILURE_KEY[result.failure]));
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const apply = async () => {
    setSaving(true); setMessage(''); setConfirming(false);
    const result = await hilBridgeApi.write(wanted);
    setSaving(false);
    if (result.ok) { setSettings(result.value); setWanted(result.value.requireTwinPass); setProblem(''); setMessage(t('hilBridge.saved')); return; }
    setProblem(result.reason ? t('hilBridge.save_error', { reason: result.reason }) : t(FAILURE_KEY[result.failure]));
  };

  const save = () => {
    if (!settings) return;
    if (hilBridgeChangeNeedsConfirmation(settings.requireTwinPass, wanted)) { setConfirming(true); return; }
    void apply();
  };

  // Nothing to show on a server that has no HIL bridge configured: the section stays out of the way rather than offering a switch that cannot work.
  if (!settings && (failure === 'unsupported' || failure === 'not_configured')) return null;

  const blocked = settings ? hilBridgeBlockedReason(settings, wanted) : '';
  return (
    <div className="space-y-2" data-testid="hil-bridge-panel">
      <h5 className="text-xs font-bold text-slate-200">{t('hilBridge.title')}</h5>
      <div className="text-[10px] text-slate-500">{t('hilBridge.desc')}</div>
      {problem && <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{problem}</p>}
      {settings && (
        <>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <input type="checkbox" data-testid="hil-bridge-require" checked={wanted} disabled={saving} onChange={e => { setWanted(e.target.checked); setMessage(''); }} />
            {t('hilBridge.label')}
          </label>
          <span className={`text-[10px] font-bold ${settings.requireTwinPass ? 'text-emerald-400' : 'text-slate-400'}`} data-testid="hil-bridge-state">
            {settings.requireTwinPass ? t('hilBridge.state_on') : t('hilBridge.state_off')}
          </span>
          <div className="text-[10px] text-slate-500">{settings.persisted ? t('hilBridge.kept_file') : t('hilBridge.kept_memory')}</div>
          {settings.locked && <div className="text-[10px] text-amber-400">{t('hilBridge.locked')}</div>}
          {blocked && <div className="text-[10px] text-amber-400" role="alert" data-testid="hil-bridge-blocked">{t(`hilBridge.${blocked}`)}</div>}
          {message && <div className="text-[10px] text-emerald-400" role="status">{message}</div>}
          <button
            onClick={save}
            data-testid="hil-bridge-save"
            disabled={saving || blocked !== '' || wanted === settings.requireTwinPass}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-50 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold transition-all"
          >
            <Save size={14} /> {t('hilBridge.save')}
          </button>
        </>
      )}
      <ConfirmDialog
        open={confirming}
        title={t(wanted ? 'hilBridge.confirm_on_title' : 'hilBridge.confirm_off_title')}
        message={t(wanted ? 'hilBridge.confirm_on_message' : 'hilBridge.confirm_off_message')}
        confirmLabel={t(wanted ? 'hilBridge.confirm_on_button' : 'hilBridge.confirm_off_button')}
        onConfirm={() => void apply()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
