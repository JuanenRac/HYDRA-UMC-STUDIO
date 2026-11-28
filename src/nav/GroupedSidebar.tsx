// =============================================================================
// HYDRA-UMC STUDIO - src/nav/GroupedSidebar.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The side menu: every screen in one list, in groups that fold. Nothing is entered and left. Administration is offered to administrators.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity, BarChart3, Bot, Boxes, Brain, CalendarRange, Camera, CircuitBoard, ClipboardCheck, Cog, Cpu, Film, Flame, Gauge, HeartPulse,
  Library, Map as MapIcon, Move, Plug, ScrollText, Server, ShieldCheck, Sparkles, Wind, Wrench, Zap, ChevronDown, ChevronRight, ArrowLeftRight, type LucideIcon,
} from 'lucide-react';
import { cn } from '../components/robotDetail/shared';
import { useSession } from '../storeContexts';
import { useActiveTour } from '../tour/tourStore';
import { MENU, NAV_GROUPS, entryOf, type NavGroup, type ViewId } from './navModel';
import { defaultClosedGroups, readClosedGroups, writeClosedGroups } from './closedGroups';

const ICONS: Record<string, LucideIcon> = {
  overview: Activity, robot: Bot, cameras: Camera, cameraMedia: Film,
  pickandplace: ArrowLeftRight, cnc: Cog, laser: Zap,
  robots: Library, xytable: Move, atctools: Wrench, rack: Boxes, vacuumtable: Wind, heatedbed: Flame,
  hydraFlasher: CircuitBoard, hydraTester: ClipboardCheck, kinematicBrainStage: Cpu, flasher: CircuitBoard, tester: ClipboardCheck,
  ecosystemServices: Sparkles, ecosystemMap: MapIcon, ecosystemHealth: HeartPulse, ecosystemPlanning: CalendarRange, ecosystemTelemetry: BarChart3, aiFamilyStatus: Brain,
  adminClients: Plug, adminLogs: ScrollText, adminSafety: ShieldCheck, adminServer: Server, settings: Gauge,
};

type Props = {
  open: boolean;
  view: string;
  /** Opens a screen ("settings" is the configuration). */
  go: (view: ViewId) => void;
};

export function GroupedSidebar({ open, view, go }: Props) {
  const { t } = useTranslation();
  const { isAdmin } = useSession();
  const touring = useActiveTour() !== null;
  const groups = NAV_GROUPS.filter((group) => group !== 'admin' || isAdmin);
  const current = entryOf(view)?.group;
  const [closed, setClosed] = useState<NavGroup[]>(() => readClosedGroups()
    ?? defaultClosedGroups(window.innerHeight, groups.map((group) => ({ group, entries: MENU.filter((item) => item.group === group).length })), current));
  // opening a screen (from a tour, the assistant or a link inside a panel) opens its group
  const [shown, setShown] = useState(view);
  if (shown !== view) {
    setShown(view);
    if (current && closed.includes(current)) setClosed(closed.filter((group) => group !== current));
  }
  const toggle = (group: NavGroup) => {
    const next = closed.includes(group) ? closed.filter((item) => item !== group) : [...closed, group];
    setClosed(next);
    writeClosedGroups(next);
  };

  return (
    <nav data-tour="sidebar" aria-label={t('nav.menu')} className={cn("shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col z-10 transition-all duration-300 overflow-y-auto custom-scrollbar", open ? "w-64 p-2" : "w-0 p-0 opacity-0 overflow-hidden border-none")}>
      {groups.map((group) => {
        // the tours light up entries of the first group: it stays open while one runs
        const unfolded = !closed.includes(group) || (touring && group === 'operate');
        return (
          <section key={group} className="shrink-0">
            <button type="button" data-nav-group={group} aria-expanded={unfolded} onClick={() => toggle(group)} className="w-full h-9 flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 hover:text-slate-300">
              {unfolded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="truncate">{t(`nav.group_${group}`)}</span>
            </button>
            {unfolded && MENU.filter((item) => item.group === group).map((item) => {
              const Icon = ICONS[item.id]!;
              const active = (item.views as readonly string[]).includes(view);
              return (
                <button key={item.id} type="button" data-nav={item.id} data-tour={item.tour} aria-current={active ? 'page' : undefined}
                  onClick={() => { if (!active) go(item.views[0]!); }}
                  className={cn("w-full min-h-11 flex items-center gap-3 px-3 rounded-xl border text-left text-sm font-semibold transition-colors", active ? "bg-sky-500 border-sky-300 text-slate-950" : "border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200")}>
                  <Icon size={16} className={cn("shrink-0", active ? "text-slate-950" : "text-sky-500/80")} />
                  <span className="truncate">{t(item.label)}</span>
                </button>
              );
            })}
          </section>
        );
      })}
    </nav>
  );
}
