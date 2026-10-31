// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Ecosystem health: EcosystemHealth.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// One card per service of the ecosystem (state, why, the version it reports against the version expected, how long since it last
// answered), filters by state and by version drift, and notices for a TLS certificate of the server that is about to expire and for
// services that report another version than their manifest. Read from GET /api/ecosystem/health, which the server only offers once an
// administrator turned it on in Server Admin; a server that does not offer it, or an account that may not read it, gets a plain
// sentence. The screen never shows a port, address or unit: the server only sends those to administrators and none is needed here.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, HeartPulse, RefreshCw, ShieldAlert, XCircle, HelpCircle } from 'lucide-react';
import {
  SERVICE_STATES, ago, filterServices, loadEcosystemHealth, sortBySeverity,
  type EcosystemHealth as Health, type HealthResult, type HealthWarning, type ServiceState, type StateFilter,
} from '../lib/ecosystemHealthApi';

const POLL_MS = 15000;
const FILTERS: StateFilter[] = ['all', ...SERVICE_STATES, 'drift'];

const STATE_STYLE: Record<ServiceState, string> = {
  ok: 'text-emerald-400 border-emerald-500/30',
  degraded: 'text-amber-400 border-amber-500/40',
  down: 'text-rose-400 border-rose-500/40',
  unknown: 'text-slate-400 border-slate-700',
};

function StateIcon({ state }: { state: ServiceState }) {
  if (state === 'ok') return <CheckCircle2 size={16} />;
  if (state === 'degraded') return <AlertTriangle size={16} />;
  if (state === 'down') return <XCircle size={16} />;
  return <HelpCircle size={16} />;
}

export function EcosystemHealth() {
  const { t } = useTranslation();
  const [health, setHealth] = useState<Health | null>(null);
  const [problem, setProblem] = useState<HealthResult | null>(null);
  const [filter, setFilter] = useState<StateFilter>('all');
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const result = await loadEcosystemHealth();
    setBusy(false);
    if (result.ok) { setHealth(result.value); setProblem(null); return; }
    // the last good answer stays on screen while a later read fails
    setProblem(result);
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const failureText = problem && !problem.ok
    ? problem.failure === 'unsupported' ? t('ecosystemHealth.unsupported')
      : problem.failure === 'forbidden' ? t('ecosystemHealth.forbidden')
        : t('ecosystemHealth.load_error')
    : '';

  const warningText = (w: HealthWarning): string => {
    const days = health?.certificate?.daysLeft ?? 0;
    return t(`ecosystemHealth.warning_${w.code}`, { service: w.service ?? '', days });
  };

  const visible = health ? sortBySeverity(filterServices(health.services, filter)) : [];
  const cert = health?.certificate ?? null;

  return (
    <div className="space-y-4 max-w-5xl" data-testid="ecosystem-health">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest flex items-center gap-2"><HeartPulse size={16} /> {t('ecosystemHealth.title')}</h3>
          <p className="text-[10px] text-slate-600 leading-relaxed pt-2 max-w-2xl">{t('ecosystemHealth.desc')}</p>
        </div>
        <button onClick={() => void load()} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors" data-testid="health-refresh">
          <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> {t('ecosystemHealth.refresh')}
        </button>
      </div>

      {failureText && <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2" data-testid="health-problem">{failureText}</p>}
      {!health && !failureText && <p className="text-xs text-slate-500">{t('ecosystemHealth.loading')}</p>}

      {health && (
        <>
          {!health.available && <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2" data-testid="health-not-available">{t('ecosystemHealth.not_available')}</p>}

          {(cert || health.warnings.length > 0) && (
            <div className="space-y-2" data-testid="health-notices">
              {cert && (
                <p
                  className={`text-xs rounded-lg px-3 py-2 border ${cert.state === 'ok' ? 'text-slate-400 border-slate-800 bg-slate-950' : cert.state === 'expiring' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-rose-400 border-rose-500/30 bg-rose-500/10'}`}
                  data-testid="health-certificate"
                >
                  <ShieldAlert size={12} className="inline mr-1.5 -mt-0.5" />
                  {t(`ecosystemHealth.cert_${cert.state}`, { days: cert.daysLeft ?? 0, date: cert.notAfter ? cert.notAfter.slice(0, 10) : '' })}
                </p>
              )}
              {health.warnings.filter(w => !w.code.startsWith('certificate_')).map((w, i) => (
                <p key={`${w.code}-${w.service ?? ''}-${i}`} className={`text-xs rounded-lg px-3 py-2 border ${w.code === 'service_down' ? 'text-rose-400 border-rose-500/30 bg-rose-500/10' : 'text-amber-400 border-amber-500/30 bg-amber-500/10'}`} data-testid="health-warning">
                  {warningText(w)}
                </p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2" role="group" aria-label={t('ecosystemHealth.filters')}>
            {FILTERS.map(f => {
              const count = f === 'all' ? health.summary.total : f === 'drift' ? health.summary.drift : health.summary[f];
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  data-testid={`health-filter-${f}`}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-colors ${filter === f ? 'bg-sky-500 text-slate-950 border-sky-500' : 'text-slate-400 border-slate-700 hover:bg-slate-800'}`}
                >
                  {t(`ecosystemHealth.filter_${f}`)} ({count})
                </button>
              );
            })}
          </div>

          {health.services.length === 0 ? (
            <p className="text-xs text-slate-500">{t('ecosystemHealth.no_services')}</p>
          ) : visible.length === 0 ? (
            <p className="text-xs text-slate-500">{t('ecosystemHealth.no_match')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visible.map(s => {
                const heard = ago(s.lastSeen, now);
                return (
                  <div key={s.name} className={`bg-slate-950 border rounded-xl px-4 py-3 flex flex-col gap-1.5 ${STATE_STYLE[s.state]}`} data-testid="health-card" data-state={s.state}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-200 truncate">{s.name}</span>
                      <span className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-wider ${STATE_STYLE[s.state].split(' ')[0]}`}><StateIcon state={s.state} /> {t(`ecosystemHealth.state_${s.state}`)}</span>
                    </div>
                    {s.reason && <span className="text-[11px] text-slate-400">{t(`ecosystemHealth.reason_${s.reason}`)}</span>}
                    <span className="text-[10px] text-slate-500" data-testid="health-versions">
                      {t('ecosystemHealth.version_expected')}: {s.versionExpected ?? t('ecosystemHealth.version_unknown')}
                      {' - '}
                      {t('ecosystemHealth.version_reported')}: {s.versionReported ?? t('ecosystemHealth.version_unknown')}
                      {s.drift && <span className="ml-2 font-black text-amber-400" data-testid="health-drift">{t('ecosystemHealth.drift_badge')}</span>}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {heard ? t('ecosystemHealth.last_seen', { ago: heard }) : t('ecosystemHealth.never_seen')}
                      {s.latencyMs !== null && ` - ${t('ecosystemHealth.latency', { ms: s.latencyMs })}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
