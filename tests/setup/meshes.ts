// =============================================================================
// HYDRA-UMC STUDIO - tests/setup/meshes.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Runs once before the tests. The 3D models are not in the repository tree; the tests that read them (machine assets,
// heated beds, racks, vacuum tables, the model catalog) need them in public/models. They come from the one package with
// a pinned SHA-256 (see docs/MESH_PACKAGE.md): quiet when they are all there, one download otherwise, and a clear
// message with the way to work offline when the network is not reachable.
// =============================================================================
import { main } from '../../scripts/mesh_pack.mjs';

export default async function setup(): Promise<void> {
  const code = await main(['prepare']);
  if (code !== 0) {
    throw new Error('The 3D models are missing and could not be fetched (see the message above). See docs/MESH_PACKAGE.md.');
  }
}
