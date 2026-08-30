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
// Grouped by family (the same grouping the manifests themselves already
// carry - "Vision AI Node", "Core Backend & Clients", ...) rather than one
// long flat table - the whole point of scanning ~48 repos is to see the
// ecosystem's own real shape, which a family grouping actually shows.
//
// Deliberately no start/stop controls here: no process supervisor exists
// anywhere in the ecosystem today (confirmed against server.ts - the only
// process-control route it has, POST /api/admin/restart, restarts the
// Server itself, not a sibling repo). Adding real remote start/stop is a
// separate, more sensitive piece of work, not a fake/disabled button.
// =============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Boxes, RefreshCw, Search, Circle } from 'lucide-react';
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

const STACK_COLOR: Record<string, string> = {
  python: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  node: 'text-green-400 bg-green-500/10 border-green-500/30',
  rust: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  go: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  android: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  flutter: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  'firmware-c': 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30',
};
const DEFAULT_STACK_COLOR = 'text-slate-400 bg-slate-500/10 border-slate-500/30';

function StatusBadge({ live, label }: { live: boolean | null; label: string }) {
  if (live === true) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        <Circle size={6} className="fill-emerald-400 text-emerald-400 animate-pulse" /> {label}
      </span>
    );
  }
  if (live === false) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
        <Circle size={6} className="fill-rose-400 text-rose-400" /> {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800/60 text-slate-500 border border-slate-700">
      <Circle size={6} className="fill-slate-600 text-slate-600" /> {label}
    </span>
  );
}

export function EcosystemServices() {
  const { t } = useTranslation();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<EcosystemProjectStatus[]>([]);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState<string | null>(null);

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

  const families = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(p => { if (p.family) set.add(p.family); });
    return Array.from(set).sort();
  }, [projects]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return projects.filter(p => {
      if (familyFilter && p.family !== familyFilter) return false;
      if (needle && !p.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [projects, search, familyFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, EcosystemProjectStatus[]>();
    filtered.forEach(p => {
      const key = p.family || t('ecosystem.services_no_family');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, t]);

  const summary = useMemo(() => {
    const live = projects.filter(p => p.live === true).length;
    const withService = projects.filter(p => p.live !== null).length;
    return { live, withService, total: projects.length };
  }, [projects]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
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
        <>
          {/* Summary stat strip - the "is the ecosystem healthy" answer at a
              glance, before scanning any individual card. */}
          <div className="flex gap-3 flex-wrap">
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex-1 min-w-[110px]">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.services_stat_total')}</div>
              <div className="text-2xl font-black text-slate-100 mt-0.5">{summary.total}</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex-1 min-w-[110px]">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.services_stat_live')}</div>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">{summary.live} <span className="text-sm text-slate-600 font-bold">/ {summary.withService}</span></div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex-1 min-w-[110px]">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.services_stat_families')}</div>
              <div className="text-2xl font-black text-sky-400 mt-0.5">{families.length}</div>
            </div>
          </div>

          {/* Search + family filter chips */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('ecosystem.services_search_placeholder')}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setFamilyFilter(null)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${familyFilter === null ? 'bg-sky-500/20 border border-sky-500/50 text-sky-400' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'}`}
              >
                {t('ecosystem.services_all_families')}
              </button>
              {families.map(f => (
                <button
                  key={f}
                  onClick={() => setFamilyFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${familyFilter === f ? 'bg-sky-500/20 border border-sky-500/50 text-sky-400' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Grouped cards */}
          <div className="space-y-5">
            {grouped.map(([family, items]) => (
              <div key={family} className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  {family}
                  <span className="text-slate-700 font-mono normal-case tracking-normal">({items.length})</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(p => (
                    <div key={p.name} className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl hover:border-slate-700 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-200 leading-tight">{p.name}</span>
                        <StatusBadge live={p.live} label={p.live === true ? t('ecosystem.services_live') : p.live === false ? t('ecosystem.services_dead') : t('ecosystem.services_not_a_service')} />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        {p.stack && <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${STACK_COLOR[p.stack] || DEFAULT_STACK_COLOR}`}>{p.stack}</span>}
                        {p.maturity && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase text-slate-500 bg-slate-900 border border-slate-800">{p.maturity}</span>}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono">
                        <span>{p.version ? `v${p.version}` : '—'}</span>
                        <span>{p.servicePort ? `:${p.servicePort}` : '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {grouped.length === 0 && (
              <p className="text-xs text-slate-600 bg-slate-950 border border-slate-800 rounded-lg px-4 py-8 text-center">{t('ecosystem.services_none')}</p>
            )}
          </div>
        </>
      )}

      <div className="flex items-center justify-between text-[10px] text-slate-600">
        <p className="max-w-2xl">{t('ecosystem.services_no_control_note')}</p>
        {scannedAt && <span className="font-mono shrink-0 ml-4">{t('ecosystem.services_scanned_at', { time: new Date(scannedAt).toLocaleTimeString() })}</span>}
      </div>
    </div>
  );
}
