// =============================================================================
// HYDRA-UMC STUDIO - tests/qrCode.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The QR encoder that draws the key of the second step. The structure of the symbol is checked here (size by version,
// finder and timing patterns, the format information and its error-correction code); that the symbols decode with a real
// reader was checked by decoding them with an independent QR reader over many lengths and masks.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { QR_MAX_BYTES, encodeQr, qrSvgPath } from '../src/lib/qrCode';

const URI = 'otpauth://totp/HYDRA-UMC:admin?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=HYDRA-UMC&algorithm=SHA1&digits=6&period=30';

function formatWord(matrix: number[][]): number {
  // the first copy, read in the order of the standard: bits 0-5 down column 8, 6-7, then 8-14 along row 8
  const cells = [[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [7, 8], [8, 8], [8, 7], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0]];
  return cells.reduce((word, [r, c], i) => word | (matrix[r][c] << i), 0);
}

function bchRemainder(value: number): number {
  let rem = value << 10;
  for (let i = 14; i >= 10; i--) if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
  return rem;
}

describe('encodeQr', () => {
  it('picks the smallest version that holds the text', () => {
    expect(encodeQr('hi')!.length).toBe(21);
    expect(encodeQr('x'.repeat(14))!.length).toBe(21);
    expect(encodeQr('x'.repeat(15))!.length).toBe(25);
    expect(encodeQr(URI)!.length).toBe(45);
    expect(encodeQr('x'.repeat(QR_MAX_BYTES))!.length).toBe(57);
  });

  it('refuses a text that does not fit', () => {
    expect(encodeQr('x'.repeat(QR_MAX_BYTES + 1))).toBeNull();
  });

  it('draws the three finder patterns, the timing line and the always-dark module', () => {
    const m = encodeQr(URI)!;
    const n = m.length;
    const finderAt = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
        const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
        expect(m[r0 + r][c0 + c]).toBe(ring === 2 ? 0 : 1);
      }
    };
    finderAt(0, 0);
    finderAt(0, n - 7);
    finderAt(n - 7, 0);
    for (let i = 8; i < n - 8; i++) { expect(m[6][i]).toBe(i % 2 === 0 ? 1 : 0); expect(m[i][6]).toBe(i % 2 === 0 ? 1 : 0); }
    expect(m[n - 8][8]).toBe(1);
  });

  it('writes a format word whose error-correction code is right and whose two copies agree', () => {
    for (const text of ['hi', URI, 'y'.repeat(100)]) {
      const m = encodeQr(text)!;
      const n = m.length;
      const word = formatWord(m) ^ 0x5412;
      expect(bchRemainder(word >> 10)).toBe(word & 0x3ff);
      expect(word >> 13).toBe(0); // level M
      const second = [0, 1, 2, 3, 4, 5, 6, 7].reduce((w, i) => w | (m[8][n - 1 - i] << i), 0) | [8, 9, 10, 11, 12, 13, 14].reduce((w, i) => w | (m[n - 15 + i][8] << i), 0);
      expect(second).toBe(formatWord(m));
    }
  });

  it('is deterministic and only holds 0 and 1', () => {
    const a = encodeQr(URI)!;
    const b = encodeQr(URI)!;
    expect(a).toEqual(b);
    expect(a.every(row => row.every(v => v === 0 || v === 1))).toBe(true);
  });

  it('turns the matrix into an SVG path with a quiet zone', () => {
    const m = encodeQr('hi')!;
    const { path, size } = qrSvgPath(m);
    expect(size).toBe(29);
    expect((path.match(/M/g) ?? []).length).toBe(m.flat().filter(v => v === 1).length);
    expect(path.startsWith('M4 4h1v1h-1z')).toBe(true);
  });
});
