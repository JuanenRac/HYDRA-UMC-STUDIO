// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: URArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// ONE shared rig renderer for every Universal Robots e-Series model
// (UR3e/UR5e/UR10e/UR16e/UR20, ...) - unlike Parol6Arm.tsx/Faze4Arm.tsx/
// AR3Arm.tsx/AR4Arm.tsx (each a structurally different robot, each with
// its own hand-unrolled JSX chain), every UR model shares the exact same
// 7-link/6-joint structure and the exact same "every joint rotates about
// its own local Z once its own <origin rpy> is applied" convention
// (github.com/UniversalRobots/Universal_Robots_ROS2_Description's own
// ur_macro.xacro - every <joint> there has <axis xyz="0 0 1"/>, no
// exceptions). Only the numeric chain/mesh-offset values differ per model
// (see ur5eKinematics.ts etc.), so a single parametrized + recursive
// renderer is the correct amount of sharing here, not premature
// abstraction - hand-unrolling this same 7-group nest 5 times over would
// just be the same JSX typed out with different numbers each time.
//
// Real geometry, not a placeholder: loads the actual STL mesh for every
// link (public/models/<slug>/*.stl, see that folder's own ATTRIBUTION.txt)
// from Universal Robots' own official, BSD-3-Clause meshes/<slug>/collision/
// STL set - the same files their own ROS driver ships, not a
// re-derived/approximated shape.
//
// mesh_offset (per link, from that model's own visual_parameters.yaml) is
// a real correction UR's own package already documents - it re-centers
// each link's mesh relative to that link's own joint-chain origin. Unlike
// Parol6's PAROL6_BASE_OFFSET (a value THIS project had to hand-derive
// because Parol6's own STLs weren't pre-centered), UR's own official
// package already ships this number, so no additional hand-tuned
// centering constant is needed here.
// =============================================================================

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { RobotState } from '../../store';
import type { UrChain, UrJointStep } from '../../examples/urKinematicsShared';
import Toolhead, { toolheadMountOffset } from './Toolhead';

/** meshOffsets order: base, shoulder, upper_arm, forearm, wrist_1, wrist_2, wrist_3 - 7 entries. */
export type UrMeshOffsets = [UrJointStep, UrJointStep, UrJointStep, UrJointStep, UrJointStep, UrJointStep, UrJointStep];

export interface UrArmConfig {
  /** e.g. '/models/ur5e/' */
  meshBase: string;
  chain: UrChain;
  meshOffsets: UrMeshOffsets;
  /** Real on-disk filenames, base..wrist_3 order - defaults to Universal
   * Robots' own naming (base.stl/shoulder.stl/upperarm.stl/forearm.stl/
   * wrist1.stl/wrist2.stl/wrist3.stl) for every existing UR*Arm.tsx
   * wrapper, which don't need to change. Robots sharing this same "every
   * joint rotates about local Z" engine but NOT Universal Robots' own
   * naming convention (xArm6Arm.tsx/Lite6Arm.tsx use link1.stl.."link6".stl)
   * pass their own real filenames here instead. */
  meshFiles?: [string, string, string, string, string, string, string];
}

const DEFAULT_UR_MESH_FILES: [string, string, string, string, string, string, string] = [
  'base.stl', 'shoulder.stl', 'upperarm.stl', 'forearm.stl', 'wrist1.stl', 'wrist2.stl', 'wrist3.stl',
];

// Same ROS rpy = Rz(yaw)*Ry(pitch)*Rx(roll) = three.js 'ZYX' composition
// fix already applied throughout this folder (see Parol6Arm.tsx's own
// rosEuler() header comment) - UR's wrist_3 origin has all 3 components
// non-zero, so this isn't optional here the way it was for Parol6's
// single-axis joints.
function rosEuler(rpy: [number, number, number]): THREE.Euler {
  return new THREE.Euler(rpy[0], rpy[1], rpy[2], 'ZYX');
}

// Same defensive mm-vs-m scale check every other *Arm.tsx in this folder
// applies - UR's own official STLs are already meter-scale in practice,
// but this costs nothing to keep consistent with the established pattern.
function useRealScaleSTL(url: string): THREE.BufferGeometry {
  const raw = useLoader(STLLoader, url);
  return useMemo(() => {
    const geometry = raw.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const maxDim = box ? Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z) : 0;
    if (maxDim > 5) {
      geometry.scale(0.001, 0.001, 0.001);
    }
    return geometry;
  }, [raw]);
}

const bodyMat = { color: '#d0d3d8', roughness: 0.45, metalness: 0.4 };

export default function URArm({ robot, config }: { robot: RobotState; config: UrArmConfig }) {
  const MESH_FILES = config.meshFiles ?? DEFAULT_UR_MESH_FILES;
  const joints = [
    robot.joints.j1 * Math.PI / 180,
    robot.joints.j2 * Math.PI / 180,
    robot.joints.j3 * Math.PI / 180,
    robot.joints.j4 * Math.PI / 180,
    robot.joints.j5 * Math.PI / 180,
    robot.joints.j6 * Math.PI / 180,
  ];

  // 7 explicit calls (not a .map loop) so React's rules-of-hooks sees a
  // fixed, statically-countable set of hook calls every render, same
  // pattern every other *Arm.tsx in this folder already uses.
  const baseGeo = useRealScaleSTL(config.meshBase + MESH_FILES[0]);
  const shoulderGeo = useRealScaleSTL(config.meshBase + MESH_FILES[1]);
  const upperArmGeo = useRealScaleSTL(config.meshBase + MESH_FILES[2]);
  const forearmGeo = useRealScaleSTL(config.meshBase + MESH_FILES[3]);
  const wrist1Geo = useRealScaleSTL(config.meshBase + MESH_FILES[4]);
  const wrist2Geo = useRealScaleSTL(config.meshBase + MESH_FILES[5]);
  const wrist3Geo = useRealScaleSTL(config.meshBase + MESH_FILES[6]);
  const geos = [baseGeo, shoulderGeo, upperArmGeo, forearmGeo, wrist1Geo, wrist2Geo, wrist3Geo];

  function renderLink(depth: number): React.ReactNode {
    const off = config.meshOffsets[depth];
    const meshNode = (
      <group position={off.pos} rotation={rosEuler(off.rpy)}>
        <mesh geometry={geos[depth]} castShadow receiveShadow>
          <meshStandardMaterial {...bodyMat} />
        </mesh>
      </group>
    );

    if (depth === 6) {
      // wrist_3_link - end of chain, tool mounts here. Offset derived
      // from this model's OWN wrist_3 mesh bounding box (toolheadMountOffset),
      // not a blind constant - a fixed guess looked fine for UR5e's own
      // small wrist mesh but buried the tool inside a bigger one on other
      // models (see Toolhead.tsx's own header for the full explanation).
      return (
        <>
          {meshNode}
          <group position={toolheadMountOffset(geos[6])}>
            <Toolhead tool={robot.tool} />
          </group>
        </>
      );
    }

    const step = config.chain[depth];
    return (
      <>
        {meshNode}
        <group position={step.pos} rotation={rosEuler(step.rpy)}>
          <group rotation={[0, 0, joints[depth]]}>
            {renderLink(depth + 1)}
          </group>
        </group>
      </>
    );
  }

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {renderLink(0)}
    </group>
  );
}
