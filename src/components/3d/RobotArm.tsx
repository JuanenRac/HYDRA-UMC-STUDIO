import React from 'react';
import type { RobotState } from '../../store';
import GenericRobotArm from './GenericRobotArm';
import Parol6Arm from './Parol6Arm';
import Faze4Arm from './Faze4Arm';
import AR3Arm from './AR3Arm';
import AR4Arm from './AR4Arm';

export default function RobotArm({ robot }: { robot: RobotState }) {
    switch (robot.model) {
        case 'Parol6 (6-DOF)':
            return <Parol6Arm robot={robot} />;
        case 'Faze4 (6-DOF)':
            return <Faze4Arm robot={robot} />;
        case 'AR3 (6-DOF)':
            return <AR3Arm robot={robot} />;
        case 'AR4 (6-DOF)':
            return <AR4Arm robot={robot} />;
        default:
            return <GenericRobotArm robot={robot} />;
    }
}
