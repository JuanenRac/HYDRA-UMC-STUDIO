// =============================================================================
// HYDRA-UMC STUDIO - heated bed limits: heatedBed.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Two panels set the target temperature of the bed, one clamped it to 0-150 and the other to nothing (so 300 could be
// typed), and one of them showed 60 when the value was really 0. One limit, one function.
// =============================================================================

/** The hottest target a bed may be given, in degrees Celsius. */
export const MAX_BED_TARGET_C = 150;

/** A target temperature as a whole, finite number inside 0..MAX_BED_TARGET_C (anything else becomes 0). */
export function clampBedTarget(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_BED_TARGET_C, Math.max(0, Math.round(value)));
}
