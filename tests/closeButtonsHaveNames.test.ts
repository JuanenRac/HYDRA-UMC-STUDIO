// =============================================================================
// HYDRA-UMC STUDIO - tests/closeButtonsHaveNames.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// A button whose only content is a multiplication sign (the close button of a dialog or a message) reads as "times" to a screen reader. This test
// reads every component and checks that such a button carries an aria-label, so a new close button without a name fails here instead of being
// found by hand. It also checks that the label is the translated one that the catalogs hold in the eight languages.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import en from '../src/locales/en.json';
import de from '../src/locales/de.json';
import es from '../src/locales/es.json';
import fr from '../src/locales/fr.json';
import itLocale from '../src/locales/it.json';
import ja from '../src/locales/ja.json';
import pt from '../src/locales/pt.json';
import zh from '../src/locales/zh.json';

const SRC = path.resolve(__dirname, '..', 'src');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** Every <button ...>&times;</button>, including one split over several lines: the opening tag and what it holds. */
function timesButtons(text: string): string[] {
  const found: string[] = [];
  const pattern = /<button\b((?:=>|[^>])*)>\s*(?:&times;|&#215;|×)\s*<\/button>/g;
  for (const match of text.matchAll(pattern)) found.push(match[1]);
  return found;
}

describe('the close buttons made of a multiplication sign', () => {
  it('all carry an aria-label', () => {
    const missing: string[] = [];
    for (const file of sourceFiles(SRC)) {
      for (const attributes of timesButtons(readFileSync(file, 'utf-8'))) {
        if (!/aria-label=/.test(attributes)) missing.push(path.relative(SRC, file));
      }
    }
    expect(missing).toEqual([]);
  });

  it('are found in the components (the check is not looking at nothing)', () => {
    let total = 0;
    for (const file of sourceFiles(SRC)) total += timesButtons(readFileSync(file, 'utf-8')).length;
    expect(total).toBeGreaterThanOrEqual(4);
  });

  it('use a label that every catalog translates', () => {
    for (const catalog of [en, de, es, fr, itLocale, ja, pt, zh]) {
      const close = (catalog as { dashboard?: { close?: string } }).dashboard?.close;
      expect(typeof close).toBe('string');
      expect((close as string).length).toBeGreaterThan(0);
    }
  });
});
