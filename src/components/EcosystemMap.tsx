// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Map of the ecosystem: EcosystemMap.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// One tile per project, grouped by family, coloured by what the scan and the probe of GET /api/ecosystem/status say (up, in error, down, unknown),
// with the totals on top and a search box. A project whose version differs from the one its manifest expects is marked when the health of the
// ecosystem is on (an administrator turns it on in Server Admin); without it the map shows no drift and says nothing about it. Read only.
// =============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Map as MapIcon, RefreshCw, Search } from 'lucide-react';
import { MAP_STATES, groupByFamily, loadEcosystemMap, searchProjects, stateOf, summarize, type MapProject, type MapReading, type MapState } from '../lib/ecosystemMap';
import { loadEcosystemHealth } from '../lib/ecosystemHealthApi';
import { COLOUR_CLASS, LEDGER, evidenceLabel, type LedgerEntry } from '../lib/maturityLedger';

const POLL_MS = 20000;

const STATE_STYLE: Record<MapState, string> = {
  up: 'border-emerald-500/40 text-emerald-300',
  error: 'border-amber-500/50 text-amber-300',
  down: 'border-rose-500/40 text-rose-300',
  unknown: 'border-slate-700 text-slate-400',
};
const DOT_STYLE: Record<MapState, string> = {
  up: 'bg-emerald-400',
  error: 'bg-amber-400',
  down: 'bg-rose-400',
  unknown: 'bg-slate-600',
};

const EVIDENCE_KEY = 'hydra.map.showEvidence';
// A per-viewer convenience: off unless this person turned it on; a browser without storage just shows the default.
function readShowEvidence(): boolean {
  try { return window.localStorage.getItem(EVIDENCE_KEY) === '1'; } catch { return false; }
}

function Tile({ project, drift, evidence, language, t }: { project: MapProject; drift: boolean; evidence: LedgerEntry | null; language: string; t: (key: string, options?: Record<string, unknown>) => string }) {
  const state = stateOf(project);
  return (
    <div data-testid={`map-tile-${project.name}`} className={`rounded-xl border bg-slate-900/60 p-3 ${STATE_STYLE[state]}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_STYLE[state]}`} aria-hidden />
        <span className="truncate text-xs font-bold text-slate-100" title={project.name}>{project.name.replace(/^HYDRA-UMC-/, '')}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
        <span className="font-mono">{project.version ? `v${project.version}` : '-'}</span>
        {project.servicePort !== null && <span className="font-mono">:{project.servicePort}</span>}
        {project.maturity && <span>{project.maturity}</span>}
        {project.stack && <span>{project.stack}</span>}
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider">{t(`ecosystemMap.state_${state}`)}</div>
      {drift && <div className="mt-1 text-[10px] font-bold text-amber-300" data-testid="map-drift">{t('ecosystemMap.drift')}</div>}
      {evidence && (
        <div className={`mt-1 text-[10px] ${COLOUR_CLASS[evidence.colour]}`} data-testid="map-evidence" data-evidence={evidence.evidence}>
          {evidenceLabel(LEDGER, evidence, language)}
          {evidence.gaps.length > 0 && <span className="text-slate-500"> · {t('ecosystemMap.evidence_gaps', { count: evidence.gaps.length })}</span>}
        </div>
      )}
    </div>
  );
}

export function EcosystemMap() {
  const { t, i18n } = useTranslation();
  const [showEvidence, setShowEvidence] = useState<boolean>(readShowEvidence);
  const [reading, setReading] = useState<MapReading | null>(null);
  const [failed, setFailed] = useState(false);
  const [drifting, setDrifting] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MapState | 'all'>('all');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const [map, health] = await Promise.all([loadEcosystemMap(), loadEcosystemHealth()]);
    setBusy(false);
    if (map.ok) { setReading(map.value); setFailed(false); } else setFailed(true);
    if (health.ok) setDrifting(new Set(health.value.services.filter((service) => service.drift).map((service) => service.name)));
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const projects = useMemo(() => reading?.projects ?? [], [reading]);
  const summary = useMemo(() => summarize(projects), [projects]);
  const shown = useMemo(() => searchProjects(projects, query).filter((project) => filter === 'all' || stateOf(project) === filter), [projects, query, filter]);
  const families = useMemo(() => groupByFamily(shown), [shown]);

  return (
    <div className="space-y-4 max-w-6xl" data-testid="ecosystem-map">
      <div className="flex flex-wrap items-center gap-3">
        <MapIcon size={18} className="text-sky-400" />
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">{t('ecosystemMap.title')}</h3>
        <label className="ml-auto flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <input
            type="checkbox"
            data-testid="map-evidence-toggle"
            checked={showEvidence}
            onChange={(e) => {
              setShowEvidence(e.target.checked);
              try { window.localStorage.setItem(EVIDENCE_KEY, e.target.checked ? '1' : '0'); } catch { /* the choice just is not remembered */ }
            }}
          />
          {t('ecosystemMap.evidence_show')}
        </label>
        <button onClick={() => void load()} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50">
          <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> {t('ecosystemMap.refresh')}
        </button>
      </div>
      <p className="text-[11px] text-slate-500">{t('ecosystemMap.subtitle')}</p>
      {showEvidence && <p className="text-[11px] text-slate-500">{t('ecosystemMap.evidence_hint')}</p>}

      {failed && <div className="rounded-lg border border-rose-500/40 p-3 text-xs text-rose-300" data-testid="map-error">{t('ecosystemMap.load_error')}</div>}
      {reading && !reading.available && <div className="rounded-lg border border-amber-500/40 p-3 text-xs text-amber-300">{t('ecosystemMap.not_available')}</div>}

      {reading && (
        <>
          <div className="flex flex-wrap items-center gap-2" data-testid="map-summary">
            <button onClick={() => setFilter('all')} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${filter === 'all' ? 'border-sky-500 text-sky-300' : 'border-slate-700 text-slate-400'}`}>
              {t('ecosystemMap.all')} {summary.total}
            </button>
            {MAP_STATES.map((state) => (
              <button key={state} onClick={() => setFilter(filter === state ? 'all' : state)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${filter === state ? 'border-sky-500' : 'border-slate-700'} ${STATE_STYLE[state].split(' ')[1]}`}>
                <span className={`h-2 w-2 rounded-full ${DOT_STYLE[state]}`} aria-hidden /> {t(`ecosystemMap.state_${state}`)} {summary[state]}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300">
              <Search size={14} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('ecosystemMap.search')} className="bg-transparent outline-none placeholder:text-slate-600" data-testid="map-search" />
            </label>
          </div>

          {families.length === 0 && <div className="text-xs text-slate-500">{t('ecosystemMap.empty')}</div>}
          {families.map((group) => (
            <section key={group.family ?? ''} className="space-y-2" data-testid="map-family">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{group.family ?? t('ecosystemMap.family_other')} · {group.projects.length}</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {group.projects.map((project) => <Tile key={project.name} project={project} drift={drifting.has(project.name)} evidence={showEvidence ? LEDGER.entries.get(project.name) ?? null : null} language={i18n.language} t={t} />)}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
