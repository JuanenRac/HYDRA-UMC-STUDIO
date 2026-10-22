// =============================================================================
// HYDRA-UMC STUDIO - Test: buttonLabels.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// A button that carries only an icon has just its `title` as a name, and a
// title is not announced reliably by screen readers or shown on touch
// screens. Every icon-only <button> with a title also needs an aria-label.
// =============================================================================

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** The opening tag of every icon-only <button ...>, walking past attribute expressions in braces. */
function buttonTags(source: string): string[] {
  const tags: string[] = [];
  const open = /<button\b/g;
  let m: RegExpExecArray | null;
  while ((m = open.exec(source)) !== null) {
    let depth = 0;
    let quote: string | null = null;
    let j = m.index + m[0].length;
    for (; j < source.length; j++) {
      const c = source[j];
      if (quote) {
        if (c === quote && source[j - 1] !== '\\') quote = null;
      } else if (depth === 0 && (c === '"' || c === "'")) quote = c;
      else if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0 && source[j - 1] !== '=') break;
    }
    const end = source.indexOf('</button>', j);
    const inner = end < 0 ? '' : source.slice(j + 1, end);
    // Icon-only: nothing is left once the self-closing icon elements are removed.
    const iconOnly = inner.replace(/<[A-Za-z][^<>]*\/>/g, '').trim() === '';
    if (iconOnly) tags.push(source.slice(m.index, j + 1));
  }
  return tags;
}

describe('icon-only buttons with a title', () => {
  it('also have an aria-label', () => {
    const missing: string[] = [];
    for (const file of sourceFiles('src')) {
      for (const tag of buttonTags(readFileSync(file, 'utf8'))) {
        if (/\btitle=/.test(tag) && !tag.includes('aria-label')) {
          missing.push(`${file}: ${tag.replace(/\s+/g, ' ').slice(0, 90)}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('physical settings in the robot panel', () => {
  it('the tool selector asks for confirmation instead of sending the change at once', () => {
    const source = readFileSync('src/components/RobotDetail.tsx', 'utf8');
    const direct = source.match(/onChange=\{[^}]*sendRobotCommand\([^)]*'tool'/g);
    expect(direct).toBeNull();
    expect(source).toContain('setPendingTool(e.target.value)');
  });
});
