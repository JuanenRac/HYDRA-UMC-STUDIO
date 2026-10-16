/**
 * The person's choices about the assistant (shown or not, read aloud or not, pinned, where it was put, how big): a per-browser convenience kept in localStorage, so it is read through
 * a small external store and never needs the server. Reading or writing storage can fail (private window, blocked site data): the defaults are used then.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0
 */
import { useSyncExternalStore } from 'react';

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

let cached: AssistantPrefs | null = null;
const listeners = new Set<() => void>();

function read(): AssistantPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AssistantPrefs>;
      const fraction = (value: unknown): number | null => (typeof value === 'number' && value >= 0 && value <= 1 ? value : null);
      return {
        assistant: typeof parsed.assistant === 'boolean' ? parsed.assistant : DEFAULTS.assistant,
        assistantSpeak: parsed.assistantSpeak === true,
        assistantPinned: parsed.assistantPinned === true,
        assistantX: fraction(parsed.assistantX),
        assistantY: fraction(parsed.assistantY),
        assistantSize: parsed.assistantSize === 'small' || parsed.assistantSize === 'large' ? parsed.assistantSize : 'normal',
        assistantAutoOpen: parsed.assistantAutoOpen === true,
      };
    }
  } catch { /* storage unavailable: defaults */ }
  return DEFAULTS;
}

export function getPrefs(): AssistantPrefs {
  if (!cached) cached = read();
  return cached;
}

export function setPrefs(patch: Partial<AssistantPrefs>): void {
  cached = { ...getPrefs(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(cached)); } catch { /* not persisted: kept for this session only */ }
  listeners.forEach(listener => listener());
}

const subscribe = (listener: () => void): (() => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function usePrefs(): AssistantPrefs {
  return useSyncExternalStore(subscribe, getPrefs, getPrefs);
}
