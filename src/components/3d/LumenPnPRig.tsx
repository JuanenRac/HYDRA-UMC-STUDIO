// =============================================================================
// HYDRA-UMC STUDIO - React Component: LumenPnPRig.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real geometry, not a placeholder: 7 merged meshes (public/models/
// lumenpnp/*.glb, see that folder's own ATTRIBUTION.txt - the .stl
// originals tessellated from Opulo's own official FreeCAD source are kept
// alongside them as the source-of-truth for regenerating the .glb, but
// aren't loaded by this component) tessellated directly from Opulo's own
// official FreeCAD source (github.com/opulo-inc/lumenpnp, pnp/cad/
// assembly.FCStd, GPL-3.0/Apache-licensed per that project's own LICENSE)
// - the same real assembly their own machine ships with, not a
// re-derived/approximated shape, just decimated to a triangle budget
// comparable to every other robot mesh in this folder (a "recognizable
// silhouette", not a bolt-for-bolt replica - see ATTRIBUTION.txt for the
// exact per-part filtering that was applied and why).
//
// LumenPnP has no native URDF/joint data (confirmed: zero Assembly::/Joint
// objects anywhere in the source file) and isn't a serial robot arm, so
// this doesn't reuse the *Arm.tsx joint-chain pattern - it's a real
// Cartesian gantry, built from the machine's own real mechanical
// structure instead, matching this project's own formal
// lumenpnp_juanenpnp.urdf (7 links/6 joints, built the same way from the
// same source CAD) link-for-link:
//   base (fixed)
//     -> y_carriage   (translates world Y,  0-487mm - openpnp/machine.xml)
//        -> x_carriage (translates local X, 0-433mm - openpnp/machine.xml)
//           -> z_carriage_left  (translates local Z only - the rail slider
//              housing, does NOT rotate on the real machine)
//              -> nozzle_left    (rotates "A" only, no extra translation -
//                 same joint origin as its z_carriage_left parent)
//           -> z_carriage_right (translates local Z only, mirrors
//              z_carriage_left's Z per machine.xml's own z2
//              input-axis-id="z1" mapping)
//              -> nozzle_right   (rotates "B" only)
// Real bug fixed 2026-09-08: an earlier revision of this rig merged each
// Z-carriage housing and its nozzle into ONE rigid mesh per side
// (z_carriage_n1/n2) that translated AND rotated together - a real, visible
// error, not a harmless simplification: the housing's own real footprint is
// ~44x51mm at that joint (measured off the real per-part CAD bounding box),
// so the whole rectangular slider block visibly swung around the Z axis
// every time a nozzle rotated, which the physical machine never does (only
// the ~10x10mm nozzle barrel itself spins). Splitting them into the 7 real
// links above - already the formal URDF's own link split - fixes it: only
// nozzle_left/nozzle_right rotate now.
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
import { useGLTF } from '@react-three/drei';
import type { PnPModule } from '../../store';

// Loads pre-merged/indexed .glb rather than raw .stl+mergeVertices() at
// runtime (every *Arm.tsx in this folder still does the latter - LumenPnP
// is the one exception). That runtime path was tried first here too, and
// even after cutting these meshes down to a combined ~86K triangles
// (smaller than several arms already shipping), it still hit
// "THREE.WebGLRenderer: Context Lost" (verified via headless Chromium
// against the live dev server) where a comparable arm never did - the
// difference traced back to 5 synchronous mergeVertices() calls landing
// in the same React commit right as all 5 STL fetches resolved together,
// blocking the main thread long enough in one burst to trip the browser's
// own GPU-hang watchdog. Pre-merging offline (see
// public/models/lumenpnp/ATTRIBUTION.txt for the exact conversion) moves
// that cost out of the browser entirely - useGLTF hands back
// already-indexed geometry with nothing left to compute on load.
const MESH_BASE = '/models/lumenpnp/';

// Real, individually-named CAD parts (public/models/lumenpnp/parts/*.glb -
// legs, control box, frame extrusions, cameras/lights, feeders, nozzle
// hardware, X/Y gantry brackets) added 2026-09-08 alongside the 7 rigid-
// body groups above, so the rig is no longer just those 7 silhouettes -
// see parts/manifest.json for the exact CAD source label, real assembled
// bounding box and triangle count behind every file here, and
// ATTRIBUTION.txt for the full methodology (same headless FreeCAD export,
// same MeshPart.meshFromShape()+hand-written GLB pipeline as the 7 above).
// Each part is already in real assembled world-space, so it is rendered
// with an identity local transform, exactly like the 7 groups it augments.
const PARTS_BASE = MESH_BASE + 'parts/';
const BASE_STATIC_PARTS = [
  'back-leg', 'back-leg001', 'back-leg-extension_001', 'back-leg-extension_002',
  'front-left-leg', 'front-right-leg', 'front-leg-extension_001', 'front-leg-extension_002',
  'control-box_001', 'control-box-lid',
  'vslot-extrusion-20mmx20mmx600mm', 'vslot-extrusion-20mmx20mmx600mm001',
  'vslot-extrusion-20mmx20mmx600mm002', 'vslot-extrusion-20mmx20mmx600mm003',
  'vslot-extrusion-20mmx20mmx600mm007', 'vslot-extrusion-20mmx20mmx600mm008', 'vslot-extrusion-20mmx20mmx600mm009',
  'bottom-camera-cover', 'bottom-camera-mount', 'bottom-camera_001', 'top-camera001',
  'bottom-light-mount', 'top-light-mount', 'bottom-ring-light', 'top-ring-light',
  'aux-staging-plate-foot',
  '8mm-strip-feeder', '12mm-strip-feeder', '16mm-strip-feeder', '24mm-strip-feeder', '32mm-strip-feeder', 'adj-strip-feeder',
  'vacuum-pump002', 'solenoid-valve003',
  'nozzle-rack', 'nozzle-camera-mask_001', 'nozzle-holder_001', 'nozzle-holder_002',
  'xy-limit_001',
];
// Fixed to the Y-bridge's own ends (moves with y_carriage in Y, not with
// x_carriage in X) - same real precedent as X-Motor in the block comment
// above (a fixed-to-the-bridge part, not carried by the toolhead).
const Y_CARRIAGE_STATIC_PARTS = [
  'x-idler-mount', 'x-motor-mount', 'y-gantry-left002', 'y-gantry-right002',
  'y-limit-striker_Body_001', 'squaring-bracket',
];
// The toolhead's own front/back gantry plates - slide in X with the rest
// of x_carriage.
const X_CARRIAGE_STATIC_PARTS = ['x-gantry-back', 'x-gantry-front'];

// Same immediate-parallel-preload treatment as the 7 groups above - none
// of these 47 parts are merged into those, so each is its own small
// fetch; queuing all of them at import time (instead of one Suspense
// retry at a time) keeps total load latency close to the single slowest
// file, not the sum of all 47.
[...BASE_STATIC_PARTS, ...Y_CARRIAGE_STATIC_PARTS, ...X_CARRIAGE_STATIC_PARTS].forEach((label) =>
  useGLTF.preload(PARTS_BASE + label + '.glb')
);

function StaticCadPart({ label, material }: { label: string; material: typeof frameMat }) {
  const geo = useRealScaleGLB(PARTS_BASE + label + '.glb');
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial {...material} />
    </mesh>
  );
}

function useRealScaleGLB(url: string): THREE.BufferGeometry {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    let geometry: THREE.BufferGeometry | undefined;
    scene.traverse((obj) => {
      if (!geometry && (obj as THREE.Mesh).isMesh) {
        geometry = (obj as THREE.Mesh).geometry;
      }
    });
    if (!geometry) {
      throw new Error(`LumenPnPRig: no mesh found in ${url}`);
    }
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const maxDim = box ? Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z) : 0;
    if (maxDim > 5) {
      geometry = geometry.clone().scale(0.001, 0.001, 0.001);
    }
    return geometry;
  }, [scene, url]);
}

const MESH_URLS = ['base.glb', 'x_carriage.glb', 'y_carriage.glb', 'z_carriage_left.glb', 'z_carriage_right.glb', 'nozzle_left.glb', 'nozzle_right.glb'].map((f) => MESH_BASE + f);
// Kicks off all 5 fetches immediately, in parallel, the moment this
// module is imported - without this, each of the 5 useGLTF() calls below
// only starts ITS OWN fetch on the Suspense retry where React reaches it,
// so they'd load one at a time rather than concurrently.
MESH_URLS.forEach((url) => useGLTF.preload(url));

// Opulo's own real brand color (their feeder/gantry accent parts are this
// yellow in every official product photo) picked up on the carriages;
// the fixed frame stays a neutral aluminum-extrusion gray so the moving
// assemblies read clearly against it.
const frameMat = { color: '#9aa1ab', roughness: 0.55, metalness: 0.35 };
const carriageMat = { color: '#c7cdd6', roughness: 0.45, metalness: 0.4 };
const nozzleMat = { color: '#eab308', roughness: 0.4, metalness: 0.3 };

export default function LumenPnPRig({ module }: { module: PnPModule }) {
  const [baseUrl, xUrl, yUrl, zLeftUrl, zRightUrl, nozzleLeftUrl, nozzleRightUrl] = MESH_URLS;
  const baseGeo = useRealScaleGLB(baseUrl);
  const yCarriageGeo = useRealScaleGLB(yUrl);
  const xCarriageGeo = useRealScaleGLB(xUrl);
  const zCarriageLeftGeo = useRealScaleGLB(zLeftUrl);
  const zCarriageRightGeo = useRealScaleGLB(zRightUrl);
  const nozzleLeftGeo = useRealScaleGLB(nozzleLeftUrl);
  const nozzleRightGeo = useRealScaleGLB(nozzleRightUrl);

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
      {BASE_STATIC_PARTS.map((label) => (
        <StaticCadPart key={label} label={label} material={frameMat} />
      ))}

      <group position={[0, y, 0]}>
        <mesh geometry={yCarriageGeo} castShadow receiveShadow>
          <meshStandardMaterial {...carriageMat} />
        </mesh>
        {Y_CARRIAGE_STATIC_PARTS.map((label) => (
          <StaticCadPart key={label} label={label} material={carriageMat} />
        ))}

        <group position={[x, 0, 0]}>
          <mesh geometry={xCarriageGeo} castShadow receiveShadow>
            <meshStandardMaterial {...carriageMat} />
          </mesh>
          {X_CARRIAGE_STATIC_PARTS.map((label) => (
            <StaticCadPart key={label} label={label} material={carriageMat} />
          ))}

          <group position={[0, 0, z]}>
            <mesh geometry={zCarriageLeftGeo} castShadow receiveShadow>
              <meshStandardMaterial {...carriageMat} />
            </mesh>
            {/* Only the nozzle barrel rotates - same joint origin as its
                z_carriage_left parent, matching joint_c_left's real
                "0 0 0" origin in lumenpnp_juanenpnp.urdf. */}
            <group rotation={[0, 0, rotA]}>
              <mesh geometry={nozzleLeftGeo} castShadow receiveShadow>
                <meshStandardMaterial {...nozzleMat} />
              </mesh>
            </group>
          </group>

          <group position={[0, 0, z]}>
            <mesh geometry={zCarriageRightGeo} castShadow receiveShadow>
              <meshStandardMaterial {...carriageMat} />
            </mesh>
            <group rotation={[0, 0, rotB]}>
              <mesh geometry={nozzleRightGeo} castShadow receiveShadow>
                <meshStandardMaterial {...nozzleMat} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
