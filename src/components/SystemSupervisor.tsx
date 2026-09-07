// =============================================================================
// HYDRA-UMC STUDIO - Supervisor Panel: SystemSupervisor.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real, Netdata-style live host monitor for the CM5 this Server runs on -
// GET /api/system/supervisor (server.ts, see its own getSupervisorSnapshot()
// header comment) polled every 2s. The server keeps no history of its own
// (a background 1s sampler always has the LATEST cpu/mem/etc. ready, but
// nothing older); this component keeps its own rolling client-side window
// of the last HISTORY_LEN samples so the charts below have something to
// draw a line through. Every number here is real - a field this host
// genuinely cannot supply (a non-Linux box, a CM5 kernel without cpufreq
// exposed, `ps`/`df` missing) renders as an honest empty/"N/A" state, never
// a placeholder number - same "real vs honestly absent" convention as the
// endpoint itself.
// =============================================================================
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu, MemoryStick, HardDrive, Thermometer, ListTree, Gauge, Wifi, Bluetooth, Cable, WifiOff } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { apiUrl } from '../lib/apiBase';

interface Supervisor {
  timestamp: number;
  cpu: {
    model: string | null;
    coreCount: number;
    overallPercent: number;
    perCorePercent: number[];
    perCoreFrequencyMHz: (number | null)[];
    loadAvg: [number, number, number];
  };
  memory: {
    totalBytes: number; usedBytes: number; freeBytes: number; availableBytes: number;
    buffersBytes: number; cachedBytes: number; swapTotalBytes: number; swapUsedBytes: number;
  } | null;
  disk: { totalBytes: number; usedBytes: number; freeBytes: number; mount: string } | null;
  temps: { cpu: number | null; cpuIsReal: boolean; rp1: number | null };
  processes: { pid: number; name: string; cpuPercent: number; memPercent: number; rssBytes: number }[];
  uptimeSeconds: number;
  network: { wifi: boolean | null; ethernet: boolean | null; bluetooth: boolean | null };
}

// 2 minutes of history at 2s polling - long enough for the shape of a real
// spike/settle to read clearly without the chart becoming unreadably dense.
const HISTORY_LEN = 60;
const POLL_MS = 2000;

function formatBytes(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatClock(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

const ACCENTS = {
  cpu: { text: 'text-cyan-400', border: 'border-cyan-500/40', glow: 'shadow-[0_0_24px_rgba(34,211,238,0.15)]', fill: '#22d3ee', bg: 'bg-cyan-500/10' },
  mem: { text: 'text-amber-400', border: 'border-amber-500/40', glow: 'shadow-[0_0_24px_rgba(251,191,36,0.15)]', fill: '#fbbf24', bg: 'bg-amber-500/10' },
  disk: { text: 'text-emerald-400', border: 'border-emerald-500/40', glow: 'shadow-[0_0_24px_rgba(52,211,153,0.15)]', fill: '#34d399', bg: 'bg-emerald-500/10' },
  temp: { text: 'text-rose-400', border: 'border-rose-500/40', glow: 'shadow-[0_0_24px_rgba(251,113,133,0.15)]', fill: '#fb7185', bg: 'bg-rose-500/10' },
  proc: { text: 'text-violet-400', border: 'border-violet-500/40', glow: 'shadow-[0_0_24px_rgba(167,139,250,0.15)]', fill: '#a78bfa', bg: 'bg-violet-500/10' },
} as const;

function StatTile({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent: keyof typeof ACCENTS;
}) {
  const a = ACCENTS[accent];
  return (
    <div className={`relative overflow-hidden rounded-xl border ${a.border} bg-slate-950/80 p-4 ${a.glow}`}>
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full ${a.bg} blur-2xl`} />
      <div className="relative flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
        <span className={a.text}>{icon}</span> {label}
      </div>
      <div className={`relative mt-2 text-2xl font-black tabular-nums ${a.text}`}>{value}</div>
      {sub && <div className="relative mt-0.5 text-[10px] text-slate-500 tabular-nums">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, icon, accent, height = 160, children }: {
  title: string; icon: React.ReactNode; accent: keyof typeof ACCENTS; height?: number; children: React.ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <div className={`rounded-xl border ${a.border} bg-slate-950/80 p-4 ${a.glow}`}>
      <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${a.text} mb-2`}>
        {icon} {title}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

const tooltipStyle = { background: '#020617', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 };
const axisProps = { stroke: '#64748b', fontSize: 9, tickLine: false, axisLine: { stroke: '#1e293b' } };

export function SystemSupervisor() {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<Supervisor | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const historyRef = useRef<Supervisor[]>([]);
  const [, forceTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      fetch(apiUrl('/api/system/supervisor')).then(r => r.ok ? r.json() : null).then((data: Supervisor | null) => {
        if (cancelled) return;
        if (!data) { setUnreachable(true); return; }
        setUnreachable(false);
        setSnapshot(data);
        historyRef.current = [...historyRef.current.slice(-(HISTORY_LEN - 1)), data];
        forceTick(v => v + 1);
      }).catch(() => { if (!cancelled) setUnreachable(true); });
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (!snapshot) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        {unreachable ? t('ecosystem.supervisor_unreachable', 'Cannot reach the Server for live host metrics.') : t('ecosystem.loading', 'Loading...')}
      </div>
    );
  }

  const history = historyRef.current;
  const cpuData = history.map(s => ({ x: s.timestamp, y: s.cpu.overallPercent }));
  const memData = history.map(s => ({
    x: s.timestamp,
    used: s.memory ? Math.round((s.memory.usedBytes / s.memory.totalBytes) * 1000) / 10 : null,
    cached: s.memory ? Math.round(((s.memory.cachedBytes + s.memory.buffersBytes) / s.memory.totalBytes) * 1000) / 10 : null,
  }));
  const tempData = history.map(s => ({ x: s.timestamp, cpu: s.temps.cpu, rp1: s.temps.rp1 }));

  const memPercent = snapshot.memory ? Math.round((snapshot.memory.usedBytes / snapshot.memory.totalBytes) * 100) : null;
  const diskPercent = snapshot.disk ? Math.round((snapshot.disk.usedBytes / snapshot.disk.totalBytes) * 100) : null;

  const netIcon = (state: boolean | null, Icon: typeof Wifi, OffIcon: typeof Wifi, label: string) => (
    <span className="flex items-center gap-1.5" title={label}>
      {state === false ? <OffIcon size={13} className="text-slate-700" /> : <Icon size={13} className={state === true ? 'text-emerald-400' : 'text-slate-700'} />}
      <span className="text-[10px] uppercase tracking-widest text-slate-500">{label}</span>
    </span>
  );

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
          <Gauge size={16} /> {t('ecosystem.supervisor_title', 'System Supervisor')}
        </h3>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${unreachable ? 'bg-rose-500' : 'bg-emerald-400'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${unreachable ? 'bg-rose-500' : 'bg-emerald-400'}`} />
            </span>
            {unreachable ? t('ecosystem.supervisor_stale', 'Stale') : t('ecosystem.supervisor_live', 'Live')} · {formatClock(snapshot.timestamp)}
          </span>
          <span>{t('ecosystem.supervisor_uptime', 'Uptime')}: <span className="text-slate-300 tabular-nums">{formatUptime(snapshot.uptimeSeconds)}</span></span>
          <div className="flex items-center gap-3">
            {netIcon(snapshot.network.wifi, Wifi, WifiOff, 'Wi-Fi')}
            {netIcon(snapshot.network.bluetooth, Bluetooth, Bluetooth, 'BT')}
            {netIcon(snapshot.network.ethernet, Cable, Cable, 'ETH')}
          </div>
        </div>
      </div>

      {/* Scrolling body - this panel's own ancestor (Dashboard.tsx's main
          content area) is `overflow-hidden`; without its own scroll
          container here, the charts/process table below just got silently
          clipped at the bottom of the viewport with no way to reach the
          rest (real feedback: the process table appeared cut mid-row).
          Only this region scrolls - the header above stays put, same
          "fixed toolbar, scrolling body" shape as EcosystemServices.tsx's
          own families list. */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 pb-8">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile accent="cpu" icon={<Cpu size={13} />} label={t('ecosystem.supervisor_cpu', 'CPU')} value={`${snapshot.cpu.overallPercent.toFixed(0)}%`} sub={snapshot.cpu.model ? `${snapshot.cpu.coreCount} ${t('ecosystem.supervisor_cores', 'cores')}` : undefined} />
        <StatTile accent="mem" icon={<MemoryStick size={13} />} label={t('ecosystem.supervisor_memory', 'Memory')} value={memPercent !== null ? `${memPercent}%` : 'N/A'} sub={snapshot.memory ? `${formatBytes(snapshot.memory.usedBytes)} / ${formatBytes(snapshot.memory.totalBytes)}` : undefined} />
        <StatTile accent="disk" icon={<HardDrive size={13} />} label={t('ecosystem.supervisor_disk', 'Flash')} value={diskPercent !== null ? `${diskPercent}%` : 'N/A'} sub={snapshot.disk ? `${formatBytes(snapshot.disk.usedBytes)} / ${formatBytes(snapshot.disk.totalBytes)}` : undefined} />
        <StatTile accent="temp" icon={<Thermometer size={13} />} label={t('ecosystem.supervisor_cpu_temp', 'CPU Temp')} value={snapshot.temps.cpu !== null ? `${snapshot.temps.cpu.toFixed(0)}°C` : 'N/A'} />
        <StatTile accent="temp" icon={<Thermometer size={13} />} label={t('ecosystem.supervisor_rp1_temp', 'RP1 Temp')} value={snapshot.temps.rp1 !== null ? `${snapshot.temps.rp1.toFixed(0)}°C` : 'N/A'} />
        <StatTile accent="proc" icon={<ListTree size={13} />} label={t('ecosystem.supervisor_load_avg', 'Load Avg')} value={snapshot.cpu.loadAvg[0].toFixed(2)} sub={`${snapshot.cpu.loadAvg[1].toFixed(2)} / ${snapshot.cpu.loadAvg[2].toFixed(2)}`} />
      </div>

      {/* CPU: overall trend + per-core bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title={t('ecosystem.supervisor_cpu_trend', 'CPU Load (overall)')} icon={<Cpu size={12} />} accent="cpu">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cpuData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="supCpuFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENTS.cpu.fill} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={ACCENTS.cpu.fill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="x" tickFormatter={formatClock} {...axisProps} />
              <YAxis domain={[0, 100]} width={32} {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => formatClock(v as number)} formatter={(v) => [`${v}%`, t('ecosystem.supervisor_cpu', 'CPU')]} />
              <Area type="monotone" dataKey="y" stroke={ACCENTS.cpu.fill} strokeWidth={2} fill="url(#supCpuFill)" isAnimationActive={false} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('ecosystem.supervisor_cpu_cores', 'Per-Core Load')} icon={<Cpu size={12} />} accent="cpu">
          <div className="h-full overflow-y-auto pr-1 space-y-1.5">
            {snapshot.cpu.perCorePercent.map((pct, i) => {
              const freq = snapshot.cpu.perCoreFrequencyMHz[i];
              const color = pct > 80 ? '#fb7185' : pct > 50 ? '#fbbf24' : '#22d3ee';
              return (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <span className="w-8 text-slate-500 tabular-nums shrink-0">C{i}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-900 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
                  </div>
                  <span className="w-10 text-right tabular-nums text-slate-300 shrink-0">{pct.toFixed(0)}%</span>
                  {freq !== null && <span className="w-16 text-right tabular-nums text-slate-600 shrink-0">{freq} MHz</span>}
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* Memory + Temperature trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title={t('ecosystem.supervisor_memory_trend', 'Memory Usage')} icon={<MemoryStick size={12} />} accent="mem">
          {snapshot.memory ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={memData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="supMemFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENTS.mem.fill} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={ACCENTS.mem.fill} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="x" tickFormatter={formatClock} {...axisProps} />
                <YAxis domain={[0, 100]} width={32} {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => formatClock(v as number)} formatter={(v, n) => [`${v}%`, n === 'used' ? t('ecosystem.supervisor_used', 'Used') : t('ecosystem.supervisor_cached', 'Cached/Buffers')]} />
                <Area type="monotone" dataKey="used" stroke={ACCENTS.mem.fill} strokeWidth={2} fill="url(#supMemFill)" isAnimationActive={false} dot={false} />
                <Area type="monotone" dataKey="cached" stroke="#94a3b8" strokeWidth={1} fill="none" strokeDasharray="3 3" isAnimationActive={false} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-600">{t('ecosystem.supervisor_linux_only', 'Linux host only')}</div>
          )}
        </ChartCard>

        <ChartCard title={t('ecosystem.supervisor_temp_trend', 'Temperature')} icon={<Thermometer size={12} />} accent="temp">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tempData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="x" tickFormatter={formatClock} {...axisProps} />
              <YAxis domain={['auto', 'auto']} width={32} {...axisProps} unit="°" />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => formatClock(v as number)} formatter={(v, n) => [`${v}°C`, n === 'cpu' ? 'CPU' : 'RP1']} />
              <Line type="monotone" dataKey="cpu" stroke={ACCENTS.temp.fill} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              <Line type="monotone" dataKey="rp1" stroke="#f472b6" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Process table */}
      <ChartCard title={t('ecosystem.supervisor_processes', 'Top Processes')} icon={<ListTree size={12} />} accent="proc" height={snapshot.processes.length ? 340 : 80}>
        {snapshot.processes.length ? (
          <div className="h-full overflow-y-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-slate-950">
                <tr className="text-slate-600 uppercase tracking-widest text-[9px]">
                  <th className="pb-1.5 font-black">PID</th>
                  <th className="pb-1.5 font-black">{t('ecosystem.supervisor_process_name', 'Process')}</th>
                  <th className="pb-1.5 font-black text-right">CPU%</th>
                  <th className="pb-1.5 font-black text-right">MEM%</th>
                  <th className="pb-1.5 font-black text-right">RSS</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.processes.map(p => (
                  <tr key={p.pid} className="border-t border-slate-900 hover:bg-slate-900/50">
                    <td className="py-1 text-slate-600 tabular-nums">{p.pid}</td>
                    <td className="py-1 text-slate-300 font-mono truncate max-w-[160px]">{p.name}</td>
                    <td className="py-1 text-right tabular-nums">
                      <span className={p.cpuPercent > 50 ? 'text-rose-400' : p.cpuPercent > 15 ? 'text-amber-400' : 'text-slate-400'}>{p.cpuPercent.toFixed(1)}</span>
                    </td>
                    <td className="py-1 text-right tabular-nums text-slate-400">{p.memPercent.toFixed(1)}</td>
                    <td className="py-1 text-right tabular-nums text-slate-500">{formatBytes(p.rssBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-slate-600">{t('ecosystem.supervisor_processes_unavailable', '`ps` is unavailable on this host')}</div>
        )}
      </ChartCard>
      </div>
    </div>
  );
}
