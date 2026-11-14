// =============================================================================
// HYDRA-UMC STUDIO - src/tour/tours.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The guided tours of STUDIO: each one is a list of steps, and a step says which screen to be in and which part of the page to light up (the value of a
// `data-tour` attribute). The words of a step are in the catalogs under `tour.<id>_<n>_t` (title) and `tour.<id>_<n>_b` (body), in the eight languages, so a
// step cannot exist without its sentences (tests/tours.test.ts checks it).
// =============================================================================
export type Placement = 'right' | 'left' | 'top' | 'bottom';
export type TourStep = {
  /** The screen to be in for this step (the `activeTab` of the dashboard); the tour opens it by itself. */
  view?: string;
  /** The part of the page to light up: the value of a `data-tour` attribute. Without it the step is a card in the middle of the screen. */
  target?: string;
  placement?: Placement;
};
export type Tour = { id: string; /** The view this tour belongs to, if it explains one screen. */ view?: string; steps: readonly TourStep[] };

export const TOURS: readonly Tour[] = [
  {
    id: 'welcome',
    steps: [
      { view: 'overview' },
      { target: 'sidebar', placement: 'right' },
      { target: 'nav-overview', placement: 'right' },
      { target: 'nav-cameras', placement: 'right' },
      { target: 'settings', placement: 'bottom' },
      { target: 'help', placement: 'bottom' },
      { target: 'stop', placement: 'bottom' },
    ],
  },
  { id: 'overview', view: 'overview', steps: [{ view: 'overview', target: 'nav-overview', placement: 'right' }, { view: 'overview', target: 'stage', placement: 'left' }] },
  { id: 'cameras', view: 'cameras', steps: [{ view: 'cameras', target: 'nav-cameras', placement: 'right' }, { view: 'cameras', target: 'stage', placement: 'left' }] },
];

export function tourById(id: string): Tour | undefined {
  return TOURS.find((tour) => tour.id === id);
}

/** The tour that explains the screen `view`, if there is one. */
export function tourForView(view: string): Tour | undefined {
  return TOURS.find((tour) => tour.view === view);
}

/** The key of the catalog for the title (`t`) or the body (`b`) of a step. */
export function stepKey(id: string, index: number, part: 't' | 'b'): string {
  return `tour.${id}_${index}_${part}`;
}

export type Box = { left: number; top: number; width: number; height: number };
export type Placed = { left: number; top: number; side: Placement | 'center' };

const GAP = 14;
const MARGIN = 12;

/**
 * Where the card goes next to the lit part: on the side asked for if it fits on the screen, else on the first side that does (bottom, right, left, top), else
 * in the middle. The card never leaves the screen.
 */
export function placeCard(box: Box, size: { width: number; height: number }, screen: { width: number; height: number }, wanted: Placement = 'right'): Placed {
  const fits: Record<Placement, boolean> = {
    right: box.left + box.width + GAP + size.width + MARGIN <= screen.width,
    left: box.left - GAP - size.width - MARGIN >= 0,
    bottom: box.top + box.height + GAP + size.height + MARGIN <= screen.height,
    top: box.top - GAP - size.height - MARGIN >= 0,
  };
  const order: Placement[] = [wanted, 'bottom', 'right', 'left', 'top'];
  const side = order.find((candidate) => fits[candidate]);
  if (!side) return { left: Math.max(MARGIN, (screen.width - size.width) / 2), top: Math.max(MARGIN, (screen.height - size.height) / 2), side: 'center' };
  const clamp = (value: number, max: number): number => Math.min(Math.max(value, MARGIN), Math.max(MARGIN, max));
  const centreX = box.left + box.width / 2 - size.width / 2;
  const centreY = box.top + box.height / 2 - size.height / 2;
  switch (side) {
    case 'right': return { left: box.left + box.width + GAP, top: clamp(centreY, screen.height - size.height - MARGIN), side };
    case 'left': return { left: box.left - GAP - size.width, top: clamp(centreY, screen.height - size.height - MARGIN), side };
    case 'bottom': return { left: clamp(centreX, screen.width - size.width - MARGIN), top: box.top + box.height + GAP, side };
    default: return { left: clamp(centreX, screen.width - size.width - MARGIN), top: box.top - GAP - size.height, side };
  }
}
