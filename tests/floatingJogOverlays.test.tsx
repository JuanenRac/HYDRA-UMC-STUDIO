// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/floatingJogOverlays.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The three floating jog windows of the robot detail screen (joints, XYZ + base, XY table): what they show, what
// they send to the screen and when they stop the operator from going past a limit.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { JOG_STEP_OPTIONS, JointControlsOverlay, JoystickOverlay, XYTableOverlay } from '../src/components/robotDetail/FloatingJogOverlays';
import type { RobotState } from '../src/store';

vi.mock('../src/components/Joystick3D', () => ({
  Joystick3D: ({ onJog }: { onJog: (dx: number, dy: number, dz: number) => void }) => (
    <button data-testid="joystick" onClick={() => onJog(1, 2, 3)}>joystick</button>
  ),
}));
vi.mock('../src/components/RotaryKnob', () => ({
  RotaryKnob: ({ value, min, max, step, onChange }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) => (
    <input data-testid="knob" type="number" data-min={min} data-max={max} data-step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  ),
}));
vi.mock('../src/components/FuturisticSlider', () => ({
  FuturisticSlider: ({ value, step, onChange }: { value: number; step?: number; onChange: (v: number) => void }) => (
    <input data-testid="slider" type="number" data-step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  ),
}));

afterEach(cleanup);

// The windows only translate through `t(key, fallback)`: echo the fallback so the tests read like the screen.
const t = (_key: string, fallback?: string) => fallback ?? _key;

const robot = {
  model: 'Parol6 (6-DOF)',
  joints: { j1: 10, j2: 20, j3: 30, j4: 40, j5: 50, j6: 60 },
  pos: { tx: 12.345, ty: 7 },
  xyTable: { tableSize: { width: 800, length: 600 } },
} as unknown as RobotState;

describe('JOG_STEP_OPTIONS', () => {
  it('offers the fixed list of jog steps', () => {
    expect(JOG_STEP_OPTIONS).toEqual([0.1, 1, 5, 10, 22.5, 25, 45, 50, 90, 100]);
  });
});

describe('JointControlsOverlay', () => {
  function mount() {
    const props = {
      robot, jogStep: 5, playbackSpeed: 100, playbackAcceleration: 200,
      onJogStepChange: vi.fn(), onSpeedChange: vi.fn(), onAccelerationChange: vi.fn(), onJointChange: vi.fn(), t,
    };
    render(<JointControlsOverlay {...props} />);
    return props;
  }

  it('shows the step, the speed and acceleration percentages and one block per joint', () => {
    mount();
    expect(screen.getByText('Joint Controls')).toBeTruthy();
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('5');
    expect(screen.getAllByRole('option')).toHaveLength(JOG_STEP_OPTIONS.length);
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('200%')).toBeTruthy();
    for (const j of ['j1', 'j2', 'j3', 'j4', 'j5', 'j6']) expect(screen.getByText(j)).toBeTruthy();
    // 2 knobs + 2 sliders for speed/acceleration, then a knob and a slider for each of the 6 joints.
    expect(screen.getAllByTestId('knob')).toHaveLength(8);
    expect(screen.getAllByTestId('slider')).toHaveLength(8);
  });

  it('reports the chosen step as a number', () => {
    const props = mount();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '22.5' } });
    expect(props.onJogStepChange).toHaveBeenCalledWith(22.5);
  });

  it('reports speed, acceleration and joint changes and feeds the jog step to the joint controls', () => {
    const props = mount();
    const knobs = screen.getAllByTestId('knob');
    fireEvent.change(knobs[0], { target: { value: '150' } });
    expect(props.onSpeedChange).toHaveBeenCalledWith(150);
    fireEvent.change(knobs[1], { target: { value: '250' } });
    expect(props.onAccelerationChange).toHaveBeenCalledWith(250);
    fireEvent.change(knobs[2], { target: { value: '11' } });
    expect(props.onJointChange).toHaveBeenCalledWith('j1', 11);
    expect(knobs[2].getAttribute('data-step')).toBe('5');
    expect(knobs[0].getAttribute('data-step')).toBe('5');
    expect(knobs[0].getAttribute('data-min')).toBe('10');
    expect(knobs[0].getAttribute('data-max')).toBe('500');
  });

  it('collapses to its title bar', () => {
    mount();
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('Joint Controls')).toBeTruthy();
  });
});

describe('JoystickOverlay', () => {
  function mount(j1Value: number, j1Limits: [number, number] = [-90, 90]) {
    const props = { jogStep: 10, onXYZJog: vi.fn(), onJ1Jog: vi.fn(), j1Value, j1Limits, t };
    render(<JoystickOverlay {...props} />);
    return props;
  }

  it('shows the jog step in the title and the base angle', () => {
    mount(12.34);
    expect(screen.getByText(/XYZ Jog/).textContent).toContain('(10)');
    expect(screen.getByText(/J1 12\.3/)).toBeTruthy();
  });

  it('passes the joystick movement through', () => {
    const props = mount(0);
    fireEvent.click(screen.getByTestId('joystick'));
    expect(props.onXYZJog).toHaveBeenCalledWith(1, 2, 3);
  });

  it('rotates the base in both directions inside the limits', () => {
    const props = mount(0);
    fireEvent.click(screen.getByRole('button', { name: 'Rotate base counter-clockwise' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rotate base clockwise' }));
    expect(props.onJ1Jog.mock.calls).toEqual([[-1], [1]]);
  });

  it('disables each rotation button at its own limit', () => {
    mount(-90);
    expect((screen.getByRole('button', { name: 'Rotate base counter-clockwise' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Rotate base clockwise' }) as HTMLButtonElement).disabled).toBe(false);
    cleanup();
    mount(90);
    expect((screen.getByRole('button', { name: 'Rotate base counter-clockwise' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Rotate base clockwise' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('collapses to its title bar', () => {
    mount(0);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(screen.queryByTestId('joystick')).toBeNull();
  });
});

describe('XYTableOverlay', () => {
  it('shows both axes with their position and the size of the table as the limit', () => {
    render(<XYTableOverlay robot={robot} jogStep={2} onAxisChange={vi.fn()} t={t} />);
    expect(screen.getByText('tx')).toBeTruthy();
    expect(screen.getByText('ty')).toBeTruthy();
    expect(screen.getByText('12.35')).toBeTruthy();
    const knobs = screen.getAllByTestId('knob');
    expect(knobs).toHaveLength(2);
    expect(knobs[0].getAttribute('data-max')).toBe('800');
    expect(knobs[1].getAttribute('data-max')).toBe('600');
    expect(knobs[0].getAttribute('data-step')).toBe('2');
  });

  it('falls back to 500 when the table has no size and reports the axis that moved', () => {
    const bare = { ...robot, xyTable: undefined } as unknown as RobotState;
    const onAxisChange = vi.fn();
    render(<XYTableOverlay robot={bare} jogStep={1} onAxisChange={onAxisChange} t={t} />);
    const knobs = screen.getAllByTestId('knob');
    expect(knobs[0].getAttribute('data-max')).toBe('500');
    fireEvent.change(knobs[1], { target: { value: '33' } });
    expect(onAxisChange).toHaveBeenCalledWith('ty', 33);
  });

  it('collapses to its title bar', () => {
    render(<XYTableOverlay robot={robot} jogStep={1} onAxisChange={vi.fn()} t={t} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryAllByTestId('knob')).toHaveLength(0);
  });
});
