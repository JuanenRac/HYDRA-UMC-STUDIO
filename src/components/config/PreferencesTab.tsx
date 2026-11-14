// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, preferences: components/config/PreferencesTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The personal preferences of this browser: which level of the Help opens first, how dense the interface is, whether the animations
// are reduced and whether this window only listens (Listen only: no robot command but STOP). Each change is saved at once in this browser and applied to the page at once; nothing here is sent to the server and no
// preference changes what a robot does.
import { setTourPrefs, useTourPrefs } from '../../tour/tourPrefs';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal } from 'lucide-react';
import { DENSITIES, HELP_LEVELS, resetStudioPrefs, setStudioPrefs, useStudioPrefs } from '../../lib/studioPrefs';
import { currentServerOrigin } from '../../lib/listenOnlyGuard';

export function PreferencesTab() {
  const { t } = useTranslation();
  const prefs = useStudioPrefs();
  const tourPrefs = useTourPrefs();
  const server = currentServerOrigin();
  const serverOn = server !== null && prefs.listenOnlyServers.includes(server);
  const toggleServer = (on: boolean) => {
    if (server === null) return;
    const rest = prefs.listenOnlyServers.filter((origin) => origin !== server);
    setStudioPrefs({ listenOnlyServers: on ? [...rest, server] : rest });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" data-testid="preferences-tab">
      <div>
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><SlidersHorizontal size={16} /> {t('prefs.title')}</h3>
        <p className="text-[10px] text-slate-600 leading-relaxed pt-2">{t('prefs.intro')}</p>
      </div>

      <fieldset className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-2">
        <legend className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('prefs.help_level')}</legend>
        <p className="text-[10px] text-slate-500 leading-relaxed">{t('prefs.help_level_hint')}</p>
        {HELP_LEVELS.map((level) => (
          <label key={level} className="flex items-center gap-2 text-xs text-slate-300">
            <input type="radio" name="help-level" data-testid={`prefs-level-${level}`} checked={prefs.helpLevel === level} onChange={() => setStudioPrefs({ helpLevel: level })} />
            {t(`prefs.level_${level}`)}
          </label>
        ))}
      </fieldset>

      <fieldset className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-2">
        <legend className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('prefs.density')}</legend>
        {DENSITIES.map((density) => (
          <label key={density} className="flex items-center gap-2 text-xs text-slate-300">
            <input type="radio" name="density" data-testid={`prefs-density-${density}`} checked={prefs.density === density} onChange={() => setStudioPrefs({ density })} />
            {t(`prefs.density_${density}`)}
          </label>
        ))}
      </fieldset>

      <label className="flex items-start gap-3 bg-slate-950 rounded-xl border border-slate-800 p-4 text-xs text-slate-300">
        <input type="checkbox" data-testid="prefs-reduce-motion" checked={prefs.reduceMotion} onChange={(e) => setStudioPrefs({ reduceMotion: e.target.checked })} className="mt-0.5" />
        <span><strong className="block text-slate-200">{t('prefs.reduce_motion')}</strong><span className="text-[10px] text-slate-500">{t('prefs.reduce_motion_hint')}</span></span>
      </label>

      <label className="flex items-start gap-3 bg-slate-950 rounded-xl border border-slate-800 p-4 text-xs text-slate-300">
        <input type="checkbox" data-testid="prefs-tours" checked={tourPrefs.tours} onChange={(e) => setTourPrefs({ tours: e.target.checked })} className="mt-0.5" />
        <span><strong className="block text-slate-200">{t('prefs.tours')}</strong><span className="text-[10px] text-slate-500">{t('prefs.tours_hint')}</span></span>
      </label>

      <label className="flex items-start gap-3 bg-slate-950 rounded-xl border border-slate-800 p-4 text-xs text-slate-300">
        <input type="checkbox" data-testid="prefs-listen-only" checked={prefs.listenOnly} onChange={(e) => setStudioPrefs({ listenOnly: e.target.checked })} className="mt-0.5" />
        <span><strong className="block text-slate-200">{t('prefs.listen_only')}</strong><span className="text-[10px] text-slate-500">{t('prefs.listen_only_hint')}</span></span>
      </label>

      {server !== null && (
        <label className="flex items-start gap-3 bg-slate-950 rounded-xl border border-slate-800 p-4 text-xs text-slate-300">
          <input type="checkbox" data-testid="prefs-listen-only-server" checked={serverOn} disabled={prefs.listenOnly} onChange={(e) => toggleServer(e.target.checked)} className="mt-0.5" />
          <span><strong className="block text-slate-200">{t('prefs.listen_only_server', { server })}</strong><span className="text-[10px] text-slate-500">{t('prefs.listen_only_server_hint')}</span></span>
        </label>
      )}

      <div className="flex items-center justify-between">
        <span role="status" className="text-[10px] text-emerald-400">{t('prefs.saved')}</span>
        <button type="button" data-testid="prefs-reset" onClick={() => resetStudioPrefs()} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">{t('prefs.reset')}</button>
      </div>
    </div>
  );
}
