// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, work paths: components/config/PathsTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// The folder of the Works of each robot. Moved out of Config.tsx unchanged.

import { useTranslation } from 'react-i18next';
import { FolderOpen } from 'lucide-react';
import { useFleet, useSettingsStore } from '../../storeContexts';

export function PathsTab() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsStore();
  const { activeController } = useFleet();
  return (
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
  );
}
