// =============================================================================
// HYDRA-UMC STUDIO - Test: dialogKeys.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { describe, expect, it } from 'vitest';
import { isDismissKey, nextTabIndex } from '../src/lib/dialogKeys';

describe('dialog keys', () => {
  it('Escape dismisses, other keys do not', () => {
    expect(isDismissKey('Escape')).toBe(true);
    expect(isDismissKey('Enter')).toBe(false);
  });

  it('Tab wraps from the last control to the first', () => {
    expect(nextTabIndex(1, 2, false)).toBe(0);
  });

  it('Shift+Tab wraps from the first control to the last', () => {
    expect(nextTabIndex(0, 2, true)).toBe(1);
  });

  it('focus outside the dialog is pulled to the first or last control', () => {
    expect(nextTabIndex(-1, 3, false)).toBe(0);
    expect(nextTabIndex(-1, 3, true)).toBe(2);
  });

  it('a dialog without controls keeps nothing focused', () => {
    expect(nextTabIndex(0, 0, false)).toBe(-1);
  });
});
