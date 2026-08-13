// =============================================================================
// HYDRA-UMC STUDIO - React Component: Parol6Arm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { useRef } from 'react';
import * as THREE from 'three';
import { Cylinder, RoundedBox } from '@react-three/drei';
import type { RobotState } from '../../store';
import Toolhead from './Toolhead';

/**
 * Executes the  parol6 arm logic. 
 * This function handles the necessary computations and state updates.
 */
export default function Parol6Arm({ robot }: { robot: RobotState }) {
  const group = useRef<THREE.Group>(null);
  
  const j1 = robot.joints.j1 * Math.PI / 180;
  const j2 = robot.joints.j2 * Math.PI / 180;
  const j3 = robot.joints.j3 * Math.PI / 180;
  const j4 = robot.joints.j4 * Math.PI / 180;
  const j5 = robot.joints.j5 * Math.PI / 180;
  const j6 = robot.joints.j6 * Math.PI / 180;

  const colorPrimary = '#475569';
  const colorSecondary = '#1A202C';
  const colorJoint = '#2D3748';
  const colorAccent = '#cbd5e1';
  
  const matProps = { roughness: 0.3, metalness: 0.6, clearcoat: 0.5 };
  const rubberProps = { roughness: 0.9, metalness: 0.1 };
  
  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* Base Pedestal */}
      <Cylinder args={[0.07, 0.09, 0.04]} position={[0, 0.02, 0]} material-color={colorSecondary} castShadow receiveShadow {...rubberProps} />
      <Cylinder args={[0.065, 0.07, 0.13]} position={[0, 0.105, 0]} material-color={colorSecondary} castShadow receiveShadow {...matProps} />
      
      {/* Joint 1 (Z-axis rotation, mapped to Y in ThreeJS) */}
      <group position={[0, 0.17, 0]} rotation={[0, j1, 0]}>
        {/* Shoulder Base Swivel */}
        <Cylinder args={[0.065, 0.065, 0.04]} position={[0, 0.02, 0]} material-color={colorPrimary} castShadow receiveShadow {...matProps} />
        
        {/* Shoulder Offset Block */}
        <RoundedBox args={[0.09, 0.08, 0.10]} position={[0, 0.08, 0]} radius={0.015} material-color={colorPrimary} castShadow receiveShadow {...matProps} />
        
        {/* Joint 2 (Z-axis rotation, bends arm along X) */}
        <group position={[0, 0.12, 0]}>
          <group rotation={[0, 0, j2]}>
            {/* J2 Motor Housing */}
            <Cylinder args={[0.05, 0.05, 0.12]} rotation={[Math.PI/2, 0, 0]} material-color={colorJoint} castShadow receiveShadow {...matProps} />
            <Cylinder args={[0.052, 0.052, 0.02]} position={[0, 0, 0.05]} rotation={[Math.PI/2, 0, 0]} material-color={colorAccent} castShadow receiveShadow {...matProps} />
            
            {/* Link 2 (Upper Arm L1 = 160 => 0.16) */}
            <Cylinder args={[0.04, 0.05, 0.16]} position={[0, 0.08, 0]} material-color={colorPrimary} castShadow receiveShadow {...matProps} />
            
            {/* Joint 3 */}
            <group position={[0, 0.16, 0]}>
              <group rotation={[0, 0, -j3]}>
                {/* J3 Motor Housing */}
                <Cylinder args={[0.045, 0.045, 0.10]} rotation={[Math.PI/2, 0, 0]} material-color={colorJoint} castShadow receiveShadow {...matProps} />
                
                {/* Elbow / Forearm Transition Block */}
                <RoundedBox args={[0.06, 0.06, 0.07]} position={[0, 0, 0]} radius={0.015} material-color={colorPrimary} castShadow receiveShadow {...matProps} />
                
                {/* Joint 4 (Roll, Y axis in ThreeJS) */}
                <group rotation={[0, j4, 0]}>
                  {/* Link 4 (Forearm L2 = 200 => 0.20) */}
                  <Cylinder args={[0.035, 0.045, 0.20]} position={[0, 0.10, 0]} material-color={colorPrimary} castShadow receiveShadow {...matProps} />
                  
                  {/* Joint 5 (Pitch) */}
                  <group position={[0, 0.20, 0]}>
                    <group rotation={[0, 0, j5]}>
                      {/* J5 Motor/Wrist Pitch */}
                      <Cylinder args={[0.035, 0.035, 0.08]} rotation={[Math.PI/2, 0, 0]} material-color={colorJoint} castShadow receiveShadow {...matProps} />
                      <RoundedBox args={[0.05, 0.05, 0.05]} position={[0, 0.025, 0]} radius={0.01} material-color={colorPrimary} castShadow receiveShadow {...matProps} />
                      
                      {/* Joint 6 (Roll) */}
                      <group position={[0, 0.05, 0]} rotation={[0, j6, 0]}>
                        {/* Link 6 (Wrist Roll / Flange) */}
                        <Cylinder args={[0.03, 0.03, 0.02]} position={[0, 0.01, 0]} material-color={colorSecondary} castShadow receiveShadow {...matProps} />
                        <Cylinder args={[0.015, 0.015, 0.005]} position={[0, 0.0225, 0]} material-color={colorAccent} castShadow receiveShadow {...matProps} />
                        
                        <group position={[0, 0.025, 0]}>
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
      </group>
    </group>
  );
}
