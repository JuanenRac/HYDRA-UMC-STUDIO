// =============================================================================
// HYDRA-UMC STUDIO - src/lib/moduleConfigs.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The decisions of the module screens (ATC tools, XY table, racks) that used to be written inside the components: how many slots a tool
// changer has, the tool and position of a slot, what a jog of the table asks for, the layout a reset restores, which slot of a rack is
// usable. Moved out unchanged so that they can be tested without a screen; the components only draw and call the store.
import type { ATCConfig, ATCGrid, RackConfig, ToolType } from '../store';

export type JointPosition = { j1: number; j2: number; j3: number; j4: number; j5: number; j6: number; tx: number; ty: number };

/** A pose with every joint and the table at zero. A fresh object each time: nobody shares it. */
export const zeroPosition = (): JointPosition => ({ j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, tx: 0, ty: 0 });

// ---------------------------------------------------------------------------
// ATC tools
// ---------------------------------------------------------------------------
/** What "Enable ATC" and "Reset" give: a vertical panel of 2x2 slots without tools. */
export function defaultAtcConfig(): ATCConfig {
  return { type: 'vertical_panel', panelGrid: '2x2', revolverSlots: 8, tools: [] };
}

/** How many slots the tool changer has: rows x columns of a panel, or the slots of a revolver. */
export function atcSlotCount(config: Pick<ATCConfig, 'type' | 'panelGrid' | 'revolverSlots'>): number {
  if (config.type === 'vertical_panel' || config.type === 'horizontal_panel') {
    const [rows, columns] = config.panelGrid.split('x').map(Number);
    return rows * columns;
  }
  return config.revolverSlots;
}

/** The change for a new grid: the tools of the old layout are forgotten. */
export const atcGridChange = (grid: ATCGrid): Partial<ATCConfig> => ({ panelGrid: grid, tools: [] });

/** The change for a new number of revolver slots: the tools of the old layout are forgotten. */
export const atcRevolverSlotsChange = (slots: number): Partial<ATCConfig> => ({ revolverSlots: slots, tools: [] });

/** The tools with `tool` in `slot`: the slot keeps its position, a slot not listed yet is added at zero. The given list is not changed. */
export function atcToolsWithTool(tools: ATCConfig['tools'], slot: number, tool: ToolType): ATCConfig['tools'] {
  const index = tools.findIndex((entry) => entry.slot === slot);
  if (index >= 0) return tools.map((entry, i) => (i === index ? { ...entry, tool } : entry));
  return [...tools, { slot, tool, pos: zeroPosition() }];
}

/** The change for one coordinate of a slot (or of the revolver): a slot not listed yet is added with no tool. */
export function atcPositionChange(config: ATCConfig, slot: number | 'revolver', field: string, value: number): Partial<ATCConfig> {
  if (slot === 'revolver') {
    const current = config.revolverPos || zeroPosition();
    return { revolverPos: { ...current, [field]: value } };
  }
  const tools = [...config.tools];
  let index = tools.findIndex((entry) => entry.slot === slot);
  if (index === -1) {
    tools.push({ slot, tool: 'None', pos: zeroPosition() });
    index = tools.length - 1;
  }
  const current = tools[index].pos || zeroPosition();
  tools[index] = { ...tools[index], pos: { ...current, [field]: value } };
  return { tools };
}

/** The position shown for a slot (or the revolver): the saved one, or all zeros. */
export function atcPositionOf(config: ATCConfig, slot: number | 'revolver'): NonNullable<ATCConfig['revolverPos']> {
  const pos = slot === 'revolver' ? config.revolverPos : config.tools.find((entry) => entry.slot === slot)?.pos;
  return pos || zeroPosition();
}

/** The configuration in a file's text; null when it has no `type` (so nothing is loaded from a file that is not one). Text that is not JSON throws, as JSON.parse does. */
export function parseAtcConfigText(text: string): ATCConfig | null {
  const json = JSON.parse(text);
  return json && json.type ? (json as ATCConfig) : null;
}

/** The name of the file a configuration is saved to: the prefix, the name of the robot with its spaces as underscores, and .json. */
export const configFileName = (prefix: string, robotName: string): string => `${prefix}_${robotName.replace(/\s+/g, '_')}.json`;

// ---------------------------------------------------------------------------
// XY table
// ---------------------------------------------------------------------------
export type TableSize = { width: number; length: number };
export type TablePos = { x: number; y: number };

/** Where a jog of one axis ends: the step in the direction given, kept inside the table. The other axis stays where it is. */
export function jogTarget(pos: TablePos, size: TableSize, axis: 'x' | 'y', direction: number, step: number): TablePos {
  let next = pos[axis] + direction * step;
  if (axis === 'x') next = Math.max(0, Math.min(next, size.width));
  if (axis === 'y') next = Math.max(0, Math.min(next, size.length));
  return { x: axis === 'x' ? next : pos.x, y: axis === 'y' ? next : pos.y };
}

/** The layout a reset restores: 300 x 300 mm in the world origin, not turned, at scale 1. The position (and what the table holds) is kept. */
export function xyTableResetLayout<T extends { pos?: TablePos }>(xyTable: T | undefined): Record<string, unknown> {
  return { ...(xyTable ?? { pos: { x: 0, y: 0 } }), tableSize: { width: 300, length: 300 }, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 };
}

/** The table with one side changed. */
export function xyTableWithSize<T extends { tableSize: TableSize }>(xyTable: T, axis: 'width' | 'length', value: number): T {
  return { ...xyTable, tableSize: { ...xyTable.tableSize, [axis]: value } };
}

// ---------------------------------------------------------------------------
// Racks
// ---------------------------------------------------------------------------
export type RackSystem = { enabled: boolean; rack1: RackConfig; rack2: RackConfig };

/** What "Reset" gives: the input rack on one side and the output rack on the other, 24 usable slots each, every position at zero. */
export function defaultRackSystem(): RackSystem {
  const rack = (type: 'Input' | 'Output', x: number): RackConfig => ({
    type,
    capacity: 24,
    usableSlots: Array(24).fill(true),
    basePickupPos: zeroPosition(),
    renderPos: { x, y: 150 },
    renderRot: 0,
    renderScale: 1,
  });
  return { enabled: true, rack1: rack('Input', 300), rack2: rack('Output', -300) };
}

/** The usable slots with `index` the other way round. The given list is not changed. */
export function toggledSlots(slots: boolean[], index: number): boolean[] {
  const next = [...slots];
  next[index] = !next[index];
  return next;
}

// ---------------------------------------------------------------------------
// Heated bed and vacuum table
// ---------------------------------------------------------------------------
/** What "Reset" gives a heated bed: 200 x 200 at 60 degrees, the heater off, centred at the origin. */
export function defaultHeatedBed() {
  return { enabled: true, modelId: '200x200x5', size: { width: 200, length: 200 }, targetTemp: 60, currentTemp1: 25, currentTemp2: 25, ssrActive: false, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 };
}

/** What "Reset" gives a vacuum table: the first model of the catalogue, the pump and the valve off, centred at the origin. */
export function defaultVacuumTable(firstModelId: string) {
  return { enabled: true, customSize: false, modelId: firstModelId, size: { width: 160, length: 120 }, pumpActive: false, valveActive: false, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 };
}

/** The module with one field set. The given module is not changed. */
export function withModuleField<T extends object>(module: T | undefined, field: string, value: unknown): T {
  return { ...(module as T), [field]: value };
}

/** The module switched on or off (the rest of it stays). */
export function withModuleEnabled<T extends { enabled?: boolean }>(module: T | undefined, enabled: boolean): T {
  return { ...(module as T), enabled };
}

// ---------------------------------------------------------------------------
// Gamepad
// ---------------------------------------------------------------------------
/** The inputs of a pad the mapping table lists, in the order of the table, with the English name used when a language has none. */
export const GAMEPAD_BUTTONS: ReadonlyArray<{ id: string; fallback: string }> = [
  ['B0', 'A / Cross'], ['B1', 'B / Circle'], ['B2', 'X / Square'], ['B3', 'Y / Triangle'], ['B4', 'LB / L1'], ['B5', 'RB / R1'], ['B6', 'LT / L2'], ['B7', 'RT / R2'],
  ['B8', 'Select / Share'], ['B9', 'Start / Options'], ['B10', 'L3 (Stick Click)'], ['B11', 'R3 (Stick Click)'],
  ['B12', 'D-Pad Up'], ['B13', 'D-Pad Down'], ['B14', 'D-Pad Left'], ['B15', 'D-Pad Right'],
  ['AXIS_0_NEG', 'Left Stick Left'], ['AXIS_0_POS', 'Left Stick Right'], ['AXIS_1_NEG', 'Left Stick Up'], ['AXIS_1_POS', 'Left Stick Down'],
  ['AXIS_2_NEG', 'Right Stick Left'], ['AXIS_2_POS', 'Right Stick Right'], ['AXIS_3_NEG', 'Right Stick Up'], ['AXIS_3_POS', 'Right Stick Down'],
].map(([id, fallback]) => ({ id, fallback }));

/** An action a button can be given: its value, the key of its text, the English fallback and the placeholders of the text. */
export interface GamepadActionSpec { value: string; key: string; fallback: string; params?: Record<string, string | number> }

/** Every action in the order the menu lists it: none, robot selection, the tool point (XYZ, the four diagonals, rotation), joints, table, controls. */
export function gamepadActionSpecs(): GamepadActionSpec[] {
  const pair = (values: string[], plusKey: string, minusKey: string, plusFallback: string, minusFallback: string, name: 'axis' | 'j' | 'a'): GamepadActionSpec[] =>
    values.flatMap((v) => [
      { value: `${v}+`, key: plusKey, fallback: plusFallback, params: { [name]: v } },
      { value: `${v}-`, key: minusKey, fallback: minusFallback, params: { [name]: v } },
    ]);
  return [
    { value: '', key: 'gamepad_config.actions.none', fallback: 'None' },
    ...Array.from({ length: 8 }, (_, i) => ({ value: `select_robot_${i + 1}`, key: 'gamepad_config.actions.select_robot', fallback: 'Select Robot {{n}}', params: { n: i + 1 } })),
    ...pair(['X', 'Y', 'Z'], 'gamepad_config.actions.cartesian_plus', 'gamepad_config.actions.cartesian_minus', '{{axis}} +', '{{axis}} -', 'axis'),
    { value: 'XY++', key: 'gamepad_config.actions.diag_pp', fallback: 'X+ Y+' },
    { value: 'XY+-', key: 'gamepad_config.actions.diag_pm', fallback: 'X+ Y-' },
    { value: 'XY-+', key: 'gamepad_config.actions.diag_mp', fallback: 'X- Y+' },
    { value: 'XY--', key: 'gamepad_config.actions.diag_mm', fallback: 'X- Y-' },
    { value: 'ROT+', key: 'gamepad_config.actions.rotation_plus', fallback: 'Rotate +' },
    { value: 'ROT-', key: 'gamepad_config.actions.rotation_minus', fallback: 'Rotate -' },
    ...pair(['J1', 'J2', 'J3', 'J4', 'J5', 'J6'], 'gamepad_config.actions.joint_plus', 'gamepad_config.actions.joint_minus', '{{j}} +', '{{j}} -', 'j'),
    ...pair(['TX', 'TY'], 'gamepad_config.actions.table_plus', 'gamepad_config.actions.table_minus', 'Table {{a}} +', 'Table {{a}} -', 'a'),
    { value: 'E-STOP', key: 'gamepad_config.actions.estop', fallback: 'E-STOP' },
    { value: 'E-STOP ALL', key: 'gamepad_config.actions.estop_all', fallback: 'E-STOP ALL' },
    { value: 'START', key: 'gamepad_config.actions.start', fallback: 'START' },
    { value: 'START ALL', key: 'gamepad_config.actions.start_all', fallback: 'START ALL' },
    { value: 'STOP', key: 'gamepad_config.actions.stop', fallback: 'STOP' },
    { value: 'STOP ALL', key: 'gamepad_config.actions.stop_all', fallback: 'STOP ALL' },
    { value: 'ADD POINT', key: 'gamepad_config.actions.add_point', fallback: 'ADD POINT' },
    { value: 'SPEED+', key: 'gamepad_config.actions.speed_plus', fallback: 'Speed +' },
    { value: 'SPEED-', key: 'gamepad_config.actions.speed_minus', fallback: 'Speed -' },
  ];
}

/** The inputs that are live right now: a pressed button, or a stick pushed past the dead zone (looser than the one that drives a robot, as it only lights a row). */
export function activeGamepadInputs(buttons: ReadonlyArray<{ pressed: boolean }>, axes: readonly number[], deadzone = 0.3): Set<string> {
  const active = new Set<string>();
  buttons.forEach((button, i) => { if (button.pressed) active.add(`B${i}`); });
  axes.forEach((value, i) => {
    if (value < -deadzone) active.add(`AXIS_${i}_NEG`);
    if (value > deadzone) active.add(`AXIS_${i}_POS`);
  });
  return active;
}

/** The mapping with one input given an action. The given mapping is not changed. */
export function withMapping(mapping: Record<string, string>, input: string, action: string): Record<string, string> {
  return { ...mapping, [input]: action };
}
