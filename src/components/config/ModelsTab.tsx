// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, custom models: components/config/ModelsTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// Custom robot models and the submissions of the model editor. Moved out of Config.tsx unchanged.

import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { SubmittedModels } from '../SubmittedModels';
import { useSettingsStore } from '../../storeContexts';

export function ModelsTab() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsStore();
  return (
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
              <input type="checkbox" checked={settings.modelSubmissions?.enabled ?? false} onChange={(e) => updateSettings({ modelSubmissions: { ...settings.modelSubmissions, enabled: e.target.checked, destinationFolder: settings.modelSubmissions?.destinationFolder ?? 'models/submitted' } })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('config.model_submissions_folder')}</label>
              <input
                value={settings.modelSubmissions?.destinationFolder ?? 'models/submitted'}
                onChange={(e) => updateSettings({ modelSubmissions: { ...settings.modelSubmissions, enabled: settings.modelSubmissions?.enabled ?? false, destinationFolder: e.target.value } })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 font-mono outline-none focus:border-emerald-400 transition-all"
                placeholder="models/submitted"
              />
              <p className="text-[10px] text-slate-600 italic leading-relaxed">{t('config.model_submissions_folder_desc')}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-400 uppercase text-[10px] tracking-widest">{t('config.model_submissions_require_attribution')}</span>
                <input type="checkbox" checked={settings.modelSubmissions?.requireAttribution ?? false} onChange={(e) => updateSettings({ modelSubmissions: { ...settings.modelSubmissions, enabled: settings.modelSubmissions?.enabled ?? false, destinationFolder: settings.modelSubmissions?.destinationFolder ?? 'models/submitted', requireAttribution: e.target.checked } })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500" />
              </div>
              <p className="text-[10px] text-slate-600 italic leading-relaxed">{t('config.model_submissions_require_attribution_desc')}</p>
            </div>
          </div>
        </div>

        <SubmittedModels />
      </div>
  );
}
