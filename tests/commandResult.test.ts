// =============================================================================
// HYDRA-UMC STUDIO - tests/commandResult.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import {
  failureCodeForStatus,
  interpretCommandResponse,
  networkFailure,
  summarizeBulk,
} from '../src/lib/commandResult';

describe('failureCodeForStatus', () => {
  it('names the usual failures', () => {
    expect(failureCodeForStatus(0)).toBe('network');
    expect(failureCodeForStatus(401)).toBe('session_expired');
    expect(failureCodeForStatus(403)).toBe('forbidden');
    expect(failureCodeForStatus(404)).toBe('not_found');
    expect(failureCodeForStatus(409)).toBe('claimed');
    expect(failureCodeForStatus(422)).toBe('rejected');
    expect(failureCodeForStatus(503)).toBe('server');
  });
});

describe('interpretCommandResponse', () => {
  it('reads the warnings of an accepted command', () => {
    const result = interpretCommandResponse(200, true, { success: true, warnings: ['speed 5 is below the range', '', 7] });
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual(['speed 5 is below the range']);
    expect(result.code).toBe(null);
  });
  it('keeps the explanation the server gave for a refusal', () => {
    const result = interpretCommandResponse(409, false, { error: 'robot 1 is claimed by ana' });
    expect(result).toMatchObject({ ok: false, status: 409, code: 'claimed', detail: 'robot 1 is claimed by ana' });
  });
  it('survives a body that is not an object', () => {
    expect(interpretCommandResponse(500, false, null).detail).toBe(null);
    expect(interpretCommandResponse(500, false, 'oops').code).toBe('server');
    expect(interpretCommandResponse(200, true, [1, 2]).warnings).toEqual([]);
  });
  it('bounds the explanation', () => {
    const result = interpretCommandResponse(400, false, { error: 'x'.repeat(5000) });
    expect(result.detail?.length).toBe(300);
  });
});

describe('summarizeBulk', () => {
  const ok = interpretCommandResponse(200, true, {});
  it('is empty when every stop was accepted', () => {
    expect(summarizeBulk([{ robotId: 1, result: ok }, { robotId: 2, result: ok }])).toEqual({ failed: [], code: null, detail: null });
  });
  it('lists the robots that failed and the most telling code', () => {
    const summary = summarizeBulk([
      { robotId: 1, result: ok },
      { robotId: 2, result: interpretCommandResponse(409, false, { error: 'claimed' }) },
      { robotId: 3, result: networkFailure('Failed to fetch') },
    ]);
    expect(summary.failed).toEqual([2, 3]);
    expect(summary.code).toBe('network');
    expect(summary.detail).toBe('Failed to fetch');
  });
});
