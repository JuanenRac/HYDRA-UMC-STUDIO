import { describe, expect, it } from 'vitest';
import { createCommandSequence, isNumberedCommand } from '../src/lib/commandSequence';

describe('commandSequence', () => {
  it('numbers the motion commands and the stop, nothing else', () => {
    for (const command of ['jog', 'table', 'joints', 'stop']) expect(isNumberedCommand(command)).toBe(true);
    for (const command of ['play', 'pause', 'tool', 'valve', 'points', 'speed']) expect(isNumberedCommand(command)).toBe(false);
  });

  it('grows with every call, even when the clock stands still or goes back', () => {
    let now = 5000;
    const sequence = createCommandSequence(() => now);
    const a = sequence.next();
    const b = sequence.next();
    now = 100;
    const c = sequence.next();
    expect(a).toBe(5000);
    expect(b).toBe(5001);
    expect(c).toBe(5002);
  });

  it('follows the clock, so a reloaded window starts above an earlier one', () => {
    let now = 1_000_000;
    const first = createCommandSequence(() => now);
    let lastOfFirst = 0;
    for (let i = 0; i < 10; i++) lastOfFirst = first.next();
    now += 60_000;
    const reloaded = createCommandSequence(() => now);
    expect(reloaded.next()).toBeGreaterThan(lastOfFirst);
  });

  it('gives a safe integer', () => {
    expect(Number.isSafeInteger(createCommandSequence().next())).toBe(true);
  });
});

describe('the answer of a command that arrived out of order', () => {
  it('is its own failure, not "another operator holds the robot"', async () => {
    const { interpretCommandResponse } = await import('../src/lib/commandResult');
    const result = interpretCommandResponse(409, false, { error: 'an older motion command', code: 'stale-sequence', lastSeq: 12 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('stale_sequence');
  });

  it('has a text in all eight languages', async () => {
    const fs = await import('node:fs');
    for (const lang of ['en', 'es', 'de', 'fr', 'it', 'ja', 'pt', 'zh']) {
      const locale = JSON.parse(fs.readFileSync(`src/locales/${lang}.json`, 'utf8'));
      const text = Object.values(locale).flatMap((v) => (typeof v === 'object' && v ? Object.entries(v as Record<string, unknown>) : [])).find(([key]) => key === 'stale_sequence');
      expect(text, lang).toBeTruthy();
      expect(String(text![1])).toContain('{{robots}}');
    }
  });
});
