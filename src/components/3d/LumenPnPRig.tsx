// =============================================================================
// HYDRA-UMC STUDIO - React Component: LumenPnPRig.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real geometry, not a placeholder: 7 merged meshes (public/models/
// lumenpnp/*.glb, see that folder's own ATTRIBUTION.txt - the .stl
// originals tessellated from Opulo's own official FreeCAD source are kept
// alongside them as the source-of-truth for regenerating the .glb, but
// are loaded directly for Juanen variants, not the original LumenPnP path)
// tessellated directly from Opulo's own
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
// JuanenPnP, JuanenCNC and JuanenLaser share the transform hierarchy only.
// Their independent STL directories start as copies and may now diverge.
// LumenPnP alone keeps the original GLB path; derivatives load STL directly.
// =============================================================================

import { createContext, useContext, useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { MACHINE_ASSETS, machineAssetPath, type MachineKind } from '../../machineAssets';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import type { PnPModule } from '../../store';

// The original LumenPnP path loads pre-merged/indexed .glb rather than raw .stl+mergeVertices() at
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
const MachineContext = createContext<MachineKind>('lumenPnP');

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
  'nozzle-rack', 'nozzle-holder_001', 'nozzle-holder_002',
  // Batch 5: 2 spare nozzle tips sitting in the rack (not the active tip
  // on either nozzle barrel), 2 real second blade-dispenser units (the
  // machine has 2 pairs, front and back), a 2nd pump/valve pair, pneumatic
  // fittings feeding them, and generic frame hardware.
  'n40-nozzle', 'n08-nozzle', 'blade12_005', 'blade13_004', 'vacuum-pump003', 'solenoid-valve004',
  'reducing-union-tee-4-6-4', 'reducing-union-tee-4-6-4_01',
  'corner-bracket006', 'corner-bracket007',
  'board-mount-static_001', 'board-mount-dynamic_001', 'board-support_001',
  'extrusion-cable-clip004', 'extrusion-cable-clip005',
  'xy-limit_001',
  // Batch 2 (2026-09-08, found missing by the user looking at the live
  // rig): the 2 real Y motors are bolted to the FIXED frame at the rear
  // (they drive belts, they don't ride the bridge) - same for their own
  // paired rear pulleys and the front idlers closing each belt loop.
  'NEMA17-stepper003', 'NEMA17-stepper004', 'GT2-pulley002', 'GT2-pulley003', 'GT2-idler002', 'GT2-idler003',
  // Batch 3: the Y belt loops (both sides) run frame-pulley to
  // frame-idler, and their own tension arms sit right next to those same
  // frame idlers - all fixed.
  'y-gantry-gt2-belt_left', 'y-gantry-gt2-belt_right', 'y1-belt-tension-arm', 'y2-belt-tension-arm',
  // Batch 4: fiducial reference board, the 2 blade-feeder mechanisms
  // (mechanical body only - their own PCBs were dropped, see
  // ATTRIBUTION.txt), the main work-surface staging plates, cable clips
  // along the right frame extrusion, and the fixed Y-axis side rails
  // (525/550mm-MGN12H - the rails themselves don't move, only their
  // carriages below do).
  'datum-board', 'datum-board-mount', 'secondary-fid-mount_001',
  'blade12_004', 'blade13_003', 'pcb-staging-plate', 'pcb-staging-plate-aux',
  'peek-cable-clamp', 'peek-cable-clamp004', 'peek-cable-2',
  '550mm-MGN12H001_001', '550mm-MGN12H001_002',
  'extrusion-cable-clip', 'extrusion-cable-clip002', 'extrusion-cable-clip003',
];
// Fixed to the Y-bridge's own ends (moves with y_carriage in Y, not with
// x_carriage in X) - same real precedent as X-Motor in the block comment
// above (a fixed-to-the-bridge part, not carried by the toolhead).
const Y_CARRIAGE_STATIC_PARTS = [
  'x-idler-mount', 'x-motor-mount', 'y-gantry-left002', 'y-gantry-right002',
  'y-limit-striker_Body_001', 'squaring-bracket',
  // Batch 2: the X motor mounted ON the bridge (same real X-motor-mount
  // precedent above) plus its own pulley/idler pair, and the real Y drag
  // chain (30 links + 4 end connectors) - one end anchored near the
  // bridge, rendered as one rigid attachment here rather than a
  // procedurally-folding chain (this rig has no cable-chain physics
  // anywhere yet), same real simplification tradeoff already made for
  // every other static part in this file.
  'NEMA17-stepper006', 'GT2-pulley005', 'GT2-idler005',
  'y-drag-chain-link-001', 'y-drag-chain-link-002', 'y-drag-chain-link-003', 'y-drag-chain-link-004', 'y-drag-chain-link-005',
  'y-drag-chain-link-006', 'y-drag-chain-link-007', 'y-drag-chain-link-008', 'y-drag-chain-link-009', 'y-drag-chain-link-010',
  'y-drag-chain-link-011', 'y-drag-chain-link-012', 'y-drag-chain-link-013', 'y-drag-chain-link-014', 'y-drag-chain-link-015',
  'y-drag-chain-link-016', 'y-drag-chain-link-017', 'y-drag-chain-link-018', 'y-drag-chain-link-019', 'y-drag-chain-link-020',
  'y-drag-chain-link-021', 'y-drag-chain-link-022', 'y-drag-chain-link-023', 'y-drag-chain-link-024', 'y-drag-chain-link-025',
  'y-drag-chain-link-026', 'y-drag-chain-link-027', 'y-drag-chain-link-028', 'y-drag-chain-link-029', 'y-drag-chain-link-030',
  'ldo-drag-chain-end_Body_001', 'ldo-drag-chain-end_Body_003', 'ldo-drag-chain-end_Body_005', 'ldo-drag-chain-end_Body_006',
  // Batch 3: the X belt's own tension arm and the belt-clamps nearest
  // the bridge's own hardware (see Batch 4's own x-cable-chain-support
  // below for the same "spans the bridge" reasoning).
  'x-gantry-gt2-belt', 'x-belt-tension-arm', 'belt-clamp009', 'belt-clamp010', 'belt-clamp013', 'belt-clamp014',
  // Batch 4: the moving X-axis rail (525mm-MGN12H, mounted ON the
  // bridge, unlike the fixed 550mm Y rails above), its own carriages,
  // and the cable-chain support spanning the bridge's own width.
  '525mm-MGN12H', 'MGN12H-linear-rail-carriage', 'MGN12H-linear-rail-carriage001', 'x-cable-chain-support',
  // Batch 5: the real X-axis drag chain (4 links) - same rigid-
  // attachment-to-the-bridge simplification already used for the Y chain
  // above (no cable-chain physics in this rig).
  'drag-chain-link_001', 'drag-chain-link_002', 'drag-chain-link_003', 'drag-chain-link_004',
];
// The toolhead's own front/back gantry plates - slide in X with the rest
// of x_carriage.
const X_CARRIAGE_STATIC_PARTS = [
  'x-gantry-back', 'x-gantry-front',
  // Batch 2: the toolhead's own small stepper (nozzle/blade drive) and
  // its pulley/idler pair - moves with the toolhead in X.
  'NEMA17-stepper005', 'GT2-pulley004', 'GT2-idler004',
  // Batch 3: the Z belt loop and the toolhead's own belt clamps.
  'z-belt-loop', 'belt-clamp007', 'belt-clamp008',
  // Batch 4: the toolhead's own Z-axis linear rails/carriages and side
  // plates/backplates, and its Z limit switch.
  'mgn9-linear-rail-carriage', 'mgn9-linear-rail-carriage001',
  'linear-rail-100mm_001', 'linear-rail-100mm_002',
  'z-gantry-backplate-left001', 'z-gantry-backplate-right002', 'z-gantry-left001', 'z-gantry-right001',
  'z-limit_001',
  // Batch 5: the real nozzle-rotation motors (hollow-shaft - vacuum
  // tubing passes through the center while the shaft spins the nozzle;
  // the motor BODY moves with the toolhead in X, only the nozzle barrel
  // itself rotates - see LumenPnPRig.tsx's own z_carriage/nozzle split
  // above for that same real distinction), the toolhead's own 2nd
  // camera-mask instance (mirrors the 1st, moved here from base_link -
  // a real bucketing bug found and fixed this same pass, both sit at
  // z_carriage/nozzle height, not the static frame), a 3rd Z-rail
  // carriage, the toolhead's own cable splay and pneumatic fittings.
  'NEMA11-hollow-shaft-stepper002', 'NEMA11-hollow-shaft-stepper003',
  'nozzle-camera-mask_001', 'nozzle-camera-mask_002',
  'MGN12H001_002', 'cable-splay', 'rotary-pneumatic-adapter_001', 'rotary-pneumatic-adapter_002',
];

// Preloading below is scoped to the selected machine, not all variants at
// import time. Material rendering is shared; geometry paths remain independent.


function GlbCadMesh({ url, material }: { url: string; material: typeof frameMat }) {
  const geo = useRealScaleGLB(url);
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial {...material}/></mesh>;
}
function StlCadMesh({ url, material }: { url: string; material: typeof frameMat }) {
  const source = useLoader(STLLoader, url);
  const geo = useMemo(() => source.clone().scale(.001, .001, .001), [source]);
  useEffect(() => () => geo.dispose(), [geo]);
  // STL is already triangulated. No costly synchronous mergeVertices calls.
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial {...material}/></mesh>;
}
function CadMesh({ name, material }: {name: string; material: typeof frameMat}) {
  const type = useContext(MachineContext);
  const url = machineAssetPath(type, name);
  return MACHINE_ASSETS[type].format === 'stl'
    ? <StlCadMesh key={url} url={url} material={material}/>
    : <GlbCadMesh key={url} url={url} material={material}/>;
}
function StaticCadPart({ label, material }: { label: string; material: typeof frameMat }) {
  return <CadMesh name={'parts/' + label} material={material}/>;
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

const LINK_NAMES = ['base', 'x_carriage', 'y_carriage', 'z_carriage_left', 'z_carriage_right', 'nozzle_left', 'nozzle_right'];
const preloaded = new Set<MachineKind>();
function preloadMachine(type: MachineKind) {
  if (preloaded.has(type)) return;
  preloaded.add(type);
  for (const name of [...LINK_NAMES, ...[...BASE_STATIC_PARTS, ...Y_CARRIAGE_STATIC_PARTS, ...X_CARRIAGE_STATIC_PARTS].map(n=>'parts/'+n)]) {
    const url = machineAssetPath(type,name);
    if (MACHINE_ASSETS[type].format === 'stl') useLoader.preload(STLLoader,url);
    else useGLTF.preload(url);
  }
}

// Opulo's own real brand color (their feeder/gantry accent parts are this
// yellow in every official product photo) picked up on the carriages;
// the fixed frame stays a neutral aluminum-extrusion gray so the moving
// assemblies read clearly against it.
// Real measured value, not a guess: front-leg-extension's own real CAD
// bbox min Z is -100.81mm (parts/manifest.json) - the lowest point of
// any real part in this rig, i.e. where the legs' own feet actually are.
const GROUND_OFFSET_M = 0.10081;

const frameMat = { color: '#9aa1ab', roughness: 0.55, metalness: 0.35 };
const carriageMat = { color: '#c7cdd6', roughness: 0.45, metalness: 0.4 };
const nozzleMat = { color: '#eab308', roughness: 0.4, metalness: 0.3 };

export default function LumenPnPRig({ module, machineType = 'lumenPnP' }: { module: Partial<PnPModule>; machineType?: MachineKind }) {
  preloadMachine(machineType);
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
    // same as URArm.tsx's own root wrapper. CAD Z=0 is the machine's own
    // WORK surface (where openpnp's real 0-90mm Z-axis travel starts),
    // not its feet - the real legs added 2026-09-08 reach down to
    // Z=-100.81mm (front-leg-extension's own real bbox min, see
    // parts/manifest.json) to actually touch the floor. Without this
    // offset the rig's local Y=0 sits at the WORK surface, so those legs
    // rendered poking below this app's own shared ground plane (visible
    // real bug: "half the machine hidden below the floor" once the legs
    // existed to make it obvious) - GROUND_OFFSET_M lifts the whole rig
    // so the real lowest point (the legs' own feet) sits at Y=0 instead.
    <MachineContext.Provider value={machineType}>
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_OFFSET_M, 0]}>
      <CadMesh name="base" material={frameMat}/>
      {BASE_STATIC_PARTS.map((label) => (
        <StaticCadPart key={label} label={label} material={frameMat} />
      ))}

      <group position={[0, y, 0]}>
        <CadMesh name="y_carriage" material={carriageMat}/>
        {Y_CARRIAGE_STATIC_PARTS.map((label) => (
          <StaticCadPart key={label} label={label} material={carriageMat} />
        ))}

        <group position={[x, 0, 0]}>
          <CadMesh name="x_carriage" material={carriageMat}/>
          {X_CARRIAGE_STATIC_PARTS.map((label) => (
            <StaticCadPart key={label} label={label} material={carriageMat} />
          ))}

          <group position={[0, 0, z]}>
            <CadMesh name="z_carriage_left" material={carriageMat}/>
            {/* Only the nozzle barrel rotates - same joint origin as its
                z_carriage_left parent, matching joint_c_left's real
                "0 0 0" origin in lumenpnp_juanenpnp.urdf. */}
            <group rotation={[0, 0, rotA]}>
              <CadMesh name="nozzle_left" material={nozzleMat}/>
            </group>
          </group>

          <group position={[0, 0, z]}>
            <CadMesh name="z_carriage_right" material={carriageMat}/>
            <group rotation={[0, 0, rotB]}>
              <CadMesh name="nozzle_right" material={nozzleMat}/>
            </group>
          </group>
        </group>
      </group>
    </group>
    </MachineContext.Provider>
  );
}
