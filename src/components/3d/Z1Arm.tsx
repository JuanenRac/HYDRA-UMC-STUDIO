// =============================================================================
// HYDRA-UMC STUDIO - React Component: Z1Arm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real Unitree Z1 geometry: loads the actual STL mesh for every link
// (public/models/z1/*.stl, see ATTRIBUTION.txt there - pulled from
// mujoco_menagerie's own unitree_z1 folder, BSD-3-Clause) and drives
// them through the REAL joint transform chain from that folder's own
// z1.xml MJCF:
//
//   joint1 (link00->link01): xyz=(0,0,0.0585)  axis=(0,0,1)
//   joint2 (link01->link02): xyz=(0,0,0.045)   axis=(0,1,0)
//   joint3 (link02->link03): xyz=(-0.35,0,0)   axis=(0,1,0)
//   joint4 (link03->link04): xyz=(0.218,0,0.057) axis=(0,1,0)
//   joint5 (link04->link05): xyz=(0.07,0,0)    axis=(0,0,1)
//   joint6 (link05->link06): xyz=(0.0492,0,0)  axis=(1,0,0)
//
// Every joint's own rpy is (0,0,0) - MJCF bodies here have no extra
// orientation beyond their own translation - so this uses the same
// quaternion-based approach as M710icArm.tsx.
// =============================================================================

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { RobotState } from '../../store';
import Toolhead, { toolheadMountOffset } from './Toolhead';

const MESH_BASE = '/models/z1/';

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

export const Z1_CHAIN: JointDef[] = [
  { pos: [0, 0, 0.0585], rpy: [0, 0, 0], axis: [0, 0, 1] },
  { pos: [0, 0, 0.045], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [-0.35, 0, 0], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [0.218, 0, 0.057], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [0.07, 0, 0], rpy: [0, 0, 0], axis: [0, 0, 1] },
  { pos: [0.0492, 0, 0], rpy: [0, 0, 0], axis: [1, 0, 0] },
];

export const Z1_ROOT_QUAT = (() => {
  const j1 = Z1_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
})();

export const Z1_BASE_OFFSET: [number, number, number] = [0, 0, 0];

function jointQuaternion(joint: JointDef, angleDeg: number): THREE.Quaternion {
  const reorient = new THREE.Quaternion().setFromEuler(new THREE.Euler(joint.rpy[0], joint.rpy[1], joint.rpy[2], 'ZYX'));
  const axisVec = new THREE.Vector3(...joint.axis).normalize();
  const spin = new THREE.Quaternion().setFromAxisAngle(axisVec, angleDeg * Math.PI / 180);
  return reorient.multiply(spin);
}

const bodyMat = { color: '#2b2f36', roughness: 0.45, metalness: 0.4 };

export default function Z1Arm({ robot }: { robot: RobotState }) {
  const j1 = robot.joints.j1, j2 = robot.joints.j2, j3 = robot.joints.j3;
  const j4 = robot.joints.j4, j5 = robot.joints.j5, j6 = robot.joints.j6;

  const q1 = useMemo(() => jointQuaternion(Z1_CHAIN[0], j1), [j1]);
  const q2 = useMemo(() => jointQuaternion(Z1_CHAIN[1], j2), [j2]);
  const q3 = useMemo(() => jointQuaternion(Z1_CHAIN[2], j3), [j3]);
  const q4 = useMemo(() => jointQuaternion(Z1_CHAIN[3], j4), [j4]);
  const q5 = useMemo(() => jointQuaternion(Z1_CHAIN[4], j5), [j5]);
  const q6 = useMemo(() => jointQuaternion(Z1_CHAIN[5], j6), [j6]);

  const link00Geo = useRealScaleSTL('z1_Link00.stl');
  const link01Geo = useRealScaleSTL('z1_Link01.stl');
  const link02Geo = useRealScaleSTL('z1_Link02.stl');
  const link03Geo = useRealScaleSTL('z1_Link03.stl');
  const link04Geo = useRealScaleSTL('z1_Link04.stl');
  const link05Geo = useRealScaleSTL('z1_Link05.stl');
  const link06Geo = useRealScaleSTL('z1_Link06.stl');

  return (
    <group position={Z1_BASE_OFFSET}>
    <group quaternion={Z1_ROOT_QUAT}>
      <mesh geometry={link00Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

      <group position={Z1_CHAIN[0].pos} quaternion={q1}>
        <mesh geometry={link01Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

        <group position={Z1_CHAIN[1].pos} quaternion={q2}>
          <mesh geometry={link02Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

          <group position={Z1_CHAIN[2].pos} quaternion={q3}>
            <mesh geometry={link03Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

            <group position={Z1_CHAIN[3].pos} quaternion={q4}>
              <mesh geometry={link04Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

              <group position={Z1_CHAIN[4].pos} quaternion={q5}>
                <mesh geometry={link05Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

                <group position={Z1_CHAIN[5].pos} quaternion={q6}>
                  <mesh geometry={link06Geo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>
                  <group position={toolheadMountOffset(link06Geo)}>
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
