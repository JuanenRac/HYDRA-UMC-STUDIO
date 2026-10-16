/**
 * Where the assistant's bubble opens, relative to the mascot: to its right, left, below or above, or on one of the four diagonals, whichever leaves the whole bubble inside the work area.
 * The sides are tried first (the bubble is moved along the mascot, never over it, to fit across), then the diagonals; if nothing fits whole, the one that sticks out least is
 * used and pushed back inside. Pure: the component measures, this decides.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0.
 */
export type Box = { left: number; top: number; width: number; height: number };
export type Size = { width: number; height: number };
export type Edges = { top: number; right: number; bottom: number; left: number };
export type Side = "right" | "left" | "below" | "above" | "below-right" | "below-left" | "above-right" | "above-left";

export const SIDES: readonly Side[] = ["right", "left", "below", "above", "below-right", "below-left", "above-right", "above-left"];
const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value < low ? low : value));

/** How far (in pixels) the box [x, x+w] x [y, y+h] sticks out of the area. */
const overflow = (x: number, y: number, size: Size, area: Box): number =>
  Math.max(0, area.left - x) + Math.max(0, x + size.width - (area.left + area.width)) + Math.max(0, area.top - y) + Math.max(0, y + size.height - (area.top + area.height));

export function placeBubble(mascot: Box, bubble: Size, viewport: Size, edges: Edges = { top: 8, right: 8, bottom: 44, left: 8 }, gap = 10): { side: Side; dx: number; dy: number } {
  const area: Box = { left: edges.left, top: edges.top, width: Math.max(0, viewport.width - edges.left - edges.right), height: Math.max(0, viewport.height - edges.top - edges.bottom) };
  const across = (x: number, y: number, side: Side): [number, number] => {
    // on a side the bubble slides along the mascot to fit; on a diagonal it stays at the corner
    if (side === "right" || side === "left") return [x, clamp(y, area.top, area.top + area.height - bubble.height)];
    if (side === "below" || side === "above") return [clamp(x, area.left, area.left + area.width - bubble.width), y];
    return [x, y];
  };
  const wanted: Record<Side, [number, number]> = {
    "right": [mascot.left + mascot.width + gap, mascot.top],
    "left": [mascot.left - bubble.width - gap, mascot.top],
    "below": [mascot.left, mascot.top + mascot.height + gap],
    "above": [mascot.left, mascot.top - bubble.height - gap],
    "below-right": [mascot.left + mascot.width + gap, mascot.top + mascot.height + gap],
    "below-left": [mascot.left - bubble.width - gap, mascot.top + mascot.height + gap],
    "above-right": [mascot.left + mascot.width + gap, mascot.top - bubble.height - gap],
    "above-left": [mascot.left - bubble.width - gap, mascot.top - bubble.height - gap],
  };
  let best: { side: Side; x: number; y: number; out: number } | null = null;
  for (const side of SIDES) {
    const [x, y] = across(...wanted[side], side);
    const out = overflow(x, y, bubble, area);
    if (out === 0) { best = { side, x, y, out }; break; }
    if (!best || out < best.out) best = { side, x, y, out };
  }
  const found = best!;
  const x = clamp(found.x, area.left, area.left + area.width - bubble.width);
  const y = clamp(found.y, area.top, area.top + area.height - bubble.height);
  return { side: found.side, dx: x - mascot.left, dy: y - mascot.top };
}
