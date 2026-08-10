import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { RobotState } from '../../store';

export default function PathVisualizer({ points, hasXYTable }: { points: RobotState['recordedPoints'], hasXYTable: boolean }) {
  const linePoints = useMemo(() => {
    return points.map(pt => {
      const baseTx = hasXYTable ? ((pt.tx || 0) / 1000) : 0;
      const baseTy = hasXYTable ? ((pt.ty || 0) / 1000) : 0;
      return new THREE.Vector3(
        baseTx + (pt.x / 1000),
        (pt.z / 1000),
        baseTy - (pt.y / 1000)
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
