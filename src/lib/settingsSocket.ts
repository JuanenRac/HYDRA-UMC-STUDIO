// =============================================================================
// HYDRA-UMC STUDIO - The messages of the live socket: lib/settingsSocket.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// What the window does with each frame the server pushes. Moved out of the provider unchanged.
// =============================================================================

export interface SocketHandlers {
  applyRobotDelta: (msg: any) => void;
  applyServerData: (payload: any) => void;
  publishClaims: (msg: any) => void;
  setCanotaProgress: (payload: Record<string, unknown>) => void;
}

/** Delay before the socket is opened again after it dropped (the same 3 s every other client uses). */
export const WS_RECONNECT_MS = 3000;

/** The server closes a connection whose session is refused with this code. */
export const WS_AUTH_REJECTED = 1008;

/** Routes one raw frame. A malformed frame is ignored so that it never tears the connection down. */
export function routeSocketFrame(raw: unknown, h: SocketHandlers): void {
  try {
    const msg = JSON.parse(String(raw));
    if (msg?.type === 'delta' && msg.schema === 2 && msg.robotId !== undefined) {
      console.log(`[WS] delta robotId=${msg.robotId} keys=${Object.keys(msg.patch || {}).join(',')}`);
      h.applyRobotDelta(msg);
    } else if (msg && (msg.type === 'settings' || msg.type === 'delta') && msg.payload) {
      // A delta without schema 2 and a settings message carry the same full-tree payload.
      h.applyServerData(msg.payload);
    } else if (msg?.type === 'claims') {
      h.publishClaims(msg);
    } else if (msg?.type === 'canota_progress' && msg.payload) {
      h.setCanotaProgress(msg.payload);
    } else if (msg?.error) {
      console.warn('[WS] ' + msg.error);
    }
  } catch {
    // ignore malformed frames rather than tear down the connection
  }
}
