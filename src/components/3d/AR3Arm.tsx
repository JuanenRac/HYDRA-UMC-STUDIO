// =============================================================================
// HYDRA-UMC STUDIO - React Component: AR3Arm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real AR3 geometry: loads the actual STL mesh for every link
// (public/models/ar3/*.STL, see ATTRIBUTION.txt there - pulled from the
// MIT-licensed github.com/gabrielggg/ar3_gui, whose own urdf/ folder hosts
// the AR3 Core project's URDF+meshes together) and drives them through the
// REAL joint transform chain from that repo's own urdf/ar3.urdf. Same
// overall approach as Parol6Arm.tsx/Faze4Arm.tsx - quaternion-based per
// joint (position + quaternion, not Euler triples) so it stays exact
// regardless of axis direction, even though every AR3 joint axis happens
// to already be cardinal (unlike Faze4's joint 4).
//
//   J1 (base_link->link_1): xyz=(0,0,0.003445)          rpy=(3.1416,0,0)              axis=(0,0,1)
//   J2 (link_1->link_2):    xyz=(0,0.064146,-0.16608)    rpy=(1.5708,0.5236,-1.5708)   axis=(0,0,-1)
//   J3 (link_2->link_3):    xyz=(0.1525,-0.26414,0)      rpy=(0,0,-1.4953816339)       axis=(0,0,-1)
//   J4 (link_3->link_4):    xyz=(0,0,0.00675)            rpy=(1.5708,-1.2554,-1.5708)  axis=(0,0,-1)
//   J5 (link_4->link_5):    xyz=(0,0,-0.22225)            rpy=(3.1416,0,-2.8262)        axis=(-1,0,0)
//   J6 (link_5->link_6):    xyz=(-0.000294,0,0.02117)     rpy=(0,0,3.1416)              axis=(0,0,1)
//
// Root correction: joint 1's own world-frame axis (after its rpy) works
// out to plain world -Z. Aligning that to three.js's +Y builds the whole
// chain BELOW y=0 (confirmed by computing every link's own bounding box
// after the correction - all 7 links, base_link through link_6, sat
// entirely at negative Y) - the robot rendered upside-down, base at the
// "top". Aligning to -Y instead (root rotates -90deg about X) builds
// every link at positive Y as expected. AR3_BASE_OFFSET additionally
// recenters base_link's own footprint (its bounding box isn't centered on
// its own local origin the way a hand-authored primitive would be) so the
// robot sits centered on the XY table platform instead of offset to one
// side - both verified against the real downloaded STL files' own
// geometry, not guessed.
// =============================================================================

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { RobotState } from '../../store';
import Toolhead from './Toolhead';

const MESH_BASE = '/models/ar3/';

function useRealScaleSTL(fileName: string): THREE.BufferGeometry {
  const raw = useLoader(STLLoader, MESH_BASE + fileName);
  return useMemo(() => {
    const geometry = raw.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const maxDim = box ? Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z) : 0;
    if (maxDim > 2) geometry.scale(0.001, 0.001, 0.001);
    return geometry;
  }, [raw]);
}

interface JointDef {
  pos: [number, number, number];
  rpy: [number, number, number];
  axis: [number, number, number];
}

export const AR3_CHAIN: JointDef[] = [
  { pos: [0, 0, 0.003445], rpy: [3.1416, 0, 0], axis: [0, 0, 1] },
  { pos: [0, 0.064146, -0.16608], rpy: [1.5708, 0.5236, -1.5708], axis: [0, 0, -1] },
  { pos: [0.1525, -0.26414, 0], rpy: [0, 0, -1.4953816339], axis: [0, 0, -1] },
  { pos: [0, 0, 0.00675], rpy: [1.5708, -1.2554, -1.5708], axis: [0, 0, -1] },
  { pos: [0, 0, -0.22225], rpy: [3.1416, 0, -2.8262], axis: [-1, 0, 0] },
  { pos: [-0.000294, 0, 0.02117], rpy: [0, 0, 3.1416], axis: [0, 0, 1] },
];

export const AR3_ROOT_QUAT = (() => {
  const j1 = AR3_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'XYZ');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, -1, 0));
})();

// base_link's own centering offset (X,Y,Z), applied AFTER the root rotation above -
// computed from base_link.STL's own real bounding box, see this file's header comment.
export const AR3_BASE_OFFSET: [number, number, number] = [0, 0, 0.0477];

function jointQuaternion(joint: JointDef, angleDeg: number): THREE.Quaternion {
  const reorient = new THREE.Quaternion().setFromEuler(new THREE.Euler(joint.rpy[0], joint.rpy[1], joint.rpy[2], 'XYZ'));
  const axisVec = new THREE.Vector3(...joint.axis).normalize();
  const spin = new THREE.Quaternion().setFromAxisAngle(axisVec, angleDeg * Math.PI / 180);
  return reorient.multiply(spin);
}

const bodyMat = { color: '#111214', roughness: 0.55, metalness: 0.2 };
const accentMat = { color: '#ea580c', roughness: 0.5, metalness: 0.1 };

export default function AR3Arm({ robot }: { robot: RobotState }) {
  const j1 = robot.joints.j1, j2 = robot.joints.j2, j3 = robot.joints.j3;
  const j4 = robot.joints.j4, j5 = robot.joints.j5, j6 = robot.joints.j6;

  const q1 = useMemo(() => jointQuaternion(AR3_CHAIN[0], j1), [j1]);
  const q2 = useMemo(() => jointQuaternion(AR3_CHAIN[1], j2), [j2]);
  const q3 = useMemo(() => jointQuaternion(AR3_CHAIN[2], j3), [j3]);
  const q4 = useMemo(() => jointQuaternion(AR3_CHAIN[3], j4), [j4]);
  const q5 = useMemo(() => jointQuaternion(AR3_CHAIN[4], j5), [j5]);
  const q6 = useMemo(() => jointQuaternion(AR3_CHAIN[5], j6), [j6]);

  const baseGeo = useRealScaleSTL('base_link.STL');
  const l1Geo = useRealScaleSTL('link_1.STL');
  const l2Geo = useRealScaleSTL('link_2.STL');
  const l3Geo = useRealScaleSTL('link_3.STL');
  const l4Geo = useRealScaleSTL('link_4.STL');
  const l5Geo = useRealScaleSTL('link_5.STL');
  const l6Geo = useRealScaleSTL('link_6.STL');

  return (
    <group position={AR3_BASE_OFFSET}>
    <group quaternion={AR3_ROOT_QUAT}>
      <mesh geometry={baseGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

      <group position={AR3_CHAIN[0].pos} quaternion={q1}>
        <mesh geometry={l1Geo} castShadow receiveShadow><meshStandardMaterial {...accentMat} /></mesh>

        <group position={AR3_CHAIN[1].pos} quaternion={q2}>
          <mesh geometry={l2Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

          <group position={AR3_CHAIN[2].pos} quaternion={q3}>
            <mesh geometry={l3Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

            <group position={AR3_CHAIN[3].pos} quaternion={q4}>
              <mesh geometry={l4Geo} castShadow receiveShadow><meshStandardMaterial {...accentMat} /></mesh>

              <group position={AR3_CHAIN[4].pos} quaternion={q5}>
                <mesh geometry={l5Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

                <group position={AR3_CHAIN[5].pos} quaternion={q6}>
                  <mesh geometry={l6Geo} castShadow receiveShadow><meshStandardMaterial {...accentMat} /></mesh>
                  <group position={[0, 0.02, 0]}>
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
  );
}
