// =============================================================================
// HYDRA-UMC-STUDIO - Safe rack dimensions and modular STL assembly
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import type { RackConfig } from './store';
export const validRackDimension = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 40 && v <= 1000;
export function rackGeometry(rack: Partial<RackConfig>) {
  return {
    width: validRackDimension(rack.width) ? rack.width : 160,
    depth: validRackDimension(rack.depth) ? rack.depth : 160,
    capacity: Number.isInteger(rack.capacity) && rack.capacity! >= 1 && rack.capacity! <= 24 ? rack.capacity! : 24,
    color: /^#[0-9a-f]{6}$/i.test(rack.color || '') ? rack.color! : (rack.type === 'Output' ? '#10b981' : '#0ea5e9'),
  };
}
export type RackPart = { part: 'base' | 'wall' | 'guide'; size: [number, number, number]; position: [number, number, number] };
// Dimensions and placement in mm, Y up. Slot pitch stays 10 mm at every size.
export function rackParts(rack: Partial<RackConfig>): RackPart[] {
  const { width: w, depth: d, capacity: n } = rackGeometry(rack);
  const h = n * 10 + 40;
  const parts: RackPart[] = [{ part: 'base', size: [w + 20, 20, d + 20], position: [0, 10, 0] }];
  for (const side of [-1, 1]) {
    parts.push({ part: 'wall', size: [10, h, d], position: [side * (w / 2 + 5), h / 2, 0] });
    for (let i = 0; i < n; i++) parts.push({ part: 'guide', size: [4, 3, d], position: [side * (w / 2 - 2), 37.5 + i * 10, 0] });
  }
  return parts;
}
