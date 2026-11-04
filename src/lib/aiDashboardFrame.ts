// =============================================================================
// HYDRA-UMC STUDIO - The frame of the AI dashboard: src/lib/aiDashboardFrame.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The panel shows the AI dashboard (HYDRA-UMC-DASHBOARD-AI) that HYDRA-UMC-SERVER serves at /dashboard-ai in an iframe. The page shares the login of this app
// only when it comes from the SAME origin, so the frame is made only then. The page tells the frame how tall it is with one message; the message is
// believed only when it comes from the frame itself, from the origin of the page, with the expected type and a sensible number.
// =============================================================================

/** The path of the dashboard in the embedded mode. */
export const DASHBOARD_AI_PATH = '/dashboard-ai/?embed=1';
export const DASHBOARD_AI_HEIGHT_MESSAGE = 'hydra-dashboard-ai:height';
export const MIN_FRAME_HEIGHT = 240;
export const MAX_FRAME_HEIGHT = 20000;

/** Where the frame would point (the base of the server, or this page's own origin). */
export function dashboardAiUrl(apiBase: string): string {
  return `${apiBase}${DASHBOARD_AI_PATH}`;
}

/** The origin of an address, or null when it is not a usable http(s) address. */
export function originOf(address: string, base: string): string | null {
  try {
    const parsed = new URL(address, base);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.origin : null;
  } catch {
    return null;
  }
}

/** The page can use the login of this app only from the same origin: otherwise the panel shows a link instead of a frame. */
export function canShareLogin(frameUrl: string, pageOrigin: string): boolean {
  const origin = originOf(frameUrl, pageOrigin);
  return origin !== null && origin === pageOrigin;
}

export interface HeightMessageCheck {
  data: unknown;
  origin: string;
  source: unknown;
  frameWindow: unknown;
  expectedOrigin: string;
}

/** The height in pixels the page asks for, kept inside a sensible range; null when the message is not the one of the page. */
export function heightFromMessage(check: HeightMessageCheck): number | null {
  if (check.origin !== check.expectedOrigin) return null;
  if (check.frameWindow === null || check.frameWindow === undefined || check.source !== check.frameWindow) return null;
  const data = check.data;
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (record.type !== DASHBOARD_AI_HEIGHT_MESSAGE) return null;
  const height = record.height;
  if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0) return null;
  return Math.min(MAX_FRAME_HEIGHT, Math.max(MIN_FRAME_HEIGHT, Math.ceil(height)));
}
