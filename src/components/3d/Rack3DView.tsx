import React from 'react';
import { Box } from '@react-three/drei';

export default function Rack3DView({ rack, type }: { rack: any, type: string }) {
  if (type === 'None') return null;
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
