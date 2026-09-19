// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: RobotArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { Suspense, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
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
import XArm6Arm from './XArm6Arm';
import Lite6Arm from './Lite6Arm';
import EdoArm from './EdoArm';
import Gen3LiteArm from './Gen3LiteArm';
import M710icArm from './M710icArm';
import SoArm100Arm from './SoArm100Arm';
import Gen2Arm from './Gen2Arm';
import PiperArm from './PiperArm';
import Z1Arm from './Z1Arm';
import Vx300sArm from './Vx300sArm';
import Wx250sArm from './Wx250sArm';
import KochArm from './KochArm';
import Ur3ClassicArm from './Ur3ClassicArm';
import Ur5ClassicArm from './Ur5ClassicArm';
import Ur10ClassicArm from './Ur10ClassicArm';

type Joints = RobotState['joints'];
const JOINT_KEYS: (keyof Joints)[] = ['j1', 'j2', 'j3', 'j4', 'j5', 'j6'];

// Shortest-path angle interpolation in degrees - a naive linear lerp
// between e.g. 350deg and 10deg would visibly spin the joint the LONG
// way around (340deg of travel) instead of the real 20deg it should
// take.
export function lerpAngleDeg(current: number, target: number, t: number): number {
    const diff = (((target - current + 180) % 360) + 360) % 360 - 180;
    return current + diff * t;
}

// Real gap closed: every joint rotation across all ~26 model-specific
// Arm components below used to bind directly to the raw
// telemetry-driven robot.joints value with zero interpolation - a robot
// updated at whatever rate telemetry actually arrives (well under
// 60fps) visibly snapped between poses instead of moving smoothly. This
// hook owns one smoothed copy of `joints`, advanced toward the real
// target every render frame (useFrame - genuinely decoupled from
// telemetry's own update rate, not driven by it) - a single point of
// change here covers every model, instead of repeating this in each of
// the ~26 files. Snaps immediately (no slide) the moment `robot.id`
// changes, since that means a genuinely different robot is now being
// shown, not the same one moving.
function useSmoothedJoints(joints: Joints, robotId: number): Joints {
    const [smoothed, setSmoothed] = useState<Joints>(joints);
    const smoothedRef = useRef(smoothed);
    smoothedRef.current = smoothed;
    const targetRef = useRef(joints);
    targetRef.current = joints;
    const lastIdRef = useRef(robotId);

    useFrame((_state, delta) => {
        if (lastIdRef.current !== robotId) {
            lastIdRef.current = robotId;
            setSmoothed(targetRef.current);
            return;
        }
        // A fixed, framerate-independent convergence rate - proportional
        // approach toward the target (never overshoots), just faster
        // when further behind.
        const t = Math.min(1, delta * 8);
        let changed = false;
        const next = { ...smoothedRef.current };
        for (const key of JOINT_KEYS) {
            const cur = smoothedRef.current[key];
            const tgt = targetRef.current[key];
            if (Math.abs(cur - tgt) < 0.01) {
                if (cur !== tgt) { next[key] = tgt; changed = true; }
                continue;
            }
            next[key] = lerpAngleDeg(cur, tgt, t);
            changed = true;
        }
        if (changed) setSmoothed(next);
    });

    return smoothed;
}

/**
 * Robot Arm component that dispatches rendering to specific model implementations.
 * Uses Suspense boundaries for models that load external assets.
 * No-HTML version for maximum WebView compatibility.
 */
export default function RobotArm({ robot: rawRobot }: { robot: RobotState }) {
    const smoothedJoints = useSmoothedJoints(rawRobot.joints, rawRobot.id);
    const robot = smoothedJoints === rawRobot.joints ? rawRobot : { ...rawRobot, joints: smoothedJoints };
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
        case 'xArm6 (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <XArm6Arm robot={robot} />
                </Suspense>
            );
        case 'Lite 6 (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <Lite6Arm robot={robot} />
                </Suspense>
            );
        case 'e.DO (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <EdoArm robot={robot} />
                </Suspense>
            );
        case 'Gen3 Lite (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <Gen3LiteArm robot={robot} />
                </Suspense>
            );
        case 'M-710iC (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <M710icArm robot={robot} />
                </Suspense>
            );
        case 'SO-ARM100 (5-DOF)':
            return (
                <Suspense fallback={null}>
                    <SoArm100Arm robot={robot} />
                </Suspense>
            );
        case 'Gen2 (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <Gen2Arm robot={robot} />
                </Suspense>
            );
        case 'PiPER (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <PiperArm robot={robot} />
                </Suspense>
            );
        case 'Z1 (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <Z1Arm robot={robot} />
                </Suspense>
            );
        case 'ViperX 300 (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <Vx300sArm robot={robot} />
                </Suspense>
            );
        case 'WidowX 250 (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <Wx250sArm robot={robot} />
                </Suspense>
            );
        case 'Koch v1.1 (5-DOF)':
            return (
                <Suspense fallback={null}>
                    <KochArm robot={robot} />
                </Suspense>
            );
        case 'UR3 (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <Ur3ClassicArm robot={robot} />
                </Suspense>
            );
        case 'UR5 (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <Ur5ClassicArm robot={robot} />
                </Suspense>
            );
        case 'UR10 (6-DOF)':
            return (
                <Suspense fallback={null}>
                    <Ur10ClassicArm robot={robot} />
                </Suspense>
            );
        default:
            return <GenericRobotArm robot={robot} />;
    }
}
