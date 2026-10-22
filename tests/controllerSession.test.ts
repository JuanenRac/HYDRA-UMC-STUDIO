import { beforeEach, describe, expect, it } from 'vitest';
import {
  CONTROLLER_ID_KEY,
  generateControllerId,
  getControllerId,
  isValidControllerId,
  resetControllerIdMemory,
} from '../src/lib/controllerSession';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => { data[key] = value; },
  };
}

beforeEach(resetControllerIdMemory);

describe('the controller id of a window', () => {
  it('accepts what the server accepts and nothing else', () => {
    expect(isValidControllerId('studio-abc123')).toBe(true);
    expect(isValidControllerId('a.b_c:d-e')).toBe(true);
    expect(isValidControllerId('x'.repeat(64))).toBe(true);
    expect(isValidControllerId('x'.repeat(65))).toBe(false);
    expect(isValidControllerId('')).toBe(false);
    expect(isValidControllerId('has space')).toBe(false);
    expect(isValidControllerId('semi;colon')).toBe(false);
    expect(isValidControllerId(42)).toBe(false);
  });

  it('generates valid ids that differ', () => {
    const a = generateControllerId();
    const b = generateControllerId();
    expect(isValidControllerId(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(isValidControllerId(generateControllerId(() => 0.999999))).toBe(true);
  });

  it('is chosen once and kept for the window', () => {
    const storage = memoryStorage();
    const first = getControllerId(storage);
    expect(storage.data[CONTROLLER_ID_KEY]).toBe(first);
    expect(getControllerId(storage)).toBe(first);
  });

  it('reuses a saved id and replaces a damaged one', () => {
    expect(getControllerId(memoryStorage({ [CONTROLLER_ID_KEY]: 'studio-saved' }))).toBe('studio-saved');
    const storage = memoryStorage({ [CONTROLLER_ID_KEY]: 'not valid!' });
    const replaced = getControllerId(storage);
    expect(isValidControllerId(replaced)).toBe(true);
    expect(storage.data[CONTROLLER_ID_KEY]).toBe(replaced);
  });

  it('still gives a stable id when the storage is blocked or missing', () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    const id = getControllerId(blocked);
    expect(isValidControllerId(id)).toBe(true);
    expect(getControllerId(blocked)).toBe(id);
    expect(getControllerId(null)).toBe(id);
  });
});
