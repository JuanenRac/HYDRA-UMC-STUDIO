// =============================================================================
// HYDRA-UMC STUDIO - src/lib/labelColon.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The colon of a label ("Speed:") is put by the screen, not written in the text, so the same word serves as a label, a heading and a button (the common words
// of the apps carry no colon). Japanese and Chinese write the full-width colon, the other languages the plain one right after the word, as the catalogs did.
import i18next from 'i18next';

/** The colon that goes after a label in a language. */
export function colonFor(language: string): string {
  const base = language.toLowerCase().split('-')[0];
  return base === 'ja' || base === 'zh' ? '\uFF1A' : ':';
}

/** The text of a label followed by the colon of the language of the interface (or of `language`). */
export function labelWithColon(text: string, language: string = i18next.language ?? 'en'): string {
  return text + colonFor(language);
}
