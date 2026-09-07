// =============================================================================
// HYDRA-UMC STUDIO - React Component: PathVisualizer.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { RobotState } from '../../store';
import { jointsToCartesianForModel } from '../../examples/robotKinematicsDispatch';

// Points normally already carry their own Cartesian x/y/z (populated once, using the
// correct originating formula, at the moment they're created - see RobotDetail.tsx's
// loadExample/loadExampleForRobot for loaded examples and handleAddPoint for live-jogged
// recordings). This joint-only fallback only matters for legacy data that predates that
// (an old saved "work" file, or a point missing x for some other reason) - in that case,
// the safest assumption is that pt.j1..j6 are THIS robot's own native joint values (true
// for anything ever recorded via the jog sliders), so dispatch through that robot's own
// real FK rather than the shared generic 160mm/200mm formula.

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
        const c = jointsToCartesianForModel(model, pt);
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
