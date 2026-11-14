// =============================================================================
// HYDRA-UMC STUDIO - tests/tours.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The guided tours: every step has its words in the eight languages, every part a step lights up exists in the dashboard, and the card is
// placed next to the lit part without leaving the screen.
// =============================================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TOURS, placeCard, stepKey, tourById, tourForView } from '../src/tour/tours';

const LANGUAGES = ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt'];
const catalogue = (language: string): { tour: Record<string, string> } => JSON.parse(readFileSync(`src/locales/${language}.json`, 'utf8'));
const dashboard = readFileSync('src/Dashboard.tsx', 'utf8');

describe('the tours', () => {
  it('have a name and the title and the body of every step in the eight languages', () => {
    for (const language of LANGUAGES) {
      const { tour } = catalogue(language);
      for (const item of TOURS) {
        expect(tour[`name_${item.id}`], `${language} name of ${item.id}`).toBeTruthy();
        item.steps.forEach((_step, index) => {
          for (const part of ['t', 'b'] as const) {
            const key = stepKey(item.id, index, part).replace(/^tour\./, '');
            expect(tour[key], `${language} ${key}`).toBeTruthy();
          }
        });
      }
    }
  });

  it('have no words for a step that does not exist', () => {
    const { tour } = catalogue('en');
    const known = new Set<string>();
    for (const item of TOURS) item.steps.forEach((_s, index) => { known.add(`${item.id}_${index}_t`); known.add(`${item.id}_${index}_b`); });
    const stepKeys = Object.keys(tour).filter((key) => /_\d+_[tb]$/.test(key));
    expect(stepKeys.filter((key) => !known.has(key))).toEqual([]);
  });

  it('light up only parts that the dashboard marks with data-tour', () => {
    const marked = new Set([...dashboard.matchAll(/data-tour="([a-z-]+)"/g)].map((match) => match[1]));
    for (const match of dashboard.matchAll(/\btour="([a-z-]+)"/g)) marked.add(match[1]);
    for (const item of TOURS) for (const step of item.steps) if (step.target) expect(marked.has(step.target), `${item.id}: ${step.target}`).toBe(true);
  });

  it('have unique ids, at least one step, and a tour for each screen they belong to', () => {
    expect(new Set(TOURS.map((item) => item.id)).size).toBe(TOURS.length);
    for (const item of TOURS) expect(item.steps.length).toBeGreaterThan(0);
    expect(tourById('welcome')?.steps.length).toBe(7);
    expect(tourById('nope')).toBeUndefined();
    expect(tourForView('overview')?.id).toBe('overview');
    expect(tourForView('cameras')?.id).toBe('cameras');
    expect(tourForView('adminAudit')).toBeUndefined();
  });

  it('name the key of a step', () => {
    expect(stepKey('welcome', 3, 't')).toBe('tour.welcome_3_t');
    expect(stepKey('cameras', 0, 'b')).toBe('tour.cameras_0_b');
  });
});

describe('placeCard', () => {
  const screen = { width: 1200, height: 800 };
  const size = { width: 360, height: 240 };

  it('puts the card on the side asked for when it fits, next to the lit part', () => {
    const placed = placeCard({ left: 20, top: 100, width: 200, height: 60 }, size, screen, 'right');
    expect(placed.side).toBe('right');
    expect(placed.left).toBe(20 + 200 + 14);
  });

  it('moves to another side when the one asked for does not fit', () => {
    const placed = placeCard({ left: 1100, top: 100, width: 80, height: 40 }, size, screen, 'right');
    expect(placed.side).toBe('bottom');
    expect(placed.left + size.width).toBeLessThanOrEqual(screen.width);
  });

  it('never leaves the screen, and goes to the middle when no side fits', () => {
    for (const wanted of ['right', 'left', 'top', 'bottom'] as const) {
      const placed = placeCard({ left: 5, top: 5, width: 30, height: 30 }, size, screen, wanted);
      expect(placed.left).toBeGreaterThanOrEqual(0);
      expect(placed.top).toBeGreaterThanOrEqual(0);
      expect(placed.left + size.width).toBeLessThanOrEqual(screen.width);
      expect(placed.top + size.height).toBeLessThanOrEqual(screen.height);
    }
    const huge = placeCard({ left: 0, top: 0, width: 1190, height: 790 }, size, screen, 'right');
    expect(huge.side).toBe('center');
    expect(huge.left).toBeCloseTo((screen.width - size.width) / 2);
  });
});
