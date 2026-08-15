// =============================================================================
// HYDRA-UMC STUDIO - React Component: Faze4Arm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real Faze4 geometry: loads the actual STL mesh for every link
// (public/models/faze4/*.STL, see ATTRIBUTION.txt there - pulled from the
// official, MIT-licensed github.com/Source-Robotics/Faze4-Robotic-arm
// design repo) and drives them through the REAL joint transform chain from
// that repo's own URDF_FAZE4/urdf/Final_light_assembly_URDF.urdf. Same
// overall approach as Parol6Arm.tsx, with one real difference: this URDF is
// a raw CAD-assembly export (Croatian link names: rotary_base, nadlaktica=
// upper arm, lakat=elbow, podlaktica=forearm, saka=wrist, hvataljka=
// gripper) with joint origins in arbitrary assembly frames rather than
// PAROL6's hand-tuned cardinal-axis ones - joint 4 (podlaktica) even
// rotates about a non-cardinal axis (0.14804, 0.90477, 0.39934), so every
// joint here uses a quaternion (position + quaternion, not rotation
// Euler-triples) to stay exact regardless of axis direction.
//
//   J1 (base_link->rotary_base): xyz=(0.075629,-0.21266,0.050734) rpy=(-1.5708,0,-1.5708) axis=(0,-1,0)
//   J2 (rotary_base->nadlaktica): xyz=(0,-0.20182,0)               rpy=(0,0,-1.8111)       axis=(0,0,1)
//   J3 (nadlaktica->lakat):       xyz=(0.32,0,0)                    rpy=(3.1416,0,-1.1753)  axis=(0,0,-1)
//   J4 (lakat->podlaktica):       xyz=(0,-0.0735,0)                 rpy=(-0.5648,-0.78173,1.7809) axis=(0.14804,0.90477,0.39934)
//   J5 (podlaktica->saka):        xyz=(0.037114,0.22683,0.10011)    rpy=(2.2965,-0.74045,-0.57161) axis=(-1,0,0)
//   J6 (saka->hvataljka):         xyz=(0,0,-0.042312)               rpy=(-3.1416,0,0.2419) axis=(0,0,1)
//
// Root correction: unlike PAROL6 (whose joint 1 already spins around a
// clean world axis once reoriented), this rig's own base-rotation axis
// works out to plain world -X once J1's own rpy is applied - the root
// group here rotates -90deg about Z instead of PAROL6's -90deg about X, to
// bring THAT axis to three.js's vertical Y instead. Verified numerically
// (see faze4Kinematics.ts) rather than guessed - a naive "-90 about X"
// copy-paste from Parol6Arm.tsx would have left the base spinning around a
// horizontal axis. Unlike AR3/AR4, this correction DOES build the moving
// arm upward correctly (the all-zero-pose tip sits at positive Y) - but
// base_link's own mesh geometry (the stationary mounting plate) still
// extends well below y=0 on its own (confirmed against the real STL
// file), which is why the base visibly sank into the floor/table before
// FAZE4_BASE_OFFSET lifted and recentered it.
// =============================================================================

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { RobotState } from '../../store';
import Toolhead, { toolheadMountOffset } from './Toolhead';

const MESH_BASE = '/models/faze4/';

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

export const FAZE4_CHAIN: JointDef[] = [
  { pos: [0.075629, -0.21266, 0.050734], rpy: [-1.5708, 0, -1.5708], axis: [0, -1, 0] },
  { pos: [0, -0.20182, 0], rpy: [0, 0, -1.8111], axis: [0, 0, 1] },
  { pos: [0.32, 0, 0], rpy: [3.1416, 0, -1.1753], axis: [0, 0, -1] },
  { pos: [0, -0.0735, 0], rpy: [-0.5648, -0.78173, 1.7809], axis: [0.14804, 0.90477, 0.39934] },
  { pos: [0.037114, 0.22683, 0.10011], rpy: [2.2965, -0.74045, -0.57161], axis: [-1, 0, 0] },
  { pos: [0, 0, -0.042312], rpy: [-3.1416, 0, 0.2419], axis: [0, 0, 1] },
];

// Root correction, computed once: rotate joint 1's own world-frame axis onto three.js Y (up).
// ROS rpy composes as R = Rz(yaw)*Ry(pitch)*Rx(roll) - three.js 'ZYX' order, not 'XYZ' (see
// jointQuaternion's own comment below for the full explanation and how this was found).
export const FAZE4_ROOT_QUAT = (() => {
  const j1 = FAZE4_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
})();

// base_link's own centering/lift offset (X,Y,Z), applied AFTER the root rotation above -
// computed from base_link.STL's own real bounding box, see this file's header comment.
// Re-derived after the rpy Euler order fix below (J1's own rpy is a 2-axis rotation, so
// FAZE4_ROOT_QUAT itself changed, not just the mesh centering).
export const FAZE4_BASE_OFFSET: [number, number, number] = [-0.0756, -0.0157, -0.1697];

// ROS URDF <origin rpy="r p y"/> composes as R = Rz(yaw)*Ry(pitch)*Rx(roll) - that's three.js's
// intrinsic 'ZYX' Euler order, NOT the default 'XYZ'. For a single-axis rpy the other two
// factors are identity regardless of order, so most of this chain looked fine either way - but
// J1's own rpy (-1.5708,0,-1.5708) is 2-axis, and J3/J4/J5/J6 are all 2- or 3-axis too, so
// 'XYZ' vs 'ZYX' produced completely different matrices for nearly this whole robot (verified
// numerically against Parol6's own J3/J4, maxDiff=2 i.e. not even close). This is what actually
// made the base render "de lado" (sideways, since it corrupted FAZE4_ROOT_QUAT itself) and the
// rest of the arm look badly assembled - not a data transcription or sign bug, an Euler
// composition order bug.
function jointQuaternion(joint: JointDef, angleDeg: number): THREE.Quaternion {
  const reorient = new THREE.Quaternion().setFromEuler(new THREE.Euler(joint.rpy[0], joint.rpy[1], joint.rpy[2], 'ZYX'));
  const axisVec = new THREE.Vector3(...joint.axis).normalize();
  const spin = new THREE.Quaternion().setFromAxisAngle(axisVec, angleDeg * Math.PI / 180);
  return reorient.multiply(spin);
}

const bodyMat = { color: '#dbe4ee', roughness: 0.5, metalness: 0.3 };

export default function Faze4Arm({ robot }: { robot: RobotState }) {
  const j1 = robot.joints.j1, j2 = robot.joints.j2, j3 = robot.joints.j3;
  const j4 = robot.joints.j4, j5 = robot.joints.j5, j6 = robot.joints.j6;

  const q1 = useMemo(() => jointQuaternion(FAZE4_CHAIN[0], j1), [j1]);
  const q2 = useMemo(() => jointQuaternion(FAZE4_CHAIN[1], j2), [j2]);
  const q3 = useMemo(() => jointQuaternion(FAZE4_CHAIN[2], j3), [j3]);
  const q4 = useMemo(() => jointQuaternion(FAZE4_CHAIN[3], j4), [j4]);
  const q5 = useMemo(() => jointQuaternion(FAZE4_CHAIN[4], j5), [j5]);
  const q6 = useMemo(() => jointQuaternion(FAZE4_CHAIN[5], j6), [j6]);

  const baseLinkGeo = useRealScaleSTL('base_link.STL');
  const rotaryBaseGeo = useRealScaleSTL('rotary_base.STL');
  const nadlakticaGeo = useRealScaleSTL('nadlaktica.STL');
  const lakatGeo = useRealScaleSTL('lakat.STL');
  const podlakticaGeo = useRealScaleSTL('podlaktica.STL');
  const sakaGeo = useRealScaleSTL('saka.STL');
  const hvataljkaGeo = useRealScaleSTL('hvataljka.STL');

  return (
    <group position={FAZE4_BASE_OFFSET}>
    <group quaternion={FAZE4_ROOT_QUAT}>
      <mesh geometry={baseLinkGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

      <group position={FAZE4_CHAIN[0].pos} quaternion={q1}>
        <mesh geometry={rotaryBaseGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

        <group position={FAZE4_CHAIN[1].pos} quaternion={q2}>
          <mesh geometry={nadlakticaGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

          <group position={FAZE4_CHAIN[2].pos} quaternion={q3}>
            <mesh geometry={lakatGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

            <group position={FAZE4_CHAIN[3].pos} quaternion={q4}>
              <mesh geometry={podlakticaGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

              <group position={FAZE4_CHAIN[4].pos} quaternion={q5}>
                <mesh geometry={sakaGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>

                <group position={FAZE4_CHAIN[5].pos} quaternion={q6}>
                  <mesh geometry={hvataljkaGeo} castShadow receiveShadow><meshStandardMaterial {...bodyMat} /></mesh>
                  <group position={toolheadMountOffset(hvataljkaGeo)}>
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
