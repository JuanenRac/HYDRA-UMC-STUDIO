// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-26-tree.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

// Generate a simple 2D tree shape using cartesian coordinates
const generateTree = () => {
    const pts = [];
    const addPt = (x: number, y: number) => pts.push(cartesianToJoints(200 + x, y, 10, 0, 0, 0));
    
    // Trunk base right
    addPt(10, -50);
    // Trunk base left
    addPt(-10, -50);
    // Trunk top left
    addPt(-10, -10);
    // Bottom branch left
    addPt(-40, -10);
    // Bottom branch top left
    addPt(-20, 20);
    // Mid branch left
    addPt(-35, 20);
    // Mid branch top left
    addPt(-15, 50);
    // Top branch left
    addPt(-25, 50);
    // Top
    addPt(0, 80);
    // Top branch right
    addPt(25, 50);
    // Mid branch top right
    addPt(15, 50);
    // Mid branch right
    addPt(35, 20);
    // Bottom branch top right
    addPt(20, 20);
    // Bottom branch right
    addPt(40, -10);
    // Trunk top right
    addPt(10, -10);
    // Trunk base right
    addPt(10, -50);
    
    return pts;
};

const example: KinematicsExample = {
  id: 'example-26-tree',
  name: 'Pine Tree Shape',
  points: generateTree()
};
export default example;
