// =============================================================================
// HYDRA-UMC STUDIO - tests/i18nPlaceholders.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// i18next only interpolates {{name}}. A catalog value written as {name} is
// shown to the operator exactly as typed, braces included, in every language
// except the one whose fallback text happens to be a template literal. This
// checks the eight catalogs for single-brace placeholders and that the module
// panels hand a readable machine name (not the internal id) to those texts.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const LANGS = ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt'];
const SINGLE_BRACE = /(^|[^{])\{[A-Za-z_][A-Za-z0-9_]*\}([^}]|$)/;

function strings(node: unknown, prefix: string, out: Array<[string, string]>): void {
  if (typeof node === 'string') out.push([prefix, node]);
  else if (Array.isArray(node)) node.forEach((v, i) => strings(v, `${prefix}[${i}]`, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) strings(v, prefix ? `${prefix}.${k}` : k, out);
  }
}

describe('catalog placeholders', () => {
  for (const lang of LANGS) {
    it(`${lang}: no value uses a single-brace {placeholder}`, () => {
      const file = path.resolve(__dirname, `../src/locales/${lang}.json`);
      const all: Array<[string, string]> = [];
      strings(JSON.parse(readFileSync(file, 'utf8')), '', all);
      const bad = all.filter(([, text]) => SINGLE_BRACE.test(text)).map(([key]) => key);
      expect(bad).toEqual([]);
    });
  }
});

describe('module panels name the machine', () => {
  const read = (name: string) => readFileSync(path.resolve(__dirname, `../src/components/${name}`), 'utf8');
  for (const [file, id] of [['CNC.tsx', 'juanenCNC'], ['Laser.tsx', 'juanenLaser']] as const) {
    it(`${file} does not pass the internal id "${id}" as the machine name`, () => {
      const source = read(file);
      expect(source).not.toMatch(new RegExp(`machineType:\\s*machineType`));
      expect(source).toContain('machineLabel');
    });
  }
});
