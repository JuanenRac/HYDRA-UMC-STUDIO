// =============================================================================
// HYDRA-UMC STUDIO - src/lib/panelApi.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// One defensive read of a SERVER route for the settings panels (updates, security, installation, notifications): a server that
// predates the route answers 404 and the panel says so, a refused session or role is told apart from a broken connection, and an
// answer that is not JSON is read as an empty object instead of breaking the screen.
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export type PanelFailure = 'unsupported' | 'forbidden' | 'http' | 'network';
export type PanelResult<T> = { ok: true; value: T } | { ok: false; failure: PanelFailure; status?: number };

export const asObject = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
export const asText = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);
export const asCount = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);

/** Reads `route` (or sends `init`) and hands the JSON answer to `parse`. */
export async function panelRead<T>(route: string, parse: (data: unknown) => T, init?: RequestInit): Promise<PanelResult<T>> {
  try {
    const res = await authFetch(apiUrl(route), init);
    if (res.status === 404) return { ok: false, failure: 'unsupported', status: 404 };
    if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden', status: res.status };
    if (!res.ok) return { ok: false, failure: 'http', status: res.status };
    return { ok: true, value: parse(await res.json().catch(() => ({}))) };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

/** The translation key that says why a read failed. */
export function failureKey(failure: PanelFailure): string {
  switch (failure) {
    case 'unsupported': return 'panels.error_unsupported';
    case 'forbidden': return 'panels.error_forbidden';
    case 'http': return 'panels.error_http';
    default: return 'panels.error_network';
  }
}
