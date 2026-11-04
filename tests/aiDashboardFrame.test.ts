// =============================================================================
// HYDRA-UMC STUDIO - tests/aiDashboardFrame.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import {
  DASHBOARD_AI_HEIGHT_MESSAGE,
  MAX_FRAME_HEIGHT,
  MIN_FRAME_HEIGHT,
  canShareLogin,
  dashboardAiUrl,
  heightFromMessage,
  originOf,
} from '../src/lib/aiDashboardFrame';

const PAGE = 'http://cm5.local:3000';

describe('the frame of the AI dashboard', () => {
  it('points at the embedded mode of the page the server serves', () => {
    expect(dashboardAiUrl('')).toBe('/dashboard-ai/?embed=1');
    expect(dashboardAiUrl('http://cm5.local:3000')).toBe('http://cm5.local:3000/dashboard-ai/?embed=1');
  });

  it('is framed only when the page comes from the origin of this app (the login is shared only there)', () => {
    expect(canShareLogin('/dashboard-ai/?embed=1', PAGE)).toBe(true);
    expect(canShareLogin('http://cm5.local:3000/dashboard-ai/?embed=1', PAGE)).toBe(true);
    expect(canShareLogin('http://cm5.local:3001/dashboard-ai/?embed=1', PAGE)).toBe(false);
    expect(canShareLogin('https://cm5.local:3000/dashboard-ai/?embed=1', PAGE)).toBe(false);
    expect(canShareLogin('javascript:alert(1)', PAGE)).toBe(false);
    expect(originOf('data:text/html,x', PAGE)).toBeNull();
  });

  describe('the height message', () => {
    const frame = {};
    const ok = { type: DASHBOARD_AI_HEIGHT_MESSAGE, height: 900.2 };
    const base = { data: ok, origin: PAGE, source: frame, frameWindow: frame, expectedOrigin: PAGE };

    it('is believed when it comes from the frame, from the origin of the page, with the right type', () => {
      expect(heightFromMessage(base)).toBe(901);
    });
    it('keeps the height inside a sensible range', () => {
      expect(heightFromMessage({ ...base, data: { ...ok, height: 3 } })).toBe(MIN_FRAME_HEIGHT);
      expect(heightFromMessage({ ...base, data: { ...ok, height: 5e6 } })).toBe(MAX_FRAME_HEIGHT);
    });
    it('is refused from another origin, from another window, with another type or a number that is not one', () => {
      expect(heightFromMessage({ ...base, origin: 'http://evil.example' })).toBeNull();
      expect(heightFromMessage({ ...base, source: {} })).toBeNull();
      expect(heightFromMessage({ ...base, frameWindow: null, source: null })).toBeNull();
      expect(heightFromMessage({ ...base, data: { ...ok, type: 'other' } })).toBeNull();
      for (const height of [NaN, Infinity, -5, 0, '700', null]) {
        expect(heightFromMessage({ ...base, data: { ...ok, height } })).toBeNull();
      }
      expect(heightFromMessage({ ...base, data: 'text' })).toBeNull();
      expect(heightFromMessage({ ...base, data: null })).toBeNull();
    });
  });
});
