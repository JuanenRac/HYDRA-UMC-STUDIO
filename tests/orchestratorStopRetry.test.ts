// =============================================================================
// HYDRA-UMC STUDIO - tests/orchestratorStopRetry.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { knownWarnings, parseOrchestrator } from '../src/lib/serverSecurity';

describe('the global stop retry of the orchestrator', () => {
  it('reads the option and whether it can be changed', () => {
    expect(parseOrchestrator({ retryServer: { value: true, source: 'default' }, editable: false })).toEqual({ retryServer: { value: true, source: 'default' }, editable: false });
    expect(parseOrchestrator({ retryServer: { value: false, source: 'config' }, editable: true })?.editable).toBe(true);
  });

  it('is absent for a server that predates it or answers something else', () => {
    for (const raw of [undefined, null, 'x', {}, { retryServer: { value: 'yes', source: 'config' } }, { retryServer: { value: true, source: 'nowhere' } }]) {
      expect(parseOrchestrator(raw), JSON.stringify(raw)).toBeNull();
    }
  });

  it('knows the warning of switching it off', () => {
    expect(knownWarnings(['orchestrator_stop_retry_off'])).toEqual(['orchestrator_stop_retry_off']);
  });
});
