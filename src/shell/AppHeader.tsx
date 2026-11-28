// =============================================================================
// HYDRA-UMC STUDIO - src/shell/AppHeader.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The top bar: product name, the global STOP, configuration, help, about, the link to the server and the controller selector.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Info, Menu, Settings } from 'lucide-react';
import HydraIcon from '../assets/HYDRA_UMC_ICON.svg';
import { cn } from '../components/robotDetail/shared';
import { StopAllButton, StopStateBadge } from '../components/StopAll';
import { useFleet, useServerStatus, useSettingsStore } from '../storeContexts';

type Props = {
  onToggleSidebar: () => void;
  onSettings: () => void;
  onHelp: () => void;
  onAbout: () => void;
  /** The catalogue keys of the group and the screen shown (not in the classic menu). */
  title?: { group: string; screen: string };
};

export function AppHeader({ onToggleSidebar, onSettings, onHelp, onAbout, title }: Props) {
  const { t } = useTranslation();
  const { serverReachable, settingsSaveError, settingsLocalOnly } = useServerStatus();
  const { flushSettingsSave } = useSettingsStore();
  const { controllers, activeControllerId, setActiveControllerId } = useFleet();

  return (
    <header className="h-16 shrink-0 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-20 shadow-xl relative">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="p-2 -ml-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"><Menu size={24} /></button>
        <img src={HydraIcon} alt={t('dashboard.logo_alt')} className="w-8 h-8 object-contain" />
        <h1 className="text-2xl font-bold tracking-wider text-slate-100">HYDRA<span className="text-emerald-500">-UM</span><span className="text-rose-500">C</span> <span className="text-sky-400 font-medium">Studio</span></h1>
        {title && (
          <p data-testid="screen-title" className="hidden 2xl:block ml-8 truncate text-sm text-slate-500 uppercase">
            {t(title.group)} / <strong className="text-slate-100 normal-case text-base">{t(title.screen)}</strong>
          </p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {/* The global STOP: one click, every robot, always in sight (Ctrl+Shift+Space does the same). */}
        <StopStateBadge />
        <span data-tour="stop" className="inline-flex"><StopAllButton variant="header" /></span>
        <IconButton onClick={onSettings} icon={<Settings size={18}/>} label={t('dashboard.configure')} tour="settings" />
        <IconButton onClick={onHelp} icon={<HelpCircle size={18}/>} label={t('dashboard.help')} tour="help" />
        <IconButton onClick={onAbout} icon={<Info size={18}/>} label={t('dashboard.about')} />
        <div className="w-px h-6 bg-slate-800 mx-2"></div>
        <div className="flex items-center gap-3">
          {/* reads the real, live serverReachable signal,
              never activeController.status - see that field's own
              header comment in store.tsx for why. */}
          <span className={cn("w-4 h-4 rounded-full animate-pulse", serverReachable ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-rose-500 shadow-[0_0_10px_#f43f5e]")} />
          <span className={cn("tracking-widest font-bold text-xs uppercase", serverReachable ? "text-emerald-400" : "text-rose-400")}>{serverReachable ? t('dashboard.status.connected') : t('dashboard.status.disconnected')}</span>
          {!serverReachable && (
            <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/40" title={t('dashboard.example_data_hint')}>
              {t('dashboard.example_data')}
            </span>
          )}
          {/* Real, live "the last save actually failed" signal - see
              settingsSaveError's own comment in store.tsx for the real
              production bug (a stopped camera whose settings save
              silently 401/403'd, leaving the real stream process
              running) this makes visible instead of silent. */}
          {settingsLocalOnly && (
            <span
              className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/40"
              title={t('dashboard.operator_local_only_hint')}
            >
              {t('dashboard.operator_local_only')}
            </span>
          )}
          {settingsSaveError && (
            <button
              onClick={() => flushSettingsSave()}
              title={settingsSaveError}
              className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 transition-colors animate-pulse"
            >
              {t('dashboard.save_failed_retry')}
            </button>
          )}
        </div>
        <select value={activeControllerId} onChange={(e) => setActiveControllerId(e.target.value)} className="ml-4 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-sky-400 outline-none appearance-none cursor-pointer hover:border-sky-500 transition-all shadow-inner">
          {controllers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.ip})</option>)}
        </select>
      </div>
    </header>
  );
}

function IconButton({ icon, label, onClick, tour }: { icon: React.ReactNode, label: string, onClick: () => void, tour?: string }) {
  return (
    <button onClick={onClick} data-tour={tour} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all group shadow-lg">
      <div className="text-sky-400">{icon}</div>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}
