import React from 'react';
import { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useHydraStore } from '../store';
import { TransformControls } from '@react-three/drei';
import { OrbitControls, Box, Cylinder, Line, RoundedBox, PerspectiveCamera, Html } from '@react-three/drei';
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
        <Box args={[0.04, 0.06, 0.04]} position={[0, 0.03, 0]} material-color="#00E5FF" castShadow />
        <Cylinder args={[0.01, 0.005, 0.02]} position={[0, 0.07, 0]} material-color="#f59e0b" castShadow />
      </group>
    );
  }
  if (tool.includes('Vacuum') || tool.includes('Suction')) {
    return (
      <group position={[0, 0, 0]}>
        <Cylinder args={[0.02, 0.02, 0.06]} position={[0, 0.03, 0]} material-color="#2D3748" castShadow />
        <Cylinder args={[0.005, 0.005, 0.02]} position={[0, 0.07, 0]} material-color="#2D3748" castShadow />
      </group>
    );
  }
  if (tool.includes('Gripper')) {
    return (
      <group position={[0, 0, 0]}>
        <Box args={[0.04, 0.02, 0.02]} position={[0, 0.01, 0]} material-color="#94a3b8" castShadow />
        <Box args={[0.008, 0.04, 0.01]} position={[-0.016, 0.03, 0]} material-color="#00FF66" castShadow />
        <Box args={[0.008, 0.04, 0.01]} position={[0.016, 0.03, 0]} material-color="#00FF66" castShadow />
      </group>
    );
  }
  if (tool.includes('Camera') || tool.includes('Microscope')) {
    return (
      <group position={[0, 0, 0]}>
        <Box args={[0.04, 0.04, 0.04]} position={[0, 0.02, 0]} material-color="#121720" castShadow />
        <Cylinder args={[0.01, 0.01, 0.02]} position={[0, 0.04, 0.02]} rotation={[Math.PI/2, 0, 0]} material-color="#0284c7" castShadow />
        <Cylinder args={[0.008, 0.008, 0.005]} position={[0, 0.04, 0.035]} rotation={[Math.PI/2, 0, 0]} material-color="#f8fafc" castShadow />
      </group>
    );
  }
  if (tool.includes('Spindle') || tool.includes('Rotary')) {
    return (
      <group position={[0, 0, 0]}>
        <Cylinder args={[0.02, 0.02, 0.08]} position={[0, 0.04, 0]} material-color="#00FF66" castShadow />
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

  const colorPrimary = '#FF6600'; // Brighter orange for Parol6
  const colorSecondary = '#1A202C'; // Darker base
  const colorJoint = '#2D3748'; // Metallic dark gray
  const colorAccent = '#00FF66'; // Silver accents
  const matProps = { roughness: 0.3, metalness: 0.6, clearcoat: 0.5 };
  const rubberProps = { roughness: 0.9, metalness: 0.1 };
  
  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* Base Pedestal (Parol6 has a flared/sturdy base) */}
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
            {/* Parol6 upper arm is a tapered shell */}
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
        color="#00E5FF"
        lineWidth={4}
        dashed={false}
      />
      {linePoints.map((pt, i) => (
        <mesh key={i} position={pt}>
          <sphereGeometry args={[0.007, 16, 16]} />
          <meshBasicMaterial color={i === 0 ? "#22c55e" : i === linePoints.length - 1 ? "#ef4444" : "#00E5FF"} />
        </mesh>
      ))}
    </group>
  );
}


function ATC3DView({ atc }: { atc: any }) {
  if (atc.type === 'vertical_panel' || atc.type === 'horizontal_panel') {
    const [rows, cols] = atc.panelGrid.split('x').map(Number);
    const cellW = 0.08;
    const cellH = 0.08;
    const w = cols * cellW;
    const h = rows * cellH;
    return (
      <group>
        <Box args={[w, 0.05, h]} position={[w/2 - cellW/2, 0.025, h/2 - cellH/2]} material-color="#334155" castShadow receiveShadow />
        {Array.from({ length: rows * cols }).map((_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const tool = atc.tools.find((t: any) => t.slot === i)?.tool || 'None';
          return (
            <group key={i} position={[c * cellW, 0.05, r * cellH]}>
              <Cylinder args={[0.015, 0.015, 0.01]} position={[0, 0.005, 0]} material-color="#0f172a" />
              {tool !== 'None' && (
                <group position={[0, 0.01, 0]}>
                  <Toolhead tool={tool} />
                </group>
              )}
            </group>
          );
        })}
      </group>
    );
  } else {
    const slots = atc.revolverSlots;
    const radius = Math.max(0.1, slots * 0.015);
    return (
      <group>
        <Cylinder args={[radius, radius, 0.05]} position={[0, 0.025, 0]} material-color="#334155" castShadow receiveShadow />
        <Cylinder args={[0.02, 0.02, 0.1]} position={[0, 0.05, 0]} material-color="#1e293b" castShadow receiveShadow />
        {Array.from({ length: slots }).map((_, i) => {
          const angle = (i / slots) * Math.PI * 2;
          const cx = Math.cos(angle) * radius * 0.8;
          const cy = Math.sin(angle) * radius * 0.8;
          const tool = atc.tools.find((t: any) => t.slot === i)?.tool || 'None';
          return (
            <group key={i} position={[cx, 0.05, cy]}>
              <Cylinder args={[0.015, 0.015, 0.02]} position={[0, 0.01, 0]} material-color="#0f172a" />
              {tool !== 'None' && (
                <group position={[0, 0.02, 0]}>
                  <Toolhead tool={tool} />
                </group>
              )}
            </group>
          );
        })}
      </group>
    );
  }
}



function Rack3DView({ rack, type }: { rack: any, type: string }) {
  const cap = rack.capacity || 24;
  const plateThickness = 0.002;
  const pitch = 0.01;
  const w = 0.16;
  const d = 0.16;
  const color = type === 'Input' ? "#0ea5e9" : type === 'Output' ? "#10b981" : "#64748b";
  
  return (
    <group>
      {/* Base */}
      <Box args={[w + 0.02, 0.02, d + 0.02]} position={[0, 0.01, 0]} material-color="#334155" castShadow receiveShadow />
      
      {/* Side walls (vertical) */}
      <Box args={[0.01, cap * pitch + 0.04, d]} position={[-w/2 - 0.005, (cap * pitch + 0.04)/2, 0]} material-color="#1e293b" castShadow receiveShadow />
      <Box args={[0.01, cap * pitch + 0.04, d]} position={[w/2 + 0.005, (cap * pitch + 0.04)/2, 0]} material-color="#1e293b" castShadow receiveShadow />
      
      {/* Plates / Slots */}
      {Array.from({ length: cap }).map((_, i) => {
        const y = 0.04 + i * pitch; // Start slightly above base
        const valid = rack.usableSlots?.[i] ?? true;
        return (
          <group key={i} position={[0, y, 0]}>
            {/* Slot indicator / plate */}
            <Box args={[w, plateThickness, d]} position={[0, 0, 0]} material-color={valid ? color : "#ff0000"} material-transparent material-opacity={valid ? 0.6 : 0.2} />
          </group>
        );
      })}
    </group>
  );
}


type DraggableGizmoProps = {
  position: [number, number, number];
  controlMode: 'translate' | 'rotate' | 'scale' | 'none';
  onMouseUp: (e: any) => void;
  children: React.ReactNode;
  initialRotation?: number;
  scale?: [number, number, number];
};

function DraggableGizmo({ position, controlMode, onMouseUp, children, initialRotation = 0, scale = [1, 1, 1] }: DraggableGizmoProps) {
  const coordRef = React.useRef<HTMLDivElement>(null);
  const objRef = React.useRef<THREE.Group>(null as any);

  return (
    <>
      {controlMode !== 'none' && (
        <TransformControls
          object={objRef}
          size={controlMode === 'rotate' ? 0.75 : 1.5}
          mode={controlMode as 'translate' | 'rotate' | 'scale'}
          showX={controlMode === 'translate'}
          showY={controlMode === 'rotate'}
          showZ={controlMode === 'translate'}
          onChange={(e: any) => {
            if (e?.target?.object && coordRef.current) {
              const x = (e.target.object.position.x * 1000).toFixed(0);
              const y = (e.target.object.position.z * 1000).toFixed(0);
              const r = (e.target.object.rotation.y * 180 / Math.PI).toFixed(0);
              if (controlMode === 'scale') { coordRef.current.innerText = `Scale: ${e?.target?.object?.scale?.x?.toFixed(2)}`; } else { coordRef.current.innerText = `X: ${x} Y: ${y} R: ${r}°`; }
            }
          }}
          onMouseUp={onMouseUp}
        />
      )}
      <group ref={objRef} position={position} scale={scale}>
        {controlMode !== 'none' && (
          <Html position={[0, 0.4, 0]} center zIndexRange={[100, 0]}>
            <div 
              ref={coordRef}
              className="bg-slate-950/90 backdrop-blur text-sky-400 font-mono text-[10px] font-bold px-2 py-1 rounded border border-slate-700 whitespace-nowrap pointer-events-none shadow-lg"
            >
              X: {(position[0] * 1000).toFixed(0)} Y: {(position[2] * 1000).toFixed(0)} R: {(initialRotation * 180 / Math.PI).toFixed(0)}°
            </div>
          </Html>
        )}
        {children}
      </group>
    </>
  );
}

export function VirtualKinematics({ robot, controlMode }: { robot: RobotState; controlMode: 'translate' | 'rotate' | 'scale' | 'none' }) {
  const { updateRobot, settings, robots } = useHydraStore();

  const hasXYTable = robot.hasXYTable;
  const xyTable = robot.xyTable;

  // Convert mm to meters directly
  const tableW = xyTable ? (xyTable.tableSize.width / 1000) : 0;
  const tableL = xyTable ? (xyTable.tableSize.length / 1000) : 0;
  
  // Clamped position for visualization
  const px = xyTable ? (Math.max(0, Math.min(xyTable.pos.x, xyTable.tableSize.width)) / 1000) : 0;
  const py = xyTable ? (Math.max(0, Math.min(xyTable.pos.y, xyTable.tableSize.length)) / 1000) : 0;

  const combinedRobots = robot.combinedWith ? robots.filter(r => robot.combinedWith?.includes(r.id)) : [];


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
        
        <color attach="background" args={[settings.theme.includes('Light') ? '#e2e8f0' : '#07090C']} />
        
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#00E5FF" />

        {/* ATC Visualization */}
        {robot.atc && (
          <DraggableGizmo 
            position={[(robot.atc.renderPos?.x || -300) / 1000, 0, (robot.atc.renderPos?.y || 200) / 1000]}
            controlMode={controlMode}
            initialRotation={robot.atc.renderRot || 0}
            onMouseUp={(e: any) => {
              if (e.target.object) {
                updateRobot(robot.id, {
                  atc: {
                    ...robot.atc as any,
                    renderPos: {
                      x: e.target.object.position.x * 1000,
                      y: e.target.object.position.z * 1000
                    },
                    renderRot: e.target.object.rotation.y
                  }
                });
              }
            }}
          >
            <group scale={[2, 2, 2]} rotation={[0, robot.atc.renderRot || 0, 0]}><ATC3DView atc={robot.atc} /></group>
          </DraggableGizmo>
        )}

        {/* Rack 1 */}
        {robot.rackSystem?.enabled && robot.rackSystem.rack1.type !== 'None' && (
          <DraggableGizmo 
            position={[(robot.rackSystem.rack1.renderPos?.x || 300) / 1000, 0, (robot.rackSystem.rack1.renderPos?.y || 200) / 1000]}
            controlMode={controlMode}
            initialRotation={robot.rackSystem.rack1.renderRot || 0}
            onMouseUp={(e: any) => {
              if (e.target.object) {
                updateRobot(robot.id, {
                  rackSystem: {
                    ...robot.rackSystem,
                    rack1: {
                      ...robot.rackSystem.rack1,
                      renderPos: {
                        x: e.target.object.position.x * 1000,
                        y: e.target.object.position.z * 1000
                      },
                      renderRot: e.target.object.rotation.y
                    }
                  }
                });
              }
            }}
          >
            <group scale={[2, 2, 2]} rotation={[0, robot.rackSystem.rack1.renderRot || 0, 0]}><Rack3DView rack={robot.rackSystem.rack1} type={robot.rackSystem.rack1.type} /></group>
          </DraggableGizmo>
        )}

        {/* Rack 2 */}
        {robot.rackSystem?.enabled && robot.rackSystem.rack2.type !== 'None' && (
          <DraggableGizmo 
            position={[(robot.rackSystem.rack2.renderPos?.x || 300) / 1000, 0, (robot.rackSystem.rack2.renderPos?.y || -200) / 1000]}
            controlMode={controlMode}
            initialRotation={robot.rackSystem.rack2.renderRot || 0}
            onMouseUp={(e: any) => {
              if (e.target.object) {
                updateRobot(robot.id, {
                  rackSystem: {
                    ...robot.rackSystem,
                    rack2: {
                      ...robot.rackSystem.rack2,
                      renderPos: {
                        x: e.target.object.position.x * 1000,
                        y: e.target.object.position.z * 1000
                      },
                      renderRot: e.target.object.rotation.y
                    }
                  }
                });
              }
            }}
          >
            <group scale={[2, 2, 2]} rotation={[0, robot.rackSystem.rack2.renderRot || 0, 0]}><Rack3DView rack={robot.rackSystem.rack2} type={robot.rackSystem.rack2.type} /></group>
          </DraggableGizmo>
        )}

        
        {combinedRobots.map(combinedRobot => (
          <DraggableGizmo
              key={combinedRobot.id}
              position={[(combinedRobot.pos?.tx || 500) / 1000, 0, (combinedRobot.pos?.ty || 500) / 1000]}
              scale={[combinedRobot.renderScale || 0.5, combinedRobot.renderScale || 0.5, combinedRobot.renderScale || 0.5]}
              controlMode={controlMode}
              initialRotation={combinedRobot.pos?.trz || 0}
              onMouseUp={(e: any) => {
                 if (e.target.object) {
                    const newTx = e.target.object.position.x * 1000;
                    const newTy = e.target.object.position.z * 1000;
                    updateRobot(combinedRobot.id, {
                        pos: {
                            ...combinedRobot.pos,
                            tx: newTx,
                            ty: newTy,
                            trz: e.target.object.rotation.y
                        },
                        renderScale: e.target.object.scale.x
                    });
                 }
              }}
            >
              <group rotation={[0, combinedRobot.pos?.trz || 0, 0]}>
                <RobotArm robot={combinedRobot} />
              </group>
          </DraggableGizmo>
        ))}

        {hasXYTable ? (
          <DraggableGizmo
            position={[(robot.xyTable?.worldPos?.x || -tableW * 500) / 1000, 0, (robot.xyTable?.worldPos?.y || -tableL * 500) / 1000]}
            controlMode={controlMode}
            initialRotation={robot.xyTable?.worldRot || 0}
            onMouseUp={(e: any) => {
              if (e.target.object) {
                updateRobot(robot.id, {
                  xyTable: {
                    ...robot.xyTable as any,
                    worldPos: {
                      x: e.target.object.position.x * 1000,
                      y: e.target.object.position.z * 1000
                    },
                    worldRot: e.target.object.rotation.y
                  }
                });
              }
            }}
          >
            <group position={[0, 0, 0]} rotation={[0, robot.xyTable?.worldRot || 0, 0]}>
              <group scale={[2, 2, 2]}>
                <group position={[0, 0.08, 0]}>
                  <PathVisualizer points={robot.recordedPoints} hasXYTable={hasXYTable} />
                </group>
                {/* Table Bed */}
                <Box args={[tableW, 0.02, tableL]} position={[tableW/2, 0.01, tableL/2]} material-color="#121720" castShadow receiveShadow />
                  
                {/* Rails */}
                <Cylinder args={[0.01, 0.01, tableW]} rotation={[0, 0, Math.PI/2]} position={[tableW/2, 0.04, 0.05]} material-color="#2D3748" />
                <Cylinder args={[0.01, 0.01, tableW]} rotation={[0, 0, Math.PI/2]} position={[tableW/2, 0.04, tableL - 0.05]} material-color="#2D3748" />
              </group>
              {/* Robot Base Mount on XY table */}
              <DraggableGizmo
                position={[px, 0.04, py]}
                scale={[robot.renderScale || 0.5, robot.renderScale || 0.5, robot.renderScale || 0.5]}
                controlMode={controlMode}
                onMouseUp={(e: any) => {
                  if (e.target.object) {
                    const newX = e.target.object.position.x * 1000;
                    const newY = e.target.object.position.z * 1000;
                    updateRobot(robot.id, { 
                      xyTable: { 
                        ...robot.xyTable, 
                        pos: { x: newX, y: newY } 
                      },
                      renderScale: e.target.object.scale.x
                    });
                  }
                }}
              >
                <Box args={[0.2, 0.04, 0.2]} position={[0, 0.02, 0]} material-color="#475569" castShadow receiveShadow />
                <group position={[0, 0.04, 0]}>
                  <RobotArm robot={robot} />
                </group>
              </DraggableGizmo>
            </group>
          </DraggableGizmo>
        ) : (
          <group>
            <PathVisualizer points={robot.recordedPoints} hasXYTable={hasXYTable} />
            <DraggableGizmo
              position={[(robot.pos?.tx || 0) / 1000, 0, (robot.pos?.ty || 0) / 1000]}
              scale={[robot.renderScale || 0.5, robot.renderScale || 0.5, robot.renderScale || 0.5]}
              controlMode={controlMode}
              initialRotation={robot.pos?.trz || 0}
              onMouseUp={(e: any) => {
                 if (e.target.object) {
                    const newTx = e.target.object.position.x * 1000;
                    const newTy = e.target.object.position.z * 1000;
                    updateRobot(robot.id, {
                        pos: {
                            ...robot.pos,
                            tx: newTx,
                            ty: newTy,
                            trz: e.target.object.rotation.y
                        },
                        renderScale: e.target.object.scale.x
                    });
                 }
              }}
            >
              <group rotation={[0, robot.pos?.trz || 0, 0]}>
                <RobotArm robot={robot} />
              </group>
            </DraggableGizmo>
          </group>
        )}

        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 + 0.1} minDistance={0.5} maxDistance={6} target={hasXYTable ? [0, 0.4, 0] : [0, 0.4, 0]} />
      </Canvas>
    </div>
  );
}
