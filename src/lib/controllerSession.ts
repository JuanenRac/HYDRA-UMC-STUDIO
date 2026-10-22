// =============================================================================
// HYDRA-UMC STUDIO - the controller id of this window: controllerSession.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// A reservation of a robot belongs to an account and, when the client names one, to a controller: one window, one
// tab, one phone. The same account on another window is then refused, so two people sharing a login cannot take the
// robot from each other by accident. The id is chosen once per window, kept for the life of that window only
// (sessionStorage, so a second tab gets its own) and sent with every claim, release, jog arming and command.
// =============================================================================

export const CONTROLLER_ID_KEY = 'hydra.controllerId';
/** What the server accepts: 1 to 64 characters of letters, digits and . _ : - */
export const CONTROLLER_ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function isValidControllerId(value: unknown): value is string {
  return typeof value === 'string' && CONTROLLER_ID_PATTERN.test(value);
}

/** A fresh id: "studio-" and ten letters or digits. `random` can be replaced in a test. */
export function generateControllerId(random: () => number = Math.random): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 10; i += 1) suffix += alphabet[Math.min(alphabet.length - 1, Math.floor(random() * alphabet.length))];
  return `studio-${suffix}`;
}

let memoryId: string | null = null;

function windowStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** The id of this window: the saved one when it is valid, otherwise a new one that is saved (or only remembered while the page lives when the storage is blocked). */
export function getControllerId(storage: StorageLike | null = windowStorage()): string {
  try {
    const saved = storage?.getItem(CONTROLLER_ID_KEY);
    if (isValidControllerId(saved)) return saved;
  } catch {
    /* blocked storage: the id lasts as long as the page */
  }
  if (!isValidControllerId(memoryId)) memoryId = generateControllerId();
  try {
    storage?.setItem(CONTROLLER_ID_KEY, memoryId);
  } catch {
    /* the id simply does not persist */
  }
  return memoryId;
}

/** Forgets the remembered id (tests). */
export function resetControllerIdMemory(): void {
  memoryId = null;
}
