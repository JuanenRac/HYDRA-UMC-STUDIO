// =============================================================================
// HYDRA-UMC STUDIO - tests/sha256.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../src/lib/sha256';

const bytes = (text: string) => new TextEncoder().encode(text);

describe('sha256Hex', () => {
  it('matches the published test vectors', () => {
    expect(sha256Hex(bytes(''))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex(bytes('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex(bytes('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')))
      .toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  });

  it('agrees with the platform implementation for every length around a block boundary', () => {
    for (let length = 0; length <= 200; length += 1) {
      const data = new Uint8Array(length).map((_, i) => (i * 37 + length) & 0xff);
      expect(sha256Hex(data), `length ${length}`).toBe(createHash('sha256').update(data).digest('hex'));
    }
  });

  it('hashes a large image like the platform does', () => {
    const data = new Uint8Array(300_000).map((_, i) => (i * 131) & 0xff);
    expect(sha256Hex(data)).toBe(createHash('sha256').update(data).digest('hex'));
  });
});
