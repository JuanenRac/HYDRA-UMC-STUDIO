// =============================================================================
// HYDRA-UMC STUDIO - tests/mediaTicket.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { withTicket } from '../src/lib/mediaTicket';

describe('withTicket', () => {
  it('leaves the address alone when there is no ticket', () => {
    expect(withTicket('/api/camera/1/stream', null)).toBe('/api/camera/1/stream');
  });
  it('adds the ticket as a query parameter, encoded', () => {
    expect(withTicket('/api/camera/1/stream', 'a.b.c')).toBe('/api/camera/1/stream?ticket=a.b.c');
    expect(withTicket('/x', 'a b/c')).toBe('/x?ticket=a%20b%2Fc');
  });
  it('appends to an address that already has a query', () => {
    expect(withTicket('/x?y=1', 't')).toBe('/x?y=1&ticket=t');
  });
});
