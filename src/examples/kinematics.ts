import type { KinematicsExample } from './utils';
import { convertToJoints } from './utils';

// Dynamically import all .ts files in the list folder
const modules = import.meta.glob('./list/*.ts', { eager: true });

// Extract the default export (the example) from each module
const rawExamples: KinematicsExample[] = Object.values(modules).map((mod: any) => mod.default);

export const examples: KinematicsExample[] = rawExamples.map(ex => ({
  ...ex,
  points: ex.points.map(convertToJoints)
}));
