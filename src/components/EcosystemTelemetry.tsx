// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Telemetry Panel: EcosystemTelemetry.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real query/aggregate viewer against HYDRA-UMC-DATALAKE's own time-series
// store, through the Server's authenticated proxy (GET /api/telemetry/query,
// GET /api/telemetry/aggregate - see server.ts's DATALAKE_URL/
// proxyToDatalake() for why this goes through Server rather than STUDIO
// reaching Datalake's own port directly). Two real modes, matching exactly
// what Datalake's own api.py exposes - raw points or bucketed aggregates -
// nothing invented on top. Charted with recharts (already an installed
// dependency, unused anywhere else in this app until now) rather than a
// bare table - a numeric time series read as a shape, not just digits.
// =============================================================================
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart as LineChartIcon, TableProperties, Play, Clock } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useHydraStore } from '../store';
import { apiUrl } from '../lib/apiBase';

interface Point { sourceId: string; kind: string; field: string; timestamp: number; value: number; }
interface Bucket { bucketStart: number; value: number; count: number; }

const AGGREGATES = ['avg', 'min', 'max', 'sum'] as const;
const SKY = '#38bdf8';
const SKY_SOFT = 'rgba(56, 189, 248, 0.18)';

// Quick time-range presets - the real, common case (`"how has this looked
// recently"`) without hand-typing epoch milliseconds every time. Custom
// start/end stays available below for anything these don't cover.
const RANGE_PRESETS = [
  { key: '5m', ms: 5 * 60 * 1000 },
  { key: '1h', ms: 60 * 60 * 1000 },
  { key: '6h', ms: 6 * 60 * 60 * 1000 },
  { key: '24h', ms: 24 * 60 * 60 * 1000 },
] as const;

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex-1 min-w-[100px]">
      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="text-lg font-black text-slate-100 font-mono mt-1">{value}</div>
    </div>
  );
}

export function EcosystemTelemetry() {
  const { t } = useTranslation();
  const { authToken } = useHydraStore();
  const [mode, setMode] = useState<'query' | 'aggregate'>('query');
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [sourceId, setSourceId] = useState('');
  const [kind, setKind] = useState('');
  const [field, setField] = useState('');
  const [preset, setPreset] = useState<string | null>('1h');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [bucketMs, setBucketMs] = useState('60000');
  const [agg, setAgg] = useState<typeof AGGREGATES[number]>('avg');

  const [points, setPoints] = useState<Point[] | null>(null);
  const [buckets, setBuckets] = useState<Bucket[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);

  const applyPreset = (key: string, ms: number) => {
    setPreset(key);
    const now = Date.now();
    setStart(String(now - ms));
    setEnd(String(now));
  };

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

  const stats = useMemo(() => {
    const values = mode === 'query' ? (points ?? []).map(p => p.value) : (buckets ?? []).map(b => b.value);
    if (values.length === 0) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      count: values.length,
    };
  }, [mode, points, buckets]);

  const chartData = useMemo(() => {
    if (mode === 'query') return (points ?? []).map(p => ({ x: p.timestamp, y: p.value }));
    return (buckets ?? []).map(b => ({ x: b.bucketStart, y: b.value, count: b.count }));
  }, [mode, points, buckets]);

  const inputCls = 'bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-sky-500';
  const hasResult = points !== null || buckets !== null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl">
      <div>
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><LineChartIcon size={16} /> {t('ecosystem.telemetry_title')}</h3>
        <p className="text-[10px] text-slate-600 leading-relaxed pt-2 max-w-2xl">{t('ecosystem.telemetry_desc')}</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setMode('query')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${mode === 'query' ? 'bg-sky-500 text-slate-950' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>{t('ecosystem.telemetry_mode_query')}</button>
        <button onClick={() => setMode('aggregate')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${mode === 'aggregate' ? 'bg-sky-500 text-slate-950' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>{t('ecosystem.telemetry_mode_aggregate')}</button>
      </div>

      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="grid grid-cols-3 gap-3">
          <input value={sourceId} onChange={e => setSourceId(e.target.value)} placeholder={t('ecosystem.telemetry_source_id')} className={inputCls} />
          <input value={kind} onChange={e => setKind(e.target.value)} placeholder={t('ecosystem.telemetry_kind')} className={inputCls} />
          <input value={field} onChange={e => setField(e.target.value)} placeholder={t('ecosystem.telemetry_field')} className={inputCls} />
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Clock size={11} /> {t('ecosystem.telemetry_range')}</label>
          <div className="flex flex-wrap gap-2">
            {RANGE_PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key, p.ms)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${preset === p.key ? 'bg-sky-500/20 border border-sky-500/50 text-sky-400' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'}`}
              >
                {p.key}
              </button>
            ))}
            <input
              value={start}
              onChange={e => { setStart(e.target.value); setPreset(null); }}
              placeholder={t('ecosystem.telemetry_start_ms')}
              className={`${inputCls} flex-1 min-w-[140px]`}
            />
            <input
              value={end}
              onChange={e => { setEnd(e.target.value); setPreset(null); }}
              placeholder={t('ecosystem.telemetry_end_ms')}
              className={`${inputCls} flex-1 min-w-[140px]`}
            />
          </div>
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

      {hasResult && chartData.length === 0 && (
        <p className="text-xs text-slate-500 bg-slate-950 border border-slate-800 rounded-lg px-4 py-6 text-center">{t('ecosystem.telemetry_no_data')}</p>
      )}

      {hasResult && chartData.length > 0 && stats && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <StatCard label={t('ecosystem.telemetry_stat_min')} value={stats.min.toFixed(2)} />
            <StatCard label={t('ecosystem.telemetry_stat_max')} value={stats.max.toFixed(2)} />
            <StatCard label={t('ecosystem.telemetry_stat_avg')} value={stats.avg.toFixed(2)} />
            <StatCard label={t('ecosystem.telemetry_stat_count')} value={String(stats.count)} />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setView('chart')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${view === 'chart' ? 'bg-sky-500/20 border border-sky-500/50 text-sky-400' : 'bg-slate-900 border border-slate-800 text-slate-500'}`}><LineChartIcon size={12} /> {t('ecosystem.telemetry_view_chart')}</button>
            <button onClick={() => setView('table')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${view === 'table' ? 'bg-sky-500/20 border border-sky-500/50 text-sky-400' : 'bg-slate-900 border border-slate-800 text-slate-500'}`}><TableProperties size={12} /> {t('ecosystem.telemetry_view_table')}</button>
          </div>

          {view === 'chart' ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-2xl" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                {mode === 'query' ? (
                  <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="telemetryFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SKY} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={SKY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="x" tickFormatter={formatTime} stroke="#64748b" fontSize={10} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={{ stroke: '#1e293b' }} width={48} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: '#64748b' }}
                      labelFormatter={(v) => formatTime(v as number)}
                      formatter={(v) => [Number(v).toFixed(3), t('ecosystem.telemetry_value')]}
                    />
                    <Area type="monotone" dataKey="y" stroke={SKY} strokeWidth={2} fill="url(#telemetryFill)" isAnimationActive={false} dot={chartData.length < 60} />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="x" tickFormatter={formatTime} stroke="#64748b" fontSize={10} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={{ stroke: '#1e293b' }} width={48} />
                    <Tooltip
                      contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: '#64748b' }}
                      labelFormatter={(v) => formatTime(v as number)}
                      formatter={(v, n) => [n === 'y' ? Number(v).toFixed(3) : v, n === 'y' ? `${agg}(${t('ecosystem.telemetry_value')})` : t('ecosystem.telemetry_count')]}
                    />
                    <Bar dataKey="y" fill={SKY} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : mode === 'query' ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl overflow-x-auto">
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
                  {(points ?? []).map((p, i) => (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                      <td className="px-4 py-3 text-slate-200 font-bold">{p.sourceId}</td>
                      <td className="px-4 py-3 text-slate-400">{p.kind}</td>
                      <td className="px-4 py-3 text-slate-400">{p.field}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{new Date(p.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sky-400 font-mono">{p.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.telemetry_bucket_start')}</th>
                    <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.telemetry_value')} ({agg})</th>
                    <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('ecosystem.telemetry_count')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(buckets ?? []).map((b, i) => (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{new Date(b.bucketStart).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sky-400 font-mono">{b.value}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono">{b.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
