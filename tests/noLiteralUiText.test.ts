// =============================================================================
// HYDRA-UMC STUDIO - tests/noLiteralUiText.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The interface speaks eight languages, so a sentence typed straight into the
// JSX of the main shell never gets translated. This looks in the files that
// make up the shell (dashboard, settings, about, robot detail, store) for
// visible text, tooltips, accessible names and the messages the store keeps,
// and fails on any literal that is not on the short list of names that are
// the same in every language.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const FILES = [
  'Dashboard.tsx',
  'HydraProvider.tsx',
  'components/Config.tsx',
  'components/About.tsx',
  'components/RobotDetail.tsx',
  'components/XYTableConfig.tsx',
  'components/CNC.tsx',
  'components/Laser.tsx',
];

// Product, protocol and software names: identical in every language.
const SAME_IN_ALL_LANGUAGES = new Set([
  'HYDRA', 'Studio', 'URTC', 'HYDRA-UMC', 'HYDRA-UMC Studio Fasion', 'Matrix Terminal', 'Cyberpunk Neon', 'Neon', 'Dracula',
  'Nord', 'Tokyo Night', 'Midnight Blue', 'LinuxCNC', 'GRBL Serial', 'LightBurn', 'LaserGRBL', 'OrcaSlicer', 'Cura',
  'PrusaSlicer', 'LycheeSlicer', 'Bambu Studio', 'OpenSCAD', 'Promise', 'Partial', 'CNC', 'Pnp',
]);

function literals(source: string): Array<{ line: number; text: string }> {
  const found: Array<{ line: number; text: string }> = [];
  source.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('{/*')) return;
    for (const m of line.matchAll(/>\s*([A-Za-z][^<>{}=;()]*[A-Za-z.…])\s*(?=<|$)/g)) {
      const text = m[1].trim();
      if (text.length > 2 && (text.includes(' ') || /^[A-Z]/.test(text))) found.push({ line: index + 1, text });
    }
    for (const m of line.matchAll(/(?:title|aria-label|alt)="([^"]+)"/g)) found.push({ line: index + 1, text: m[1] });
    for (const m of line.matchAll(/set(?:SettingsSave|Login)Error\(\s*'([^']+)'/g)) found.push({ line: index + 1, text: m[1] });
  });
  return found;
}

describe('the shell has no untranslated UI text', () => {
  for (const file of FILES) {
    it(file, () => {
      const source = readFileSync(path.resolve(__dirname, '../src', file), 'utf8');
      const bad = literals(source).filter(({ text }) => !SAME_IN_ALL_LANGUAGES.has(text));
      expect(bad.map(({ line, text }) => `${file}:${line} ${text}`)).toEqual([]);
    });
  }

  it('the detector sees a literal tooltip and a literal button', () => {
    const sample = '<button title="Save everything">Save now</button>';
    expect(literals(sample).map((l) => l.text)).toEqual(['Save now', 'Save everything']);
  });
});
