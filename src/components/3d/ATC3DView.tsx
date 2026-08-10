import React from 'react';
import { Box, Cylinder } from '@react-three/drei';
import Toolhead from './Toolhead';

export default function ATC3DView({ atc }: { atc: any }) {
  if (atc.type === 'vertical_panel' || atc.type === 'horizontal_panel' || atc.type === 'Vertical Panel' || atc.type === 'Horizontal Panel') {
    const isHoriz = atc.type === 'horizontal_panel' || atc.type === 'Horizontal Panel';
    const gridStr = atc.panelGrid || '2x4';
    const [rows, cols] = gridStr.split('x').map(Number);
    const cellW = 0.08;
    const cellH = 0.08;
    const w = cols * cellW;
    const h = rows * cellH;
    return (
      <group>
        <Box 
          args={isHoriz ? [w, 0.05, h] : [w, h, 0.05]} 
          position={isHoriz ? [w/2 - cellW/2, 0.025, h/2 - cellH/2] : [w/2 - cellW/2, h/2, 0]} 
          material-color="#334155" 
          castShadow 
          receiveShadow 
        />
        {Array.from({ length: rows * cols }).map((_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const tool = atc.tools?.find((t: any) => t.slot === i)?.tool || 'None';
          
          if (isHoriz) {
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
          } else {
             return (
              <group key={i} position={[c * cellW, r * cellH + 0.04, 0.025]} rotation={[Math.PI/2, 0, 0]}>
                <Cylinder args={[0.015, 0.015, 0.01]} position={[0, 0.005, 0]} material-color="#0f172a" />
                {tool !== 'None' && (
                  <group position={[0, 0.01, 0]}>
                    <Toolhead tool={tool} />
                  </group>
                )}
              </group>
            );
          }
        })}
      </group>
    );
  } else if (atc.type === 'revolver' || atc.type === 'Revolver') {
    const slots = atc.revolverSlots || 8;
    const radius = Math.max(0.1, slots * 0.015);
    return (
      <group>
        <Cylinder args={[radius, radius, 0.05]} position={[0, 0.025, 0]} material-color="#334155" castShadow receiveShadow />
        <Cylinder args={[0.02, 0.02, 0.1]} position={[0, 0.05, 0]} material-color="#1e293b" castShadow receiveShadow />
        {Array.from({ length: slots }).map((_, i) => {
          const angle = (i / slots) * Math.PI * 2;
          const cx = Math.cos(angle) * radius * 0.8;
          const cy = Math.sin(angle) * radius * 0.8;
          const tool = atc.tools?.find((t: any) => t.slot === i)?.tool || 'None';
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
  return null;
}
