// =============================================================================
// HYDRA-UMC STUDIO - the safety limits of the server: safetyLimits.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The size of a jog, the range of an absolute jog, the hottest bed target, the optional arming of the jog and the
// mandatory controller id live in the server (GET /api/safety-limits, changed by an administrator with
// PUT /api/admin/safety-limits), so every client is held to the same ones. This file reads them, picks the ones
// that apply to a model, turns the form of the administration screen into a request the server accepts, and gives
// the values to use until the server has answered (the conservative defaults of the server itself).
// =============================================================================

export interface JogLimits { maxAmount: number; maxAbsolute: number }
export interface TemperatureLimits { bedMaxC: number }

export interface SafetyLimitsConfig {
  jog: { armRequired: boolean; armTtlMs: number; default: JogLimits; models: Record<string, Partial<JogLimits>> };
  temperature: { default: TemperatureLimits; models: Record<string, Partial<TemperatureLimits>> };
  claims: { requireControllerId: boolean };
}

export interface HardLimits {
  jogMaxAmount: number;
  jogMaxAbsolute: number;
  armTtlMs: { min: number; max: number };
  bedMaxC: number;
}

export interface SafetyLimitsState {
  limits: SafetyLimitsConfig;
  defaults: SafetyLimitsConfig;
  hardLimits: HardLimits;
}

/** The conservative defaults of the server, used until it has answered (and when it predates the limits). */
export const FALLBACK_LIMITS: SafetyLimitsConfig = {
  jog: { armRequired: false, armTtlMs: 60_000, default: { maxAmount: 100, maxAbsolute: 1000 }, models: {} },
  temperature: { default: { bedMaxC: 110 }, models: {} },
  claims: { requireControllerId: false },
};

export const FALLBACK_HARD_LIMITS: HardLimits = {
  jogMaxAmount: 1000,
  jogMaxAbsolute: 10000,
  armTtlMs: { min: 1000, max: 600_000 },
  bedMaxC: 300,
};

export const FALLBACK_STATE: SafetyLimitsState = {
  limits: FALLBACK_LIMITS,
  defaults: FALLBACK_LIMITS,
  hardLimits: FALLBACK_HARD_LIMITS,
};

/** "Parol6 (6-DOF)" and "parol6" name the same model. */
export function modelKey(model: unknown): string {
  return String(model ?? '').split('(')[0].trim().toLowerCase();
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const positive = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

function readModels<T>(raw: unknown, pick: (entry: Record<string, unknown>) => Partial<T>): Record<string, Partial<T>> {
  const out: Record<string, Partial<T>> = {};
  if (!isObject(raw)) return out;
  for (const [key, entry] of Object.entries(raw)) {
    const k = modelKey(key);
    if (k && isObject(entry)) out[k] = pick(entry);
  }
  return out;
}

const pickJog = (e: Record<string, unknown>): Partial<JogLimits> => {
  const out: Partial<JogLimits> = {};
  const amount = positive(e.maxAmount);
  const absolute = positive(e.maxAbsolute);
  if (amount !== null) out.maxAmount = amount;
  if (absolute !== null) out.maxAbsolute = absolute;
  return out;
};
const pickTemp = (e: Record<string, unknown>): Partial<TemperatureLimits> => {
  const out: Partial<TemperatureLimits> = {};
  const bed = positive(e.bedMaxC);
  if (bed !== null) out.bedMaxC = bed;
  return out;
};

function readConfig(raw: unknown, fallback: SafetyLimitsConfig): SafetyLimitsConfig {
  if (!isObject(raw)) return fallback;
  const jog = isObject(raw.jog) ? raw.jog : {};
  const temperature = isObject(raw.temperature) ? raw.temperature : {};
  const claims = isObject(raw.claims) ? raw.claims : {};
  return {
    jog: {
      armRequired: typeof jog.armRequired === 'boolean' ? jog.armRequired : fallback.jog.armRequired,
      armTtlMs: positive(jog.armTtlMs) ?? fallback.jog.armTtlMs,
      default: { ...fallback.jog.default, ...(isObject(jog.default) ? pickJog(jog.default) : {}) },
      models: readModels<JogLimits>(jog.models, pickJog),
    },
    temperature: {
      default: { ...fallback.temperature.default, ...(isObject(temperature.default) ? pickTemp(temperature.default) : {}) },
      models: readModels<TemperatureLimits>(temperature.models, pickTemp),
    },
    claims: { requireControllerId: typeof claims.requireControllerId === 'boolean' ? claims.requireControllerId : fallback.claims.requireControllerId },
  };
}

/** The answer of GET /api/safety-limits (or of the PUT, which carries the same fields); anything unreadable keeps the defaults. */
export function parseSafetyLimits(body: unknown): SafetyLimitsState {
  if (!isObject(body)) return FALLBACK_STATE;
  const limits = readConfig(body.limits, FALLBACK_LIMITS);
  const defaults = readConfig(body.defaults, FALLBACK_LIMITS);
  const hard = isObject(body.hardLimits) ? body.hardLimits : {};
  const armTtl = isObject(hard.armTtlMs) ? hard.armTtlMs : {};
  return {
    limits,
    defaults,
    hardLimits: {
      jogMaxAmount: positive(hard.jogMaxAmount) ?? FALLBACK_HARD_LIMITS.jogMaxAmount,
      jogMaxAbsolute: positive(hard.jogMaxAbsolute) ?? FALLBACK_HARD_LIMITS.jogMaxAbsolute,
      armTtlMs: { min: positive(armTtl.min) ?? FALLBACK_HARD_LIMITS.armTtlMs.min, max: positive(armTtl.max) ?? FALLBACK_HARD_LIMITS.armTtlMs.max },
      bedMaxC: positive(hard.bedMaxC) ?? FALLBACK_HARD_LIMITS.bedMaxC,
    },
  };
}

/** The jog limits that apply to a model: its own entry over the default one. */
export function jogLimitsFor(limits: SafetyLimitsConfig, model: unknown): JogLimits {
  const own = limits.jog.models[modelKey(model)] ?? {};
  return { maxAmount: own.maxAmount ?? limits.jog.default.maxAmount, maxAbsolute: own.maxAbsolute ?? limits.jog.default.maxAbsolute };
}

/** The heated-bed ceiling that applies to a model, in degrees Celsius. */
export function bedMaxFor(limits: SafetyLimitsConfig, model: unknown): number {
  return limits.temperature.models[modelKey(model)]?.bedMaxC ?? limits.temperature.default.bedMaxC;
}

/** The hottest bed target any model may be given: the highest ceiling in the table, for a panel that has no single robot. */
export function highestBedMax(limits: SafetyLimitsConfig): number {
  const values = [limits.temperature.default.bedMaxC, ...Object.values(limits.temperature.models).map((m) => m.bedMaxC ?? 0)];
  return Math.max(...values);
}

/** A whole, finite target inside 0..max (anything else becomes 0). */
export function clampBedTargetTo(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.round(value)));
}

export interface JogCheck { ok: boolean; limit: number; kind: 'amount' | 'absolute' | null }

/**
 * Whether a jog is inside the limits of the model before it is sent. A relative jog is bounded by its amount, an
 * absolute one by the target position, in either direction. The server checks again; this only spares the trip
 * and says why.
 */
export function checkJog(limits: SafetyLimitsConfig, model: unknown, params: Record<string, unknown> | undefined): JogCheck {
  const jog = jogLimitsFor(limits, model);
  if (params?.absolute === true) {
    const target = typeof params.amount === 'number' ? params.amount : 0;
    return Math.abs(target) > jog.maxAbsolute ? { ok: false, limit: jog.maxAbsolute, kind: 'absolute' } : { ok: true, limit: jog.maxAbsolute, kind: null };
  }
  const amount = typeof params?.amount === 'number' ? params.amount : 0;
  return Math.abs(amount) > jog.maxAmount ? { ok: false, limit: jog.maxAmount, kind: 'amount' } : { ok: true, limit: jog.maxAmount, kind: null };
}

// ----- the form of the administration screen ---------------------------------------------------------------------------

/** One row of the per-model table, as typed (text, so a half-typed number is not lost). */
export interface ModelRow { model: string; maxAmount: string; maxAbsolute: string; bedMaxC: string }

export interface SafetyForm {
  armRequired: boolean;
  armTtlSeconds: string;
  requireControllerId: boolean;
  defaultMaxAmount: string;
  defaultMaxAbsolute: string;
  defaultBedMaxC: string;
  rows: ModelRow[];
}

const show = (v: number | undefined): string => (v === undefined ? '' : String(v));

export function formFromLimits(limits: SafetyLimitsConfig): SafetyForm {
  const keys = new Set<string>([...Object.keys(limits.jog.models), ...Object.keys(limits.temperature.models)]);
  return {
    armRequired: limits.jog.armRequired,
    armTtlSeconds: String(Math.round(limits.jog.armTtlMs / 1000)),
    requireControllerId: limits.claims.requireControllerId,
    defaultMaxAmount: String(limits.jog.default.maxAmount),
    defaultMaxAbsolute: String(limits.jog.default.maxAbsolute),
    defaultBedMaxC: String(limits.temperature.default.bedMaxC),
    rows: [...keys].sort().map((model) => ({
      model,
      maxAmount: show(limits.jog.models[model]?.maxAmount),
      maxAbsolute: show(limits.jog.models[model]?.maxAbsolute),
      bedMaxC: show(limits.temperature.models[model]?.bedMaxC),
    })),
  };
}

/** Why the form cannot be sent, as a code the screen has a sentence for. */
export type FormProblem = 'number' | 'range' | 'model' | 'duplicate';
export interface FormResult { ok: boolean; patch?: Record<string, unknown>; problem?: FormProblem; field?: string }

function parseField(raw: string, max: number): { value: number } | { problem: 'number' | 'range' } {
  const value = Number(raw.trim());
  if (raw.trim() === '' || !Number.isFinite(value)) return { problem: 'number' };
  if (value <= 0 || value > max) return { problem: 'range' };
  return { value };
}

/** Turns the form into the body of PUT /api/admin/safety-limits, checking every number against the hard ceilings. */
export function buildPatch(form: SafetyForm, hard: HardLimits): FormResult {
  const fail = (problem: FormProblem, field: string): FormResult => ({ ok: false, problem, field });
  const ttl = Number(form.armTtlSeconds.trim());
  if (form.armTtlSeconds.trim() === '' || !Number.isFinite(ttl)) return fail('number', 'armTtl');
  const ttlMs = Math.round(ttl * 1000);
  if (ttlMs < hard.armTtlMs.min || ttlMs > hard.armTtlMs.max) return fail('range', 'armTtl');
  const dAmount = parseField(form.defaultMaxAmount, hard.jogMaxAmount);
  if ('problem' in dAmount) return fail(dAmount.problem, 'defaultMaxAmount');
  const dAbsolute = parseField(form.defaultMaxAbsolute, hard.jogMaxAbsolute);
  if ('problem' in dAbsolute) return fail(dAbsolute.problem, 'defaultMaxAbsolute');
  const dBed = parseField(form.defaultBedMaxC, hard.bedMaxC);
  if ('problem' in dBed) return fail(dBed.problem, 'defaultBedMaxC');

  const jogModels: Record<string, Partial<JogLimits>> = {};
  const tempModels: Record<string, Partial<TemperatureLimits>> = {};
  const seen = new Set<string>();
  for (const row of form.rows) {
    const key = modelKey(row.model);
    if (!key) return fail('model', 'model');
    if (seen.has(key)) return fail('duplicate', key);
    seen.add(key);
    if (row.maxAmount.trim() !== '' || row.maxAbsolute.trim() !== '') {
      const entry: Partial<JogLimits> = {};
      if (row.maxAmount.trim() !== '') {
        const r = parseField(row.maxAmount, hard.jogMaxAmount);
        if ('problem' in r) return fail(r.problem, `${key}.maxAmount`);
        entry.maxAmount = r.value;
      }
      if (row.maxAbsolute.trim() !== '') {
        const r = parseField(row.maxAbsolute, hard.jogMaxAbsolute);
        if ('problem' in r) return fail(r.problem, `${key}.maxAbsolute`);
        entry.maxAbsolute = r.value;
      }
      jogModels[key] = entry;
    }
    if (row.bedMaxC.trim() !== '') {
      const r = parseField(row.bedMaxC, hard.bedMaxC);
      if ('problem' in r) return fail(r.problem, `${key}.bedMaxC`);
      tempModels[key] = { bedMaxC: r.value };
    }
  }
  return {
    ok: true,
    patch: {
      jog: {
        armRequired: form.armRequired,
        armTtlMs: ttlMs,
        default: { maxAmount: dAmount.value, maxAbsolute: dAbsolute.value },
        models: jogModels,
      },
      temperature: { default: { bedMaxC: dBed.value }, models: tempModels },
      claims: { requireControllerId: form.requireControllerId },
    },
  };
}

// ----- warnings of the server ---------------------------------------------------------------------------------------------

export interface ServerWarning { code: string | null; field: string | null; message: string | null; requested: number | null; applied: number | null; robotId: number | null }

/** The structured warnings of an answer (objects with a code, a field or a message; plain strings become a message). */
export function parseWarnings(body: unknown): ServerWarning[] {
  const list = body && typeof body === 'object' ? (body as Record<string, unknown>).warnings : null;
  if (!Array.isArray(list)) return [];
  return list.map((w): ServerWarning => {
    if (typeof w === 'string') return { code: null, field: null, message: w, requested: null, applied: null, robotId: null };
    if (w && typeof w === 'object') {
      const o = w as Record<string, unknown>;
      return {
        code: typeof o.code === 'string' ? o.code : null,
        field: typeof o.field === 'string' ? o.field : null,
        message: typeof o.message === 'string' ? o.message : null,
        requested: typeof o.requested === 'number' ? o.requested : null,
        applied: typeof o.applied === 'number' ? o.applied : null,
        robotId: typeof o.robotId === 'number' ? o.robotId : null,
      };
    }
    return { code: null, field: null, message: null, requested: null, applied: null, robotId: null };
  });
}

export const isJogWarning = (w: ServerWarning): boolean => w.field === 'jog';
export const isTemperatureWarning = (w: ServerWarning): boolean => w.code === 'temperature-limit';

/** Whether the jog of a robot is armed right now, from the `jogArmedUntil` the server reports or an arming this window made. */
export function isArmed(armedUntil: number | null | undefined, now: number = Date.now()): boolean {
  return typeof armedUntil === 'number' && armedUntil > now;
}
