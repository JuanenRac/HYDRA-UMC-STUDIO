import { describe, expect, it } from 'vitest';
import {
  FALLBACK_HARD_LIMITS,
  FALLBACK_LIMITS,
  FALLBACK_STATE,
  bedMaxFor,
  buildPatch,
  checkJog,
  clampBedTargetTo,
  formFromLimits,
  highestBedMax,
  isArmed,
  isJogWarning,
  isTemperatureWarning,
  jogLimitsFor,
  modelKey,
  parseSafetyLimits,
  parseWarnings,
  type SafetyLimitsConfig,
} from '../src/lib/safetyLimits';

const withModels: SafetyLimitsConfig = {
  ...FALLBACK_LIMITS,
  jog: { ...FALLBACK_LIMITS.jog, models: { parol6: { maxAmount: 20 }, ar4: { maxAbsolute: 500 } } },
  temperature: { default: { bedMaxC: 110 }, models: { parol6: { bedMaxC: 80 } } },
};

describe('the limits read from the server', () => {
  it('start from the conservative defaults of the server when nothing has been read', () => {
    expect(FALLBACK_STATE.limits.jog.armRequired).toBe(false);
    expect(FALLBACK_STATE.limits.jog.default).toEqual({ maxAmount: 100, maxAbsolute: 1000 });
    expect(FALLBACK_STATE.limits.temperature.default.bedMaxC).toBe(110);
    expect(parseSafetyLimits(null)).toEqual(FALLBACK_STATE);
    expect(parseSafetyLimits('nonsense')).toEqual(FALLBACK_STATE);
  });

  it('reads GET /api/safety-limits and keys the models without the parenthesis and without case', () => {
    const state = parseSafetyLimits({
      limits: {
        jog: { armRequired: true, armTtlMs: 30000, default: { maxAmount: 50, maxAbsolute: 800 }, models: { 'Parol6 (6-DOF)': { maxAmount: 10 } } },
        temperature: { default: { bedMaxC: 100 }, models: { 'AR4 (6-DOF)': { bedMaxC: 90 } } },
        claims: { requireControllerId: true },
      },
      defaults: FALLBACK_LIMITS,
      hardLimits: { jogMaxAmount: 900, jogMaxAbsolute: 9000, armTtlMs: { min: 2000, max: 500000 }, bedMaxC: 250 },
    });
    expect(state.limits.jog.armRequired).toBe(true);
    expect(state.limits.jog.armTtlMs).toBe(30000);
    expect(state.limits.claims.requireControllerId).toBe(true);
    expect(jogLimitsFor(state.limits, 'Parol6 (6-DOF)')).toEqual({ maxAmount: 10, maxAbsolute: 800 });
    expect(bedMaxFor(state.limits, 'AR4 (6-DOF)')).toBe(90);
    expect(state.hardLimits).toEqual({ jogMaxAmount: 900, jogMaxAbsolute: 9000, armTtlMs: { min: 2000, max: 500000 }, bedMaxC: 250 });
  });

  it('ignores damaged values instead of trusting them', () => {
    const state = parseSafetyLimits({ limits: { jog: { armRequired: 'yes', armTtlMs: -5, default: { maxAmount: 'big', maxAbsolute: 0 }, models: { x: 'no', y: { maxAmount: -1 } } } } });
    expect(state.limits.jog.armRequired).toBe(false);
    expect(state.limits.jog.armTtlMs).toBe(60000);
    expect(state.limits.jog.default).toEqual({ maxAmount: 100, maxAbsolute: 1000 });
    expect(state.limits.jog.models).toEqual({ y: {} });
  });

  it('names a model the way the server does', () => {
    expect(modelKey('Parol6 (6-DOF)')).toBe('parol6');
    expect(modelKey('  UR5e ')).toBe('ur5e');
    expect(modelKey(undefined)).toBe('');
  });

  it('picks the limits of a model over the default ones', () => {
    expect(jogLimitsFor(withModels, 'Parol6 (6-DOF)')).toEqual({ maxAmount: 20, maxAbsolute: 1000 });
    expect(jogLimitsFor(withModels, 'AR4 (6-DOF)')).toEqual({ maxAmount: 100, maxAbsolute: 500 });
    expect(jogLimitsFor(withModels, 'Z1 (6-DOF)')).toEqual({ maxAmount: 100, maxAbsolute: 1000 });
    expect(bedMaxFor(withModels, 'Parol6 (6-DOF)')).toBe(80);
    expect(bedMaxFor(withModels, 'Z1 (6-DOF)')).toBe(110);
    expect(highestBedMax(withModels)).toBe(110);
  });
});

describe('a jog checked before it is sent', () => {
  it('refuses a relative step above the limit of the model, in either direction', () => {
    expect(checkJog(withModels, 'Parol6 (6-DOF)', { axis: 'x', amount: 20 })).toEqual({ ok: true, limit: 20, kind: null });
    expect(checkJog(withModels, 'Parol6 (6-DOF)', { axis: 'x', amount: 21 })).toEqual({ ok: false, limit: 20, kind: 'amount' });
    expect(checkJog(withModels, 'Parol6 (6-DOF)', { axis: 'x', amount: -21 }).ok).toBe(false);
    expect(checkJog(withModels, 'Z1 (6-DOF)', { axis: 'x', amount: 100 }).ok).toBe(true);
    expect(checkJog(withModels, 'Z1 (6-DOF)', { axis: 'x', amount: 101 }).ok).toBe(false);
  });

  it('bounds an absolute jog by the target position', () => {
    expect(checkJog(withModels, 'AR4 (6-DOF)', { axis: 'x', absolute: true, amount: 500 }).ok).toBe(true);
    expect(checkJog(withModels, 'AR4 (6-DOF)', { axis: 'x', absolute: true, amount: -501 })).toEqual({ ok: false, limit: 500, kind: 'absolute' });
  });

  it('lets a pure joint move (amount 0) through', () => {
    expect(checkJog(withModels, 'Parol6 (6-DOF)', { axis: 'x', amount: 0, target: 'robot' }).ok).toBe(true);
    expect(checkJog(withModels, 'Parol6 (6-DOF)', undefined).ok).toBe(true);
  });
});

describe('the bed target', () => {
  it('is held to the ceiling it is given and survives garbage', () => {
    expect(clampBedTargetTo(0, 110)).toBe(0);
    expect(clampBedTargetTo(300, 110)).toBe(110);
    expect(clampBedTargetTo(-5, 110)).toBe(0);
    expect(clampBedTargetTo(Number.NaN, 110)).toBe(0);
    expect(clampBedTargetTo(60.4, 110)).toBe(60);
  });
});

describe('the form of the administration screen', () => {
  it('round-trips the limits into a request the server accepts', () => {
    const form = formFromLimits(withModels);
    expect(form.rows.map((r) => r.model)).toEqual(['ar4', 'parol6']);
    expect(form.armTtlSeconds).toBe('60');
    const built = buildPatch(form, FALLBACK_HARD_LIMITS);
    expect(built.ok).toBe(true);
    expect(built.patch).toEqual({
      jog: { armRequired: false, armTtlMs: 60000, default: { maxAmount: 100, maxAbsolute: 1000 }, models: { ar4: { maxAbsolute: 500 }, parol6: { maxAmount: 20 } } },
      temperature: { default: { bedMaxC: 110 }, models: { parol6: { bedMaxC: 80 } } },
      claims: { requireControllerId: false },
    });
  });

  it('turns the switches into booleans and seconds into milliseconds', () => {
    const form = { ...formFromLimits(FALLBACK_LIMITS), armRequired: true, requireControllerId: true, armTtlSeconds: '30' };
    const built = buildPatch(form, FALLBACK_HARD_LIMITS);
    expect(built.patch).toMatchObject({ jog: { armRequired: true, armTtlMs: 30000 }, claims: { requireControllerId: true } });
  });

  it('refuses a value beyond the hard ceilings or that is not a number, and says which field', () => {
    const base = formFromLimits(FALLBACK_LIMITS);
    expect(buildPatch({ ...base, defaultMaxAmount: '1001' }, FALLBACK_HARD_LIMITS)).toMatchObject({ ok: false, problem: 'range', field: 'defaultMaxAmount' });
    expect(buildPatch({ ...base, defaultMaxAbsolute: '10001' }, FALLBACK_HARD_LIMITS)).toMatchObject({ ok: false, problem: 'range', field: 'defaultMaxAbsolute' });
    expect(buildPatch({ ...base, defaultBedMaxC: '301' }, FALLBACK_HARD_LIMITS)).toMatchObject({ ok: false, problem: 'range', field: 'defaultBedMaxC' });
    expect(buildPatch({ ...base, defaultBedMaxC: 'hot' }, FALLBACK_HARD_LIMITS)).toMatchObject({ ok: false, problem: 'number', field: 'defaultBedMaxC' });
    expect(buildPatch({ ...base, defaultMaxAmount: '0' }, FALLBACK_HARD_LIMITS)).toMatchObject({ ok: false, problem: 'range' });
    expect(buildPatch({ ...base, armTtlSeconds: '0.5' }, FALLBACK_HARD_LIMITS)).toMatchObject({ ok: false, problem: 'range', field: 'armTtl' });
    expect(buildPatch({ ...base, armTtlSeconds: '601' }, FALLBACK_HARD_LIMITS)).toMatchObject({ ok: false, problem: 'range', field: 'armTtl' });
    expect(buildPatch({ ...base, armTtlSeconds: '' }, FALLBACK_HARD_LIMITS)).toMatchObject({ ok: false, problem: 'number', field: 'armTtl' });
  });

  it('checks the rows of the models', () => {
    const base = formFromLimits(FALLBACK_LIMITS);
    const row = (over: Partial<(typeof base.rows)[number]>) => ({ model: 'ur5e', maxAmount: '', maxAbsolute: '', bedMaxC: '', ...over });
    expect(buildPatch({ ...base, rows: [row({ maxAmount: '5000' })] }, FALLBACK_HARD_LIMITS)).toMatchObject({ ok: false, problem: 'range', field: 'ur5e.maxAmount' });
    expect(buildPatch({ ...base, rows: [row({ model: '  ' })] }, FALLBACK_HARD_LIMITS)).toMatchObject({ ok: false, problem: 'model' });
    expect(buildPatch({ ...base, rows: [row({ model: 'UR5e (6-DOF)' }), row({ model: 'ur5e' })] }, FALLBACK_HARD_LIMITS)).toMatchObject({ ok: false, problem: 'duplicate', field: 'ur5e' });
    const built = buildPatch({ ...base, rows: [row({ model: 'UR5e (6-DOF)', bedMaxC: '90' }), row({ model: 'z1' })] }, FALLBACK_HARD_LIMITS);
    expect(built.patch).toMatchObject({ jog: { models: {} }, temperature: { models: { ur5e: { bedMaxC: 90 } } } });
  });
});

describe('the warnings of the server', () => {
  it('reads the structured warnings of a jog and of a lowered bed target', () => {
    const list = parseWarnings({
      warnings: [
        { robotId: 1, field: 'jog', requested: 'x', message: 'jog needs a valid axis' },
        { robotId: 2, field: 'heatedBed.targetTemp', requested: 300, applied: 110, code: 'temperature-limit' },
        'plain text',
        7,
      ],
    });
    expect(list).toHaveLength(4);
    expect(isJogWarning(list[0])).toBe(true);
    expect(isTemperatureWarning(list[1])).toBe(true);
    expect(list[1]).toMatchObject({ robotId: 2, requested: 300, applied: 110 });
    expect(list[2].message).toBe('plain text');
    expect(parseWarnings(null)).toEqual([]);
    expect(parseWarnings({ warnings: 'x' })).toEqual([]);
  });

  it('knows whether an arming is still running', () => {
    expect(isArmed(2000, 1000)).toBe(true);
    expect(isArmed(1000, 1000)).toBe(false);
    expect(isArmed(null, 1000)).toBe(false);
    expect(isArmed(undefined)).toBe(false);
  });
});
