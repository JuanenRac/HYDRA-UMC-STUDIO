// =============================================================================
// HYDRA-UMC STUDIO - tests/canOtaDownload.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crc32, fetchGithubFirmwareReleases, verifyDownloadedFirmware } from '../src/lib/canOta';
import { sha256Hex } from '../src/lib/sha256';

const image = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const crcOf = (bytes: Uint8Array) => `0x${crc32(bytes).toString(16).toUpperCase().padStart(8, '0')}`;

describe('verifyDownloadedFirmware', () => {
  it('accepts an image whose CRC32 and SHA-256 both match', () => {
    expect(() => verifyDownloadedFirmware(image, { crc32: crcOf(image), sha256: sha256Hex(image), size: image.length })).not.toThrow();
  });
  it('accepts an image with only a CRC32 (an older manifest)', () => {
    expect(() => verifyDownloadedFirmware(image, { crc32: crcOf(image), size: image.length })).not.toThrow();
  });
  it('refuses a damaged download', () => {
    const damaged = image.slice();
    damaged[3] ^= 0xff;
    expect(() => verifyDownloadedFirmware(damaged, { crc32: crcOf(image), size: image.length })).toThrow(/CRC32 mismatch/);
  });
  it('refuses a file that passes the CRC32 but is not the one the project published', () => {
    // A CRC32 is no authentication: another image with the same CRC32 is easy to build. The hash is what tells.
    expect(() => verifyDownloadedFirmware(image, { crc32: crcOf(image), sha256: '0'.repeat(64), size: image.length })).toThrow(/SHA-256 mismatch/);
  });
  it('compares the hash without caring about letter case', () => {
    expect(() => verifyDownloadedFirmware(image, { sha256: sha256Hex(image).toUpperCase(), size: image.length })).not.toThrow();
  });
});

describe('fetchGithubFirmwareReleases', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  const manifest = {
    components: {
      main_bootloader: { display_name: 'Bootloader', chip: 'STM32F303CC', version_string: '0.3.9', hardware_id: '0x1', files: { bin: { filename: 'BL.bin', size_bytes: 10, crc32: '0x1', sha256: 'AB'.repeat(32) } } },
      main_application: { display_name: 'Application', chip: 'STM32F303CC', version_string: '0.3.9', hardware_id: '0x2', files: { bin: { filename: 'APP.bin', size_bytes: 20, crc32: '0x2' } } },
    },
  };

  it('leaves the bootloader images out unless they are asked for', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => manifest })));
    const assets = await fetchGithubFirmwareReleases('JuanenRac/URTC', 'urtcHead');
    expect(assets.map((a) => a.name)).toEqual(['APP.bin']);
  });

  it('lists them, marked as bootloaders and with their hash, on request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => manifest })));
    const assets = await fetchGithubFirmwareReleases('JuanenRac/URTC', 'urtcHead', 'main', { includeBootloaders: true });
    expect(assets.map((a) => a.name)).toEqual(['BL.bin', 'APP.bin']);
    expect(assets[0]).toMatchObject({ isBootloader: true, sha256: 'ab'.repeat(32) });
    expect(assets[1].isBootloader).toBe(false);
    expect(assets[1].sha256).toBeUndefined();
  });
});
