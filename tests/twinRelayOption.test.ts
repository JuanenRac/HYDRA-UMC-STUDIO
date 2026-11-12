// =============================================================================
// HYDRA-UMC STUDIO - tests/twinRelayOption.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseSecurityState, twinRelayPatch } from '../src/lib/serverSecurity';

const answer = {
  port: 3000,
  aiAccess: { value: 'admin', source: 'config' },
  infoAuth: { value: true, source: 'env' },
  tls: { enabled: false, source: 'default', certPath: '', keyPath: '', fingerprint256: null, active: false, appliesOnRestart: false },
};

describe('the option of the relay of the live state of the twin', () => {
  it('reads what the server reports and shows nothing for a server that predates it', () => {
    expect(parseSecurityState({ ...answer, twinRelay: { enabled: { value: false, source: 'default' } } })?.twinRelay).toEqual({ enabled: { value: false, source: 'default' } });
    expect(parseSecurityState({ ...answer, twinRelay: { enabled: { value: true, source: 'env' } } })?.twinRelay).toEqual({ enabled: { value: true, source: 'env' } });
    expect(parseSecurityState(answer)?.twinRelay).toBeNull();
    expect(parseSecurityState({ ...answer, twinRelay: { enabled: { value: 'yes', source: 'default' } } })?.twinRelay).toBeNull();
    expect(parseSecurityState({ ...answer, twinRelay: { enabled: { value: true, source: 'nowhere' } } })?.twinRelay).toBeNull();
  });

  it('builds the request', () => {
    expect(twinRelayPatch(true)).toEqual({ twinRelay: { enabled: true } });
    expect(twinRelayPatch(false)).toEqual({ twinRelay: { enabled: false } });
  });

  it('has its texts in the eight languages', () => {
    for (const lang of ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt']) {
      const text = JSON.parse(readFileSync(new URL(`../src/locales/${lang}.json`, import.meta.url), 'utf-8'));
      for (const key of ['title', 'label', 'help', 'save']) {
        expect(typeof text.ecosystem?.[`admin_security_twin_relay_${key}`], `${lang} ${key}`).toBe('string');
      }
    }
  });
});
