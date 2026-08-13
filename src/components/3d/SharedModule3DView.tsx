// =============================================================================
// HYDRA-UMC STUDIO - React Component: SharedModule3DView.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React from 'react';
import { Box, Cylinder } from '@react-three/drei';

/**
 * Executes the  lumen style frame logic. 
 * This function handles the necessary computations and state updates.
 */
function LumenStyleFrame({ width, length, type, feederCount }: { width: number, length: number, type: string, feederCount: number }) {
  const isPnp = type === 'lumenPnP' || type === 'juanenPnP';
  const isCNC = type === 'juanenCNC';
  const isLaser = type === 'juanenLaser';

  return (
    <group>
      {/* Legs */}
      <Box args={[0.02, 0.1, 0.04]} position={[-width/2 + 0.01, 0.05, -length/2 + 0.02]} material-color="#111827" castShadow />
      <Box args={[0.02, 0.1, 0.04]} position={[width/2 - 0.01, 0.05, -length/2 + 0.02]} material-color="#111827" castShadow />
      <Box args={[0.02, 0.1, 0.04]} position={[-width/2 + 0.01, 0.05, length/2 - 0.02]} material-color="#111827" castShadow />
      <Box args={[0.02, 0.1, 0.04]} position={[width/2 - 0.01, 0.05, length/2 - 0.02]} material-color="#111827" castShadow />

      {/* Y Rails */}
      <Box args={[0.03, 0.03, length]} position={[-width/2 + 0.015, 0.115, 0]} material-color="#1e293b" castShadow />
      <Box args={[0.03, 0.03, length]} position={[width/2 - 0.015, 0.115, 0]} material-color="#1e293b" castShadow />

      {/* Base Frame crossbars */}
      <Box args={[width - 0.04, 0.02, 0.02]} position={[0, 0.04, -length/2 + 0.01]} material-color="#1e293b" />
      <Box args={[width - 0.04, 0.02, 0.02]} position={[0, 0.04, length/2 - 0.01]} material-color="#1e293b" />

      {/* Bed */}
      <Box args={[width - 0.06, 0.005, length - 0.1]} position={[0, 0.06, 0]} material-color="#0f172a" />
      
      {isPnp && (
        <>
          {/* Up-looking camera ring (white/yellow) */}
          <Cylinder args={[0.015, 0.015, 0.006]} position={[0, 0.063, -0.05]} material-color="#ffffff" />
          <Box args={[0.04, 0.006, 0.02]} position={[0, 0.063, -0.07]} material-color="#eab308" />

          {/* Feeders (Front) */}
          <Box args={[width - 0.08, 0.02, 0.04]} position={[0, 0.05, length/2 - 0.02]} material-color="#1e293b" />
          {/* Yellow feeder accents */}
          {Array.from({ length: feederCount }).map((_, i, arr) => (
            <Box key={i} args={[0.008, 0.01, 0.035]} position={[- (arr.length * 0.015)/2 + i * 0.015 + 0.0075, 0.06, length/2 - 0.02]} material-color="#eab308" />
          ))}
        </>
      )}

      {/* X Gantry */}
      <Box args={[width, 0.03, 0.03]} position={[0, 0.14, 0]} material-color="#1e293b" castShadow />
      {/* Y Motor */}
      <Box args={[0.04, 0.04, 0.05]} position={[-width/2 - 0.01, 0.12, -length/2 + 0.02]} material-color="#334155" />
      
      {isPnp && (
        <>
          {/* Gantry Yellow accents */}
          <Box args={[0.02, 0.035, 0.035]} position={[-width/2 + 0.015, 0.14, 0]} material-color="#eab308" />
          <Box args={[0.02, 0.035, 0.035]} position={[width/2 - 0.015, 0.14, 0]} material-color="#eab308" />
        </>
      )}

      {/* Toolhead */}
      <group position={[0, 0.14, 0.025]}>
        <Box args={[0.05, 0.06, 0.04]} position={[0, 0, 0]} material-color="#1e293b" castShadow />
        
        {isPnp && (
          <>
            <Box args={[0.015, 0.03, 0.02]} position={[-0.015, -0.01, 0.02]} material-color="#334155" />
            <Box args={[0.015, 0.03, 0.02]} position={[0.015, -0.01, 0.02]} material-color="#334155" />
            {/* Dual Nozzles */}
            <Cylinder args={[0.002, 0.001, 0.02]} position={[-0.015, -0.03, 0.02]} material-color="#94a3b8" />
            <Cylinder args={[0.002, 0.001, 0.02]} position={[0.015, -0.03, 0.02]} material-color="#94a3b8" />
            <Cylinder args={[0.001, 0.001, 0.01]} position={[-0.015, -0.04, 0.02]} material-color="#ef4444" />
            <Cylinder args={[0.001, 0.001, 0.01]} position={[0.015, -0.04, 0.02]} material-color="#ef4444" />
          </>
        )}
        
        {isCNC && (
          <>
            <Box args={[0.03, 0.04, 0.02]} position={[0, -0.01, 0.02]} material-color="#334155" />
            <Cylinder args={[0.01, 0.01, 0.03]} position={[0, -0.03, 0.02]} material-color="#94a3b8" />
            <Cylinder args={[0.002, 0.001, 0.02]} position={[0, -0.05, 0.02]} material-color="#cbd5e1" />
          </>
        )}
        
        {isLaser && (
          <>
            <Box args={[0.03, 0.04, 0.02]} position={[0, -0.01, 0.02]} material-color="#334155" />
            <Cylinder args={[0.01, 0.01, 0.03]} position={[0, -0.03, 0.02]} material-color="#ef4444" />
            <Cylinder args={[0.001, 0.001, 0.05]} position={[0, -0.06, 0.02]} material-color="#fca5a5" material-transparent material-opacity={0.8} />
          </>
        )}
      </group>
    </group>
  );
}

/**
 * Executes the  shared module3 d view logic. 
 * This function handles the necessary computations and state updates.
 */
export default function SharedModule3DView({ module, type }: { module: any, type: string }) {
  const width = module?.size?.width ? module.size.width / 1000 : 0.5;
  const length = module?.size?.length ? module.size.length / 1000 : 0.5;

  if (type === 'vacuumTable') {
    return (
      <group>
        <Box args={[width, 0.05, length]} position={[0, 0.025, 0]} material-color="#1e293b" castShadow />
        <Box args={[Math.max(0.01, width - 0.05), 0.01, Math.max(0.01, length - 0.05)]} position={[0, 0.055, 0]} material-color="#0f172a" />
      </group>
    );
  }
  if (type === 'heatedBed') {
    return (
      <group>
        <Box args={[width, 0.02, length]} position={[0, 0.01, 0]} material-color="#b91c1c" castShadow />
        <Box args={[Math.max(0.01, width - 0.02), 0.005, Math.max(0.01, length - 0.02)]} position={[0, 0.0225, 0]} material-color="#ef4444" />
      </group>
    );
  }

  if (['juanenPnP', 'lumenPnP', 'juanenCNC', 'juanenLaser'].includes(type)) {
    const feederCount = Math.max(1, Math.floor((width - 0.1) / 0.015));
    return <LumenStyleFrame width={width} length={length} type={type} feederCount={feederCount} />;
  }

  return null;
}
