// =============================================================================
// HYDRA-UMC-STUDIO - Modular STL PCB rack, fixed 10 mm slot pitch
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { Box, Html } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { useTranslation } from 'react-i18next';
import { rackGeometry, rackParts } from '../../racks';
import type { RackConfig } from '../../store';

class Boundary extends Component<{children: ReactNode; fallback: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function Assembly({ rack }: {rack: RackConfig}) {
  const sources = useLoader(STLLoader, ['base','wall','guide'].map(p => import.meta.env.BASE_URL + 'models/racks/' + p + '.stl'));
  const meshes = useMemo(() => sources.map(source => {
    const g = source.clone();
    g.center(); g.rotateX(-Math.PI / 2); g.scale(.001,.001,.001);
    return g;
  }), [sources]);
  useEffect(() => () => meshes.forEach(g => g.dispose()), [meshes]);
  const spec = rackGeometry(rack);
  const reference = {base: [180,20,180], wall: [10,10,160], guide: [4,3,160]};
  return <group>
    {rackParts(rack).map((p,i) => <mesh key={i} geometry={meshes[['base','wall','guide'].indexOf(p.part)]}
      position={p.position.map(v=>v/1000) as [number,number,number]}
      scale={p.size.map((v,a)=>v/reference[p.part][a]) as [number,number,number]} castShadow receiveShadow>
      <meshStandardMaterial color={spec.color} roughness={.55} metalness={.25}/>
    </mesh>)}
    {Array.from({length:spec.capacity},(_,i) => {
      const valid = rack.usableSlots?.[i] ?? false;
      return <Box key={i} args={[spec.width/1000,.002,spec.depth/1000]} position={[0,.04+i*.01,0]}
        material-color={valid ? spec.color : '#ff0000'} material-transparent material-opacity={valid ? .25 : .12}/>;
    })}
  </group>;
}
export default function Rack3DView({rack,type}:{rack:RackConfig;type:string}) {
  const {t} = useTranslation();
  if(type==='None') return null;
  return <Boundary fallback={<Html center><span>{t('modules.rack_mesh_error')}</span></Html>}>
    <Suspense fallback={null}><Assembly rack={rack}/></Suspense>
  </Boundary>;
}
