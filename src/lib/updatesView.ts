// =============================================================================
// HYDRA-UMC STUDIO - src/lib/updatesView.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// What is installed, as the SERVER reports it (GET /api/hydra-info for the server itself and GET /api/ecosystem/status for the
// programs it finds next to it). The server has no route that tells the newest published version of a program, so nothing here
// compares or installs anything: the panel shows the installed versions and says so.
import { asCount, asObject, asText } from './panelApi';

export interface ServerInfo { appVersion: string | null; remoteApiVersion: number | null; hostname: string | null; controllerCount: number; robotCount: number; uptimeSeconds: number }
export interface InstalledProject { name: string; family: string | null; version: string | null }

export function parseServerInfo(data: unknown): ServerInfo {
  const body = asObject(data);
  const api = body.remoteApiVersion;
  return {
    appVersion: asText(body.appVersion),
    remoteApiVersion: typeof api === 'number' && Number.isFinite(api) ? api : null,
    hostname: asText(body.hostname),
    controllerCount: asCount(body.controllerCount),
    robotCount: asCount(body.robotCount),
    uptimeSeconds: asCount(body.uptimeSeconds),
  };
}

/** The projects of the scan, those with a name only, in alphabetical order. */
export function parseInstalled(data: unknown): InstalledProject[] {
  const list = asObject(data).projects;
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => asObject(item))
    .filter((item) => asText(item.name) !== null)
    .map((item) => ({ name: String(item.name), family: asText(item.family), version: asText(item.version) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** How many of the projects report a version. */
export function versionedCount(projects: readonly InstalledProject[]): number {
  return projects.filter((project) => project.version !== null).length;
}

/** "3 d 4 h", "5 h 12 min", "8 min": how long the server has been running. */
export function uptimeText(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}
