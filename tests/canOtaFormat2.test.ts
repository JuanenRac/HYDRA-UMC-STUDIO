// =============================================================================
// HYDRA-UMC-STUDIO - tests/canOtaFormat2.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The header and signature of format 2: read from a release (with or without firmware_manifest.json) and sent with the flash.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGithubFirmwareReleases, flashSigningOptions } from '../src/lib/canOta';

const header = new Uint8Array(64);
header.set([0x48, 0x59, 0x44, 0x52, 2, 0, 0, 0, 0x31, 0x30, 0x34, 0x47]); // "HYDR", format 2, hardware id 0x47343031
const signature = new Uint8Array(64).fill(0xab);
const asset = (name: string) => ({ name, url: `https://api.github.com/x/${name}`, size: 64 });

function release(names: string[]) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.endsWith('/releases/latest')) return new Response(JSON.stringify({ assets: names.map(asset) }));
    return new Response((url.endsWith('.hdr2') ? header : signature).slice().buffer);
  }));
}

describe('format 2 records of a release', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists an application image from its header when the release has no manifest', async () => {
    release(['HYDRA_RCB_APP_v0.3.0.bin', 'HYDRA_RCB_APP_v0.3.0.hdr2', 'HYDRA_RCB_APP_v0.3.0.sig2', 'HYDRA_RCB_BOOTLOADER_v0.1.9.bin']);
    const found = await fetchGithubFirmwareReleases('JuanenRac/HYDRA-UMC', 'controllerBoard');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ releaseTag: '0.3.0', hardwareId: '0x47343031', signature: 'ab'.repeat(64) });
    expect(found[0].header).toMatch(/^4859445202000000/);
    expect(await fetchGithubFirmwareReleases('JuanenRac/HYDRA-UMC', 'kinematicBrain')).toHaveLength(0);
  });

  it('offers nothing for an image without both records', async () => {
    release(['HYDRA_RCB_APP_v0.3.0.bin', 'HYDRA_RCB_APP_v0.3.0.hdr2']);
    expect(await fetchGithubFirmwareReleases('JuanenRac/HYDRA-UMC', 'controllerBoard')).toHaveLength(0);
  });

  it('sends the header only when there is one', () => {
    expect(flashSigningOptions('0.3.0', undefined, 'ab'.repeat(64), {}, 'cd'.repeat(64)).header).toBe('cd'.repeat(64));
    expect(flashSigningOptions('0.3.0', undefined, null)).not.toHaveProperty('header');
  });
});
