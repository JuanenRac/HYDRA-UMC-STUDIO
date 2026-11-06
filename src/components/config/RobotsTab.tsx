// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, robot names: components/config/RobotsTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// The names of the robots of the active controller. Moved out of Config.tsx unchanged.

import { useTranslation } from 'react-i18next';
import { Edit2 } from 'lucide-react';
import { useFleet } from '../../storeContexts';

export function RobotsTab() {
  const { t } = useTranslation();
  const { activeController, updateRobot } = useFleet();
  return (
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
  );
}
