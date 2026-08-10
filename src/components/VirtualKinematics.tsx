import React, { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, TransformControls, Box, Cylinder, Sphere, RoundedBox, Line, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useHydraStore, type RobotState } from '../store';
import Toolhead from './3d/Toolhead';
import RobotArm from './3d/RobotArm';
import PathVisualizer from './3d/PathVisualizer';
import SharedModule3DView from './3d/SharedModule3DView';
import ATC3DView from './3d/ATC3DView';
import Rack3DView from './3d/Rack3DView';
import DraggableGizmo from './3d/DraggableGizmo';

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
        
        {/* Global Floor / Table Area */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[5, 5]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
        <gridHelper args={[5, 50, '#cbd5e1', '#cbd5e1']} position={[0, -0.005, 0]} />

        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#00E5FF" />

        {/* ATC Visualization */}
        {robot.atc && (
          <DraggableGizmo 
            position={[(robot.atc.renderPos?.x || -300) / 1000, 0, (robot.atc.renderPos?.y || 200) / 1000]}
            scale={[robot.atc.renderScale || 1, robot.atc.renderScale || 1, robot.atc.renderScale || 1]}
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
                    renderRot: e.target.object.rotation.y,
                    renderScale: e.target.object.scale.x
                  }
                });
              }
            }}
          >
            <ATC3DView atc={robot.atc} />
          </DraggableGizmo>
        )}

        {/* Rack 1 */}
        {robot.rackSystem?.enabled && robot.rackSystem.rack1.type !== 'None' && (
          <DraggableGizmo 
            position={[(robot.rackSystem.rack1.renderPos?.x || 300) / 1000, 0, (robot.rackSystem.rack1.renderPos?.y || 200) / 1000]}
            scale={[robot.rackSystem.rack1.renderScale || 1, robot.rackSystem.rack1.renderScale || 1, robot.rackSystem.rack1.renderScale || 1]}
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
                      renderRot: e.target.object.rotation.y,
                      renderScale: e.target.object.scale.x
                    }
                  }
                });
              }
            }}
          >
            <Rack3DView rack={robot.rackSystem.rack1} type={robot.rackSystem.rack1.type} />
          </DraggableGizmo>
        )}

        
        {robot.juanenPnP?.enabled && (
          <DraggableGizmo
            position={[(robot.juanenPnP.worldPos?.x || -100) / 1000, 0, (robot.juanenPnP.worldPos?.y || -100) / 1000]}
            scale={[robot.juanenPnP.renderScale || 1, robot.juanenPnP.renderScale || 1, robot.juanenPnP.renderScale || 1]}
            controlMode={controlMode}
            initialRotation={robot.juanenPnP.worldRot || 0}
            onMouseUp={(e: any) => {
              if (e.target.object) {
                updateRobot(robot.id, { juanenPnP: { ...robot.juanenPnP, worldPos: { x: e.target.object.position.x * 1000, y: e.target.object.position.z * 1000 }, worldRot: e.target.object.rotation.y, renderScale: e.target.object.scale.x } } as any);
              }
            }}
          >
            <SharedModule3DView module={robot.juanenPnP} type="juanenPnP" />
          </DraggableGizmo>
        )}
        
        {robot.lumenPnP?.enabled && (
          <DraggableGizmo
            position={[(robot.lumenPnP.worldPos?.x || 100) / 1000, 0, (robot.lumenPnP.worldPos?.y || -100) / 1000]}
            scale={[robot.lumenPnP.renderScale || 1, robot.lumenPnP.renderScale || 1, robot.lumenPnP.renderScale || 1]}
            controlMode={controlMode}
            initialRotation={robot.lumenPnP.worldRot || 0}
            onMouseUp={(e: any) => {
              if (e.target.object) {
                updateRobot(robot.id, { lumenPnP: { ...robot.lumenPnP, worldPos: { x: e.target.object.position.x * 1000, y: e.target.object.position.z * 1000 }, worldRot: e.target.object.rotation.y, renderScale: e.target.object.scale.x } } as any);
              }
            }}
          >
            <SharedModule3DView module={robot.lumenPnP} type="lumenPnP" />
          </DraggableGizmo>
        )}

        {robot.juanenCNC?.enabled && (
          <DraggableGizmo
            position={[(robot.juanenCNC.worldPos?.x || 200) / 1000, 0, (robot.juanenCNC.worldPos?.y || 200) / 1000]}
            scale={[robot.juanenCNC.renderScale || 1, robot.juanenCNC.renderScale || 1, robot.juanenCNC.renderScale || 1]}
            controlMode={controlMode}
            initialRotation={robot.juanenCNC.worldRot || 0}
            onMouseUp={(e: any) => {
              if (e.target.object) {
                updateRobot(robot.id, { juanenCNC: { ...robot.juanenCNC, worldPos: { x: e.target.object.position.x * 1000, y: e.target.object.position.z * 1000 }, worldRot: e.target.object.rotation.y, renderScale: e.target.object.scale.x } } as any);
              }
            }}
          >
            <SharedModule3DView module={robot.juanenCNC} type="juanenCNC" />
          </DraggableGizmo>
        )}

        {robot.juanenLaser?.enabled && (
          <DraggableGizmo
            position={[(robot.juanenLaser.worldPos?.x || -200) / 1000, 0, (robot.juanenLaser.worldPos?.y || 200) / 1000]}
            scale={[robot.juanenLaser.renderScale || 1, robot.juanenLaser.renderScale || 1, robot.juanenLaser.renderScale || 1]}
            controlMode={controlMode}
            initialRotation={robot.juanenLaser.worldRot || 0}
            onMouseUp={(e: any) => {
              if (e.target.object) {
                updateRobot(robot.id, { juanenLaser: { ...robot.juanenLaser, worldPos: { x: e.target.object.position.x * 1000, y: e.target.object.position.z * 1000 }, worldRot: e.target.object.rotation.y, renderScale: e.target.object.scale.x } } as any);
              }
            }}
          >
            <SharedModule3DView module={robot.juanenLaser} type="juanenLaser" />
          </DraggableGizmo>
        )}

        {robot.vacuumTable?.enabled && (
          <DraggableGizmo
            position={[(robot.vacuumTable.worldPos?.x || -300) / 1000, 0, (robot.vacuumTable.worldPos?.y || 0) / 1000]}
            scale={[robot.vacuumTable.renderScale || 1, robot.vacuumTable.renderScale || 1, robot.vacuumTable.renderScale || 1]}
            controlMode={controlMode}
            initialRotation={robot.vacuumTable.worldRot || 0}
            onMouseUp={(e: any) => {
              if (e.target.object) {
                updateRobot(robot.id, { vacuumTable: { ...robot.vacuumTable, worldPos: { x: e.target.object.position.x * 1000, y: e.target.object.position.z * 1000 }, worldRot: e.target.object.rotation.y, renderScale: e.target.object.scale.x } } as any);
              }
            }}
          >
            <SharedModule3DView module={robot.vacuumTable} type="vacuumTable" />
          </DraggableGizmo>
        )}

        {robot.heatedBed?.enabled && (
          <DraggableGizmo
            position={[(robot.heatedBed.worldPos?.x || 300) / 1000, 0, (robot.heatedBed.worldPos?.y || 0) / 1000]}
            scale={[robot.heatedBed.renderScale || 1, robot.heatedBed.renderScale || 1, robot.heatedBed.renderScale || 1]}
            controlMode={controlMode}
            initialRotation={robot.heatedBed.worldRot || 0}
            onMouseUp={(e: any) => {
              if (e.target.object) {
                updateRobot(robot.id, { heatedBed: { ...robot.heatedBed, worldPos: { x: e.target.object.position.x * 1000, y: e.target.object.position.z * 1000 }, worldRot: e.target.object.rotation.y, renderScale: e.target.object.scale.x } } as any);
              }
            }}
          >
            <SharedModule3DView module={robot.heatedBed} type="heatedBed" />
          </DraggableGizmo>
        )}

        {/* Rack 2 */}
        {robot.rackSystem?.enabled && robot.rackSystem.rack2.type !== 'None' && (
          <DraggableGizmo 
            position={[(robot.rackSystem.rack2.renderPos?.x || 300) / 1000, 0, (robot.rackSystem.rack2.renderPos?.y || -200) / 1000]}
            scale={[robot.rackSystem.rack2.renderScale || 1, robot.rackSystem.rack2.renderScale || 1, robot.rackSystem.rack2.renderScale || 1]}
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
                      renderRot: e.target.object.rotation.y,
                      renderScale: e.target.object.scale.x
                    }
                  }
                });
              }
            }}
          >
            <Rack3DView rack={robot.rackSystem.rack2} type={robot.rackSystem.rack2.type} />
          </DraggableGizmo>
        )}

        
        {combinedRobots.map((combinedRobot, i) => (
          <DraggableGizmo
              key={combinedRobot.id}
              position={[(combinedRobot.pos?.tx ?? (500 + i * 300)) / 1000, 0, (combinedRobot.pos?.ty ?? 500) / 1000]}
              scale={[combinedRobot.renderScale || 1, combinedRobot.renderScale || 1, combinedRobot.renderScale || 1]}
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
            scale={[robot.xyTable?.renderScale || 1, robot.xyTable?.renderScale || 1, robot.xyTable?.renderScale || 1]}
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
                    worldRot: e.target.object.rotation.y,
                    renderScale: e.target.object.scale.x
                  }
                });
              }
            }}
          >
            <group position={[0, 0, 0]} rotation={[0, robot.xyTable?.worldRot || 0, 0]}>
              <group position={[0, 0.08, 0]} scale={[(robot.renderScale || 1) / (robot.xyTable?.renderScale || 1), (robot.renderScale || 1) / (robot.xyTable?.renderScale || 1), (robot.renderScale || 1) / (robot.xyTable?.renderScale || 1)]}>
                <PathVisualizer points={robot.recordedPoints} hasXYTable={hasXYTable} />
              </group>
              {/* Table Bed */}
              <Box args={[tableW, 0.02, tableL]} position={[tableW/2, 0.01, tableL/2]} material-color="#121720" castShadow receiveShadow />
                
              {/* Rails */}
              <Cylinder args={[0.01, 0.01, tableW]} rotation={[0, 0, Math.PI/2]} position={[tableW/2, 0.04, 0.05]} material-color="#2D3748" />
              <Cylinder args={[0.01, 0.01, tableW]} rotation={[0, 0, Math.PI/2]} position={[tableW/2, 0.04, tableL - 0.05]} material-color="#2D3748" />
              {/* Robot Base Mount on XY table */}
              <DraggableGizmo
                position={[px, 0.04, py]}
                scale={[(robot.renderScale || 1) / (robot.xyTable?.renderScale || 1), (robot.renderScale || 1) / (robot.xyTable?.renderScale || 1), (robot.renderScale || 1) / (robot.xyTable?.renderScale || 1)]}
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
                      renderScale: e.target.object.scale.x * (robot.xyTable?.renderScale || 1)
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
              scale={[robot.renderScale || 1, robot.renderScale || 1, robot.renderScale || 1]}
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
