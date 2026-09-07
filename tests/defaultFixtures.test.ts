// =============================================================================
// HYDRA-UMC STUDIO - tests/defaultFixtures.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// STUDIO-01 (found in an ecosystem-wide software-improvements audit, P1):
// createDefaultRobots()/createDefaultCameras() used to seed online/
// urtcConnected/connected as true (and controllerBoard/urtcHead/
// urtcExpansion as populated) for a few example entries, presenting
// fixture data as evidence of a real hardware connection before this app
// had ever heard from a real Server - and, since this seed is what the
// debounced save effect can POST back to settings.json, that fake claim
// could persist. Every live-connection field on the example fixtures must
// now be false/undefined; useful example content (models, roles, tools,
// joint angles, PnP/CNC/inspection role assignments) is untouched.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { createDefaultRobots, createDefaultCameras } from '../src/store';

describe('createDefaultRobots', () => {
  const robots = createDefaultRobots();

  it('never claims a live connection for an example robot', () => {
    for (const r of robots) {
      expect(r.online).toBe(false);
      expect(r.urtcConnected).toBe(false);
    }
  });

  it('never populates detected-hardware fields for an example robot', () => {
    for (const r of robots) {
      expect(r.controllerBoard).toBeUndefined();
      expect(r.urtcHead).toBeUndefined();
      expect(r.urtcExpansion).toBeUndefined();
    }
  });

  it('still returns 8 useful, distinctly-configured example robots', () => {
    expect(robots.length).toBe(8);
    expect(robots[0].role).toBe('Pnp');
    expect(robots[0].hasXYTable).toBe(true);
    expect(robots[1].role).toBe('CNC');
    expect(robots[2].role).toBe('Inspection');
  });
});

describe('createDefaultCameras', () => {
  it('never claims an example camera is connected', () => {
    for (const c of createDefaultCameras()) {
      expect(c.connected).toBe(false);
    }
  });
});
