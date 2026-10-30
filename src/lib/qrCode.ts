// =============================================================================
// HYDRA-UMC STUDIO - src/lib/qrCode.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// A small QR Code encoder (ISO/IEC 18004) for the one thing this app has to show as a code: the otpauth address that an
// authenticator app scans to learn the second-factor secret. It writes byte mode with error correction level M, versions
// 1 to 10 (up to 213 bytes), and picks the smallest version that holds the text and the best of the eight masks. A text that
// does not fit is refused (the screen then shows the key to type by hand, which always works).

type Bit = 0 | 1;
export type QrMatrix = Bit[][];

// Per version (index 0 = version 1), error correction level M: [error correction codewords per block, [blocks, data codewords] groups].
const BLOCKS_M: Array<[number, Array<[number, number]>]> = [
  [10, [[1, 16]]],
  [16, [[1, 28]]],
  [26, [[1, 44]]],
  [18, [[2, 32]]],
  [24, [[2, 43]]],
  [16, [[4, 27]]],
  [18, [[4, 31]]],
  [22, [[2, 38], [2, 39]]],
  [22, [[3, 36], [2, 37]]],
  [26, [[4, 43], [1, 44]]],
];

const ALIGNMENT: number[][] = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

export const QR_MAX_BYTES = 213;

function dataCodewords(version: number): number {
  return BLOCKS_M[version - 1][1].reduce((sum, [count, size]) => sum + count * size, 0);
}

// Galois field GF(256) with the QR polynomial 0x11D.
const EXP = new Array<number>(512);
const LOG = new Array<number>(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function generator(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= poly[j] === 0 ? 0 : EXP[LOG[poly[j]] + i];
    }
    poly = next;
  }
  return poly;
}

function remainder(data: number[], degree: number): number[] {
  const gen = generator(degree);
  const out = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ out[0];
    out.shift();
    out.push(0);
    if (factor !== 0) for (let i = 0; i < degree; i++) out[i] ^= EXP[LOG[gen[i + 1]] + LOG[factor]];
  }
  return out;
}

function utf8(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

function bitsOf(bytes: number[], version: number): number[] {
  const bits: number[] = [];
  const push = (value: number, length: number) => { for (let i = length - 1; i >= 0; i--) bits.push((value >> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, version <= 9 ? 8 : 16);
  for (const byte of bytes) push(byte, 8);
  const capacity = dataCodewords(version) * 8;
  push(0, Math.min(4, capacity - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  for (let pad = 0xec; bits.length < capacity; pad = pad === 0xec ? 0x11 : 0xec) push(pad, 8);
  return bits;
}

function codewordsOf(bits: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  return out;
}

function interleave(data: number[], version: number): number[] {
  const [ecLen, groups] = BLOCKS_M[version - 1];
  const blocks: number[][] = [];
  let offset = 0;
  for (const [count, size] of groups) {
    for (let i = 0; i < count; i++) { blocks.push(data.slice(offset, offset + size)); offset += size; }
  }
  const ecBlocks = blocks.map(block => remainder(block, ecLen));
  const out: number[] = [];
  const longest = Math.max(...blocks.map(block => block.length));
  for (let i = 0; i < longest; i++) for (const block of blocks) if (i < block.length) out.push(block[i]);
  for (let i = 0; i < ecLen; i++) for (const block of ecBlocks) out.push(block[i]);
  return out;
}

function bch(value: number, generatorPoly: number, bitsOfGenerator: number): number {
  let remainderBits = value << (bitsOfGenerator - 1);
  const top = bitsOfGenerator - 1;
  for (let i = 31; i >= top; i--) if ((remainderBits >> i) & 1) remainderBits ^= generatorPoly << (i - top);
  return remainderBits;
}

function formatBits(mask: number): number {
  const data = (0b00 << 3) | mask; // level M = 00
  const value = (data << 10) | bch(data, 0x537, 11);
  return value ^ 0x5412;
}

function versionBits(version: number): number {
  return (version << 12) | bch(version, 0x1f25, 13);
}

interface Grid { size: number; cells: Bit[][]; reserved: boolean[][] }

function emptyGrid(version: number): Grid {
  const size = 17 + 4 * version;
  return {
    size,
    cells: Array.from({ length: size }, () => new Array<Bit>(size).fill(0)),
    reserved: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
  };
}

function put(grid: Grid, row: number, col: number, value: boolean): void {
  grid.cells[row][col] = value ? 1 : 0;
  grid.reserved[row][col] = true;
}

function finder(grid: Grid, row: number, col: number): void {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || cc < 0 || rr >= grid.size || cc >= grid.size) continue;
      const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
      put(grid, rr, cc, ring !== 2 && ring !== 4);
    }
  }
}

function alignment(grid: Grid, version: number): void {
  const positions = ALIGNMENT[version - 1];
  for (const r of positions) {
    for (const c of positions) {
      if ((r === 6 && c === 6) || (r === 6 && c === grid.size - 7) || (r === grid.size - 7 && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) put(grid, r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
    }
  }
}

function reserveFunctionAreas(grid: Grid, version: number): void {
  finder(grid, 0, 0);
  finder(grid, 0, grid.size - 7);
  finder(grid, grid.size - 7, 0);
  alignment(grid, version);
  for (let i = 8; i < grid.size - 8; i++) {
    put(grid, 6, i, i % 2 === 0);
    put(grid, i, 6, i % 2 === 0);
  }
  for (let i = 0; i < 9; i++) { grid.reserved[8][i] = true; grid.reserved[i][8] = true; }
  for (let i = 0; i < 8; i++) { grid.reserved[8][grid.size - 1 - i] = true; grid.reserved[grid.size - 1 - i][8] = true; }
  put(grid, grid.size - 8, 8, true); // the always-dark module
  if (version >= 7) {
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
      grid.reserved[i][grid.size - 11 + j] = true;
      grid.reserved[grid.size - 11 + j][i] = true;
    }
  }
}

function placeData(grid: Grid, bits: number[]): void {
  let index = 0;
  let upward = true;
  for (let col = grid.size - 1; col > 0; col -= 2) {
    if (col === 6) col = 5;
    for (let step = 0; step < grid.size; step++) {
      const row = upward ? grid.size - 1 - step : step;
      for (let k = 0; k < 2; k++) {
        const c = col - k;
        if (grid.reserved[row][c]) continue;
        grid.cells[row][c] = index < bits.length ? (bits[index] as Bit) : 0;
        index++;
      }
    }
    upward = !upward;
  }
}

const MASKS: Array<(r: number, c: number) => boolean> = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function withMask(grid: Grid, mask: number, version: number): Bit[][] {
  const size = grid.size;
  const cells = grid.cells.map(row => row.slice());
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!grid.reserved[r][c] && MASKS[mask](r, c)) cells[r][c] = (cells[r][c] ^ 1) as Bit;
  const format = formatBits(mask);
  for (let i = 0; i < 15; i++) {
    const bit = ((format >> i) & 1) as Bit;
    // First copy around the top-left finder.
    if (i < 6) cells[i][8] = bit; else if (i < 8) cells[i + 1][8] = bit; else if (i === 8) cells[8][7] = bit; else cells[8][14 - i] = bit;
    // Second copy beside the other two finders.
    if (i < 8) cells[8][size - 1 - i] = bit; else cells[size - 15 + i][8] = bit;
  }
  if (version >= 7) {
    const info = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((info >> i) & 1) as Bit;
      const a = Math.floor(i / 3);
      const b = size - 11 + (i % 3);
      cells[a][b] = bit;
      cells[b][a] = bit;
    }
  }
  return cells;
}

function penalty(cells: Bit[][]): number {
  const size = cells.length;
  let score = 0;
  for (let pass = 0; pass < 2; pass++) {
    const at = (a: number, b: number) => (pass === 0 ? cells[a][b] : cells[b][a]);
    for (let a = 0; a < size; a++) {
      let run = 1;
      for (let b = 1; b < size; b++) {
        if (at(a, b) === at(a, b - 1)) { run++; if (run === 5) score += 3; else if (run > 5) score++; } else run = 1;
      }
      for (let b = 0; b + 10 < size; b++) {
        const w = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
        const v = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
        let okW = true;
        let okV = true;
        for (let k = 0; k < 11; k++) { const bit = at(a, b + k); if (bit !== w[k]) okW = false; if (bit !== v[k]) okV = false; }
        if (okW) score += 40;
        if (okV) score += 40;
      }
    }
  }
  for (let r = 0; r + 1 < size; r++) for (let c = 0; c + 1 < size; c++) {
    const v = cells[r][c];
    if (v === cells[r][c + 1] && v === cells[r + 1][c] && v === cells[r + 1][c + 1]) score += 3;
  }
  let dark = 0;
  for (const row of cells) for (const v of row) dark += v;
  score += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
  return score;
}

/** The module matrix of the QR Code for `text`, or null when the text needs more than 213 bytes. 1 = dark module. */
export function encodeQr(text: string): QrMatrix | null {
  const bytes = utf8(text);
  let version = 0;
  for (let v = 1; v <= 10; v++) {
    const header = v <= 9 ? 12 : 20;
    if (header + bytes.length * 8 <= dataCodewords(v) * 8) { version = v; break; }
  }
  if (version === 0) return null;
  const stream = interleave(codewordsOf(bitsOf(bytes, version)), version);
  const bits: number[] = [];
  for (const byte of stream) for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  const grid = emptyGrid(version);
  reserveFunctionAreas(grid, version);
  placeData(grid, bits);
  let best: Bit[][] | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const candidate = withMask(grid, mask, version);
    const score = penalty(candidate);
    if (score < bestScore) { bestScore = score; best = candidate; }
  }
  return best;
}

/** The matrix as the path of an SVG (one square per dark module, the quiet zone of four modules included). */
export function qrSvgPath(matrix: QrMatrix, quiet = 4): { path: string; size: number } {
  const size = matrix.length + quiet * 2;
  let path = '';
  matrix.forEach((row, r) => row.forEach((v, c) => { if (v) path += `M${c + quiet} ${r + quiet}h1v1h-1z`; }));
  return { path, size };
}
