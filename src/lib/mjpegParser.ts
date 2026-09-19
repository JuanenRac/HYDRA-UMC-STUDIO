// =============================================================================
// HYDRA-UMC STUDIO - src/lib/mjpegParser.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// A saved recording is a raw multipart/x-mixed-replace file on disk (see
// HYDRA-UMC-SERVER's own recording/start handler) - the exact same framing
// a live stream uses. A plain <img src> "plays" that back frame by frame
// with zero controls (no play/pause/stop, no seek), since it's rendered as
// an image stream, not a real video element. This module parses the whole
// file into individual real JPEG frame Blobs so a real player component can
// step through them under its own control - same boundary/Content-Length
// framing HYDRA-UMC-SERVER's own extractFirstJpegFrame()/countMjpegFrames()
// already parse server-side, walked all the way through instead of
// stopping at the first frame.
// =============================================================================

const BOUNDARY = "hydraumcframe";

export interface ParsedMjpegFrame {
  blob: Blob;
}

/** Parses a full .mjpeg file's bytes into an ordered array of real JPEG
 * frame Blobs. Never guesses frame boundaries from JPEG markers - only
 * from the real `Content-Length` header each frame's own multipart part
 * carries, matching the server's own parsing exactly. */
export function parseMjpegFrames(buffer: ArrayBuffer): ParsedMjpegFrame[] {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder("ascii");
  const frames: ParsedMjpegFrame[] = [];
  let offset = 0;

  const indexOfHeaderEnd = (from: number): number => {
    for (let i = from; i < bytes.length - 3; i++) {
      if (bytes[i] === 0x0d && bytes[i + 1] === 0x0a && bytes[i + 2] === 0x0d && bytes[i + 3] === 0x0a) return i;
    }
    return -1;
  };

  while (offset < bytes.length) {
    const headerEnd = indexOfHeaderEnd(offset);
    if (headerEnd === -1) break;
    const head = decoder.decode(bytes.subarray(offset, headerEnd));
    const match = head.match(/Content-Length:\s*(\d+)/i);
    if (!match) break;
    const length = Number(match[1]);
    const payloadStart = headerEnd + 4;
    if (bytes.length < payloadStart + length) break;
    frames.push({ blob: new Blob([bytes.subarray(payloadStart, payloadStart + length)], { type: "image/jpeg" }) });
    offset = payloadStart + length;
  }
  return frames;
}

export { BOUNDARY as MJPEG_BOUNDARY };
