// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Audit record (administrators): AdminAudit.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The append-only record the server keeps of the changes that matter (reservations, forced releases, arming of the
// jog, changes of the safety limits, global stops): who, from which window and address, which robot, and the outcome.
// Every line is chained to the one before it by a SHA-256, so a line changed or removed later shows when the chain is
// checked: here against what was read, and by the server against the whole record. Administrators only.
// =============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw, ScrollText, ShieldCheck } from 'lucide-react';
import { useHydraStore } from '../store';
import { AUDIT_TYPES, checkChain, detailLine, type AuditRead, type ChainCheck } from '../lib/audit';
import { fetchAudit, fetchAuditJsonl } from '../lib/auditApi';

const field = 'bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500';
const LIMITS = [50, 100, 250, 1000];

type Failure = 'forbidden' | 'unavailable' | 'session' | 'network' | 'other';

export function AdminAudit() {
  const { t } = useTranslation();
  const { isAdmin, robots } = useHydraStore();
  const [type, setType] = useState('');
  const [robotId, setRobotId] = useState('');
  const [limit, setLimit] = useState(100);
  const [read, setRead] = useState<AuditRead | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<ChainCheck | null>(null);
  const [serverChecked, setServerChecked] = useState(false);

  const query = useMemo(
    () => ({ limit, ...(type ? { type } : {}), ...(robotId !== '' ? { robotId: Number(robotId) } : {}) }),
    [limit, type, robotId],
  );

  const load = useCallback(async (verify: boolean) => {
    setBusy(true);
    try {
      const { result, read: got } = await fetchAudit({ ...query, verify });
      if (!result.ok || !got) {
        setRead(null);
        setLocal(null);
        setFailure(
          result.code === 'network' ? 'network'
            : result.code === 'forbidden' ? 'forbidden'
              : result.code === 'session_expired' ? 'session'
                : result.status === 404 ? 'unavailable' : 'other',
        );
        return;
      }
      setFailure(null);
      setRead(got);
      setServerChecked(verify);
      setLocal(verify ? checkChain(got.entries) : null);
    } finally {
      setBusy(false);
    }
  }, [query]);

  useEffect(() => {
    if (isAdmin) void load(false);
  }, [isAdmin, load]);

  const exportFile = async () => {
    const text = await fetchAuditJsonl(query);
    if (text === null) { setFailure('other'); return; }
    const url = URL.createObjectURL(new Blob([text], { type: 'application/x-ndjson' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit.jsonl';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) return <p className="text-sm text-slate-400">{t('audit.admin_only')}</p>;

  const verification = read?.verification ?? null;
  const entries = read ? [...read.entries].reverse() : [];

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pr-2 text-slate-300" data-testid="admin-audit">
      <div>
        <h2 className="text-lg font-black text-slate-100 flex items-center gap-2"><ScrollText size={20} className="text-sky-400" />{t('audit.title')}</h2>
        <p className="text-xs text-slate-400 max-w-3xl">{t('audit.intro')}</p>
      </div>

      <div className="flex items-end flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
          {t('audit.filter_type')}
          <select className={field} value={type} onChange={(e) => setType(e.target.value)} data-testid="audit-type">
            <option value="">{t('audit.all_types')}</option>
            {AUDIT_TYPES.map((name) => <option key={name} value={name}>{t(`audit.type_${name.replace('-', '_')}`, name)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
          {t('audit.filter_robot')}
          <select className={field} value={robotId} onChange={(e) => setRobotId(e.target.value)} data-testid="audit-robot">
            <option value="">{t('audit.all_robots')}</option>
            {robots.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
          {t('audit.filter_limit')}
          <select className={field} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {LIMITS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy} onClick={() => { void load(false); }} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-40"><RefreshCw size={12} />{t('audit.refresh')}</button>
        <button type="button" disabled={busy} onClick={() => { void load(true); }} data-testid="audit-verify" className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-emerald-600 text-emerald-300 hover:bg-emerald-950 disabled:opacity-40"><ShieldCheck size={12} />{t('audit.verify')}</button>
        <button type="button" disabled={busy} onClick={() => { void exportFile(); }} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-40"><Download size={12} />{t('audit.export')}</button>
      </div>

      {failure && <p role="alert" className="text-xs font-bold text-rose-400" data-testid="audit-failure">{t(`audit.failure_${failure}`)}</p>}
      {read && !read.enabled && <p role="status" className="text-xs font-bold text-amber-400">{read.lockedOff ? t('audit.locked_off') : t('audit.switched_off')}</p>}

      {serverChecked && read && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs flex flex-col gap-1" data-testid="audit-chain">
          {verification && (
            <p className={verification.ok ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'} data-testid="audit-server-chain">
              {verification.ok
                ? t('audit.server_ok', { count: verification.entries })
                : t('audit.server_broken', { seq: verification.brokenAtSeq ?? '?', reason: verification.reason ?? '' })}
            </p>
          )}
          {local && (
            <p className={local.ok ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'} data-testid="audit-local-chain">
              {local.ok
                ? t('audit.local_ok', { count: local.checked, links: local.links, gaps: local.gaps })
                : t(local.reason === 'link' ? 'audit.local_broken_link' : 'audit.local_broken_changed', { seq: local.brokenAtSeq ?? '?' })}
            </p>
          )}
        </div>
      )}

      {read && (
        <div className="overflow-x-auto">
          {entries.length === 0 ? (
            <p className="text-[11px] text-slate-500">{t('audit.empty')}</p>
          ) : (
            <table className="w-full text-[11px] text-left min-w-[760px]" data-testid="audit-table">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-1 pr-3">{t('audit.col_seq')}</th>
                  <th className="py-1 pr-3">{t('audit.col_time')}</th>
                  <th className="py-1 pr-3">{t('audit.col_type')}</th>
                  <th className="py-1 pr-3">{t('audit.col_outcome')}</th>
                  <th className="py-1 pr-3">{t('audit.col_account')}</th>
                  <th className="py-1 pr-3">{t('audit.col_controller')}</th>
                  <th className="py-1 pr-3">{t('audit.col_address')}</th>
                  <th className="py-1 pr-3">{t('audit.col_robot')}</th>
                  <th className="py-1">{t('audit.col_detail')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.seq} className="border-t border-slate-800 align-top">
                    <td className="py-1 pr-3 font-mono text-slate-500">{entry.seq}</td>
                    <td className="py-1 pr-3 font-mono whitespace-nowrap">{entry.ts.replace('T', ' ').replace(/\.\d+Z?$/, '')}</td>
                    <td className="py-1 pr-3 font-bold">{t(`audit.type_${entry.type.replace('-', '_')}`, entry.type)}</td>
                    <td className={'py-1 pr-3 font-bold ' + (entry.outcome === 'ok' ? 'text-emerald-400' : entry.outcome === 'refused' ? 'text-amber-400' : 'text-rose-400')}>{t(`audit.outcome_${entry.outcome}`)}</td>
                    <td className="py-1 pr-3">{entry.username ?? '-'}</td>
                    <td className="py-1 pr-3 font-mono">{entry.controllerId ?? '-'}</td>
                    <td className="py-1 pr-3 font-mono">{entry.ip ?? '-'}</td>
                    <td className="py-1 pr-3">{entry.robotId === null ? '-' : (robots.find((r) => r.id === entry.robotId)?.name ?? `#${entry.robotId}`)}</td>
                    <td className="py-1 font-mono text-slate-400 break-all">{detailLine(entry.detail)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
