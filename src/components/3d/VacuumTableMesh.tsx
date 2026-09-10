// =============================================================================
// HYDRA-UMC-STUDIO - Real-scale OpenSCAD vacuum table STL renderer
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { Component, Suspense, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { useTranslation } from 'react-i18next';
import { vacuumTableModel } from '../../vacuumTables';

/** An unavailable asset must not crash the whole robot viewport. */
class MeshBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function LoadedMesh({ modelId }: { modelId?: string }) {
  const model = vacuumTableModel(modelId);
  const source = useLoader(STLLoader, import.meta.env.BASE_URL + 'models/vacuum-tables/' + model.file);
  // Clone the cached STL before transforming it: mm, CAD Z-up -> meters, Y-up.
  const geometry = useMemo(() => {
    const copy = source.clone();
    copy.scale(0.001, 0.001, 0.001);
    copy.translate(-model.width / 2000, -model.length / 2000, 0);
    copy.rotateX(-Math.PI / 2);
    return copy;
  }, [source, model.width, model.length]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} castShadow receiveShadow>
    <meshStandardMaterial color="#94a3b8" roughness={0.65} metalness={0.15} />
  </mesh>;
}
export default function VacuumTableMesh({ modelId }: { modelId?: string }) {
  const { t } = useTranslation();
  const fallback = <Html center><span className="bg-slate-900 text-rose-300 p-2 rounded">{t('modules.vacuum_model_error')}</span></Html>;
  return <MeshBoundary key={vacuumTableModel(modelId).id} fallback={fallback}>
    <Suspense fallback={null}><LoadedMesh modelId={modelId} /></Suspense>
  </MeshBoundary>;
}
