// =============================================================================
// HYDRA-UMC STUDIO - tests/unifiedForms.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Words that were written twice and differed only in form (ALL CAPS, a colon, a capital) are now one common word, and the screen applies the form: the capitals by
// the style (text-transform: uppercase) and the colon by labelWithColon. What is seen must stay the same except what was agreed: the navigation entry of the vision
// center now reads like its tour ("Vision center"), and the role label no longer shows the colon twice. OLD is the visible text of every language before the change.
// =============================================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { colonFor, labelWithColon } from '../src/lib/labelColon';

const LANGUAGES = ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt'] as const;
const OLD = {
  "endstopsHeading": {
    "en": "ENDSTOPS",
    "es": "FINALES DE CARRERA",
    "de": "ENDSCHALTER",
    "fr": "FINS DE COURSE",
    "it": "FINECORSA",
    "ja": "エンドストップ",
    "zh": "限位开关",
    "pt": "FINS DE CURSO"
  },
  "speedLabel": {
    "en": "Speed:",
    "es": "Velocidad:",
    "de": "Geschwindigkeit:",
    "fr": "Vitesse:",
    "it": "Velocità:",
    "ja": "速度：",
    "zh": "速度：",
    "pt": "Velocidade:"
  },
  "roleLabel": {
    "en": "Role:",
    "es": "Rol:",
    "de": "Rolle:",
    "fr": "Rôle:",
    "it": "Ruolo:",
    "ja": "役割：",
    "zh": "角色：",
    "pt": "Função:"
  },
  "visionNav": {
    "en": "Vision Center",
    "es": "Centro de visión",
    "de": "Vision-Zentrum",
    "fr": "Centre de vision",
    "it": "Centro di visione",
    "ja": "ビジョンセンター",
    "zh": "视觉中心",
    "pt": "Centro de visão"
  }
} as const;

const catalog = (language: string) => JSON.parse(readFileSync(`src/locales/${language}.json`, 'utf8')) as { common: Record<string, string> } & Record<string, unknown>;
const locale = (language: string) => language;
const upper = (text: string, language: string) => text.toLocaleUpperCase(locale(language));

describe('the forms of the words are put by the screen', () => {
  it('the heading of the endstops, uppercase by the style, is the same text in every language', () => {
    for (const language of LANGUAGES) expect(upper(catalog(language).common.endstops, language), language).toBe(OLD.endstopsHeading[language]);
  });

  it('the label of the speed, with the colon put by the screen, is the same text in every language', () => {
    for (const language of LANGUAGES) expect(labelWithColon(catalog(language).common.speed, language), language).toBe(OLD.speedLabel[language]);
  });

  it('the label of the role is the old text without the colon that the screen used to repeat', () => {
    for (const language of LANGUAGES) {
      const text = labelWithColon(catalog(language).common.role, language);
      expect(text, language).toBe(OLD.roleLabel[language]);
      expect(text.endsWith(colonFor(language)), language).toBe(true);
      expect(text.slice(0, -1).endsWith(colonFor(language)), `${language} has the colon once`).toBe(false);
    }
  });

  it('the navigation entry of the vision center reads like its tour; only English changes its capitals', () => {
    for (const language of LANGUAGES) {
      const now = catalog(language).common.vision_center;
      if (language === 'en') {
        expect(OLD.visionNav.en).toBe('Vision Center');
        expect(now).toBe('Vision center');
      } else {
        expect(now, language).toBe(OLD.visionNav[language]);
      }
    }
  });

  it('the colon is the full-width one for Japanese and Chinese and the plain one for the others, also for a regional tag', () => {
    expect(colonFor('ja')).toBe('\uFF1A');
    expect(colonFor('zh-CN')).toBe('\uFF1A');
    expect(colonFor('pt-PT')).toBe(':');
    expect(colonFor('en')).toBe(':');
    expect(labelWithColon('Speed', 'en')).toBe('Speed:');
  });

  it('the old keys are gone and the screens ask for the common words with the style that applies the capitals', () => {
    const gone = ['robot_detail.endstops_upper', 'robot_detail.speed', 'dashboard.role', 'dashboard.vision_center'];
    const has = (tree: unknown, key: string): boolean => key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), tree) !== undefined;
    for (const language of LANGUAGES) for (const key of gone) expect(has(catalog(language), key), `${language} still has ${key}`).toBe(false);
    const config = readFileSync('src/components/robotDetail/ConfigPanel.tsx', 'utf8');
    expect(config).toMatch(/uppercase[^\n]*\n?[^\n]*\{t\('common\.endstops'\)\}/);
    expect(readFileSync('src/components/robotDetail/FloatingJogOverlays.tsx', 'utf8')).toMatch(/uppercase[^\n]*\{labelWithColon\(t\('common\.speed'\)\)\}/);
    expect(readFileSync('src/Dashboard.tsx', 'utf8')).toContain("labelWithColon(t('common.role'))");
  });
});
