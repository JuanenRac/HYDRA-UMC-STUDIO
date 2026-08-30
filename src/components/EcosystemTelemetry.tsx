// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Telemetry Panel: EcosystemTelemetry.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real query/aggregate viewer against HYDRA-UMC-DATALAKE's own time-series
// store, through the Server's new authenticated proxy (GET
// /api/telemetry/query, GET /api/telemetry/aggregate - see server.ts's
// DATALAKE_URL/proxyToDatalake() for why this goes through Server rather
// than STUDIO reaching Datalake's own port directly). Two real modes, not
// a fake toggle: raw points (Datalake's own /query) or bucketed aggregates
// (/aggregate) - the same two shapes HYDRA-UMC-DATALAKE/src/
// hydra_umc_datalake/api.py actually exposes, nothing invented on top.
// =============================================================================
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Play } from 'lucide-react';
import { useHydraStore } from '../store';
import { apiUrl } from '../lib/apiBase';

interface Point { sourceId: string; kind: string; field: string; timestamp: number; value: number; }
interface Bucket { bucketStart: number; value: number; count: number; }

const AGGREGATES = ['avg', 'min', 'max', 'sum'] as const;

export function EcosystemTelemetry() {
  const { t } = useTranslation();
  const { authToken } = useHydraStore();
  const [mode, setMode] = useState<'query' | 'aggregate'>('query');
  const [sourceId, setSourceId] = useState('');
  const [kind, setKind] = useState('');
  const [field, setField] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [bucketMs, setBucketMs] = useState('60000');
  const [agg, setAgg] = useState<typeof AGGREGATES[number]>('avg');

  const [points, setPoints] = useState<Point[] | null>(null);
  const [buckets, setBuckets] = useState<Bucket[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);

  const run = async () => {
    setLoading(true); setError(''); setNotConfigured(false); setPoints(null); setBuckets(null);
    try {
      const params = new URLSearchParams();
      if (sourceId) params.set('sourceId', sourceId);
      if (kind) params.set('kind', kind);
      if (field) params.set('field', field);
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      let url: string;
      if (mode === 'query') {
        url = apiUrl(`/api/telemetry/query?${params.toString()}`);
      } else {
        if (!kind || !field || !start || !end) {
          setError(t('ecosystem.telemetry_aggregate_missing_fields'));
          setLoading(false);
          return;
        }
        params.set('bucketMs', bucketMs);
        params.set('agg', agg);
        url = apiUrl(`/api/telemetry/aggregate?${params.toString()}`);
      }
      const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (res.status === 503 && data.available === false) { setNotConfigured(true); return; }
      if (!res.ok) { setError(data.error || `HTTP ${res.status}`); return; }
      if (mode === 'query') setPoints(data); else setBuckets(data);
    } catch {
      setError(t('ecosystem.telemetry_load_error'));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-sky-500';

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl">
      <div>
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><LineChart size={16} /> {t('ecosystem.telemetry_title')}</h3>
        <p className="text-[10px] text-slate-600 leading-relaxed pt-2 max-w-2xl">{t('ecosystem.telemetry_desc')}</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setMode('query')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${mode === 'query' ? 'bg-sky-500 text-slate-950' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>{t('ecosystem.telemetry_mode_query')}</button>
        <button onClick={() => setMode('aggregate')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${mode === 'aggregate' ? 'bg-sky-500 text-slate-950' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>{t('ecosystem.telemetry_mode_aggregate')}</button>
      </div>

      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
        <div className="grid grid-cols-3 gap-3">
          <input value={sourceId} onChange={e => setSourceId(e.target.value)} placeholder={t('ecosystem.telemetry_source_id')} className={inputCls} />
          <input value={kind} onChange={e => setKind(e.target.value)} placeholder={t('ecosystem.telemetry_kind')} className={inputCls} />
          <input value={field} onChange={e => setField(e.target.value)} placeholder={t('ecosystem.telemetry_field')} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input value={start} onChange={e => setStart(e.target.value)} placeholder={t('ecosystem.telemetry_start_ms')} className={inputCls} />
          <input value={end} onChange={e => setEnd(e.target.value)} placeholder={t('ecosystem.telemetry_end_ms')} className={inputCls} />
        </div>
        {mode === 'aggregate' && (
          <div className="grid grid-cols-2 gap-3">
            <input value={bucketMs} onChange={e => setBucketMs(e.target.value)} placeholder={t('ecosystem.telemetry_bucket_ms')} className={inputCls} />
            <select value={agg} onChange={e => setAgg(e.target.value as typeof AGGREGATES[number])} className={inputCls}>
              {AGGREGATES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}
        <button onClick={run} disabled={loading} className="w-full py-2.5 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
          <Play size={14} /> {t('ecosystem.telemetry_run')}
        </button>
      </div>

      {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</p>}
      {notConfigured && <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">{t('ecosystem.telemetry_not_configured')}</p>}

      {points !== null && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.telemetry_source_id')}</th>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.telemetry_kind')}</th>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.telemetry_field')}</th>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.telemetry_timestamp')}</th>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.telemetry_value')}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                  <td className="px-4 py-3 text-slate-200 font-bold">{p.sourceId}</td>
                  <td className="px-4 py-3 text-slate-400">{p.kind}</td>
                  <td className="px-4 py-3 text-slate-400">{p.field}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{new Date(p.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sky-400 font-mono">{p.value}</td>
                </tr>
              ))}
              {points.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-600 text-xs">{t('ecosystem.telemetry_no_data')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {buckets !== null && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.telemetry_bucket_start')}</th>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.telemetry_value')} ({agg})</th>
                <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.telemetry_count')}</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{new Date(b.bucketStart).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sky-400 font-mono">{b.value}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{b.count}</td>
                </tr>
              ))}
              {buckets.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-600 text-xs">{t('ecosystem.telemetry_no_data')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
