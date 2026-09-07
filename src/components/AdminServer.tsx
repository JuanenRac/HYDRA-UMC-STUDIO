// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Server Admin Panel: AdminServer.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Reduced STUDIO-native version of HYDRA-UMC-SERVER/admin-ui/src/tabs/
// ConfigTab.tsx - only the pieces STUDIO's own Config.tsx doesn't already
// own: listen port (GET/PUT /api/admin/server-config) and a graceful
// restart (POST /api/admin/restart). Server name stays exclusively in
// Config.tsx (POST /api/settings) - not duplicated here, same field either
// way. Uses STUDIO's own ConfirmDialog instead of window.confirm() - see
// that component's own header comment for why a blocking native confirm()
// is a real problem in an app with a live WebSocket + WebGL viewport.
//
// Also shows a real, live snapshot from GET /api/hydra-info (product name,
// uptime, controller/robot counts) - data this app already has a client
// for elsewhere (About.tsx), reused here rather than a bare port-config
// form with nothing else to look at on what's meant to be the server's
// own admin overview.
// =============================================================================
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Power, Save, Server as ServerIcon, Settings } from 'lucide-react';
import { useHydraStore } from '../store';
import { apiUrl } from '../lib/apiBase';
import { ConfirmDialog } from './ConfirmDialog';

interface HydraInfo {
  product?: string;
  appVersion?: string;
  hostname?: string;
  controllerCount?: number;
  robotCount?: number;
  uptimeSeconds?: number;
}

function formatUptime(seconds: number | undefined): string {
  if (!seconds && seconds !== 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function AdminServer() {
  const { t } = useTranslation();
  const { authToken, isAdmin } = useHydraStore();
  const [currentPort, setCurrentPort] = useState<number | null>(null);
  const [pendingPort, setPendingPort] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [info, setInfo] = useState<HydraInfo | null>(null);

  const authHeaders = () => ({ 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) });

  const load = async () => {
    try {
      const res = await fetch(apiUrl('/api/admin/server-config'), { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `HTTP ${res.status}`); return; }
      setCurrentPort(data.port);
      setPendingPort(String(data.pendingPort ?? data.port));
    } catch {
      setError(t('ecosystem.admin_server_load_error'));
    }
    try {
      const res = await fetch(apiUrl('/api/hydra-info'));
      if (res.ok) setInfo(await res.json());
    } catch {
      // Best-effort overview snapshot - the port form above is the real
      // admin surface, this just enriches it when it's reachable.
    }
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const savePort = async () => {
    const portNum = parseInt(pendingPort, 10);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      setError(t('ecosystem.admin_server_port_invalid'));
      return;
    }
    setSaving(true); setError(''); setNotice('');
    try {
      const res = await fetch(apiUrl('/api/admin/server-config'), { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ port: portNum }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `HTTP ${res.status}`); return; }
      setNotice(t('ecosystem.admin_server_port_saved'));
    } catch {
      setError(t('ecosystem.admin_server_load_error'));
    } finally {
      setSaving(false);
    }
  };

  const restartNow = async () => {
    setConfirmRestart(false);
    try {
      const res = await fetch(apiUrl('/api/admin/restart'), { method: 'POST', headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || `HTTP ${res.status}`); return; }
      setNotice(t('ecosystem.admin_server_restart_requested'));
    } catch {
      setError(t('ecosystem.admin_server_load_error'));
    }
  };

  if (!isAdmin) {
    return <p className="text-xs text-slate-500">{t('ecosystem.admin_only')}</p>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl">
      <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><Settings size={16} /> {t('ecosystem.admin_server_title')}</h3>

      {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</p>}
      {notice && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">{notice}</p>}

      {info && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <ServerIcon size={14} className="text-sky-400" />
            <span className="text-xs font-bold text-slate-200">{info.product || '-'}</span>
            <span className="text-[10px] text-slate-600 font-mono ml-auto">v{info.appVersion || '-'}</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.admin_server_stat_uptime')}</div>
              <div className="text-sm font-black text-slate-200 font-mono mt-0.5">{formatUptime(info.uptimeSeconds)}</div>
            </div>
            <div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.admin_server_stat_controllers')}</div>
              <div className="text-sm font-black text-slate-200 font-mono mt-0.5">{info.controllerCount ?? '-'}</div>
            </div>
            <div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.admin_server_stat_robots')}</div>
              <div className="text-sm font-black text-slate-200 font-mono mt-0.5">{info.robotCount ?? '-'}</div>
            </div>
            <div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.admin_server_stat_host')}</div>
              <div className="text-sm font-black text-slate-200 font-mono mt-0.5 truncate">{info.hostname || '-'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.admin_server_port_label', { port: currentPort ?? '...' })}</label>
        <div className="flex gap-2">
          <input
            type="number" min={1} max={65535}
            value={pendingPort}
            onChange={e => setPendingPort(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
          />
          <button onClick={savePort} disabled={saving} className="flex items-center gap-1.5 px-4 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
            <Save size={14} /> {t('ecosystem.admin_server_save')}
          </button>
        </div>
        <div className="flex items-start gap-2 text-[10px] text-amber-400/90 bg-amber-950/20 border border-amber-900/40 rounded-lg p-3">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{t('ecosystem.admin_server_port_note')}</span>
        </div>
        <button onClick={() => setConfirmRestart(true)} className="self-start flex items-center gap-1.5 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
          <Power size={14} /> {t('ecosystem.admin_server_restart')}
        </button>
      </div>

      <ConfirmDialog
        open={confirmRestart}
        message={t('ecosystem.admin_server_restart_confirm')}
        onConfirm={restartNow}
        onCancel={() => setConfirmRestart(false)}
      />
    </div>
  );
}
