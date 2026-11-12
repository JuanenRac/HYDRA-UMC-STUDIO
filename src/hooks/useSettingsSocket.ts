// =============================================================================
// HYDRA-UMC STUDIO - The live socket of the provider: hooks/useSettingsSocket.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Opens /ws with the session token as a subprotocol (so it stays out of the address that proxies and logs record),
// feeds every frame to lib/settingsSocket.ts, reconnects after a drop and, when the server refuses the session
// (1008), tries to renew it before signing out. Moved out of the provider unchanged.
// =============================================================================
import { useEffect } from 'react';
import { wsUrl } from '../lib/apiBase';
import { routeSocketFrame, WS_AUTH_REJECTED, WS_RECONNECT_MS, type SocketHandlers } from '../lib/settingsSocket';

export interface SettingsSocketOptions extends SocketHandlers {
  authToken: string | null;
  setServerReachable: (reachable: boolean) => void;
  attemptTokenRefresh: () => Promise<boolean>;
  logout: () => void;
}

export function useSettingsSocket(o: SettingsSocketOptions): void {
  const { authToken, applyRobotDelta, applyServerData, publishClaims, publishStopState, setCanotaProgress, setServerReachable, attemptTokenRefresh, logout } = o;
  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const handlers: SocketHandlers = { applyRobotDelta, applyServerData, publishClaims, publishStopState, setCanotaProgress };

    const openWs = () => {
      if (cancelled || !authToken) return;
      try {
        // ?remoteApiVersion=2 declares that this connection understands a targeted delta.
        const socket = new WebSocket(wsUrl('/ws?remoteApiVersion=2'), ['hydra.bearer', authToken]);
        ws = socket;
        socket.onopen = () => {
          console.log(`[WS] connected (robotId param: ${new URLSearchParams(window.location.search).get('robotId') ?? 'none'})`);
          setServerReachable(true);
        };
        socket.onmessage = (ev) => routeSocketFrame(ev.data, handlers);
        socket.onclose = (ev) => {
          console.log(`[WS] closed code=${ev.code} reason=${ev.reason || '(none)'}`);
          if (ws === socket) ws = null;
          // A dropped socket is live evidence the server connection is no longer confirmed.
          setServerReachable(false);
          if (cancelled) return;
          // An auth-rejected connection is never retried with the same token: renew the session silently first and sign
          // out only if that fails too.
          if (ev.code === WS_AUTH_REJECTED) {
            attemptTokenRefresh().then((recovered) => {
              if (!recovered) logout();
            });
            return;
          }
          reconnectTimer = setTimeout(openWs, WS_RECONNECT_MS);
        };
        // onerror always precedes onclose: no separate reconnect scheduling here.
        socket.onerror = () => {};
      } catch {
        // WebSocket unavailable: the app still works through the fetch-once and debounced-save path; retry later.
        if (!cancelled) reconnectTimer = setTimeout(openWs, WS_RECONNECT_MS);
      }
    };
    if (authToken) openWs();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [applyServerData, applyRobotDelta, publishClaims, publishStopState, setCanotaProgress, setServerReachable, authToken, attemptTokenRefresh, logout]);
}
