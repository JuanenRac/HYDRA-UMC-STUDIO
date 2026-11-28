// =============================================================================
// HYDRA-UMC STUDIO - src/nav/ScreenChooser.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The row over a screen of the grouped menu: the robots over the robot panel, and the screens that share one entry of the menu.
import { useTranslation } from 'react-i18next';
import { cn } from '../components/robotDetail/shared';
import { setSelectedRobotId } from '../lib/selectedRobot';
import { useFleet } from '../storeContexts';
import { VIEW_TABS, entryOf } from './navModel';

const chip = (active: boolean) => cn("shrink-0 min-h-11 px-4 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors", active ? "bg-sky-500/15 border-sky-500/50 text-slate-100" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600");

type Props = { view: string; setView: (view: string) => void; selectedRobotId: number };

export function ScreenChooser({ view, setView, selectedRobotId }: Props) {
  const { t } = useTranslation();
  const { robots } = useFleet();

  if (view === 'robot') {
    return (
      <div data-testid="robot-chooser" role="group" aria-label={t('nav.pick_robot')} className="shrink-0 flex gap-2 overflow-x-auto custom-scrollbar px-8 pt-3">
        {robots.map((robot) => (
          <button key={robot.id} type="button" aria-pressed={robot.id === selectedRobotId} onClick={() => setSelectedRobotId(robot.id)} className={chip(robot.id === selectedRobotId)}>
            <span className={cn("w-2 h-2 rounded-full shrink-0", robot.online ? "bg-emerald-500" : "bg-slate-700")} />
            <span className="whitespace-nowrap">{robot.name}</span>
            <span className="text-[9px] uppercase opacity-50">{robot.model.split(" ")[0]}</span>
          </button>
        ))}
      </div>
    );
  }

  const views = entryOf(view)?.views ?? [];
  if (views.length < 2) return null;
  return (
    <div data-testid="screen-chooser" role="group" aria-label={t('nav.screens_of')} className="shrink-0 flex gap-2 overflow-x-auto px-8 pt-3">
      {views.map((item) => (
        <button key={item} type="button" aria-pressed={item === view} onClick={() => setView(item)} className={chip(item === view)}>{t(VIEW_TABS[item]!)}</button>
      ))}
    </div>
  );
}
