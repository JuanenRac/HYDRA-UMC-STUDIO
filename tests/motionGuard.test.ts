// =============================================================================
// HYDRA-UMC STUDIO - tests/motionGuard.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { guardCommand, guardJogStep } from '../src/lib/motionGuard';
import { FALLBACK_LIMITS } from '../src/lib/safetyLimits';
import { INITIAL_MODE_STATE, withMode } from '../src/lib/liveSim';

const live = INITIAL_MODE_STATE;
const sim = withMode(INITIAL_MODE_STATE, 7, 'sim');
const base = { limits: FALLBACK_LIMITS, modes: live, robotIds: [7], model: 'parol6' };

describe('motionGuard: one place that decides whether a command may leave the window', () => {
  it('lets a stop through whatever the mode of the robot', () => {
    expect(guardCommand({ ...base, modes: sim, command: 'stop' })).toEqual({ ok: true });
    expect(guardCommand({ ...base, modes: sim, command: 'estop' })).toEqual({ ok: true });
  });

  it('refuses a real command for a robot in Sim and names the sentence to show', () => {
    for (const command of ['jog', 'table', 'play', 'tool', 'valve', 'pump', 'speed']) {
      const verdict = guardCommand({ ...base, modes: sim, command, params: {} });
      expect(verdict.ok, command).toBe(false);
      if (!verdict.ok) {
        expect(verdict.issue).toEqual({ code: 'sim_blocked', command, robotIds: [7], detail: null });
        expect(verdict.serverCode).toBe('sim-mode');
      }
    }
  });

  it('refuses the whole group when one robot of the group is in Sim', () => {
    const verdict = guardCommand({ ...base, modes: sim, robotIds: [3, 7], command: 'jog', params: { axis: 'x', amount: 1 } });
    expect(verdict.ok).toBe(false);
  });

  it('refuses a jog over the limit of the model, relative and absolute', () => {
    const jog = FALLBACK_LIMITS.jog.default;
    const amount = guardCommand({ ...base, command: 'jog', params: { axis: 'x', amount: jog.maxAmount + 1 } });
    expect(amount.ok).toBe(false);
    if (!amount.ok) {
      expect(amount.issue.code).toBe('jog_limit');
      expect(amount.issue.detail).toBe(String(jog.maxAmount));
      expect(amount.serverCode).toBe('jog-limit');
    }
    const absolute = guardCommand({ ...base, command: 'jog', params: { axis: 'x', amount: jog.maxAbsolute + 1, absolute: true } });
    expect(absolute.ok).toBe(false);
    if (!absolute.ok) expect(absolute.issue.detail).toBe(`abs ${jog.maxAbsolute}`);
    expect(guardCommand({ ...base, command: 'jog', params: { axis: 'x', amount: 1 } })).toEqual({ ok: true });
  });

  it('refuses a table move over the limit and lets a small one through', () => {
    const jog = FALLBACK_LIMITS.jog.default;
    const big = guardCommand({ ...base, command: 'table', params: { x: jog.maxAmount + 1, y: 0, mode: 'relative' } });
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.issue.code).toBe('jog_limit');
    expect(guardCommand({ ...base, command: 'table', params: { x: 1, y: 1, mode: 'relative' } })).toEqual({ ok: true });
  });

  it('lets other commands through unchecked', () => {
    expect(guardCommand({ ...base, command: 'speed', params: { value: 50 } })).toEqual({ ok: true });
  });
});

describe('motionGuard: a step that swings a joint a long way', () => {
  it('lets a small step through', () => {
    expect(guardJogStep({ robotId: 7, from: { j1: 0, j2: 0 }, to: { j1: 3, j2: 1 } })).toEqual({ ok: true });
  });
  it('refuses a large swing with the joint and the size in the sentence', () => {
    const verdict = guardJogStep({ robotId: 7, from: { j1: 0 }, to: { j1: 170 } });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.issue).toEqual({ code: 'jog_jump', command: 'jog', robotIds: [7], detail: 'J1 (170°)' });
  });
});
