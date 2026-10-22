// =============================================================================
// HYDRA-UMC STUDIO - src/lib/serverSecurity.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The access options the Server Admin screen shows and changes (GET/PUT /api/admin/server-config):
// who may use the local AI relay, whether the host information asks for a sign-in, and TLS. The
// reading is tolerant: a server that predates these options answers without them and the screen
// simply does not show the section.

export type SecuritySource = 'env' | 'config' | 'default';

export interface SecurityState {
  aiAccess: { value: 'open' | 'admin'; source: SecuritySource };
  infoAuth: { value: boolean; source: SecuritySource };
  tls: {
    enabled: boolean;
    source: SecuritySource;
    certPath: string;
    keyPath: string;
    fingerprint256: string | null;
    active: boolean;
    appliesOnRestart: boolean;
  };
}

const isSource = (value: unknown): value is SecuritySource => value === 'env' || value === 'config' || value === 'default';

export function parseSecurityState(data: unknown): SecurityState | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, any>;
  const ai = raw.aiAccess;
  const info = raw.infoAuth;
  const tls = raw.tls;
  if (!ai || !info || !tls) return null;
  if ((ai.value !== 'open' && ai.value !== 'admin') || !isSource(ai.source)) return null;
  if (typeof info.value !== 'boolean' || !isSource(info.source)) return null;
  if (typeof tls.enabled !== 'boolean' || !isSource(tls.source)) return null;
  return {
    aiAccess: { value: ai.value, source: ai.source },
    infoAuth: { value: info.value, source: info.source },
    tls: {
      enabled: tls.enabled,
      source: tls.source,
      certPath: typeof tls.certPath === 'string' ? tls.certPath : '',
      keyPath: typeof tls.keyPath === 'string' ? tls.keyPath : '',
      fingerprint256: typeof tls.fingerprint256 === 'string' ? tls.fingerprint256 : null,
      active: tls.active === true,
      appliesOnRestart: tls.appliesOnRestart === true,
    },
  };
}

/** A value fixed by the environment of the server cannot be changed from the screen. */
export const isLocked = (source: SecuritySource): boolean => source === 'env';

/** Turning the sign-in requirement of the host information off asks for a confirmation first. */
export function infoAuthChangeNeedsConfirmation(current: boolean, next: boolean): boolean {
  return current && !next;
}

/** The request body for the TLS part; null when it is switched on without both paths. */
export function tlsPatch(enabled: boolean, certPath: string, keyPath: string): { tls: { enabled: boolean; certPath: string; keyPath: string } } | null {
  const cert = certPath.trim();
  const key = keyPath.trim();
  if (enabled && (cert === '' || key === '')) return null;
  return { tls: { enabled, certPath: cert, keyPath: key } };
}

/** The warnings of a PUT answer that the screen knows how to say. */
export function knownWarnings(warnings: unknown): string[] {
  if (!Array.isArray(warnings)) return [];
  return warnings.filter((item): item is string => item === 'info_auth_off');
}
