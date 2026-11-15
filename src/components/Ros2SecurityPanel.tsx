// =============================================================================
// HYDRA-UMC STUDIO - Server Admin > Security: Ros2SecurityPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The requirement of ROS 2 security (SROS2) of the ROS 2 bridge. The switch is OFF by default. The bridge keeps it in its own configuration file
// and does not report it to the SERVER, so this screen says plainly that it cannot read or change it: switching it on only shows the lines
// to add to the file of the bridge and the environment the bridge checks at start. It never claims that the bridge is secured.
// =============================================================================
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sros2Preparation } from '../lib/ros2Security';

export function Ros2SecurityPanel() {
  const { t } = useTranslation();
  const [wanted, setWanted] = useState(false);
  const preparation = sros2Preparation(wanted);
  return (
    <div className="space-y-2" data-testid="ros2-security-panel">
      <h5 className="text-xs font-bold text-slate-200">{t('ros2Security.title')}</h5>
      <div className="text-[10px] text-slate-500">{t('ros2Security.desc')}</div>
      <p role="status" className="text-[10px] text-amber-400" data-testid="ros2-security-honest">{t('ros2Security.not_reported')}</p>
      <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
        <input type="checkbox" data-testid="ros2-security-require" checked={wanted} onChange={e => setWanted(e.target.checked)} />
        {t('ros2Security.label')}
      </label>
      <span className={`text-[10px] font-bold ${wanted ? 'text-sky-300' : 'text-slate-400'}`} data-testid="ros2-security-state">
        {wanted ? t('ros2Security.state_on') : t('ros2Security.state_off')}
      </span>
      {preparation && (
        <div className="space-y-1" data-testid="ros2-security-lines">
          <div className="text-[10px] text-slate-500">{t('ros2Security.config_title')}</div>
          <pre className="text-[10px] text-slate-300 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 overflow-x-auto" data-testid="ros2-security-config">{preparation.config}</pre>
          <div className="text-[10px] text-slate-500">{t('ros2Security.env_title')}</div>
          <pre className="text-[10px] text-slate-300 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 overflow-x-auto" data-testid="ros2-security-env">{preparation.environment.join('\n')}</pre>
        </div>
      )}
    </div>
  );
}
