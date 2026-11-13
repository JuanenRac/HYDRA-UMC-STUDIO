// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, updates: components/config/UpdatesTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// What is installed: the version of this STUDIO, the one of the server and the version each program next to the server reports.
// Below the list, the section "HYDRA-UMC updates" (SelfUpdatePanel) looks for the newest signed release of the server, Studio and the agent of the
// operating system through the server and, only when the person allows it, installs one or puts the earlier one back.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, DownloadCloud } from 'lucide-react';
import studioPackage from '../../../package.json';
import { failureKey, panelRead, type PanelFailure } from '../../lib/panelApi';
import { SelfUpdatePanel } from './SelfUpdatePanel';
import { parseInstalled, parseServerInfo, uptimeText, versionedCount, type InstalledProject, type ServerInfo } from '../../lib/updatesView';

export const STUDIO_VERSION = studioPackage.version;

export function UpdatesTab() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [projects, setProjects] = useState<InstalledProject[] | null>(null);
  const [failure, setFailure] = useState<PanelFailure | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const [infoResult, statusResult] = await Promise.all([
      panelRead('/api/hydra-info', parseServerInfo),
      panelRead('/api/ecosystem/status', parseInstalled),
    ]);
    setInfo(infoResult.ok ? infoResult.value : null);
    setProjects(statusResult.ok ? statusResult.value : null);
    setFailure(!infoResult.ok ? infoResult.failure : !statusResult.ok ? statusResult.failure : null);
    setBusy(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" data-testid="updates-tab">
      <div>
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><DownloadCloud size={16} /> {t('updates.title')}</h3>
        <p className="text-[10px] text-slate-600 leading-relaxed pt-2">{t('updates.intro')}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4"><div className="text-[9px] uppercase tracking-widest text-slate-600">{t('updates.studio_version')}</div><div data-testid="updates-studio" className="text-lg font-mono text-slate-200">{STUDIO_VERSION}</div></div>
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4"><div className="text-[9px] uppercase tracking-widest text-slate-600">{t('updates.server_version')}</div><div data-testid="updates-server" className="text-lg font-mono text-slate-200">{info?.appVersion ?? t('updates.unknown')}</div></div>
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4"><div className="text-[9px] uppercase tracking-widest text-slate-600">{t('updates.uptime')}</div><div className="text-lg font-mono text-slate-200">{info ? uptimeText(info.uptimeSeconds) : t('updates.unknown')}</div></div>
      </div>

      {failure && <p role="alert" data-testid="updates-error" className="text-xs text-amber-400">{t(failureKey(failure))}</p>}

      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('updates.programs_title')}</span>
          <button type="button" onClick={() => void load()} disabled={busy} className="flex items-center gap-1 text-[10px] text-sky-400 disabled:opacity-40"><RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> {t('updates.refresh')}</button>
        </div>
        {projects && projects.length === 0 && <p data-testid="updates-empty" className="p-4 text-xs text-slate-500">{t('updates.none_found')}</p>}
        {projects && projects.length > 0 && (
          <table className="w-full text-xs">
            <thead><tr className="text-left text-[9px] uppercase tracking-widest text-slate-600"><th className="px-4 py-2">{t('updates.col_program')}</th><th className="px-4 py-2">{t('updates.col_family')}</th><th className="px-4 py-2">{t('updates.col_installed')}</th><th className="px-4 py-2">{t('updates.col_latest')}</th></tr></thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.name} data-testid="updates-row" className="border-t border-slate-800 text-slate-300">
                  <td className="px-4 py-2 font-mono">{project.name}</td>
                  <td className="px-4 py-2 text-slate-500">{project.family ?? '-'}</td>
                  <td className="px-4 py-2 font-mono">{project.version ?? t('updates.no_version')}</td>
                  <td className="px-4 py-2 text-slate-600">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {projects && projects.length > 0 && <p data-testid="updates-count" className="px-4 py-2 border-t border-slate-800 text-[10px] text-slate-600">{t('updates.count', { with: versionedCount(projects), total: projects.length })}</p>}
      </div>

      <SelfUpdatePanel />

      <p data-testid="updates-no-source" className="text-[10px] text-slate-500 leading-relaxed border border-slate-800 rounded-xl p-4">{t('updates.no_source')}</p>
    </div>
  );
}
