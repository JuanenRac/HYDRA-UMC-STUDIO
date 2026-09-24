// =============================================================================
// HYDRA-UMC STUDIO - tests/i18nKeys.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Found while auditing the code: dashboard.rp1_temp and
// robot_detail.delete_points were both referenced by real t(...) calls in
// src/ but missing from all 7 locale catalogs - i18next's own behavior for
// a key missing everywhere (no resource has it, and no literal default was
// passed as the 2nd t() argument) is to render the raw key string itself in
// the UI, which nothing here would have caught without actually clicking
// through every screen in every language. This test statically extracts
// every literal-string t('...') call under src/ and checks it against the
// real locale catalogs instead, plus checks the 7 catalogs never drift from
// each other (a key added to one language but not the rest is exactly how
// happened) - so a future missing/orphaned key fails CI instead of
// only being found by hand.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import en from '../src/locales/en.json';
import de from '../src/locales/de.json';
import es from '../src/locales/es.json';
import fr from '../src/locales/fr.json';
// Aliased: the bare name `it` collides with vitest's own `it` test function.
import itLocale from '../src/locales/it.json';
import ja from '../src/locales/ja.json';
import zh from '../src/locales/zh.json';

const CATALOGS: Record<string, unknown> = { en, de, es, fr, it: itLocale, ja, zh };
const SRC_ROOT = path.resolve(__dirname, '../src');

// Every t('a.b.c', ...) resolves via i18next's default '.' keySeparator -
// flatten each catalog the same way, so "dashboard.rp1_temp" becomes a real
// lookup into { dashboard: { rp1_temp: ... } } rather than a literal
// top-level key.
function flattenKeys(node: unknown, prefix: string, out: Set<string>): void {
  if (typeof node !== 'object' || node === null) return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      flattenKeys(value, fullKey, out);
    } else {
      out.add(fullKey);
    }
  }
}

function catalogKeys(catalog: unknown): Set<string> {
  const out = new Set<string>();
  flattenKeys(catalog, '', out);
  return out;
}

// Walks src/ collecting every .ts/.tsx file, skipping the locale JSON
// catalogs themselves and this test file's own directory.
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      if (entry === 'locales') continue;
      collectSourceFiles(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

// Matches a real i18next call with a literal string key: t('a.b'),
// t("a.b", 'Fallback'), t(`a.b`) - NOT a dynamic key built from a variable
// or template interpolation (t(`foo.${bar}`)), which this static scan can
// never resolve and isn't attempting to.
const T_CALL = /\bt\(\s*(['"`])([a-zA-Z0-9_.]+)\1/g;

// RackConfigView.tsx builds its key by string concatenation
// (t('modules.rack_' + axis), axis being 'width'/'depth') rather than a
// template literal - the regex above still matches the literal fragment
// "modules.rack_" since it's genuinely closed by a real quote, but that
// fragment is never a real catalog key on its own. Skipped here (it would
// otherwise be a permanent false-positive "missing key") and asserted
// directly, by its two real concatenated forms, in its own test below.
const KNOWN_CONCATENATED_PREFIXES = new Set(['modules.rack_']);

function extractUsedKeys(): Set<string> {
  const used = new Set<string>();
  for (const file of collectSourceFiles(SRC_ROOT)) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(T_CALL)) {
      if (KNOWN_CONCATENATED_PREFIXES.has(match[2])) continue;
      used.add(match[2]);
    }
  }
  return used;
}

describe('i18n key coverage - H060', () => {
  it('every real t(...) call in src/ resolves against the English (base) catalog', () => {
    const used = extractUsedKeys();
    const base = catalogKeys(en);
    const missing = [...used].filter((key) => !base.has(key)).sort();
    expect(missing, `key(s) used in code but absent from en.json: ${missing.join(', ')}`).toEqual([]);
  });

  it('specifically covers the two H060 keys (dashboard.rp1_temp, robot_detail.delete_points)', () => {
    const used = extractUsedKeys();
    expect(used.has('dashboard.rp1_temp')).toBe(true);
    expect(used.has('robot_detail.delete_points')).toBe(true);
  });

  it("RackConfigView's own concatenated keys (modules.rack_width/rack_depth) resolve for real", () => {
    const base = catalogKeys(en);
    expect(base.has('modules.rack_width')).toBe(true);
    expect(base.has('modules.rack_depth')).toBe(true);
  });

  for (const [lang, catalog] of Object.entries(CATALOGS)) {
    if (lang === 'en') continue;
    it(`${lang}.json has exactly the same keys as en.json - no missing or orphaned translation`, () => {
      const baseKeys = catalogKeys(en);
      const langKeys = catalogKeys(catalog);
      const missingInLang = [...baseKeys].filter((key) => !langKeys.has(key)).sort();
      const extraInLang = [...langKeys].filter((key) => !baseKeys.has(key)).sort();
      expect(missingInLang, `${lang}.json is missing: ${missingInLang.join(', ')}`).toEqual([]);
      expect(extraInLang, `${lang}.json has orphaned keys not in en.json: ${extraInLang.join(', ')}`).toEqual([]);
    });
  }
});
