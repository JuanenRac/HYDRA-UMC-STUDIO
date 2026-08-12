// =============================================================================
// HYDRA-UMC STUDIO - Examples utility or registry: kinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from './utils';


// Dynamically import all .ts files in the list folder
/** Stores the Modules configuration or state data. */
const modules = import.meta.glob('./list/*.ts', { eager: true });

// Extract the default export (the example) from each module
/** Stores the Raw examples configuration or state data. */
const rawExamples: KinematicsExample[] = Object.values(modules).map((mod: any) => mod.default);

/** Stores the Examples configuration or state data. */
export const examples: KinematicsExample[] = rawExamples;
