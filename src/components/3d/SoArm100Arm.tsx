// =============================================================================
// HYDRA-UMC STUDIO - React Component: SoArm100Arm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real SO-ARM100 geometry: loads the actual STL mesh for every link
// (public/models/so100/*.stl, see ATTRIBUTION.txt there - pulled from
// the official, Apache-2.0 github.com/TheRobotStudio/SO-ARM100 repo) and
// drives them through the REAL joint transform chain from that repo's
// own Simulation/SO100/so100.urdf:
//
//   shoulder_pan  (base->shoulder):     xyz=(0,-0.0452,0.0165) rpy=(1.57079,0,0)  axis=(0,1,0)
//   shoulder_lift (shoulder->upper_arm): xyz=(0,0.1025,0.0306)  rpy=(-1.8,0,0)     axis=(1,0,0)
//   elbow_flex    (upper_arm->lower_arm): xyz=(0,0.11257,0.028) rpy=(1.57079,0,0)  axis=(1,0,0)
//   wrist_flex    (lower_arm->wrist):    xyz=(0,0.0052,0.1349)  rpy=(-1,0,0)       axis=(1,0,0)
//   wrist_roll    (wrist->gripper):      xyz=(0,-0.0601,0)      rpy=(0,1.57079,0)  axis=(0,1,0)
//
// ONLY 5 real arm joints (not 6, unlike every other robot in this
// project) - see ATTRIBUTION.txt for why j6 (the source URDF's own
// gripper jaw joint) is left unused rather than repurposed.
// =============================================================================

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { RobotState } from '../../store';
import Toolhead, { toolheadMountOffset } from './Toolhead';

const MESH_BASE = '/models/so100/';

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

export const SOARM100_CHAIN: JointDef[] = [
  { pos: [0, -0.0452, 0.0165], rpy: [1.57079, 0, 0], axis: [0, 1, 0] },
  { pos: [0, 0.1025, 0.0306], rpy: [-1.8, 0, 0], axis: [1, 0, 0] },
  { pos: [0, 0.11257, 0.028], rpy: [1.57079, 0, 0], axis: [1, 0, 0] },
  { pos: [0, 0.0052, 0.1349], rpy: [-1, 0, 0], axis: [1, 0, 0] },
  { pos: [0, -0.0601, 0], rpy: [0, 1.57079, 0], axis: [0, 1, 0] },
];

export const SOARM100_ROOT_QUAT = (() => {
  const j1 = SOARM100_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
})();

export const SOARM100_BASE_OFFSET: [number, number, number] = [0, 0, 0];

function jointQuaternion(joint: JointDef, angleDeg: number): THREE.Quaternion {
  const reorient = new THREE.Quaternion().setFromEuler(new THREE.Euler(joint.rpy[0], joint.rpy[1], joint.rpy[2], 'ZYX'));
  const axisVec = new THREE.Vector3(...joint.axis).normalize();
  const spin = new THREE.Quaternion().setFromAxisAngle(axisVec, angleDeg * Math.PI / 180);
  return reorient.multiply(spin);
}

const bodyMat = { color: '#f4c430', roughness: 0.6, metalness: 0.1 };

export default function SoArm100Arm({ robot }: { robot: RobotState }) {
  const j1 = robot.joints.j1, j2 = robot.joints.j2, j3 = robot.joints.j3;
  const j4 = robot.joints.j4, j5 = robot.joints.j5;

  const q1 = useMemo(() => jointQuaternion(SOARM100_CHAIN[0], j1), [j1]);
  const q2 = useMemo(() => jointQuaternion(SOARM100_CHAIN[1], j2), [j2]);
  const q3 = useMemo(() => jointQuaternion(SOARM100_CHAIN[2], j3), [j3]);
  const q4 = useMemo(() => jointQuaternion(SOARM100_CHAIN[3], j4), [j4]);
  const q5 = useMemo(() => jointQuaternion(SOARM100_CHAIN[4], j5), [j5]);

  const baseGeo = useRealScaleSTL('Base.stl');
  const shoulderGeo = useRealScaleSTL('Rotation_Pitch.stl');
  const upperArmGeo = useRealScaleSTL('Upper_Arm.stl');
  const lowerArmGeo = useRealScaleSTL('Lower_Arm.stl');
  const wristGeo = useRealScaleSTL('Wrist_Pitch_Roll.stl');
  const gripperGeo = useRealScaleSTL('Fixed_Jaw.stl');

  return (
    <group position={SOARM100_BASE_OFFSET}>
    <group quaternion={SOARM100_ROOT_QUAT}>
      <mesh geometry={baseGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

      <group position={SOARM100_CHAIN[0].pos} quaternion={q1}>
        <mesh geometry={shoulderGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

        <group position={SOARM100_CHAIN[1].pos} quaternion={q2}>
          <mesh geometry={upperArmGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

          <group position={SOARM100_CHAIN[2].pos} quaternion={q3}>
            <mesh geometry={lowerArmGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

            <group position={SOARM100_CHAIN[3].pos} quaternion={q4}>
              <mesh geometry={wristGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

              <group position={SOARM100_CHAIN[4].pos} quaternion={q5}>
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
