// =============================================================================
// HYDRA-UMC STUDIO - src/shell/SystemMetricsBar.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The live readings of the machine (temperature, load, memory, network) in the status bar.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bluetooth, Cable, Cpu, Server, Thermometer, Wifi, type LucideIcon } from 'lucide-react';
import { serverClient } from '../lib/serverClient';

interface SystemMetrics {
  cpu_load: number;
  memory_usage: number;
  temp: number | null;
  temp_is_real: boolean;
  rp1_temp: number | null;
  network: { wifi: boolean | null; ethernet: boolean | null; bluetooth: boolean | null };
}

/** Polls GET /api/system/metrics (server.ts) - same 5s cadence the Android app's own System Health panel uses, kept in sync deliberately. */
export function SystemMetricsBar() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      serverClient.getSystemMetrics().then(data => {
        if (!cancelled && data) setMetrics(data as unknown as SystemMetrics);
      }).catch(() => { /* server unreachable - keep showing the last known reading */ });
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (!metrics) return null;

  // Icon typed as the concrete LucideIcon (not React.ElementType) - with the
  // React 19 types installed here, JSX.LibraryManagedAttributes collapses
  // props like size/className to `never` for a bare React.ElementType tag
  // (it has to intersect prop types across every possible element the union
  // could resolve to), which is exactly what made `<Icon size={12}
  // className={...} />` below fail to typecheck even though all 3 real
  // callers (Wifi/Bluetooth/Cable) are plain lucide-react icons.
  const netIcon = (state: boolean | null, Icon: LucideIcon, label: string) => (
    <div className="flex items-center gap-1" title={label}>
      <Icon size={12} className={state === true ? "text-emerald-400" : state === false ? "text-rose-500" : "text-slate-700"} />
    </div>
  );

  return (
    <div className="flex items-center gap-5 pl-6 border-l border-slate-800 normal-case tracking-normal">
      <span className="flex items-center gap-1.5 text-slate-400" title={t('dashboard.cpu_temp')}>
        <Thermometer size={12} className={metrics.temp !== null && metrics.temp > 70 ? "text-rose-500" : "text-slate-500"} />
        {metrics.temp !== null ? `${metrics.temp.toFixed(0)}°C` : '—'}
      </span>
      {metrics.rp1_temp !== null && (
        <span className="flex items-center gap-1.5 text-slate-400" title={t('dashboard.rp1_temp')}>
          <Thermometer size={12} className={metrics.rp1_temp > 70 ? "text-rose-500" : "text-slate-500"} />
          {metrics.rp1_temp.toFixed(0)}°C
        </span>
      )}
      <span className="flex items-center gap-1.5 text-slate-400" title={t('dashboard.cpu_load')}>
        <Cpu size={12} className="text-slate-500" /> {metrics.cpu_load}%
      </span>
      <span className="flex items-center gap-1.5 text-slate-400" title={t('common.memory')}>
        <Server size={12} className="text-slate-500" /> {metrics.memory_usage}%
      </span>
      <div className="flex items-center gap-2.5" title={t('dashboard.network_status')}>
        {netIcon(metrics.network?.wifi ?? null, Wifi, 'Wi-Fi')}
        {netIcon(metrics.network?.bluetooth ?? null, Bluetooth, 'Bluetooth')}
        {netIcon(metrics.network?.ethernet ?? null, Cable, 'Ethernet')}
      </div>
    </div>
  );
}
