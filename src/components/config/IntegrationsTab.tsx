// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, integrations: components/config/IntegrationsTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// The bridges to OpenPNP, CNC, laser, ROS2 and the 3D printer, each with its connection test. Moved out of Config.tsx unchanged.

import { useTranslation } from 'react-i18next';
import { Bot, Printer } from 'lucide-react';
import { useSettingsStore } from '../../storeContexts';
import type { ConnectionTests } from '../../hooks/useConnectionTests';
import { TestConnectionButton } from './TestConnectionButton';

export function IntegrationsTab({ tests }: { tests: ConnectionTests }) {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsStore();
  const { testStates, testConnection } = tests;
  return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <p className="text-[10px] text-slate-600 leading-relaxed">{t('config.integrations_desc')}</p>
        {/* OpenPNP */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 blur-3xl" />
          <div className="flex justify-between items-center border-b border-slate-900 pb-3"><span className="font-black text-sky-400 uppercase tracking-widest text-[11px]">{t('config.openpnp_control')}</span><input type="checkbox" checked={settings.integrations?.openPnP?.enabled} onChange={e => updateSettings({ integrations: { ...settings.integrations, openPnP: { ...settings.integrations?.openPnP, enabled: e.target.checked } } })} className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-sky-500" /></div>
          <div className="grid grid-cols-2 gap-6"><div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">{t('config.server_ip')}</label><input value={settings.integrations?.openPnP?.ip} onChange={e => updateSettings({ integrations: { ...settings.integrations, openPnP: { ...settings.integrations?.openPnP, ip: e.target.value } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" /></div><div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">{t('config.port')}</label><input type="number" value={settings.integrations?.openPnP?.port} onChange={e => updateSettings({ integrations: { ...settings.integrations, openPnP: { ...settings.integrations?.openPnP, port: parseInt(e.target.value) || 0 } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" /></div></div>
          <TestConnectionButton state={testStates.openPnP || 'idle'} onTest={() => testConnection('openPnP', settings.integrations?.openPnP?.ip, settings.integrations?.openPnP?.port)} />
        </div>
        {/* CNC */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-24 h-24 bg-fuchsia-500/5 blur-3xl" />
           <div className="flex justify-between items-center border-b border-slate-900 pb-3"><span className="font-black text-fuchsia-400 uppercase tracking-widest text-[11px]">{t('config.cnc_backend')}</span><input type="checkbox" checked={settings.integrations?.cnc?.enabled} onChange={e => updateSettings({ integrations: { ...settings.integrations, cnc: { ...settings.integrations?.cnc, enabled: e.target.checked } } })} className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-fuchsia-500" /></div>
           <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">{t('config.software_type')}</label><select className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200" value={settings.integrations?.cnc?.software} onChange={e => updateSettings({ integrations: { ...settings.integrations, cnc: { ...settings.integrations?.cnc, software: e.target.value } } })}><option value="LinuxCNC">LinuxCNC</option><option value="Mach3">Mach3</option><option value="GRBL">GRBL Serial</option></select></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">{t('config.server_ip')}</label><input value={settings.integrations?.cnc?.ip} onChange={e => updateSettings({ integrations: { ...settings.integrations, cnc: { ...settings.integrations?.cnc, ip: e.target.value } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">{t('config.port')}</label><input type="number" value={settings.integrations?.cnc?.port} onChange={e => updateSettings({ integrations: { ...settings.integrations, cnc: { ...settings.integrations?.cnc, port: parseInt(e.target.value) || 0 } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" /></div>
           </div>
           <TestConnectionButton state={testStates.cnc || 'idle'} onTest={() => testConnection('cnc', settings.integrations?.cnc?.ip, settings.integrations?.cnc?.port)} />
        </div>
        {/* Laser */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-3xl" />
           <div className="flex justify-between items-center border-b border-slate-900 pb-3"><span className="font-black text-rose-500 uppercase tracking-widest text-[11px]">{t('config.laser_engine')}</span><input type="checkbox" checked={settings.integrations?.laser?.enabled} onChange={e => updateSettings({ integrations: { ...settings.integrations, laser: { ...settings.integrations?.laser, enabled: e.target.checked } } })} className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-rose-500" /></div>
           <div className="grid grid-cols-3 gap-6">
              <select className="bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200" value={settings.integrations?.laser?.software} onChange={e => updateSettings({ integrations: { ...settings.integrations, laser: { ...settings.integrations?.laser, software: e.target.value } } })}><option value="LightBurn">LightBurn</option><option value="LaserGRBL">LaserGRBL</option></select>
              <input value={settings.integrations?.laser?.ip} onChange={e => updateSettings({ integrations: { ...settings.integrations, laser: { ...settings.integrations?.laser, ip: e.target.value } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" placeholder={t('config.server_ip')} />
              <input type="number" value={settings.integrations?.laser?.port} onChange={e => updateSettings({ integrations: { ...settings.integrations, laser: { ...settings.integrations?.laser, port: parseInt(e.target.value) || 0 } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" />
           </div>
           <TestConnectionButton state={testStates.laser || 'idle'} onTest={() => testConnection('laser', settings.integrations?.laser?.ip, settings.integrations?.laser?.port)} />
        </div>
        {/* ROS2 */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-3xl" />
           <div className="flex justify-between items-center border-b border-slate-900 pb-3"><span className="font-black text-amber-400 uppercase tracking-widest text-[11px] flex items-center gap-2"><Bot size={14} /> {t('config.ros2_bridge')}</span><input type="checkbox" checked={settings.integrations?.ros2?.enabled} onChange={e => updateSettings({ integrations: { ...settings.integrations, ros2: { ...settings.integrations?.ros2, enabled: e.target.checked } } })} className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-amber-500" /></div>
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">{t('config.server_ip')}</label><input value={settings.integrations?.ros2?.ip} onChange={e => updateSettings({ integrations: { ...settings.integrations, ros2: { ...settings.integrations?.ros2, ip: e.target.value } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-600 uppercase">{t('config.port')}</label><input type="number" value={settings.integrations?.ros2?.port} onChange={e => updateSettings({ integrations: { ...settings.integrations, ros2: { ...settings.integrations?.ros2, port: parseInt(e.target.value) || 0 } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" /></div>
           </div>
           <TestConnectionButton state={testStates.ros2 || 'idle'} onTest={() => testConnection('ros2', settings.integrations?.ros2?.ip, settings.integrations?.ros2?.port)} />
        </div>
        {/* 3D Printer */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 blur-3xl" />
           <div className="flex justify-between items-center border-b border-slate-900 pb-3"><span className="font-black text-teal-400 uppercase tracking-widest text-[11px] flex items-center gap-2"><Printer size={14} /> {t('config.printer3d_bridge')}</span><input type="checkbox" checked={settings.integrations?.printer3d?.enabled} onChange={e => updateSettings({ integrations: { ...settings.integrations, printer3d: { ...settings.integrations?.printer3d, enabled: e.target.checked } } })} className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-teal-500" /></div>
           <div className="grid grid-cols-3 gap-6">
              <select className="bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200" value={settings.integrations?.printer3d?.software} onChange={e => updateSettings({ integrations: { ...settings.integrations, printer3d: { ...settings.integrations?.printer3d, software: e.target.value } } })}>
                <option value="OrcaSlicer">OrcaSlicer</option>
                <option value="Cura">Cura</option>
                <option value="PrusaSlicer">PrusaSlicer</option>
                <option value="LycheeSlicer">LycheeSlicer</option>
                <option value="BambuStudio">Bambu Studio</option>
              </select>
              <input value={settings.integrations?.printer3d?.ip} onChange={e => updateSettings({ integrations: { ...settings.integrations, printer3d: { ...settings.integrations?.printer3d, ip: e.target.value } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" placeholder={t('config.server_ip')} />
              <input type="number" value={settings.integrations?.printer3d?.port} onChange={e => updateSettings({ integrations: { ...settings.integrations, printer3d: { ...settings.integrations?.printer3d, port: parseInt(e.target.value) || 0 } } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 font-mono" />
           </div>
           <TestConnectionButton state={testStates.printer3d || 'idle'} onTest={() => testConnection('printer3d', settings.integrations?.printer3d?.ip, settings.integrations?.printer3d?.port)} />
        </div>
      </div>
  );
}
