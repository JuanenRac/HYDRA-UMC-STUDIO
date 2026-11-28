// =============================================================================
// HYDRA-UMC STUDIO - src/views/OverviewView.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The start screen of the dashboard.
import { useTranslation } from 'react-i18next';
import { Activity, Power, Zap } from 'lucide-react';
import { ROBOT_MANUFACTURERS } from '../store';
import { labelWithColon } from '../lib/labelColon';
import { cn } from '../components/robotDetail/shared';
import { useFleet } from '../storeContexts';

/** The start screen: one card per robot with its module matrix. */
export function OverviewView() {
  const { t } = useTranslation();
  const { robots, updateRobot, cameras, sendRobotCommand } = useFleet();

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
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{labelWithColon(t('common.role'))} <span className="text-slate-300">{r.role}</span></span>
                  {combinedNames.length > 0 && (
                    <span className="text-[9px] font-bold text-amber-400/90 uppercase tracking-widest mt-0.5">{t('dashboard.combined_with')}: {combinedNames.join(', ')}</span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); updateRobot(r.id, { online: !r.online }) }}
                  className={cn("px-6 py-3 rounded-full text-[11px] font-black tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] border-2",
                  r.online ? "bg-[#10b981] text-white border-[#34d399] hover:bg-[#059669]" : "bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500")}
                >
                  {r.online ? t('dashboard.status.online') : t('common.connect')}
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
                         // One atomic command sets the robot's flag and its paired camera together from a single
                         // target value; toggling the two separately kept them out of step once they differed.
                         const enabled = !(r.visionEnabled || (cam?.connected ?? false));
                         sendRobotCommand(r.id, 'vision', { enabled }, () => ({ visionEnabled: enabled }));
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
