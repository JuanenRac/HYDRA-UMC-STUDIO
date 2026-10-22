// =============================================================================
// HYDRA-UMC STUDIO - Dialog keyboard helpers: dialogKeys.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Pure logic behind the keyboard behaviour of modal dialogs, kept apart from
// React so it can be tested without a DOM.
// =============================================================================

/** True for the key that closes a dialog without confirming. */
export function isDismissKey(key: string): boolean {
  return key === 'Escape' || key === 'Esc';
}

/**
 * Where Tab should go inside a dialog with `count` focusable controls when the
 * focus is on `index` (-1 when it is outside all of them): the focus wraps
 * around instead of leaving the dialog.
 */
export function nextTabIndex(index: number, count: number, backwards: boolean): number {
  if (count <= 0) return -1;
  if (index < 0) return backwards ? count - 1 : 0;
  return backwards ? (index - 1 + count) % count : (index + 1) % count;
}
