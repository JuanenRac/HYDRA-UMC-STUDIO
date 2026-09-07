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
// Real per-project start/stop/restart (admin-only, matching this same
// gate server-side) - POST /api/ecosystem/service/:unit/:action, only
// ever reachable for a project whose manifest opts into
// service.systemd_unit (see server.ts's own route comment for the real
// security boundary: the unit is re-validated against a fresh scan, not
// trusted from the client, and requires a real, narrowly-scoped polkit
// rule installed on the host or the request answers a clean 503).
// =============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Boxes, Loader2, Play, RefreshCw, RotateCw, Search, Square, Circle } from 'lucide-react';
import { apiUrl } from '../lib/apiBase';
import { useHydraStore } from '../store';
import { ConfirmDialog } from './ConfirmDialog';

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
  serviceHost: string | null;
  systemdUnit: string | null;
  pid: number | null;
  activeState: string | null;
  subState: string | null;
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

// Real feedback from live testing: most running services on the CM5 never
// declared a TCP/HTTP service.port at all (many are CLI/library-shaped, not
// network services) - they all fell into the same "N/A" bucket as a project
// that genuinely isn't a service, indistinguishable from each other. Now a
// project can also carry real systemd ActiveState/SubState (from an opt-in
// service.systemd_unit in its own manifest) - `badgeKind` picks the LABEL
// TEXT from whichever real signal that project actually has, `live` (a
// port probe) always wins over systemd for the text when both are present
// since it's the more direct signal.
type BadgeKind = 'live' | 'dead' | 'systemd-up' | 'systemd-down' | 'error' | 'unknown';

function badgeKind(p: EcosystemProjectStatus): BadgeKind {
  // Checked first, same priority as healthColor below: a crashed unit, or
  // one that's "active" per systemd yet fails its own declared port probe,
  // is real, distinct information - never silently folded into a plain
  // Down/Stopped label just because live/activeState alone would also
  // match one of those.
  if (p.activeState === 'failed') return 'error';
  if (p.activeState === 'active' && p.live === false) return 'error';
  if (p.live === true) return 'live';
  if (p.live === false) return 'dead';
  if (p.activeState) return p.activeState === 'active' ? 'systemd-up' : 'systemd-down';
  return 'unknown';
}

// COLOR is a separate axis from the label text above - real feedback from
// live testing: green for genuinely running, red for cleanly stopped,
// amber for a real error, distinct from "stopped on purpose". systemd's
// own ActiveState already distinguishes these when a project opts into
// service.systemd_unit: "failed" IS the real error state (crashed / exited
// non-zero / exhausted its restart limit), never conflated with "inactive"
// (stopped cleanly, expected). A project whose systemd unit says "active"
// but whose OWN declared port probes down is a real contradiction worth
// flagging as an error too (the process is alive but not actually serving)
// rather than silently showing green. A project with only a port probe
// (no systemd_unit) falls back to the plain two-color live/dead reading -
// TCP alone can't distinguish "stopped" from "crashed".
type HealthColor = 'green' | 'red' | 'amber' | 'slate';

function healthColor(p: EcosystemProjectStatus): HealthColor {
  if (p.activeState === 'failed') return 'amber';
  if (p.activeState === 'active') return p.live === false ? 'amber' : 'green';
  if (p.activeState) return 'red'; // inactive/deactivating/activating under systemd control, not active
  if (p.live === true) return 'green';
  if (p.live === false) return 'red';
  return 'slate';
}

const COLOR_STYLE: Record<HealthColor, string> = {
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  red: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  slate: 'bg-slate-800/60 text-slate-500 border-slate-700',
};
const COLOR_DOT: Record<HealthColor, string> = {
  green: 'fill-emerald-400 text-emerald-400 animate-pulse',
  amber: 'fill-amber-400 text-amber-400 animate-pulse',
  red: 'fill-rose-400 text-rose-400',
  slate: 'fill-slate-600 text-slate-600',
};

// Real feedback from live testing: the version number and the Live/
// Running/Down/Stopped/N/A status used to share a single bordered badge -
// two different facts ("is it up" and "which build") crammed into one
// frame read as one fact at a glance. Split into two separate frames
// instead: the health status keeps its own color-coded border, the
// version gets its own neutral frame right below it.
function StatusBadge({ color, label, version }: { color: HealthColor; label: string; version: string | null }) {
  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div className={`px-2.5 py-1.5 rounded-lg border ${COLOR_STYLE[color]}`}>
        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
          <Circle size={6} className={COLOR_DOT[color]} /> {label}
        </span>
      </div>
      {version && (
        <div className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/60">
          <span className="text-sm font-black leading-none font-mono text-slate-300">v{version}</span>
        </div>
      )}
    </div>
  );
}

export function EcosystemServices() {
  const { t } = useTranslation();
  const { authToken, isAdmin } = useHydraStore();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<EcosystemProjectStatus[]>([]);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState<string | null>(null);
  // Real feedback from live testing: which single card's own action is
  // currently in flight (server round-trip), if any - only that one
  // card's own 3 buttons disable/spin, not the whole panel. actionError
  // is keyed by unit too, so a failed action's message stays attached to
  // the right card instead of a single global banner nobody could tell
  // which project it was actually about.
  const [actioningUnit, setActioningUnit] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ unit: string; message: string } | null>(null);
  const [confirming, setConfirming] = useState<{ unit: string; action: 'stop' | 'restart'; name: string } | null>(null);

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

  // Real POST to server.ts's own admin-gated route - see this file's own
  // header comment for the real security boundary that route enforces
  // server-side (never trusts `unit` from here beyond what a fresh scan
  // itself already found). Re-runs `load()` on success so every card's
  // pid/activeState/live reflects the real new state immediately instead
  // of waiting for whatever poll interval a future version might add.
  const runAction = useCallback(async (unit: string, action: 'start' | 'stop' | 'restart') => {
    setActioningUnit(unit);
    setActionError(null);
    try {
      const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const res = await fetch(apiUrl(`/api/ecosystem/service/${encodeURIComponent(unit)}/${action}`), {
        method: 'POST', headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError({ unit, message: data.error || `HTTP ${res.status}` });
        return;
      }
      await load();
    } catch {
      setActionError({ unit, message: t('ecosystem.services_action_error') });
    } finally {
      setActioningUnit(null);
    }
  }, [authToken, load, t]);

  const requestAction = (p: EcosystemProjectStatus, action: 'start' | 'stop' | 'restart') => {
    if (action === 'stop' || action === 'restart') {
      setConfirming({ unit: p.systemdUnit!, action, name: p.name });
      return;
    }
    runAction(p.systemdUnit!, action);
  };

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
    // Same health() function the badges use, so this strip and every
    // card's own badge can never disagree about which bucket a project is in.
    const running = projects.filter(p => healthColor(p) === 'green').length;
    const stopped = projects.filter(p => healthColor(p) === 'red').length;
    const errored = projects.filter(p => healthColor(p) === 'amber').length;
    const notApplicable = projects.filter(p => healthColor(p) === 'slate').length;
    return { live, withService, total: projects.length, running, stopped, errored, notApplicable };
  }, [projects]);

  return (
    <div className="relative h-full flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4 flex-wrap shrink-0">
        <div>
          <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><Boxes size={16} /> {t('ecosystem.services_title')}</h3>
          <p className="text-[10px] text-slate-600 leading-relaxed pt-2 max-w-2xl">{t('ecosystem.services_desc')}</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sky-400 transition-colors shrink-0">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> {t('ecosystem.refresh')}
        </button>
      </div>

      {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 shrink-0">{error}</p>}
      {available === false && (
        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 shrink-0">{t('ecosystem.services_unavailable')}</p>
      )}

      {available && (
        <>
          {/* Summary stat strip - the "is the ecosystem healthy" answer at a
              glance, before scanning any individual card. */}
          <div className="flex gap-3 flex-wrap shrink-0">
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
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex-1 min-w-[110px]">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.services_stat_running')}</div>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">{summary.running}</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex-1 min-w-[110px]">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.services_stat_stopped')}</div>
              <div className="text-2xl font-black text-rose-400 mt-0.5">{summary.stopped}</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex-1 min-w-[110px]">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.services_stat_error')}</div>
              <div className="text-2xl font-black text-amber-400 mt-0.5">{summary.errored}</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex-1 min-w-[110px]">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.services_stat_na')}</div>
              <div className="text-2xl font-black text-slate-400 mt-0.5">{summary.notApplicable}</div>
            </div>
          </div>

          {/* Search + family filter chips */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
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

          {/* Real feedback from live testing: this whole panel's own
              ancestor (Dashboard.tsx's main content area) is
              `overflow-hidden` - without its own scroll container, a
              families list taller than the visible viewport just got
              silently clipped at the bottom with no way to reach the rest.
              Only THIS region (the grouped cards) scrolls - the header/
              stats/search above stay put, same "fixed toolbar, scrolling
              body" shape as AdminLogs.tsx's own log box. */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">
            {grouped.map(([family, items]) => (
              <div key={family} className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  {family}
                  <span className="text-slate-700 font-mono normal-case tracking-normal">({items.length})</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {items.map(p => (
                    <div key={p.name} className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl hover:border-slate-700 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-200 leading-tight pt-1">{p.name}</span>
                        <StatusBadge
                          color={healthColor(p)}
                          version={p.version}
                          label={{
                            live: t('ecosystem.services_live'),
                            dead: t('ecosystem.services_dead'),
                            'systemd-up': t('ecosystem.services_running'),
                            'systemd-down': t('ecosystem.services_stopped'),
                            error: t('ecosystem.services_error'),
                            unknown: t('ecosystem.services_not_a_service'),
                          }[badgeKind(p)]}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        {p.stack && <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${STACK_COLOR[p.stack] || DEFAULT_STACK_COLOR}`}>{p.stack}</span>}
                        {p.maturity && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase text-slate-500 bg-slate-900 border border-slate-800">{p.maturity}</span>}
                      </div>
                      {/* Real feedback from live testing: wanted to see, per
                          service, whether it's up and its real local IP:port
                          and Linux PID where those apply - a TCP/HTTP probe
                          gives the first (serviceHost/servicePort), an
                          opt-in service.systemd_unit in the manifest gives
                          the second (pid) independent of whether that same
                          project exposes a port at all. Only rendered when
                          at least one is real - most cards show just one
                          line, some show both, "not a service" cards show
                          neither. */}
                      {(p.serviceHost || p.pid !== null) && (
                        <div className="flex items-center gap-1.5 flex-wrap text-[9px] font-mono text-slate-500">
                          {p.serviceHost && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">{p.serviceHost}:{p.servicePort}</span>
                          )}
                          {p.pid !== null && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">{t('ecosystem.services_pid')} {p.pid}</span>
                          )}
                        </div>
                      )}
                      {/* Real feedback from live testing: admin-only (this
                          gate is cosmetic - server.ts's own requireAdmin is
                          the real one), and only for a project that opted
                          into service.systemd_unit at all - a project with
                          neither can't be controlled through this route no
                          matter what, so no buttons that could only ever
                          404. Always shows all 3 rather than trying to
                          predict which makes sense from the last-known
                          state (systemd itself handles a redundant stop/
                          start as a harmless no-op) - simpler and never
                          wrong the instant a real state change lands
                          between this render and the click landing. */}
                      {isAdmin && p.systemdUnit && (
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-800">
                          {actioningUnit === p.systemdUnit ? (
                            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                              <Loader2 size={12} className="animate-spin" /> {t('ecosystem.services_action_pending')}
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => requestAction(p, 'start')}
                                title={t('ecosystem.services_start')}
                                className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition-colors"
                              >
                                <Play size={12} />
                              </button>
                              <button
                                onClick={() => requestAction(p, 'stop')}
                                title={t('ecosystem.services_stop')}
                                className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-colors"
                              >
                                <Square size={12} />
                              </button>
                              <button
                                onClick={() => requestAction(p, 'restart')}
                                title={t('ecosystem.services_restart')}
                                className="flex items-center justify-center w-7 h-7 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 transition-colors"
                              >
                                <RotateCw size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {actionError && actionError.unit === p.systemdUnit && (
                        <p className="text-[9px] text-rose-400 mt-2 leading-snug">{actionError.message}</p>
                      )}
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

      <div className="flex items-center justify-between text-[10px] text-slate-600 shrink-0">
        <p className="max-w-2xl">{t('ecosystem.services_no_control_note')}</p>
        {scannedAt && <span className="font-mono shrink-0 ml-4">{t('ecosystem.services_scanned_at', { time: new Date(scannedAt).toLocaleTimeString() })}</span>}
      </div>

      <ConfirmDialog
        open={confirming !== null}
        title={confirming?.action === 'stop' ? t('ecosystem.services_confirm_stop_title') : t('ecosystem.services_confirm_restart_title')}
        message={confirming ? t(
          confirming.action === 'stop' ? 'ecosystem.services_confirm_stop_message' : 'ecosystem.services_confirm_restart_message',
          { name: confirming.name },
        ) : ''}
        confirmLabel={confirming?.action === 'stop' ? t('ecosystem.services_stop') : t('ecosystem.services_restart')}
        onConfirm={() => {
          if (confirming) runAction(confirming.unit, confirming.action);
          setConfirming(null);
        }}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
