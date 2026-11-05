// =============================================================================
// HYDRA-UMC STUDIO - Reading what the server sent as the state of the window: lib/serverState.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The pure steps of applying an answer of GET /api/settings (or a full-tree message of the socket): which controllers
// the window shows, which one is active, the sample integrations of a fresh install. Moved out of the provider
// unchanged so that each can be tested on its own.
// =============================================================================
import { defaultControllers, type HydraController, type SystemSettings } from '../store';

/** The integrations of a fresh install, pointed at the host the window was loaded from. */
export function hostIntegrations(host: string): SystemSettings['integrations'] {
  return {
    openPnP: { enabled: false, ip: host, port: 8080 },
    slic3r: { enabled: false, ip: host, port: 8080 },
    prusaSlicer: { enabled: false, ip: host, port: 8080 },
    cnc: { software: 'LinuxCNC', enabled: false, ip: host, port: 8080 },
    laser: { software: 'LightBurn', enabled: false, ip: host, port: 8080 },
    ros2: { enabled: false, ip: host, port: 8000 },
    printer3d: { enabled: false, software: 'OrcaSlicer', ip: host, port: 8080 },
  };
}

/**
 * Only the first sample controller is a real seed, rewritten to this host. The second one of the demo array (a fixed
 * address) must not come back after a factory reset.
 */
export function seedControllers(host: string): HydraController[] {
  const def = [JSON.parse(JSON.stringify(defaultControllers[0]))];
  def[0].ip = host;
  def[0].id = host;
  return def;
}

/**
 * The controllers saved by the server, corrected in place: one saved from a cloud address is pointed at this host, and a
 * robot without playback state gets the idle one.
 */
export function normalizeControllers(parsed: any[], host: string): any[] {
  parsed.forEach((c: any) => {
    if (typeof c.id === 'string' && c.id.includes('.run.app')) {
      c.id = host;
      c.ip = host;
      c.name = `HYDRA-UMC (${host})`;
    }
    c.robots?.forEach((r: any) => {
      if (!r.playbackState) r.playbackState = { isPlaying: false, activeStep: 0, speed: 100 };
    });
  });
  return parsed;
}

/** The controllers a full-tree answer gives: the saved ones, or the seed of a fresh install. */
export function controllersFromServer(data: { controllers?: any[] } | null | undefined, host: string): any[] {
  if (data?.controllers && data.controllers.length > 0) return normalizeControllers(data.controllers, host);
  return seedControllers(host);
}

/** The active controller: the one the server names if it exists, else the first, else this host. */
export function pickActiveControllerId(wanted: string | undefined, controllers: Array<{ id: string }>, host: string): string {
  const id = wanted || host;
  return controllers.some((c) => c.id === id) ? id : controllers[0]?.id || host;
}

/** The host of the window: the page host, or the sample address when there is none. */
export function currentHost(): string {
  if (typeof window !== 'undefined' && window.location.hostname) return window.location.hostname;
  return '192.168.1.100';
}
