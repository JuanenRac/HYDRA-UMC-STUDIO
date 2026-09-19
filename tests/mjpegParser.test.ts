// =============================================================================
// HYDRA-UMC STUDIO - tests/mjpegParser.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { parseMjpegFrames } from '../src/lib/mjpegParser';

function buildRecording(frames: number[][]): ArrayBuffer {
  const parts: Uint8Array[] = [];
  for (const frame of frames) {
    const bytes = new Uint8Array(frame);
    const header = `--hydraumcframe\r\nContent-Type: image/jpeg\r\nContent-Length: ${bytes.length}\r\n\r\n`;
    parts.push(new TextEncoder().encode(header));
    parts.push(bytes);
    parts.push(new TextEncoder().encode('\r\n'));
  }
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out.buffer;
}

describe('parseMjpegFrames', () => {
  it('parses every real frame out of a multi-frame recording, in order', async () => {
    const recording = buildRecording([[1, 2, 3], [4, 5, 6, 7], [8]]);
    const frames = parseMjpegFrames(recording);
    expect(frames).toHaveLength(3);
    expect(new Uint8Array(await frames[0].blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(new Uint8Array(await frames[1].blob.arrayBuffer())).toEqual(new Uint8Array([4, 5, 6, 7]));
    expect(new Uint8Array(await frames[2].blob.arrayBuffer())).toEqual(new Uint8Array([8]));
  });

  it('returns an empty array for an empty recording', () => {
    expect(parseMjpegFrames(new ArrayBuffer(0))).toEqual([]);
  });

  it('stops cleanly at a truncated final frame instead of throwing', () => {
    const full = buildRecording([[1, 2, 3], [4, 5, 6]]);
    const truncated = full.slice(0, full.byteLength - 4); // cut into the last frame's own payload bytes
    const frames = parseMjpegFrames(truncated);
    expect(frames.length).toBe(1);
    expect(frames[0].blob.size).toBe(3);
  });

  it('never confuses a frame whose own JPEG bytes happen to contain CRLFCRLF', async () => {
    const trickyFrame = [0x0d, 0x0a, 0x0d, 0x0a, 9, 9, 9];
    const recording = buildRecording([trickyFrame]);
    const frames = parseMjpegFrames(recording);
    expect(frames).toHaveLength(1);
    expect(new Uint8Array(await frames[0].blob.arrayBuffer())).toEqual(new Uint8Array(trickyFrame));
  });
});
