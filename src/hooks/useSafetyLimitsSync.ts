// =============================================================================
// HYDRA-UMC STUDIO - The safety limits of the server: hooks/useSafetyLimitsSync.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The safety limits come from the server (every client is held to the same ones), read after sign-in and again every
// half minute so a change by an administrator reaches the open windows. A server without the route keeps the
// conservative defaults. Moved out of the provider unchanged.
// =============================================================================
import { useEffect } from 'react';
import { fetchSafetyLimits } from '../lib/accessApi';
import { setSafetyState } from '../lib/accessStore';

export const SAFETY_LIMITS_REFRESH_MS = 30_000;

export function useSafetyLimitsSync(authToken: string | null): void {
  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    const load = async () => {
      const read = await fetchSafetyLimits();
      if (!cancelled && read) setSafetyState(read.state);
    };
    void load();
    const timer = setInterval(() => { void load(); }, SAFETY_LIMITS_REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [authToken]);
}
