// =============================================================================
// HYDRA-UMC-STUDIO - src/lib/watchNotice.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// What the phones told the server about telling their watch of a newer release (administrator, read only).
import { serverClient, settle } from './serverClient';
import type { HydraServerClient } from '../generated/hydra-server-client';

export interface WatchNoticeDevice { device_id: string; platform: string; username: string; notifies_watch: boolean; updated_at: string }
export type WatchNoticeResult = { ok: true; devices: WatchNoticeDevice[] } | { ok: false; unsupported: boolean };

function isDevice(value: unknown): value is WatchNoticeDevice {
  const d = value as Partial<WatchNoticeDevice> | null;
  return typeof d?.device_id === 'string' && typeof d.platform === 'string' && typeof d.username === 'string' && typeof d.notifies_watch === 'boolean' && typeof d.updated_at === 'string';
}

export async function readWatchNotices(client: HydraServerClient = serverClient): Promise<WatchNoticeResult> {
  try {
    const { status, data } = await settle(() => client.getAdminWatchReleaseNotice());
    if (status !== 200) return { ok: false, unsupported: status === 404 };
    const devices = (data as { devices?: unknown } | null)?.devices;
    return Array.isArray(devices) ? { ok: true, devices: devices.filter(isDevice) } : { ok: false, unsupported: false };
  } catch {
    return { ok: false, unsupported: false };
  }
}
