// =============================================================================
// HYDRA-UMC STUDIO - React Component: PathVisualizer.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { RobotState } from '../../store';
import { parol6JointsToCartesian } from '../../examples/parol6Kinematics';
import { faze4JointsToCartesian } from '../../examples/faze4Kinematics';
import { ar3JointsToCartesian } from '../../examples/ar3Kinematics';
import { ar4JointsToCartesian } from '../../examples/ar4Kinematics';
import type { KinematicsPoint } from '../../examples/utils';

// Parol6Arm.tsx/Faze4Arm.tsx/AR3Arm.tsx are each driven by their own real URDF joint
// chain (see their own header comments), not the shared 160mm/200mm planar convention
// every OTHER *Arm.tsx uses - so a recorded point stored only as {j1..j6} (e.g. from an
// example generator, which always computes against that shared convention) needs to be
// converted to Cartesian using that SAME robot's own real kinematics, or the drawn path
// line won't match where its tool tip actually ends up.
function jointsToCartesianFor(model: RobotState['model'] | undefined, pt: KinematicsPoint) {
  if (model === 'Parol6 (6-DOF)') return parol6JointsToCartesian(pt);
  if (model === 'Faze4 (6-DOF)') return faze4JointsToCartesian(pt);
  if (model === 'AR3 (6-DOF)') return ar3JointsToCartesian(pt);
  if (model === 'AR4 (6-DOF)') return ar4JointsToCartesian(pt);

  const j1Rad = (pt.j1 || 0) * (Math.PI / 180);
  const j2Rad = (pt.j2 || 0) * (Math.PI / 180);
  const j3Rad = (pt.j3 || 0) * (Math.PI / 180);
  const theta1_rad = -j2Rad;
  const R2 = 160 * Math.sin(theta1_rad) + 200 * Math.sin(theta1_rad + j3Rad);
  const Z2 = 160 * Math.cos(theta1_rad) + 200 * Math.cos(theta1_rad + j3Rad);
  return {
    x: R2 * Math.cos(j1Rad),
    y: R2 * Math.sin(j1Rad),
    z: Z2 + 195,
    a: pt.j4 || 0, b: pt.j5 || 0, c: pt.j6 || 0,
  };
}

/**
 * Executes the  path visualizer logic.
 * This function handles the necessary computations and state updates.
 */
export default function PathVisualizer({ points, hasXYTable, model }: { points: RobotState['recordedPoints'], hasXYTable: boolean, model?: RobotState['model'] }) {
  const linePoints = useMemo(() => {
    return points.map(pt => {
      const baseTx = hasXYTable ? ((pt.tx || 0) / 1000) : 0;
      const baseTy = hasXYTable ? ((pt.ty || 0) / 1000) : 0;
      let x = pt.x;
      let y = pt.y;
      let z = pt.z;

      if (x === undefined && pt.j1 !== undefined) {
        const c = jointsToCartesianFor(model, pt);
        x = c.x; y = c.y; z = c.z;
      }

      return new THREE.Vector3(
        baseTx + ((x || 0) / 1000),
        ((z || 0) / 1000),
        baseTy - ((y || 0) / 1000)
      );
    });
  }, [points, hasXYTable, model]);

  if (linePoints.length < 2) return null;

  return (
    <group>
      <Line
        points={linePoints}
        color="#00E5FF"
        lineWidth={4}
        dashed={false}
      />
      {linePoints.map((pt, i) => (
        <mesh key={i} position={pt}>
            <sphereGeometry args={[0.005, 8, 8]} />
            <meshBasicMaterial color="#fcd34d" />
        </mesh>
      ))}
    </group>
  );
}
