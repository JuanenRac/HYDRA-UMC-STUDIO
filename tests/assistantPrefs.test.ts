// =============================================================================
// HYDRA-UMC STUDIO - tests/assistantPrefs.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The assistant preferences live in localStorage, which can be missing,
// blocked, or hold anything: whatever it holds, the app starts with usable
// values. Also the selected-robot store and the tool mount offset.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { toolheadMountOffset } from '../src/lib/toolheadMount';

const KEY = 'hydra_assistant_prefs';

function stubStorage(initial: Record<string, string> = {}, options: { failRead?: boolean; failWrite?: boolean } = {}) {
  const data = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => {
      if (options.failRead) throw new Error('blocked');
      return data.has(key) ? data.get(key)! : null;
    },
    setItem: (key: string, value: string) => {
      if (options.failWrite) throw new Error('quota');
      data.set(key, value);
    },
  });
  return data;
}

async function freshPrefs() {
  vi.resetModules();
  return import('../src/assistant/prefs');
}

const DEFAULTS = { assistant: true, assistantSpeak: false, assistantPinned: false, assistantX: null, assistantY: null, assistantSize: 'normal', assistantAutoOpen: false };

beforeEach(() => { stubStorage(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('assistant preferences', () => {
  it('starts with the defaults when nothing was saved', async () => {
    const { getPrefs } = await freshPrefs();
    expect(getPrefs()).toEqual(DEFAULTS);
  });

  it('starts with the defaults when the storage cannot be read', async () => {
    stubStorage({}, { failRead: true });
    const { getPrefs } = await freshPrefs();
    expect(getPrefs()).toEqual(DEFAULTS);
  });

  it('starts with the defaults when the saved text is not JSON or not an object', async () => {
    for (const raw of ['not json', '{', '']) {
      stubStorage({ [KEY]: raw });
      const { getPrefs } = await freshPrefs();
      expect(getPrefs()).toEqual(DEFAULTS);
    }
  });

  it('keeps what was saved, and ignores any field of the wrong type', async () => {
    stubStorage({ [KEY]: JSON.stringify({ assistant: false, assistantSpeak: true, assistantPinned: 'yes', assistantX: 0.25, assistantY: 'top', assistantSize: 'large', assistantAutoOpen: 1 }) });
    const { getPrefs } = await freshPrefs();
    expect(getPrefs()).toEqual({ assistant: false, assistantSpeak: true, assistantPinned: false, assistantX: 0.25, assistantY: null, assistantSize: 'large', assistantAutoOpen: false });
  });

  it('keeps the position only when it is a fraction of the window', async () => {
    for (const [x, expected] of [[0, 0], [1, 1], [0.5, 0.5], [-0.1, null], [1.1, null], [Number.NaN, null], [null, null], ['0.5', null]] as const) {
      stubStorage({ [KEY]: JSON.stringify({ assistantX: x }) });
      const { getPrefs } = await freshPrefs();
      expect(getPrefs().assistantX).toBe(expected);
    }
  });

  it('accepts only the three known sizes', async () => {
    for (const [size, expected] of [['small', 'small'], ['large', 'large'], ['normal', 'normal'], ['huge', 'normal'], [3, 'normal']] as const) {
      stubStorage({ [KEY]: JSON.stringify({ assistantSize: size }) });
      const { getPrefs } = await freshPrefs();
      expect(getPrefs().assistantSize).toBe(expected);
    }
  });

  it('merges a change into the current values, saves it and tells the listeners', async () => {
    const data = stubStorage();
    const { getPrefs, setPrefs } = await freshPrefs();
    setPrefs({ assistantSpeak: true });
    setPrefs({ assistantSize: 'small' });
    expect(getPrefs()).toEqual({ ...DEFAULTS, assistantSpeak: true, assistantSize: 'small' });
    expect(JSON.parse(data.get(KEY)!)).toEqual(getPrefs());
  });

  it('keeps the change for the session when the storage refuses to save it', async () => {
    stubStorage({}, { failWrite: true });
    const { getPrefs, setPrefs } = await freshPrefs();
    expect(() => setPrefs({ assistantPinned: true })).not.toThrow();
    expect(getPrefs().assistantPinned).toBe(true);
  });
});

describe('selected robot store', () => {
  async function freshSelected() {
    vi.resetModules();
    return import('../src/lib/selectedRobot');
  }

  it('starts on the first robot and ignores a value that is not a whole number', async () => {
    const { getSelectedRobotId, setSelectedRobotId } = await freshSelected();
    expect(getSelectedRobotId()).toBe(1);
    for (const bad of [Number.NaN, 1.5, Infinity, -Infinity]) {
      setSelectedRobotId(bad);
      expect(getSelectedRobotId()).toBe(1);
    }
  });

  it('notifies the listeners once per real change and not for the same value', async () => {
    const { getSelectedRobotId, setSelectedRobotId, subscribeSelectedRobot } = await freshSelected();
    const listener = vi.fn();
    const unsubscribe = subscribeSelectedRobot(listener);
    setSelectedRobotId(3);
    setSelectedRobotId(3);
    expect(getSelectedRobotId()).toBe(3);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setSelectedRobotId(4);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('lets a listener unsubscribe while the others are being told', async () => {
    const { setSelectedRobotId, subscribeSelectedRobot } = await freshSelected();
    const calls: string[] = [];
    const first = subscribeSelectedRobot(() => { calls.push('first'); first(); });
    subscribeSelectedRobot(() => calls.push('second'));
    setSelectedRobotId(2);
    setSelectedRobotId(3);
    expect(calls).toEqual(['first', 'second', 'second']);
  });
});

describe('toolheadMountOffset', () => {
  it('uses a small fixed offset when there is no geometry', () => {
    expect(toolheadMountOffset(null)).toEqual([0, 0.02, 0]);
    expect(toolheadMountOffset(undefined)).toEqual([0, 0.02, 0]);
  });

  it('sits the tool just past the top of the mesh, plus the margin', () => {
    const geometry = new THREE.BoxGeometry(0.1, 0.106, 0.1).translate(0, 0.053, 0);
    const [x, y, z] = toolheadMountOffset(geometry);
    expect(x).toBe(0);
    expect(z).toBe(0);
    expect(y).toBeCloseTo(0.106 + 0.01, 6);
  });

  it('never buries the tool inside a mesh whose top is at or below the origin', () => {
    const flat = new THREE.BoxGeometry(0.1, 0.1, 0.1).translate(0, -0.2, 0);
    expect(toolheadMountOffset(flat)[1]).toBeCloseTo(0.005 + 0.01, 6);
  });

  it('takes the margin from the caller', () => {
    const geometry = new THREE.BoxGeometry(0.1, 0.2, 0.1).translate(0, 0.1, 0);
    expect(toolheadMountOffset(geometry, 0.05)[1]).toBeCloseTo(0.25, 6);
  });
});
