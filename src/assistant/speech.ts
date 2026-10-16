/**
 * Reading the assistant aloud with the browser's own speech synthesis (no server, no download). A voice for the interface language is chosen when the browser has one; if it has none the
 * text is simply not read. Nothing here can fail loudly: speech is an extra, never a requirement.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0
 */
import type { Locale } from './knowledge';

const BCP47: Record<Locale, string> = { en: 'en-US', es: 'es-ES', de: 'de-DE', fr: 'fr-FR', it: 'it-IT', ja: 'ja-JP', zh: 'zh-CN', pt: 'pt-PT' };

export const speechAvailable = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

export function stopSpeech(): void {
  if (speechAvailable()) window.speechSynthesis.cancel();
}

/** Text without the numbering that is meant for the eye ("1. ", line breaks): read as sentences. */
export function speakable(text: string): string {
  return text.split('\n').map(line => line.replace(/^\d+[.)]\s*/, '').trim()).filter(Boolean).join('. ');
}

export function speak(text: string, language: Locale, hooks: { onStart: () => void; onEnd: () => void }): void {
  if (!speechAvailable() || !text.trim()) return;
  stopSpeech();
  const utterance = new SpeechSynthesisUtterance(speakable(text));
  const tag = BCP47[language];
  utterance.lang = tag;
  const voice = window.speechSynthesis.getVoices().find(item => item.lang.toLowerCase().startsWith(tag.slice(0, 2).toLowerCase()));
  if (voice) utterance.voice = voice;
  utterance.onstart = hooks.onStart;
  utterance.onend = hooks.onEnd;
  utterance.onerror = hooks.onEnd;
  window.speechSynthesis.speak(utterance);
}
