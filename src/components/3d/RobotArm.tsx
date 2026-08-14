// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: RobotArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { Suspense } from 'react';
import type { RobotState } from '../../store';
import GenericRobotArm from './GenericRobotArm';
import Parol6Arm from './Parol6Arm';
import Faze4Arm from './Faze4Arm';
import AR3Arm from './AR3Arm';
import AR4Arm from './AR4Arm';
import UR3eArm from './UR3eArm';
import UR5eArm from './UR5eArm';
import UR10eArm from './UR10eArm';
import UR16eArm from './UR16eArm';
import UR20Arm from './UR20Arm';

/**
 * Executes the  robot arm logic.
 * This function handles the necessary computations and state updates.
 */
// Parol6Arm/Faze4Arm/AR3Arm/AR4Arm all load real STL meshes via useLoader
// (see their own header comments) - that suspends on first load, so each
// needs its own Suspense boundary. GenericRobotArm renders synchronously
// (procedural geometry only) and doesn't need one.
export default function RobotArm({ robot }: { robot: RobotState }) {
    switch (robot.model) {
        case 'Parol6 (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <Parol6Arm robot={robot} />
                </Suspense>
            );
        case 'Faze4 (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <Faze4Arm robot={robot} />
                </Suspense>
            );
        case 'AR3 (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <AR3Arm robot={robot} />
                </Suspense>
            );
        case 'AR4 (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <AR4Arm robot={robot} />
                </Suspense>
            );
        case 'UR3e (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <UR3eArm robot={robot} />
                </Suspense>
            );
        case 'UR5e (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <UR5eArm robot={robot} />
                </Suspense>
            );
        case 'UR10e (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <UR10eArm robot={robot} />
                </Suspense>
            );
        case 'UR16e (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <UR16eArm robot={robot} />
                </Suspense>
            );
        case 'UR20 (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <UR20Arm robot={robot} />
                </Suspense>
            );
        default:
            return <GenericRobotArm robot={robot} />;
    }
}
