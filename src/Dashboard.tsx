// =============================================================================
// HYDRA-UMC STUDIO - Main Dashboard Interface: Dashboard.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import HydraIcon from './assets/HYDRA_UMC_ICON.svg';
import { useHydraStore, createDefaultRobots, createDefaultCameras, ROBOT_MANUFACTURERS } from './store';
import { 
  Activity, Crosshair, AlertOctagon, Layers, 
  Video, Focus, Settings, Menu, Plus, Trash2, Search, AlertTriangle, Power
, Cpu, PenTool, Zap, Wind, Thermometer, RefreshCw, Server, Info, HelpCircle, Save, FolderOpen, ChevronDown, ChevronRight, Camera, X, ArrowLeft, Edit2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for Tailwind class merging. */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Suspense fallback for the lazy-loaded panels below. */
function PanelLoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
      <RefreshCw size={18} className="animate-spin mr-2" /> Loading…
    </div>
  );
}

// Components
import { HelpModal } from './components/HelpModal';
import { slotLabel } from './lib/canOta';

// Lazy-loaded Panels
const RobotDetail = React.lazy(() => import('./components/RobotDetail').then(m => ({ default: m.RobotDetail })));
const CamerasView = React.lazy(() => import('./components/CamerasView').then(m => ({ default: m.CamerasView })));
const XYTableConfig = React.lazy(() => import('./components/XYTableConfig').then(m => ({ default: m.XYTableConfig })));
const PickAndPlace = React.lazy(() => import('./components/PickAndPlace').then(m => ({ default: m.PickAndPlace })));
const CNC = React.lazy(() => import('./components/CNC').then(m => ({ default: m.CNC })));
const Laser = React.lazy(() => import('./components/Laser').then(m => ({ default: m.Laser })));
const VacuumTableConfig = React.lazy(() => import('./components/VacuumTableConfig').then(m => ({ default: m.VacuumTableConfig })));
const HeatedBedConfig = React.lazy(() => import('./components/HeatedBedConfig').then(m => ({ default: m.HeatedBedConfig })));
const ATCToolsConfig = React.lazy(() => import('./components/ATCToolsConfig').then(m => ({ default: m.ATCToolsConfig })));
const RackConfigView = React.lazy(() => import('./components/RackConfigView').then(m => ({ default: m.RackConfigView })));
const GamepadConfig = React.lazy(() => import('./components/GamepadConfig').then(m => ({ default: m.GamepadConfig })));
const Flasher = React.lazy(() => import('./components/Flasher').then(m => ({ default: m.Flasher })));
const Tester = React.lazy(() => import('./components/Tester').then(m => ({ default: m.Tester })));
const KinematicBrainStage = React.lazy(() => import('./components/KinematicBrainStage').then(m => ({ default: m.KinematicBrainStage })));

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { controllers, activeControllerId, setActiveControllerId, activeController, updateController, robots, settings, updateSettings, updateRobot, addController, removeController, factoryReset, cameras, updateCamera } = useHydraStore();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedRobotId, setSelectedRobotId] = useState<number>(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [configTab, setConfigTab] = useState<'identity' | 'controllers' | 'ui' | 'robots' | 'cameras' | 'models' | 'integrations' | 'paths' | 'canota' | 'gamepad'>('identity');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [navStack, setNavStack] = useState<string[]>([]);
  const currentMenu = navStack[navStack.length - 1] || 'root';

  const hideUI = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('hideUI') === 'true';
  }, []);

  const activeRobot = robots.find(r => r.id === selectedRobotId);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const robotIdParam = params.get('robotId');
    if (robotIdParam) {
      setSelectedRobotId(parseInt(robotIdParam));
    }

    document.body.dataset.theme = settings.theme;
    if (settings.language && i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.theme, settings.language, i18n]);

  useEffect(() => {
    if (hideUI && activeTab !== 'robot') {
      setActiveTab('robot');
    }
  }, [hideUI]);

  return (
    <div className="w-full h-screen bg-slate-950 bg-electric-grid text-slate-200 flex flex-col font-sans overflow-hidden mx-auto touch-none relative">
      
      {/* About Modal */}
      {isAboutOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[500px] max-w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2"><Info className="text-sky-400" size={20} /> About HYDRA-UMC STUDIO</h2>
              <button onClick={() => setIsAboutOpen(false)} className="text-slate-400 hover:text-slate-200 p-1">&times;</button>
            </div>
            <div className="p-6 space-y-4 text-slate-300 text-sm flex flex-col items-center">
              <img src={HydraIcon} alt="Hydra Logo" className="w-24 h-24 object-contain mb-4" />
              <h3 className="text-2xl font-bold text-slate-100 uppercase tracking-widest text-center">HYDRA<span className="text-emerald-500">-UM</span><span className="text-rose-500">C</span> <span className="text-sky-400 font-medium">Studio</span></h3>
              <p className="text-center text-slate-400 max-w-sm">{t('dashboard.about_tagline')}</p>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950 shrink-0">
              <button onClick={() => setIsAboutOpen(false)} className="px-6 py-2 text-sm bg-sky-500 text-slate-950 font-bold rounded shadow-lg border border-sky-400 uppercase">Close</button>
            </div>
          </div>
        </div>
      )}

      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}

      {/* Full Settings Modal */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[850px] max-w-full overflow-hidden flex flex-col h-[750px]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2"><Settings className="text-sky-400" size={20} /> System Configuration</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-200 p-1">&times;</button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-52 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
                <button onClick={() => setConfigTab('identity')} className={cn("px-4 py-3 text-xs font-bold uppercase tracking-widest text-left transition-colors", configTab === 'identity' ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-500 hover:bg-slate-900')}>Identity</button>
                <button onClick={() => setConfigTab('controllers')} className={cn("px-4 py-3 text-xs font-bold uppercase tracking-widest text-left transition-colors", configTab === 'controllers' ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-500 hover:bg-slate-900')}>Controllers</button>
                <button onClick={() => setConfigTab('ui')} className={cn("px-4 py-3 text-xs font-bold uppercase tracking-widest text-left transition-colors", configTab === 'ui' ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-500 hover:bg-slate-900')}>UI & Themes</button>
                <button onClick={() => setConfigTab('robots')} className={cn("px-4 py-3 text-xs font-bold uppercase tracking-widest text-left transition-colors", configTab === 'robots' ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-500 hover:bg-slate-900')}>Robot Names</button>
                <button onClick={() => setConfigTab('cameras')} className={cn("px-4 py-3 text-xs font-bold uppercase tracking-widest text-left transition-colors", configTab === 'cameras' ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-500 hover:bg-slate-900')}>Camera Setup</button>
                <button onClick={() => setConfigTab('models')} className={cn("px-4 py-3 text-xs font-bold uppercase tracking-widest text-left transition-colors", configTab === 'models' ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-500 hover:bg-slate-900')}>Models</button>
                <button onClick={() => setConfigTab('integrations')} className={cn("px-4 py-3 text-xs font-bold uppercase tracking-widest text-left transition-colors", configTab === 'integrations' ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-500 hover:bg-slate-900')}>Integrations</button>
                <button onClick={() => setConfigTab('paths')} className={cn("px-4 py-3 text-xs font-bold uppercase tracking-widest text-left transition-colors", configTab === 'paths' ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-500 hover:bg-slate-900')}>Work Paths</button>
                <button onClick={() => setConfigTab('canota')} className={cn("px-4 py-3 text-xs font-bold uppercase tracking-widest text-left transition-colors", configTab === 'canota' ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-500 hover:bg-slate-900')}>CAN-OTA</button>
                <button onClick={() => setConfigTab('gamepad')} className={cn("px-4 py-3 text-xs font-bold uppercase tracking-widest text-left transition-colors", configTab === 'gamepad' ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-500 hover:bg-slate-900')}>Gamepad</button>
                <div className="mt-auto border-t border-slate-800 p-4">
                  <button onClick={() => { if (confirm(t('config.reset_confirm'))) factoryReset(); }} className="w-full px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/50 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"><RefreshCw size={14} /> Factory Reset</button>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-900">
                {configTab === 'identity' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2">Global Broadcast Identity</h3>
                    <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Public Server Name</label>
                        <input
                          value={settings.serverName || "HYDRA-UMC TEST"}
                          onChange={e => updateSettings({ serverName: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 font-bold outline-none focus:border-sky-400 focus:glow-border-sky transition-all shadow-inner"
                          placeholder="e.g. HYDRA-UMC TEST"
                        />
                        <p className="text-[10px] text-slate-600 italic leading-relaxed">This name identifies this workstation during network scans and Bluetooth advertisements. Visible in the dashboard footer.</p>
                      </div>
                    </div>
                  </div>
                )}

                {configTab === 'controllers' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Controller Management</h3>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900 border-b border-slate-800">
                          <tr><th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">Node Name</th><th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">IPv4 Address</th><th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">Status</th><th className="px-4 py-3"></th></tr>
                        </thead>
                        <tbody>
                          {controllers.map(c => (
                            <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors">
                              <td className="px-4 py-3"><input value={c.name} onChange={e => updateController(c.id, { name: e.target.value })} className="bg-transparent outline-none w-full text-slate-200 font-bold" /></td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-400"><input value={c.ip} onChange={e => updateController(c.id, { ip: e.target.value })} className="bg-transparent outline-none w-full" /></td>
                              <td className="px-4 py-3"><span className={cn("px-2 py-1 rounded text-[10px] font-black uppercase", c.status === 'online' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>{c.status}</span></td>
                              <td className="px-4 py-3 text-right"><button onClick={() => removeController(c.id)} className="text-slate-600 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button onClick={() => addController({ id: 'new-' + Date.now(), name: 'New Controller', ip: '192.168.1.xxx', status: 'offline', fdcanBaudrate: 1000, fdcanDataBaudrate: 5000, robots: createDefaultRobots(), cameras: createDefaultCameras() })} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-sky-400 rounded-lg border border-slate-700 text-xs font-bold uppercase hover:bg-slate-700"><Plus size={14}/> Add Node</button>

                    <div className="pt-6 grid grid-cols-2 gap-4 border-t border-slate-800/50">
                       <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">FDCAN Protocol</label><select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-sky-500"><option>Classic CAN (2.0)</option><option selected>FDCAN (ISO 11898-1)</option></select></div>
                       <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Data Phase Bitrate</label><select className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none focus:border-sky-500"><option>500 kbps</option><option>1 Mbps</option><option selected>2 Mbps</option><option>5 Mbps</option><option>10 Mbps</option></select></div>
                    </div>
                  </div>
                )}

                {configTab === 'ui' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Visual Environment</h3>
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
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">System Localization</h3>
                      <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-sky-400" value={settings.language} onChange={e => { updateSettings({ language: e.target.value }); i18n.changeLanguage(e.target.value); }}>
                        <option value="en">English (US)</option><option value="es">Español (ES)</option><option value="de">Deutsch (DE)</option><option value="fr">Français (FR)</option><option value="it">Italiano (IT)</option>
                      </select>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Module Visibility Control</h3>
                      <div className="grid grid-cols-2 gap-3 bg-slate-950 p-6 rounded-2xl border border-slate-800">
                        {['Vision/Cameras', 'XY Table', 'ATC Tools', 'Rack', 'PickAndPlace', 'CNC', 'Laser', 'Vacuum Table', 'Heated Bed'].map(module => (
                          <label key={module} className="flex items-center gap-3 group cursor-pointer">
                            <input type="checkbox" checked={settings.visibleModules.includes(module)} onChange={(e) => {
                                let newModules = [...settings.visibleModules];
                                if (e.target.checked) newModules.push(module); else newModules = newModules.filter(m => m !== module);
                                updateSettings({ visibleModules: newModules });
                              }} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500" />
                            <span className="text-sm text-slate-400 group-hover:text-slate-100 transition-colors">{module}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {configTab === 'robots' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Rename Swarm Robots</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeController.robots.map(r => (
                        <div key={r.id} className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner group">
                          <span className="text-sky-500 font-mono text-xs font-black w-8">A{r.id}</span>
                          <input value={r.name} onChange={(e) => updateRobot(r.id, { name: e.target.value })} className="bg-transparent border-none outline-none text-slate-100 flex-1 text-sm font-bold placeholder-slate-700" placeholder="Set Robot Name..." />
                          <Edit2 size={12} className="text-slate-800 group-hover:text-slate-500 transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {configTab === 'cameras' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2">Industrial Camera Mapping</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {activeController.cameras.map((c, idx) => {
                        const hasConflict = activeController.cameras.some(other => other.id !== c.id && (other.assignedRobotId === c.assignedRobotId && c.assignedRobotId));
                        const hasSourceConflict = activeController.cameras.some(other => other.id !== c.id && (other.hardwareSource === c.hardwareSource && c.hardwareSource));

                        return (
                        <div key={c.id} className={cn("bg-slate-950 p-6 rounded-2xl border transition-all shadow-xl space-y-4", (hasConflict || hasSourceConflict) ? "border-rose-500/50 bg-rose-500/5 shadow-rose-500/10" : "border-slate-800")}>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                               <div className={cn("w-10 h-10 rounded-full border flex items-center justify-center font-black", (hasConflict || hasSourceConflict) ? "bg-rose-500/20 border-rose-500 text-rose-400" : "bg-slate-900 border-slate-700 text-sky-400")}>C{c.id}</div>
                               <span className="text-xs font-black text-slate-200 uppercase tracking-widest">Vision Slot {idx + 1}</span>
                            </div>
                            {(hasConflict || hasSourceConflict) && <div className="flex items-center gap-1 text-rose-400 text-[10px] font-bold uppercase"><AlertTriangle size={14}/> Resource Conflict</div>}
                            {!hasConflict && !hasSourceConflict && <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter", c.connected ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-600")}>{c.connected ? "Active Stream" : "Standby"}</span>}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Assigned Robot</label>
                              <select
                                value={c.assignedRobotId || ""}
                                onChange={e => updateCamera(c.id, { assignedRobotId: parseInt(e.target.value) || undefined })}
                                className={cn("w-full bg-slate-900 border rounded-lg p-2 text-xs text-slate-200 outline-none transition-all", hasConflict ? "border-rose-500" : "border-slate-800 focus:border-sky-500")}
                              >
                                <option value="">None / Floating</option>
                                {activeController.robots.map(r => <option key={r.id} value={r.id}>{r.name} (A{r.id})</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Physical Hardware Source</label>
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
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Custom URDF Library</h3>
                    <div className="space-y-3">
                       {settings.customModels?.map((m, idx) => (
                         <div key={idx} className="flex items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-xl group">
                           <div className="p-2 bg-slate-900 rounded border border-slate-800 text-emerald-500"><Plus size={14}/></div>
                           <input value={m} onChange={e => { const updated = [...settings.customModels]; updated[idx] = e.target.value; updateSettings({ customModels: updated }); }} className="bg-transparent outline-none flex-1 text-xs font-mono text-slate-200" />
                           <button onClick={() => updateSettings({ customModels: settings.customModels.filter((_,i)=>i!==idx) })} className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                         </div>
                       ))}
                       <button onClick={() => updateSettings({ customModels: [...(settings.customModels||[]), "new_model_v1.urdf"] })} className="w-full py-3 bg-slate-800 text-sky-400 rounded-xl border border-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">+ Register New URDF Asset</button>
                    </div>
                  </div>
                )}

                {configTab === 'integrations' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    {/* OpenPNP */}
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 blur-3xl" />
                      <div className="flex justify-between items-center border-b border-slate-900 pb-3"><span className="font-black text-sky-400 uppercase tracking-widest text-[11px]">OpenPNP Control</span><input type="checkbox" checked={settings.integrations?.openPnP?.enabled} onChange={e => updateSettings({ integrations: { ...settings.integrations, openPnP: { ...settings.integrations?.openPnP, enabled: e.target.checked } } })} className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-sky-500" /></div>
                      <div className="grid grid-cols-2 gap-6"><div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">Server IP</label><input value={settings.integrations?.openPnP?.ip} onChange={e => updateSettings({ integrations: { ...settings.integrations, openPnP: { ...settings.integrations?.openPnP, ip: e.target.value } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" /></div><div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">Port</label><input type="number" value={settings.integrations?.openPnP?.port} onChange={e => updateSettings({ integrations: { ...settings.integrations, openPnP: { ...settings.integrations?.openPnP, port: parseInt(e.target.value) } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" /></div></div>
                    </div>
                    {/* CNC */}
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-fuchsia-500/5 blur-3xl" />
                       <div className="flex justify-between items-center border-b border-slate-900 pb-3"><span className="font-black text-fuchsia-400 uppercase tracking-widest text-[11px]">CNC Milling Backend</span><input type="checkbox" checked={settings.integrations?.cnc?.enabled} onChange={e => updateSettings({ integrations: { ...settings.integrations, cnc: { ...settings.integrations?.cnc, enabled: e.target.checked } } })} className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-fuchsia-500" /></div>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">Software Type</label><select className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200" value={settings.integrations?.cnc?.software} onChange={e => updateSettings({ integrations: { ...settings.integrations, cnc: { ...settings.integrations?.cnc, software: e.target.value } } })}><option value="LinuxCNC">LinuxCNC</option><option value="Mach3">Mach3</option><option value="GRBL">GRBL Serial</option></select></div>
                          <div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">Control Port</label><input type="number" value={settings.integrations?.cnc?.port} onChange={e => updateSettings({ integrations: { ...settings.integrations, cnc: { ...settings.integrations?.cnc, port: parseInt(e.target.value) } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" /></div>
                       </div>
                    </div>
                    {/* Laser */}
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-3xl" />
                       <div className="flex justify-between items-center border-b border-slate-900 pb-3"><span className="font-black text-rose-500 uppercase tracking-widest text-[11px]">Laser Engrave Engine</span><input type="checkbox" checked={settings.integrations?.laser?.enabled} onChange={e => updateSettings({ integrations: { ...settings.integrations, laser: { ...settings.integrations?.laser, enabled: e.target.checked } } })} className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-rose-500" /></div>
                       <div className="grid grid-cols-2 gap-6">
                          <select className="bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200" value={settings.integrations?.laser?.software} onChange={e => updateSettings({ integrations: { ...settings.integrations, laser: { ...settings.integrations?.laser, software: e.target.value } } })}><option value="LightBurn">LightBurn</option><option value="LaserGRBL">LaserGRBL</option></select>
                          <input type="number" value={settings.integrations?.laser?.port} onChange={e => updateSettings({ integrations: { ...settings.integrations, laser: { ...settings.integrations?.laser, port: parseInt(e.target.value) } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" />
                       </div>
                    </div>
                    {/* Remote Access */}
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-2 shadow-inner">
                        <div className="flex items-center justify-between"><span className="font-black text-emerald-400 uppercase text-[10px] tracking-widest">Remote App Access Discovery</span><input type="checkbox" checked={settings.remoteAccess?.enabled ?? true} onChange={(e) => updateSettings({ remoteAccess: { enabled: e.target.checked } })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500" /></div>
                        <p className="text-[10px] text-slate-600 leading-tight">Control if Android/iOS apps can discover this server IP and identity.</p>
                    </div>
                  </div>
                )}

                {configTab === 'paths' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Work Directory Mapping</h3>
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
                       <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest flex items-center gap-3"><Cpu size={20}/> CAN-OTA Deployment Bus</h3>
                       <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Transport Layer</label><select className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-sky-500 shadow-inner transition-all"><option>Virtual Simulation Mode (MOCK)</option><option>Hardware Direct (SPI to STM32H7)</option><option>Network Tunnel (UDP Broadcast)</option></select></div>
                       <div className="grid grid-cols-2 gap-8 border-t border-slate-900 pt-8">
                          <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kinematic Brain Firmware</label><div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-inner"><Save size={16} className="text-slate-700"/><input className="bg-transparent border-none text-[11px] text-slate-500 font-mono w-full" value="FIRMWARE/KinematicBrain" readOnly /></div></div>
                          <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Robot Controller Firmware</label><div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-inner"><Save size={16} className="text-slate-700"/><input className="bg-transparent border-none text-[11px] text-slate-500 font-mono w-full" value="FIRMWARE/ControllerBoard" readOnly /></div></div>
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
              <button onClick={() => setIsSettingsOpen(false)} className="px-12 py-3 text-sm bg-sky-500 text-slate-950 font-black rounded-xl shadow-[0_0_30px_rgba(0,229,255,0.4)] border border-sky-400 uppercase hover:bg-sky-400 transition-all tracking-[0.2em]">Commit & Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      {!hideUI && (
        <header className="h-16 shrink-0 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-20 shadow-xl relative">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"><Menu size={24} /></button>
            <img src={HydraIcon} alt="Hydra Logo" className="w-8 h-8 object-contain" />
            <h1 className="text-2xl font-bold tracking-wider text-slate-100">HYDRA<span className="text-emerald-500">-UM</span><span className="text-rose-500">C</span> <span className="text-sky-400 font-medium">Studio</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <IconButton onClick={() => setIsSettingsOpen(true)} icon={<Settings size={18}/>} label="Config" />
            <IconButton onClick={() => setIsHelpOpen(true)} icon={<HelpCircle size={18}/>} label="Help" />
            <IconButton onClick={() => setIsAboutOpen(true)} icon={<Info size={18}/>} label="About" />
            <div className="w-px h-6 bg-slate-800 mx-2"></div>
            <div className="flex items-center gap-3">
              <span className={cn("w-4 h-4 rounded-full animate-pulse", activeController?.status === 'online' ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-rose-500 shadow-[0_0_10px_#f43f5e]")} />
              <span className={cn("tracking-widest font-bold text-xs uppercase", activeController?.status === 'online' ? "text-emerald-400" : "text-rose-400")}>{activeController?.status === 'online' ? 'System Online' : 'System Offline'}</span>
            </div>
            <select value={activeControllerId} onChange={(e) => setActiveControllerId(e.target.value)} className="ml-4 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-sky-400 outline-none appearance-none cursor-pointer hover:border-sky-500 transition-all shadow-inner">
              {controllers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.ip})</option>)}
            </select>
          </div>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        {!hideUI && (
          <nav className={cn("shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col gap-1 z-10 transition-all duration-300", isSidebarOpen ? "w-64 p-4" : "w-0 p-0 opacity-0 overflow-hidden border-none")}>

             {currentMenu === 'root' && (
               <div className="flex flex-col h-full animate-in slide-in-from-left-4 duration-300 overflow-hidden">
                  <NavItem icon={<Activity size={18} />} label="OVERVIEW" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />

                  <div className="mt-6 mb-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-slate-800/50 pb-1 shrink-0">Networked Robots</div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1 min-h-0">
                    {robots.map(r => (
                      <button key={r.id} onClick={() => { setSelectedRobotId(r.id); setActiveTab('robot'); }} className={cn("flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all group shrink-0", activeTab === 'robot' && selectedRobotId === r.id ? "bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-2xl" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")}>
                        <div className="flex items-center gap-3 truncate">
                          <div className={cn("w-2 h-2 rounded-full shrink-0 shadow-[0_0_5px_currentColor]", r.online ? "bg-emerald-500" : "bg-slate-700")} />
                          <span className="font-bold tracking-tight">{r.name}</span>
                        </div>
                        <span className="text-[8px] uppercase font-black opacity-30">{r.model.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-12 mb-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-slate-800/50 pb-1 shrink-0">Resources</div>
                  <div className="flex flex-col gap-1 pb-4 shrink-0">
                    <button onClick={() => setNavStack(['industrial'])} className="flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-all">
                      <div className="flex items-center gap-4"><Layers size={18} /> Industrial</div>
                      <ChevronRight size={14} />
                    </button>
                    <button onClick={() => setNavStack(['urtc'])} className="flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-all">
                      <div className="flex items-center gap-4"><Server size={18} /> URTC</div>
                      <ChevronRight size={14} />
                    </button>
                    <button onClick={() => setNavStack(['hydraumc'])} className="flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-all">
                      <div className="flex items-center gap-4"><Cpu size={18} /> HYDRA-UMC</div>
                      <ChevronRight size={14} />
                    </button>
                    <NavItem icon={<Video size={18} />} label="VISION CENTER" active={activeTab === 'cameras'} onClick={() => setActiveTab('cameras')} className="mt-2 font-black text-[10px]" />
                  </div>
               </div>
             )}

             {currentMenu === 'industrial' && (
               <div className="flex flex-col gap-1 animate-in slide-in-from-right-4 duration-300">
                  <button onClick={() => setNavStack([])} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-sky-500 uppercase tracking-widest mb-4 hover:text-sky-400 transition-colors"><ArrowLeft size={14}/> Back to Root</button>
                  {['XY Table', 'ATC Tools', 'Rack', 'PickAndPlace', 'CNC', 'Laser', 'VacuumTable', 'HeatedBed'].map(m => (
                    <button key={m} onClick={() => setActiveTab(m.toLowerCase().replace(" ",""))} className={cn("text-left text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all", activeTab === m.toLowerCase().replace(" ","") ? "bg-sky-500 text-slate-950 shadow-lg" : "text-slate-400 hover:bg-slate-800")}>{m}</button>
                  ))}
               </div>
             )}

             {currentMenu === 'urtc' && (
               <div className="flex flex-col gap-1 animate-in slide-in-from-right-4 duration-300">
                  <button onClick={() => setNavStack([])} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-sky-500 uppercase tracking-widest mb-4 hover:text-sky-400 transition-colors"><ArrowLeft size={14}/> Back to Root</button>
                  <button onClick={() => setActiveTab('flasher')} className={cn("text-left text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all", activeTab === 'flasher' ? "bg-sky-500 text-slate-950 shadow-lg" : "text-slate-400 hover:bg-slate-800")}>Flasher Studio</button>
                  <button onClick={() => setActiveTab('tester')} className={cn("text-left text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all", activeTab === 'tester' ? "bg-sky-500 text-slate-950 shadow-lg" : "text-slate-400 hover:bg-slate-800")}>Tester Center</button>
               </div>
             )}

             {currentMenu === 'hydraumc' && (
               <div className="flex flex-col gap-1 animate-in slide-in-from-right-4 duration-300">
                  <button onClick={() => setNavStack([])} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-sky-500 uppercase tracking-widest mb-4 hover:text-sky-400 transition-colors"><ArrowLeft size={14}/> Back to Root</button>
                  <button onClick={() => setActiveTab('hydraFlasher')} className={cn("text-left text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all", activeTab === 'hydraFlasher' ? "bg-sky-500 text-slate-950 shadow-lg" : "text-slate-400 hover:bg-slate-800")}>Firmware Update</button>
                  <button onClick={() => setActiveTab('hydraTester')} className={cn("text-left text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all", activeTab === 'hydraTester' ? "bg-sky-500 text-slate-950 shadow-lg" : "text-slate-400 hover:bg-slate-800")}>Hardware Tester</button>
                  <button onClick={() => setActiveTab('kinematicBrainStage')} className={cn("text-left text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all", activeTab === 'kinematicBrainStage' ? "bg-sky-500 text-slate-950 shadow-lg" : "text-slate-400 hover:bg-slate-800")}>Kinematic Brain</button>
               </div>
             )}

          </nav>
        )}

        {/* Main Content Area */}
        <main className={cn(
            "flex-1 flex flex-col overflow-hidden backdrop-blur-sm relative transition-all duration-300",
            hideUI ? "bg-black pt-0 px-0 pb-0" : "bg-slate-950/80 pt-0 px-0 pb-0"
        )}>
          <React.Suspense fallback={<PanelLoadingFallback />}>
            <div className={cn("w-full h-full overflow-hidden flex flex-col", !hideUI && "pt-8 px-8 pb-4")}>
               {activeTab === 'overview' && !hideUI && <OverviewPanel />}
               {activeTab === 'robot' && activeRobot && <RobotDetail key={activeRobot.id} robot={activeRobot} />}
               {activeTab === 'cameras' && <CamerasView />}
               {activeTab === 'xytable' && <XYTableConfig />}
               {activeTab === 'atctools' && <ATCToolsConfig />}
               {activeTab === 'rack' && <RackConfigView />}
               {activeTab === 'pickandplace' && <PickAndPlace />}
               {activeTab === 'cnc' && <CNC />}
               {activeTab === 'laser' && <Laser />}
               {activeTab === 'vacuumtable' && <VacuumTableConfig />}
               {activeTab === 'heatedbed' && <HeatedBedConfig />}
               {activeTab === 'flasher' && <Flasher tiers={['urtcHead', 'urtcExpansion']} />}
               {activeTab === 'tester' && <Tester tiers={['urtcHead', 'urtcExpansion']} />}
               {activeTab === 'hydraFlasher' && <Flasher tiers={['kinematicBrain', 'controllerBoard']} />}
               {activeTab === 'hydraTester' && <Tester tiers={['kinematicBrain', 'controllerBoard']} />}
               {activeTab === 'kinematicBrainStage' && <KinematicBrainStage />}
            </div>
          </React.Suspense>
        </main>
      </div>

      {/* Footer */}
      {!hideUI && (
        <footer className="h-10 shrink-0 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-6 z-20 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 shadow-2xl">
          <div className="flex items-center gap-8">
             <div className="flex items-center gap-3">
                <span className="text-sky-400 font-black tracking-widest bg-sky-500/10 px-3 py-1 rounded border border-sky-500/20">{settings.serverName || "HYDRA-UMC TEST"}</span>
                <div className="w-px h-4 bg-slate-800"></div>
                <span className={cn("w-2.5 h-2.5 rounded-full", activeController?.status === 'online' ? "bg-emerald-500 shadow-[0_0_12px_#10b981]" : "bg-rose-500 shadow-[0_0_12px_#f43f5e]")} />
                <span className="text-slate-200 tracking-[0.4em]">SYSTEM MASTER HUB</span>
             </div>
             <span>{robots.filter(r => r.online).length} / {robots.length} NODES ACTIVE</span>
          </div>
          <div className="flex items-center gap-8">
            <button onClick={() => { if(confirm("EMERGENCY ABORT ALL NODES?")) robots.forEach(r => updateRobot(r.id, { online: false })); }} className="flex items-center gap-3 px-6 py-1 rounded-full bg-rose-600 text-white border border-rose-400 transition-all animate-pulse">GLOBAL E-STOP</button>
            <div className="font-mono text-sky-400">{currentTime.toLocaleTimeString()}</div>
          </div>
        </footer>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, className }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, className?: string }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-4 px-4 py-4 min-h-[56px] rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] transition-all", active ? "bg-sky-500 text-slate-950 shadow-[0_8px_20px_rgba(0,229,255,0.35)] border border-sky-300 scale-[1.02]" : "text-slate-500 hover:bg-slate-800 hover:text-sky-400", className)}>
      <div className={cn("transition-transform duration-300", active && "scale-110")}>{icon}</div>
      <span className="truncate">{label}</span>
    </button>
  );
}

function IconButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all group shadow-lg">
      <div className="text-sky-400">{icon}</div>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function OverviewPanel() {
  const { robots, updateRobot, cameras, updateCamera } = useHydraStore();

  return (
    <div className="w-full h-full flex flex-col gap-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800/50 pb-6 shrink-0 px-4">
         <h2 className="text-3xl font-black text-slate-100 flex items-center gap-4 uppercase tracking-tighter italic"><Activity size={32} className="text-emerald-500 animate-pulse" /> MICRO-FACTORY <span className="text-sky-400 font-light tracking-[0.2em]">OPERATIONS</span></h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-20 px-4 scroll-smooth">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 pt-10">
          {robots.map((r, i) => {
            const cam = cameras.find(c => c.id === r.id);
            return (
            <div key={r.id} className={cn("p-6 rounded-[2.5rem] border-2 flex flex-col gap-5 transition-all duration-700 relative overflow-hidden group", r.online ? "bg-slate-900 border-slate-700 shadow-[0_25px_60px_rgba(0,0,0,0.5)] scale-[1.02]" : "bg-slate-950/40 border-slate-800/50 opacity-40 grayscale")}>

              <div className="flex items-center justify-between relative z-10">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn("w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]", r.online ? "bg-emerald-400 shadow-[0_0_10px_#10b981]" : "bg-slate-700")} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">NODE A{r.id}</span>
                  </div>
                  <span className="font-black text-2xl text-white truncate tracking-tighter uppercase">{r.name}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); updateRobot(r.id, { online: !r.online }) }}
                  className={cn("px-6 py-3 rounded-full text-[11px] font-black tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] border-2",
                  r.online ? "bg-[#10b981] text-white border-[#34d399] hover:bg-[#059669]" : "bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500")}
                >
                  {r.online ? 'ONLINE' : 'CONNECT'}
                </button>
              </div>

              <div className="bg-black/40 backdrop-blur-xl p-5 rounded-[1.8rem] border border-white/5 space-y-2 relative z-10 shadow-inner">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500"><span>Manufacturer</span><span className="text-sky-400">{ROBOT_MANUFACTURERS[r.model] || "Generic"}</span></div>
                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500"><span>Model Ref</span><span className="text-slate-200 italic">{r.model}</span></div>
                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500"><span>URTC Tooling</span><span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">{r.tool}</span></div>
              </div>

              <div className="space-y-4 relative z-10">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">Active Intelligence Matrix</span>
                <div className="grid grid-cols-2 gap-3">
                    <ModuleRow
                      label="Vision System"
                      active={r.visionEnabled || !!r.cameraView || (cam?.connected ?? false)}
                      color="emerald"
                      description={r.visionEnabled || (cam?.connected ?? false) ? "LIVE STREAM ACTIVE" : undefined}
                      onClick={() => {
                         // Sync BOTH robot property and camera state for double safety
                         updateRobot(r.id, { visionEnabled: !r.visionEnabled });
                         if (cam) updateCamera(cam.id, { connected: !cam.connected });
                      }}
                    />
                    <ModuleRow label="XY Gantry" active={r.hasXYTable} color="amber" description={r.hasXYTable ? "QUAD-AXIS SYNC" : undefined} />
                    <ModuleRow label="ATC Tooling" active={!!r.atc} color="sky" description={r.atc ? r.atc.type.toUpperCase().replace("_"," ") : undefined} />
                    <ModuleRow label="Pick & Place" active={r.juanenPnP?.enabled || r.lumenPnP?.enabled} color="blue" description={r.juanenPnP?.enabled ? "JUANEN PNP" : (r.lumenPnP?.enabled ? "LUMEN PNP" : undefined)} />
                    <ModuleRow label="CNC Milling" active={r.juanenCNC?.enabled} color="fuchsia" description={r.juanenCNC?.enabled ? "JUANEN CNC" : undefined} />
                    <ModuleRow label="Laser Engrave" active={r.juanenLaser?.enabled} color="red" description={r.juanenLaser?.enabled ? "JUANEN LASER" : undefined} />
                    <ModuleRow label="Heated Bed" active={r.heatedBed?.enabled} color="orange" description={r.heatedBed?.enabled ? "THERMAL READY" : undefined} />
                    <ModuleRow label="Vacuum Table" active={r.vacuumTable?.enabled} color="teal" description={r.vacuumTable?.enabled ? "VACUUM ENGAGED" : undefined} />
                    <ModuleRow label="Tool Rack" active={r.rackSystem?.enabled} color="rose" description={r.rackSystem?.enabled ? "RACK LINKED" : undefined} />
                </div>
              </div>

              {r.online && (
                <div className="mt-auto grid grid-cols-3 gap-4 text-[11px] font-mono bg-black/60 p-4 rounded-2xl border border-white/5 shadow-2xl relative z-10">
                  <div className="flex flex-col items-center border-r border-white/10"><span className="text-[8px] text-slate-600 font-black mb-1 tracking-tighter">COORD X</span><span className="text-sky-400 font-black text-xs">{r.pos.x.toFixed(0)}</span></div>
                  <div className="flex flex-col items-center border-r border-white/10"><span className="text-[8px] text-slate-600 font-black mb-1 tracking-tighter">COORD Y</span><span className="text-sky-400 font-black text-xs">{r.pos.y.toFixed(0)}</span></div>
                  <div className="flex flex-col items-center"><span className="text-[8px] text-slate-600 font-black mb-1 tracking-tighter">COORD Z</span><span className="text-sky-400 font-black text-xs">{r.pos.z.toFixed(0)}</span></div>
                </div>
              )}
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}

function ModuleRow({ label, active, color, description, onClick }: { label: string, active: boolean, color: string, description?: string, onClick?: () => void }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-400/5 border-emerald-400/30 shadow-[0_0_15px_rgba(52,211,153,0.15)]",
    amber: "text-amber-400 bg-amber-400/5 border-amber-400/30 shadow-[0_0_15px_rgba(251,191,36,0.15)]",
    sky: "text-sky-400 bg-sky-400/5 border-sky-400/30 shadow-[0_0_15px_rgba(56,189,248,0.15)]",
    blue: "text-blue-400 bg-blue-400/5 border-blue-400/30 shadow-[0_0_15px_rgba(96,165,250,0.15)]",
    fuchsia: "text-fuchsia-400 bg-fuchsia-400/5 border-fuchsia-400/30 shadow-[0_0_10px_rgba(232,121,249,0.15)]",
    red: "text-red-400 bg-red-400/5 border-red-400/30 shadow-[0_0_10px_rgba(248,113,113,0.15)]",
    orange: "text-orange-400 bg-orange-400/5 border-orange-400/30 shadow-[0_0_10px_rgba(251,146,60,0.15)]",
    teal: "text-teal-400 bg-teal-400/5 border-teal-400/30 shadow-[0_0_15px_rgba(45,212,191,0.15)]",
    rose: "text-rose-400 bg-rose-400/5 border-rose-400/30 shadow-[0_0_15px_rgba(251,113,133,0.15)]",
  };
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex flex-col px-3 py-3 rounded-2xl border transition-all duration-500 min-h-[64px] justify-center",
        active ? colorMap[color] : "text-slate-800 bg-transparent border-slate-900 grayscale",
        onClick && "cursor-pointer hover:border-white/20 active:scale-95"
      )}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] font-black uppercase tracking-tighter truncate">{label}</span>
        {active ? <Zap size={10} className="fill-current animate-pulse"/> : <Power size={10} className="opacity-20"/>}
      </div>
      <div className="flex items-end overflow-hidden">
        <span className={cn("text-[7px] font-black tracking-widest leading-[1.1] transition-opacity break-words", active ? "opacity-100" : "opacity-0")}>
          {description || "READY"}
        </span>
      </div>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={cn("w-4 h-4 transition-transform", open ? "rotate-180" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
