// =============================================================================
// HYDRA-UMC STUDIO - Server Admin > Security: Ros2SecurityPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The requirement of ROS 2 security (SROS2) of the ROS 2 bridge. The switch is OFF by default. When the server reaches the settings route of the
// bridge, the screen shows the value in the file of the bridge and the value the running bridge started with, and a change (confirmed on screen,
// and again by the SERVER) is written to the file and applies when the bridge restarts. When it cannot (no route, no bridge configured, the bridge
// does not answer), the screen says why and falls back to preparing the lines to add to the file by hand; it never claims that the bridge is secured.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import {
  ros2SecurityApi, ros2SecurityBlockedReason, ros2SecurityChangeNeedsConfirmation, sros2Preparation,
  type Ros2SecurityFailure, type Ros2SecuritySettings,
} from '../lib/ros2Security';

const FAILURE_KEY: Record<Ros2SecurityFailure, string> = {
  unsupported: 'ros2Security.unsupported',
  not_configured: 'ros2Security.not_configured',
  unreachable: 'ros2Security.unreachable',
  forbidden: 'ros2Security.forbidden',
  network: 'ros2Security.load_error',
  http: 'ros2Security.load_error',
};

export function Ros2SecurityPanel() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Ros2SecuritySettings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [wanted, setWanted] = useState(false);
  const [problem, setProblem] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    const result = await ros2SecurityApi.read();
    setLoaded(true);
    if (result.ok) { setSettings(result.value); setWanted(result.value.requireSros2); setProblem(''); return; }
    setSettings(null);
    setProblem(t(FAILURE_KEY[result.failure]));
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const apply = async () => {
    setSaving(true); setMessage(''); setConfirming(false);
    const result = await ros2SecurityApi.write(wanted);
    setSaving(false);
    if (result.ok) { setSettings(result.value); setWanted(result.value.requireSros2); setProblem(''); setMessage(t('ros2Security.saved')); return; }
    setProblem(result.reason ? t('ros2Security.save_error', { reason: result.reason }) : t(FAILURE_KEY[result.failure]));
  };

  const save = () => {
    if (!settings) return;
    if (ros2SecurityChangeNeedsConfirmation(settings.requireSros2, wanted)) { setConfirming(true); return; }
    void apply();
  };

  const blocked = settings ? ros2SecurityBlockedReason(settings, wanted) : '';
  const preparation = settings ? null : sros2Preparation(wanted);
  return (
    <div className="space-y-2" data-testid="ros2-security-panel">
      <h5 className="text-xs font-bold text-slate-200">{t('ros2Security.title')}</h5>
      <div className="text-[10px] text-slate-500">{t('ros2Security.desc')}</div>
      {problem && <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2" data-testid="ros2-security-problem">{problem}</p>}
      {settings ? (
        <div className="space-y-2" data-testid="ros2-security-live">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <input type="checkbox" data-testid="ros2-security-require" checked={wanted} disabled={saving} onChange={e => { setWanted(e.target.checked); setMessage(''); }} />
            {t('ros2Security.label_live')}
          </label>
          <span className={`block text-[10px] font-bold ${settings.requireSros2 ? 'text-emerald-400' : 'text-slate-400'}`} data-testid="ros2-security-state">
            {settings.requireSros2 ? t('ros2Security.state_file_on') : t('ros2Security.state_file_off')}
          </span>
          <div className="text-[10px] text-slate-500" data-testid="ros2-security-active">{settings.active ? t('ros2Security.active_on') : t('ros2Security.active_off')}</div>
          {settings.restartNeeded && <div className="text-[10px] text-amber-400" data-testid="ros2-security-restart">{t('ros2Security.restart_needed')}</div>}
          <div className={`text-[10px] ${settings.environmentReady ? 'text-slate-500' : 'text-amber-400'}`} data-testid="ros2-security-env-state">
            {settings.environmentReady ? t('ros2Security.env_ready') : t('ros2Security.env_not_ready')}
          </div>
          {blocked && <div className="text-[10px] text-amber-400" role="alert" data-testid="ros2-security-blocked">{t(`ros2Security.${blocked}`)}</div>}
          {message && <div className="text-[10px] text-emerald-400" role="status" data-testid="ros2-security-saved">{message}</div>}
          <button
            onClick={save}
            data-testid="ros2-security-save"
            disabled={saving || blocked !== '' || wanted === settings.requireSros2}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-50 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold transition-all"
          >
            <Save size={14} /> {t('common.save')}
          </button>
        </div>
      ) : loaded && (
        <div className="space-y-2" data-testid="ros2-security-fallback">
          <p role="status" className="text-[10px] text-amber-400" data-testid="ros2-security-honest">{t('ros2Security.not_reported')}</p>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <input type="checkbox" data-testid="ros2-security-require" checked={wanted} onChange={e => setWanted(e.target.checked)} />
            {t('ros2Security.label')}
          </label>
          <span className={`text-[10px] font-bold ${wanted ? 'text-sky-300' : 'text-slate-400'}`} data-testid="ros2-security-state">
            {wanted ? t('ros2Security.state_on') : t('ros2Security.state_off')}
          </span>
          {preparation && (
            <div className="space-y-1" data-testid="ros2-security-lines">
              <div className="text-[10px] text-slate-500">{t('ros2Security.config_title')}</div>
              <pre className="text-[10px] text-slate-300 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 overflow-x-auto" data-testid="ros2-security-config">{preparation.config}</pre>
              <div className="text-[10px] text-slate-500">{t('ros2Security.env_title')}</div>
              <pre className="text-[10px] text-slate-300 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 overflow-x-auto" data-testid="ros2-security-env">{preparation.environment.join('\n')}</pre>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        title={t(wanted ? 'ros2Security.confirm_on_title' : 'ros2Security.confirm_off_title')}
        message={t(wanted ? 'ros2Security.confirm_on_message' : 'ros2Security.confirm_off_message')}
        confirmLabel={t(wanted ? 'ros2Security.confirm_on_button' : 'ros2Security.confirm_off_button')}
        onConfirm={() => void apply()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
