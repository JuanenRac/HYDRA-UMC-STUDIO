// =============================================================================
// HYDRA-UMC STUDIO - React Component: LumenPnPRig.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real geometry, not a placeholder: 5 merged STL meshes (public/models/
// lumenpnp/*.stl, see that folder's own ATTRIBUTION.txt) tessellated
// directly from Opulo's own official FreeCAD source (github.com/opulo-inc/
// lumenpnp, pnp/cad/assembly.FCStd, GPL-3.0/Apache-licensed per that
// project's own LICENSE) - the same 696-shape, exact-position assembly
// their own machine ships with, not a re-derived/approximated shape.
//
// LumenPnP has no native URDF/joint data (confirmed: zero Assembly::/Joint
// objects anywhere in the source file) and isn't a serial robot arm, so
// this doesn't reuse the *Arm.tsx joint-chain pattern - it's a real
// Cartesian gantry, built from the machine's own real mechanical
// structure instead:
//   base (fixed)
//     -> y_carriage   (translates world Y,  0-487mm - openpnp/machine.xml)
//        -> x_carriage (translates local X, 0-433mm - openpnp/machine.xml)
//           -> z_carriage_n1 (translates local Z, rotates "A" - nozzle 1)
//           -> z_carriage_n2 (translates local Z, rotates "B" - nozzle 2,
//                              mirrors n1's Z per machine.xml's own
//                              z2 input-axis-id="z1" mapping)
// Which real CAD parts belong to which link was determined by opening the
// real assembly.FCStd headless (FreeCAD 1.1's own Python API) and reading
// every leaf part's real bounding box - e.g. GT2BeltClamp's own bbox
// tracks the toolhead's X range exactly (it clamps the X-belt to the
// carriage), so it's part of x_carriage; X-Motor's bbox sits at a fixed
// corner regardless of toolhead position, so it's part of y_carriage
// (mounted to the bridge, not the toolhead). See that investigation's own
// notes for the full per-part reasoning - this isn't a guessed split.
//
// JuanenPnP (the project owner's own LumenPnP) shares this exact rig -
// per the owner's own confirmation, it's visually and mechanically
// identical to stock LumenPnP, so no separate mesh set exists for it.
// =============================================================================

import { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { PnPModule } from '../../store';

// Same defensive mm-vs-m scale check every other real-mesh component in
// this folder applies (see URArm.tsx's own copy) - these STLs are
// exported straight from the CAD in millimeters.
function useRealScaleSTL(url: string): THREE.BufferGeometry {
  const raw = useLoader(STLLoader, url);
  return useMemo(() => {
    const geometry = raw.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const maxDim = box ? Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z) : 0;
    if (maxDim > 5) {
      geometry.scale(0.001, 0.001, 0.001);
    }
    return geometry;
  }, [raw]);
}

// Opulo's own real brand color (their feeder/gantry accent parts are this
// yellow in every official product photo) picked up on the carriages;
// the fixed frame stays a neutral aluminum-extrusion gray so the moving
// assemblies read clearly against it.
const frameMat = { color: '#9aa1ab', roughness: 0.55, metalness: 0.35 };
const carriageMat = { color: '#c7cdd6', roughness: 0.45, metalness: 0.4 };
const nozzleMat = { color: '#eab308', roughness: 0.4, metalness: 0.3 };

export default function LumenPnPRig({ module }: { module: PnPModule }) {
  const meshBase = '/models/lumenpnp/';
  const baseGeo = useRealScaleSTL(meshBase + 'base.stl');
  const yCarriageGeo = useRealScaleSTL(meshBase + 'y_carriage.stl');
  const xCarriageGeo = useRealScaleSTL(meshBase + 'x_carriage.stl');
  const zN1Geo = useRealScaleSTL(meshBase + 'z_carriage_n1.stl');
  const zN2Geo = useRealScaleSTL(meshBase + 'z_carriage_n2.stl');

  // Real axis values are millimeters (matching openpnp/machine.xml's own
  // units) - converted to meters here at the one point they're consumed,
  // same convention as every other real-geometry component in this folder.
  const x = (module.axisX ?? 0) / 1000;
  const y = (module.axisY ?? 0) / 1000;
  const z = (module.axisZ ?? 0) / 1000;
  const rotA = (module.nozzle1Rotation ?? 0) * Math.PI / 180;
  const rotB = (module.nozzle2Rotation ?? 0) * Math.PI / 180;

  return (
    // CAD source is Z-up millimeters (matches every *Arm.tsx's own
    // convention in this folder) - one outer flip to Three.js's Y-up,
    // same as URArm.tsx's own root wrapper.
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={baseGeo} castShadow receiveShadow>
        <meshStandardMaterial {...frameMat} />
      </mesh>

      <group position={[0, y, 0]}>
        <mesh geometry={yCarriageGeo} castShadow receiveShadow>
          <meshStandardMaterial {...carriageMat} />
        </mesh>

        <group position={[x, 0, 0]}>
          <mesh geometry={xCarriageGeo} castShadow receiveShadow>
            <meshStandardMaterial {...carriageMat} />
          </mesh>

          <group position={[0, 0, z]} rotation={[0, 0, rotA]}>
            <mesh geometry={zN1Geo} castShadow receiveShadow>
              <meshStandardMaterial {...nozzleMat} />
            </mesh>
          </group>

          <group position={[0, 0, z]} rotation={[0, 0, rotB]}>
            <mesh geometry={zN2Geo} castShadow receiveShadow>
              <meshStandardMaterial {...nozzleMat} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
