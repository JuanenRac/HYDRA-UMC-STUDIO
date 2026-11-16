import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MODE_KEY,
  affectedRobotIds,
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
    for (const command of ['jog', 'play', 'reset', 'tool', 'valve', 'pump', 'trajectory', 'speed']) {
      expect(isRealCommand(command)).toBe(true);
      expect(blockedBySim(sim, [1], command)).toBe(true);
    }
    for (const command of ['stop', 'pause', 'jogStep', 'vision', 'reset3D']) {
      expect(blockedBySim(sim, [1], command)).toBe(false);
    }
  });

  it('blocks the resume of a paused playback of a robot in Sim and not the pause itself', () => {
    const sim = withMode(INITIAL_MODE_STATE, 1, 'sim');
    expect(blockedBySim(sim, [1], 'pause', { paused: false })).toBe(true);
    expect(blockedBySim(sim, [1], 'pause', { paused: true })).toBe(false);
    expect(blockedBySim(sim, [1], 'pause')).toBe(false);
  });

  it('works out the robots a command reaches the way the server does', () => {
    expect(affectedRobotIds('play', 1, [2, 3])).toEqual([1, 2, 3]);
    expect(affectedRobotIds('jog', 1, [2])).toEqual([1, 2]);
    expect(affectedRobotIds('valve', 1, undefined)).toEqual([1]);
    for (const alone of ['trajectory', 'table', 'enable', 'disable']) expect(affectedRobotIds(alone, 1, [2])).toEqual([1]);
    expect(affectedRobotIds('play', 1, [2], [1])).toEqual([1, 2]);
    expect(affectedRobotIds('table', 1, [2], [1, 4])).toEqual([1, 4]);
  });

  it('a robot combined with one in Sim is stopped from moving even when the Live one is pressed', () => {
    const sim = withMode(INITIAL_MODE_STATE, 2, 'sim');
    expect(blockedBySim(sim, affectedRobotIds('play', 1, [2]), 'play')).toBe(true);
    expect(blockedBySim(sim, affectedRobotIds('table', 1, [2]), 'table')).toBe(false);
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
