// =============================================================================
// HYDRA-UMC STUDIO - tests/canOtaDownload.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crc32, downloadGithubFirmware, fetchGithubFirmwareReleases, sha256FromDigest, verifyDownloadedFirmware } from '../src/lib/canOta';
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

describe('fetchGithubFirmwareReleases from the latest release (HYDRA-UMC)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  const manifest = {
    components: {
      g474_bootloader: { display_name: 'Boot', chip: 'STM32G474', version_string: '0.1.8', hardware_id: '0x1', files: { bin: { filename: 'HYDRA_RCB_BOOTLOADER_v0.1.8.bin', size_bytes: 10, crc32: '0x1' } } },
      g474_application: { display_name: 'App', chip: 'STM32G474', version_string: '0.1.9', hardware_id: '0x2', files: { bin: { filename: 'HYDRA_RCB_APP_v0.1.9.bin', size_bytes: 20, crc32: '0x2' } } },
    },
  };
  const sig = 'ab'.repeat(64);
  const asset = (name: string, extra: object = {}) => ({ name, url: `https://api.github.com/repos/JuanenRac/HYDRA-UMC/releases/assets/${name}`, ...extra });
  const release = {
    published_at: '2026-01-01T00:00:00Z',
    assets: [
      asset('firmware_manifest.json'),
      asset('HYDRA_RCB_APP_v0.1.9.bin', { digest: `sha256:${'CD'.repeat(32)}` }),
      asset('HYDRA_RCB_APP_v0.1.9.sig'),
      asset('HYDRA_RCB_BOOTLOADER_v0.1.8.bin'),
    ],
  };

  function stub(releaseBody: unknown, releaseStatus = 200) {
    const calls: Array<{ url: string; accept?: string }> = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: { headers?: Record<string, string> }) => {
      calls.push({ url, accept: init?.headers?.Accept });
      if (url.endsWith('/releases/latest')) return { ok: releaseStatus === 200, status: releaseStatus, json: async () => releaseBody };
      if (url.endsWith('firmware_manifest.json')) return { ok: true, status: 200, json: async () => manifest };
      if (url.endsWith('.sig')) return { ok: true, status: 200, text: async () => `${sig}
` };
      return { ok: false, status: 500 };
    }));
    return calls;
  }

  it('reads the manifest, the image address, its hash and its signature from the release assets, never from raw.githubusercontent', async () => {
    const calls = stub(release);
    const assets = await fetchGithubFirmwareReleases('JuanenRac/HYDRA-UMC', 'controllerBoard');
    expect(assets.map((a) => a.name)).toEqual(['HYDRA_RCB_APP_v0.1.9.bin']);
    expect(assets[0]).toMatchObject({ sha256: 'cd'.repeat(32), signature: sig, crc32: '0x2', releaseTag: '0.1.9' });
    expect(assets[0].url).toContain('/releases/assets/');
    expect(calls.some((c) => new URL(c.url).hostname === 'raw.githubusercontent.com')).toBe(false);
    expect(calls.filter((c) => c.url.includes('/releases/assets/')).every((c) => c.accept === 'application/octet-stream')).toBe(true);
  });

  it('offers a bootloader only on request and leaves out an image the release does not carry', async () => {
    stub({ ...release, assets: release.assets.filter((a) => a.name !== 'HYDRA_RCB_APP_v0.1.9.bin') });
    const assets = await fetchGithubFirmwareReleases('JuanenRac/HYDRA-UMC', 'controllerBoard', 'main', { includeBootloaders: true });
    expect(assets.map((a) => a.name)).toEqual(['HYDRA_RCB_BOOTLOADER_v0.1.8.bin']);
    expect(assets[0].isBootloader).toBe(true);
  });

  it('returns nothing before the first release and when the release has no manifest', async () => {
    stub({}, 404);
    expect(await fetchGithubFirmwareReleases('JuanenRac/HYDRA-UMC', 'controllerBoard')).toEqual([]);
    stub({ assets: [asset('other.txt')] });
    expect(await fetchGithubFirmwareReleases('JuanenRac/HYDRA-UMC', 'controllerBoard')).toEqual([]);
  });

  it('a hash in the manifest wins over the one GitHub computed', async () => {
    const withHash = JSON.parse(JSON.stringify(manifest));
    withHash.components.g474_application.files.bin.sha256 = 'EF'.repeat(32);
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.endsWith('/releases/latest')
      ? { ok: true, status: 200, json: async () => release }
      : url.endsWith('firmware_manifest.json') ? { ok: true, status: 200, json: async () => withHash }
      : { ok: true, status: 200, text: async () => sig })));
    const assets = await fetchGithubFirmwareReleases('JuanenRac/HYDRA-UMC', 'controllerBoard');
    expect(assets[0].sha256).toBe('ef'.repeat(32));
  });

  it('downloads an API asset asking for the file itself and checks it', async () => {
    const calls = stub(release);
    const bytes = new Uint8Array([9, 8, 7]);
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: { headers?: Record<string, string> }) => {
      calls.push({ url, accept: init?.headers?.Accept });
      return { ok: true, status: 200, arrayBuffer: async () => bytes.buffer };
    }));
    const url = 'https://api.github.com/repos/JuanenRac/HYDRA-UMC/releases/assets/1';
    await expect(downloadGithubFirmware({ name: 'x.bin', url, size: 3, releaseTag: '1', publishedAt: '', sha256: '0'.repeat(64) })).rejects.toThrow(/SHA-256 mismatch/);
    expect(calls[calls.length - 1].accept).toBe('application/octet-stream');
    await expect(downloadGithubFirmware({ name: 'x.bin', url, size: 3, releaseTag: '1', publishedAt: '', sha256: sha256Hex(bytes) })).resolves.toEqual(bytes);
  });
});

describe('sha256FromDigest', () => {
  it('takes the hash of a sha256 digest and nothing else', () => {
    expect(sha256FromDigest(`sha256:${'AB'.repeat(32)}`)).toBe('ab'.repeat(32));
    expect(sha256FromDigest('sha1:abc')).toBeUndefined();
    expect(sha256FromDigest(null)).toBeUndefined();
  });
});
