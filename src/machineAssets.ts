// =============================================================================
// HYDRA-UMC-STUDIO - Independent machine asset directories
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
export const MACHINE_ASSETS = {
  lumenPnP: { directory: 'lumenpnp', format: 'glb' },
  juanenPnP: { directory: 'juanenpnp', format: 'stl' },
  juanenCNC: { directory: 'juanencnc', format: 'stl' },
  juanenLaser: { directory: 'juanenlaser', format: 'stl' },
} as const;
export type MachineKind = keyof typeof MACHINE_ASSETS;
export function machineAssetPath(type: MachineKind, name: string) {
  const spec = MACHINE_ASSETS[type];
  return import.meta.env.BASE_URL + 'models/' + spec.directory + '/' + name + '.' + spec.format;
}
