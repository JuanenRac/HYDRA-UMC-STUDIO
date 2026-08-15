// =============================================================================
// HYDRA-UMC STUDIO - React Component: Wx250sArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real WidowX 250 geometry - same structure as Vx300sArm.tsx (see that
// file's own header for the full explanation of the per-link mesh-offset
// nesting), just Trossen's smaller sibling product with its own link
// lengths:
//
//   waist         xyz=(0,0,0.072)     axis=(0,0,1)
//   shoulder      xyz=(0,0,0.03865)   axis=(0,1,0)
//   elbow         xyz=(0.04975,0,0.25) axis=(0,1,0)
//   forearm_roll  xyz=(0.175,0,0)     axis=(1,0,0)
//   wrist_angle   xyz=(0.075,0,0)     axis=(0,1,0)
//   wrist_rotate  xyz=(0.065,0,0)     axis=(1,0,0)
// =============================================================================

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { RobotState } from '../../store';
import Toolhead, { toolheadMountOffset } from './Toolhead';

const MESH_BASE = '/models/wx250s/';

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
interface MeshOffset {
  pos: [number, number, number];
  rpy: [number, number, number];
}

export const WX250S_CHAIN: JointDef[] = [
  { pos: [0, 0, 0.072], rpy: [0, 0, 0], axis: [0, 0, 1] },
  { pos: [0, 0, 0.03865], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [0.04975, 0, 0.25], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [0.175, 0, 0], rpy: [0, 0, 0], axis: [1, 0, 0] },
  { pos: [0.075, 0, 0], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [0.065, 0, 0], rpy: [0, 0, 0], axis: [1, 0, 0] },
];

// Same mesh-offset pattern as ViperX 300 - shared rig design.
export const WX250S_MESH_OFFSETS: MeshOffset[] = [
  { pos: [0, 0, 0], rpy: [0, 0, Math.PI / 2] },
  { pos: [0, 0, -0.003], rpy: [0, 0, Math.PI / 2] },
  { pos: [0, 0, 0], rpy: [0, 0, Math.PI / 2] },
  { pos: [0, 0, 0], rpy: [0, 0, 0] },
  { pos: [0, 0, 0], rpy: [Math.PI, 0, 0] },
  { pos: [0, 0, 0], rpy: [0, 0, Math.PI / 2] },
  { pos: [-0.02, 0, 0], rpy: [0, 0, Math.PI / 2] },
];

export const WX250S_ROOT_QUAT = (() => {
  const j1 = WX250S_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
})();

export const WX250S_BASE_OFFSET: [number, number, number] = [0, 0, 0];

function jointQuaternion(joint: JointDef, angleDeg: number): THREE.Quaternion {
  const reorient = new THREE.Quaternion().setFromEuler(new THREE.Euler(joint.rpy[0], joint.rpy[1], joint.rpy[2], 'ZYX'));
  const axisVec = new THREE.Vector3(...joint.axis).normalize();
  const spin = new THREE.Quaternion().setFromAxisAngle(axisVec, angleDeg * Math.PI / 180);
  return reorient.multiply(spin);
}

const bodyMat = { color: '#1a1a1a', roughness: 0.5, metalness: 0.2 };

export default function Wx250sArm({ robot }: { robot: RobotState }) {
  const j1 = robot.joints.j1, j2 = robot.joints.j2, j3 = robot.joints.j3;
  const j4 = robot.joints.j4, j5 = robot.joints.j5, j6 = robot.joints.j6;

  const q1 = useMemo(() => jointQuaternion(WX250S_CHAIN[0], j1), [j1]);
  const q2 = useMemo(() => jointQuaternion(WX250S_CHAIN[1], j2), [j2]);
  const q3 = useMemo(() => jointQuaternion(WX250S_CHAIN[2], j3), [j3]);
  const q4 = useMemo(() => jointQuaternion(WX250S_CHAIN[3], j4), [j4]);
  const q5 = useMemo(() => jointQuaternion(WX250S_CHAIN[4], j5), [j5]);
  const q6 = useMemo(() => jointQuaternion(WX250S_CHAIN[5], j6), [j6]);

  const baseGeo = useRealScaleSTL('wx250s_1_base.stl');
  const shoulderGeo = useRealScaleSTL('wx250s_2_shoulder.stl');
  const upperArmGeo = useRealScaleSTL('wx250s_3_upper_arm.stl');
  const upperForearmGeo = useRealScaleSTL('wx250s_4_upper_forearm.stl');
  const lowerForearmGeo = useRealScaleSTL('wx250s_5_lower_forearm.stl');
  const wristGeo = useRealScaleSTL('wx250s_6_wrist.stl');
  const gripperGeo = useRealScaleSTL('wx250s_7_gripper.stl');

  const off = WX250S_MESH_OFFSETS;

  return (
    <group position={WX250S_BASE_OFFSET}>
    <group quaternion={WX250S_ROOT_QUAT}>
      <group position={off[0].pos} rotation={off[0].rpy}>
        <mesh geometry={baseGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>
      </group>

      <group position={WX250S_CHAIN[0].pos} quaternion={q1}>
        <group position={off[1].pos} rotation={off[1].rpy}>
          <mesh geometry={shoulderGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>
        </group>

        <group position={WX250S_CHAIN[1].pos} quaternion={q2}>
          <group position={off[2].pos} rotation={off[2].rpy}>
            <mesh geometry={upperArmGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>
          </group>

          <group position={WX250S_CHAIN[2].pos} quaternion={q3}>
            <group position={off[3].pos} rotation={off[3].rpy}>
              <mesh geometry={upperForearmGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>
            </group>

            <group position={WX250S_CHAIN[3].pos} quaternion={q4}>
              <group position={off[4].pos} rotation={off[4].rpy}>
                <mesh geometry={lowerForearmGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>
              </group>

              <group position={WX250S_CHAIN[4].pos} quaternion={q5}>
                <group position={off[5].pos} rotation={off[5].rpy}>
                  <mesh geometry={wristGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>
                </group>

                <group position={WX250S_CHAIN[5].pos} quaternion={q6}>
                  <group position={off[6].pos} rotation={off[6].rpy}>
                    <mesh geometry={gripperGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>
                  </group>
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
    </group>
  );
}
