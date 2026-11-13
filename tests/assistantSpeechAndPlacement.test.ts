// =============================================================================
// HYDRA-UMC STUDIO - tests/assistantSpeechAndPlacement.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The reading aloud of the assistant never fails loudly (no speech in the browser means no sound, not an error), picks a voice of the interface language, and the
// placement of the bubble keeps it inside the work area whenever it fits, for boxes drawn with a fixed seed.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { speak, speakable, speechAvailable, stopSpeech } from '../src/assistant/speech';
import { SIDES, placeBubble, type Box, type Size } from '../src/assistant/placement';

class FakeUtterance {
  text: string;
  lang = '';
  voice: unknown = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) { this.text = text; }
}

function stubSpeech(voices: { lang: string; name: string }[]) {
  const spoken: FakeUtterance[] = [];
  const synthesis = {
    cancel: vi.fn(),
    getVoices: () => voices,
    speak: vi.fn((utterance: FakeUtterance) => { spoken.push(utterance); }),
  };
  vi.stubGlobal('window', { speechSynthesis: synthesis });
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return { synthesis, spoken };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reading aloud', () => {
  it('is not available without a window or without the synthesis, and then does nothing', () => {
    expect(speechAvailable()).toBe(false);
    const hooks = { onStart: vi.fn(), onEnd: vi.fn() };
    expect(() => { stopSpeech(); speak('hello', 'en', hooks); }).not.toThrow();
    expect(hooks.onStart).not.toHaveBeenCalled();
    vi.stubGlobal('window', {});
    expect(speechAvailable()).toBe(false);
    vi.stubGlobal('window', { speechSynthesis: {} });
    expect(speechAvailable()).toBe(false);
  });

  it('stops the speech that is running before it speaks, and reads numbered steps as sentences', () => {
    const { synthesis, spoken } = stubSpeech([]);
    expect(speechAvailable()).toBe(true);
    speak('1. Open the tab\n2) Press save\n\n', 'en', { onStart: vi.fn(), onEnd: vi.fn() });
    expect(synthesis.cancel).toHaveBeenCalledTimes(1);
    expect(spoken).toHaveLength(1);
    expect(spoken[0].text).toBe('Open the tab. Press save');
  });

  it('picks a voice of the language of the interface and sets the language tag of each of the 8', () => {
    const tags = { en: 'en-US', es: 'es-ES', de: 'de-DE', fr: 'fr-FR', it: 'it-IT', ja: 'ja-JP', zh: 'zh-CN', pt: 'pt-PT' } as const;
    const voices = Object.values(tags).map(lang => ({ lang: lang.replace('-', '_'), name: lang }));
    for (const [language, tag] of Object.entries(tags)) {
      const { spoken } = stubSpeech(voices);
      speak('text', language as keyof typeof tags, { onStart: vi.fn(), onEnd: vi.fn() });
      expect(spoken[0].lang).toBe(tag);
      expect((spoken[0].voice as { name: string }).name).toBe(tag);
      vi.unstubAllGlobals();
    }
  });

  it('leaves the default voice when the browser has none for the language', () => {
    const { spoken } = stubSpeech([{ lang: 'en-US', name: 'only english' }]);
    speak('texto', 'ja', { onStart: vi.fn(), onEnd: vi.fn() });
    expect(spoken[0].voice).toBeNull();
  });

  it('does not speak an empty or blank text', () => {
    const { synthesis } = stubSpeech([]);
    speak('', 'en', { onStart: vi.fn(), onEnd: vi.fn() });
    speak('  \n ', 'en', { onStart: vi.fn(), onEnd: vi.fn() });
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it('tells the caller when the reading starts, ends or fails', () => {
    const { spoken } = stubSpeech([]);
    const hooks = { onStart: vi.fn(), onEnd: vi.fn() };
    speak('text', 'es', hooks);
    spoken[0].onstart?.();
    spoken[0].onend?.();
    spoken[0].onerror?.();
    expect(hooks.onStart).toHaveBeenCalledTimes(1);
    expect(hooks.onEnd).toHaveBeenCalledTimes(2);
  });

  it('removes only the numbering that is at the start of a line', () => {
    expect(speakable('3. Go to 2.5 mm')).toBe('Go to 2.5 mm');
    expect(speakable('Step 1. Go')).toBe('Step 1. Go');
    expect(speakable('\n\n')).toBe('');
  });
});

describe('placement of the bubble', () => {
  // A small generator with a fixed seed (mulberry32): the same boxes on every run.
  const seeded = (seed: number) => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  it('keeps the bubble inside the work area whenever it fits, for 500 seeded cases', () => {
    const random = seeded(20241113);
    const edges = { top: 8, right: 8, bottom: 44, left: 8 };
    for (let index = 0; index < 500; index += 1) {
      const viewport: Size = { width: 400 + Math.floor(random() * 1200), height: 300 + Math.floor(random() * 800) };
      const bubble: Size = { width: 80 + Math.floor(random() * 240), height: 40 + Math.floor(random() * 200) };
      const mascot: Box = { left: Math.floor(random() * (viewport.width - 60)), top: Math.floor(random() * (viewport.height - 60)), width: 40 + Math.floor(random() * 20), height: 40 + Math.floor(random() * 20) };
      const result = placeBubble(mascot, bubble, viewport);
      expect(SIDES).toContain(result.side);
      const left = mascot.left + result.dx;
      const top = mascot.top + result.dy;
      const areaWidth = viewport.width - edges.left - edges.right;
      const areaHeight = viewport.height - edges.top - edges.bottom;
      if (bubble.width <= areaWidth && bubble.height <= areaHeight) {
        expect(left, `case ${index}`).toBeGreaterThanOrEqual(edges.left);
        expect(top, `case ${index}`).toBeGreaterThanOrEqual(edges.top);
        expect(left + bubble.width, `case ${index}`).toBeLessThanOrEqual(edges.left + areaWidth);
        expect(top + bubble.height, `case ${index}`).toBeLessThanOrEqual(edges.top + areaHeight);
      }
    }
  });

  it('opens on the right of the mascot when there is room, and prefers the sides to the diagonals', () => {
    const result = placeBubble({ left: 20, top: 100, width: 50, height: 50 }, { width: 200, height: 100 }, { width: 1000, height: 700 });
    expect(result.side).toBe('right');
    expect(result.dx).toBe(50 + 10);
  });

  it('moves to the left when the right side has no room', () => {
    const result = placeBubble({ left: 900, top: 100, width: 50, height: 50 }, { width: 200, height: 100 }, { width: 1000, height: 700 });
    expect(result.side).toBe('left');
    expect(result.dx).toBe(-200 - 10);
  });

  it('never fails for a bubble larger than the window: it picks the side that sticks out least and pushes it back', () => {
    const result = placeBubble({ left: 10, top: 10, width: 40, height: 40 }, { width: 5000, height: 5000 }, { width: 300, height: 300 });
    expect(SIDES).toContain(result.side);
    expect(Number.isFinite(result.dx) && Number.isFinite(result.dy)).toBe(true);
  });

  it('copes with a window smaller than its own margins', () => {
    const result = placeBubble({ left: 0, top: 0, width: 10, height: 10 }, { width: 50, height: 50 }, { width: 5, height: 5 });
    expect(Number.isFinite(result.dx) && Number.isFinite(result.dy)).toBe(true);
  });
});
