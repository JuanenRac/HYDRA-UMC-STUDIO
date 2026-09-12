// =============================================================================
// HYDRA-UMC-STUDIO - Detailed heated bed STL preview, constant 5 mm thickness
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { Component, Suspense, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { useTranslation } from 'react-i18next';
import { heatedBedModel } from '../../heatedBeds';

class MeshBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
type Props = { modelId?: string; width: number; length: number };
function LoadedMesh({ modelId, width, length }: Props) {
  const model = heatedBedModel(modelId);
  const source = useLoader(STLLoader, import.meta.env.BASE_URL + 'models/heated-beds/' + model.file);
  const geometry = useMemo(() => {
    // Never mutate the cached STL. Convert CAD mm/Z-up to centered meters/Y-up.
    const copy = source.clone();
    copy.scale(0.001, 0.001, 0.001);
    copy.translate(-model.width / 2000, -model.length / 2000, 0);
    copy.rotateX(-Math.PI / 2);
    return copy;
  }, [source, model.width, model.length]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} scale={[width / model.width, 1, length / model.length]} castShadow receiveShadow>
    <meshStandardMaterial color="#b87345" roughness={0.48} metalness={0.55} />
  </mesh>;
}
export default function HeatedBedMesh(props: Props) {
  const { t } = useTranslation();
  return <MeshBoundary key={heatedBedModel(props.modelId).id}
    fallback={<Html center><span className="bg-slate-900 text-rose-300 p-2 rounded">{t('modules.heated_model_error')}</span></Html>}>
    <Suspense fallback={null}><LoadedMesh {...props} /></Suspense>
  </MeshBoundary>;
}
