// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, remote access: components/config/RemoteAccessTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// Which remote clients may reach this server. Moved out of Config.tsx unchanged.

import { useTranslation } from 'react-i18next';
import { Cpu, MonitorSmartphone, Smartphone, Tablet, Watch, Wifi } from 'lucide-react';
import { useSettingsStore } from '../../storeContexts';

export function RemoteAccessTab() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsStore();
  return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><Wifi size={16} /> {t('config.remote_access_tab')}</h3>
          <p className="text-[10px] text-slate-600 leading-relaxed pt-2">{t('config.remote_access_tab_desc')}</p>
        </div>
        {/* Each remote client self-identifies via the X-Hydra-Client request header (server.ts's own remoteAccessAllowed()), so these 5 can be toggled independently instead of sharing one combined switch. Watch is distinct from Android: it relays through the paired phone, which sends X-Hydra-Client: watch only for that relay - the phone's own direct access stays governed by its own toggle above. DSI added later: its own client already sent this header, this toggle (and server.ts's own recognition of "dsi") were the real missing piece. */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-2 shadow-inner">
          <div className="flex items-center justify-between"><span className="font-black text-emerald-400 uppercase text-[10px] tracking-widest flex items-center gap-2"><Cpu size={14} /> {t('config.remote_access_suite')}</span><input type="checkbox" checked={settings.remoteAccess?.suite ?? settings.remoteAccess?.enabled ?? true} onChange={(e) => updateSettings({ remoteAccess: { ...settings.remoteAccess, suite: e.target.checked } })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500" /></div>
          <p className="text-[10px] text-slate-600 leading-tight">{t('config.remote_access_suite_desc')}</p>
        </div>
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-2 shadow-inner">
          <div className="flex items-center justify-between"><span className="font-black text-emerald-400 uppercase text-[10px] tracking-widest flex items-center gap-2"><Tablet size={14} /> {t('config.remote_access_android')}</span><input type="checkbox" checked={settings.remoteAccess?.android ?? settings.remoteAccess?.enabled ?? true} onChange={(e) => updateSettings({ remoteAccess: { ...settings.remoteAccess, android: e.target.checked } })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500" /></div>
          <p className="text-[10px] text-slate-600 leading-tight">{t('config.remote_access_android_desc')}</p>
        </div>
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-2 shadow-inner">
          <div className="flex items-center justify-between"><span className="font-black text-emerald-400 uppercase text-[10px] tracking-widest flex items-center gap-2"><Smartphone size={14} /> {t('config.remote_access_ios')}</span><input type="checkbox" checked={settings.remoteAccess?.ios ?? settings.remoteAccess?.enabled ?? true} onChange={(e) => updateSettings({ remoteAccess: { ...settings.remoteAccess, ios: e.target.checked } })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500" /></div>
          <p className="text-[10px] text-slate-600 leading-tight">{t('config.remote_access_ios_desc')}</p>
        </div>
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-2 shadow-inner">
          <div className="flex items-center justify-between"><span className="font-black text-emerald-400 uppercase text-[10px] tracking-widest flex items-center gap-2"><Watch size={14} /> {t('config.remote_access_watch')}</span><input type="checkbox" checked={settings.remoteAccess?.watch ?? settings.remoteAccess?.enabled ?? true} onChange={(e) => updateSettings({ remoteAccess: { ...settings.remoteAccess, watch: e.target.checked } })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500" /></div>
          <p className="text-[10px] text-slate-600 leading-tight">{t('config.remote_access_watch_desc')}</p>
        </div>
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-2 shadow-inner">
          <div className="flex items-center justify-between"><span className="font-black text-emerald-400 uppercase text-[10px] tracking-widest flex items-center gap-2"><MonitorSmartphone size={14} /> {t('config.remote_access_dsi')}</span><input type="checkbox" checked={settings.remoteAccess?.dsi ?? settings.remoteAccess?.enabled ?? true} onChange={(e) => updateSettings({ remoteAccess: { ...settings.remoteAccess, dsi: e.target.checked } })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500" /></div>
          <p className="text-[10px] text-slate-600 leading-tight">{t('config.remote_access_dsi_desc')}</p>
        </div>
      </div>
  );
}
