// =============================================================================
// HYDRA-UMC STUDIO - tests/i18nQuality.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Having the same keys in the eight catalogs is not enough: a translation that
// loses a {{placeholder}}, is empty, or keeps a marker of unfinished work shows
// the operator a broken sentence. This checks the content of every key against
// the English catalog.
// =============================================================================
import { describe, expect, it } from 'vitest';
import de from '../src/locales/de.json';
import en from '../src/locales/en.json';
import es from '../src/locales/es.json';
import fr from '../src/locales/fr.json';
import it_ from '../src/locales/it.json';
import ja from '../src/locales/ja.json';
import pt from '../src/locales/pt.json';
import zh from '../src/locales/zh.json';

type Tree = { [key: string]: string | string[] | Tree };

const CATALOGS: Record<string, Tree> = { en, es, de, fr, it: it_, ja, zh, pt } as unknown as Record<string, Tree>;
const OTHERS = Object.keys(CATALOGS).filter((code) => code !== 'en');

function flatten(tree: Tree, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      // a list of paragraphs: every element is a value of its own
      value.forEach((item, index) => out.set(`${path}[${index}]`, item));
    } else if (value !== null && typeof value === 'object') {
      for (const [inner, v] of flatten(value as Tree, path)) out.set(inner, v);
    } else {
      out.set(path, value);
    }
  }
  return out;
}

const FLAT: Record<string, Map<string, unknown>> = Object.fromEntries(Object.entries(CATALOGS).map(([code, tree]) => [code, flatten(tree)]));

const placeholders = (text: string): string[] => [...text.matchAll(/\{\{\s*([^}\s,]+)[^}]*\}\}/g)].map((m) => m[1]).sort();

describe('the content of every catalog', () => {
  for (const code of Object.keys(CATALOGS)) {
    it(`${code}: every value is text and none is empty`, () => {
      const bad: string[] = [];
      for (const [key, value] of FLAT[code]) {
        if (typeof value !== 'string' || value.trim() === '') bad.push(key);
      }
      expect(bad).toEqual([]);
    });

    it(`${code}: no value keeps a marker of unfinished work`, () => {
      const bad: string[] = [];
      for (const [key, value] of FLAT[code]) {
        if (typeof value === 'string' && /\b(FIXME|XXX)\b|TODO:|lorem ipsum|\?\?\?/.test(value)) bad.push(key);
      }
      expect(bad).toEqual([]);
    });

    it(`${code}: braces are balanced in every value`, () => {
      const bad: string[] = [];
      for (const [key, value] of FLAT[code]) {
        if (typeof value !== 'string') continue;
        const opens = (value.match(/\{\{/g) ?? []).length;
        const closes = (value.match(/\}\}/g) ?? []).length;
        if (opens !== closes) bad.push(key);
      }
      expect(bad).toEqual([]);
    });
  }
});

describe('the placeholders of every translation', () => {
  for (const code of OTHERS) {
    it(`${code}: each key uses exactly the placeholders of the English text`, () => {
      const wrong: string[] = [];
      for (const [key, base] of FLAT.en) {
        const translated = FLAT[code].get(key);
        if (typeof base !== 'string' || typeof translated !== 'string') continue;
        const expected = placeholders(base).join(',');
        const actual = placeholders(translated).join(',');
        if (expected !== actual) wrong.push(`${key}: expected {${expected}} got {${actual}}`);
      }
      expect(wrong).toEqual([]);
    });
  }
});

describe('plural forms', () => {
  it('every language that has a _one form also has the matching _other form, and the other way round', () => {
    const problems: string[] = [];
    for (const code of Object.keys(CATALOGS)) {
      for (const key of FLAT[code].keys()) {
        if (key.endsWith('_one') && !FLAT[code].has(key.replace(/_one$/, '_other'))) problems.push(`${code}: ${key} has no _other`);
        if (key.endsWith('_other') && !FLAT[code].has(key.replace(/_other$/, '_one')) && FLAT.en.has(key.replace(/_other$/, '_one'))) problems.push(`${code}: ${key} has no _one`);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('the catalogs together', () => {
  it('have the same number of keys', () => {
    const counts = Object.fromEntries(Object.keys(CATALOGS).map((code) => [code, FLAT[code].size]));
    const english = counts.en;
    for (const [code, count] of Object.entries(counts)) expect(count, code).toBe(english);
  });

  it('do not leave a language with the English text everywhere', () => {
    for (const code of OTHERS) {
      let same = 0;
      let total = 0;
      for (const [key, base] of FLAT.en) {
        const translated = FLAT[code].get(key);
        if (typeof base !== 'string' || typeof translated !== 'string' || base.length < 12) continue;
        total += 1;
        if (translated === base) same += 1;
      }
      expect(same / Math.max(1, total), `${code} has ${same} of ${total} long texts still in English`).toBeLessThan(0.5);
    }
  });
});
