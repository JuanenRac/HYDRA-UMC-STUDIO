// =============================================================================
// HYDRA-UMC STUDIO - React Component: KochArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real Koch v1.1 geometry: loads the actual STL mesh for every link
// (public/models/koch/*.stl, see ATTRIBUTION.txt there - pulled from
// mujoco_menagerie's own low_cost_robot_arm folder, Apache-2.0 - covers
// BOTH "Koch v1.1" and "Low-Cost Robot Arm", the same real design) and
// drives them through the REAL joint transform chain from that folder's
// own low_cost_robot_arm.xml MJCF:
//
//   base_rotation (base_link->shoulder_rotation):        xyz=(0.012,0,0.0409)      axis=(0,0,-1)
//   pitch (shoulder_rotation->shoulder_to_elbow):         xyz=(0,-0.0209,0.0154)    axis=(0,1,0)
//   elbow (shoulder_to_elbow->elbow_to_wrist_extension):  xyz=(-0.0148,0.0065,0.1083) axis=(0,-1,0)
//   wrist_pitch (elbow_to_wrist_extension->elbow_to_wrist): xyz=(-0.10048,5e-05,0.0027) axis=(0,1,0)
//   wrist_roll (elbow_to_wrist->gripper_static_finger):   xyz=(-0.045,0.013097,0)   axis=(1,0,0)
//
// ONLY 5 real arm joints (not 6) - see ATTRIBUTION.txt for why j6 (the
// source MJCF's own gripper jaw joint) is left unused rather than
// repurposed, same situation as SoArm100Arm.tsx.
// =============================================================================

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { RobotState } from '../../store';
import Toolhead, { toolheadMountOffset } from './Toolhead';

const MESH_BASE = '/models/koch/';

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

export const KOCH_CHAIN: JointDef[] = [
  { pos: [0.012, 0, 0.0409], rpy: [0, 0, 0], axis: [0, 0, -1] },
  { pos: [0, -0.0209, 0.0154], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [-0.0148, 0.0065, 0.1083], rpy: [0, 0, 0], axis: [0, -1, 0] },
  { pos: [-0.10048, 5e-05, 0.0026999], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [-0.045, 0.013097, 0], rpy: [0, 0, 0], axis: [1, 0, 0] },
];

export const KOCH_ROOT_QUAT = (() => {
  const j1 = KOCH_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
})();

export const KOCH_BASE_OFFSET: [number, number, number] = [0, 0, 0];

function jointQuaternion(joint: JointDef, angleDeg: number): THREE.Quaternion {
  const reorient = new THREE.Quaternion().setFromEuler(new THREE.Euler(joint.rpy[0], joint.rpy[1], joint.rpy[2], 'ZYX'));
  const axisVec = new THREE.Vector3(...joint.axis).normalize();
  const spin = new THREE.Quaternion().setFromAxisAngle(axisVec, angleDeg * Math.PI / 180);
  return reorient.multiply(spin);
}

const bodyMat = { color: '#e5e5e5', roughness: 0.5, metalness: 0.15 };

export default function KochArm({ robot }: { robot: RobotState }) {
  const j1 = robot.joints.j1, j2 = robot.joints.j2, j3 = robot.joints.j3;
  const j4 = robot.joints.j4, j5 = robot.joints.j5;

  const q1 = useMemo(() => jointQuaternion(KOCH_CHAIN[0], j1), [j1]);
  const q2 = useMemo(() => jointQuaternion(KOCH_CHAIN[1], j2), [j2]);
  const q3 = useMemo(() => jointQuaternion(KOCH_CHAIN[2], j3), [j3]);
  const q4 = useMemo(() => jointQuaternion(KOCH_CHAIN[3], j4), [j4]);
  const q5 = useMemo(() => jointQuaternion(KOCH_CHAIN[4], j5), [j5]);

  const baseGeo = useRealScaleSTL('base_link.stl');
  const shoulderGeo = useRealScaleSTL('shoulder_rotation.stl');
  const upperGeo = useRealScaleSTL('shoulder_to_elbow.stl');
  const forearmGeo = useRealScaleSTL('elbow_to_wrist_extension.stl');
  const wristGeo = useRealScaleSTL('elbow_to_wrist.stl');
  const gripperGeo = useRealScaleSTL('gripper_static_finger.stl');

  return (
    <group position={KOCH_BASE_OFFSET}>
    <group quaternion={KOCH_ROOT_QUAT}>
      <mesh geometry={baseGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

      <group position={KOCH_CHAIN[0].pos} quaternion={q1}>
        <mesh geometry={shoulderGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

        <group position={KOCH_CHAIN[1].pos} quaternion={q2}>
          <mesh geometry={upperGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

          <group position={KOCH_CHAIN[2].pos} quaternion={q3}>
            <mesh geometry={forearmGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

            <group position={KOCH_CHAIN[3].pos} quaternion={q4}>
              <mesh geometry={wristGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

              <group position={KOCH_CHAIN[4].pos} quaternion={q5}>
                <mesh geometry={gripperGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>
                <group position={toolheadMountOffset(gripperGeo)}>
                  <Toolhead tool={robot.tool} />
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
