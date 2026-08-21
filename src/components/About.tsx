// =============================================================================
// HYDRA-UMC STUDIO - About Dialog: About.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// Lives as its own module, separate from Dashboard.tsx, so it can evolve on
// its own without risking the rest of the shell - see
// SONNET/HYDRA-UMC-STUDIO/chat.TXT.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, Mail, LogOut } from 'lucide-react';
import { useHydraStore } from '../store';
import { apiUrl } from '../lib/apiBase';
import HydraIcon from '../assets/HYDRA_UMC_ICON.svg';

const AUTHOR_NAME = 'JuanenRac (Electro Hobby 3D)';
const AUTHOR_EMAIL = 'electrohobby3d@gmail.com';
const LICENSE_NAME = 'GNU General Public License v3.0 (GPL-3.0)';

export function About({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { authToken, logout } = useHydraStore();
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/api/hydra-info'))
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!cancelled && data?.appVersion) setVersion(String(data.appVersion));
      })
      .catch(() => {
        // Discovery disabled or server unreachable - fall back to the "unknown" placeholder below.
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[500px] max-w-full overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2"><Info className="text-sky-400" size={20} /> {t('dashboard.about_title')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">&times;</button>
        </div>
        <div className="p-6 space-y-4 text-slate-300 text-sm flex flex-col items-center">
          <img src={HydraIcon} alt="Hydra Logo" className="w-24 h-24 object-contain mb-4" />
          <h3 className="text-2xl font-bold text-slate-100 uppercase tracking-widest text-center">HYDRA<span className="text-emerald-500">-UM</span><span className="text-rose-500">C</span> <span className="text-sky-400 font-medium">Studio</span></h3>
          <p className="text-center text-slate-400 max-w-sm">{t('dashboard.about_tagline')}</p>
          <p className="text-center text-slate-500 text-xs max-w-sm leading-relaxed">{t('dashboard.about_description')}</p>

          <div className="w-full grid grid-cols-1 gap-2 pt-2 border-t border-slate-800">
            <InfoRow label={t('dashboard.about_version')} value={version || t('dashboard.no_version_short')} />
            <InfoRow label={t('dashboard.about_author')} value={AUTHOR_NAME} />
            <InfoRow
              label={t('dashboard.about_email')}
              value={<a href={`mailto:${AUTHOR_EMAIL}`} className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"><Mail size={12} />{AUTHOR_EMAIL}</a>}
            />
            <InfoRow label={t('dashboard.about_license')} value={LICENSE_NAME} />
          </div>

          {authToken && (
            <button onClick={() => { logout(); onClose(); }} className="flex items-center gap-2 text-xs text-slate-500 hover:text-rose-400 transition-colors pt-1">
              <LogOut size={12} /> {t('auth.sign_out')}
            </button>
          )}
        </div>
        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950 shrink-0">
          <button onClick={onClose} className="px-6 py-2 text-sm bg-sky-500 text-slate-950 font-bold rounded shadow-lg border border-sky-400 uppercase">Close</button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div className="w-full flex items-center justify-between px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      <span className="text-xs text-slate-200 font-mono">{value}</span>
    </div>
  );
}
