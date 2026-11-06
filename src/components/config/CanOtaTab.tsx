// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, CAN OTA: components/config/CanOtaTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// The transport of the CAN OTA updates (switching to the real boards is confirmed by the dialog). Moved out of Config.tsx unchanged.

import { useTranslation } from 'react-i18next';
import { Cpu, Save } from 'lucide-react';
import { useSettingsStore } from '../../storeContexts';

export function CanOtaTab({ onChooseHardware }: { onChooseHardware: () => void }) {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsStore();
  return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 space-y-8 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500/20 to-transparent" />
           <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest flex items-center gap-3"><Cpu size={20}/> {t('config.can_ota')}</h3>
           <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('config.transport_layer')}</label><select
              value={settings.canOta?.transport ?? 'mock'}
              onChange={e => {
                // Switching to the real boards is confirmed; going back to the simulation is not.
                if (e.target.value === 'hardware') onChooseHardware();
                else updateSettings({ canOta: { ...(settings.canOta ?? { transport: 'mock' }), transport: 'mock' } });
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-sky-500 shadow-inner transition-all"
            ><option value="mock">{t('config.mock_sim')}</option><option value="hardware">{t('config.hw_direct')}</option></select></div>
           <div className="grid grid-cols-2 gap-8 border-t border-slate-900 pt-8">
              <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('config.kinematic_brain_fw')}</label><div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-inner"><Save size={16} className="text-slate-700"/><input className="bg-transparent border-none text-[11px] text-slate-500 font-mono w-full" value="FIRMWARE/KinematicBrain" readOnly /></div></div>
              <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('config.controller_fw')}</label><div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-inner"><Save size={16} className="text-slate-700"/><input className="bg-transparent border-none text-[11px] text-slate-500 font-mono w-full" value="FIRMWARE/ControllerBoard" readOnly /></div></div>
           </div>
        </div>
      </div>
  );
}
