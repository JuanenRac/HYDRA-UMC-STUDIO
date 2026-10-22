// =============================================================================
// HYDRA-UMC STUDIO - tests/lazyLanguages.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Only English ships with the first screen; the other seven catalogs are
// fetched when a language is selected, which keeps them out of the main
// bundle. An unknown code must leave the current language untouched.
// =============================================================================
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import i18n, { SUPPORTED_LANGUAGES, setLanguage } from '../src/i18n';

describe('lazy language catalogs', () => {
  it('imports no catalog statically except English', () => {
    const source = readFileSync(path.resolve(__dirname, '../src/i18n.ts'), 'utf8');
    const staticImports = [...source.matchAll(/^import .* from '\.\/locales\/(\w+)\.json'/gm)].map((m) => m[1]);
    expect(staticImports).toEqual(['en']);
  });

  it('starts with English only and loads a language on demand', async () => {
    expect(i18n.hasResourceBundle('ja', 'translation')).toBe(false);
    await setLanguage('ja');
    expect(i18n.language).toBe('ja');
    expect(i18n.hasResourceBundle('ja', 'translation')).toBe(true);
    expect(i18n.t('common.cancel')).not.toBe('Cancel');
    await setLanguage('en');
    expect(i18n.t('common.cancel')).toBe('Cancel');
  });

  it('every supported language has a loadable catalog', async () => {
    for (const code of SUPPORTED_LANGUAGES) {
      await setLanguage(code);
      expect(i18n.language).toBe(code);
      expect(i18n.hasResourceBundle(code, 'translation')).toBe(true);
    }
    await setLanguage('en');
  });

  it('ignores a code with no catalog', async () => {
    await setLanguage('en');
    await setLanguage('xx');
    expect(i18n.language).toBe('en');
  });
});
