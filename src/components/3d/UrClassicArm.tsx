// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: UrClassicArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// ONE shared rig renderer for every Universal Robots CLASSIC model
// (UR3/UR5/UR10, pre-e-Series) - mirrors URArm.tsx's own "one engine,
// parametrized" reasoning for the e-Series, but built on the
// quaternion-based per-joint approach (see urClassicKinematics.ts's own
// header for why: this generation's joints don't all share local Z).
//
// Real geometry: loads the actual STL mesh for every link
// (public/models/ur{3,5,10}classic/*.stl, BSD-3-Clause - see each
// folder's own ATTRIBUTION.txt). Every real link's own <visual><origin>
// in the source URDF is identity (mesh sits directly at its own joint's
// frame), so - unlike ViperX 300/WidowX 250 - no separate mesh-offset
// layer is needed here.
// =============================================================================

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { RobotState } from '../../store';
import type { UrClassicChain, UrClassicJointStep } from '../../examples/urClassicKinematics';
import Toolhead, { toolheadMountOffset } from './Toolhead';

export interface UrClassicArmConfig {
  /** e.g. '/models/ur5classic/' */
  meshBase: string;
  chain: UrClassicChain;
}

const MESH_FILES = ['base.stl', 'shoulder.stl', 'upperarm.stl', 'forearm.stl', 'wrist1.stl', 'wrist2.stl', 'wrist3.stl'];

function useRealScaleSTL(url: string): THREE.BufferGeometry {
  const raw = useLoader(STLLoader, url);
  return useMemo(() => {
    const geometry = raw.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const maxDim = box ? Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z) : 0;
    if (maxDim > 5) geometry.scale(0.001, 0.001, 0.001);
    return geometry;
  }, [raw]);
}

function jointQuaternion(joint: UrClassicJointStep, angleDeg: number): THREE.Quaternion {
  const reorient = new THREE.Quaternion().setFromEuler(new THREE.Euler(joint.rpy[0], joint.rpy[1], joint.rpy[2], 'ZYX'));
  const axisVec = new THREE.Vector3(...joint.axis).normalize();
  const spin = new THREE.Quaternion().setFromAxisAngle(axisVec, angleDeg * Math.PI / 180);
  return reorient.multiply(spin);
}

const bodyMat = { color: '#b8bcc2', roughness: 0.45, metalness: 0.35 };

export default function UrClassicArm({ robot, config }: { robot: RobotState; config: UrClassicArmConfig }) {
  const j1 = robot.joints.j1, j2 = robot.joints.j2, j3 = robot.joints.j3;
  const j4 = robot.joints.j4, j5 = robot.joints.j5, j6 = robot.joints.j6;

  const rootQuat = useMemo(() => {
    const j1 = config.chain[0];
    const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
    const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
    return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
  }, [config.chain]);

  // 6 explicit calls (not a .map loop), same rules-of-hooks reasoning
  // every other *Arm.tsx in this folder already documents.
  const q1 = useMemo(() => jointQuaternion(config.chain[0], j1), [config.chain, j1]);
  const q2 = useMemo(() => jointQuaternion(config.chain[1], j2), [config.chain, j2]);
  const q3 = useMemo(() => jointQuaternion(config.chain[2], j3), [config.chain, j3]);
  const q4 = useMemo(() => jointQuaternion(config.chain[3], j4), [config.chain, j4]);
  const q5 = useMemo(() => jointQuaternion(config.chain[4], j5), [config.chain, j5]);
  const q6 = useMemo(() => jointQuaternion(config.chain[5], j6), [config.chain, j6]);
  const qs = [q1, q2, q3, q4, q5, q6];

  const geos = [
    useRealScaleSTL(config.meshBase + MESH_FILES[0]),
    useRealScaleSTL(config.meshBase + MESH_FILES[1]),
    useRealScaleSTL(config.meshBase + MESH_FILES[2]),
    useRealScaleSTL(config.meshBase + MESH_FILES[3]),
    useRealScaleSTL(config.meshBase + MESH_FILES[4]),
    useRealScaleSTL(config.meshBase + MESH_FILES[5]),
    useRealScaleSTL(config.meshBase + MESH_FILES[6]),
  ];

  function renderLink(depth: number): React.ReactNode {
    const meshNode = (
      <mesh geometry={geos[depth]} castShadow receiveShadow>
        <meshStandardMaterial {...bodyMat} />
      </mesh>
    );

    if (depth === 6) {
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
        <group position={step.pos} quaternion={qs[depth]}>
          {renderLink(depth + 1)}
        </group>
      </>
    );
  }

  return (
    <group quaternion={rootQuat}>
      {renderLink(0)}
    </group>
  );
}
