// =============================================================================
// HYDRA-UMC STUDIO - tests/moduleConfigs.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The decisions of the ATC, XY table and rack screens, moved out of the components: they must give what the components used to compute.
// =============================================================================
import { describe, expect, it } from 'vitest';
import type { ATCConfig } from '../src/store';
import { URTC_TOOLS } from '../src/components/robotDetail/shared';
import {
  atcGridChange, atcPositionChange, atcPositionOf, atcRevolverSlotsChange, atcSlotCount, atcToolsWithTool, configFileName, defaultAtcConfig,
  defaultRackSystem, jogTarget, parseAtcConfigText, toggledSlots, xyTableResetLayout, xyTableWithSize, zeroPosition,
} from '../src/lib/moduleConfigs';

const ZERO = { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, tx: 0, ty: 0 };

describe('ATC tools', () => {
  it('starts as a vertical panel of 2x2 without tools, and each call gives its own object', () => {
    expect(defaultAtcConfig()).toEqual({ type: 'vertical_panel', panelGrid: '2x2', revolverSlots: 8, tools: [] });
    const a = defaultAtcConfig();
    a.tools.push({ slot: 1, tool: 'None' });
    expect(defaultAtcConfig().tools).toEqual([]);
  });

  it('counts the slots of a panel as rows by columns and of a revolver as its slots', () => {
    const base = defaultAtcConfig();
    expect(atcSlotCount({ ...base, type: 'vertical_panel', panelGrid: '3x4' })).toBe(12);
    expect(atcSlotCount({ ...base, type: 'horizontal_panel', panelGrid: '1x2' })).toBe(2);
    expect(atcSlotCount({ ...base, type: 'revolver', panelGrid: '4x4', revolverSlots: 6 })).toBe(6);
  });

  it('forgets the tools when the layout changes', () => {
    expect(atcGridChange('3x3')).toEqual({ panelGrid: '3x3', tools: [] });
    expect(atcRevolverSlotsChange(10)).toEqual({ revolverSlots: 10, tools: [] });
  });

  it('puts a tool in a slot: a listed slot keeps its position, a new one starts at zero, and the list given is not changed', () => {
    const before = [{ slot: 1, tool: 'None' as const, pos: { ...ZERO, j1: 5 } }];
    const changed = atcToolsWithTool(before, 1, 'Gimbal Gripper');
    expect(changed).toEqual([{ slot: 1, tool: 'Gimbal Gripper', pos: { ...ZERO, j1: 5 } }]);
    expect(before[0].tool).toBe('None');
    expect(atcToolsWithTool(before, 2, 'NEMA Gripper')).toEqual([before[0], { slot: 2, tool: 'NEMA Gripper', pos: ZERO }]);
  });

  it('changes one coordinate of a slot, adding the slot with no tool when it is not listed, and of the revolver', () => {
    const config: ATCConfig = { ...defaultAtcConfig(), tools: [{ slot: 1, tool: 'Gimbal Gripper', pos: { ...ZERO, j2: 2 } }] };
    expect(atcPositionChange(config, 1, 'j1', 9)).toEqual({ tools: [{ slot: 1, tool: 'Gimbal Gripper', pos: { ...ZERO, j1: 9, j2: 2 } }] });
    expect(atcPositionChange(config, 3, 'tx', 4)).toEqual({ tools: [config.tools[0], { slot: 3, tool: 'None', pos: { ...ZERO, tx: 4 } }] });
    expect(atcPositionChange(config, 'revolver', 'j6', 1)).toEqual({ revolverPos: { ...ZERO, j6: 1 } });
    expect(config.tools[0].pos).toEqual({ ...ZERO, j2: 2 });
  });

  it('shows the saved position of a slot or the revolver, or zeros', () => {
    const config: ATCConfig = { ...defaultAtcConfig(), revolverPos: { ...ZERO, j3: 3 }, tools: [{ slot: 2, tool: 'None', pos: { ...ZERO, j4: 4 } }, { slot: 5, tool: 'None' }] };
    expect(atcPositionOf(config, 'revolver')).toEqual({ ...ZERO, j3: 3 });
    expect(atcPositionOf(config, 2)).toEqual({ ...ZERO, j4: 4 });
    expect(atcPositionOf(config, 5)).toEqual(ZERO);
    expect(atcPositionOf(config, 9)).toEqual(ZERO);
    expect(atcPositionOf(defaultAtcConfig(), 'revolver')).toEqual(ZERO);
  });

  it('loads a file only when it has a type, and lets text that is not JSON throw', () => {
    expect(parseAtcConfigText(JSON.stringify(defaultAtcConfig()))).toEqual(defaultAtcConfig());
    expect(parseAtcConfigText('{"panelGrid":"2x2"}')).toBeNull();
    expect(parseAtcConfigText('null')).toBeNull();
    expect(() => parseAtcConfigText('{')).toThrow();
  });

  it('names the file after the robot, with underscores for its spaces', () => {
    expect(configFileName('atc_config', 'Arm  Left 1')).toBe('atc_config_Arm_Left_1.json');
    expect(configFileName('xytable_config', 'A1')).toBe('xytable_config_A1.json');
  });

  it('keeps one list of tools for the dashboard and the ATC screen', () => {
    expect(URTC_TOOLS[0]).toBe('None');
    expect(URTC_TOOLS).toHaveLength(26);
    expect(new Set(URTC_TOOLS).size).toBe(URTC_TOOLS.length);
  });
});

describe('XY table', () => {
  const size = { width: 300, length: 200 };
  it('jogs one axis by the step in the direction given and keeps the other where it is', () => {
    expect(jogTarget({ x: 100, y: 50 }, size, 'x', 1, 10)).toEqual({ x: 110, y: 50 });
    expect(jogTarget({ x: 100, y: 50 }, size, 'y', -1, 10)).toEqual({ x: 100, y: 40 });
  });
  it('stops at the edges of the table', () => {
    expect(jogTarget({ x: 295, y: 0 }, size, 'x', 1, 10)).toEqual({ x: 300, y: 0 });
    expect(jogTarget({ x: 5, y: 0 }, size, 'x', -1, 10)).toEqual({ x: 0, y: 0 });
    expect(jogTarget({ x: 0, y: 195 }, size, 'y', 1, 10)).toEqual({ x: 0, y: 200 });
    expect(jogTarget({ x: 0, y: 3 }, size, 'y', -1, 10)).toEqual({ x: 0, y: 0 });
  });
  it('restores the layout of a reset and keeps the rest of the table', () => {
    expect(xyTableResetLayout({ pos: { x: 7, y: 8 }, tableSize: { width: 1, length: 2 } } as never)).toEqual({
      pos: { x: 7, y: 8 }, tableSize: { width: 300, length: 300 }, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1,
    });
    expect(xyTableResetLayout(undefined)).toEqual({ pos: { x: 0, y: 0 }, tableSize: { width: 300, length: 300 }, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 });
  });
  it('changes one side of the table and leaves the other', () => {
    const table = { tableSize: { width: 10, length: 20 }, pos: { x: 1, y: 2 } };
    expect(xyTableWithSize(table, 'length', 99)).toEqual({ tableSize: { width: 10, length: 99 }, pos: { x: 1, y: 2 } });
    expect(table.tableSize.length).toBe(20);
  });
});

describe('racks', () => {
  it('resets to an input rack and an output rack of 24 usable slots at zero', () => {
    const system = defaultRackSystem();
    expect(system.enabled).toBe(true);
    expect(system.rack1).toEqual({ type: 'Input', capacity: 24, usableSlots: Array(24).fill(true), basePickupPos: ZERO, renderPos: { x: 300, y: 150 }, renderRot: 0, renderScale: 1 });
    expect(system.rack2).toEqual({ type: 'Output', capacity: 24, usableSlots: Array(24).fill(true), basePickupPos: ZERO, renderPos: { x: -300, y: 150 }, renderRot: 0, renderScale: 1 });
    system.rack1.usableSlots[0] = false;
    expect(defaultRackSystem().rack1.usableSlots[0]).toBe(true);
    expect(zeroPosition()).toEqual(ZERO);
  });
  it('turns one slot the other way round without changing the list given', () => {
    const slots = [true, true, false];
    expect(toggledSlots(slots, 0)).toEqual([false, true, false]);
    expect(toggledSlots(slots, 2)).toEqual([true, true, true]);
    expect(slots).toEqual([true, true, false]);
  });
});
