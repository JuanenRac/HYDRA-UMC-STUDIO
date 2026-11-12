// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/moduleScreens.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The ATC, XY table and rack screens after their decisions moved to lib/moduleConfigs.ts: what a click asks the store for is what it asked
// before (enable, change the grid, put a tool in a slot, jog the table, reset, toggle a slot).
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '../src/i18n';
import { defaultControllers } from '../src/store';
import { HydraStoreProviders } from '../src/storeContexts';
import { ATCToolsConfig } from '../src/components/ATCToolsConfig';
import { XYTableConfig } from '../src/components/XYTableConfig';
import { RackConfigView } from '../src/components/RackConfigView';

vi.mock('@react-three/fiber', () => ({ Canvas: () => null }));
vi.mock('@react-three/drei', () => ({ OrbitControls: () => null, Grid: () => null, Box: () => null, Cylinder: () => null }));
vi.mock('../src/components/3d/Shared3DEnvironment', () => ({ Shared3DEnvironment: () => null }));
vi.mock('../src/components/3d/Rack3DView', () => ({ default: () => null }));

afterEach(cleanup);

const ZERO = { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, tx: 0, ty: 0 };

function mount(node: React.ReactElement, robotPatch: Record<string, unknown>) {
  const base = defaultControllers[0].robots[0];
  const robot = { ...base, ...robotPatch };
  const updateRobot = vi.fn();
  const sendRobotCommand = vi.fn(async () => undefined);
  const value = { robots: [robot], updateRobot, sendRobotCommand };
  render(<HydraStoreProviders value={value as never}>{node}</HydraStoreProviders>);
  return { updateRobot, sendRobotCommand, robot };
}

describe('ATCToolsConfig', () => {
  it('enables a changer with the default layout when the robot has none', () => {
    const { updateRobot, robot } = mount(<ATCToolsConfig />, { atc: undefined });
    fireEvent.click(screen.getByRole('button', { name: /enable atc/i }));
    expect(updateRobot).toHaveBeenCalledWith(robot.id, { atc: { type: 'vertical_panel', panelGrid: '2x2', revolverSlots: 8, tools: [] } });
  });

  it('forgets the tools when the grid changes, and removes the changer', () => {
    const { updateRobot, robot } = mount(<ATCToolsConfig />, { atc: { type: 'vertical_panel', panelGrid: '2x2', revolverSlots: 8, tools: [{ slot: 1, tool: 'Gimbal Gripper' }] } });
    fireEvent.change(screen.getByDisplayValue('2x2 Grid'), { target: { value: '3x3' } });
    expect(updateRobot).toHaveBeenLastCalledWith(robot.id, { atc: { type: 'vertical_panel', panelGrid: '3x3', revolverSlots: 8, tools: [] } });
    fireEvent.click(screen.getByRole('button', { name: /remove module/i }));
    expect(updateRobot).toHaveBeenLastCalledWith(robot.id, { atc: undefined });
  });

  it('offers a tool for each slot of the grid (counted from 0) and puts the chosen one in its slot without touching the saved list', () => {
    const saved = [{ slot: 1, tool: 'None', pos: { ...ZERO, j1: 4 } }];  // slot 1 is the second one
    const { updateRobot, robot } = mount(<ATCToolsConfig />, { atc: { type: 'vertical_panel', panelGrid: '1x2', revolverSlots: 8, tools: saved } });
    const toolSelects = screen.getAllByRole('combobox').filter((el) => (el as HTMLSelectElement).value === 'None');
    expect(toolSelects.length).toBe(2);
    fireEvent.change(toolSelects[1], { target: { value: 'NEMA Gripper' } });
    expect(updateRobot).toHaveBeenLastCalledWith(robot.id, expect.objectContaining({ atc: expect.objectContaining({ tools: [{ slot: 1, tool: 'NEMA Gripper', pos: { ...ZERO, j1: 4 } }] }) }));
    expect(saved[0].tool).toBe('None');
  });
});

describe('XYTableConfig', () => {
  const table = { pos: { x: 295, y: 50 }, tableSize: { width: 300, length: 200 } };

  it('jogs one axis and stops at the edge of the table', () => {
    const { sendRobotCommand, robot } = mount(<XYTableConfig />, { hasXYTable: true, xyTable: table });
    fireEvent.click(screen.getAllByRole('button').filter((b) => b.querySelector('svg.lucide-arrow-right'))[0]);
    expect(sendRobotCommand).toHaveBeenCalledTimes(1);
    const call = sendRobotCommand.mock.calls[0] as unknown as [number, string, Record<string, unknown>, (r: unknown) => unknown];
    expect(call.slice(0, 3)).toEqual([robot.id, 'table', { x: 300, y: 50, mode: 'absolute' }]);
    const patch = call[3]({ pos: { ...ZERO }, xyTable: table }) as { pos: Record<string, number>; xyTable: { pos: unknown } };
    expect(patch.pos).toMatchObject({ tx: 300, ty: 50 });
    expect(patch.xyTable.pos).toEqual({ x: 300, y: 50 });
  });

  it('adds a table to a robot without one, and resets the layout while sending the table home', () => {
    const first = mount(<XYTableConfig />, { hasXYTable: false, xyTable: undefined });
    fireEvent.click(first.updateRobot.mock.calls.length === 0 ? screen.getAllByRole('button').find((b) => /add|enable/i.test(b.textContent ?? ''))! : document.body);
    expect(first.updateRobot).toHaveBeenCalledWith(first.robot.id, { hasXYTable: true, xyTable: { pos: { x: 0, y: 0 }, tableSize: { width: 300, length: 300 }, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 } });
    cleanup();
    const { updateRobot, sendRobotCommand, robot } = mount(<XYTableConfig />, { hasXYTable: true, xyTable: table });
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(updateRobot).toHaveBeenCalledWith(robot.id, { xyTable: { pos: { x: 295, y: 50 }, tableSize: { width: 300, length: 300 }, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 } });
    expect(sendRobotCommand.mock.calls[0].slice(0, 3)).toEqual([robot.id, 'table', { x: 0, y: 0, mode: 'absolute' }]);
  });
});

describe('RackConfigView', () => {
  const rack = (type: string) => ({ type, capacity: 4, usableSlots: [true, true, true, true], basePickupPos: { ...ZERO }, renderPos: { x: 0, y: 0 }, renderRot: 0, renderScale: 1 });
  const system = { enabled: true, rack1: rack('Input'), rack2: rack('Output') };

  it('resets to the two racks of 24 slots', () => {
    const { updateRobot, robot } = mount(<RackConfigView />, { rackSystem: system });
    fireEvent.click(screen.getAllByRole('button', { name: /reset/i })[0]);
    const given = updateRobot.mock.calls[0][1].rackSystem;
    expect(updateRobot.mock.calls[0][0]).toBe(robot.id);
    expect(given.enabled).toBe(true);
    expect(given.rack1.usableSlots).toHaveLength(24);
    expect(given.rack1.type).toBe('Input');
    expect(given.rack2.renderPos).toEqual({ x: -300, y: 150 });
  });

  it('turns a slot off without changing the saved list', () => {
    const { updateRobot, robot } = mount(<RackConfigView />, { rackSystem: system });
    const slotButtons = screen.getAllByRole('button').filter((b) => /^[0-9]+$/.test((b.textContent ?? '').trim()));
    expect(slotButtons.length).toBeGreaterThanOrEqual(4);
    fireEvent.click(slotButtons[0]);
    const given = updateRobot.mock.calls[0][1].rackSystem;
    expect(updateRobot.mock.calls[0][0]).toBe(robot.id);
    expect(given.rack1.usableSlots.filter(Boolean)).toHaveLength(3);
    expect(system.rack1.usableSlots).toEqual([true, true, true, true]);
  });
});
