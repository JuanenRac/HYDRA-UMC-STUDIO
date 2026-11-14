// =============================================================================
// HYDRA-UMC STUDIO - Server Admin > Security: PlannerIdentityPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The switch of the semantic planner that makes the approval of a plan the act of a person who is signed in. It is ON by default;
// relaxing it asks for a confirmation on screen (and the SERVER asks for it again), and every change is recorded by the SERVER and
// printed by the planner. Only an administrator sees this screen, and the planner refuses any other account.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { plannerChangeAllowed, plannerChangeNeedsConfirmation, plannerIdentityApi, type PlannerFailure, type PlannerIdentitySettings } from '../lib/plannerIdentity';

const FAILURE_KEY: Record<PlannerFailure, string> = {
  unsupported: 'plannerIdentity.unsupported',
  not_configured: 'plannerIdentity.not_configured',
  forbidden: 'plannerIdentity.forbidden',
  network: 'plannerIdentity.load_error',
  http: 'plannerIdentity.load_error',
};

export function PlannerIdentityPanel() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<PlannerIdentitySettings | null>(null);
  const [wanted, setWanted] = useState(true);
  const [problem, setProblem] = useState('');
  const [failure, setFailure] = useState<PlannerFailure | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    const result = await plannerIdentityApi.read();
    if (result.ok) { setSettings(result.value); setWanted(result.value.requireIdentity); setProblem(''); setFailure(null); return; }
    setSettings(null);
    setFailure(result.failure);
    setProblem(t(FAILURE_KEY[result.failure]));
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const apply = async () => {
    setSaving(true); setMessage(''); setConfirming(false);
    const result = await plannerIdentityApi.write(wanted);
    setSaving(false);
    if (result.ok) { setSettings(result.value); setWanted(result.value.requireIdentity); setProblem(''); setMessage(t('plannerIdentity.saved')); return; }
    setProblem(result.reason ? t('plannerIdentity.save_error', { reason: result.reason }) : t(FAILURE_KEY[result.failure]));
  };

  const save = () => {
    if (!settings) return;
    if (plannerChangeNeedsConfirmation(settings.requireIdentity, wanted)) { setConfirming(true); return; }
    void apply();
  };

  // Nothing to show on a server that has no planner configured: the section stays out of the way rather than offering a switch that cannot work.
  if (!settings && (failure === 'unsupported' || failure === 'not_configured')) return null;

  const blocked = settings !== null && !plannerChangeAllowed(settings, wanted);
  return (
    <div className="space-y-2" data-testid="planner-identity-panel">
      <h5 className="text-xs font-bold text-slate-200">{t('plannerIdentity.title')}</h5>
      <div className="text-[10px] text-slate-500">{t('plannerIdentity.desc')}</div>
      {problem && <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{problem}</p>}
      {settings && (
        <>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <input type="checkbox" data-testid="planner-identity-require" checked={wanted} disabled={saving} onChange={e => { setWanted(e.target.checked); setMessage(''); }} />
            {t('plannerIdentity.label')}
          </label>
          <span className={`text-[10px] font-bold ${settings.requireIdentity ? 'text-emerald-400' : 'text-amber-400'}`} data-testid="planner-identity-state">
            {settings.requireIdentity ? t('plannerIdentity.state_on') : t('plannerIdentity.state_off')}
          </span>
          <div className="text-[10px] text-slate-500">{settings.persisted ? t('plannerIdentity.kept_file') : t('plannerIdentity.kept_memory')}</div>
          {blocked && <div className="text-[10px] text-amber-400" role="alert">{t('plannerIdentity.needs_key')}</div>}
          {message && <div className="text-[10px] text-emerald-400" role="status">{message}</div>}
          <button
            onClick={save}
            data-testid="planner-identity-save"
            disabled={saving || blocked || wanted === settings.requireIdentity}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-50 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold transition-all"
          >
            <Save size={14} /> {t('common.save')}
          </button>
        </>
      )}
      <ConfirmDialog
        open={confirming}
        title={t('plannerIdentity.confirm_title')}
        message={t('plannerIdentity.confirm_message')}
        confirmLabel={t('plannerIdentity.confirm_button')}
        onConfirm={() => void apply()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
