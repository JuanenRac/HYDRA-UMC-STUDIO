// =============================================================================
// HYDRA-UMC STUDIO - 3D View Component: PathVisualizer.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { RobotState } from '../../store';

/**
 * Executes the  path visualizer logic. 
 * This function handles the necessary computations and state updates.
 */
export default function PathVisualizer({ points, hasXYTable }: { points: RobotState['recordedPoints'], hasXYTable: boolean }) {
  const linePoints = useMemo(() => {
    return points.map(pt => {
      const baseTx = hasXYTable ? ((pt.tx || 0) / 1000) : 0;
      const baseTy = hasXYTable ? ((pt.ty || 0) / 1000) : 0;
      let x = pt.x;
      let y = pt.y;
      let z = pt.z;

      if (x === undefined && pt.j1 !== undefined) {
          const j1Rad = (pt.j1 || 0) * (Math.PI / 180);
          const j2Rad = (pt.j2 || 0) * (Math.PI / 180);
          const j3Rad = (pt.j3 || 0) * (Math.PI / 180);
          
          const theta1_rad = -j2Rad;
          const R2 = 160 * Math.sin(theta1_rad) + 200 * Math.sin(theta1_rad + j3Rad);
          const Z2 = 160 * Math.cos(theta1_rad) + 200 * Math.cos(theta1_rad + j3Rad);
          
          x = R2 * Math.cos(j1Rad);
          y = R2 * Math.sin(j1Rad);
          z = Z2 + 195;
      }

      return new THREE.Vector3(
        baseTx + ((x || 0) / 1000),
        ((z || 0) / 1000),
        baseTy - ((y || 0) / 1000)
      );
    });
  }, [points, hasXYTable]);

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
