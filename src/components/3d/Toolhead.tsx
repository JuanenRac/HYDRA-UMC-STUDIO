import React from 'react';
import { Box, Cylinder } from '@react-three/drei';

export default function Toolhead({ tool }: { tool: string }) {
  if (tool.includes('Laser')) {
    return (
      <group position={[0, 0, 0]}>
        <Cylinder args={[0.015, 0.015, 0.04]} position={[0, 0.02, 0]} material-color="#121720" castShadow />
        <Cylinder args={[0.005, 0.01, 0.02]} position={[0, 0.05, 0]} material-color="#ef4444" material-transparent material-opacity={0.5} />
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
