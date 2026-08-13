// =============================================================================
// HYDRA-UMC STUDIO - CAN-OTA transport: canOta.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Client-side model of the 4-tier chain documented in HYDRA-UMC's own
// docs/architecture.md: this dashboard (CM5) -> SPI -> STM32H745ZIT6
// "kinematic brain" (Tier 0) -> FDCAN1 "STACK A" -> that robot's own
// STM32G474RET6 Robot Controller Board (Tier 1, one of up to 8 slots, A1-A8)
// -> CAN (relay) -> its STM32F303CCT6 URTC Tool Head (Tier 2) -> I2C (relay)
// -> its optional STM32F303CBT6 Advanced Expansion Board (Tier 3, only
// present when that URTC head's own expansion_board_type is 3 or 4). No
// JTAG/SWD, no USB-CAN dongle - every hop after the CM5 is an embedded bus
// reached only through this chain.
//
// The addressing scheme and bootloader command set below mirror URTC's own
// ALREADY-IMPLEMENTED, proven CAN bootloader protocol (see the sibling URTC
// repo's docs/CANBUS.TXT, IDs 0x7F0-0x7FF) - re-based per robot slot instead
// of fixed for Tier 1, and reached via a generic ID-agnostic relay tunnel
// for Tiers 2-3 (so reaching the Advanced Expansion Board needs no new
// protocol at all - it piggybacks on URTC's own existing 0x210-0x221 I2C
// relay). See architecture.md sections 2-4 for the full reasoning; this is
// a PROPOSED scheme, not yet implemented in any real firmware.
//
// TRANSPORT: only a 'mock' implementation exists here - it simulates realistic
// timing/behavior (page-by-page transfer, heartbeat, verify, occasional
// induced failures) entirely client-side, since no STM32H745<->CM5 firmware
// exists yet to actually talk to (settings.canOta.transport === 'hardware' is
// reserved for that once it does - see Flasher.tsx/Tester.tsx for where that
// switch is read). CRC32 itself is computed for real (not mocked) since it's
// cheap and correct regardless of which transport ends up sending it.
// =============================================================================

export type CanOtaTier = 'kinematicBrain' | 'controllerBoard' | 'urtcHead' | 'urtcExpansion';

export interface CanOtaTarget {
  controllerName: string;
  tier: CanOtaTier;
  // Unused (undefined) for 'kinematicBrain' - that tier is controller-level, reached
  // directly over SPI, with no FDCAN1 "STACK A" slot involved at all.
  robotId?: number;
  robotName?: string;
  robotIndex0?: number; // 0-7, position within its controller's robots[] array
}

/** "A1".."A8" - matches the default robot naming (`Robot A${n}`) and HYDRA-UMC's own STACK A slot labels. */
export function slotLabel(robotIndex0: number): string {
  return `A${robotIndex0 + 1}`;
}

/** CAN_ID_STACKA_BASE + slot*0x20 - see architecture.md section 3. */
export function slotBaseId(robotIndex0: number): number {
  return 0x600 + robotIndex0 * 0x20;
}

/** Robot Controller Board's own bootloader/telemetry block, +0x00 within its slot - architecture.md section 3. */
export function tierBaseId(robotIndex0: number, tier: CanOtaTier): number {
  return slotBaseId(robotIndex0);
}

/** Number of relay hops a target is reached through - drives simulated latency and the hop description. */
export function hopCount(tier: CanOtaTier): number {
  return tier === 'kinematicBrain' ? 0 : tier === 'controllerBoard' ? 1 : tier === 'urtcHead' ? 2 : 3;
}

export function hopDescription(target: CanOtaTarget): string {
  if (target.tier === 'kinematicBrain') {
    return `${target.controllerName} -> SPI -> STM32H745ZIT6 (Kinematic Brain)`;
  }
  const base = `${target.controllerName} -> SPI -> STM32H745 -> FDCAN1 (STACK A) -> ${slotLabel(target.robotIndex0!)} (STM32G474RET6)`;
  if (target.tier === 'controllerBoard') return base;
  if (target.tier === 'urtcHead') return `${base} -> CAN (relay) -> URTC Tool Head (STM32F303CCT6)`;
  return `${base} -> CAN (relay) -> URTC Tool Head -> I2C (relay) -> Advanced Expansion (STM32F303CBT6)`;
}

export function chipNameFor(tier: CanOtaTier): string {
  if (tier === 'kinematicBrain') return 'STM32H745ZIT6';
  if (tier === 'controllerBoard') return 'STM32G474RET6';
  if (tier === 'urtcHead') return 'STM32F303CCT6';
  return 'STM32F303CBT6';
}

/** expansion_board_type values 3 (TMC2209) and 4 (TMC5160A) are the 2 "Advanced" variants with their own STM32F303CBT6 - see URTC/docs/EXPANSION.TXT section 2-3. Everything else has no separate MCU to flash. */
export function hasAdvancedExpansion(expansionBoardType: number | undefined): boolean {
  return expansionBoardType === 3 || expansionBoardType === 4;
}

// Real CRC32 (IEEE 802.3 polynomial) - not mocked, useful/correct regardless of transport.
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

// Simulated per-hop latency - each relay tier crosses one more physical bus than the last,
// so it should visibly take a little longer in the mock too.
function hopLatencyMs(target: CanOtaTarget): number {
  return 15 + hopCount(target.tier) * 15;
}

export interface VersionQueryResult {
  online: boolean;
  firmwareVersion?: string;
  bootloaderVersion?: string;
  hardwareId?: string;
  expansionBoardType?: number; // only meaningful for a urtcHead query
}

/** Simulates the VERSION_QUERY/VERSION_RESPONSE round trip (mirrors URTC's own 0x7F8/0x7F9/0x7FA). */
export async function mockQueryVersion(target: CanOtaTarget): Promise<VersionQueryResult> {
  await sleep(hopLatencyMs(target) * 2);
  // ~90% of the time a target that's plausibly online answers; purely cosmetic randomness
  // so the UI has something realistic to show without a real bus to query.
  const online = Math.random() > 0.05;
  if (!online) return { online: false };
  const prefix = target.tier === 'kinematicBrain' ? 'KB' : target.tier === 'controllerBoard' ? 'RCB' : target.tier === 'urtcHead' ? 'URTC' : 'EXP';
  return {
    online: true,
    firmwareVersion: `1.${Math.floor(Math.random() * 4)}.${Math.floor(Math.random() * 10)}`,
    bootloaderVersion: '1.0.0',
    hardwareId: `${prefix}-${((target.robotIndex0 ?? -1) + 1).toString().padStart(3, '0')}`,
    expansionBoardType: target.tier === 'urtcHead' ? [0, 0, 0, 3, 6][Math.floor(Math.random() * 5)] : undefined,
  };
}

export type FlashPhase = 'connecting' | 'entering_bootloader' | 'erasing_fram' | 'transferring' | 'verifying' | 'rebooting' | 'done' | 'error';

export interface FlashProgress {
  phase: FlashPhase;
  pagesSent: number;
  pagesTotal: number;
  percent: number;
  messageKey: string; // i18n key under flasher.progress.*
  error?: string;
}

const FLASH_PAGE_SIZE = 2048; // matches URTC's own bootloader page size

export interface FlashOptions {
  allowDowngrade: boolean;
  eraseFram: boolean;
}

/**
 * Simulates a full CAN-OTA (or, for kinematicBrain, SPI-OTA) flash cycle: ENTER_BOOTLOADER ->
 * (optional FRAM erase) -> START_UPDATE -> page-by-page DATA+PAGE_ACK -> END_UPDATE
 * (CRC32+version) -> STATUS/HEARTBEAT verify -> reboot to app. Mirrors URTC's own bootloader
 * state machine (docs/CANBUS.TXT 0x7F0-0x7FF), relayed 0-3 extra hops depending on target tier.
 */
export async function* mockFlash(target: CanOtaTarget, firmware: Uint8Array, opts: FlashOptions): AsyncGenerator<FlashProgress> {
  const latency = hopLatencyMs(target);
  const pagesTotal = Math.max(1, Math.ceil(firmware.length / FLASH_PAGE_SIZE));

  yield { phase: 'connecting', pagesSent: 0, pagesTotal, percent: 0, messageKey: 'connecting' };
  await sleep(latency * 3);

  yield { phase: 'entering_bootloader', pagesSent: 0, pagesTotal, percent: 2, messageKey: 'entering_bootloader' };
  await sleep(latency * 2);

  if (opts.eraseFram) {
    yield { phase: 'erasing_fram', pagesSent: 0, pagesTotal, percent: 4, messageKey: 'erasing_fram' };
    await sleep(latency * 2);
  }

  for (let page = 1; page <= pagesTotal; page++) {
    await sleep(latency + Math.random() * latency * 0.5);
    const percent = 5 + Math.round((page / pagesTotal) * 80);
    yield { phase: 'transferring', pagesSent: page, pagesTotal, percent, messageKey: 'transferring' };
  }

  yield { phase: 'verifying', pagesSent: pagesTotal, pagesTotal, percent: 90, messageKey: 'verifying' };
  await sleep(latency * 4);

  // Anti-rollback simulation: only meaningful cosmetically here (no real installed-version
  // bookkeeping in the mock), included so the option's effect is visibly represented.
  if (!opts.allowDowngrade && Math.random() < 0.03) {
    yield { phase: 'error', pagesSent: pagesTotal, pagesTotal, percent: 90, messageKey: 'error_rollback', error: 'anti-rollback' };
    return;
  }

  yield { phase: 'rebooting', pagesSent: pagesTotal, pagesTotal, percent: 96, messageKey: 'rebooting' };
  await sleep(latency * 3);

  yield { phase: 'done', pagesSent: pagesTotal, pagesTotal, percent: 100, messageKey: 'done' };
}

export interface SelfTestStep {
  id: string;
  labelKey: string; // i18n key under tester.selftest.*
  pass: boolean;
  detail?: string;
}

/**
 * Safe, at-rest checks only - mirrors URTC-TESTER's own explicit philosophy (see that
 * project's README): confirms comms and, where relevant, a zero setpoint round-trips,
 * never actuates anything at meaningful power. Steps vary by tier.
 */
export async function* mockSelfTest(target: CanOtaTarget): AsyncGenerator<SelfTestStep> {
  const latency = hopLatencyMs(target);
  const steps: { id: string; labelKey: string }[] = [
    { id: 'comm', labelKey: 'comm' },
    { id: 'version', labelKey: 'version' },
  ];
  if (target.tier === 'kinematicBrain') steps.push({ id: 'spi', labelKey: 'spi' }, { id: 'fdcan', labelKey: 'fdcan' });
  if (target.tier === 'controllerBoard') steps.push({ id: 'fram', labelKey: 'fram' }, { id: 'axes', labelKey: 'axes' }, { id: 'endstops', labelKey: 'endstops' });
  if (target.tier === 'urtcHead') steps.push({ id: 'fram', labelKey: 'fram' }, { id: 'tool', labelKey: 'tool' }, { id: 'telemetry', labelKey: 'telemetry' });
  if (target.tier === 'urtcExpansion') steps.push({ id: 'i2c', labelKey: 'i2c' }, { id: 'telemetry', labelKey: 'telemetry' });

  for (const step of steps) {
    await sleep(latency * 2 + Math.random() * latency);
    yield { ...step, pass: Math.random() > 0.05 };
  }
}

export interface CanFrame {
  id: number;
  dlc: number;
  data: number[];
  direction: 'tx' | 'rx';
  timestamp: number;
}

/** Emits periodic heartbeat/telemetry-shaped frames for the Raw Bus Monitor. Returns a stop function. */
export function startMockBusMonitor(target: CanOtaTarget, onFrame: (f: CanFrame) => void): () => void {
  const base = target.tier === 'kinematicBrain' ? 0x000 : tierBaseId(target.robotIndex0!, target.tier);
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    const isHeartbeat = Math.random() > 0.4;
    onFrame({
      id: isHeartbeat ? base + 0x06 : base + 0x08,
      dlc: isHeartbeat ? 2 : 4,
      data: Array.from({ length: isHeartbeat ? 2 : 4 }, () => Math.floor(Math.random() * 256)),
      direction: 'rx',
      timestamp: Date.now(),
    });
    setTimeout(tick, hopLatencyMs(target) * 8 + Math.random() * 400);
  };
  setTimeout(tick, 200);
  return () => { stopped = true; };
}

// ---------------------------------------------------------------------------
// GitHub firmware download - lets Flasher pick a firmware asset from a
// project's own GitHub Releases instead of browsing for a local .bin. Wired
// for the URTC repo only for now (the only one that actually ships firmware
// today) - kinematicBrain/controllerBoard have no repo publishing firmware
// yet, so callers should simply not offer this for those tiers.
// ---------------------------------------------------------------------------

/** Repo to check per tier - only URTC exists today; the other 3 are reserved for when their own firmware repos start publishing releases. */
export const GITHUB_FIRMWARE_REPO: Partial<Record<CanOtaTier, string>> = {
  urtcHead: 'JuanenRac/URTC',
  urtcExpansion: 'JuanenRac/URTC',
};

export interface GithubFirmwareAsset {
  name: string;
  url: string;
  size: number;
  releaseTag: string;
  publishedAt: string;
}

/** GET /repos/{repo}/releases, filtered to .bin assets - public GitHub REST API, no auth needed for a public repo's own releases. */
export async function fetchGithubFirmwareReleases(repo: string): Promise<GithubFirmwareAsset[]> {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const releases = await res.json() as any[];
  const assets: GithubFirmwareAsset[] = [];
  for (const rel of releases) {
    for (const asset of rel.assets || []) {
      if (!/\.bin$/i.test(asset.name)) continue;
      assets.push({
        name: asset.name,
        url: asset.browser_download_url,
        size: asset.size,
        releaseTag: rel.tag_name,
        publishedAt: rel.published_at,
      });
    }
  }
  return assets;
}

export async function downloadGithubFirmware(asset: GithubFirmwareAsset): Promise<Uint8Array> {
  const res = await fetch(asset.url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
