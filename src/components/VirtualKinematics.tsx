// =============================================================================
// HYDRA-UMC STUDIO - React Component: VirtualKinematics.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useHydraStore, type RobotState } from '../store';
import RobotArm from './3d/RobotArm';
import PathVisualizer from './3d/PathVisualizer';
import SharedModule3DView from './3d/SharedModule3DView';
import ATC3DView from './3d/ATC3DView';
import Rack3DView from './3d/Rack3DView';
import DraggableGizmo from './3d/DraggableGizmo';

/**
 * Executes the  camera animator logic. 
 * This function handles the necessary computations and state updates.
 */
function CameraAnimator({ targetPosition, targetFocus, trigger, controlsRef, initialView }: { targetPosition: [number, number, number], targetFocus: [number, number, number], trigger?: number, controlsRef: React.MutableRefObject<any>, initialView?: { position: [number, number, number], target: [number, number, number] } }) {
  const { camera } = useThree();
  const isCentering = useRef(false);
  const lastTrigger = useRef(trigger);
  const initialized = useRef(false);

  const targetPos = useMemo(() => new THREE.Vector3(...targetPosition), [targetPosition]);
  const targetFoc = useMemo(() => new THREE.Vector3(...targetFocus), [targetFocus]);

  useEffect(() => {
    if (trigger && trigger !== lastTrigger.current) {
      isCentering.current = true;
      lastTrigger.current = trigger;
    }
  }, [trigger]);

  useFrame((state, delta) => {
    if (controlsRef.current && !initialized.current) {
      if (initialView) {
        camera.position.set(...initialView.position);
        controlsRef.current.target.set(...initialView.target);
      } else {
        camera.position.set(...targetPosition);
        controlsRef.current.target.set(...targetFocus);
      }
      controlsRef.current.update();
      initialized.current = true;
    }

    if (isCentering.current && controlsRef.current) {
      const step = 4 * delta;
      camera.position.lerp(targetPos, step);
      controlsRef.current.target.lerp(targetFoc, step);
      controlsRef.current.update();

      if (camera.position.distanceTo(targetPos) < 0.01 && controlsRef.current.target.distanceTo(targetFoc) < 0.01) {
        isCentering.current = false;
      }
    }
  });
  return null;
}

/**
 * Executes the  virtual kinematics logic. 
 * This function handles the necessary computations and state updates.
 */
export function VirtualKinematics({ robot, controlMode, onSelectRobot }: { robot: RobotState; controlMode: 'translate' | 'rotate' | 'scale' | 'none'; onSelectRobot?: (robotId: number) => void }) {
  const { updateRobot, settings, robots } = useHydraStore();
  const controlsRef = useRef<any>(null);

  const hasXYTable = robot.hasXYTable;
  const xyTable = robot.xyTable;

  // Convert mm to meters directly - tableSize/pos defensively optional-
  // chained with a fallback (matches the same safe pattern the classic XY
  // table panel/XYTableOverlay already use for these exact same fields,
  // e.g. `xyTable?.tableSize?.width || 500`) rather than assuming xyTable
  // is either absent or fully populated. A partial xyTable (missing
  // tableSize specifically) reached this component for real once - a
  // server.ts jog broadcast that patched only { xyTable: { pos } },
  // silently wiping tableSize/worldPos/renderScale/worldRot on every OTHER
  // connected client's shallow delta-merge (store.tsx's own
  // applyRobotDelta) - server.ts now sends the complete xyTable object, but
  // this stays defensive rather than trusting every future patch always
  // will.
  const tableW = xyTable ? ((xyTable.tableSize?.width || 500) / 1000) : 0;
  const tableL = xyTable ? ((xyTable.tableSize?.length || 500) / 1000) : 0;

  // Calculate Target Center for Camera
  const targetX = hasXYTable
    ? ((xyTable?.worldPos?.x ?? -tableW * 500) / 1000) + tableW / 2
    : (robot.pos?.tx || 0) / 1000;

  const targetZ = hasXYTable
    ? ((xyTable?.worldPos?.y ?? -tableL * 500) / 1000) + tableL / 2
    : (robot.pos?.ty || 0) / 1000;

  // Clamped position for visualization
  const px = xyTable ? (Math.max(0, Math.min(xyTable.pos?.x || 0, xyTable.tableSize?.width || 500)) / 1000) : 0;
  const py = xyTable ? (Math.max(0, Math.min(xyTable.pos?.y || 0, xyTable.tableSize?.length || 500)) / 1000) : 0;

  const combinedRobots = robot.combinedWith ? robots.filter(r => robot.combinedWith?.includes(r.id)) : [];


  return (
    <div
      className="w-full h-full min-h-0 min-w-0 bg-slate-950 relative rounded-xl overflow-hidden"
      ref={(el) => {
        // Real, permanent defensive check: this div's own size is entirely
        // inherited from its ancestor chain's flex/h-full sizing (see
        // RobotDetail.tsx's own viewportOnly layout) - a 0x0 result here
        // means Canvas below has nothing to render into, which looks
        // identical to a genuine WebGL failure from outside (both just
        // render nothing) but is actually a layout/sizing bug, not a
        // renderer one. Warns once per mount rather than failing silently
        // the way this went unnoticed for a long time in
        // HYDRA-UMC-ANDROID-CONTROL's own embedded WebView specifically -
        // the actual cause there ended up being outside this whole CSS
        // chain entirely (Compose never giving that WebView real
        // LayoutParams, see ThreeDScreen.kt), which is exactly why this
        // stays generic ("check what's hosting this component") instead
        // of pointing at one specific suspect.
        if (el && (el.clientWidth === 0 || el.clientHeight === 0)) {
          console.warn(`[VirtualKinematics] 3D viewport container has zero size (${el.clientWidth}x${el.clientHeight}) - the WebGL canvas below has nothing to render into. Check whatever is hosting this component (ancestor flex/height chain, or an embedding WebView's own sizing).`);
        }
      }}
    >
      <Canvas shadows className="w-full h-full outline-none touch-none">
        <PerspectiveCamera makeDefault fov={45} />
        <CameraAnimator 
          targetPosition={[targetX + 0.5, 0.4, targetZ + 0.6]} 
          targetFocus={[targetX, 0.2, targetZ]} 
          trigger={robot.centerCameraTrigger} 
          controlsRef={controlsRef} 
          initialView={robot.cameraView}
        />
        
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

        
        {combinedRobots.map((combinedRobot, i) => {
          const cHasTable = combinedRobot.hasXYTable && combinedRobot.xyTable;
          // Same defensive fallback as tableW/tableL above - see that
          // block's own comment.
          const cTableW = cHasTable ? ((combinedRobot.xyTable!.tableSize?.width || 500) / 1000) : 0;
          const cTableL = cHasTable ? ((combinedRobot.xyTable!.tableSize?.length || 500) / 1000) : 0;
          
          const gizmoX = cHasTable 
            ? (combinedRobot.xyTable!.worldPos?.x ?? (500 + i * 300)) / 1000
            : (combinedRobot.pos?.tx ?? (500 + i * 300)) / 1000;
          const gizmoZ = cHasTable
            ? (combinedRobot.xyTable!.worldPos?.y ?? 500) / 1000
            : (combinedRobot.pos?.ty ?? 500) / 1000;
          const gizmoRot = cHasTable
            ? (combinedRobot.xyTable!.worldRot ?? 0)
            : (combinedRobot.pos?.trz ?? 0);

          return (
            <DraggableGizmo 
                key={combinedRobot.id}
                position={[gizmoX, 0, gizmoZ]}
                scale={[combinedRobot.renderScale || 1, combinedRobot.renderScale || 1, combinedRobot.renderScale || 1]}
                controlMode={controlMode}
                initialRotation={gizmoRot}
                onMouseUp={(e: any) => {
                   if (e.target.object) {
                      const newTx = e.target.object.position.x * 1000;
                      const newTy = e.target.object.position.z * 1000;
                      
                      if (cHasTable) {
                         updateRobot(combinedRobot.id, {
                           xyTable: {
                             ...combinedRobot.xyTable as any,
                             worldPos: { x: newTx, y: newTy },
                             worldRot: e.target.object.rotation.y
                           },
                           renderScale: e.target.object.scale.x
                         });
                      } else {
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
                   }
                }}
              >
                {cHasTable ? (
                   <group
                     onDoubleClick={(e: any) => { e.stopPropagation(); onSelectRobot?.(combinedRobot.id); }}
                     onPointerOver={() => onSelectRobot && (document.body.style.cursor = 'pointer')}
                     onPointerOut={() => onSelectRobot && (document.body.style.cursor = 'auto')}
                   >
                     <group position={[0, 0.08, 0]} scale={[(combinedRobot.renderScale || 1) / (combinedRobot.xyTable!.renderScale || 1), (combinedRobot.renderScale || 1) / (combinedRobot.xyTable!.renderScale || 1), (combinedRobot.renderScale || 1) / (combinedRobot.xyTable!.renderScale || 1)]}>
                       <PathVisualizer points={combinedRobot.recordedPoints} hasXYTable={true} model={combinedRobot.model} />
                     </group>
                     <Box args={[cTableW, 0.02, cTableL]} position={[cTableW/2, 0.01, cTableL/2]} material-color="#121720" castShadow receiveShadow />
                     <group position={[(combinedRobot.pos?.tx || 0) / 1000, 0.08, (combinedRobot.pos?.ty || 0) / 1000]} scale={[(combinedRobot.renderScale || 1) / (combinedRobot.xyTable!.renderScale || 1), (combinedRobot.renderScale || 1) / (combinedRobot.xyTable!.renderScale || 1), (combinedRobot.renderScale || 1) / (combinedRobot.xyTable!.renderScale || 1)]}>
                       <RobotArm robot={combinedRobot} />
                     </group>
                   </group>
                ) : (
                   <group
                     onDoubleClick={(e: any) => { e.stopPropagation(); onSelectRobot?.(combinedRobot.id); }}
                     onPointerOver={() => onSelectRobot && (document.body.style.cursor = 'pointer')}
                     onPointerOut={() => onSelectRobot && (document.body.style.cursor = 'auto')}
                   >
                     <RobotArm robot={combinedRobot} />
                     <PathVisualizer points={combinedRobot.recordedPoints} hasXYTable={false} model={combinedRobot.model} />
                   </group>
                )}
            </DraggableGizmo>
          );
        })}

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
            <group position={[0, 0, 0]}>
              <group position={[0, 0.08, 0]} scale={[(robot.renderScale || 1) / (robot.xyTable?.renderScale || 1), (robot.renderScale || 1) / (robot.xyTable?.renderScale || 1), (robot.renderScale || 1) / (robot.xyTable?.renderScale || 1)]}>
                <PathVisualizer points={robot.recordedPoints} hasXYTable={hasXYTable} model={robot.model} />
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
                      pos: { ...robot.pos, tx: newX, ty: newY },
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
              <RobotArm robot={robot} />
              <PathVisualizer points={robot.recordedPoints} hasXYTable={hasXYTable} model={robot.model} />
            </DraggableGizmo>
          </group>
        )}

        <OrbitControls 
          ref={controlsRef}
          makeDefault 
          maxPolarAngle={Math.PI / 2 + 0.1} 
          minDistance={0.5} 
          maxDistance={6} 
          onEnd={(e) => {
            if (e && e.target) {
              const controls = e.target as any;
              const position = controls.object.position;
              const target = controls.target;
              updateRobot(robot.id, {
                cameraView: {
                  position: [position.x, position.y, position.z],
                  target: [target.x, target.y, target.z]
                }
              });
            }
          }}
        />
      </Canvas>
    </div>
  );
}
