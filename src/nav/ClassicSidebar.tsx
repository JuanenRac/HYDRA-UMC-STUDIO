// =============================================================================
// HYDRA-UMC STUDIO - src/nav/ClassicSidebar.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The classic side menu: a root level and three submenus that are entered and left.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, ArrowLeft, ChevronRight, Cpu, Layers, Server, Video } from 'lucide-react';
import { cn } from '../components/robotDetail/shared';
import { setSelectedRobotId } from '../lib/selectedRobot';
import { useFleet, useSession } from '../storeContexts';

// Real display-only labels for the Industrial submenu below - the array
// items themselves (PickAndPlace/VacuumTable/HeatedBed) stay unchanged
// since `activeTab` is derived from them (m.toLowerCase().replace(" ",
// "")) and matched literally elsewhere (e.g. `activeTab === 'pickandplace'`);
// only what's actually RENDERED in the button changes. The button's own
// `uppercase` CSS class already renders any label in caps with no
// visible word separation for a no-space string - "PickAndPlace" reads
// as "PICKANDPLACE" - a real readability bug the space/ampersand here fixes.
const INDUSTRIAL_MENU_LABELS: Record<string, string> = {
  PickAndPlace: 'Pick & Place',
  VacuumTable: 'Vacuum Table',
  HeatedBed: 'Heated Bed',
};

const itemClass = (active: boolean) => cn("text-left text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all", active ? "bg-sky-500 text-slate-950 shadow-lg" : "text-slate-400 hover:bg-slate-800");

type Props = {
  open: boolean;
  view: string;
  setView: (view: string) => void;
  selectedRobotId: number;
};

export function ClassicSidebar({ open, view, setView, selectedRobotId }: Props) {
  const { t } = useTranslation();
  const { isAdmin } = useSession();
  const { robots } = useFleet();
  const [menu, setMenu] = useState<'root' | 'industrial' | 'urtc' | 'hydraumc'>('root');

  const item = (target: string, label: string) => (
    <button onClick={() => setView(target)} className={itemClass(view === target)}>{label}</button>
  );
  const back = (
    <button onClick={() => setMenu('root')} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-sky-500 uppercase tracking-widest mb-4 hover:text-sky-400 transition-colors"><ArrowLeft size={14}/> {t('dashboard.back_to_root')}</button>
  );

  return (
    <nav data-tour="sidebar" className={cn("shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col gap-1 z-10 transition-all duration-300", open ? "w-64 p-4" : "w-0 p-0 opacity-0 overflow-hidden border-none")}>

      {menu === 'root' && (
        <div className="flex flex-col h-full animate-in slide-in-from-left-4 duration-300 overflow-hidden">
          <NavItem icon={<Activity size={18} />} label={t('dashboard.overview')} active={view === 'overview'} onClick={() => setView('overview')} tour="nav-overview" />

          <div className="mt-6 mb-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-slate-800/50 pb-1 shrink-0">{t('dashboard.networked_robots')}</div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1 min-h-0">
            {robots.map(r => (
              <button key={r.id} onClick={() => { setSelectedRobotId(r.id); setView('robot'); }} className={cn("flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all group shrink-0", view === 'robot' && selectedRobotId === r.id ? "bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-2xl" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")}>
                <div className="flex items-center gap-3 truncate">
                  <div className={cn("w-2 h-2 rounded-full shrink-0 shadow-[0_0_5px_currentColor]", r.online ? "bg-emerald-500" : "bg-slate-700")} />
                  <span className="font-bold tracking-tight">{r.name}</span>
                </div>
                <span className="text-[8px] uppercase font-black opacity-30">{r.model.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          <div className="mt-12 mb-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-slate-800/50 pb-1 shrink-0">{t('dashboard.resources')}</div>
          <div className="flex flex-col gap-1 pb-4 shrink-0">
            <button onClick={() => setMenu('industrial')} className="flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-all">
              <div className="flex items-center gap-4"><Layers size={18} /> {t('dashboard.industrial')}</div>
              <ChevronRight size={14} />
            </button>
            <button onClick={() => setMenu('urtc')} className="flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-all">
              <div className="flex items-center gap-4"><Server size={18} /> URTC</div>
              <ChevronRight size={14} />
            </button>
            <button onClick={() => setMenu('hydraumc')} className="flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-all">
              <div className="flex items-center gap-4"><Cpu size={18} /> HYDRA-UMC</div>
              <ChevronRight size={14} />
            </button>
            <NavItem icon={<Video size={18} />} label={t('common.vision_center')} active={view === 'cameras'} onClick={() => setView('cameras')} tour="nav-cameras" className="mt-2 font-black text-[10px]" />
          </div>
        </div>
      )}

      {menu === 'industrial' && (
        <div className="flex flex-col gap-1 animate-in slide-in-from-right-4 duration-300">
          {back}
          {['Robots', 'XY Table', 'ATC Tools', 'Rack', 'PickAndPlace', 'CNC', 'Laser', 'VacuumTable', 'HeatedBed'].map(m => (
            <button key={m} onClick={() => setView(m.toLowerCase().replace(" ",""))} className={itemClass(view === m.toLowerCase().replace(" ",""))}>{INDUSTRIAL_MENU_LABELS[m] ?? m}</button>
          ))}
        </div>
      )}

      {menu === 'urtc' && (
        <div className="flex flex-col gap-1 animate-in slide-in-from-right-4 duration-300">
          {back}
          {item('flasher', t('dashboard.flasher_studio'))}
          {item('tester', t('dashboard.tester_center'))}
        </div>
      )}

      {menu === 'hydraumc' && (
        <div className="flex flex-col gap-1 animate-in slide-in-from-right-4 duration-300">
          {back}
          {item('hydraFlasher', t('dashboard.firmware_update'))}
          {item('hydraTester', t('dashboard.hardware_tester'))}
          {item('kinematicBrainStage', t('dashboard.kinematic_brain'))}
          {item('cameraMedia', t('cameraMedia.menu_label', 'Camera Media'))}

          <div className="mt-6 mb-2 px-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] border-b border-slate-800/50 pb-1">{t('ecosystem.menu_section')}</div>
          {item('ecosystemServices', t('common.services'))}
          {item('ecosystemMap', t('ecosystem.menu_map'))}
          {item('ecosystemHealth', t('ecosystem.menu_health'))}
          {item('ecosystemPlanning', t('ecosystem.planning_menu'))}
          {item('ecosystemTelemetry', t('common.telemetry'))}
          {item('aiFamilyStatus', t('ecosystem.menu_ai_family'))}
          {item('aiDashboard', t('ecosystem.menu_ai_dashboard'))}
          {isAdmin && <>
            {item('adminClients', t('ecosystem.menu_clients'))}
            {item('adminLogs', t('ecosystem.menu_logs'))}
            {item('adminServer', t('ecosystem.menu_admin'))}
            {item('adminSafety', t('ecosystem.menu_safety'))}
            {item('adminAudit', t('ecosystem.menu_audit'))}
            {item('systemSupervisor', t('ecosystem.menu_supervisor', 'Supervisor'))}
          </>}
        </div>
      )}

    </nav>
  );
}

function NavItem({ icon, label, active, onClick, className, tour }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, className?: string, tour?: string }) {
  return (
    <button onClick={onClick} data-tour={tour} className={cn("flex items-center gap-4 px-4 py-4 min-h-[56px] rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] transition-all", active ? "bg-sky-500 text-slate-950 shadow-[0_8px_20px_rgba(0,229,255,0.35)] border border-sky-300 scale-[1.02]" : "text-slate-500 hover:bg-slate-800 hover:text-sky-400", className)}>
      <div className={cn("transition-transform duration-300", active && "scale-110")}>{icon}</div>
      <span className="truncate">{label}</span>
    </button>
  );
}
