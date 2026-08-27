// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: Parol6Arm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real PAROL6 geometry, not a stylized placeholder: loads the actual STL
// mesh for every link (public/models/parol6/*.STL, see ATTRIBUTION.txt
// there - pulled from the official, GPLv3-licensed
// github.com/Source-Robotics/PAROL6-Desktop-robot-arm design repo, NOT the
// unlicensed community GUI repo that was originally linked) and drives them
// through the REAL joint transform chain from that repo's own
// PAROL6_URDF/PAROL6/urdf/PAROL6.urdf - every <origin xyz rpy> and
// <axis xyz> below is copied from that file, not approximated:
//   J1 (base_link->L1): xyz=(0,0,0)                    rpy=(0,0,0)                          axis=(0,0,1)
//   J2 (L1->L2):        xyz=(0.0234207210610375,0,0.1105) rpy=(-1.5707963267949,0,0)         axis=(0,0,1)
//   J3 (L2->L3):        xyz=(0,-0.18,0)                 rpy=(3.1416,0,-1.5708)               axis=(0,0,-1)
//   J4 (L3->L4):        xyz=(0.0435,0,0)                rpy=(1.5707963267949,0,3.14159265358979) axis=(0,0,-1)
//   J5 (L4->L5):        xyz=(0,0,-0.17635)               rpy=(-1.5708,0,0)                    axis=(0,0,-1)
//   J6 (L5->L6):        xyz=(0,0,0)                     rpy=(1.5708,0,0)                     axis=(0,0,-1)
// This is a genuinely different, more faithful approach than every other
// *Arm.tsx in this folder (which all share one simplified j2/j3/j5-pitch-
// on-Z, j4/j6-roll-on-Y convention so they stay compatible with the app's
// own shared trajectory formula) - here, `robot.joints.jN` (degrees) drives
// a rotation about each joint's OWN local Z axis (URDF convention: every
// PAROL6 joint already rotates about Z once its own frame is reoriented by
// its <origin rpy>), which is what makes THIS robot actually move the way
// the real PAROL6 does when jogged.
//
// ROS is Z-up; three.js is Y-up. The whole chain above is left exactly as
// authored and wrapped in a single root rotation (-90 deg about X) to
// convert once, rather than fighting the axis convention at every joint.
// PAROL6_BASE_OFFSET (outside that root rotation) additionally recenters
// base_link's own footprint - like every other *Arm.tsx in this folder,
// the raw STL isn't centered on its own local origin, so without it the
// whole rig sat offset from the XY table's own center instead of on it.
// This entire chain (order, origin xyz/rpy, axis, and J3/J4's real
// [-114.59,74.48]/[-114.59,114.59] deg limits) was re-verified joint by
// joint against the upstream PAROL6.urdf directly, byte for byte - no
// swap or sign mismatch found there, so if J3/J4 still look wrong after
// this centering fix it isn't a data transcription bug.
//
// Known, larger version of the trade-off already accepted for the other
// robots' link-length differences (see mejoras_futuras.txt): the shared
// 2-link trajectory kinematics in examples/utils.ts / RobotDetail.tsx /
// PathVisualizer.tsx has no idea this robot's joints don't map onto a
// simple planar 2-link model the way the other rigs' simplified
// convention does. Manual jogging (the sliders in RobotDetail.tsx) moves
// this rig correctly and realistically; a RECORDED/PLAYED trajectory
// (computed by that shared formula) will not drive this specific arm
// along the Cartesian path it was actually computed for. Fixing that
// requires parameterizing the shared formula per robot and is currently out of scope.
// =============================================================================

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { RobotState } from '../../store';
import Toolhead, { toolheadMountOffset } from './Toolhead';

const MESH_BASE = '/models/parol6/';

// ROS URDF <origin rpy="r p y"/> composes as R = Rz(yaw)*Ry(pitch)*Rx(roll) - that's
// three.js's intrinsic 'ZYX' Euler order, NOT the default 'XYZ' a plain rotation={[r,p,y]}
// array uses. For a single-axis rpy (J1/J2/J5/J6 below) the other two factors are identity
// regardless of order, so it made no visible difference there - but J3 and J4 are the only
// two joints in this chain with a genuinely 2-axis rpy, and 'XYZ' vs 'ZYX' produce completely
// different matrices for those (verified numerically, maxDiff=2 i.e. not even close), which
// is what actually made L3/L4 render rotated ~180 degrees from where they belong - not a data
// transcription or sign bug, an Euler composition order bug.
function rosEuler(roll: number, pitch: number, yaw: number): THREE.Euler {
  return new THREE.Euler(roll, pitch, yaw, 'ZYX');
}

// STL files are commonly authored in millimeters with no <mesh scale="..."/>
// in the URDF to say so (a common, easy-to-miss authoring gap) - rather than
// assume, each loaded geometry is checked against its own bounding box once
// and scaled down 1000x only if it's clearly not already meter-scale for a
// robot whose real links are all well under half a metre.
function useRealScaleSTL(fileName: string): THREE.BufferGeometry {
  const raw = useLoader(STLLoader, MESH_BASE + fileName);
  return useMemo(() => {
    const geometry = raw.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const maxDim = box ? Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z) : 0;
    if (maxDim > 2) {
      geometry.scale(0.001, 0.001, 0.001);
    }
    return geometry;
  }, [raw]);
}

const bodyMat = { color: '#c7ccd3', roughness: 0.5, metalness: 0.35 };

// base_link's own centering offset (X,Y,Z), applied in the ROOT-ROTATED frame (i.e. outside the
// root group below) - computed from base_link.STL's own real bounding box: like every other
// *Arm.tsx in this folder, the raw mesh isn't centered on its own local origin, so without this
// the whole rig sits offset from the table's own XY center instead of on it.
const PAROL6_BASE_OFFSET: [number, number, number] = [0.0637, 0, -0.0035];

/**
 * Executes the parol6 arm logic - real mesh geometry, real URDF-driven FK chain.
 */
export default function Parol6Arm({ robot }: { robot: RobotState }) {
  const j1 = robot.joints.j1 * Math.PI / 180;
  const j2 = robot.joints.j2 * Math.PI / 180;
  const j3 = robot.joints.j3 * Math.PI / 180;
  const j4 = robot.joints.j4 * Math.PI / 180;
  const j5 = robot.joints.j5 * Math.PI / 180;
  const j6 = robot.joints.j6 * Math.PI / 180;

  const baseLinkGeo = useRealScaleSTL('base_link.STL');
  const l1Geo = useRealScaleSTL('L1.STL');
  const l2Geo = useRealScaleSTL('L2.STL');
  const l3Geo = useRealScaleSTL('L3.STL');
  const l4Geo = useRealScaleSTL('L4.STL');
  const l5Geo = useRealScaleSTL('L5.STL');
  const l6Geo = useRealScaleSTL('L6.STL');

  return (
    <group position={PAROL6_BASE_OFFSET}>
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={baseLinkGeo} castShadow receiveShadow>
        <meshStandardMaterial {...bodyMat} />
      </mesh>

      {/* Joint L1: base_link -> L1, axis (0,0,1) */}
      <group position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <group rotation={[0, 0, j1]}>
          <mesh geometry={l1Geo} castShadow receiveShadow>
            <meshStandardMaterial {...bodyMat} />
          </mesh>

          {/* Joint L2: L1 -> L2, axis (0,0,1) */}
          <group position={[0.0234207210610375, 0, 0.1105]} rotation={[-1.5707963267949, 0, 0]}>
            <group rotation={[0, 0, j2]}>
              <mesh geometry={l2Geo} castShadow receiveShadow>
                <meshStandardMaterial {...bodyMat} />
              </mesh>

              {/* Joint L3: L2 -> L3, axis (0,0,-1) */}
              <group position={[0, -0.18, 0]} rotation={rosEuler(3.1416, 0, -1.5708)}>
                <group rotation={[0, 0, -j3]}>
                  <mesh geometry={l3Geo} castShadow receiveShadow>
                    <meshStandardMaterial {...bodyMat} />
                  </mesh>

                  {/* Joint L4: L3 -> L4, axis (0,0,-1) */}
                  <group position={[0.0435, 0, 0]} rotation={rosEuler(1.5707963267949, 0, 3.14159265358979)}>
                    <group rotation={[0, 0, -j4]}>
                      <mesh geometry={l4Geo} castShadow receiveShadow>
                        <meshStandardMaterial {...bodyMat} />
                      </mesh>

                      {/* Joint L5: L4 -> L5, axis (0,0,-1) */}
                      <group position={[0, 0, -0.17635]} rotation={[-1.5708, 0, 0]}>
                        <group rotation={[0, 0, -j5]}>
                          <mesh geometry={l5Geo} castShadow receiveShadow>
                            <meshStandardMaterial {...bodyMat} />
                          </mesh>

                          {/* Joint L6: L5 -> L6, axis (0,0,-1) */}
                          <group position={[0, 0, 0]} rotation={[1.5708, 0, 0]}>
                            <group rotation={[0, 0, -j6]}>
                              <mesh geometry={l6Geo} castShadow receiveShadow>
                                <meshStandardMaterial {...bodyMat} />
                              </mesh>
                              <group position={toolheadMountOffset(l6Geo)}>
                                <Toolhead tool={robot.tool} />
                              </group>
                            </group>
                          </group>
                        </group>
                      </group>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
    </group>
  );
}
