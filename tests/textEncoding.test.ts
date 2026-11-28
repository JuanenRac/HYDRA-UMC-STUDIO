// =============================================================================
// HYDRA-UMC STUDIO - tests/textEncoding.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// A file read with the wrong encoding and saved again turns a degree sign or an
// arrow into two or three unrelated letters, and nothing else notices: it still
// compiles. This looks in the sources, the interface texts and the page for the
// bytes of UTF-8 read as Windows-1252 (or Latin-1), and for the replacement
// character.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const FOLDERS = ['src', 'tests', 'tools', 'scripts', 'docs', 'public'];
const SINGLE_FILES = ['index.html', 'metadata.json', 'package.json', 'CHANGELOG.md'];
const TEXT_FILE = /\.(ts|tsx|mts|js|mjs|cjs|json|css|html|md|py|txt|svg)$/;

// What Windows-1252 shows for the bytes 0x80-0x9F (the five it does not define stay as control characters).
const CP1252_HIGH = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
// A continuation byte (0x80-0xBF) of UTF-8, however it was misread.
const CONTINUATION = `[\\u0080-\\u00bf${CP1252_HIGH}]`;
const MISREAD = new RegExp(
  `[\\u00c2-\\u00df]${CONTINUATION}|[\\u00e0-\\u00ef]${CONTINUATION}{2}|[\\u00f0-\\u00f4]${CONTINUATION}{3}|[\\u0080-\\u009f\\ufffd]`,
);

function textFiles(folder: string): string[] {
  let names: string[];
  try {
    names = readdirSync(folder);
  } catch {
    return [];
  }
  return names.flatMap((name) => {
    if (name === 'node_modules' || name === '__pycache__') return [];
    const full = path.join(folder, name);
    if (statSync(full).isDirectory()) return textFiles(full);
    return TEXT_FILE.test(name) ? [full] : [];
  });
}

describe('text encoding', () => {
  it('knows a misread degree sign, arrow and accented letter, and leaves good text alone', () => {
    const misread = (good: string) => new TextDecoder('windows-1252').decode(new TextEncoder().encode(good));
    for (const good of ['°', '▸', '▾', '→', 'ó', '日']) expect(MISREAD.test(misread(good)), good).toBe(true);
    for (const good of ['25 °C', 'NÃO', 'sincronização', 'château', 'Größe', '«Âge»', '▾ → …']) {
      expect(MISREAD.test(good), good).toBe(false);
    }
  });

  it('finds no text saved with the wrong encoding', () => {
    const files = [...FOLDERS.flatMap((folder) => textFiles(path.join(ROOT, folder))), ...SINGLE_FILES.map((name) => path.join(ROOT, name))];
    expect(files.length).toBeGreaterThan(200);
    const problems = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, index) => (MISREAD.test(line) ? [`${path.relative(ROOT, file)}:${index + 1}: ${line.trim().slice(0, 80)}`] : [])),
    );
    expect(problems).toEqual([]);
  });
});
