// =============================================================================
// HYDRA-UMC STUDIO - src/nav/ScreenHost.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// Which component draws each screen of the dashboard. The panels are loaded when first opened.
import React from 'react';
import type { CanOtaTier } from '../lib/canOta';
import type { ViewId } from './navModel';
import { OverviewView } from '../views/OverviewView';
import { Config } from '../components/Config';
import { useFleet } from '../storeContexts';

// Stable module-level references for the `tiers` prop passed to Flasher/Tester below -
// a literal `tiers={[...]}` inline in JSX would build a brand-new array on every
// render, which then trips Flasher.tsx/Tester.tsx's own `useEffect(..., [tiers])` on every one
// of those renders even though the actual tier list never changes.
const URTC_TIERS: CanOtaTier[] = ['urtcHead', 'urtcExpansion'];
const HYDRA_BRAIN_TIERS: CanOtaTier[] = ['kinematicBrain', 'controllerBoard'];

// Every robot A1-A8 is drawn by the shared RobotDetail; the panel below is keyed by robot id so that switching robot remounts it.
const RobotDetail = React.lazy(() => import('../components/RobotDetail').then(m => ({ default: m.RobotDetail })));
const CamerasView = React.lazy(() => import('../components/CamerasView').then(m => ({ default: m.CamerasView })));
const CameraMediaView = React.lazy(() => import('../components/CameraMediaView').then(m => ({ default: m.CameraMediaView })));
const XYTableConfig = React.lazy(() => import('../components/XYTableConfig').then(m => ({ default: m.XYTableConfig })));
const PickAndPlace = React.lazy(() => import('../components/PickAndPlace').then(m => ({ default: m.PickAndPlace })));
const CNC = React.lazy(() => import('../components/CNC').then(m => ({ default: m.CNC })));
const Laser = React.lazy(() => import('../components/Laser').then(m => ({ default: m.Laser })));
const VacuumTableConfig = React.lazy(() => import('../components/VacuumTableConfig').then(m => ({ default: m.VacuumTableConfig })));
const HeatedBedConfig = React.lazy(() => import('../components/HeatedBedConfig').then(m => ({ default: m.HeatedBedConfig })));
const ATCToolsConfig = React.lazy(() => import('../components/ATCToolsConfig').then(m => ({ default: m.ATCToolsConfig })));
const RackConfigView = React.lazy(() => import('../components/RackConfigView').then(m => ({ default: m.RackConfigView })));
const RobotsCatalogView = React.lazy(() => import('../components/RobotsCatalogView').then(m => ({ default: m.RobotsCatalogView })));
const Flasher = React.lazy(() => import('../components/Flasher').then(m => ({ default: m.Flasher })));
const Tester = React.lazy(() => import('../components/Tester').then(m => ({ default: m.Tester })));
const KinematicBrainStage = React.lazy(() => import('../components/KinematicBrainStage').then(m => ({ default: m.KinematicBrainStage })));
// Ecosystem-wide panels - visual surface for the whole HYDRA-UMC-* ecosystem, not just this
// controller's own hardware. See each component's own header comment for exactly which real
// HYDRA-UMC-SERVER route it talks to.
const EcosystemServices = React.lazy(() => import('../components/EcosystemServices').then(m => ({ default: m.EcosystemServices })));
const AiFamilyStatus = React.lazy(() => import('../components/AiFamilyStatus').then(m => ({ default: m.AiFamilyStatus })));
const AiDashboardPanel = React.lazy(() => import('../components/AiDashboardPanel').then(m => ({ default: m.AiDashboardPanel })));
const EcosystemMap = React.lazy(() => import('../components/EcosystemMap').then(m => ({ default: m.EcosystemMap })));
const EcosystemHealth = React.lazy(() => import('../components/EcosystemHealth').then(m => ({ default: m.EcosystemHealth })));
const EcosystemPlanning = React.lazy(() => import('../components/EcosystemPlanning').then(m => ({ default: m.EcosystemPlanning })));
const EcosystemTelemetry = React.lazy(() => import('../components/EcosystemTelemetry').then(m => ({ default: m.EcosystemTelemetry })));
const AdminClients = React.lazy(() => import('../components/AdminClients').then(m => ({ default: m.AdminClients })));
const AdminLogs = React.lazy(() => import('../components/AdminLogs').then(m => ({ default: m.AdminLogs })));
const AdminSafety = React.lazy(() => import('../components/AdminSafety').then(m => ({ default: m.AdminSafety })));
const AdminAudit = React.lazy(() => import('../components/AdminAudit').then(m => ({ default: m.AdminAudit })));
const AdminServer = React.lazy(() => import('../components/AdminServer').then(m => ({ default: m.AdminServer })));
const SystemSupervisor = React.lazy(() => import('../components/SystemSupervisor').then(m => ({ default: m.SystemSupervisor })));

/** The screens that need nothing from the shell. `robot` is drawn apart (it needs the selected robot). In the classic menu the configuration is a window instead. */
const PANELS: Record<Exclude<ViewId, 'overview' | 'robot'>, () => React.ReactNode> = {
  cameras: () => <CamerasView />,
  cameraMedia: () => <CameraMediaView />,
  robots: () => <RobotsCatalogView />,
  xytable: () => <XYTableConfig />,
  atctools: () => <ATCToolsConfig />,
  rack: () => <RackConfigView />,
  pickandplace: () => <PickAndPlace />,
  cnc: () => <CNC />,
  laser: () => <Laser />,
  vacuumtable: () => <VacuumTableConfig />,
  heatedbed: () => <HeatedBedConfig />,
  flasher: () => <Flasher tiers={URTC_TIERS} />,
  tester: () => <Tester tiers={URTC_TIERS} />,
  hydraFlasher: () => <Flasher tiers={HYDRA_BRAIN_TIERS} />,
  hydraTester: () => <Tester tiers={HYDRA_BRAIN_TIERS} />,
  kinematicBrainStage: () => <KinematicBrainStage />,
  ecosystemServices: () => <EcosystemServices />,
  ecosystemHealth: () => <EcosystemHealth />,
  ecosystemMap: () => <EcosystemMap />,
  ecosystemPlanning: () => <EcosystemPlanning />,
  ecosystemTelemetry: () => <EcosystemTelemetry />,
  aiFamilyStatus: () => <AiFamilyStatus />,
  aiDashboard: () => <AiDashboardPanel />,
  adminClients: () => <AdminClients />,
  adminLogs: () => <AdminLogs />,
  adminServer: () => <AdminServer />,
  adminSafety: () => <AdminSafety />,
  adminAudit: () => <AdminAudit />,
  systemSupervisor: () => <SystemSupervisor />,
  settings: () => <Config variant="screen" />,
};

type Props = {
  view: string;
  selectedRobotId: number;
  /** The embedded 3D view of the phone app: only the robot. */
  hideUI: boolean;
  onNavigateToRobot: (id: number) => void;
};

export function ScreenHost({ view, selectedRobotId, hideUI, onNavigateToRobot }: Props) {
  const { robots } = useFleet();
  if (view === 'overview') return hideUI ? null : <OverviewView />;
  if (view === 'robot') {
    const robot = robots.find(r => r.id === selectedRobotId);
    return robot ? <RobotDetail key={robot.id} robot={robot} viewportOnly={hideUI} onNavigateToRobot={onNavigateToRobot} /> : null;
  }
  return Object.prototype.hasOwnProperty.call(PANELS, view) ? PANELS[view as keyof typeof PANELS]() : null;
}
