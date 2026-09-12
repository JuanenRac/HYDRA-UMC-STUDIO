// =============================================================================
// HYDRA-UMC-STUDIO - Shared machine/module visualization
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import LumenPnPRig from './LumenPnPRig';
import VacuumTableMesh from './VacuumTableMesh';
import HeatedBedMesh from './HeatedBedMesh';
import { heatedBedSize } from '../../heatedBeds';
import { vacuumTableSize } from '../../vacuumTables';
import { MACHINE_ASSETS, type MachineKind } from '../../machineAssets';
import { Component, Suspense, type ReactNode } from 'react';
import { Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next';

class MachineBoundary extends Component<{children: ReactNode; fallback: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function SharedModule3DView({ module, type }: { module: any; type: string }) {
  const {t} = useTranslation();
  if (type === 'vacuumTable') return <VacuumTableMesh modelId={module?.modelId} {...vacuumTableSize(module)}/>;
  if (type === 'heatedBed') return <HeatedBedMesh modelId={module?.modelId} {...heatedBedSize(module)}/>;
  if (Object.hasOwn(MACHINE_ASSETS,type)) {
    // Separate assets, shared transforms. The copied CAD keeps its own dimensions.
    return <MachineBoundary key={type} fallback={<Html center><span className="bg-slate-900 text-rose-300 p-2">{t('modules.machine_mesh_error')}</span></Html>}>
      <Suspense fallback={null}><LumenPnPRig module={module ?? {}} machineType={type as MachineKind}/></Suspense>
    </MachineBoundary>;
  }
  return null;
}
