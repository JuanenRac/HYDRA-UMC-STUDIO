// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Services Panel: EcosystemServices.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// STUDIO's own view of GET /api/ecosystem/status (server.ts's own
// getEcosystemStatus() - see that function's header comment for exactly
// what this is and isn't: a real manifest scan of every HYDRA-UMC-* repo
// checked out next to the server, plus a real TCP/HTTP live probe for
// whichever ones opt in with a `service` block in their own manifest).
// No auth on this route server-side (same trust tier as /api/system/metrics
// - local directory names and manifest fields, nothing about credentials),
// so this panel is visible to every logged-in session, not just admins.
//
// Deliberately no start/stop controls here: no process supervisor exists
// anywhere in the ecosystem today (confirmed against server.ts - the only
// process-control route it has, POST /api/admin/restart, restarts the
// Server itself, not a sibling repo). Adding real remote start/stop is a
// separate, more sensitive piece of work, not a fake/disabled button.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Boxes, RefreshCw } from 'lucide-react';
import { apiUrl } from '../lib/apiBase';

interface EcosystemProjectStatus {
  name: string;
  role: string | null;
  stack: string | null;
  maturity: string | null;
  family: string | null;
  version: string | null;
  deploymentTarget: string | null;
  servicePort: number | null;
  serviceHealthPath: string | null;
  live: boolean | null;
}

export function EcosystemServices() {
  const { t } = useTranslation();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<EcosystemProjectStatus[]>([]);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/ecosystem/status'));
      const data = await res.json();
      setAvailable(!!data.available);
      setProjects(data.projects || []);
      setScannedAt(data.scannedAt || null);
      setError('');
    } catch {
      setError(t('ecosystem.services_load_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]); // eslint-disable-line -- real fetch on mount, not derived state

  const liveDot = (live: boolean | null) => (
    <span
      className={
        live === true ? 'w-2 h-2 rounded-full shrink-0 shadow-[0_0_5px_currentColor] bg-emerald-500'
        : live === false ? 'w-2 h-2 rounded-full shrink-0 shadow-[0_0_5px_currentColor] bg-rose-500'
        : 'w-2 h-2 rounded-full shrink-0 bg-slate-700'
      }
      title={live === true ? t('ecosystem.services_live') : live === false ? t('ecosystem.services_dead') : t('ecosystem.services_not_a_service')}
    />
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><Boxes size={16} /> {t('ecosystem.services_title')}</h3>
          <p className="text-[10px] text-slate-600 leading-relaxed pt-2 max-w-2xl">{t('ecosystem.services_desc')}</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sky-400 transition-colors shrink-0">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> {t('ecosystem.refresh')}
        </button>
      </div>

      {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</p>}

      {available === false && (
        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">{t('ecosystem.services_unavailable')}</p>
      )}

      {available && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.services_col_name')}</th>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.services_col_role')}</th>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.services_col_stack')}</th>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.services_col_family')}</th>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.services_col_version')}</th>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.services_col_maturity')}</th>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.services_col_port')}</th>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.services_col_status')}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.name} className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors">
                  <td className="px-4 py-3 text-slate-200 font-bold whitespace-nowrap">{p.name}</td>
                  <td className="px-4 py-3 text-slate-400">{p.role || '-'}</td>
                  <td className="px-4 py-3 text-slate-400">{p.stack || '-'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.family || '-'}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{p.version || '-'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{p.maturity || '-'}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{p.servicePort ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {liveDot(p.live)}
                      <span className="text-[10px] uppercase font-black text-slate-500">
                        {p.live === true ? t('ecosystem.services_live') : p.live === false ? t('ecosystem.services_dead') : t('ecosystem.services_not_a_service')}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-600 text-xs">{t('ecosystem.services_none')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-slate-600">
        <p className="max-w-2xl">{t('ecosystem.services_no_control_note')}</p>
        {scannedAt && <span className="font-mono shrink-0 ml-4">{t('ecosystem.services_scanned_at', { time: new Date(scannedAt).toLocaleTimeString() })}</span>}
      </div>
    </div>
  );
}
