// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, installation: components/config/InstallationTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The first-run checklist: the server answers, a controller and a robot are set up, the account has its second factor. It tells the
// next step and where it is done. The server has no route that installs or repairs anything, so nothing here changes the machine.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, HelpCircle, ListChecks, RefreshCw } from 'lucide-react';
import { failureKey, panelRead, type PanelFailure } from '../../lib/panelApi';
import { totpApi } from '../../lib/totpApi';
import { parseServerInfo, uptimeText, type ServerInfo } from '../../lib/updatesView';
import { doneCount, installSteps, nextStep } from '../../lib/installationView';

export function InstallationTab() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [failure, setFailure] = useState<PanelFailure | null>(null);
  const [secondFactor, setSecondFactor] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const [infoResult, totpResult] = await Promise.all([panelRead('/api/hydra-info', parseServerInfo), totpApi.status()]);
    setInfo(infoResult.ok ? infoResult.value : null);
    setFailure(infoResult.ok ? null : infoResult.failure);
    setSecondFactor(totpResult.ok ? totpResult.value.enabled : null);
    setBusy(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const steps = installSteps(info, secondFactor);
  const next = nextStep(steps);
  const icon = (state: string) => (state === 'done' ? <CheckCircle2 size={16} className="text-emerald-400" /> : state === 'todo' ? <Circle size={16} className="text-amber-400" /> : <HelpCircle size={16} className="text-slate-600" />);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" data-testid="installation-tab">
      <div>
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><ListChecks size={16} /> {t('installation.title')}</h3>
        <p className="text-[10px] text-slate-600 leading-relaxed pt-2">{t('installation.intro')}</p>
      </div>

      {info && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 text-xs text-slate-300 flex flex-wrap gap-x-8 gap-y-1" data-testid="installation-host">
          <span>{t('installation.host')}: <span className="font-mono">{info.hostname ?? '-'}</span></span>
          <span>{t('installation.version')}: <span className="font-mono">{info.appVersion ?? '-'}</span></span>
          <span>{t('installation.uptime')}: <span className="font-mono">{uptimeText(info.uptimeSeconds)}</span></span>
        </div>
      )}
      {failure && <p role="alert" data-testid="installation-error" className="text-xs text-amber-400">{t(failureKey(failure))}</p>}

      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <span data-testid="installation-progress" className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('installation.progress', { done: doneCount(steps), total: steps.length })}</span>
          <button type="button" onClick={() => void load()} disabled={busy} className="flex items-center gap-1 text-[10px] text-sky-400 disabled:opacity-40"><RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> {t('updates.refresh')}</button>
        </div>
        <ol>
          {steps.map((step) => (
            <li key={step.id} data-testid={`installation-step-${step.id}`} data-state={step.state} className="flex items-start gap-3 px-4 py-3 border-t border-slate-800 first:border-t-0">
              {icon(step.state)}
              <div className="text-xs">
                <div className="text-slate-200 font-bold">{t(`installation.step_${step.id}`)}{step.count !== undefined && step.state !== 'unknown' ? ` (${step.count})` : ''}</div>
                <div className="text-[10px] text-slate-500 leading-relaxed">{t(`installation.step_${step.id}_hint`)}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p data-testid="installation-next" className="text-xs text-slate-300">{next ? t('installation.next', { step: t(`installation.step_${next.id}`) }) : steps.every((step) => step.state === 'done') ? t('installation.all_done') : t('installation.cannot_tell')}</p>
      <p data-testid="installation-no-installer" className="text-[10px] text-slate-500 leading-relaxed border border-slate-800 rounded-xl p-4">{t('installation.no_installer')}</p>
    </div>
  );
}
