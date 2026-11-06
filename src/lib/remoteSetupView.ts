// =============================================================================
// HYDRA-UMC STUDIO - src/lib/remoteSetupView.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The setup of the remote access in three steps (the address the apps type, which apps may find the server, how to check it), drawn
// from the same setting the Remote Access tab edits (settings.remoteAccess). A client with no choice of its own follows the old
// combined switch, and with neither it is allowed, exactly as the server decides it.

export const REMOTE_CLIENTS = ['suite', 'android', 'ios', 'watch', 'dsi'] as const;
export type RemoteClient = (typeof REMOTE_CLIENTS)[number];
export type RemoteAccessSetting = Partial<Record<RemoteClient, boolean>> & { enabled?: boolean };

/** Whether the server lets this kind of app find it. */
export function clientAllowed(setting: RemoteAccessSetting | undefined, client: RemoteClient): boolean {
  return setting?.[client] ?? setting?.enabled ?? true;
}

export function allowedClients(setting: RemoteAccessSetting | undefined): RemoteClient[] {
  return REMOTE_CLIENTS.filter((client) => clientAllowed(setting, client));
}

/** The patch that closes the access of every kind of app at once (the conservative way out). */
export function closeAllPatch(setting: RemoteAccessSetting | undefined): RemoteAccessSetting {
  const closed: RemoteAccessSetting = { ...(setting ?? {}) };
  for (const client of REMOTE_CLIENTS) closed[client] = false;
  return closed;
}

/** The address an app is told to type: the origin this STUDIO is served from, without a trailing slash. */
export function serverAddress(origin: string): string {
  return origin.replace(/\/+$/, '');
}

/** An address a phone can use: a page served from the machine itself (localhost) cannot be reached from another device. */
export function addressReachableFromOutside(address: string): boolean {
  try {
    const host = new URL(address).hostname;
    return host !== 'localhost' && host !== '127.0.0.1' && host !== '::1' && host !== '[::1]';
  } catch {
    return false;
  }
}
