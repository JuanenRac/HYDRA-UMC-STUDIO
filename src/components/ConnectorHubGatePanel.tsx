// =============================================================================
// HYDRA-UMC STUDIO - Server Admin > Security: ConnectorHubGatePanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The switch of the connector hub's decision gate that answers a caller on the hub's own machine without a signed token. It is OFF by
// default; turning it on asks for a confirmation on screen (and the SERVER and the hub ask for it again), and every change is recorded
// by the hub and by the SERVER. Only an administrator sees this screen, and the hub refuses any other account.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { connectorHubGateApi, gateChangeAllowed, gateChangeNeedsConfirmation, type GateFailure, type GateSettings } from '../lib/connectorHubGate';

const FAILURE_KEY: Record<GateFailure, string> = {
  unsupported: 'hubGate.unsupported',
  not_configured: 'hubGate.not_configured',
  forbidden: 'hubGate.forbidden',
  network: 'hubGate.load_error',
  http: 'hubGate.load_error',
};

export function ConnectorHubGatePanel() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<GateSettings | null>(null);
  const [wanted, setWanted] = useState(false);
  const [problem, setProblem] = useState('');
  const [failure, setFailure] = useState<GateFailure | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    const result = await connectorHubGateApi.read();
    if (result.ok) { setSettings(result.value); setWanted(result.value.allowLoopbackNoIdentity); setProblem(''); setFailure(null); return; }
    setSettings(null);
    setFailure(result.failure);
    setProblem(t(FAILURE_KEY[result.failure]));
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const apply = async () => {
    setSaving(true); setMessage(''); setConfirming(false);
    const result = await connectorHubGateApi.write(wanted);
    setSaving(false);
    if (result.ok) { setSettings(result.value); setWanted(result.value.allowLoopbackNoIdentity); setProblem(''); setMessage(t('hubGate.saved')); return; }
    setProblem(result.reason ? t('hubGate.save_error', { reason: result.reason }) : t(FAILURE_KEY[result.failure]));
  };

  const save = () => {
    if (!settings) return;
    if (gateChangeNeedsConfirmation(settings.allowLoopbackNoIdentity, wanted)) { setConfirming(true); return; }
    void apply();
  };

  // Nothing to show on a server that has no gate configured: the section stays out of the way rather than offering a switch that cannot work.
  if (!settings && (failure === 'unsupported' || failure === 'not_configured')) return null;

  const blocked = settings !== null && !gateChangeAllowed(settings, wanted);
  return (
    <div className="space-y-2" data-testid="hub-gate-panel">
      <h5 className="text-xs font-bold text-slate-200">{t('hubGate.title')}</h5>
      <div className="text-[10px] text-slate-500">{t('hubGate.desc')}</div>
      {problem && <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{problem}</p>}
      {settings && (
        <>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <input type="checkbox" data-testid="hub-gate-allow" checked={wanted} disabled={saving} onChange={e => { setWanted(e.target.checked); setMessage(''); }} />
            {t('hubGate.label')}
          </label>
          <span className={`text-[10px] font-bold ${settings.allowLoopbackNoIdentity ? 'text-amber-400' : 'text-emerald-400'}`} data-testid="hub-gate-state">
            {settings.allowLoopbackNoIdentity ? t('hubGate.state_on') : t('hubGate.state_off')}
          </span>
          <div className="text-[10px] text-slate-500">{settings.persisted ? t('hubGate.kept_file') : t('hubGate.kept_memory')}</div>
          {blocked && <div className="text-[10px] text-amber-400" role="alert">{wanted ? t('hubGate.loopback_only') : t('hubGate.needs_key')}</div>}
          {message && <div className="text-[10px] text-emerald-400" role="status">{message}</div>}
          <button
            onClick={save}
            data-testid="hub-gate-save"
            disabled={saving || blocked || wanted === settings.allowLoopbackNoIdentity}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-50 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold transition-all"
          >
            <Save size={14} /> {t('hubGate.save')}
          </button>
        </>
      )}
      <ConfirmDialog
        open={confirming}
        title={t('hubGate.confirm_title')}
        message={t('hubGate.confirm_message')}
        confirmLabel={t('hubGate.confirm_button')}
        onConfirm={() => void apply()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
