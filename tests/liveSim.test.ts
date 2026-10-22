import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MODE_KEY,
  INITIAL_MODE_STATE,
  MODES_KEY,
  blockedBySim,
  isRealCommand,
  loadModes,
  modeOf,
  saveModes,
  withDefaultMode,
  withMode,
} from '../src/lib/liveSim';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => { data[key] = value; },
  };
}

describe('Live or Sim', () => {
  it('starts in Live, the behaviour the app always had', () => {
    expect(modeOf(INITIAL_MODE_STATE, 1)).toBe('live');
    expect(blockedBySim(INITIAL_MODE_STATE, [1], 'jog')).toBe(false);
  });

  it('blocks what moves a robot or switches something on, and nothing else', () => {
    const sim = withMode(INITIAL_MODE_STATE, 1, 'sim');
    for (const command of ['jog', 'play', 'reset', 'tool', 'valve', 'pump']) {
      expect(isRealCommand(command)).toBe(true);
      expect(blockedBySim(sim, [1], command)).toBe(true);
    }
    for (const command of ['stop', 'pause', 'jogStep', 'speed', 'trajectory', 'vision', 'reset3D']) {
      expect(blockedBySim(sim, [1], command)).toBe(false);
    }
  });

  it('only blocks the robots that are in Sim, and a group when any of its robots is', () => {
    const sim = withMode(INITIAL_MODE_STATE, 2, 'sim');
    expect(blockedBySim(sim, [1], 'jog')).toBe(false);
    expect(blockedBySim(sim, [2], 'jog')).toBe(true);
    expect(blockedBySim(sim, [1, 2], 'play')).toBe(true);
  });

  it('a browser can start every robot it has not chosen for in Sim, and an explicit choice wins', () => {
    const state = withMode(withDefaultMode(INITIAL_MODE_STATE, 'sim'), 3, 'live');
    expect(modeOf(state, 1)).toBe('sim');
    expect(modeOf(state, 3)).toBe('live');
    expect(blockedBySim(state, [1], 'jog')).toBe(true);
    expect(blockedBySim(state, [3], 'jog')).toBe(false);
  });

  it('keeps the choice in the browser and survives damaged or blocked storage', () => {
    const storage = memoryStorage();
    saveModes(storage, withMode(withDefaultMode(INITIAL_MODE_STATE, 'sim'), 4, 'live'));
    expect(storage.data[DEFAULT_MODE_KEY]).toBe('sim');
    expect(loadModes(storage)).toEqual({ modes: { 4: 'live' }, defaultMode: 'sim' });
    expect(loadModes(memoryStorage({ [MODES_KEY]: '{not json' }))).toEqual(INITIAL_MODE_STATE);
    expect(loadModes(memoryStorage({ [MODES_KEY]: '{"1":"fast","x":"sim","2":"sim"}' })).modes).toEqual({ 2: 'sim' });
    expect(loadModes(null)).toEqual(INITIAL_MODE_STATE);
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadModes(blocked)).toEqual(INITIAL_MODE_STATE);
    expect(() => saveModes(blocked, INITIAL_MODE_STATE)).not.toThrow();
  });
});
