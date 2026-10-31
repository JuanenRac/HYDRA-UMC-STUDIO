// =============================================================================
// HYDRA-UMC STUDIO - src/lib/ecosystemHealthApi.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The health of the services of the ecosystem (SERVER route GET /api/ecosystem/health), read defensively: a server that predates the
// route, or one where an administrator did not turn it on, answers 404 and the screen says so instead of breaking. The route is for
// operators and administrators; the port, health path and unit of a service only come for an administrator, and nothing here
// asks for them.
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export const SERVICE_STATES = ['ok', 'degraded', 'down', 'unknown'] as const;
export type ServiceState = (typeof SERVICE_STATES)[number];
export const SERVICE_REASONS = [
  'health_ok', 'health_degraded', 'health_failed', 'http_error', 'unreachable', 'unreachable_unit_active', 'reachable_unit_not_active',
  'unit_active', 'unit_starting', 'unit_failed', 'unit_inactive', 'no_signal', 'probe_error',
] as const;
export type ServiceReason = (typeof SERVICE_REASONS)[number];
export const CERTIFICATE_STATES = ['ok', 'expiring', 'expired', 'unreadable'] as const;
export type CertificateState = (typeof CERTIFICATE_STATES)[number];
export const WARNING_CODES = ['certificate_expiring', 'certificate_expired', 'certificate_unreadable', 'version_drift', 'service_down', 'service_degraded'] as const;
export type WarningCode = (typeof WARNING_CODES)[number];

export interface ServiceHealth {
  name: string;
  family: string | null;
  role: string | null;
  state: ServiceState;
  reason: ServiceReason | null;
  versionExpected: string | null;
  versionReported: string | null;
  drift: boolean;
  lastSeen: string | null;
  latencyMs: number | null;
}

export interface CertificateHealth {
  state: CertificateState;
  notAfter: string | null;
  daysLeft: number | null;
  warnDays: number;
}

export interface HealthWarning {
  code: WarningCode;
  service?: string;
}

export interface EcosystemHealth {
  generatedAt: string;
  available: boolean;
  summary: Record<ServiceState, number> & { total: number; drift: number };
  services: ServiceHealth[];
  certificate: CertificateHealth | null;
  warnings: HealthWarning[];
}

export type HealthResult = { ok: true; value: EcosystemHealth } | { ok: false; failure: 'unsupported' | 'forbidden' | 'network' | 'http' | 'malformed'; status?: number };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const text = (value: unknown, max: number): string | null => (typeof value === 'string' && value.trim() !== '' ? value.slice(0, max) : null);
const whole = (value: unknown): number | null => (typeof value === 'number' && Number.isInteger(value) ? value : null);
const dateOf = (value: unknown): string | null => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null);
const oneOf = <T extends string>(list: readonly T[], value: unknown): T | null => ((list as readonly unknown[]).includes(value) ? (value as T) : null);

export function parseService(data: unknown): ServiceHealth | null {
  const r = object(data);
  const name = text(r.name, 80);
  if (!name) return null;
  return {
    name,
    family: text(r.family, 40),
    role: text(r.role, 40),
    // a state this app does not know (a newer server) is shown as unknown rather than dropped
    state: oneOf(SERVICE_STATES, r.state) ?? 'unknown',
    reason: oneOf(SERVICE_REASONS, r.reason),
    versionExpected: text(r.version_expected, 24),
    versionReported: text(r.version_reported, 24),
    drift: r.drift === true,
    lastSeen: dateOf(r.last_seen_utc),
    latencyMs: whole(r.latency_ms),
  };
}

export function parseCertificate(data: unknown): CertificateHealth | null {
  const r = object(data);
  const state = oneOf(CERTIFICATE_STATES, r.state);
  if (!state) return null;
  return { state, notAfter: dateOf(r.not_after_utc), daysLeft: whole(r.days_left), warnDays: whole(r.warn_days) ?? 30 };
}

export function parseWarning(data: unknown): HealthWarning | null {
  const r = object(data);
  const code = oneOf(WARNING_CODES, r.code);
  if (!code) return null;
  const service = text(r.service, 80);
  return service ? { code, service } : { code };
}

/** Reads the answer; null when it is not the shape of the route at all. */
export function parseHealth(data: unknown): EcosystemHealth | null {
  const r = object(data);
  if (r.schema_version !== '1.0' || !Array.isArray(r.services)) return null;
  const services = r.services.map(parseService).filter((s): s is ServiceHealth => s !== null);
  const count = (state: ServiceState) => services.filter(s => s.state === state).length;
  return {
    generatedAt: dateOf(r.generated_at_utc) ?? '',
    available: r.available !== false,
    // counted again from the list, so the cards and the numbers can never disagree
    summary: { total: services.length, ok: count('ok'), degraded: count('degraded'), down: count('down'), unknown: count('unknown'), drift: services.filter(s => s.drift).length },
    services,
    certificate: parseCertificate(r.certificate),
    warnings: Array.isArray(r.warnings) ? r.warnings.map(parseWarning).filter((w): w is HealthWarning => w !== null) : [],
  };
}

export type StateFilter = 'all' | ServiceState | 'drift';

/** The services a filter keeps: one state, or only those that report another version than their manifest. */
export function filterServices(services: ServiceHealth[], filter: StateFilter): ServiceHealth[] {
  if (filter === 'all') return services;
  if (filter === 'drift') return services.filter(s => s.drift);
  return services.filter(s => s.state === filter);
}

/** The most serious state first, so what needs attention is at the top. */
const SEVERITY: Record<ServiceState, number> = { down: 0, degraded: 1, unknown: 2, ok: 3 };
export function sortBySeverity(services: ServiceHealth[]): ServiceHealth[] {
  return [...services].sort((a, b) => SEVERITY[a.state] - SEVERITY[b.state] || a.name.localeCompare(b.name));
}

/** "5s", "12m", "3h 4m", "2d" since a date, short enough for a card. */
export function ago(iso: string | null, now: number): string | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d`;
}

export async function loadEcosystemHealth(): Promise<HealthResult> {
  try {
    const res = await authFetch(apiUrl('/api/ecosystem/health'));
    if (res.status === 404) return { ok: false, failure: 'unsupported' };
    if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden', status: res.status };
    if (!res.ok) return { ok: false, failure: 'http', status: res.status };
    const value = parseHealth(await res.json().catch(() => null));
    return value ? { ok: true, value } : { ok: false, failure: 'malformed' };
  } catch {
    return { ok: false, failure: 'network' };
  }
}
