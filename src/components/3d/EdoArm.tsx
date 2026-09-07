// =============================================================================
// HYDRA-UMC STUDIO - React Component: EdoArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real e.DO geometry: loads the actual STL mesh for every link
// (public/models/edo/*.STL, see ATTRIBUTION.txt there - pulled from the
// official, BSD-3-Clause github.com/ianathompson/eDO_description repo,
// Comau S.p.A) and drives them through the REAL joint transform chain
// from that repo's own robots/edo_sim.urdf. Same overall approach as
// Faze4Arm.tsx (position + quaternion per joint, not Euler triples) since
// e.DO's own <axis> is genuinely arbitrary per joint too:
//
//   joint_1 (base_link->link_1): xyz=(0.057188,0.0059831,0.13343) rpy=(1.5708,~0,-3.1416) axis=(0,1,0)
//   joint_2 (link_1->link_2):    xyz=(0,0.18967,0)                 rpy=(0.94237,-0.4634,-0.11653) axis=(-0.88847,0.2908,0.35504)
//   joint_3 (link_2->link_3):    xyz=(-0.024558,0.12737,-0.16578)  rpy=(0.97336,-0.36296,2.8253)   axis=(1,0,0)
//   joint_4 (link_3->link_4):    xyz=(0.0088,-0.1588,0)            rpy=(-1.5708,0,0)               axis=(0,0,-1)
//   joint_5 (link_4->link_5):    xyz=(0,0,-0.1053)                 rpy=(3.1416,~0,3.1416)          axis=(-1,0,0)
//   joint_6 (link_5->link_6):    xyz=(-0.0039,0,0.1636)            rpy=(-1.5708,~0,0)               axis=(0,-1,0)
//
// Root correction: computed once (align joint_1's own world-frame axis
// onto three.js Y-up), same EDO_ROOT_QUAT pattern as FAZE4_ROOT_QUAT - see
// that file's own header for the general approach. base_link's own STL
// origin is (0,0,0) in the source URDF (unlike Parol6/Faze4's own
// off-center meshes), so EDO_BASE_OFFSET is (0,0,0) - no hand-tuned
// recentering constant needed here.
// =============================================================================

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { RobotState } from '../../store';
import Toolhead, { toolheadMountOffset } from './Toolhead';

const MESH_BASE = '/models/edo/';

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

export const EDO_CHAIN: JointDef[] = [
  { pos: [0.057188, 0.0059831, 0.13343], rpy: [1.5708, 6.9389e-16, -3.1416], axis: [0, 1, 0] },
  { pos: [0, 0.18967, 0], rpy: [0.94237, -0.4634, -0.11653], axis: [-0.88847, 0.2908, 0.35504] },
  { pos: [-0.024558, 0.12737, -0.16578], rpy: [0.97336, -0.36296, 2.8253], axis: [1, 0, 0] },
  { pos: [0.0088, -0.1588, 0], rpy: [-1.5708, 0, 0], axis: [0, 0, -1] },
  { pos: [0, 0, -0.1053], rpy: [3.1416, 1.1102e-14, 3.1416], axis: [-1, 0, 0] },
  { pos: [-0.0039, 0, 0.1636], rpy: [-1.5708, 1.249e-14, 0], axis: [0, -1, 0] },
];

export const EDO_ROOT_QUAT = (() => {
  const j1 = EDO_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
})();

export const EDO_BASE_OFFSET: [number, number, number] = [0, 0, 0];

function jointQuaternion(joint: JointDef, angleDeg: number): THREE.Quaternion {
  const reorient = new THREE.Quaternion().setFromEuler(new THREE.Euler(joint.rpy[0], joint.rpy[1], joint.rpy[2], 'ZYX'));
  const axisVec = new THREE.Vector3(...joint.axis).normalize();
  const spin = new THREE.Quaternion().setFromAxisAngle(axisVec, angleDeg * Math.PI / 180);
  return reorient.multiply(spin);
}

const bodyMat = { color: '#e8ebee', roughness: 0.4, metalness: 0.35 };

export default function EdoArm({ robot }: { robot: RobotState }) {
  const j1 = robot.joints.j1, j2 = robot.joints.j2, j3 = robot.joints.j3;
  const j4 = robot.joints.j4, j5 = robot.joints.j5, j6 = robot.joints.j6;

  const q1 = useMemo(() => jointQuaternion(EDO_CHAIN[0], j1), [j1]);
  const q2 = useMemo(() => jointQuaternion(EDO_CHAIN[1], j2), [j2]);
  const q3 = useMemo(() => jointQuaternion(EDO_CHAIN[2], j3), [j3]);
  const q4 = useMemo(() => jointQuaternion(EDO_CHAIN[3], j4), [j4]);
  const q5 = useMemo(() => jointQuaternion(EDO_CHAIN[4], j5), [j5]);
  const q6 = useMemo(() => jointQuaternion(EDO_CHAIN[5], j6), [j6]);

  const baseLinkGeo = useRealScaleSTL('base_link.STL');
  const link1Geo = useRealScaleSTL('link_1.STL');
  const link2Geo = useRealScaleSTL('link_2.STL');
  const link3Geo = useRealScaleSTL('link_3.STL');
  const link4Geo = useRealScaleSTL('link_4.STL');
  const link5Geo = useRealScaleSTL('link_5.STL');
  const link6Geo = useRealScaleSTL('link_6.STL');

  return (
    <group position={EDO_BASE_OFFSET}>
    <group quaternion={EDO_ROOT_QUAT}>
      <mesh geometry={baseLinkGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

      <group position={EDO_CHAIN[0].pos} quaternion={q1}>
        <mesh geometry={link1Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

        <group position={EDO_CHAIN[1].pos} quaternion={q2}>
          <mesh geometry={link2Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

          <group position={EDO_CHAIN[2].pos} quaternion={q3}>
            <mesh geometry={link3Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

            <group position={EDO_CHAIN[3].pos} quaternion={q4}>
              <mesh geometry={link4Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

              <group position={EDO_CHAIN[4].pos} quaternion={q5}>
                <mesh geometry={link5Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

                <group position={EDO_CHAIN[5].pos} quaternion={q6}>
                  <mesh geometry={link6Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>
                  <group position={toolheadMountOffset(link6Geo)}>
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
