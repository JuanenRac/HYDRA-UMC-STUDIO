// =============================================================================
// HYDRA-UMC STUDIO - tests/apiBase.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// API_BASE is computed once at module load from import.meta.env.DEV and
// window.location - each scenario below stubs those first, then imports
// the module fresh (vi.resetModules()) to get a real, independent
// evaluation instead of vitest's cached one from an earlier test.
function stubLocation(overrides: Partial<Location>) {
  vi.stubGlobal('window', { location: { hostname: 'cm5.local', port: '3000', protocol: 'http:', ...overrides } });
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiUrl/wsUrl in a production build', () => {
  it('matches this page\'s own https: origin instead of always assuming http:', async () => {
    // Real bug: HYDRA-UMC-SERVER's own optional TLS turns this exact page
    // itself into an https: page (STUDIO's default same-origin deployment -
    // see apiBase.ts's own header comment) - a hardcoded http: origin here
    // made every fetch() a browser-blocked mixed-content request.
    stubLocation({ protocol: 'https:', hostname: '192.168.0.180', port: '18080' } as Location);
    vi.stubEnv('DEV', false);
    const { apiUrl, wsUrl } = await import('../src/lib/apiBase');
    expect(apiUrl('/api/settings')).toBe('https://192.168.0.180:18080/api/settings');
    expect(wsUrl('/ws')).toBe('wss://192.168.0.180:18080/ws');
  });

  it('still defaults to http: for a plain-HTTP deployment, unchanged', async () => {
    stubLocation({ protocol: 'http:', hostname: '192.168.0.180', port: '3000' } as Location);
    vi.stubEnv('DEV', false);
    const { apiUrl, wsUrl } = await import('../src/lib/apiBase');
    expect(apiUrl('/api/settings')).toBe('http://192.168.0.180:3000/api/settings');
    expect(wsUrl('/ws')).toBe('ws://192.168.0.180:3000/ws');
  });
});
