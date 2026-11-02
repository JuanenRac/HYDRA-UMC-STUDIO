// =============================================================================
// HYDRA-UMC STUDIO - tests/downsamplePlan.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The checks of the tier plan of the data lake that the editor makes before saving: durations, the shape of the rows, the coherence of
// the widths and retentions, the kinds, the document sent, and how each answer of the server is read (by its code, never its text).
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  draftToPlan, emptyTier, failureFor, formatDuration, loadPlan, parseDuration, planToDraft, putPlan, validatePlan,
  type IssueCode, type PlanDraft, type TierDraft,
} from '../src/lib/downsamplePlan';

afterEach(() => vi.unstubAllGlobals());

const tier = (over: Partial<TierDraft> = {}): TierDraft => ({ ...emptyTier(), kind: 'motor_temp', field: '*', raw: '2d', bucket: '1h', ...over });
const plan = (...tiers: TierDraft[]): PlanDraft => ({ tiers, delete: false });
const codes = (draft: PlanDraft, kinds: string[] | null = ['motor_temp', 'vibration']): IssueCode[] => validatePlan(draft, kinds).map((i) => i.code);

describe('durations', () => {
  it('reads a number with a unit or whole milliseconds', () => {
    expect(parseDuration('90s')).toBe(90_000);
    expect(parseDuration(' 1H ')).toBe(3_600_000);
    expect(parseDuration('2w')).toBe(1_209_600_000);
    expect(parseDuration('5y')).toBe(157_680_000_000);
    expect(parseDuration('1500')).toBe(1500);
  });

  it('refuses what the data lake refuses', () => {
    for (const bad of ['', 'x', '1.5h', '-1h', '0', '0d', '1 h', '1hh', '101y', '9007199254740993']) expect(parseDuration(bad), bad).toBeNull();
  });

  it('shows milliseconds as the shortest exact text', () => {
    expect(formatDuration(3_600_000)).toBe('1h');
    expect(formatDuration(172_800_000)).toBe('2d');
    expect(formatDuration(90_000)).toBe('90s');
    expect(formatDuration(1500)).toBe('1500');
  });
});

describe('a plan that fits together', () => {
  it('is accepted, with a narrow level and the default tier', () => {
    const draft = plan(
      tier({ fineBucket: '1m', rollupRetention: '5y', fineRetention: '30d' }),
      tier({ kind: '*', field: '*', raw: '30d', bucket: '1d' }),
    );
    expect(validatePlan(draft, ['motor_temp'])).toEqual([]);
  });

  it('accepts a bucket as long as the raw time, and a retention as long as it', () => {
    expect(codes(plan(tier({ raw: '1d', bucket: '1d', rollupRetention: '1d' })))).toEqual([]);
  });

  it('does not check the kinds before the data lake has said which it knows', () => {
    expect(codes(plan(tier({ kind: 'anything' })), null)).toEqual([]);
  });
});

describe('the shape is checked row by row', () => {
  it('needs at least one tier and at most 1000', () => {
    expect(codes(plan())).toEqual(['no_tiers']);
    expect(codes(plan(...Array.from({ length: 1001 }, (_, i) => tier({ field: `f${i}` }))))).toEqual(['too_many_tiers']);
  });

  it('needs a kind and a field, and * is for the default tier only', () => {
    expect(codes(plan(tier({ kind: '' })))).toContain('kind_missing');
    expect(codes(plan(tier({ field: '' })))).toContain('field_missing');
    expect(codes(plan(tier({ kind: '*', field: 'x' })))).toContain('default_needs_star_field');
  });

  it('refuses a tier listed twice, naming the second one', () => {
    const issues = validatePlan(plan(tier(), tier()), ['motor_temp']);
    expect(issues).toEqual([{ tier: 1, key: 'kind', code: 'duplicate', params: { kind: 'motor_temp', field: '*' } }]);
  });

  it('needs raw and bucket and refuses a duration it cannot read', () => {
    expect(codes(plan(tier({ raw: '', bucket: '' })))).toEqual(['required', 'required']);
    const issues = validatePlan(plan(tier({ bucket: '1.5h' })), null);
    expect(issues).toEqual([{ tier: 0, key: 'bucket', code: 'bad_duration', params: { value: '1.5h' } }]);
  });

  it('wants the narrow width smaller than the wide one, dividing it exactly and not too many of them', () => {
    expect(codes(plan(tier({ fineBucket: '1h' })))).toEqual(['fine_not_smaller']);
    expect(codes(plan(tier({ bucket: '1h', fineBucket: '7m' })))).toEqual(['fine_not_divisor']);
    expect(codes(plan(tier({ raw: '30d', bucket: '2d', fineBucket: '1s' })))).toEqual(['fine_too_many']);
    expect(codes(plan(tier({ bucket: '1d', fineBucket: '1m' })))).toEqual([]);
  });

  it('wants the narrow retention to come with a narrow width, off the default tier, and not longer than the rollup retention', () => {
    expect(codes(plan(tier({ fineRetention: '3d' })))).toEqual(['fine_retention_needs_fine']);
    expect(codes(plan(tier({ kind: '*', field: '*', fineBucket: '1m', fineRetention: '3d' })))).toEqual(['fine_retention_on_default']);
    expect(codes(plan(tier({ fineBucket: '1m', rollupRetention: '30d', fineRetention: '60d' })))).toEqual(['fine_retention_longer']);
  });
});

describe('the coherence is checked once the shape is right', () => {
  it('refuses a bucket longer than the raw time', () => {
    expect(codes(plan(tier({ raw: '1h', bucket: '1d' })))).toEqual(['bucket_longer_than_raw']);
  });

  it('refuses a retention shorter than the raw time, for the rollups and for the narrow ones', () => {
    expect(codes(plan(tier({ rollupRetention: '1d' })))).toEqual(['rollup_shorter_than_raw']);
    expect(codes(plan(tier({ fineBucket: '1m', fineRetention: '1d' })))).toEqual(['fine_retention_shorter_than_raw']);
  });

  it('lists every incoherent row, not only the first', () => {
    const issues = validatePlan(plan(tier({ raw: '1h', bucket: '1d' }), tier({ field: 'b', rollupRetention: '1h' })), ['motor_temp']);
    expect(issues.map((i) => [i.tier, i.code])).toEqual([[0, 'bucket_longer_than_raw'], [1, 'rollup_shorter_than_raw']]);
  });

  it('does not go on to the coherence while the shape is wrong', () => {
    expect(codes(plan(tier({ raw: '1h', bucket: '1d' }), tier({ field: 'b', raw: '' })))).toEqual(['required']);
  });

  it('refuses a kind the data lake does not know, the default tier excepted', () => {
    expect(codes(plan(tier({ kind: 'ghost' }), tier({ kind: '*', field: '*' })))).toEqual(['unknown_kind']);
  });
});

describe('the document sent and read', () => {
  it('sends whole milliseconds as numbers and the rest as typed, without empty cells', () => {
    const doc = draftToPlan({ tiers: [tier({ raw: '172800000', bucket: ' 1H ', fineBucket: '1m' })], delete: true });
    expect(doc).toEqual({ tiers: [{ kind: 'motor_temp', field: '*', raw: 172800000, bucket: '1h', fineBucket: '1m' }], delete: true });
  });

  it('reads the plan of the data lake, durations in milliseconds or text, a missing field as *', () => {
    const draft = planToDraft({ tiers: [{ kind: 'a', raw: 172_800_000, bucket: '1h' }, { kind: '*', field: '*', raw: '30d', bucket: '1d' }], delete: true });
    expect(draft).toEqual({
      tiers: [{ kind: 'a', field: '*', raw: '2d', bucket: '1h', fineBucket: '', rollupRetention: '', fineRetention: '' }, { kind: '*', field: '*', raw: '30d', bucket: '1d', fineBucket: '', rollupRetention: '', fineRetention: '' }],
      delete: true,
    });
    expect(planToDraft({ tiers: [{ field: 'x' }] })).toBeNull();
    expect(planToDraft(null)).toBeNull();
  });

  it('what is read can be sent back and is valid', () => {
    const draft = planToDraft({ tiers: [{ kind: 'motor_temp', field: '*', raw: 172_800_000, bucket: 3_600_000, fineBucket: 60_000 }] })!;
    expect(validatePlan(draft, ['motor_temp'])).toEqual([]);
    expect(draftToPlan(draft).tiers[0]).toMatchObject({ raw: '2d', bucket: '1h', fineBucket: '1m' });
  });
});

function answer(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async () => ({ ok: status < 300, status, json: async () => body }) as unknown as Response);
  vi.stubGlobal('fetch', spy);
  return spy;
}

describe('the answers of the server', () => {
  it('are told apart by the code of the data lake, not by its text', () => {
    expect(failureFor(409, { code: 'plan_changed', error: 'whatever' })).toMatchObject({ failure: 'plan_changed' });
    expect(failureFor(409, { code: 'confirm_delete_required' })).toMatchObject({ failure: 'confirm_delete_required' });
    expect(failureFor(403, { code: 'delete_not_allowed' })).toMatchObject({ failure: 'delete_not_allowed' });
    expect(failureFor(422, { code: 'incoherent_plan', details: ['a', 3, 'b'] })).toEqual({ ok: false, failure: 'incoherent_plan', status: 422, details: ['a', 'b'] });
    expect(failureFor(422, { code: 'unknown_kind' })).toMatchObject({ failure: 'unknown_kind' });
    expect(failureFor(404, null)).toMatchObject({ failure: 'off' });
    expect(failureFor(403, { error: 'admin only' })).toMatchObject({ failure: 'forbidden' });
    expect(failureFor(401, null)).toMatchObject({ failure: 'forbidden' });
    expect(failureFor(503, { available: false })).toMatchObject({ failure: 'unreachable' });
    expect(failureFor(418, null)).toMatchObject({ failure: 'http', status: 418 });
  });

  it('loads the plan with its hash, kinds, switches and the latest audit entries', async () => {
    const spy = answer(200, {
      plan: { tiers: [{ kind: 'motor_temp', field: '*', raw: 172_800_000, bucket: 3_600_000 }], delete: false },
      hash: 'abc', knownKinds: ['motor_temp', 7], switches: { allowDelete: false, effectiveMode: 'dryRun', fineRollups: true },
      audit: [{ atMs: 5, event: 'plan_saved', client: '127.0.0.1', tiers: 2, deleteRequested: false }, 'junk'],
    });
    const result = await loadPlan();
    expect(result.ok && result.value).toMatchObject({ hash: 'abc', knownKinds: ['motor_temp'], switches: { allowDelete: false, effectiveMode: 'dryRun' } });
    expect(result.ok && result.value.audit).toEqual([{ atMs: 5, event: 'plan_saved', client: '127.0.0.1', tiers: 2, deleteRequested: false }]);
    expect(String((spy.mock.calls[0] as unknown[])[0])).toContain('/api/telemetry/downsample-plan');
  });

  it('refuses an answer that is not a plan, and survives a network failure', async () => {
    answer(200, { plan: 'x', hash: 'abc' });
    expect(await loadPlan()).toEqual({ ok: false, failure: 'malformed' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    expect(await loadPlan()).toEqual({ ok: false, failure: 'network' });
  });

  it('previews with ?preview=1 and sends the hash it read; a save does not preview', async () => {
    const spy = answer(200, { saved: false, preview: true, hash: 'new', mode: 'dryRun', changes: [{}, {}], warnings: ['w', 4], effects: { totals: { rawPointsToRollUp: 100, rollupsToExpire: 1, fineRollupsToExpire: 2 } } });
    const draft = plan(tier());
    const preview = await putPlan(draft, 'abc', { preview: true });
    expect(preview.ok && preview.value).toMatchObject({ saved: false, changes: 2, warnings: ['w'], effects: { rawPointsToRollUp: 100, rollupsToExpire: 1, fineRollupsToExpire: 2 }, currentEffects: null });
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('?preview=1');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({ plan: { tiers: [{ kind: 'motor_temp', field: '*', raw: '2d', bucket: '1h' }], delete: false }, expectedHash: 'abc', confirmDelete: false });

    await putPlan(draft, 'abc', { preview: false, confirmDelete: true });
    const [saveUrl, saveInit] = spy.mock.calls[1] as unknown as [string, RequestInit];
    expect(saveUrl).not.toContain('preview');
    expect(JSON.parse(String(saveInit.body)).confirmDelete).toBe(true);
  });

  it('turns a refusal of the data lake into a failure with its details', async () => {
    answer(422, { code: 'incoherent_plan', error: 'x', details: ['tiers[0] (a/*): bucket must not be longer than raw'] });
    const result = await putPlan(plan(tier()), 'abc', { preview: false });
    expect(result).toEqual({ ok: false, failure: 'incoherent_plan', status: 422, details: ['tiers[0] (a/*): bucket must not be longer than raw'] });
  });
});
