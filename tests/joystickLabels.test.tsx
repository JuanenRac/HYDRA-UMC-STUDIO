// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/joystickLabels.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The buttons of the 3D jog pad hold only an icon: each needs a name for a screen reader, and the name
// follows the language of the program.
// =============================================================================
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import i18n from '../src/i18n';
import { Joystick3D, jogLabel } from '../src/components/Joystick3D';

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('en');
});

const LANGUAGES = ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt'];

describe('Joystick3D names', () => {
  it('every one of the ten buttons has a distinct, non-empty aria-label', async () => {
    await i18n.changeLanguage('en');
    const { container } = render(<Joystick3D onJog={() => {}} />);
    const labels = Array.from(container.querySelectorAll('button')).map((b) => b.getAttribute('aria-label') ?? '');
    expect(labels).toHaveLength(10);
    expect(labels.every((l) => l.trim().length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(10);
  });

  it('names a diagonal by both axes and a Z button by Z alone', async () => {
    await i18n.changeLanguage('en');
    const t = i18n.t.bind(i18n) as never;
    expect(jogLabel(t, -1, 1, 0)).toBe('Jog X -, Jog Y +');
    expect(jogLabel(t, 0, 0, 1)).toBe('Jog Z +');
    expect(jogLabel(t, 0, 0, -1)).toBe('Jog Z -');
  });

  it('is answered in each of the eight languages', async () => {
    for (const lng of LANGUAGES) {
      await i18n.changeLanguage(lng);
      const label = jogLabel(i18n.t.bind(i18n) as never, 1, 0, 0);
      expect(label, lng).toContain('X');
      expect(label, lng).not.toContain('{{');
    }
  });
});
