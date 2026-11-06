// =============================================================================
// HYDRA-UMC STUDIO - tests/moduleConfigsPads.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The decisions of the gamepad, heated bed and vacuum table screens, moved out of the components: they must give what the components
// used to compute (the menu of actions in its order, the live inputs of a pad, the layouts a reset restores).
// =============================================================================
import { describe, expect, it } from 'vitest';
import {
  GAMEPAD_BUTTONS, activeGamepadInputs, defaultHeatedBed, defaultVacuumTable, gamepadActionSpecs, withMapping, withModuleEnabled, withModuleField,
} from '../src/lib/moduleConfigs';
import en from '../src/locales/en.json';

describe('the menu of gamepad actions', () => {
  const specs = gamepadActionSpecs();
  it('keeps the order of the menu: none, robots, tool point, diagonals, rotation, joints, table, controls', () => {
    const values = specs.map((spec) => spec.value);
    expect(values.slice(0, 10)).toEqual(['', 'select_robot_1', 'select_robot_2', 'select_robot_3', 'select_robot_4', 'select_robot_5', 'select_robot_6', 'select_robot_7', 'select_robot_8', 'X+']);
    expect(values.slice(9, 21)).toEqual(['X+', 'X-', 'Y+', 'Y-', 'Z+', 'Z-', 'XY++', 'XY+-', 'XY-+', 'XY--', 'ROT+', 'ROT-']);
    expect(values.slice(21, 33)).toEqual(['J1+', 'J1-', 'J2+', 'J2-', 'J3+', 'J3-', 'J4+', 'J4-', 'J5+', 'J5-', 'J6+', 'J6-']);
    expect(values.slice(33)).toEqual(['TX+', 'TX-', 'TY+', 'TY-', 'E-STOP', 'E-STOP ALL', 'START', 'START ALL', 'STOP', 'STOP ALL', 'ADD POINT', 'SPEED+', 'SPEED-']);
    expect(new Set(values).size).toBe(values.length);
  });
  it('every text exists in the English catalogue and its placeholders are given', () => {
    const catalogue = en as unknown as { gamepad_config: { actions: Record<string, string>; buttons: Record<string, string> } };
    for (const spec of specs) {
      const leaf = spec.key.replace('gamepad_config.actions.', '');
      expect(catalogue.gamepad_config.actions[leaf], spec.key).toBeTypeOf('string');
      for (const placeholder of catalogue.gamepad_config.actions[leaf].matchAll(/\{\{(\w+)\}\}/g)) expect(spec.params?.[placeholder[1]], `${spec.key} ${placeholder[1]}`).toBeDefined();
    }
    for (const button of GAMEPAD_BUTTONS) expect(catalogue.gamepad_config.buttons[button.id], button.id).toBeTypeOf('string');
  });
  it('lists 16 buttons and the four half-axes of two sticks', () => {
    expect(GAMEPAD_BUTTONS).toHaveLength(24);
    expect(GAMEPAD_BUTTONS[16].id).toBe('AXIS_0_NEG');
  });
});

describe('the live inputs of a pad', () => {
  it('lights a pressed button and a stick pushed past the dead zone, in either direction', () => {
    const active = activeGamepadInputs([{ pressed: false }, { pressed: true }, { pressed: true }], [-0.5, 0.2, 0.9, 0]);
    expect([...active].sort()).toEqual(['AXIS_0_NEG', 'AXIS_2_POS', 'B1', 'B2']);
  });
  it('a stick exactly on the dead zone is not live, and a tighter dead zone is honoured', () => {
    expect(activeGamepadInputs([], [0.3, -0.3]).size).toBe(0);
    expect([...activeGamepadInputs([], [0.25], 0.2)]).toEqual(['AXIS_0_POS']);
  });
  it('a mapping gets one input changed without touching the given one', () => {
    const before = { B0: 'X+' };
    expect(withMapping(before, 'B1', 'STOP')).toEqual({ B0: 'X+', B1: 'STOP' });
    expect(withMapping(before, 'B0', '')).toEqual({ B0: '' });
    expect(before).toEqual({ B0: 'X+' });
  });
});

describe('the heated bed and the vacuum table', () => {
  it('reset restores the layouts the screens used to write, with the heater, pump and valve off', () => {
    expect(defaultHeatedBed()).toEqual({ enabled: true, modelId: '200x200x5', size: { width: 200, length: 200 }, targetTemp: 60, currentTemp1: 25, currentTemp2: 25, ssrActive: false, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 });
    expect(defaultVacuumTable('m1')).toEqual({ enabled: true, customSize: false, modelId: 'm1', size: { width: 160, length: 120 }, pumpActive: false, valveActive: false, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 });
    expect(defaultHeatedBed().ssrActive).toBe(false);
    expect(defaultHeatedBed()).not.toBe(defaultHeatedBed());
  });
  it('a field or the switch changes a copy, never the module', () => {
    const module = { enabled: false, targetTemp: 60 };
    expect(withModuleField(module, 'targetTemp', 70)).toEqual({ enabled: false, targetTemp: 70 });
    expect(withModuleEnabled(module, true)).toEqual({ enabled: true, targetTemp: 60 });
    expect(withModuleEnabled(undefined as { enabled?: boolean } | undefined, true)).toEqual({ enabled: true });
    expect(module).toEqual({ enabled: false, targetTemp: 60 });
  });
});
