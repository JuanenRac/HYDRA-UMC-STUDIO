// =============================================================================
// HYDRA-UMC STUDIO - tests/storeSplit.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// store.ts keeps exporting every name it exported before the robot models and the starting values moved to their own files,
// and the values are the same ones: nothing that imports from the store has to change.
import { describe, expect, it } from 'vitest';
import * as store from '../src/store';
import * as models from '../src/lib/robotModels';
import * as defaults from '../src/lib/storeDefaults';

describe('the pieces moved out of the store', () => {
  it('re-exports the robot models as the same objects', () => {
    expect(store.ROBOT_MANUFACTURERS).toBe(models.ROBOT_MANUFACTURERS);
    expect(store.REAL_ROBOT_MODELS).toBe(models.REAL_ROBOT_MODELS);
    expect(store.robotModelDof).toBe(models.robotModelDof);
    expect(store.isModelSelectable).toBe(models.isModelSelectable);
  });

  it('re-exports the starting values as the same functions', () => {
    expect(store.createDefaultRobots).toBe(defaults.createDefaultRobots);
    expect(store.createDefaultCameras).toBe(defaults.createDefaultCameras);
    expect(store.createDefaultKinematicBrainStage).toBe(defaults.createDefaultKinematicBrainStage);
    expect(store.defaultControllers).toBe(defaults.defaultControllers);
  });

  it('keeps the rules of the models', () => {
    expect(store.robotModelDof('Parol6 (6-DOF)')).toBe(6);
    expect(store.REAL_ROBOT_MODELS).not.toContain('Generic (6-DOF)');
    expect(store.isModelSelectable('Parol6 (6-DOF)', 'Faze4 (6-DOF)', { 'Parol6 (6-DOF)': false })).toBe(false);
    expect(store.isModelSelectable('Faze4 (6-DOF)', 'Faze4 (6-DOF)', { 'Faze4 (6-DOF)': false })).toBe(true);
    expect(store.isModelSelectable('AR3 (6-DOF)', 'Faze4 (6-DOF)', undefined)).toBe(true);
  });

  it('starts without claiming a hardware connection nobody made', () => {
    for (const robot of store.createDefaultRobots()) expect(robot.online === true || robot.urtcConnected === true).toBe(false);
    for (const camera of store.createDefaultCameras()) expect(camera.connected).toBe(false);
    for (const controller of store.defaultControllers) {
      expect(controller.robots.every((r) => !r.online && !r.urtcConnected)).toBe(true);
      expect(controller.cameras.every((c) => !c.connected)).toBe(true);
    }
  });

  it('gives each caller its own copy of the starting values', () => {
    const a = store.createDefaultKinematicBrainStage();
    const b = store.createDefaultKinematicBrainStage();
    expect(a).toEqual(b);
    a.fans[0] = true;
    expect(b.fans[0]).toBe(false);
  });
});
