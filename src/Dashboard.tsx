// =============================================================================
// HYDRA-UMC STUDIO - Main Dashboard Interface: Dashboard.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import HydraIcon from './assets/HYDRA_UMC_ICON.svg';
import { useHydraStore, ROBOT_MANUFACTURERS } from './store';
import { apiUrl } from './lib/apiBase';
import { ConfirmDialog } from './components/ConfirmDialog';
import type { CanOtaTier } from './lib/canOta';
import {
  Activity, Layers,
  Video, Settings, Menu, Power
, Cpu, Zap, Thermometer, RefreshCw, Server, Info, HelpCircle, ChevronRight, ArrowLeft, Wifi, Bluetooth, Cable, LogOut, type LucideIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for Tailwind class merging. */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Stable module-level references for the `tiers` prop passed to Flasher/Tester below -
// a literal `tiers={[...]}` inline in JSX would build a brand-new array every single
// Dashboard render (any state change anywhere in Dashboard, not just navigation),
// which then trips Flasher.tsx/Tester.tsx's own `useEffect(..., [tiers])` on every one
// of those renders even though the actual tier list never changes. Cheap effect body,
// but still unnecessary work on every keystroke/tick while either panel is mounted.
const URTC_TIERS: CanOtaTier[] = ['urtcHead', 'urtcExpansion'];
const HYDRA_BRAIN_TIERS: CanOtaTier[] = ['kinematicBrain', 'controllerBoard'];

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
import { About } from './components/About';
import { Config } from './components/Config';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy-loaded Panels
const RobotDetail = React.lazy(() => import('./components/RobotDetail').then(m => ({ default: m.RobotDetail })));
// Per-robot entry points (see robots/A1.tsx for the
// rationale) - Dashboard.tsx dispatches to the matching one by robot.id so
// each robot has its own file to diverge from in the future, falling back
// to the shared RobotDetail above for any robot id beyond the fixed A1-A8
// roster (defensive only - the store caps at 8 today).
const A1RobotDetail = React.lazy(() => import('./components/robots/A1'));
const A2RobotDetail = React.lazy(() => import('./components/robots/A2'));
const A3RobotDetail = React.lazy(() => import('./components/robots/A3'));
const A4RobotDetail = React.lazy(() => import('./components/robots/A4'));
const A5RobotDetail = React.lazy(() => import('./components/robots/A5'));
const A6RobotDetail = React.lazy(() => import('./components/robots/A6'));
const A7RobotDetail = React.lazy(() => import('./components/robots/A7'));
const A8RobotDetail = React.lazy(() => import('./components/robots/A8'));
// `RobotDetail` above is ALREADY a `React.lazy(...)` result, i.e. already
// `LazyExoticComponent<...>` - `React.LazyExoticComponent<typeof RobotDetail>`
// therefore double-wraps it (`LazyExoticComponent<LazyExoticComponent<...>>`),
// which doesn't match the single-wrapped A1RobotDetail..A8RobotDetail values
// actually stored below. `typeof A1RobotDetail` is the correctly-shaped type
// (identical across all 8, since every robots/A*.tsx re-exports the same
// component) without re-wrapping it a second time.
const ROBOT_DETAIL_BY_ID: Record<number, typeof A1RobotDetail> = {
  1: A1RobotDetail, 2: A2RobotDetail, 3: A3RobotDetail, 4: A4RobotDetail,
  5: A5RobotDetail, 6: A6RobotDetail, 7: A7RobotDetail, 8: A8RobotDetail,
};
const CamerasView = React.lazy(() => import('./components/CamerasView').then(m => ({ default: m.CamerasView })));
const XYTableConfig = React.lazy(() => import('./components/XYTableConfig').then(m => ({ default: m.XYTableConfig })));
const PickAndPlace = React.lazy(() => import('./components/PickAndPlace').then(m => ({ default: m.PickAndPlace })));
const CNC = React.lazy(() => import('./components/CNC').then(m => ({ default: m.CNC })));
const Laser = React.lazy(() => import('./components/Laser').then(m => ({ default: m.Laser })));
const VacuumTableConfig = React.lazy(() => import('./components/VacuumTableConfig').then(m => ({ default: m.VacuumTableConfig })));
const HeatedBedConfig = React.lazy(() => import('./components/HeatedBedConfig').then(m => ({ default: m.HeatedBedConfig })));
const ATCToolsConfig = React.lazy(() => import('./components/ATCToolsConfig').then(m => ({ default: m.ATCToolsConfig })));
const RackConfigView = React.lazy(() => import('./components/RackConfigView').then(m => ({ default: m.RackConfigView })));
const Flasher = React.lazy(() => import('./components/Flasher').then(m => ({ default: m.Flasher })));
const Tester = React.lazy(() => import('./components/Tester').then(m => ({ default: m.Tester })));
const KinematicBrainStage = React.lazy(() => import('./components/KinematicBrainStage').then(m => ({ default: m.KinematicBrainStage })));
// Ecosystem-wide panels (HYDRA-UMC menu) - visual surface for the whole
// HYDRA-UMC-* ecosystem, not just this controller's own hardware. See
// each component's own header comment for exactly which real
// HYDRA-UMC-SERVER route it talks to.
const EcosystemServices = React.lazy(() => import('./components/EcosystemServices').then(m => ({ default: m.EcosystemServices })));
const AiFamilyStatus = React.lazy(() => import('./components/AiFamilyStatus').then(m => ({ default: m.AiFamilyStatus })));
const EcosystemTelemetry = React.lazy(() => import('./components/EcosystemTelemetry').then(m => ({ default: m.EcosystemTelemetry })));
const AdminClients = React.lazy(() => import('./components/AdminClients').then(m => ({ default: m.AdminClients })));
const AdminLogs = React.lazy(() => import('./components/AdminLogs').then(m => ({ default: m.AdminLogs })));
const AdminServer = React.lazy(() => import('./components/AdminServer').then(m => ({ default: m.AdminServer })));
const SystemSupervisor = React.lazy(() => import('./components/SystemSupervisor').then(m => ({ default: m.SystemSupervisor })));

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { controllers, activeControllerId, setActiveControllerId, activeController, robots, settings, updateRobot, isAdmin, logout, serverReachable } = useHydraStore();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedRobotId, setSelectedRobotId] = useState<number>(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showEstopConfirm, setShowEstopConfirm] = useState(false);
  // Real per-corner request: shutdown/restart for this CM5's own kiosk
  // node, next to the existing global E-STOP. Same loopback-only Server
  // endpoints AuthGate.tsx's pre-login power buttons already call (see
  // that file's own comment on why they're safe unauthenticated) - here
  // they're reached from inside an already-authenticated session instead,
  // so no extra gate is needed on this side either way.
  const [showShutdownConfirm, setShowShutdownConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [powerAction, setPowerAction] = useState<'shutdown' | 'restart' | null>(null);
  const handlePower = async (action: 'shutdown' | 'restart') => {
    setPowerAction(action);
    try {
      await fetch(apiUrl(action === 'shutdown' ? '/api/system/shutdown' : '/api/system/reboot'), { method: 'POST' });
      // No finally-reset here: a successful call means this device is
      // actually going down - staying disabled/labelled until the page
      // itself loses its connection is the correct, honest state.
    } catch {
      setPowerAction(null);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [navStack, setNavStack] = useState<string[]>([]);
  const currentMenu = navStack[navStack.length - 1] || 'root';

  const hideUI = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('hideUI') === 'true';
  }, []);

  const activeRobot = robots.find(r => r.id === selectedRobotId);

  // Genuine "synchronize with an external system" effect: reads the URL's
  // own query string, localStorage and the i18n library, and mutates
  // document.body.dataset directly - real external systems the lint
  // rule's own text carves out, not the "derive local state" case it's
  // meant to catch. Reading window.location/mutating the DOM during
  // render instead would be the actual anti-pattern here.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const robotIdParam = params.get('robotId');
    if (robotIdParam) {
      const id = parseInt(robotIdParam);
      console.log(`[Industrial] Identified Remote Target: Robot A${id}`);
      setSelectedRobotId(id); // eslint-disable-line -- real external (URL) sync, not derived state
      setActiveTab('robot');
    }

    const tokenParam = params.get('token');
    if (tokenParam) {
      console.log(`[Industrial] Session Token Received from Remote`);
      localStorage.setItem('hydra_token', tokenParam);
    }

    document.body.dataset.theme = settings.theme;
    if (settings.language && i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.theme, settings.language, i18n]);

  // Real "adjust state during render" (React's own recommended
  // replacement for a derive-only effect): forcing the robot tab open
  // when `?hideUI=true` is a pure consequence of `hideUI` itself (already
  // memoized above), not a real external-system sync, so it's safe to
  // do this conditionally during render rather than in its own effect.
  if (hideUI && activeTab !== 'robot') {
    setActiveTab('robot');
  }

  return (
    <div className="w-full h-screen bg-slate-950 bg-electric-grid text-slate-200 flex flex-col font-sans overflow-hidden mx-auto touch-none relative">

      {isAboutOpen && <About onClose={() => setIsAboutOpen(false)} />}

      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}

      {isSettingsOpen && <Config onClose={() => setIsSettingsOpen(false)} />}

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
              {/* STUDIO-01: reads the real, live serverReachable signal,
                  never activeController.status - see that field's own
                  header comment in store.tsx for why. */}
              <span className={cn("w-4 h-4 rounded-full animate-pulse", serverReachable ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-rose-500 shadow-[0_0_10px_#f43f5e]")} />
              <span className={cn("tracking-widest font-bold text-xs uppercase", serverReachable ? "text-emerald-400" : "text-rose-400")}>{serverReachable ? 'System Online' : 'System Offline'}</span>
              {!serverReachable && (
                <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/40" title="No real Server connection has been confirmed yet - the robots/cameras shown are example configuration, not live telemetry.">
                  Example data
                </span>
              )}
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

                  <div className="mt-6 mb-2 px-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] border-b border-slate-800/50 pb-1">{t('ecosystem.menu_section')}</div>
                  <button onClick={() => setActiveTab('ecosystemServices')} className={cn("text-left text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all", activeTab === 'ecosystemServices' ? "bg-sky-500 text-slate-950 shadow-lg" : "text-slate-400 hover:bg-slate-800")}>{t('ecosystem.menu_services')}</button>
                  <button onClick={() => setActiveTab('ecosystemTelemetry')} className={cn("text-left text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all", activeTab === 'ecosystemTelemetry' ? "bg-sky-500 text-slate-950 shadow-lg" : "text-slate-400 hover:bg-slate-800")}>{t('ecosystem.menu_telemetry')}</button>
                  <button onClick={() => setActiveTab('aiFamilyStatus')} className={cn("text-left text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all", activeTab === 'aiFamilyStatus' ? "bg-sky-500 text-slate-950 shadow-lg" : "text-slate-400 hover:bg-slate-800")}>{t('ecosystem.menu_ai_family')}</button>
                  {isAdmin && <>
                    <button onClick={() => setActiveTab('adminClients')} className={cn("text-left text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all", activeTab === 'adminClients' ? "bg-sky-500 text-slate-950 shadow-lg" : "text-slate-400 hover:bg-slate-800")}>{t('ecosystem.menu_clients')}</button>
                    <button onClick={() => setActiveTab('adminLogs')} className={cn("text-left text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all", activeTab === 'adminLogs' ? "bg-sky-500 text-slate-950 shadow-lg" : "text-slate-400 hover:bg-slate-800")}>{t('ecosystem.menu_logs')}</button>
                    <button onClick={() => setActiveTab('adminServer')} className={cn("text-left text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all", activeTab === 'adminServer' ? "bg-sky-500 text-slate-950 shadow-lg" : "text-slate-400 hover:bg-slate-800")}>{t('ecosystem.menu_admin')}</button>
                    <button onClick={() => setActiveTab('systemSupervisor')} className={cn("text-left text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all", activeTab === 'systemSupervisor' ? "bg-sky-500 text-slate-950 shadow-lg" : "text-slate-400 hover:bg-slate-800")}>{t('ecosystem.menu_supervisor', 'Supervisor')}</button>
                  </>}
               </div>
             )}

          </nav>
        )}

        {/* Main Content Area */}
        <main className={cn(
            "flex-1 flex flex-col overflow-hidden backdrop-blur-sm relative transition-all duration-300",
            hideUI ? "bg-black pt-0 px-0 pb-0" : "bg-slate-950/80 pt-0 px-0 pb-0"
        )}>
          {/* key={activeTab}: an ErrorBoundary's own state (hasError) only
              clears on remount, not on a props change - without this key,
              switching away from a panel that crashed to any OTHER panel
              would keep showing the stale fallback forever instead of
              actually trying to render the newly-selected one. */}
          <ErrorBoundary key={activeTab}>
          <React.Suspense fallback={<PanelLoadingFallback />}>
            <div className={cn("w-full h-full overflow-hidden flex flex-col", !hideUI && "pt-8 px-8 pb-4")}>
               {activeTab === 'overview' && !hideUI && <OverviewPanel />}
               {activeTab === 'robot' && activeRobot && (() => {
                 const RobotComponent = ROBOT_DETAIL_BY_ID[activeRobot.id] || RobotDetail;
                 return <RobotComponent key={activeRobot.id} robot={activeRobot} viewportOnly={hideUI} onNavigateToRobot={(id) => { setSelectedRobotId(id); setActiveTab('robot'); }} />;
               })()}
               {activeTab === 'cameras' && <CamerasView />}
               {activeTab === 'xytable' && <XYTableConfig />}
               {activeTab === 'atctools' && <ATCToolsConfig />}
               {activeTab === 'rack' && <RackConfigView />}
               {activeTab === 'pickandplace' && <PickAndPlace />}
               {activeTab === 'cnc' && <CNC />}
               {activeTab === 'laser' && <Laser />}
               {activeTab === 'vacuumtable' && <VacuumTableConfig />}
               {activeTab === 'heatedbed' && <HeatedBedConfig />}
               {activeTab === 'flasher' && <Flasher tiers={URTC_TIERS} />}
               {activeTab === 'tester' && <Tester tiers={URTC_TIERS} />}
               {activeTab === 'hydraFlasher' && <Flasher tiers={HYDRA_BRAIN_TIERS} />}
               {activeTab === 'hydraTester' && <Tester tiers={HYDRA_BRAIN_TIERS} />}
               {activeTab === 'kinematicBrainStage' && <KinematicBrainStage />}
               {activeTab === 'ecosystemServices' && <EcosystemServices />}
               {activeTab === 'ecosystemTelemetry' && <EcosystemTelemetry />}
               {activeTab === 'aiFamilyStatus' && <AiFamilyStatus />}
               {activeTab === 'adminClients' && <AdminClients />}
               {activeTab === 'adminLogs' && <AdminLogs />}
               {activeTab === 'adminServer' && <AdminServer />}
               {activeTab === 'systemSupervisor' && <SystemSupervisor />}
            </div>
          </React.Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Footer */}
      {!hideUI && (
        <footer className="h-10 shrink-0 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-6 z-20 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 shadow-2xl overflow-x-auto">
          <div className="flex items-center gap-8 shrink-0">
             <div className="flex items-center gap-3">
                <span className="text-sky-400 font-black tracking-widest bg-sky-500/10 px-3 py-1 rounded border border-sky-500/20">{settings.serverName || "HYDRA-UMC TEST"}</span>
                <div className="w-px h-4 bg-slate-800"></div>
                <span className={cn("w-2.5 h-2.5 rounded-full", serverReachable ? "bg-emerald-500 shadow-[0_0_12px_#10b981]" : "bg-rose-500 shadow-[0_0_12px_#f43f5e]")} />
                <span className="text-slate-200 tracking-[0.4em]">{t('dashboard.system_master_hub')}</span>
             </div>
             <span>{robots.filter(r => r.online).length} / {robots.length} {t('dashboard.nodes_active')}</span>
             <SystemMetricsBar />
          </div>
          <div className="flex items-center gap-8 shrink-0">
            <button onClick={() => setShowEstopConfirm(true)} className="flex items-center gap-3 px-6 py-1 rounded-full bg-rose-600 text-white border border-rose-400 transition-all animate-pulse">{t('config.global_estop')}</button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowShutdownConfirm(true)}
                disabled={powerAction !== null}
                title={powerAction === 'shutdown' ? t('auth.shutting_down') : t('auth.shutdown')}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 hover:bg-rose-950 disabled:opacity-50 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition-colors"
              >
                <Power size={14} /> {powerAction === 'shutdown' ? t('auth.shutting_down') : t('auth.shutdown')}
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={powerAction !== null}
                title={powerAction === 'restart' ? t('auth.restarting') : t('auth.restart')}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 hover:bg-amber-950 disabled:opacity-50 text-slate-400 hover:text-amber-300 border border-slate-700 hover:border-amber-800 transition-colors"
              >
                <RefreshCw size={14} /> {powerAction === 'restart' ? t('auth.restarting') : t('auth.restart')}
              </button>
              <button
                onClick={logout}
                title={t('auth.sign_out')}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
              >
                <LogOut size={14} /> {t('auth.sign_out')}
              </button>
            </div>
            {/* Doubled per request (was inheriting the footer's own
                text-[9px]). hour12:false per request too - this CM5 runs
                on European time, 24h clock (00:20, not 12:20:02 AM),
                independent of whatever locale the browser itself reports. */}
            <div className="font-mono text-sky-400 text-[18px]">{currentTime.toLocaleTimeString([], { hour12: false })}</div>
          </div>
        </footer>
      )}
      <ConfirmDialog
        open={showEstopConfirm}
        message={t('dashboard.global_estop_confirm')}
        onConfirm={() => { robots.forEach(r => updateRobot(r.id, { online: false })); setShowEstopConfirm(false); }}
        onCancel={() => setShowEstopConfirm(false)}
      />
      <ConfirmDialog
        open={showShutdownConfirm}
        message={t('auth.confirm_shutdown')}
        onConfirm={() => { setShowShutdownConfirm(false); handlePower('shutdown'); }}
        onCancel={() => setShowShutdownConfirm(false)}
      />
      <ConfirmDialog
        open={showResetConfirm}
        message={t('auth.confirm_restart')}
        onConfirm={() => { setShowResetConfirm(false); handlePower('restart'); }}
        onCancel={() => setShowResetConfirm(false)}
      />
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
  const { t } = useTranslation();
  const { robots, updateRobot, cameras, updateCamera } = useHydraStore();

  return (
    <div className="w-full h-full flex flex-col gap-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800/50 pb-6 shrink-0 px-4">
         <h2 className="text-3xl font-black text-slate-100 flex items-center gap-4 uppercase tracking-tighter italic"><Activity size={32} className="text-emerald-500 animate-pulse" /> {t('dashboard.micro_factory_ops')} <span className="text-sky-400 font-light tracking-[0.2em]">{t('dashboard.operations')}</span></h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-20 px-4 scroll-smooth">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 pt-10">
          {robots.map((r) => {
            // assignedRobotId, NOT c.id === r.id - Config.tsx lets the owner
            // reassign which robot a camera actually serves, and matching by
            // the camera's own id only worked by coincidence for whichever
            // cameras still happen to sit at their seed-default assignment
            // (camera N -> robot AN). Reported symptom this fixes: "cameras
            // 1&2 don't behave like 3-8" - those were the ones actually
            // reassigned, so this card's vision toggle silently looked up
            // nothing/the wrong camera for them.
            const cam = cameras.find(c => c.assignedRobotId === r.id);
            // combinedWith is only ever stored on the robot that INITIATED the combine
            // (RobotDetail.tsx's "Combine with Robot" checkbox writes to the LEADER robot
            // whose Config tab is open, never to the follower's own side) - shown only on
            // the FOLLOWER side here by design (the leader itself shows nothing, only
            // "Robot A2"/"Robot A3" each show "Combined With: Robot A1"), by scanning every
            // OTHER robot's combinedWith for this robot's id - resolved by id at render
            // time, not stored by name, so a rename never goes stale here.
            // Array.from(new Set()) guards a follower combined into more than one leader
            // at once from listing the same leader twice, and is also a display-layer
            // safety net in case combinedWith itself ever picks up duplicate ids - see
            // RobotDetail.tsx's combine-robot checkbox handler (which dedupes on write).
            // A saved config was once observed with the same leader id duplicated dozens
            // of times across a single robot's combinedWith array, which this guard
            // renders correctly instead of repeating the same name in the list.
            const combinedLeaders = robots.filter(other => other.id !== r.id && other.combinedWith?.includes(r.id)).map(other => other.id);
            const combinedNames = Array.from(new Set(combinedLeaders)).map(id => robots.find(o => o.id === id)?.name || `A${id}`);
            const isRunning = r.online && !!r.playbackState?.isPlaying;
            return (
            <div key={r.id} className={cn("p-6 rounded-[2.5rem] border-2 flex flex-col gap-5 transition-all duration-700 relative overflow-hidden group", r.online ? "bg-slate-900 border-slate-700 shadow-[0_25px_60px_rgba(0,0,0,0.5)] scale-[1.02]" : "bg-slate-950/40 border-slate-800/50 opacity-40 grayscale")}>

              <div className="flex items-center justify-between relative z-10">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn("w-2.5 h-2.5 rounded-full", r.online ? "bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse" : "bg-rose-600 shadow-[0_0_10px_#e11d48]")} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{t('dashboard.node')} A{r.id}</span>
                    {isRunning && <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 animate-pulse">{t('dashboard.running')}</span>}
                  </div>
                  <span className="font-black text-2xl text-white truncate tracking-tighter uppercase">{r.name}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('dashboard.role')}: <span className="text-slate-300">{r.role}</span></span>
                  {combinedNames.length > 0 && (
                    <span className="text-[9px] font-bold text-amber-400/90 uppercase tracking-widest mt-0.5">{t('dashboard.combined_with')}: {combinedNames.join(', ')}</span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); updateRobot(r.id, { online: !r.online }) }}
                  className={cn("px-6 py-3 rounded-full text-[11px] font-black tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] border-2",
                  r.online ? "bg-[#10b981] text-white border-[#34d399] hover:bg-[#059669]" : "bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500")}
                >
                  {r.online ? t('dashboard.status.online') : t('dashboard.connect')}
                </button>
              </div>

              <div className="bg-black/40 backdrop-blur-xl p-5 rounded-[1.8rem] border border-white/5 space-y-2 relative z-10 shadow-inner">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500"><span>{t('dashboard.manufacturer')}</span><span className="text-sky-400">{ROBOT_MANUFACTURERS[r.model] || "Generic"}</span></div>
                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500"><span>{t('dashboard.model_ref')}</span><span className="text-slate-200 italic">{r.model}</span></div>
                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500"><span>{t('dashboard.urtc_tooling')}</span><span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">{r.tool}</span></div>
                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500"><span>{t('dashboard.controller_fw_short')}</span><span className="text-slate-300 font-mono normal-case">{r.controllerBoard?.firmwareVersion ? `${r.controllerBoard.firmwareVersion} / ${r.controllerBoard.bootloaderVersion || t('dashboard.not_available_short')}` : t('dashboard.not_available_short')}</span></div>
                  {r.urtcHead && (
                    <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500"><span>{t('dashboard.urtc_fw_short')}</span><span className="text-slate-300 font-mono normal-case">{r.urtcHead.firmwareVersion ? `${r.urtcHead.firmwareVersion} / ${r.urtcHead.bootloaderVersion || t('dashboard.not_available_short')}` : t('dashboard.not_available_short')}</span></div>
                  )}
              </div>

              <div className="space-y-4 relative z-10">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">{t('dashboard.matrix_title')}</span>
                <div className="grid grid-cols-2 gap-3">
                    <ModuleRow
                      label={t('dashboard.mx_vision')}
                      active={r.visionEnabled || (cam?.connected ?? false)}
                      color="emerald"
                      description={r.visionEnabled || (cam?.connected ?? false) ? t('dashboard.mx_live_stream') : undefined}
                      onClick={() => {
                         // Sync BOTH robot property and camera state for double safety
                         updateRobot(r.id, { visionEnabled: !r.visionEnabled });
                         if (cam) updateCamera(cam.id, { connected: !cam.connected });
                      }}
                    />
                    <ModuleRow label={t('dashboard.mx_xygantry')} active={r.hasXYTable} color="amber" description={r.hasXYTable ? t('dashboard.mx_quad_axis') : undefined} />
                    <ModuleRow label={t('dashboard.mx_atc')} active={!!r.atc} color="sky" description={r.atc ? r.atc.type.toUpperCase().replace("_"," ") : undefined} />
                    <ModuleRow label={t('dashboard.mx_pnp')} active={r.juanenPnP?.enabled || r.lumenPnP?.enabled} color="blue" description={r.juanenPnP?.enabled ? "JUANEN PNP" : (r.lumenPnP?.enabled ? "LUMEN PNP" : undefined)} />
                    <ModuleRow label={t('dashboard.mx_cnc')} active={r.juanenCNC?.enabled} color="fuchsia" description={r.juanenCNC?.enabled ? "JUANEN CNC" : undefined} />
                    <ModuleRow label={t('dashboard.mx_laser')} active={r.juanenLaser?.enabled} color="red" description={r.juanenLaser?.enabled ? "JUANEN LASER" : undefined} />
                    <ModuleRow label={t('dashboard.mx_heatedbed')} active={r.heatedBed?.enabled} color="orange" description={r.heatedBed?.enabled ? t('dashboard.mx_thermal_ready') : undefined} />
                    <ModuleRow label={t('dashboard.mx_vacuum')} active={r.vacuumTable?.enabled} color="teal" description={r.vacuumTable?.enabled ? t('dashboard.mx_vacuum_engaged') : undefined} />
                    <ModuleRow label={t('dashboard.mx_rack')} active={r.rackSystem?.enabled} color="rose" description={r.rackSystem?.enabled ? t('dashboard.mx_rack_linked') : undefined} readyLabel={t('dashboard.mx_ready')} />
                </div>
              </div>

              {r.online && (
                <div className="mt-auto grid grid-cols-3 gap-4 text-[11px] font-mono bg-black/60 p-4 rounded-2xl border border-white/5 shadow-2xl relative z-10">
                  <div className="flex flex-col items-center border-r border-white/10"><span className="text-[8px] text-slate-600 font-black mb-1 tracking-tighter">{t('dashboard.coord_x')}</span><span className="text-sky-400 font-black text-xs">{r.pos.x.toFixed(0)}</span></div>
                  <div className="flex flex-col items-center border-r border-white/10"><span className="text-[8px] text-slate-600 font-black mb-1 tracking-tighter">{t('dashboard.coord_y')}</span><span className="text-sky-400 font-black text-xs">{r.pos.y.toFixed(0)}</span></div>
                  <div className="flex flex-col items-center"><span className="text-[8px] text-slate-600 font-black mb-1 tracking-tighter">{t('dashboard.coord_z')}</span><span className="text-sky-400 font-black text-xs">{r.pos.z.toFixed(0)}</span></div>
                </div>
              )}
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}

function ModuleRow({ label, active, color, description, onClick, readyLabel }: { label: string, active: boolean, color: string, description?: string, onClick?: () => void, readyLabel?: string }) {
  const { t } = useTranslation();
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
        "flex flex-col px-3 py-2 rounded-2xl border transition-all duration-500 min-h-[48px] justify-center gap-0.5",
        active ? colorMap[color] : "text-slate-800 bg-transparent border-slate-900 grayscale",
        onClick && "cursor-pointer hover:border-white/20 active:scale-95"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-tighter leading-tight">{label}</span>
        {active ? <Zap size={10} className="fill-current animate-pulse shrink-0"/> : <Power size={10} className="opacity-20 shrink-0"/>}
      </div>
      <div className="flex items-end">
        <span className={cn("text-[7px] font-black tracking-widest leading-[1.2] transition-opacity", active ? "opacity-100" : "opacity-0")}>
          {description || readyLabel || t('dashboard.mx_ready')}
        </span>
      </div>
    </div>
  );
}

interface SystemMetrics {
  cpu_load: number;
  memory_usage: number;
  temp: number | null;
  temp_is_real: boolean;
  rp1_temp: number | null;
  network: { wifi: boolean | null; ethernet: boolean | null; bluetooth: boolean | null };
}

/** Polls GET /api/system/metrics (server.ts) - same 5s cadence the Android app's own System Health panel uses, kept in sync deliberately. */
function SystemMetricsBar() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      fetch(apiUrl('/api/system/metrics')).then(r => r.ok ? r.json() : null).then(data => {
        if (!cancelled && data) setMetrics(data);
      }).catch(() => { /* server unreachable - keep showing the last known reading */ });
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (!metrics) return null;

  // Icon typed as the concrete LucideIcon (not React.ElementType) - with the
  // React 19 types installed here, JSX.LibraryManagedAttributes collapses
  // props like size/className to `never` for a bare React.ElementType tag
  // (it has to intersect prop types across every possible element the union
  // could resolve to), which is exactly what made `<Icon size={12}
  // className={...} />` below fail to typecheck even though all 3 real
  // callers (Wifi/Bluetooth/Cable) are plain lucide-react icons.
  const netIcon = (state: boolean | null, Icon: LucideIcon, label: string) => (
    <div className="flex items-center gap-1" title={label}>
      <Icon size={12} className={state === true ? "text-emerald-400" : state === false ? "text-rose-500" : "text-slate-700"} />
    </div>
  );

  return (
    <div className="flex items-center gap-5 pl-6 border-l border-slate-800 normal-case tracking-normal">
      <span className="flex items-center gap-1.5 text-slate-400" title={t('dashboard.cpu_temp')}>
        <Thermometer size={12} className={metrics.temp !== null && metrics.temp > 70 ? "text-rose-500" : "text-slate-500"} />
        {metrics.temp !== null ? `${metrics.temp.toFixed(0)}°C` : '—'}
      </span>
      {metrics.rp1_temp !== null && (
        <span className="flex items-center gap-1.5 text-slate-400" title={t('dashboard.rp1_temp')}>
          <Thermometer size={12} className={metrics.rp1_temp > 70 ? "text-rose-500" : "text-slate-500"} />
          {metrics.rp1_temp.toFixed(0)}°C
        </span>
      )}
      <span className="flex items-center gap-1.5 text-slate-400" title={t('dashboard.cpu_load')}>
        <Cpu size={12} className="text-slate-500" /> {metrics.cpu_load}%
      </span>
      <span className="flex items-center gap-1.5 text-slate-400" title={t('dashboard.mem_load')}>
        <Server size={12} className="text-slate-500" /> {metrics.memory_usage}%
      </span>
      <div className="flex items-center gap-2.5" title={t('dashboard.network_status')}>
        {netIcon(metrics.network?.wifi ?? null, Wifi, 'Wi-Fi')}
        {netIcon(metrics.network?.bluetooth ?? null, Bluetooth, 'Bluetooth')}
        {netIcon(metrics.network?.ethernet ?? null, Cable, 'Ethernet')}
      </div>
    </div>
  );
}

