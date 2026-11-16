import { describe, expect, it } from 'vitest';
import { FALLBACK_HARD_LIMITS, FALLBACK_LIMITS, buildPatch, changedOnly, formFromLimits, lowersProtection } from '../src/lib/safetyLimits';
import { tlsChangeNeedsConfirmation, trustedNetworksChangeNeedsConfirmation } from '../src/lib/serverSecurity';

const strict = { ...FALLBACK_LIMITS, jog: { ...FALLBACK_LIMITS.jog, armRequired: true }, claims: { ...FALLBACK_LIMITS.claims, requireControllerId: true } };

describe('what a save of the safety limits sends', () => {
  it('sends only the value that changed, not the arming, the reservation rule or the limits by model that were not touched', () => {
    const read = formFromLimits(strict);
    const base = buildPatch(read, FALLBACK_HARD_LIMITS).patch ?? {};
    const next = buildPatch({ ...read, auditMotionSeconds: '30' }, FALLBACK_HARD_LIMITS).patch ?? {};
    expect(changedOnly(base, next)).toEqual({ audit: { motionIntervalSeconds: 30 } });
  });

  it('sends nothing when nothing changed', () => {
    const read = formFromLimits(strict);
    const base = buildPatch(read, FALLBACK_HARD_LIMITS).patch ?? {};
    expect(changedOnly(base, base)).toEqual({});
  });

  it('sends the whole map of models when anything in it changed', () => {
    const withModels = formFromLimits({ ...strict, jog: { ...strict.jog, models: { parol6: { maxAmount: 20 }, ar4: { maxAmount: 30 } } } });
    const base = buildPatch(withModels, FALLBACK_HARD_LIMITS).patch ?? {};
    const edited = { ...withModels, rows: withModels.rows.map((r) => (r.model === 'parol6' ? { ...r, maxAmount: '10' } : r)) };
    const next = buildPatch(edited, FALLBACK_HARD_LIMITS).patch ?? {};
    expect(changedOnly(base, next)).toEqual({ jog: { models: { parol6: { maxAmount: 10 }, ar4: { maxAmount: 30 } } } });
  });
});

describe('what lowers the protection', () => {
  const read = formFromLimits(strict);

  it('does not for a change that keeps or raises the protection', () => {
    expect(lowersProtection(read, read)).toBe(false);
    expect(lowersProtection(read, { ...read, defaultMaxAmount: '1' })).toBe(false);
    expect(lowersProtection(read, { ...read, auditMotionSeconds: '1' })).toBe(false);
    expect(lowersProtection(formFromLimits(FALLBACK_LIMITS), { ...read })).toBe(false);
  });

  it('does when the jog no longer has to be armed or a reservation no longer names its controller', () => {
    expect(lowersProtection(read, { ...read, armRequired: false })).toBe(true);
    expect(lowersProtection(read, { ...read, requireControllerId: false })).toBe(true);
  });

  it('does when a limit is raised or removed, the arming lasts longer or the audit is taken less often', () => {
    expect(lowersProtection(read, { ...read, defaultMaxAmount: String(Number(read.defaultMaxAmount) + 1) })).toBe(true);
    expect(lowersProtection(read, { ...read, armTtlSeconds: String(Number(read.armTtlSeconds) + 1) })).toBe(true);
    expect(lowersProtection(read, { ...read, auditMotionSeconds: String(Number(read.auditMotionSeconds) + 1) })).toBe(true);
    const withRow = { ...read, rows: [{ model: 'parol6', maxAmount: '20', maxAbsolute: '', bedMaxC: '' }] };
    expect(lowersProtection(withRow, { ...withRow, rows: [] })).toBe(true);
    expect(lowersProtection(withRow, { ...withRow, rows: [{ ...withRow.rows[0], maxAmount: '' }] })).toBe(true);
    expect(lowersProtection(withRow, { ...withRow, rows: [{ ...withRow.rows[0], maxAmount: '25' }] })).toBe(true);
    expect(lowersProtection(withRow, { ...withRow, rows: [{ ...withRow.rows[0], maxAmount: '15' }] })).toBe(false);
  });
});

describe('the switches that lower the protection of the server ask first', () => {
  it('switching TLS off asks and switching it on does not', () => {
    expect(tlsChangeNeedsConfirmation(true, false)).toBe(true);
    expect(tlsChangeNeedsConfirmation(false, true)).toBe(false);
    expect(tlsChangeNeedsConfirmation(true, true)).toBe(false);
    expect(tlsChangeNeedsConfirmation(false, false)).toBe(false);
  });

  it('switching the restriction to trusted networks off asks and switching it on does not', () => {
    expect(trustedNetworksChangeNeedsConfirmation(true, false)).toBe(true);
    expect(trustedNetworksChangeNeedsConfirmation(false, true)).toBe(false);
  });
});
