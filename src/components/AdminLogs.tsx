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
//
// Adds a real search box and a tag filter (extracted client-side from each
// line's own leading `[TAG]` - industrialLog()'s own convention: [ADMIN],
// [WS], [VOICE], [job-dispatcher], ... - server.ts never sends a
// structured level, so this is the honest, real filterable dimension that
// actually exists in these lines, not an invented severity the server
// doesn't provide).
// =============================================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eraser, FileText, Pause, Play, Search } from 'lucide-react';
import { useHydraStore } from '../store';
import { apiUrl } from '../lib/apiBase';

const POLL_MS = 3000;
const LINES = 300;
const TAG_RE = /\[([A-Za-z0-9_-]+)]/;

function extractTag(line: string): string | null {
  const m = line.match(TAG_RE);
  return m ? m[1] : null;
}

export function AdminLogs() {
  const { t } = useTranslation();
  // Real feedback from live testing: there was no way to clear the view -
  // `lines` is always replaced wholesale from the server's own last-N-lines
  // response on every poll (see `load()`), so simply emptying it wouldn't
  // stay empty for longer than one POLL_MS tick while live. Instead this
  // remembers the newest line at the moment Clear was pressed (or that the
  // log was empty then) and `displayedLines` below only ever shows what
  // comes after that same anchor in each fresh poll - same "clear the
  // screen, keep tailing" behavior as a terminal or devtools console, not
  // a destructive server-side truncation. Lives in the shared store, not
  // local state - real feedback from a second round of live testing: this
  // component is conditionally MOUNTED (Dashboard.tsx's own
  // `{activeTab === 'adminLogs' && <AdminLogs />}`), so plain local state
  // reset itself every time the operator navigated away and back,
  // silently un-clearing the view. See logsClearedAt's own doc comment on
  // the store's context type for the full reasoning.
  const { authToken, isAdmin, logsClearedAt: clearedAt, setLogsClearedAt: setClearedAt } = useHydraStore();
  const [lines, setLines] = useState<string[]>([]);
  const [live, setLive] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
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

  const tags = useMemo(() => {
    const set = new Set<string>();
    lines.forEach(l => { const tag = extractTag(l); if (tag) set.add(tag); });
    return Array.from(set).sort();
  }, [lines]);

  // See `clearedAt`'s own comment above. `lastIndexOf` on an anchor that's
  // scrolled off the server's own 300-line window (more real log lines
  // arrived since Clear than that window holds) can't find it anymore -
  // falls back to showing everything rather than hiding real content.
  const displayedLines = useMemo(() => {
    if (!clearedAt) return lines;
    if (clearedAt.anchor === null) return lines;
    const idx = lines.lastIndexOf(clearedAt.anchor);
    return idx === -1 ? lines : lines.slice(idx + 1);
  }, [lines, clearedAt]);

  const handleClear = () => {
    setClearedAt({ anchor: lines.length > 0 ? lines[lines.length - 1] : null });
  };

  const filteredLines = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return displayedLines.filter(l => {
      if (tagFilter && extractTag(l) !== tagFilter) return false;
      if (needle && !l.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [displayedLines, search, tagFilter]);

  // Auto-scroll to the newest line only if the viewer was already at (or
  // near) the bottom - see LogsTab.tsx's own comment on why scrolling
  // someone out from under a line they scrolled up to read would be hostile.
  useEffect(() => {
    const el = boxRef.current;
    if (el && wasAtBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [filteredLines]);

  const handleScroll = () => {
    const el = boxRef.current;
    if (!el) return;
    wasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  if (!isAdmin) {
    return <p className="text-xs text-slate-500">{t('ecosystem.admin_only')}</p>;
  }

  return (
    <div className="flex flex-col gap-4 h-full animate-in fade-in duration-300">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><FileText size={16} /> {t('ecosystem.logs_title')}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sky-400 transition-colors"
          >
            <Eraser size={12} /> {t('ecosystem.logs_clear')}
          </button>
          <button
            onClick={() => setLive(l => !l)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sky-400 transition-colors"
          >
            {live ? <><Pause size={12} /> {t('ecosystem.logs_pause')}</> : <><Play size={12} /> {t('ecosystem.logs_resume')}</>}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 shrink-0">{error}</p>}

      <div className="flex items-center gap-3 flex-wrap shrink-0">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('ecosystem.logs_search_placeholder')}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setTagFilter(null)}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${tagFilter === null ? 'bg-sky-500/20 border border-sky-500/50 text-sky-400' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'}`}
          >
            {t('ecosystem.logs_all_tags')}
          </button>
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest font-mono transition-colors ${tagFilter === tag ? 'bg-sky-500/20 border border-sky-500/50 text-sky-400' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={boxRef}
        onScroll={handleScroll}
        className="flex-1 min-h-[300px] overflow-y-auto bg-black/60 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-400 leading-relaxed"
      >
        {filteredLines.length === 0 ? (
          <p className="text-slate-600">{displayedLines.length === 0 ? t('ecosystem.logs_none') : t('ecosystem.logs_no_match')}</p>
        ) : (
          filteredLines.map((line, i) => <div key={i} className="whitespace-pre-wrap break-all">{line}</div>)
        )}
      </div>

      <p className="text-[10px] text-slate-600 shrink-0">
        {live ? t('ecosystem.logs_footer_live', { lines: LINES, seconds: POLL_MS / 1000 }) : t('ecosystem.logs_footer_paused', { lines: LINES })}
      </p>
    </div>
  );
}
