// =============================================================================
// HYDRA-UMC STUDIO - G-code export of a trajectory: lib/gcodeExport.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { withCartesian } from './robotDetailHelpers';

// Exports the recorded points of a robot as standard G-code.
// Uses each point's own Cartesian pose (x/y/z/a/b/c, deriving it via the
// same withCartesian() every example/upload already goes through - a
// point recorded from the live 3D view already carries it, one loaded
// from an older WORKS/ file predating this might not) rather than joint
// angles: G-code is a Cartesian TOOL-PATH format, not a joint-space one,
// and every existing G-code consumer (CAM viewers, most CNC post-
// processors) expects X/Y/Z/(A/B/C) words, not J1-J6. A/B/C are emitted
// as the rotary-axis words several real G-code dialects (RepRap-derived
// firmware, 5/6-axis mill posts) already use for exactly this - not a
// universal standard for 6-DOF orientation, so the header comment below
// says so explicitly rather than implying this is a validated post for
// any specific downstream machine/viewer.
export function buildGCode(robotName: string, recordedPoints: any[]): string {
  const points = recordedPoints.map(withCartesian);
  const fmt = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(3) : undefined);
  const lines = [
    `; HYDRA-UMC STUDIO - G-code export`,
    `; Robot: ${robotName}`,
    `; Points: ${points.length}`,
    `; NOTE: A/B/C are this robot's own tool orientation (degrees), following the`,
    `;       same A/B/C convention several real G-code dialects use for rotary`,
    `;       axes - not a universal 6-DOF standard. Verify against your actual`,
    `;       downstream machine/viewer before running this on real hardware.`,
    `G21 ; millimeters`,
    `G90 ; absolute positioning`,
  ];
  points.forEach((pt, i) => {
    const words = [`G1`];
    const x = fmt(pt.x), y = fmt(pt.y), z = fmt(pt.z), a = fmt(pt.a), b = fmt(pt.b), c = fmt(pt.c);
    if (x !== undefined) words.push(`X${x}`);
    if (y !== undefined) words.push(`Y${y}`);
    if (z !== undefined) words.push(`Z${z}`);
    if (a !== undefined) words.push(`A${a}`);
    if (b !== undefined) words.push(`B${b}`);
    if (c !== undefined) words.push(`C${c}`);
    lines.push(`${words.join(' ')} ; point ${i + 1}`);
  });
  lines.push(`M2 ; end of program`);
  return lines.join('\n') + '\n';
}

export function gcodeFileName(robotName: string): string {
  return `${robotName.replace(/\s+/g, '_')}.gcode`;
}
