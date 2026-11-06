// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, identity: components/config/IdentityTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// The name this server broadcasts. Moved out of Config.tsx unchanged.

import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../storeContexts';

export function IdentityTab() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsStore();
  return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2">{t('config.broadcast_identity')}</h3>
        <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('config.server_name')}</label>
            <input
              value={settings.serverName || "HYDRA-UMC TEST"}
              onChange={e => updateSettings({ serverName: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 font-bold outline-none focus:border-sky-400 focus:glow-border-sky transition-all shadow-inner"
              placeholder={t('config.server_name_placeholder')}
            />
            <p className="text-[10px] text-slate-600 italic leading-relaxed">{t('config.server_name_desc')}</p>
          </div>
        </div>
      </div>
  );
}
