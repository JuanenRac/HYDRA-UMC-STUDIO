// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/preferencesTab.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The personal preferences: kept in this browser only, read defensively (a damaged or blocked storage gives the defaults), applied to the
// page as attributes, and used by the Help to choose the level it opens at.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '../src/i18n';
import { PreferencesTab } from '../src/components/config/PreferencesTab';
import { HelpModal } from '../src/components/HelpModal';
import { STUDIO_DEFAULTS, STUDIO_PREFS_KEY, applyStudioPrefs, getStudioPrefs, resetStudioPrefs, setStudioPrefs } from '../src/lib/studioPrefs';

beforeEach(() => { resetStudioPrefs(); window.localStorage.removeItem(STUDIO_PREFS_KEY); });
afterEach(() => { cleanup(); resetStudioPrefs(); });

describe('studioPrefs', () => {
  it('starts with the defaults, and ignores a value that is not valid', () => {
    expect(getStudioPrefs()).toEqual(STUDIO_DEFAULTS);
    setStudioPrefs({ helpLevel: 'expert' as never, density: 'huge' as never, reduceMotion: 'yes' as never });
    expect(getStudioPrefs()).toEqual(STUDIO_DEFAULTS);
  });

  it('keeps a valid choice in this browser only and writes it on the page', () => {
    setStudioPrefs({ density: 'compact', reduceMotion: true, helpLevel: 'technical' });
    expect(getStudioPrefs()).toEqual({ helpLevel: 'technical', density: 'compact', reduceMotion: true, listenOnly: false, listenOnlyServers: [], selfUpdateApply: false });
    expect(document.documentElement.dataset.density).toBe('compact');
    expect(document.documentElement.dataset.motion).toBe('reduced');
    expect(window.localStorage.getItem(STUDIO_PREFS_KEY)).toContain('technical');
    resetStudioPrefs();
    expect(document.documentElement.dataset.density).toBe('comfortable');
    expect(document.documentElement.dataset.motion).toBe('full');
  });

  it('applies the preferences to any root element it is given', () => {
    const root = document.createElement('div');
    applyStudioPrefs({ helpLevel: 'all', density: 'compact', reduceMotion: false, listenOnly: false, listenOnlyServers: [], selfUpdateApply: false }, root);
    expect(root.dataset.density).toBe('compact');
    expect(root.dataset.motion).toBe('full');
  });
});

describe('PreferencesTab', () => {
  it('changes each preference at once', () => {
    render(<PreferencesTab />);
    expect((screen.getByTestId('prefs-level-all') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByTestId('prefs-level-advanced'));
    fireEvent.click(screen.getByTestId('prefs-density-compact'));
    fireEvent.click(screen.getByTestId('prefs-reduce-motion'));
    expect(getStudioPrefs()).toEqual({ helpLevel: 'advanced', density: 'compact', reduceMotion: true, listenOnly: false, listenOnlyServers: [], selfUpdateApply: false });
    expect((screen.getByTestId('prefs-density-compact') as HTMLInputElement).checked).toBe(true);
  });

  it('turns Listen only on and off, off by default, and keeps it in this browser', () => {
    expect(getStudioPrefs().listenOnly).toBe(false);
    render(<PreferencesTab />);
    const box = screen.getByTestId('prefs-listen-only') as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(getStudioPrefs().listenOnly).toBe(true);
    expect(window.localStorage.getItem(STUDIO_PREFS_KEY)).toContain('"listenOnly":true');
    fireEvent.click(box);
    expect(getStudioPrefs().listenOnly).toBe(false);
    setStudioPrefs({ listenOnly: 'yes' as never });
    expect(getStudioPrefs().listenOnly).toBe(false);
  });

  it('puts everything back with one button', () => {
    setStudioPrefs({ density: 'compact', reduceMotion: true });
    render(<PreferencesTab />);
    fireEvent.click(screen.getByTestId('prefs-reset'));
    expect(getStudioPrefs()).toEqual(STUDIO_DEFAULTS);
  });
});

describe('the Help', () => {
  it('opens its guides at the level the person chose', () => {
    setStudioPrefs({ helpLevel: 'technical' });
    render(<HelpModal onClose={() => undefined} initialTab="guides" />);
    expect(screen.getByRole('button', { name: /^technical$/i }).getAttribute('aria-pressed')).toBe('true');
  });
});
