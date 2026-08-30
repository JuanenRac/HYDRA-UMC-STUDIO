// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Server Logs Panel: AdminLogs.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// STUDIO's own version of HYDRA-UMC-SERVER/admin-ui/src/tabs/LogsTab.tsx -
// same route (GET /api/admin/logs, admin-only), same polling/pause/
// autoscroll-if-at-bottom behavior, restyled to STUDIO's own visual
// language. Deliberately a poll, not a WebSocket tail - see LogsTab.tsx's
// own header comment for why that's the right call for a low-traffic admin
// screen rather than a second real-time protocol on top of the robot
// control one.
// =============================================================================
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Pause, Play } from 'lucide-react';
import { useHydraStore } from '../store';
import { apiUrl } from '../lib/apiBase';

const POLL_MS = 3000;
const LINES = 300;

export function AdminLogs() {
  const { t } = useTranslation();
  const { authToken, isAdmin } = useHydraStore();
  const [lines, setLines] = useState<string[]>([]);
  const [live, setLive] = useState(true);
  const [error, setError] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  const load = async () => {
    try {
      const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const res = await fetch(apiUrl(`/api/admin/logs?lines=${LINES}`), { headers });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `HTTP ${res.status}`); return; }
      setLines(data.lines || []);
      setError('');
    } catch {
      setError(t('ecosystem.logs_load_error'));
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
    if (!live) return;
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, isAdmin]);

  // Auto-scroll to the newest line only if the viewer was already at (or
  // near) the bottom - see LogsTab.tsx's own comment on why scrolling
  // someone out from under a line they scrolled up to read would be hostile.
  useEffect(() => {
    const el = boxRef.current;
    if (el && wasAtBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const handleScroll = () => {
    const el = boxRef.current;
    if (!el) return;
    wasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  if (!isAdmin) {
    return <p className="text-xs text-slate-500">{t('ecosystem.admin_only')}</p>;
  }

  return (
    <div className="flex flex-col gap-4 h-full max-w-5xl animate-in fade-in duration-300">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><FileText size={16} /> {t('ecosystem.logs_title')}</h3>
        <button
          onClick={() => setLive(l => !l)}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sky-400 transition-colors"
        >
          {live ? <><Pause size={12} /> {t('ecosystem.logs_pause')}</> : <><Play size={12} /> {t('ecosystem.logs_resume')}</>}
        </button>
      </div>

      {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 shrink-0">{error}</p>}

      <div
        ref={boxRef}
        onScroll={handleScroll}
        className="flex-1 min-h-[400px] max-h-[70vh] overflow-y-auto bg-black/60 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-400 leading-relaxed"
      >
        {lines.length === 0 ? (
          <p className="text-slate-600">{t('ecosystem.logs_none')}</p>
        ) : (
          lines.map((line, i) => <div key={i} className="whitespace-pre-wrap break-all">{line}</div>)
        )}
      </div>

      <p className="text-[10px] text-slate-600 shrink-0">
        {live ? t('ecosystem.logs_footer_live', { lines: LINES, seconds: POLL_MS / 1000 }) : t('ecosystem.logs_footer_paused', { lines: LINES })}
      </p>
    </div>
  );
}
