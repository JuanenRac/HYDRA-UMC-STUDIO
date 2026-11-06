// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, AI accelerators: components/config/AiHailoTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// The Hailo devices for vision and for the cognitive node. Moved out of Config.tsx unchanged.

import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import { useSettingsStore } from '../../storeContexts';

export function AiHailoTab() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsStore();
  return (
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
  );
}
