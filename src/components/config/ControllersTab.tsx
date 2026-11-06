// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, controllers: components/config/ControllersTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// The controller nodes and the CAN data bitrate. Moved out of Config.tsx unchanged.

import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { createDefaultRobots, createDefaultCameras } from '../../store';
import { useFleet, useServerStatus } from '../../storeContexts';
import { cn } from '../robotDetail/shared';

export function ControllersTab() {
  const { t } = useTranslation();
  const { serverReachable } = useServerStatus();
  const { controllers, activeController, activeControllerId, updateController, addController, removeController } = useFleet();
  return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('config.controller_management')}</h3>
        <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr><th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('config.node_name')}</th><th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('config.ip_address')}</th><th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('config.status')}</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {controllers.map(c => {
                // The `status` cell is not the saved c.status (a config value with no live check behind it): this app holds one live connection at a time (to the
                // active controller), so that is the one row with a real signal (serverReachable); every other listed node is unverified from here and says so
                // rather than showing a stale/fixture pill.
                const isActiveRow = c.id === activeControllerId;
                const knownOnline = isActiveRow && serverReachable;
                return (
                <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors">
                  <td className="px-4 py-3"><input value={c.name} onChange={e => updateController(c.id, { name: e.target.value })} className="bg-transparent outline-none w-full text-slate-200 font-bold" /></td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400"><input value={c.ip} onChange={e => updateController(c.id, { ip: e.target.value })} className="bg-transparent outline-none w-full" /></td>
                  <td className="px-4 py-3">
                    {isActiveRow ? (
                      <span className={cn("px-2 py-1 rounded text-[10px] font-black uppercase", knownOnline ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>{knownOnline ? t('config.online') : t('config.offline')}</span>
                    ) : (
                      <span className="px-2 py-1 rounded text-[10px] font-black uppercase bg-slate-700/40 text-slate-400" title={t('config.not_active_connection')}>{t('config.unverified')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right"><button onClick={() => removeController(c.id)} className="text-slate-600 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button></td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button onClick={() => addController({ id: 'new-' + Date.now(), name: 'New Controller', ip: '192.168.1.xxx', status: 'offline', fdcanBaudrate: 1000, fdcanDataBaudrate: 5000, robots: createDefaultRobots(), cameras: createDefaultCameras() })} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-sky-400 rounded-lg border border-slate-700 text-xs font-bold uppercase hover:bg-slate-700"><Plus size={14}/> {t('config.add_node')}</button>

        <div className="pt-6 grid grid-cols-2 gap-4 border-t border-slate-800/50">
           <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('config.fdcan_protocol')}</label><select defaultValue="fdcan" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-sky-500"><option value="classic">{t('config.classic_can')} (2.0)</option><option value="fdcan">{t('config.fdcan_iso')}</option></select></div>
           <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('config.data_phase_bitrate')}</label><select
             value={activeController.fdcanDataBaudrate}
             onChange={e => updateController(activeController.id, { fdcanDataBaudrate: Number(e.target.value) })}
             className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none focus:border-sky-500"
           >
             {[500, 1000, 2000, 4000, 5000, 8000, 10000].map(kbps => (
               <option key={kbps} value={kbps}>{kbps >= 1000 ? `${kbps / 1000} Mbps` : `${kbps} kbps`}</option>
             ))}
           </select></div>
        </div>
      </div>
  );
}
