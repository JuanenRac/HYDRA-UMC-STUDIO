// =============================================================================
// HYDRA-UMC STUDIO - tests/canOtaPure.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The CAN-OTA addressing, the route to each board, the CRC32 the bootloader
// recomputes, and the HTTP calls that reach the real hardware or refuse to.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  chipNameFor, crc32, downloadGithubFirmware, fetchGithubFirmwareReleases, hardwareQueryVersion, hardwareStartFlash,
  hasAdvancedExpansion, hopCount, hopDescription, resolveHardwareTarget, slotBaseId, slotLabel, tierBaseId,
  SPI_TARGET_SELF, SPI_TARGET_STACKA,
} from '../src/lib/canOta';
import type { CanOtaTarget, CanOtaTier } from '../src/lib/canOta';
import { sha256Hex } from '../src/lib/sha256';

const TIERS: CanOtaTier[] = ['kinematicBrain', 'controllerBoard', 'urtcHead', 'urtcExpansion'];
const target = (tier: CanOtaTier, robotIndex0 = 2): CanOtaTarget => ({ controllerName: 'Cell 1', tier, robotIndex0 });

afterEach(() => { vi.unstubAllGlobals(); });

describe('slot addressing', () => {
  it('labels the eight slots A1 to A8 and gives each its own 0x20 window from 0x600', () => {
    expect(Array.from({ length: 8 }, (_, i) => slotLabel(i))).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8']);
    expect(slotBaseId(0)).toBe(0x600);
    expect(slotBaseId(1)).toBe(0x620);
    expect(slotBaseId(7)).toBe(0x6e0);
  });

  it('never lets two slots overlap and keeps every slot inside the 11-bit CAN identifier range', () => {
    const bases = Array.from({ length: 8 }, (_, i) => slotBaseId(i));
    for (let i = 1; i < bases.length; i++) expect(bases[i] - bases[i - 1]).toBe(0x20);
    expect(bases[7] + 0x1f).toBeLessThanOrEqual(0x7ff);
  });

  it('uses the slot base for the controller board whatever the tier argument', () => {
    for (const tier of TIERS) expect(tierBaseId(3, tier)).toBe(slotBaseId(3));
  });
});

describe('route to each board', () => {
  it('counts more relay hops the further the board is', () => {
    expect(TIERS.map(hopCount)).toEqual([0, 1, 2, 3]);
  });

  it('names the chip of every tier', () => {
    expect(TIERS.map(chipNameFor)).toEqual(['STM32H745ZIT6', 'STM32G474RET6', 'STM32F303CCT6', 'STM32F303CBT6']);
  });

  it('describes a longer path for each further tier and names the slot', () => {
    const lengths = TIERS.map((tier) => hopDescription(target(tier)).length);
    expect(lengths[0]).toBeLessThan(lengths[1]);
    expect(lengths[1]).toBeLessThan(lengths[2]);
    expect(lengths[2]).toBeLessThan(lengths[3]);
    expect(hopDescription(target('controllerBoard', 4))).toContain('A5');
    expect(hopDescription(target('kinematicBrain'))).not.toContain('FDCAN1');
    expect(hopDescription(target('urtcExpansion'))).toContain('I2C');
  });

  it('knows only the two expansion boards with a TMC driver have a processor of their own', () => {
    expect(hasAdvancedExpansion(3)).toBe(true);
    expect(hasAdvancedExpansion(4)).toBe(true);
    for (const other of [undefined, 0, 1, 2, 5, -1, 3.5]) expect(hasAdvancedExpansion(other)).toBe(false);
  });
});

describe('crc32', () => {
  it('matches the standard IEEE values', () => {
    const text = (s: string) => new TextEncoder().encode(s);
    expect(crc32(new Uint8Array(0))).toBe(0);
    expect(crc32(text('123456789'))).toBe(0xcbf43926);
    expect(crc32(text('hello world'))).toBe(0x0d4a1185);
    expect(crc32(new Uint8Array(1024))).toBe(0xefb5af2e);
  });

  it('returns an unsigned number and notices a single flipped bit anywhere', () => {
    const data = new Uint8Array(64).map((_, i) => i * 3);
    const base = crc32(data);
    expect(base).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < data.length; i++) {
      const damaged = data.slice();
      damaged[i] ^= 0x01;
      expect(crc32(damaged)).not.toBe(base);
    }
  });
});

describe('resolveHardwareTarget', () => {
  it('reaches the Kinematic Brain directly, a controller board through its slot, a tool head through the relay', () => {
    expect(resolveHardwareTarget(target('kinematicBrain'))).toEqual({ targetTier: SPI_TARGET_SELF, targetSlot: 0, relay: false });
    expect(resolveHardwareTarget(target('controllerBoard', 5))).toEqual({ targetTier: SPI_TARGET_STACKA, targetSlot: 5, relay: false });
    expect(resolveHardwareTarget(target('urtcHead', 6))).toEqual({ targetTier: SPI_TARGET_STACKA, targetSlot: 6, relay: true });
  });

  it('does not pretend to reach the third tier', () => {
    expect(resolveHardwareTarget(target('urtcExpansion'))).toBeNull();
  });

  it('falls back to slot 0 when the robot position is unknown', () => {
    expect(resolveHardwareTarget({ controllerName: 'c', tier: 'controllerBoard' })?.targetSlot).toBe(0);
  });
});

describe('hardwareQueryVersion', () => {
  it('sends the bearer token and the resolved tier, slot and relay flag', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ online: true, firmware_major: 0, firmware_minor: 2, hardware_id: 0x47343031 }) }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await hardwareQueryVersion(target('urtcHead', 3), 'tok');
    expect(result).toEqual({ online: true, firmwareVersion: '0.2.0', hardwareId: '0x47343031' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(url).toBe('/api/hardware/canota/version?tier=2&slot=3&relay=1');
    expect(init.headers).toEqual({ Authorization: 'Bearer tok' });
  });

  it('sends no Authorization header without a token', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ online: false }) }));
    vi.stubGlobal('fetch', fetchMock);
    await hardwareQueryVersion(target('controllerBoard'), null);
    expect((fetchMock.mock.calls[0] as unknown as [string, { headers: object }])[1].headers).toEqual({});
  });

  it('says offline for an HTTP error, a network error, an offline answer and an unreachable tier, never throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })));
    expect(await hardwareQueryVersion(target('controllerBoard'), 't')).toEqual({ online: false });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network'); }));
    expect(await hardwareQueryVersion(target('controllerBoard'), 't')).toEqual({ online: false });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ online: false }) })));
    expect(await hardwareQueryVersion(target('controllerBoard'), 't')).toEqual({ online: false });
    const untouched = vi.fn();
    vi.stubGlobal('fetch', untouched);
    expect(await hardwareQueryVersion(target('urtcExpansion'), 't')).toEqual({ online: false });
    expect(untouched).not.toHaveBeenCalled();
  });

  it('pads the hardware id to eight hex digits and treats a missing id as zero', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ online: true, firmware_major: 1, firmware_minor: 0 }) })));
    expect((await hardwareQueryVersion(target('kinematicBrain'), null)).hardwareId).toBe('0x00000000');
  });
});

describe('hardwareStartFlash', () => {
  const image = new Uint8Array([1, 2, 3]);

  it('puts the target, the version and the hardware id in the query and the image in the body', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true, finalPhase: 'done' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await hardwareStartFlash(target('controllerBoard', 1), image, 0, 3, 'tok', 0x47343031);
    expect(result).toEqual({ reachable: true, success: true, reason: 'done' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { method: string; headers: Record<string, string>; body: Blob }];
    const query = new URLSearchParams(url.split('?')[1]);
    expect(Object.fromEntries(query)).toEqual({ tier: '2', slot: '1', relay: '0', hardware_id: String(0x47343031), version_major: '0', version_minor: '3' });
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/octet-stream', Authorization: 'Bearer tok' });
    expect(init.body.size).toBe(3);
  });

  it('defaults the hardware id to zero so the board rejects an image nobody can vouch for', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: false, finalPhase: 'error' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await hardwareStartFlash(target('controllerBoard'), image, 0, 1, null);
    expect(result.success).toBe(false);
    expect(String((fetchMock.mock.calls[0] as unknown as [string])[0])).toContain('hardware_id=0');
  });

  it('reports the server error text, or the status when there is none', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 409, json: async () => ({ error: 'robot is claimed by bob' }) })));
    expect(await hardwareStartFlash(target('controllerBoard'), image, 0, 1, 't')).toEqual({ reachable: true, success: false, reason: 'robot is claimed by bob' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, json: async () => { throw new Error('not json'); } })));
    expect(await hardwareStartFlash(target('controllerBoard'), image, 0, 1, 't')).toEqual({ reachable: true, success: false, reason: 'HTTP 502' });
  });

  it('never claims success without the success flag, and reports a thrown network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })));
    expect(await hardwareStartFlash(target('controllerBoard'), image, 0, 1, 't')).toEqual({ reachable: true, success: false, reason: 'unknown' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('connection reset'); }));
    const result = await hardwareStartFlash(target('controllerBoard'), image, 0, 1, 't');
    expect(result.success).toBe(false);
    expect(result.reason).toContain('connection reset');
  });

  it('does not send anything for the unreachable third tier', async () => {
    const untouched = vi.fn();
    vi.stubGlobal('fetch', untouched);
    const result = await hardwareStartFlash(target('urtcExpansion'), image, 0, 1, 't');
    expect(result).toMatchObject({ reachable: false, success: false });
    expect(untouched).not.toHaveBeenCalled();
  });
});

describe('fetchGithubFirmwareReleases', () => {
  const manifestOf = (components: Record<string, unknown>) => ({ components });
  const comp = (name: string) => ({ display_name: name, chip: 'chip', version_string: '1.0.0', hardware_id: '0x1', files: { bin: { filename: `${name}.bin`, size_bytes: 4, crc32: '0x1' } } });

  it('refuses a repository it has no manifest location for, before any request', async () => {
    const untouched = vi.fn();
    vi.stubGlobal('fetch', untouched);
    await expect(fetchGithubFirmwareReleases('someone/else', 'urtcHead')).rejects.toThrow(/No known firmware_manifest/);
    expect(untouched).not.toHaveBeenCalled();
  });

  it('treats a missing manifest as no firmware and any other HTTP error as a failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    expect(await fetchGithubFirmwareReleases('JuanenRac/URTC', 'urtcHead')).toEqual([]);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
    await expect(fetchGithubFirmwareReleases('JuanenRac/URTC', 'urtcHead')).rejects.toThrow(/500/);
  });

  it('keeps the order of the components of the tier and skips those the manifest lacks', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => manifestOf({ h745_cm4_application: comp('cm4'), h745_cm7_application: comp('cm7'), unrelated: comp('x') }) })));
    const assets = await fetchGithubFirmwareReleases('JuanenRac/HYDRA-UMC', 'kinematicBrain');
    expect(assets.map((a) => a.name)).toEqual(['cm7.bin', 'cm4.bin']);
  });

  it('builds the raw URL of each image from the repository, branch and file name', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => manifestOf({ g474_application: comp('rcb') }) })));
    const [asset] = await fetchGithubFirmwareReleases('JuanenRac/HYDRA-UMC', 'controllerBoard', 'dev');
    expect(asset.url).toBe('https://raw.githubusercontent.com/JuanenRac/HYDRA-UMC/dev/firmware/rcb.bin');
    expect(asset).toMatchObject({ releaseTag: '1.0.0', hardwareId: '0x1', isBootloader: false });
  });

  it('returns nothing for a tier with no components', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => manifestOf({ g474_application: comp('rcb') }) })));
    expect(await fetchGithubFirmwareReleases('JuanenRac/HYDRA-UMC', 'urtcExpansion')).toEqual([]);
  });
});

describe('downloadGithubFirmware', () => {
  const bytes = new Uint8Array([9, 8, 7, 6]);
  const asset = (over: object = {}) => ({ name: 'a.bin', url: 'https://example.invalid/a.bin', size: 4, releaseTag: '1', publishedAt: '', ...over });

  it('returns the image when it matches its manifest entry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => bytes.buffer.slice(0) })));
    const crc = `0x${crc32(bytes).toString(16).toUpperCase().padStart(8, '0')}`;
    expect(Array.from(await downloadGithubFirmware(asset({ crc32: crc, sha256: sha256Hex(bytes) })))).toEqual([9, 8, 7, 6]);
  });

  it('refuses a failed download and a corrupted one', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    await expect(downloadGithubFirmware(asset())).rejects.toThrow(/Download failed: 404/);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => bytes.buffer.slice(0) })));
    await expect(downloadGithubFirmware(asset({ crc32: '0x00000001' }))).rejects.toThrow(/CRC32 mismatch/);
  });
});
