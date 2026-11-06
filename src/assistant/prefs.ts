/**
 * The person's choices about the assistant (shown or not, read aloud or not, pinned, where it was put, how big): a per-browser convenience kept in localStorage, so it is read through
 * a small external store and never needs the server. Reading or writing storage can fail (private window, blocked site data): the defaults are used then.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0
 */
import { useSyncExternalStore } from 'react';
import { bool, browserStorage, createPrefs, nullableFraction, oneOf, type Prefs } from 'hydra-umc-studio-kit';

export type AssistantPrefs = {
  assistant: boolean;
  assistantSpeak: boolean;
  assistantPinned: boolean;
  /** Where the person put the mascot, as a fraction of the window; null = it rests in the corner. */
  assistantX: number | null;
  assistantY: number | null;
  assistantSize: 'small' | 'normal' | 'large';
  assistantAutoOpen: boolean;
};

const KEY = 'hydra_assistant_prefs';
const DEFAULTS: AssistantPrefs = { assistant: true, assistantSpeak: false, assistantPinned: false, assistantX: null, assistantY: null, assistantSize: 'normal', assistantAutoOpen: false };

// The rules (one validator per field, a storage that fails, the defaults) are the ones of the shared kit. The preferences are read the first time
// they are needed, not when this file loads.
let prefs: Prefs<AssistantPrefs> | null = null;

function store(): Prefs<AssistantPrefs> {
  prefs ??= createPrefs<AssistantPrefs>({
    storage: browserStorage('localStorage'),
    key: KEY,
    defaults: DEFAULTS,
    schema: {
      assistant: bool,
      assistantSpeak: bool,
      assistantPinned: bool,
      assistantX: nullableFraction,
      assistantY: nullableFraction,
      assistantSize: oneOf('small', 'normal', 'large'),
      assistantAutoOpen: bool,
    },
  });
  return prefs;
}

export function getPrefs(): AssistantPrefs {
  return store().get();
}

export function setPrefs(patch: Partial<AssistantPrefs>): void {
  store().set(patch);
}

const subscribe = (listener: () => void): (() => void) => store().subscribe(listener);

export function usePrefs(): AssistantPrefs {
  return useSyncExternalStore(subscribe, getPrefs, getPrefs);
}
