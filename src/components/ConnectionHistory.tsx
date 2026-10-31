// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Connected Apps: ConnectionHistory.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// A simple view of who has connected to the server: the clients it has seen (kind, user, version, sessions open now, sign-ins that
// worked or were refused) and the last sign-ins and sign-outs. Read from GET /api/connections/clients and /events; the server
// holds no secret in either, and shows the address only to an administrator that turned that option on.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, KeyRound } from 'lucide-react';
import { ago, connectionsApi, isFailure, type ConnectionClient, type ConnectionEvent, type ConnectionsResult } from '../lib/connectionsApi';

const POLL_MS = 10000;

export function ConnectionHistory() {
  const { t } = useTranslation();
  const [clients, setClients] = useState<ConnectionClient[] | null>(null);
  const [events, setEvents] = useState<ConnectionEvent[] | null>(null);
  const [problem, setProblem] = useState<ConnectionsResult<unknown> | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const [c, e] = await Promise.all([connectionsApi.clients(), connectionsApi.events(30)]);
    if (c.ok && e.ok) { setClients(c.value); setEvents(e.value); setProblem(null); return; }
    setProblem(c.ok ? e : c);
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
    ? problem.failure === 'unsupported' ? t('connections.unsupported') : problem.failure === 'forbidden' ? t('connections.forbidden') : t('connections.load_error')
    : '';

  return (
    <div className="space-y-4 max-w-4xl" data-testid="connection-history">
      <div>
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><History size={16} className="text-sky-400" /> {t('connections.title')}</h3>
        <p className="text-[10px] text-slate-600 leading-relaxed pt-2 max-w-2xl">{t('connections.desc')}</p>
      </div>

      {failureText && <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{failureText}</p>}

      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('connections.clients_title')}</h4>
      {clients === null ? (
        !failureText && <p className="text-xs text-slate-500">{t('connections.loading')}</p>
      ) : clients.length === 0 ? (
        <p className="text-xs text-slate-500">{t('connections.clients_none')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {clients.map(c => (
            <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap" data-testid="connection-client">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-bold text-slate-200 truncate">{c.user ?? t('connections.no_user')}</span>
                <span className="text-[10px] text-slate-500">
                  {t(`connections.kind_${c.kind}`)}{c.appVersion ? ` ${c.appVersion}` : ''}
                  {c.origin ? ` - ${t(`connections.origin_${c.origin}`)}` : ''}
                  {c.ip ? ` - ${c.ip}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-500">
                {c.twoFactor && <span className="flex items-center gap-1 text-emerald-400" title={t('connections.two_factor')}><KeyRound size={12} /> 2FA</span>}
                <span className={c.activeSessions > 0 ? 'font-black text-emerald-400' : ''}>{t('connections.sessions', { open: c.activeSessions })}</span>
                <span>{t('connections.logins', { ok: c.loginsOk, failed: c.loginsFailed })}</span>
                <span className="font-mono" title={t('connections.last_seen')}>{ago(c.lastSeen, now)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pt-2">{t('connections.events_title')}</h4>
      {events === null ? null : events.length === 0 ? (
        <p className="text-xs text-slate-500">{t('connections.events_none')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-800 bg-slate-950 border border-slate-800 rounded-xl">
          {events.map(e => (
            <li key={e.id} className="px-4 py-2 flex items-center justify-between gap-3 text-[11px]" data-testid="connection-event">
              <span className={isFailure(e.action) ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                {t(`connections.action_${e.action}`)}
                <span className="text-slate-500 font-normal">{` - ${e.user ?? t('connections.no_user')} (${t(`connections.kind_${e.kind}`)}${e.appVersion ? ` ${e.appVersion}` : ''})`}</span>
              </span>
              <span className="font-mono text-slate-500 shrink-0">{ago(e.at, now)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
