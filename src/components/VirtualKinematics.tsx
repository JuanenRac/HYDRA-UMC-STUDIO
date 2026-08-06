import { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Cylinder, Line, RoundedBox, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { type RobotState } from '../store';

function Toolhead({ tool }: { tool: string }) {
  if (tool.includes('Laser')) {
    return (
      <group position={[0, 0, 0]}>
        <Cylinder args={[0.02, 0.02, 0.06]} position={[0, 0.03, 0]} material-color="#ef4444" castShadow />
        <Cylinder args={[0.005, 0.005, 1]} position={[0, 0.56, 0]} material-color="#ef4444" material-transparent material-opacity={0.5} />
      </group>
    );
  }
  if (tool.includes('Extruder')) {
    return (
      <group position={[0, 0, 0]}>
        <Box args={[0.04, 0.06, 0.04]} position={[0, 0.03, 0]} material-color="#38bdf8" castShadow />
        <Cylinder args={[0.01, 0.005, 0.02]} position={[0, 0.07, 0]} material-color="#f59e0b" castShadow />
      </group>
    );
  }
  if (tool.includes('Vacuum') || tool.includes('Suction')) {
    return (
      <group position={[0, 0, 0]}>
        <Cylinder args={[0.02, 0.02, 0.06]} position={[0, 0.03, 0]} material-color="#64748b" castShadow />
        <Cylinder args={[0.005, 0.005, 0.02]} position={[0, 0.07, 0]} material-color="#334155" castShadow />
      </group>
    );
  }
  if (tool.includes('Gripper')) {
    return (
      <group position={[0, 0, 0]}>
        <Box args={[0.04, 0.02, 0.02]} position={[0, 0.01, 0]} material-color="#94a3b8" castShadow />
        <Box args={[0.008, 0.04, 0.01]} position={[-0.016, 0.03, 0]} material-color="#cbd5e1" castShadow />
        <Box args={[0.008, 0.04, 0.01]} position={[0.016, 0.03, 0]} material-color="#cbd5e1" castShadow />
      </group>
    );
  }
  if (tool.includes('Camera') || tool.includes('Microscope')) {
    return (
      <group position={[0, 0, 0]}>
        <Box args={[0.04, 0.04, 0.04]} position={[0, 0.02, 0]} material-color="#1e293b" castShadow />
        <Cylinder args={[0.01, 0.01, 0.02]} position={[0, 0.04, 0.02]} rotation={[Math.PI/2, 0, 0]} material-color="#0284c7" castShadow />
        <Cylinder args={[0.008, 0.008, 0.005]} position={[0, 0.04, 0.035]} rotation={[Math.PI/2, 0, 0]} material-color="#f8fafc" castShadow />
      </group>
    );
  }
  if (tool.includes('Spindle') || tool.includes('Rotary')) {
    return (
      <group position={[0, 0, 0]}>
        <Cylinder args={[0.02, 0.02, 0.08]} position={[0, 0.04, 0]} material-color="#cbd5e1" castShadow />
        <Cylinder args={[0.005, 0.005, 0.02]} position={[0, 0.09, 0]} material-color="#94a3b8" castShadow />
      </group>
    );
  }
  if (tool.includes('Soldering') || tool.includes('Dispenser')) {
    return (
      <group position={[0, 0, 0]}>
        <Cylinder args={[0.015, 0.015, 0.05]} position={[0, 0.025, 0]} material-color="#fca5a5" castShadow />
        <Cylinder args={[0.005, 0.002, 0.03]} position={[0, 0.065, 0]} material-color="#b91c1c" castShadow />
      </group>
    );
  }

  // Default blank tool
  return (
    <group position={[0, 0, 0]}>
      <Cylinder args={[0.02, 0.02, 0.02]} position={[0, 0.01, 0]} material-color="#475569" castShadow />
    </group>
  );
}

function RobotArm({ robot }: { robot: RobotState }) {
  const group = useRef<THREE.Group>(null);
  
  const j1 = robot.joints.j1 * Math.PI / 180;
  const j2 = robot.joints.j2 * Math.PI / 180;
  const j3 = robot.joints.j3 * Math.PI / 180;
  const j4 = robot.joints.j4 * Math.PI / 180;
  const j5 = robot.joints.j5 * Math.PI / 180;
  const j6 = robot.joints.j6 * Math.PI / 180;

  const colorPrimary = '#fb923c'; // Brighter orange for Parol6
  const colorSecondary = '#0f172a'; // Darker base
  const colorJoint = '#334155'; // Metallic dark gray
  const colorAccent = '#cbd5e1'; // Silver accents
  const matProps = { roughness: 0.3, metalness: 0.6, clearcoat: 0.5 };
  const rubberProps = { roughness: 0.9, metalness: 0.1 };
  
  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* Base Pedestal (Parol6 has a flared/sturdy base) */}
      <Cylinder args={[0.07, 0.09, 0.04]} position={[0, 0.02, 0]} material-color={colorSecondary} castShadow receiveShadow {...rubberProps} />
      <Cylinder args={[0.065, 0.07, 0.10]} position={[0, 0.09, 0]} material-color={colorSecondary} castShadow receiveShadow {...matProps} />
      
      {/* Joint 1 (Z-axis rotation, mapped to Y in ThreeJS) */}
      <group position={[0, 0.14, 0]} rotation={[0, -j1, 0]}>
        {/* Shoulder Base Swivel */}
        <Cylinder args={[0.065, 0.065, 0.04]} position={[0, 0.02, 0]} material-color={colorPrimary} castShadow receiveShadow {...matProps} />
        
        {/* Shoulder Offset Block */}
        <RoundedBox args={[0.09, 0.08, 0.10]} position={[0, 0.08, 0]} radius={0.015} material-color={colorPrimary} castShadow receiveShadow {...matProps} />
        
        {/* Joint 2 (Z-axis rotation, bends arm along X) */}
        {/* Parol6 J2 is offset slightly to the side, let's keep it centered for IK simplicity but styled better */}
        <group position={[0, 0.12, 0]}>
          {/* Note: pseudo IK shifted j2 by -90, so we add Math.PI/2 to compensate visually */}
          <group rotation={[0, 0, -(j2 + Math.PI/2)]}>
            {/* J2 Motor Housing */}
            <Cylinder args={[0.05, 0.05, 0.12]} rotation={[Math.PI/2, 0, 0]} material-color={colorJoint} castShadow receiveShadow {...matProps} />
            <Cylinder args={[0.052, 0.052, 0.02]} position={[0, 0, 0.05]} rotation={[Math.PI/2, 0, 0]} material-color={colorAccent} castShadow receiveShadow {...matProps} />
            
            {/* Link 2 (Upper Arm L1 = 160 => 0.16) */}
            {/* Parol6 upper arm is a tapered shell */}
            <Cylinder args={[0.04, 0.05, 0.16]} position={[0, 0.08, 0]} material-color={colorPrimary} castShadow receiveShadow {...matProps} />
            
            {/* Joint 3 */}
            <group position={[0, 0.16, 0]}>
              <group rotation={[0, 0, (j3 - Math.PI/2)]}>
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
                    <group rotation={[0, 0, -(j5 + Math.PI/2)]}>
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

function PathVisualizer({ points, hasXYTable }: { points: RobotState['recordedPoints'], hasXYTable: boolean }) {
  const linePoints = useMemo(() => {
    return points.map(pt => {
      const baseTx = hasXYTable ? ((pt.tx || 0) / 1000) : 0;
      const baseTy = hasXYTable ? ((pt.ty || 0) / 1000) : 0;
      
      // In ThreeJS Y-up mapping:
      // PseudoIK uses atan2(y, x). X is left/right, Y is depth.
      // So ThreeJS X = pt.x, ThreeJS Z = -pt.y, ThreeJS Y = pt.z
      // The visual base of the robot is drawn slightly shifted up (by ~0.08), 
      // but if we just map directly to the global coordinates it should match the base center 0,0,0
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
        color="#06b6d4"
        lineWidth={4}
        dashed={false}
      />
      {linePoints.map((pt, i) => (
        <mesh key={i} position={pt}>
          <sphereGeometry args={[0.007, 16, 16]} />
          <meshBasicMaterial color={i === 0 ? "#22c55e" : i === linePoints.length - 1 ? "#ef4444" : "#06b6d4"} />
        </mesh>
      ))}
    </group>
  );
}

export function VirtualKinematics({ robot }: { robot: RobotState }) {
  const hasXYTable = robot.hasXYTable;
  const xyTable = robot.xyTable;

  // Convert mm to meters directly
  const tableW = xyTable ? (xyTable.tableSize.width / 1000) : 0;
  const tableL = xyTable ? (xyTable.tableSize.length / 1000) : 0;
  
  // Clamped position for visualization
  const px = xyTable ? (Math.max(0, Math.min(xyTable.pos.x, xyTable.tableSize.width)) / 1000) : 0;
  const py = xyTable ? (Math.max(0, Math.min(xyTable.pos.y, xyTable.tableSize.length)) / 1000) : 0;

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
      <Canvas shadows className="w-full h-full outline-none touch-none">
        <PerspectiveCamera makeDefault position={[0.4, 0.4, 0.6]} fov={45} />
        <OrbitControls target={[0.1, 0.1, 0]} makeDefault enableDamping dampingFactor={0.05} />
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
        
        <PathVisualizer points={robot.recordedPoints} hasXYTable={hasXYTable} />

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
