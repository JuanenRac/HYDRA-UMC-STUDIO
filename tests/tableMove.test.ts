import { afterEach, describe, expect, it } from 'vitest';
import { FALLBACK_LIMITS } from '../src/lib/safetyLimits';
import { checkTable, isUnknownCommand, markTableCommand, serverHasTableCommand, tableAsJogs, tableParams } from '../src/lib/tableMove';
import { interpretCommandResponse } from '../src/lib/commandResult';
import { blockedBySim, INITIAL_MODE_STATE, withMode } from '../src/lib/liveSim';

afterEach(() => markTableCommand(true));

describe('the parameters of a table move', () => {
  it('needs numbers', () => {
    expect(tableParams(10, 20, 'absolute')).toEqual({ x: 10, y: 20, mode: 'absolute' });
    expect(tableParams(10, 20, 'relative', 5)).toEqual({ x: 10, y: 20, rz: 5, mode: 'relative' });
    expect(tableParams(NaN, 1, 'absolute')).toBeNull();
    expect(tableParams(1, '2', 'absolute')).toBeNull();
    expect(tableParams(1, 2, 'absolute', Infinity)).toBeNull();
  });
});

describe('the limits of a table move', () => {
  // FALLBACK_LIMITS: relative up to 100, absolute up to 1000.
  it('bounds a relative move by the largest jog', () => {
    expect(checkTable(FALLBACK_LIMITS, 'x', { x: 100, y: 0, mode: 'relative' }).ok).toBe(true);
    const bad = checkTable(FALLBACK_LIMITS, 'x', { x: 0, y: -101, mode: 'relative' });
    expect(bad).toMatchObject({ ok: false, limit: 100, kind: 'amount' });
  });

  it('bounds an absolute move by the largest position', () => {
    expect(checkTable(FALLBACK_LIMITS, 'x', { x: 1000, y: -1000, mode: 'absolute' }).ok).toBe(true);
    expect(checkTable(FALLBACK_LIMITS, 'x', { x: 1001, y: 0, mode: 'absolute' })).toMatchObject({ ok: false, limit: 1000, kind: 'absolute' });
  });

  it('also bounds where a relative move ends', () => {
    const check = checkTable(FALLBACK_LIMITS, 'x', { x: 50, y: 0, mode: 'relative' }, { x: 980, y: 0 });
    expect(check).toMatchObject({ ok: false, limit: 1000, kind: 'absolute' });
    expect(checkTable(FALLBACK_LIMITS, 'x', { x: 50, y: 0, mode: 'relative' }, { x: 900, y: 0 }).ok).toBe(true);
  });

  it('the limits of the model win over the default', () => {
    const limits = { ...FALLBACK_LIMITS, jog: { ...FALLBACK_LIMITS.jog, models: { parol6: { maxAbsolute: 300 } } } };
    expect(checkTable(limits, 'Parol6 (6-DOF)', { x: 301, y: 0, mode: 'absolute' }).ok).toBe(false);
    expect(checkTable(limits, 'Parol6 (6-DOF)', { x: 300, y: 0, mode: 'absolute' }).ok).toBe(true);
  });
});

describe('a server without the table command', () => {
  it('is recognised by its answer and remembered', () => {
    const unknown = interpretCommandResponse(400, false, { error: 'unknown command' });
    expect(isUnknownCommand(unknown)).toBe(true);
    expect(isUnknownCommand(interpretCommandResponse(400, false, { error: 'x and y must be finite numbers', code: 'table-invalid' }))).toBe(false);
    expect(isUnknownCommand(interpretCommandResponse(200, true, {}))).toBe(false);
    expect(serverHasTableCommand()).toBe(true);
    markTableCommand(false);
    expect(serverHasTableCommand()).toBe(false);
  });

  it('turns the move into the jogs it did before', () => {
    expect(tableAsJogs({ x: 10, y: 20, mode: 'absolute' })).toEqual([
      { axis: 'x', amount: 10, target: 'xytable', absolute: true },
      { axis: 'y', amount: 20, target: 'xytable', absolute: true },
    ]);
    expect(tableAsJogs({ x: 2, y: 0, mode: 'relative' })).toEqual([{ axis: 'x', amount: 2, target: 'xytable' }]);
  });
});

describe('Sim mode', () => {
  it('refuses a table move like any other move', () => {
    const sim = withMode(INITIAL_MODE_STATE, 1, 'sim');
    expect(blockedBySim(sim, [1], 'table')).toBe(true);
    expect(blockedBySim(sim, [1], 'stop')).toBe(false);
  });
});
