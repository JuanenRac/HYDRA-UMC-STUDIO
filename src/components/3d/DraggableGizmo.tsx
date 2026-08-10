import React from 'react';
import { Html, TransformControls } from '@react-three/drei';
import * as THREE from 'three';

export interface DraggableGizmoProps {
  position: [number, number, number];
  controlMode: 'translate' | 'rotate' | 'scale' | 'none';
  onMouseUp: (e: any) => void;
  children: React.ReactNode;
  initialRotation?: number;
  scale?: [number, number, number];
}

export default function DraggableGizmo({ position, controlMode, onMouseUp, children, initialRotation = 0, scale = [1, 1, 1] }: DraggableGizmoProps) {
  const coordRef = React.useRef<HTMLDivElement>(null);
  const [targetObj, setTargetObj] = React.useState<THREE.Group | null>(null);

  const [localScale, setLocalScale] = React.useState(scale[0]);
  
  React.useEffect(() => {
    setLocalScale(scale[0]);
  }, [scale[0]]);

  React.useEffect(() => {
    if (coordRef.current && controlMode !== 'scale') {
      coordRef.current.innerText = `X: ${(position[0] * 1000).toFixed(0)} Y: ${(position[2] * 1000).toFixed(0)} R: ${(initialRotation * 180 / Math.PI).toFixed(0)}°`;
    }
  }, [position, initialRotation, controlMode]);

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLocalScale(val);
    
  };

  const handleScaleMouseUp = () => {
    if (targetObj) {
      const mockEvent = {
        target: {
          object: {
            position: targetObj.position,
            rotation: targetObj.rotation,
            scale: new THREE.Vector3(localScale, localScale, localScale)
          }
        }
      };
      onMouseUp(mockEvent);
    }
  };

  const handleTransformMouseUp = (e: any) => {
    if (e?.target?.object) {
       const mockEvent = {
         target: {
           object: {
             position: e.target.object.position,
             rotation: e.target.object.rotation,
             scale: new THREE.Vector3(scale[0], scale[1], scale[2])
           }
         }
       };
       onMouseUp(mockEvent);
    } else {
       onMouseUp(e);
    }
  };

  return (
    <>
      {controlMode !== 'none' && controlMode !== 'scale' && targetObj && (
        <TransformControls
          object={targetObj}
          size={controlMode === 'rotate' ? 0.75 : 1.5}
          mode={controlMode as 'translate' | 'rotate'}
          showX={controlMode === 'translate'}
          showY={controlMode === 'rotate'}
          showZ={controlMode === 'translate'}
          onChange={(e: any) => {
            if (e?.target?.object && coordRef.current) {
              const x = (e.target.object.position.x * 1000).toFixed(0);
              const y = (e.target.object.position.z * 1000).toFixed(0);
              const r = (e.target.object.rotation.y * 180 / Math.PI).toFixed(0);
              coordRef.current.innerText = `X: ${x} Y: ${y} R: ${r}°`;
            }
          }}
          onMouseUp={handleTransformMouseUp}
        />
      )}
      <group ref={setTargetObj} position={position} rotation={[0, initialRotation, 0]}>
        <group scale={[localScale, localScale, localScale]}>
          {children}
        </group>
        {controlMode !== 'none' && (
          <Html position={[0, 0.4, 0]} center zIndexRange={[100, 0]}>
            {controlMode === 'scale' ? (
               <div className="bg-slate-950/90 backdrop-blur p-2 rounded border border-amber-500 shadow-lg pointer-events-auto flex flex-col items-center gap-1">
                 <div className="text-amber-400 font-mono text-[10px] font-bold">Scale: {localScale.toFixed(2)}x</div>
                 <input
                    type="range"
                    min="0.10" max="3.00" step="0.05"
                    value={localScale}
                    onChange={handleScaleChange}
                    onPointerUp={handleScaleMouseUp}
                   className="w-24 accent-amber-500"
                   onPointerDown={(e) => e.stopPropagation()}
                 />
               </div>
            ) : (
               <div
                  ref={coordRef}
                 className="bg-slate-950/90 backdrop-blur text-sky-400 font-mono text-[10px] font-bold px-2 py-1 rounded border border-slate-700 whitespace-nowrap pointer-events-none shadow-lg"
               >
                 </div>
            )}
          </Html>
        )}
      </group>
    </>
  );
}
