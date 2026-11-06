// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, theme, language and modules: components/config/UiTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// Theme, language and which modules are visible. Moved out of Config.tsx unchanged.

import { useTranslation } from 'react-i18next';
import { setLanguage } from '../../i18n';
import { useSettingsStore } from '../../storeContexts';

/** The modules the dashboard can show, with the text of each one. */
const MODULE_OPTIONS = [
  { key: 'Vision/Cameras', labelKey: 'config.module_vision' },
  { key: 'XY Table', labelKey: 'config.module_xytable' },
  { key: 'ATC Tools', labelKey: 'config.module_atctools' },
  { key: 'Rack', labelKey: 'config.module_rack' },
  { key: 'PickAndPlace', labelKey: 'config.module_pnp' },
  { key: 'CNC', labelKey: 'config.module_cnc' },
  { key: 'Laser', labelKey: 'config.module_laser' },
  { key: 'Vacuum Table', labelKey: 'config.module_vacuum' },
  { key: 'Heated Bed', labelKey: 'config.module_heatedbed' },
] as const;

export function UiTab() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsStore();
  const moduleOptions = MODULE_OPTIONS.map(module => ({ key: module.key, label: t(module.labelKey) }));
  return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('config.visual_environment')}</h3>
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
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('config.system_localization')}</h3>
          <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-sky-400" value={settings.language} onChange={e => { updateSettings({ language: e.target.value }); void setLanguage(e.target.value); }}>
            <option value="en">{t('config.language_en')} (US)</option><option value="es">{t('config.language_es')} (ES)</option><option value="de">{t('config.language_de')} (DE)</option><option value="fr">{t('config.language_fr')} (FR)</option><option value="it">{t('config.language_it')} (IT)</option><option value="zh">{t('config.language_zh')} (ZH)</option><option value="ja">{t('config.language_ja')} (JA)</option><option value="pt">{t('config.language_pt')} (PT)</option>
          </select>
        </div>
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('config.module_visibility')}</h3>
          <div className="grid grid-cols-2 gap-3 bg-slate-950 p-6 rounded-2xl border border-slate-800">
            {moduleOptions.map(module => (
              <label key={module.key} className="flex items-center gap-3 group cursor-pointer">
                <input type="checkbox" checked={settings.visibleModules.includes(module.key)} onChange={(e) => {
                    let newModules = [...settings.visibleModules];
                    if (e.target.checked) newModules.push(module.key); else newModules = newModules.filter(m => m !== module.key);
                    updateSettings({ visibleModules: newModules });
                  }} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500" />
                <span className="text-sm text-slate-400 group-hover:text-slate-100 transition-colors">{module.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
  );
}
