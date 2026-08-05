import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { type RobotState, useHydraStore } from '../store';

function Toolhead({ tool }: { tool: string }) {
  if (tool.includes('Laser')) {
    return (
      <group position={[0, 0, 0]}>
        <Cylinder args={[0.03, 0.03, 0.1]} position={[0, 0.05, 0]} material-color="#ef4444" castShadow />
        <Cylinder args={[0.005, 0.005, 1]} position={[0, 0.6, 0]} material-color="#ef4444" material-transparent material-opacity={0.5} />
      </group>
    );
  }
  if (tool.includes('Extruder')) {
    return (
      <group position={[0, 0, 0]}>
        <Box args={[0.08, 0.12, 0.08]} position={[0, 0.06, 0]} material-color="#38bdf8" castShadow />
        <Cylinder args={[0.02, 0.005, 0.05]} position={[0, 0.145, 0]} material-color="#f59e0b" castShadow />
      </group>
    );
  }
  if (tool.includes('Vacuum') || tool.includes('Suction')) {
    return (
      <group position={[0, 0, 0]}>
        <Cylinder args={[0.05, 0.05, 0.15]} position={[0, 0.075, 0]} material-color="#64748b" castShadow />
        <Cylinder args={[0.01, 0.01, 0.05]} position={[0, 0.175, 0]} material-color="#334155" castShadow />
      </group>
    );
  }
  if (tool.includes('Gripper')) {
    return (
      <group position={[0, 0, 0]}>
        <Box args={[0.1, 0.05, 0.05]} position={[0, 0.025, 0]} material-color="#94a3b8" castShadow />
        <Box args={[0.02, 0.1, 0.04]} position={[-0.04, 0.1, 0]} material-color="#cbd5e1" castShadow />
        <Box args={[0.02, 0.1, 0.04]} position={[0.04, 0.1, 0]} material-color="#cbd5e1" castShadow />
      </group>
    );
  }
  if (tool.includes('Camera') || tool.includes('Microscope')) {
    return (
      <group position={[0, 0, 0]}>
        <Box args={[0.08, 0.08, 0.08]} position={[0, 0.04, 0]} material-color="#1e293b" castShadow />
        <Cylinder args={[0.02, 0.02, 0.04]} position={[0, 0.08, 0.04]} rotation={[Math.PI/2, 0, 0]} material-color="#0284c7" castShadow />
        <Cylinder args={[0.015, 0.015, 0.01]} position={[0, 0.08, 0.065]} rotation={[Math.PI/2, 0, 0]} material-color="#f8fafc" castShadow />
      </group>
    );
  }
  if (tool.includes('Spindle') || tool.includes('Rotary')) {
    return (
      <group position={[0, 0, 0]}>
        <Cylinder args={[0.04, 0.04, 0.15]} position={[0, 0.075, 0]} material-color="#cbd5e1" castShadow />
        <Cylinder args={[0.01, 0.01, 0.05]} position={[0, 0.175, 0]} material-color="#94a3b8" castShadow />
      </group>
    );
  }
  if (tool.includes('Soldering') || tool.includes('Dispenser')) {
    return (
      <group position={[0, 0, 0]}>
        <Cylinder args={[0.03, 0.03, 0.15]} position={[0, 0.075, 0]} material-color="#fca5a5" castShadow />
        <Cylinder args={[0.01, 0.005, 0.05]} position={[0, 0.175, 0]} material-color="#b91c1c" castShadow />
      </group>
    );
  }

  // Default blank tool
  return (
    <group position={[0, 0, 0]}>
      <Cylinder args={[0.04, 0.04, 0.05]} position={[0, 0.025, 0]} material-color="#475569" castShadow />
    </group>
  );
}

function RobotArm({ robot }: { robot: RobotState }) {
  const group = useRef<THREE.Group>(null);
  const isParol = robot.model === 'Parol6';
  
  const j1 = robot.pos.x * Math.PI / 180;
  const j2 = robot.pos.y * Math.PI / 180;
  const j3 = robot.pos.z * Math.PI / 180;
  const j4 = robot.pos.a * Math.PI / 180;
  const j5 = robot.pos.b * Math.PI / 180;
  const j6 = robot.pos.c * Math.PI / 180;

  const colorPrimary = isParol ? '#f59e0b' : '#38bdf8'; 
  const colorSecondary = '#1e293b';
  const colorJoint = '#334155';
  const jointMaterialProps = { roughness: 0.7, metalness: 0.3 };
  const primaryMaterialProps = { roughness: 0.4, metalness: 0.1 };

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* Base Pedestal */}
      <Cylinder args={[0.12, 0.15, 0.1]} position={[0, 0.05, 0]} material-color={colorSecondary} castShadow receiveShadow />
      
      {/* J1 (Base Yaw, axis: Y) */}
      <group position={[0, 0.1, 0]} rotation={[0, j1, 0]}>
        {/* Waist Body */}
        <Cylinder args={[0.1, 0.12, 0.15]} position={[0, 0.075, 0]} material-color={colorPrimary} castShadow receiveShadow {...primaryMaterialProps} />
        
        {/* J1 U-Bracket */}
        <Box args={[0.18, 0.04, 0.12]} position={[0, 0.17, 0]} material-color={colorPrimary} castShadow receiveShadow {...primaryMaterialProps} />
        <Box args={[0.04, 0.16, 0.12]} position={[-0.07, 0.27, 0]} material-color={colorPrimary} castShadow receiveShadow {...primaryMaterialProps} />
        <Box args={[0.04, 0.16, 0.12]} position={[0.07, 0.27, 0]} material-color={colorPrimary} castShadow receiveShadow {...primaryMaterialProps} />

        {/* J2 (Shoulder Pitch, axis: X) */}
        <group position={[0, 0.3, 0]} rotation={[j2, 0, 0]}>
          {/* Shoulder Joint Motor/Housing (Visual) - Axis X */}
          <Cylinder args={[0.06, 0.06, 0.18]} rotation={[0, 0, Math.PI/2]} material-color={colorJoint} castShadow receiveShadow {...jointMaterialProps} />
          
          {/* Upper Arm Link */}
          <Box args={[0.08, 0.4, 0.08]} position={[0, 0.2, 0]} material-color={colorPrimary} castShadow receiveShadow {...primaryMaterialProps} />
          
          {/* J3 (Elbow Pitch, axis: X) */}
          <group position={[0, 0.4, 0]} rotation={[j3, 0, 0]}>
            {/* Elbow Joint Motor/Housing (Visual) - Axis X */}
            <Cylinder args={[0.05, 0.05, 0.14]} rotation={[0, 0, Math.PI/2]} material-color={colorJoint} castShadow receiveShadow {...jointMaterialProps} />
            
            {/* Forearm Offset Block */}
            <Box args={[0.08, 0.1, 0.08]} position={[0, 0.05, 0]} material-color={colorPrimary} castShadow receiveShadow {...primaryMaterialProps} />
            
            {/* J4 (Forearm Roll, axis: Y) */}
            <group position={[0, 0.1, 0]} rotation={[0, j4, 0]}>
              {/* Forearm tube extending up */}
              <Cylinder args={[0.045, 0.055, 0.3]} position={[0, 0.15, 0]} material-color={colorPrimary} castShadow receiveShadow {...primaryMaterialProps} />
              
              {/* J5 Wrist Pitch Bracket */}
              <Box args={[0.11, 0.03, 0.06]} position={[0, 0.315, 0]} material-color={colorPrimary} castShadow receiveShadow {...primaryMaterialProps} />
              <Box args={[0.03, 0.08, 0.06]} position={[-0.04, 0.37, 0]} material-color={colorPrimary} castShadow receiveShadow {...primaryMaterialProps} />
              <Box args={[0.03, 0.08, 0.06]} position={[0.04, 0.37, 0]} material-color={colorPrimary} castShadow receiveShadow {...primaryMaterialProps} />

              {/* J5 (Wrist Pitch, axis: X) */}
              <group position={[0, 0.37, 0]} rotation={[j5, 0, 0]}>
                {/* Wrist Pitch Motor/Housing (Visual) */}
                <Cylinder args={[0.035, 0.035, 0.1]} rotation={[0, 0, Math.PI/2]} material-color={colorJoint} castShadow receiveShadow {...jointMaterialProps} />
                
                {/* Wrist Roll Housing (extends along Y) */}
                <Box args={[0.05, 0.06, 0.05]} position={[0, 0.03, 0]} material-color={colorPrimary} castShadow receiveShadow {...primaryMaterialProps} />
                
                {/* J6 (Wrist Roll, axis: Y) */}
                <group position={[0, 0.06, 0]} rotation={[0, j6, 0]}>
                  {/* Tool Flange */}
                  <Cylinder args={[0.04, 0.04, 0.015]} position={[0, 0.0075, 0]} material-color={colorJoint} castShadow receiveShadow />
                  
                  {/* Toolhead Mount Point */}
                  <group position={[0, 0.015, 0]}>
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

export function VirtualKinematics({ robot }: { robot: RobotState }) {
  const { xyTable } = useHydraStore();
  const hasXYTable = xyTable.assignedRobotId === robot.id;

  // Convert mm to meters and scale 4x visually
  const VISUAL_SCALE = 4;
  const tableW = (xyTable.tableSize.width / 1000) * VISUAL_SCALE;
  const tableL = (xyTable.tableSize.length / 1000) * VISUAL_SCALE;
  
  // Clamped position for visualization
  const px = (Math.max(0, Math.min(xyTable.pos.x, xyTable.tableSize.width)) / 1000) * VISUAL_SCALE;
  const py = (Math.max(0, Math.min(xyTable.pos.y, xyTable.tableSize.length)) / 1000) * VISUAL_SCALE;

  return (
    <div className="w-full h-full bg-slate-950 relative rounded-xl overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
        <span className="text-xs font-mono bg-slate-900/80 text-sky-400 px-2 py-1 rounded border border-sky-500/20 backdrop-blur shadow-lg shadow-black/20">
          Model: {robot.model}
        </span>
        <span className="text-xs font-mono bg-slate-900/80 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 backdrop-blur shadow-lg shadow-black/20">
          Tool: {robot.tool}
        </span>
      </div>
      <Canvas camera={{ position: [1.8, 1.2, 1.8], fov: 50 }} shadows className="w-full h-full outline-none">
        <color attach="background" args={['#020617']} />
        
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#38bdf8" />
        
        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#020617" />
        </mesh>

        <Grid 
          renderOrder={-1} 
          position={[0, 0, 0]} 
          infiniteGrid 
          cellSize={0.1} 
          cellThickness={0.5} 
          sectionSize={0.5} 
          sectionThickness={1} 
          sectionColor="#334155" 
          fadeDistance={5} 
        />

        {hasXYTable ? (
          <group position={[-tableW/2, 0, -tableL/2]}>
            {/* Table Bed */}
            <Box args={[tableW, 0.02, tableL]} position={[tableW/2, 0.01, tableL/2]} material-color="#1e293b" castShadow receiveShadow />
            
            {/* Rails */}
            <Cylinder args={[0.01, 0.01, tableW]} rotation={[0, 0, Math.PI/2]} position={[tableW/2, 0.04, 0.05]} material-color="#64748b" />
            <Cylinder args={[0.01, 0.01, tableW]} rotation={[0, 0, Math.PI/2]} position={[tableW/2, 0.04, tableL - 0.05]} material-color="#64748b" />
            
            {/* Robot Base Mount on XY table */}
            <group position={[px, 0.04, py]}>
              <Box args={[0.2, 0.02, 0.2]} position={[0, 0.01, 0]} material-color="#475569" castShadow receiveShadow />
              <group position={[0, 0.02, 0]}>
                <RobotArm robot={robot} />
              </group>
            </group>
          </group>
        ) : (
          <RobotArm robot={robot} />
        )}

        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 + 0.1} minDistance={0.5} maxDistance={6} target={hasXYTable ? [0, 0.4, 0] : [0, 0.4, 0]} />
      </Canvas>
    </div>
  );
}
