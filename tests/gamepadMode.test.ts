// =============================================================================
// HYDRA-UMC STUDIO - tests/gamepadMode.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The decisions of the gamepad mode, with a made-up pad: the mapping, the dead zone, the speed limit, STOP first, the lost pad, the focus
// and the rules for arming. No hardware is read.
// =============================================================================
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAMEPAD_MODE, applyDeadzone, canArm, createGamepadModeEngine, limitedStep, oppositeAction, parseGamepadMode, previewInputs, readInputs,
  type GamepadFrame, type PadLike,
} from '../src/lib/gamepadMode';

/** A pad with 16 buttons and 4 axes, with the given buttons down and the given axis values. */
function pad(down: number[] = [], axes: number[] = [0, 0, 0, 0]): PadLike {
  return { buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: down.includes(i), value: down.includes(i) ? 1 : 0 })), axes };
}

const MAPPING: Record<string, string> = {
  B0: 'E-STOP', B1: 'START', B2: 'ADD POINT', B3: 'select_robot_2', B4: 'NEXT_ROBOT', B5: 'PREV_ROBOT', B6: 'X+', B7: 'X-',
  AXIS_0_POS: 'X+', AXIS_0_NEG: 'X-', AXIS_1_POS: 'J1+', AXIS_2_POS: 'SPEED+', B8: 'STOP ALL',
};

const cfg = { ...DEFAULT_GAMEPAD_MODE, maxSpeedPercent: 100, heldIntervalMs: 100 };
const frame = (over: Partial<GamepadFrame> & { pad: PadLike | null }): GamepadFrame => ({
  armed: true, focused: true, canMove: true, unanswered: 0, nowMs: 0, mapping: MAPPING, ...over,
});

/** An engine that has seen one neutral frame, so that the wait for every input to be let go is over. */
function readyEngine(config = cfg) {
  const engine = createGamepadModeEngine(config);
  engine.step(frame({ pad: pad(), nowMs: 0 }));
  return engine;
}

describe('the configuration', () => {
  it('starts with safe numbers and every safety switch on', () => {
    expect(parseGamepadMode(undefined)).toEqual(DEFAULT_GAMEPAD_MODE);
    expect(DEFAULT_GAMEPAD_MODE.requireClaim && DEFAULT_GAMEPAD_MODE.stopOnDisconnect && DEFAULT_GAMEPAD_MODE.requireFocus).toBe(true);
    expect(DEFAULT_GAMEPAD_MODE.maxSpeedPercent).toBeLessThan(100);
  });
  it('clamps numbers to their range and ignores values of the wrong type', () => {
    const parsed = parseGamepadMode({ deadzone: 5, maxSpeedPercent: -3, heldIntervalMs: 'fast', maxUnanswered: 99.6, requireClaim: 'no', stopOnDisconnect: false });
    expect(parsed.deadzone).toBe(0.6);
    expect(parsed.maxSpeedPercent).toBe(5);
    expect(parsed.heldIntervalMs).toBe(DEFAULT_GAMEPAD_MODE.heldIntervalMs);
    expect(parsed.maxUnanswered).toBe(8);
    expect(parsed.requireClaim).toBe(true);
    expect(parsed.stopOnDisconnect).toBe(false);
  });
});

describe('the dead zone and the reading of the pad', () => {
  it('maps the dead zone to nothing and a full push to one', () => {
    expect(applyDeadzone(0.2, 0.2)).toBe(0);
    expect(applyDeadzone(-0.1, 0.2)).toBe(0);
    expect(applyDeadzone(1, 0.2)).toBe(1);
    expect(applyDeadzone(-0.6, 0.2)).toBeCloseTo(0.5);
    expect(applyDeadzone(Number.NaN, 0.2)).toBe(0);
  });
  it('lists the buttons down and the sticks past the dead zone by the id of the mapping', () => {
    const inputs = readInputs(pad([3], [0.05, -0.8, 0.9, 0]), 0.2);
    expect([...inputs.keys()].sort()).toEqual(['AXIS_1_NEG', 'AXIS_2_POS', 'B3']);
    expect(inputs.get('B3')).toBe(1);
    expect(inputs.get('AXIS_1_NEG')).toBeCloseTo(0.75);
  });
  it('a wider dead zone ignores a small push', () => {
    expect(readInputs(pad([], [0.3, 0, 0, 0]), 0.2).has('AXIS_0_POS')).toBe(true);
    expect(readInputs(pad([], [0.3, 0, 0, 0]), 0.4).has('AXIS_0_POS')).toBe(false);
  });
  it('the preview gives each live input with how hard it is pushed and its action', () => {
    expect(previewInputs(null, MAPPING, 0.2)).toEqual([]);
    expect(previewInputs(pad([6], [0, 0, 0, 0]), MAPPING, 0.2)).toEqual([{ input: 'B6', push: 1, action: 'X+' }]);
    expect(previewInputs(pad([13]), MAPPING, 0.2)[0].action).toBe('');
  });
});

describe('the mapping gives the events', () => {
  it('holds an action once per interval while the input stays down', () => {
    const engine = readyEngine();
    const first = engine.step(frame({ pad: pad([6]), nowMs: 100 }));
    expect(first.events).toEqual([{ type: 'hold', input: 'B6', action: 'X+', scale: 1 }]);
    expect(engine.step(frame({ pad: pad([6]), nowMs: 150 })).events).toEqual([]);
    expect(engine.step(frame({ pad: pad([6]), nowMs: 210 })).events).toHaveLength(1);
  });
  it('scales the step by how far the stick is pushed, after the dead zone', () => {
    const engine = readyEngine();
    const { events } = engine.step(frame({ pad: pad([], [0.6, 0, 0, 0]), nowMs: 100 }));
    expect(events).toEqual([{ type: 'hold', input: 'AXIS_0_POS', action: 'X+', scale: expect.closeTo(0.5, 5) }]);
  });
  it('an input with no action does nothing, and so does one mapped to none', () => {
    const engine = readyEngine();
    expect(engine.step(frame({ pad: pad([13]), nowMs: 100 })).events).toEqual([]);
    expect(engine.step(frame({ pad: pad([13]), nowMs: 300, mapping: { B13: '' } })).events).toEqual([]);
  });
  it('a press happens once, not while the button stays down', () => {
    const engine = readyEngine();
    expect(engine.step(frame({ pad: pad([1]), nowMs: 100 })).events).toEqual([{ type: 'press', input: 'B1', action: 'START' }]);
    expect(engine.step(frame({ pad: pad([1]), nowMs: 200 })).events).toEqual([]);
    engine.step(frame({ pad: pad(), nowMs: 300 }));
    expect(engine.step(frame({ pad: pad([1]), nowMs: 400 })).events).toHaveLength(1);
  });
  it('changes the robot: a chosen one, the next one and the previous one', () => {
    const engine = readyEngine();
    expect(engine.step(frame({ pad: pad([3]), nowMs: 100 })).events).toEqual([{ type: 'press', input: 'B3', action: 'select_robot_2' }]);
    engine.step(frame({ pad: pad(), nowMs: 150 }));
    expect(engine.step(frame({ pad: pad([4]), nowMs: 200 })).events[0]).toMatchObject({ action: 'NEXT_ROBOT' });
    engine.step(frame({ pad: pad(), nowMs: 250 }));
    expect(engine.step(frame({ pad: pad([5]), nowMs: 300 })).events[0]).toMatchObject({ action: 'PREV_ROBOT' });
  });
  it('two opposite directions pushed together move nothing', () => {
    const engine = readyEngine();
    expect(oppositeAction('X+')).toBe('X-');
    expect(oppositeAction('XY+-')).toBe('XY-+');
    expect(oppositeAction('START')).toBeNull();
    expect(engine.step(frame({ pad: pad([6, 7]), nowMs: 100 })).events).toEqual([]);
  });
  it('waits for every input to be let go after arming', () => {
    const engine = createGamepadModeEngine(cfg);
    expect(engine.step(frame({ pad: pad([6]), nowMs: 0 })).events).toEqual([]);
    expect(engine.step(frame({ pad: pad([6]), nowMs: 200 })).events).toEqual([]);
    engine.step(frame({ pad: pad(), nowMs: 300 }));
    expect(engine.step(frame({ pad: pad([6]), nowMs: 400 })).events).toHaveLength(1);
  });
});

describe('the speed limit and the pace', () => {
  it('caps every step at the speed limit', () => {
    const engine = readyEngine({ ...cfg, maxSpeedPercent: 30 });
    const { events } = engine.step(frame({ pad: pad([6]), nowMs: 100 }));
    expect(events[0]).toMatchObject({ type: 'hold', scale: expect.closeTo(0.3, 5) });
    expect(limitedStep(2, 0.3)).toBeCloseTo(0.6);
    expect(limitedStep(2, 5)).toBe(2);
    expect(limitedStep(2, -1)).toBe(0);
    expect(limitedStep(2, Number.NaN)).toBe(0);
  });
  it('sends no held command while too many are unanswered, but never holds back a press of STOP', () => {
    const engine = readyEngine({ ...cfg, maxUnanswered: 2 });
    expect(engine.step(frame({ pad: pad([6]), nowMs: 100, unanswered: 2 })).events).toEqual([]);
    expect(engine.step(frame({ pad: pad([6]), nowMs: 250, unanswered: 1 })).events).toHaveLength(1);
    expect(engine.step(frame({ pad: pad([0]), nowMs: 260, unanswered: 9 })).events).toEqual([{ type: 'stop', input: 'B0' }]);
  });
});

describe('STOP comes first', () => {
  it('is the only event of its frame, even with a held move and a press in the same frame', () => {
    const engine = readyEngine();
    const { events, status } = engine.step(frame({ pad: pad([0, 1, 6]), nowMs: 100 }));
    expect(events).toEqual([{ type: 'stop', input: 'B0' }]);
    expect(status).toBe('stopped');
  });
  it('works without a reservation and while the rate limit would hold a move back', () => {
    const engine = readyEngine();
    engine.step(frame({ pad: pad([6]), nowMs: 100 }));
    expect(engine.step(frame({ pad: pad([0]), nowMs: 101, canMove: false })).events).toEqual([{ type: 'stop', input: 'B0' }]);
  });
  it('stops again after it was let go, and nothing moves while it is held', () => {
    const engine = readyEngine();
    expect(engine.step(frame({ pad: pad([0]), nowMs: 100 })).events).toHaveLength(1);
    expect(engine.step(frame({ pad: pad([0, 6]), nowMs: 400 })).events).toEqual([]);
    engine.step(frame({ pad: pad(), nowMs: 500 }));
    expect(engine.step(frame({ pad: pad([0]), nowMs: 600 })).events).toHaveLength(1);
  });
  it('a held move that was due is dropped when STOP is pressed, and the pace starts again after', () => {
    const engine = readyEngine();
    engine.step(frame({ pad: pad([6]), nowMs: 100 }));
    engine.step(frame({ pad: pad([0, 6]), nowMs: 110 }));
    engine.step(frame({ pad: pad(), nowMs: 120 }));
    expect(engine.step(frame({ pad: pad([6]), nowMs: 130 })).events).toHaveLength(1);
  });
  it('any input mapped to a stop action stops, whichever button it is', () => {
    const engine = readyEngine();
    expect(engine.step(frame({ pad: pad([], [0, 0, 0, 0]), nowMs: 100, mapping: { ...MAPPING, B12: 'E-STOP ALL' } })).events).toEqual([]);
    expect(engine.step(frame({ pad: pad([12]), nowMs: 200, mapping: { ...MAPPING, B12: 'E-STOP ALL' } })).events).toEqual([{ type: 'stop', input: 'B12' }]);
  });
});

describe('without the right to move', () => {
  it('lets the operator choose a robot but sends no move and no press that acts', () => {
    const engine = readyEngine();
    const blocked = engine.step(frame({ pad: pad([1, 2, 3, 6]), nowMs: 100, canMove: false }));
    expect(blocked.events).toEqual([{ type: 'press', input: 'B3', action: 'select_robot_2' }]);
    expect(blocked.status).toBe('blocked');
  });
  it('is off when not armed: nothing is read, and arming starts over', () => {
    const engine = readyEngine();
    expect(engine.step(frame({ pad: pad([0, 6]), nowMs: 100, armed: false }))).toEqual({ events: [], status: 'off' });
    expect(engine.step(frame({ pad: pad([6]), nowMs: 200 })).events).toEqual([]);
  });
});

describe('a lost pad is a dead-man stop', () => {
  it('gives one lost event when the pad disappears, then nothing', () => {
    const engine = readyEngine();
    engine.step(frame({ pad: pad([6]), nowMs: 100 }));
    expect(engine.step(frame({ pad: null, nowMs: 200 }))).toEqual({ events: [{ type: 'lost' }], status: 'no-pad' });
    expect(engine.step(frame({ pad: null, nowMs: 300 })).events).toEqual([]);
  });
  it('gives none when the pad was never there, or when that safety switch is off', () => {
    expect(createGamepadModeEngine(cfg).step(frame({ pad: null })).events).toEqual([]);
    const lax = readyEngine({ ...cfg, stopOnDisconnect: false });
    expect(lax.step(frame({ pad: null, nowMs: 100 })).events).toEqual([]);
  });
  it('a pad that comes back waits for every input to be let go', () => {
    const engine = readyEngine();
    engine.step(frame({ pad: null, nowMs: 100 }));
    expect(engine.step(frame({ pad: pad([6]), nowMs: 200 })).events).toEqual([]);
  });
});

describe('the focus', () => {
  it('produces no event while the tab has no focus, not even STOP, and a held button is not a new press when the focus returns', () => {
    const engine = readyEngine();
    const unfocused = engine.step(frame({ pad: pad([0, 1, 6]), nowMs: 100, focused: false }));
    expect(unfocused).toEqual({ events: [], status: 'unfocused' });
    expect(engine.step(frame({ pad: pad([1, 6]), nowMs: 200 })).events).toEqual([]);
    engine.step(frame({ pad: pad(), nowMs: 300 }));
    expect(engine.step(frame({ pad: pad([6]), nowMs: 400 })).events).toHaveLength(1);
  });
  it('reads regardless of the focus when that safety switch is off', () => {
    const engine = readyEngine({ ...cfg, requireFocus: false });
    expect(engine.step(frame({ pad: pad([6]), nowMs: 100, focused: false })).events).toHaveLength(1);
  });
  it('a pad lost while the tab has no focus still stops everything, once', () => {
    const engine = readyEngine();
    engine.step(frame({ pad: pad(), nowMs: 100, focused: false }));
    expect(engine.step(frame({ pad: null, nowMs: 200, focused: false })).events).toEqual([{ type: 'lost' }]);
  });
});

describe('who may arm', () => {
  const base = { robotSelected: true, standing: 'mine' as const, padPresent: true, config: cfg };
  it('needs a robot, a reservation of this window and a pad', () => {
    expect(canArm(base)).toEqual({ ok: true });
    expect(canArm({ ...base, robotSelected: false })).toEqual({ ok: false, reason: 'no-robot' });
    expect(canArm({ ...base, standing: 'free' })).toEqual({ ok: false, reason: 'no-claim' });
    expect(canArm({ ...base, standing: 'other-account' })).toEqual({ ok: false, reason: 'no-claim' });
    expect(canArm({ ...base, standing: 'other-controller' })).toEqual({ ok: false, reason: 'no-claim' });
    expect(canArm({ ...base, padPresent: false })).toEqual({ ok: false, reason: 'no-pad' });
  });
  it('does not ask for the reservation when that safety switch is off', () => {
    expect(canArm({ ...base, standing: 'free', config: { ...cfg, requireClaim: false } })).toEqual({ ok: true });
  });
});
