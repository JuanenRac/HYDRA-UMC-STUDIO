// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Connected Apps Panel: AdminClients.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// STUDIO's own version of HYDRA-UMC-SERVER/admin-ui/src/tabs/DevicesTab.tsx -
// same route (GET /api/admin/clients, admin-only), same fields, restyled to
// STUDIO's own dark slate/sky visual language instead of duplicating the
// backend logic a second time. Purely informational: every currently-open
// WebSocket connection to Server (STUDIO tabs, mobile apps, HYDRA-UMC
// SUITE, ...), not the robot roster itself - see server.ts's own comment on
// that route. Admin-first sort and a live "connected Xm ago" duration (not
// just a raw timestamp) - the real question this screen answers is "who's
// on right now and for how long", which a plain unsorted timestamp list
// makes the reader compute by hand.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Radio, RefreshCw, ShieldCheck, User } from 'lucide-react';
import { useHydraStore } from '../store';
import { apiUrl } from '../lib/apiBase';

interface ClientInfo {
  username: string | null;
  role: string | null;
  remoteAddress: string | null;
  connectedAt: string | null;
  remoteApiVersion: number | null;
  connected: boolean;
}

const POLL_MS = 5000;

function relativeDuration(iso: string | null, now: number): string {
  if (!iso) return '-';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '-';
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function AdminClients() {
  const { t } = useTranslation();
  const { authToken, isAdmin } = useHydraStore();
  const [clients, setClients] = useState<ClientInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const res = await fetch(apiUrl('/api/admin/clients'), { headers });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `HTTP ${res.status}`); return; }
      setClients(data.clients || []);
      setError('');
    } catch {
      setError(t('ecosystem.clients_load_error'));
    } finally {
      setLoading(false);
    }
  }, [authToken, t]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Ticks the "Xm ago" durations forward once a second - independent of the
  // 5s data poll above, so the clock doesn't visibly stall between polls.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isAdmin) {
    return <p className="text-xs text-slate-500">{t('ecosystem.admin_only')}</p>;
  }

  const sorted = [...(clients ?? [])].sort((a, b) => {
    if ((a.role === 'admin') !== (b.role === 'admin')) return a.role === 'admin' ? -1 : 1;
    return (a.username || '').localeCompare(b.username || '');
  });
  const adminCount = sorted.filter(c => c.role === 'admin').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><Radio size={16} className="text-emerald-400" /> {t('ecosystem.clients_title')}</h3>
          <p className="text-[10px] text-slate-600 leading-relaxed pt-2 max-w-2xl">{t('ecosystem.clients_desc')}</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sky-400 transition-colors shrink-0">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> {t('ecosystem.refresh')}
        </button>
      </div>

      {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</p>}

      {clients !== null && clients.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex-1 min-w-[100px]">
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.clients_stat_connected')}</div>
            <div className="text-2xl font-black text-slate-100 mt-0.5">{sorted.length}</div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex-1 min-w-[100px]">
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.clients_stat_admins')}</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">{adminCount}</div>
          </div>
        </div>
      )}

      {clients === null ? (
        <p className="text-xs text-slate-500">{t('ecosystem.loading')}</p>
      ) : clients.length === 0 ? (
        <p className="text-xs text-slate-500">{t('ecosystem.clients_none')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((c, i) => (
            <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${c.role === 'admin' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-sky-500/10 border border-sky-500/30'}`}>
                  {c.role === 'admin' ? <ShieldCheck size={16} className="text-emerald-400" /> : <User size={16} className="text-sky-400" />}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-slate-200">{c.username || t('ecosystem.clients_unknown')}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{c.remoteAddress || t('ecosystem.clients_unknown_address')}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-500">
                <span className={c.role === 'admin' ? 'font-black uppercase text-emerald-400' : 'font-black uppercase text-sky-400'}>{c.role || '?'}</span>
                <span>{t('ecosystem.clients_schema', { version: c.remoteApiVersion ?? '?' })}</span>
                <span className="font-mono">{relativeDuration(c.connectedAt, now)}</span>
                <span className={`w-2 h-2 rounded-full shrink-0 shadow-[0_0_5px_currentColor] ${c.connected ? 'bg-emerald-500' : 'bg-rose-500'}`} title={c.connected ? t('ecosystem.clients_open') : t('ecosystem.clients_closing')} />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-600">{t('ecosystem.clients_refresh_note', { seconds: POLL_MS / 1000 })}</p>
    </div>
  );
}
