// =============================================================================
// HYDRA-UMC STUDIO - Server Admin > Security: TwinLivePanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The live state of the twin, read through the SERVER. Watching is OFF by default and a choice of this browser: with the box ticked the window opens
// `/api/twin/ws` (the session token as a subprotocol), shows whether the state is of the real robot or of a simulation, how many joints it holds and
// why there is none when the twin says so. It only reads: nothing this window sends reaches the twin, and the box can be cleared at any time.
// =============================================================================
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readToken } from '../lib/session';
import {
  EMPTY_TWIN_FEED, TWIN_FEED_RECONNECT_MS, TWIN_FEED_SUBPROTOCOL, applyTwinFrame, parseTwinFrame, readTwinFeedPref, twinFeedEnd, twinFeedRetries, twinFeedUrl,
  writeTwinFeedPref, type TwinFeedEnd, type TwinFeedState,
} from '../lib/twinFeed';

type Link = 'off' | 'connecting' | 'live' | TwinFeedEnd;

const END_KEY: Record<TwinFeedEnd, string> = {
  denied: 'twinLive.denied',
  not_available: 'twinLive.not_available',
  unavailable: 'twinLive.unavailable',
  closed: 'twinLive.closed',
};

export function TwinLivePanel() {
  const { t } = useTranslation();
  const [watching, setWatching] = useState<boolean>(() => readTwinFeedPref());
  const [link, setLink] = useState<Link>('off');
  const [feed, setFeed] = useState<TwinFeedState>(EMPTY_TWIN_FEED);
  const feedRef = useRef<TwinFeedState>(EMPTY_TWIN_FEED);

  useEffect(() => {
    if (!watching) { setLink('off'); return; }
    let cancelled = false;
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const open = () => {
      const token = readToken();
      if (cancelled || !token) { setLink('denied'); return; }
      setLink('connecting');
      try {
        const ws = new WebSocket(twinFeedUrl(), [TWIN_FEED_SUBPROTOCOL, token]);
        socket = ws;
        ws.onopen = () => setLink('live');
        ws.onmessage = (ev) => {
          const frame = parseTwinFrame(ev.data);
          if (!frame) return;
          feedRef.current = applyTwinFrame(feedRef.current, frame);
          setFeed(feedRef.current);
        };
        ws.onclose = (ev) => {
          if (socket === ws) socket = null;
          if (cancelled) return;
          const end = twinFeedEnd(ev.code);
          setLink(end);
          if (twinFeedRetries(end)) timer = setTimeout(open, TWIN_FEED_RECONNECT_MS);
        };
        ws.onerror = () => { /* onclose follows */ };
      } catch {
        setLink('unavailable');
        if (!cancelled) timer = setTimeout(open, TWIN_FEED_RECONNECT_MS);
      }
    };
    open();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      try { socket?.close(); } catch { /* already closed */ }
    };
  }, [watching]);

  const change = (on: boolean) => {
    writeTwinFeedPref(on);
    feedRef.current = EMPTY_TWIN_FEED;
    setFeed(EMPTY_TWIN_FEED);
    setWatching(on);
  };

  const vehicles = Object.entries(feed.vehicles);
  return (
    <div className="space-y-2" data-testid="twin-live-panel">
      <h5 className="text-xs font-bold text-slate-200">{t('twinLive.title')}</h5>
      <div className="text-[10px] text-slate-500">{t('twinLive.desc')}</div>
      <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
        <input type="checkbox" data-testid="twin-live-watch" checked={watching} onChange={e => change(e.target.checked)} />
        {t('twinLive.label')}
      </label>
      <span className="text-[10px] font-bold text-slate-400" data-testid="twin-live-link" role="status">
        {link === 'off' ? t('twinLive.off') : link === 'connecting' ? t('twinLive.connecting') : link === 'live' ? t('twinLive.live') : t(END_KEY[link])}
      </span>
      {watching && link === 'live' && (
        <div className="text-[10px] text-slate-300 space-y-0.5" data-testid="twin-live-state">
          {feed.source ? (
            <div>{t(feed.source === 'real' ? 'twinLive.state_real' : 'twinLive.state_simulated', { joints: feed.joints })}</div>
          ) : (
            <div>{t('twinLive.no_state')}</div>
          )}
          {feed.status && <div className="text-amber-400" data-testid="twin-live-status">{t('twinLive.status', { code: feed.status.code })}</div>}
          {vehicles.length > 0 && (
            <div>{t('twinLive.vehicles', { count: vehicles.length, stale: vehicles.filter(([, v]) => v.stale).length })}</div>
          )}
        </div>
      )}
    </div>
  );
}
