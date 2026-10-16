// =============================================================================
// HYDRA-UMC STUDIO - camera picture tickets: mediaTicket.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// An <img> or a video element cannot send an Authorization header, so the live streams and the saved photos and
// recordings of a server that sets HYDRA_UMC_CAMERA_AUTH=required are opened with a short-lived ticket in the address
// (`?ticket=...`, POST /api/camera/ticket). A server that does not issue tickets (older, or one that leaves the
// pictures open) answers 404/401: the address is then used as it is.
// =============================================================================

import { useEffect, useState } from 'react';
import { apiUrl } from './apiBase';

/** Tickets live five minutes on the server; ask for a new one a little before. */
const REFRESH_MS = 4 * 60 * 1000;

export function withTicket(url: string, ticket: string | null): string {
  if (!ticket) return url;
  return `${url}${url.includes('?') ? '&' : '?'}ticket=${encodeURIComponent(ticket)}`;
}

/** The current camera ticket for this signed-in client, renewed before it expires; null when there is none (no session, or the server does not issue them). */
export function useMediaTicket(authToken: string | null): string | null {
  const [ticket, setTicket] = useState<string | null>(null);
  useEffect(() => {
    if (!authToken) { setTicket(null); return; }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ask = async () => {
      let next: string | null = null;
      try {
        const res = await fetch(apiUrl('/api/camera/ticket'), { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } });
        if (res.ok) {
          const body = await res.json();
          if (typeof body.ticket === 'string') next = body.ticket;
        }
      } catch { /* the server is unreachable: the pictures fail on their own */ }
      if (cancelled) return;
      setTicket(next);
      if (next) timer = setTimeout(ask, REFRESH_MS);
    };
    ask();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [authToken]);
  return ticket;
}
