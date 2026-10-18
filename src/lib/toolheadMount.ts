// =============================================================================
// HYDRA-UMC STUDIO - where a tool sits on a robot flange: toolheadMount.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import type * as THREE from 'three';

/**
 * Where to mount the Toolhead group, in the last link's own local frame -
 * a fixed guess like `[0, 0.02, 0]` regardless of that robot's own
 * last-link mesh size would work fine for a small mesh (a few cm) but
 * would visually bury the tool INSIDE a bigger one (SO-ARM100's own
 * Fixed_Jaw.stl alone spans ~10.6cm) instead of sitting past its tip -
 * "the tool looks like it's on the wrong piece" is exactly what that
 * looks like. Derives the offset from the
 * mesh's own real bounding box instead of a blind constant, +1cm margin
 * so the tool sits just clear of the geometry rather than flush against
 * it. Assumes the robot's own "outward"/tool-mount direction is +Y in
 * that mesh's own local frame, matching every *Arm.tsx's existing
 * convention (not a universal guarantee for an arbitrary mesh, but true
 * for every real robot mesh in this project so far).
 */
export function toolheadMountOffset(geometry: THREE.BufferGeometry | undefined | null, margin = 0.01): [number, number, number] {
  if (!geometry) return [0, 0.02, 0];
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const maxY = box ? box.max.y : 0.01;
  return [0, Math.max(maxY, 0.005) + margin, 0];
}
