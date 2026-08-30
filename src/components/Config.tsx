// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog: Config.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// Lives as its own module, separate from Dashboard.tsx, so it can evolve on
// its own without risking the rest of the shell. configTab lives here since nothing
// outside this modal ever reads it.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Settings, Plus, Trash2, AlertTriangle, Cpu, RefreshCw, Save, FolderOpen, Edit2, Wifi, Smartphone, Tablet,
  Wrench, CheckCircle2, XCircle, Bot, Printer, Watch,
} from 'lucide-react';
import { useHydraStore, createDefaultRobots, createDefaultCameras } from '../store';
import { UsersPanel } from './UsersPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { apiUrl } from '../lib/apiBase';

const GamepadConfig = React.lazy(() => import('./GamepadConfig').then(m => ({ default: m.GamepadConfig })));

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function PanelLoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
      <RefreshCw size={18} className="animate-spin mr-2" /> Loading…
    </div>
  );
}

type ConfigTab = 'identity' | 'controllers' | 'ui' | 'robots' | 'cameras' | 'models' | 'integrations' | 'remoteaccess' | 'users' | 'paths' | 'canota' | 'aihailo' | 'gamepad';

// Real "Test Connection" result state per integration card - see
// server.ts's own POST /api/integrations/test-connection: a real TCP
// reachability probe, not a saved-with-zero-verification ip/port like
// these cards used to be.
type TestState = 'idle' | 'testing' | 'reachable' | 'unreachable';

/**
 * A real module-level component (not declared inside Config's own render,
 * which oxlint correctly flags: a component re-created every render loses
 * its own identity/state on every re-render). All state lives in the
 * parent's `testStates`/`onTest` instead - this component is purely
 * presentational.
 */
function TestConnectionButton({ state, onTest }: { state: TestState; onTest: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onTest}
      disabled={state === 'testing'}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border",
        state === 'reachable' && "bg-emerald-500/10 border-emerald-500/50 text-emerald-400",
        state === 'unreachable' && "bg-rose-500/10 border-rose-500/50 text-rose-400",
        (state === 'idle' || state === 'testing') && "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200",
      )}
    >
      {state === 'testing' && <RefreshCw size={12} className="animate-spin" />}
      {state === 'reachable' && <CheckCircle2 size={12} />}
      {state === 'unreachable' && <XCircle size={12} />}
      {(state === 'idle') && <Wrench size={12} />}
      {state === 'testing' ? t('config.testing_connection') : state === 'reachable' ? t('config.connection_reachable') : state === 'unreachable' ? t('config.connection_unreachable') : t('config.test_connection')}
    </button>
  );
}

export function Config({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { controllers, activeController, updateController, settings, updateSettings, updateRobot, addController, removeController, factoryReset, updateCamera, authToken } = useHydraStore();
  const [configTab, setConfigTab] = useState<ConfigTab>('identity');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Keyed by integration name so each card's own test result is
  // independent of the others.
  const [testStates, setTestStates] = useState<Record<string, TestState>>({});

  const testConnection = async (key: string, ip: string, port: number) => {
    setTestStates((prev) => ({ ...prev, [key]: 'testing' }));
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(apiUrl('/api/integrations/test-connection'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ host: ip, port }),
      });
      const body = await res.json();
      setTestStates((prev) => ({ ...prev, [key]: res.ok && body.reachable ? 'reachable' : 'unreachable' }));
    } catch {
      // A real network-level failure (server unreachable, CORS, etc.) -
      // same end state as a real "reachable: false" from the probe
      // itself, since either way this card's own bridge could not be
      // confirmed reachable just now.
      setTestStates((prev) => ({ ...prev, [key]: 'unreachable' }));
    }
  };

  const tabs: { id: ConfigTab, label: string }[] = [
    { id: 'identity', label: t('config.identity') },
    { id: 'controllers', label: t('config.controllers') },
    { id: 'ui', label: t('config.ui_themes') },
    { id: 'robots', label: t('config.robot_names') },
    { id: 'cameras', label: t('config.camera_setup') },
    { id: 'models', label: t('config.custom_models') },
    { id: 'integrations', label: t('config.integrations') },
    { id: 'remoteaccess', label: t('config.remote_access_tab') },
    { id: 'users', label: t('config.users') },
    { id: 'paths', label: t('config.paths') },
    { id: 'canota', label: t('config.can_ota') },
    { id: 'aihailo', label: t('config.ai_hailo') },
    { id: 'gamepad', label: t('config.gamepad') },
  ];

  const moduleOptions = [
    { key: 'Vision/Cameras', label: t('config.module_vision') },
    { key: 'XY Table', label: t('config.module_xytable') },
    { key: 'ATC Tools', label: t('config.module_atctools') },
    { key: 'Rack', label: t('config.module_rack') },
    { key: 'PickAndPlace', label: t('config.module_pnp') },
    { key: 'CNC', label: t('config.module_cnc') },
    { key: 'Laser', label: t('config.module_laser') },
    { key: 'Vacuum Table', label: t('config.module_vacuum') },
    { key: 'Heated Bed', label: t('config.module_heatedbed') },
  ];

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[850px] max-w-full overflow-hidden flex flex-col h-[750px]">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2"><Settings className="text-sky-400" size={20} /> {t('config.title')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">&times;</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-52 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setConfigTab(tab.id)} className={cn("px-4 py-3 text-xs font-bold uppercase tracking-widest text-left transition-colors", configTab === tab.id ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-500 hover:bg-slate-900')}>{tab.label}</button>
            ))}
            <div className="mt-auto border-t border-slate-800 p-4">
              <button onClick={() => setShowResetConfirm(true)} className="w-full px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/50 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"><RefreshCw size={14} /> {t('config.factory_reset_upper')}</button>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-900">
            {configTab === 'identity' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2">{t('config.broadcast_identity')}</h3>
                <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('config.server_name')}</label>
                    <input
                      value={settings.serverName || "HYDRA-UMC TEST"}
                      onChange={e => updateSettings({ serverName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 font-bold outline-none focus:border-sky-400 focus:glow-border-sky transition-all shadow-inner"
                      placeholder={t('config.server_name_placeholder')}
                    />
                    <p className="text-[10px] text-slate-600 italic leading-relaxed">{t('config.server_name_desc')}</p>
                  </div>
                </div>
              </div>
            )}

            {configTab === 'controllers' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('config.controller_management')}</h3>
                <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 border-b border-slate-800">
                      <tr><th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('config.node_name')}</th><th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('config.ip_address')}</th><th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('config.status')}</th><th className="px-4 py-3"></th></tr>
                    </thead>
                    <tbody>
                      {controllers.map(c => (
                        <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors">
                          <td className="px-4 py-3"><input value={c.name} onChange={e => updateController(c.id, { name: e.target.value })} className="bg-transparent outline-none w-full text-slate-200 font-bold" /></td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-400"><input value={c.ip} onChange={e => updateController(c.id, { ip: e.target.value })} className="bg-transparent outline-none w-full" /></td>
                          <td className="px-4 py-3"><span className={cn("px-2 py-1 rounded text-[10px] font-black uppercase", c.status === 'online' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>{c.status === 'online' ? t('config.online') : t('config.offline')}</span></td>
                          <td className="px-4 py-3 text-right"><button onClick={() => removeController(c.id)} className="text-slate-600 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={() => addController({ id: 'new-' + Date.now(), name: 'New Controller', ip: '192.168.1.xxx', status: 'offline', fdcanBaudrate: 1000, fdcanDataBaudrate: 5000, robots: createDefaultRobots(), cameras: createDefaultCameras() })} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-sky-400 rounded-lg border border-slate-700 text-xs font-bold uppercase hover:bg-slate-700"><Plus size={14}/> {t('config.add_node')}</button>

                <div className="pt-6 grid grid-cols-2 gap-4 border-t border-slate-800/50">
                   <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('config.fdcan_protocol')}</label><select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-sky-500"><option>{t('config.classic_can')} (2.0)</option><option selected>{t('config.fdcan_iso')}</option></select></div>
                   <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('config.data_phase_bitrate')}</label><select className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none focus:border-sky-500"><option>500 kbps</option><option>1 Mbps</option><option selected>2 Mbps</option><option>5 Mbps</option><option>10 Mbps</option></select></div>
                </div>
              </div>
            )}

            {configTab === 'ui' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('config.visual_environment')}</h3>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-sky-400" value={settings.theme} onChange={e => updateSettings({ theme: e.target.value })}>
                    <option value="HYDRA-UMC Studio Fasion">HYDRA-UMC Studio Fasion</option>
                    <option value="Dark Mode (Default)">Dark Mode (Default)</option>
                    <option value="Matrix">Matrix Terminal</option>
                    <option value="Cyberpunk">Cyberpunk Neon</option>
                    <option value="Neon">Neon</option>
                    <option value="Dracula">Dracula</option>
                    <option value="Nord">Nord</option>
                    <option value="Tokyo Night">Tokyo Night</option>
                    <option value="Midnight Blue">Midnight Blue</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('config.system_localization')}</h3>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-sky-400" value={settings.language} onChange={e => { updateSettings({ language: e.target.value }); i18n.changeLanguage(e.target.value); }}>
                    <option value="en">{t('config.language_en')} (US)</option><option value="es">{t('config.language_es')} (ES)</option><option value="de">{t('config.language_de')} (DE)</option><option value="fr">{t('config.language_fr')} (FR)</option><option value="it">{t('config.language_it')} (IT)</option><option value="zh">{t('config.language_zh')} (ZH)</option><option value="ja">{t('config.language_ja')} (JA)</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('config.module_visibility')}</h3>
                  <div className="grid grid-cols-2 gap-3 bg-slate-950 p-6 rounded-2xl border border-slate-800">
                    {moduleOptions.map(module => (
                      <label key={module.key} className="flex items-center gap-3 group cursor-pointer">
                        <input type="checkbox" checked={settings.visibleModules.includes(module.key)} onChange={(e) => {
                            let newModules = [...settings.visibleModules];
                            if (e.target.checked) newModules.push(module.key); else newModules = newModules.filter(m => m !== module.key);
                            updateSettings({ visibleModules: newModules });
                          }} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500" />
                        <span className="text-sm text-slate-400 group-hover:text-slate-100 transition-colors">{module.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {configTab === 'robots' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('config.robot_names')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeController.robots.map(r => (
                    <div key={r.id} className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner group">
                      <span className="text-sky-500 font-mono text-xs font-black w-8">A{r.id}</span>
                      <input value={r.name} onChange={(e) => updateRobot(r.id, { name: e.target.value })} className="bg-transparent border-none outline-none text-slate-100 flex-1 text-sm font-bold placeholder-slate-700" placeholder={t('config.robot_name_placeholder')} />
                      <Edit2 size={12} className="text-slate-800 group-hover:text-slate-500 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {configTab === 'cameras' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2">{t('config.camera_mapping_title')}</h3>
                <div className="grid grid-cols-1 gap-4">
                  {activeController.cameras.map((c, idx) => {
                    const hasConflict = activeController.cameras.some(other => other.id !== c.id && (other.assignedRobotId === c.assignedRobotId && c.assignedRobotId));
                    const hasSourceConflict = activeController.cameras.some(other => other.id !== c.id && (other.hardwareSource === c.hardwareSource && c.hardwareSource));

                    return (
                    <div key={c.id} className={cn("bg-slate-950 p-6 rounded-2xl border transition-all shadow-xl space-y-4", (hasConflict || hasSourceConflict) ? "border-rose-500/50 bg-rose-500/5 shadow-rose-500/10" : "border-slate-800")}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <div className={cn("w-10 h-10 rounded-full border flex items-center justify-center font-black", (hasConflict || hasSourceConflict) ? "bg-rose-500/20 border-rose-500 text-rose-400" : "bg-slate-900 border-slate-700 text-sky-400")}>C{c.id}</div>
                           <span className="text-xs font-black text-slate-200 uppercase tracking-widest">{t('config.vision_slot')} {idx + 1}</span>
                        </div>
                        {(hasConflict || hasSourceConflict) && <div className="flex items-center gap-1 text-rose-400 text-[10px] font-bold uppercase"><AlertTriangle size={14}/> {t('config.resource_conflict')}</div>}
                        {!hasConflict && !hasSourceConflict && <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter", c.connected ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-600")}>{c.connected ? t('config.active_stream') : t('config.standby')}</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('config.assigned_robot')}</label>
                          <select
                            value={c.assignedRobotId || ""}
                            onChange={e => updateCamera(c.id, { assignedRobotId: parseInt(e.target.value) || undefined })}
                            className={cn("w-full bg-slate-900 border rounded-lg p-2 text-xs text-slate-200 outline-none transition-all", hasConflict ? "border-rose-500" : "border-slate-800 focus:border-sky-500")}
                          >
                            <option value="">{t('config.none_floating')}</option>
                            {activeController.robots.map(r => <option key={r.id} value={r.id}>{r.name} (A{r.id})</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('config.hardware_source')}</label>
                          <input
                            value={c.hardwareSource || ""}
                            onChange={e => updateCamera(c.id, { hardwareSource: e.target.value })}
                            className={cn("w-full bg-slate-900 border rounded-lg p-2 text-xs font-mono outline-none transition-all", hasSourceConflict ? "border-rose-500 text-rose-400" : "border-slate-800 text-emerald-400 focus:border-emerald-500")}
                            placeholder="/dev/video0"
                          />
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            )}

            {configTab === 'models' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('config.custom_models')}</h3>
                <div className="space-y-3">
                   {settings.customModels?.map((m, idx) => (
                     <div key={idx} className="flex items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-xl group">
                       <div className="p-2 bg-slate-900 rounded border border-slate-800 text-emerald-500"><Plus size={14}/></div>
                       <input value={m} onChange={e => { const updated = [...settings.customModels]; updated[idx] = e.target.value; updateSettings({ customModels: updated }); }} className="bg-transparent outline-none flex-1 text-xs font-mono text-slate-200" />
                       <button onClick={() => updateSettings({ customModels: settings.customModels.filter((_,i)=>i!==idx) })} className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                     </div>
                   ))}
                   <button onClick={() => updateSettings({ customModels: [...(settings.customModels||[]), "new_model_v1.urdf"] })} className="w-full py-3 bg-slate-800 text-sky-400 rounded-xl border border-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">{t('config.register_urdf')}</button>
                </div>

                {/* Model submissions - server side of HYDRA-UMC-EDITOR-URDF, see docs/REMOTE_API.md and that sibling project's own README. */}
                <div className="pt-6 border-t border-slate-800/50 space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('config.model_submissions')}</h3>
                  <p className="text-[10px] text-slate-600 leading-relaxed">{t('config.model_submissions_desc')}</p>
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-emerald-400 uppercase text-[10px] tracking-widest">{t('config.model_submissions_enable')}</span>
                      <input type="checkbox" checked={settings.modelSubmissions?.enabled ?? false} onChange={(e) => updateSettings({ modelSubmissions: { enabled: e.target.checked, destinationFolder: settings.modelSubmissions?.destinationFolder ?? 'models/submitted' } })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('config.model_submissions_folder')}</label>
                      <input
                        value={settings.modelSubmissions?.destinationFolder ?? 'models/submitted'}
                        onChange={(e) => updateSettings({ modelSubmissions: { enabled: settings.modelSubmissions?.enabled ?? false, destinationFolder: e.target.value } })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 font-mono outline-none focus:border-emerald-400 transition-all"
                        placeholder="models/submitted"
                      />
                      <p className="text-[10px] text-slate-600 italic leading-relaxed">{t('config.model_submissions_folder_desc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {configTab === 'integrations' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <p className="text-[10px] text-slate-600 leading-relaxed">{t('config.integrations_desc')}</p>
                {/* OpenPNP */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 blur-3xl" />
                  <div className="flex justify-between items-center border-b border-slate-900 pb-3"><span className="font-black text-sky-400 uppercase tracking-widest text-[11px]">{t('config.openpnp_control')}</span><input type="checkbox" checked={settings.integrations?.openPnP?.enabled} onChange={e => updateSettings({ integrations: { ...settings.integrations, openPnP: { ...settings.integrations?.openPnP, enabled: e.target.checked } } })} className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-sky-500" /></div>
                  <div className="grid grid-cols-2 gap-6"><div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">{t('config.server_ip')}</label><input value={settings.integrations?.openPnP?.ip} onChange={e => updateSettings({ integrations: { ...settings.integrations, openPnP: { ...settings.integrations?.openPnP, ip: e.target.value } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" /></div><div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">{t('config.port')}</label><input type="number" value={settings.integrations?.openPnP?.port} onChange={e => updateSettings({ integrations: { ...settings.integrations, openPnP: { ...settings.integrations?.openPnP, port: parseInt(e.target.value) } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" /></div></div>
                  <TestConnectionButton state={testStates.openPnP || 'idle'} onTest={() => testConnection('openPnP', settings.integrations?.openPnP?.ip, settings.integrations?.openPnP?.port)} />
                </div>
                {/* CNC */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-fuchsia-500/5 blur-3xl" />
                   <div className="flex justify-between items-center border-b border-slate-900 pb-3"><span className="font-black text-fuchsia-400 uppercase tracking-widest text-[11px]">{t('config.cnc_backend')}</span><input type="checkbox" checked={settings.integrations?.cnc?.enabled} onChange={e => updateSettings({ integrations: { ...settings.integrations, cnc: { ...settings.integrations?.cnc, enabled: e.target.checked } } })} className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-fuchsia-500" /></div>
                   <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">{t('config.software_type')}</label><select className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200" value={settings.integrations?.cnc?.software} onChange={e => updateSettings({ integrations: { ...settings.integrations, cnc: { ...settings.integrations?.cnc, software: e.target.value } } })}><option value="LinuxCNC">LinuxCNC</option><option value="Mach3">Mach3</option><option value="GRBL">GRBL Serial</option></select></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">{t('config.server_ip')}</label><input value={settings.integrations?.cnc?.ip} onChange={e => updateSettings({ integrations: { ...settings.integrations, cnc: { ...settings.integrations?.cnc, ip: e.target.value } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">{t('config.port')}</label><input type="number" value={settings.integrations?.cnc?.port} onChange={e => updateSettings({ integrations: { ...settings.integrations, cnc: { ...settings.integrations?.cnc, port: parseInt(e.target.value) } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" /></div>
                   </div>
                   <TestConnectionButton state={testStates.cnc || 'idle'} onTest={() => testConnection('cnc', settings.integrations?.cnc?.ip, settings.integrations?.cnc?.port)} />
                </div>
                {/* Laser */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-3xl" />
                   <div className="flex justify-between items-center border-b border-slate-900 pb-3"><span className="font-black text-rose-500 uppercase tracking-widest text-[11px]">{t('config.laser_engine')}</span><input type="checkbox" checked={settings.integrations?.laser?.enabled} onChange={e => updateSettings({ integrations: { ...settings.integrations, laser: { ...settings.integrations?.laser, enabled: e.target.checked } } })} className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-rose-500" /></div>
                   <div className="grid grid-cols-3 gap-6">
                      <select className="bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200" value={settings.integrations?.laser?.software} onChange={e => updateSettings({ integrations: { ...settings.integrations, laser: { ...settings.integrations?.laser, software: e.target.value } } })}><option value="LightBurn">LightBurn</option><option value="LaserGRBL">LaserGRBL</option></select>
                      <input value={settings.integrations?.laser?.ip} onChange={e => updateSettings({ integrations: { ...settings.integrations, laser: { ...settings.integrations?.laser, ip: e.target.value } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" placeholder={t('config.server_ip')} />
                      <input type="number" value={settings.integrations?.laser?.port} onChange={e => updateSettings({ integrations: { ...settings.integrations, laser: { ...settings.integrations?.laser, port: parseInt(e.target.value) } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" />
                   </div>
                   <TestConnectionButton state={testStates.laser || 'idle'} onTest={() => testConnection('laser', settings.integrations?.laser?.ip, settings.integrations?.laser?.port)} />
                </div>
                {/* ROS2 */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-3xl" />
                   <div className="flex justify-between items-center border-b border-slate-900 pb-3"><span className="font-black text-amber-400 uppercase tracking-widest text-[11px] flex items-center gap-2"><Bot size={14} /> {t('config.ros2_bridge')}</span><input type="checkbox" checked={settings.integrations?.ros2?.enabled} onChange={e => updateSettings({ integrations: { ...settings.integrations, ros2: { ...settings.integrations?.ros2, enabled: e.target.checked } } })} className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-amber-500" /></div>
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">{t('config.server_ip')}</label><input value={settings.integrations?.ros2?.ip} onChange={e => updateSettings({ integrations: { ...settings.integrations, ros2: { ...settings.integrations?.ros2, ip: e.target.value } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">{t('config.port')}</label><input type="number" value={settings.integrations?.ros2?.port} onChange={e => updateSettings({ integrations: { ...settings.integrations, ros2: { ...settings.integrations?.ros2, port: parseInt(e.target.value) } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" /></div>
                   </div>
                   <TestConnectionButton state={testStates.ros2 || 'idle'} onTest={() => testConnection('ros2', settings.integrations?.ros2?.ip, settings.integrations?.ros2?.port)} />
                </div>
                {/* 3D Printer */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 blur-3xl" />
                   <div className="flex justify-between items-center border-b border-slate-900 pb-3"><span className="font-black text-teal-400 uppercase tracking-widest text-[11px] flex items-center gap-2"><Printer size={14} /> {t('config.printer3d_bridge')}</span><input type="checkbox" checked={settings.integrations?.printer3d?.enabled} onChange={e => updateSettings({ integrations: { ...settings.integrations, printer3d: { ...settings.integrations?.printer3d, enabled: e.target.checked } } })} className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-teal-500" /></div>
                   <div className="grid grid-cols-3 gap-6">
                      <select className="bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200" value={settings.integrations?.printer3d?.software} onChange={e => updateSettings({ integrations: { ...settings.integrations, printer3d: { ...settings.integrations?.printer3d, software: e.target.value } } })}>
                        <option value="OrcaSlicer">OrcaSlicer</option>
                        <option value="Cura">Cura</option>
                        <option value="PrusaSlicer">PrusaSlicer</option>
                        <option value="LycheeSlicer">LycheeSlicer</option>
                        <option value="BambuStudio">Bambu Studio</option>
                      </select>
                      <input value={settings.integrations?.printer3d?.ip} onChange={e => updateSettings({ integrations: { ...settings.integrations, printer3d: { ...settings.integrations?.printer3d, ip: e.target.value } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" placeholder={t('config.server_ip')} />
                      <input type="number" value={settings.integrations?.printer3d?.port} onChange={e => updateSettings({ integrations: { ...settings.integrations, printer3d: { ...settings.integrations?.printer3d, port: parseInt(e.target.value) } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" />
                   </div>
                   <TestConnectionButton state={testStates.printer3d || 'idle'} onTest={() => testConnection('printer3d', settings.integrations?.printer3d?.ip, settings.integrations?.printer3d?.port)} />
                </div>
              </div>
            )}

            {configTab === 'remoteaccess' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><Wifi size={16} /> {t('config.remote_access_tab')}</h3>
                  <p className="text-[10px] text-slate-600 leading-relaxed pt-2">{t('config.remote_access_tab_desc')}</p>
                </div>
                {/* Each remote client self-identifies via the X-Hydra-Client request header (server.ts's own remoteAccessAllowed()), so these 4 can be toggled independently instead of sharing one combined switch. Watch is distinct from Android: it relays through the paired phone, which sends X-Hydra-Client: watch only for that relay - the phone's own direct access stays governed by its own toggle above. */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-2 shadow-inner">
                  <div className="flex items-center justify-between"><span className="font-black text-emerald-400 uppercase text-[10px] tracking-widest flex items-center gap-2"><Cpu size={14} /> {t('config.remote_access_suite')}</span><input type="checkbox" checked={settings.remoteAccess?.suite ?? settings.remoteAccess?.enabled ?? true} onChange={(e) => updateSettings({ remoteAccess: { ...settings.remoteAccess, suite: e.target.checked } })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500" /></div>
                  <p className="text-[10px] text-slate-600 leading-tight">{t('config.remote_access_suite_desc')}</p>
                </div>
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-2 shadow-inner">
                  <div className="flex items-center justify-between"><span className="font-black text-emerald-400 uppercase text-[10px] tracking-widest flex items-center gap-2"><Tablet size={14} /> {t('config.remote_access_android')}</span><input type="checkbox" checked={settings.remoteAccess?.android ?? settings.remoteAccess?.enabled ?? true} onChange={(e) => updateSettings({ remoteAccess: { ...settings.remoteAccess, android: e.target.checked } })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500" /></div>
                  <p className="text-[10px] text-slate-600 leading-tight">{t('config.remote_access_android_desc')}</p>
                </div>
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-2 shadow-inner">
                  <div className="flex items-center justify-between"><span className="font-black text-emerald-400 uppercase text-[10px] tracking-widest flex items-center gap-2"><Smartphone size={14} /> {t('config.remote_access_ios')}</span><input type="checkbox" checked={settings.remoteAccess?.ios ?? settings.remoteAccess?.enabled ?? true} onChange={(e) => updateSettings({ remoteAccess: { ...settings.remoteAccess, ios: e.target.checked } })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500" /></div>
                  <p className="text-[10px] text-slate-600 leading-tight">{t('config.remote_access_ios_desc')}</p>
                </div>
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-2 shadow-inner">
                  <div className="flex items-center justify-between"><span className="font-black text-emerald-400 uppercase text-[10px] tracking-widest flex items-center gap-2"><Watch size={14} /> {t('config.remote_access_watch')}</span><input type="checkbox" checked={settings.remoteAccess?.watch ?? settings.remoteAccess?.enabled ?? true} onChange={(e) => updateSettings({ remoteAccess: { ...settings.remoteAccess, watch: e.target.checked } })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500" /></div>
                  <p className="text-[10px] text-slate-600 leading-tight">{t('config.remote_access_watch_desc')}</p>
                </div>
              </div>
            )}

            {configTab === 'users' && <UsersPanel />}

            {configTab === 'paths' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('config.work_paths')}</h3>
                <div className="grid grid-cols-1 gap-4">
                  {activeController.robots.map(r => (
                    <div key={r.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col gap-3 shadow-2xl relative group">
                      <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{r.name}</label><span className="text-[9px] text-slate-700 font-mono uppercase">Node A{r.id}</span></div>
                      <div className="flex items-center gap-3"><div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-600 group-hover:text-sky-400 transition-colors"><FolderOpen size={18}/></div><input value={settings.worksPaths?.[r.id] || ""} onChange={e => updateSettings({ worksPaths: { ...(settings.worksPaths || {}), [r.id]: e.target.value } })} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-sky-400 font-mono outline-none focus:border-sky-500 shadow-inner" placeholder={`WORKS/${r.name.replace(/\s+/g,'')}`} /></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {configTab === 'canota' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 space-y-8 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500/20 to-transparent" />
                   <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest flex items-center gap-3"><Cpu size={20}/> {t('config.can_ota')}</h3>
                   <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('config.transport_layer')}</label><select className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-sky-500 shadow-inner transition-all"><option>{t('config.mock_sim')}</option><option>{t('config.hw_direct')}</option><option>{t('config.net_tunnel')}</option></select></div>
                   <div className="grid grid-cols-2 gap-8 border-t border-slate-900 pt-8">
                      <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('config.kinematic_brain_fw')}</label><div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-inner"><Save size={16} className="text-slate-700"/><input className="bg-transparent border-none text-[11px] text-slate-500 font-mono w-full" value="FIRMWARE/KinematicBrain" readOnly /></div></div>
                      <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('config.controller_fw')}</label><div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-inner"><Save size={16} className="text-slate-700"/><input className="bg-transparent border-none text-[11px] text-slate-500 font-mono w-full" value="FIRMWARE/ControllerBoard" readOnly /></div></div>
                   </div>
                </div>
              </div>
            )}

            {configTab === 'aihailo' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 space-y-8 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500/20 to-transparent" />
                   <div>
                     <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest flex items-center gap-3"><Bot size={20}/> {t('config.ai_hailo')}</h3>
                     <p className="text-[10px] text-slate-600 leading-relaxed pt-2 max-w-2xl">{t('config.ai_hailo_desc')}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('config.ai_hailo_vision_device')}</label>
                        <select
                          value={settings.aiHailo?.visionDevice || 'hailo8'}
                          onChange={e => updateSettings({ aiHailo: { ...settings.aiHailo, visionDevice: e.target.value as 'hailo8' | 'none' } })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-sky-500 shadow-inner transition-all"
                        >
                          <option value="hailo8">Hailo-8</option>
                          <option value="none">{t('config.ai_hailo_none')}</option>
                        </select>
                        <p className="text-[10px] text-slate-600 italic leading-relaxed">{t('config.ai_hailo_vision_desc')}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('config.ai_hailo_cognitive_device')}</label>
                        <select
                          value={settings.aiHailo?.cognitiveDevice || 'none'}
                          onChange={e => updateSettings({ aiHailo: { ...settings.aiHailo, cognitiveDevice: e.target.value as 'hailo10' | 'none' } })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-sky-500 shadow-inner transition-all"
                        >
                          <option value="none">{t('config.ai_hailo_none')}</option>
                          <option value="hailo10">Hailo-10 (8GB)</option>
                        </select>
                        <p className="text-[10px] text-slate-600 italic leading-relaxed">{t('config.ai_hailo_cognitive_desc')}</p>
                      </div>
                   </div>
                   <div className="space-y-2 border-t border-slate-900 pt-8">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('config.ai_hailo_registry_path')}</label>
                     <input
                       value={settings.aiHailo?.modelRegistryPath || ''}
                       onChange={e => updateSettings({ aiHailo: { ...settings.aiHailo, modelRegistryPath: e.target.value } })}
                       className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 font-mono outline-none focus:border-sky-400 transition-all shadow-inner"
                       placeholder="models/hailo"
                     />
                     <p className="text-[10px] text-slate-600 italic leading-relaxed">{t('config.ai_hailo_registry_desc')}</p>
                   </div>
                </div>
              </div>
            )}

            {configTab === 'gamepad' && (
              <div className="animate-in zoom-in-95 fade-in duration-500">
                <React.Suspense fallback={<PanelLoadingFallback />}><GamepadConfig /></React.Suspense>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950 shrink-0">
          <button onClick={onClose} className="px-12 py-3 text-sm bg-sky-500 text-slate-950 font-black rounded-xl shadow-[0_0_30px_rgba(0,229,255,0.4)] border border-sky-400 uppercase hover:bg-sky-400 transition-all tracking-[0.2em]">{t('config.commit_close')}</button>
        </div>
      </div>
      <ConfirmDialog
        open={showResetConfirm}
        message={t('config.reset_confirm')}
        onConfirm={() => { setShowResetConfirm(false); factoryReset(); }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
