// =============================================================================
// HYDRA-UMC STUDIO - React Component: M710icArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real FANUC M-710iC geometry: loads the actual STL mesh for every link
// (public/models/m710ic/*.stl, see ATTRIBUTION.txt there - pulled from
// the official, BSD-3-Clause github.com/robot-descriptions/
// fanuc_m710ic_description repo) and drives them through the REAL joint
// transform chain from that repo's own urdf/m710ic70.urdf:
//
//   joint_1 (base_link->link_1): xyz=(0,0,0.565)   axis=(0,0,1)
//   joint_2 (link_1->link_2):    xyz=(0.150,0,0)   axis=(0,1,0)
//   joint_3 (link_2->link_3):    xyz=(0,0,0.870)   axis=(0,-1,0)
//   joint_4 (link_3->link_4):    xyz=(0,0,0.170)   axis=(-1,0,0)
//   joint_5 (link_4->link_5):    xyz=(1.016,0,0)   axis=(0,-1,0)
//   joint_6 (link_5->link_6):    xyz=(0.175,0,0)   axis=(-1,0,0)
//
// Every <origin rpy> in the source URDF is (0,0,0) - pure translation
// between joints - but the per-joint axis still varies (not always Z),
// so this uses the same quaternion-based approach as Faze4Arm.tsx/
// EdoArm.tsx rather than the UR family's fixed-Z-axis engine.
// =============================================================================

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { RobotState } from '../../store';
import Toolhead, { toolheadMountOffset } from './Toolhead';

const MESH_BASE = '/models/m710ic/';

function useRealScaleSTL(fileName: string): THREE.BufferGeometry {
  const raw = useLoader(STLLoader, MESH_BASE + fileName);
  return useMemo(() => {
    const geometry = raw.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const maxDim = box ? Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z) : 0;
    if (maxDim > 5) geometry.scale(0.001, 0.001, 0.001);
    return geometry;
  }, [raw]);
}

interface JointDef {
  pos: [number, number, number];
  rpy: [number, number, number];
  axis: [number, number, number];
}

export const M710IC_CHAIN: JointDef[] = [
  { pos: [0, 0, 0.565], rpy: [0, 0, 0], axis: [0, 0, 1] },
  { pos: [0.150, 0, 0], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [0, 0, 0.870], rpy: [0, 0, 0], axis: [0, -1, 0] },
  { pos: [0, 0, 0.170], rpy: [0, 0, 0], axis: [-1, 0, 0] },
  { pos: [1.016, 0, 0], rpy: [0, 0, 0], axis: [0, -1, 0] },
  { pos: [0.175, 0, 0], rpy: [0, 0, 0], axis: [-1, 0, 0] },
];

export const M710IC_ROOT_QUAT = (() => {
  const j1 = M710IC_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
})();

export const M710IC_BASE_OFFSET: [number, number, number] = [0, 0, 0];

function jointQuaternion(joint: JointDef, angleDeg: number): THREE.Quaternion {
  const reorient = new THREE.Quaternion().setFromEuler(new THREE.Euler(joint.rpy[0], joint.rpy[1], joint.rpy[2], 'ZYX'));
  const axisVec = new THREE.Vector3(...joint.axis).normalize();
  const spin = new THREE.Quaternion().setFromAxisAngle(axisVec, angleDeg * Math.PI / 180);
  return reorient.multiply(spin);
}

const bodyMat = { color: '#f2c400', roughness: 0.4, metalness: 0.3 };

export default function M710icArm({ robot }: { robot: RobotState }) {
  const j1 = robot.joints.j1, j2 = robot.joints.j2, j3 = robot.joints.j3;
  const j4 = robot.joints.j4, j5 = robot.joints.j5, j6 = robot.joints.j6;

  const q1 = useMemo(() => jointQuaternion(M710IC_CHAIN[0], j1), [j1]);
  const q2 = useMemo(() => jointQuaternion(M710IC_CHAIN[1], j2), [j2]);
  const q3 = useMemo(() => jointQuaternion(M710IC_CHAIN[2], j3), [j3]);
  const q4 = useMemo(() => jointQuaternion(M710IC_CHAIN[3], j4), [j4]);
  const q5 = useMemo(() => jointQuaternion(M710IC_CHAIN[4], j5), [j5]);
  const q6 = useMemo(() => jointQuaternion(M710IC_CHAIN[5], j6), [j6]);

  const baseLinkGeo = useRealScaleSTL('base_link.stl');
  const link1Geo = useRealScaleSTL('link_1.stl');
  const link2Geo = useRealScaleSTL('link_2.stl');
  const link3Geo = useRealScaleSTL('link_3.stl');
  const link4Geo = useRealScaleSTL('link_4.stl');
  const link5Geo = useRealScaleSTL('link_5.stl');
  const link6Geo = useRealScaleSTL('link_6.stl');

  return (
    <group position={M710IC_BASE_OFFSET}>
    <group quaternion={M710IC_ROOT_QUAT}>
      <mesh geometry={baseLinkGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

      <group position={M710IC_CHAIN[0].pos} quaternion={q1}>
        <mesh geometry={link1Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

        <group position={M710IC_CHAIN[1].pos} quaternion={q2}>
          <mesh geometry={link2Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

          <group position={M710IC_CHAIN[2].pos} quaternion={q3}>
            <mesh geometry={link3Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

            <group position={M710IC_CHAIN[3].pos} quaternion={q4}>
              <mesh geometry={link4Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

              <group position={M710IC_CHAIN[4].pos} quaternion={q5}>
                <mesh geometry={link5Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

                <group position={M710IC_CHAIN[5].pos} quaternion={q6}>
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
