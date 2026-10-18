// =============================================================================
// HYDRA-UMC STUDIO - angle helpers: angles.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

// Shortest-path angle interpolation in degrees - a naive linear lerp
// between e.g. 350deg and 10deg would visibly spin the joint the LONG
// way around (340deg of travel) instead of the real 20deg it should
// take.
export function lerpAngleDeg(current: number, target: number, t: number): number {
    const diff = (((target - current + 180) % 360) + 360) % 360 - 180;
    return current + diff * t;
}
