// =============================================================================
// HYDRA-UMC STUDIO - tests/canOtaManifestRequirements.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGithubFirmwareReleases, flashSigningOptions, hardwareStartFlash, manifestFlashRequirements } from '../src/lib/canOta';

afterEach(() => vi.unstubAllGlobals());

describe('manifestFlashRequirements', () => {
  it('reads target and min_bootloader from the component', () => {
    expect(manifestFlashRequirements({ target: 'g474', min_bootloader: '0.1.7' }, {})).toEqual({ target: 'g474', minBootloader: '0.1.7' });
  });
  it('lets the binary entry win over the component', () => {
    expect(manifestFlashRequirements({ target: 'g474', min_bootloader: '0.1.7' }, { target: 'h745-cm7', min_bootloader: '0.2.0' })).toEqual({ target: 'h745-cm7', minBootloader: '0.2.0' });
  });
  it('returns nothing for a manifest that states neither', () => {
    expect(manifestFlashRequirements({}, {})).toEqual({});
    expect(manifestFlashRequirements(undefined, undefined)).toEqual({});
  });
  it('drops values the relay would refuse instead of sending them', () => {
    expect(manifestFlashRequirements({ target: 'a b/../c', min_bootloader: '1.2' }, { target: 7, min_bootloader: ['1.0.0'] })).toEqual({});
  });
  it('falls back to the component when the binary value is malformed', () => {
    expect(manifestFlashRequirements({ target: 'g474' }, { target: '??' })).toEqual({ target: 'g474' });
  });
});

describe('flashSigningOptions with requirements', () => {
  it('carries them and omits them when absent', () => {
    expect(flashSigningOptions('0.1.9', undefined, null, { target: 'g474', minBootloader: '0.1.7' })).toMatchObject({ target: 'g474', minBootloader: '0.1.7' });
    const plain = flashSigningOptions('0.1.9', undefined, null);
    expect('target' in plain).toBe(false);
    expect('minBootloader' in plain).toBe(false);
  });
});

describe('hardwareStartFlash sends the manifest requirements', () => {
  const board = { tier: 'controllerBoard', controllerName: 'c', robotIndex0: 0 } as never;
  it('puts target and min_bootloader in the query of the relay', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true, finalPhase: 'done' }) }));
    vi.stubGlobal('fetch', fetchMock);
    await hardwareStartFlash(board, new Uint8Array([1]), 0, 1, 't', 1, { target: 'g474', minBootloader: '0.1.7' });
    const url = (fetchMock.mock.calls[0] as unknown as [string])[0];
    const q = new URLSearchParams(url.split('?')[1]);
    expect(q.get('target')).toBe('g474');
    expect(q.get('min_bootloader')).toBe('0.1.7');
  });
  it('sends neither when the manifest states none', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true, finalPhase: 'done' }) }));
    vi.stubGlobal('fetch', fetchMock);
    await hardwareStartFlash(board, new Uint8Array([1]), 0, 1, 't', 1, {});
    const q = new URLSearchParams((fetchMock.mock.calls[0] as unknown as [string])[0].split('?')[1]);
    expect(q.has('target')).toBe(false);
    expect(q.has('min_bootloader')).toBe(false);
  });
});

describe('fetchGithubFirmwareReleases reads the requirements of the manifest', () => {
  it('exposes target and minBootloader on the asset', async () => {
    const manifest = {
      components: {
        g474_application: {
          display_name: 'RCB', chip: 'STM32G474', version_string: '0.1.9', hardware_id: '0x1', target: 'g474',
          files: { bin: { filename: 'a.bin', size_bytes: 3, crc32: '0x2', min_bootloader: '0.1.7' } },
        },
      },
    };
    const release = {
      tag_name: 'v1', published_at: '', assets: [
        { name: 'firmware_manifest.json', url: 'https://api.github.com/repos/x/releases/assets/1' },
        { name: 'a.bin', url: 'https://api.github.com/repos/x/releases/assets/2' },
      ],
    };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/releases/latest')) return { ok: true, status: 200, json: async () => release };
      if (url.endsWith('/assets/1')) return { ok: true, status: 200, json: async () => manifest };
      return { ok: false, status: 500 };
    }));
    const assets = await fetchGithubFirmwareReleases('JuanenRac/HYDRA-UMC', 'controllerBoard');
    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({ target: 'g474', minBootloader: '0.1.7' });
  });
});
