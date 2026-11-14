// =============================================================================
// HYDRA-UMC STUDIO - src/components/robotDetail/shared.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ToolType } from '../../store';

/** Joins class names and resolves the conflicting Tailwind ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** The tool heads a robot can carry, in the order of the tool selector. */
export const URTC_TOOLS: ToolType[] = [
  'None',
  'Soldering Station (T12)',
  'SMT Solder Paste Dispenser',
  'Thermal Paste / Liquid Dispenser',
  'Smart Electric Screwdriver',
  'Vacuum / Pneumatic Gripper',
  'Drill (BL4260)',
  'Gimbal Gripper',
  'NEMA Gripper',
  'AOI (Automated Optical Inspection) System',
  'Engraving Laser Diode (10W optical)',
  '3D Printing Hotend',
  '3D Scanner Probe',
  'SMT Pick & Place Head',
  'Heavy-Duty Electromagnet',
  'Spot Welder Head',
  'Conformal Coating Airbrush',
  'Large-Format Vacuum Gripper',
  'Functional Testing Head',
  'UV Curing Head',
  'Hot Air Rework Nozzle',
  'Pneumatic Press-Fit Inserter',
  'Wire Harnessing / Crimping Actuator',
  'PCB Advanced Inspection',
  'Solder Paste Jetting Valve',
  'Ultrasonic Welder / Packaging Sealer'
];

/**
 * True when `tool` is one of the tool heads of the URTC family (the list of the selector). A tool that is not one is kept as it is: the screen
 * only says so, it never changes or refuses it.
 */
export function isUrtcTool(tool: unknown): boolean {
  return typeof tool === 'string' && (URTC_TOOLS as string[]).includes(tool);
}
