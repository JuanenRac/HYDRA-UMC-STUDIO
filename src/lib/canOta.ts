// =============================================================================
// HYDRA-UMC STUDIO - CAN-OTA transport: canOta.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Client-side model of the CAN-OTA chain documented in HYDRA-UMC's own
// docs/architecture.md: this dashboard (CM5) -> SPI -> STM32H745 "kinematic
// brain" -> FDCAN1 "STACK A" (up to 8 Robot Controller Board slots, A1-A8) ->
// CAN -> that robot's own URTC Tool Head. No JTAG/SWD, no USB-CAN dongle -
// every hop after the CM5 is an embedded bus reached only through this chain.
//
// The addressing scheme and bootloader command set below mirror URTC's own
// ALREADY-IMPLEMENTED, proven CAN bootloader protocol (see the sibling URTC
// repo's docs/CANBUS.TXT, IDs 0x7F0-0x7FF) - re-based per robot slot instead
// of fixed, since STACK A carries up to 8 boards on one shared bus where
// URTC's own protocol assumes exactly one. See architecture.md section 2-3
// for the full reasoning; this is a PROPOSED scheme, not yet implemented in
// any real firmware.
//
// TRANSPORT: only a 'mock' implementation exists here - it simulates realistic
// timing/behavior (page-by-page transfer, heartbeat, verify, occasional
// induced failures) entirely client-side, since no STM32H745<->CM5 firmware
// exists yet to actually talk to (settings.canOta.transport === 'hardware' is
// reserved for that once it does - see Flasher.tsx/Tester.tsx for where that
// switch is read). CRC32 itself is computed for real (not mocked) since it's
// cheap and correct regardless of which transport ends up sending it.
// =============================================================================

export type CanOtaTier = 'controllerBoard' | 'urtcHead';

export interface CanOtaTarget {
  controllerName: string;
  robotId: number;
  robotName: string;
  robotIndex0: number; // 0-7, position within its controller's robots[] array
  tier: CanOtaTier;
}

/** "A1".."A8" - matches the default robot naming (`Robot A${n}`) and HYDRA-UMC's own STACK A slot labels. */
export function slotLabel(robotIndex0: number): string {
  return `A${robotIndex0 + 1}`;
}

/** CAN_ID_STACKA_BASE + slot*0x40 - see architecture.md section 2. */
export function slotBaseId(robotIndex0: number): number {
  return 0x600 + robotIndex0 * 0x40;
}

/** +0x00 for the Robot Controller Board's own bootloader window, +0x20 for its relay-to-URTC-head window - see architecture.md section 3. */
export function tierBaseId(robotIndex0: number, tier: CanOtaTier): number {
  return slotBaseId(robotIndex0) + (tier === 'urtcHead' ? 0x20 : 0x00);
}

export function hopDescription(target: CanOtaTarget): string {
  const base = `${target.controllerName} -> SPI -> STM32H745 -> FDCAN1 (STACK A) -> ${slotLabel(target.robotIndex0)}`;
  return target.tier === 'urtcHead' ? `${base} -> CAN (relay) -> URTC Tool Head` : base;
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

// Simulated per-hop latency - a URTC-head target crosses one more physical bus than a
// controller-board target, so it should visibly take a little longer in the mock too.
function hopLatencyMs(target: CanOtaTarget): number {
  return target.tier === 'urtcHead' ? 45 : 20;
}

export interface VersionQueryResult {
  online: boolean;
  firmwareVersion?: string;
  bootloaderVersion?: string;
  hardwareId?: string;
}

/** Simulates the VERSION_QUERY/VERSION_RESPONSE round trip (mirrors URTC's own 0x7F8/0x7F9/0x7FA). */
export async function mockQueryVersion(target: CanOtaTarget): Promise<VersionQueryResult> {
  await sleep(hopLatencyMs(target) * 2);
  // ~90% of the time a target that's plausibly online answers; purely cosmetic randomness
  // so the UI has something realistic to show without a real bus to query.
  const online = Math.random() > 0.05;
  if (!online) return { online: false };
  return {
    online: true,
    firmwareVersion: `1.${Math.floor(Math.random() * 4)}.${Math.floor(Math.random() * 10)}`,
    bootloaderVersion: '1.0.0',
    hardwareId: `${target.tier === 'urtcHead' ? 'URTC' : 'RCB'}-${(target.robotIndex0 + 1).toString().padStart(3, '0')}`,
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
 * Simulates a full CAN-OTA flash cycle: ENTER_BOOTLOADER -> (optional FRAM erase) ->
 * START_UPDATE -> page-by-page DATA+PAGE_ACK -> END_UPDATE (CRC32+version) -> STATUS/
 * HEARTBEAT verify -> reboot to app. Mirrors URTC's own bootloader state machine
 * (docs/CANBUS.TXT 0x7F0-0x7FF), relayed one extra hop for a urtcHead target.
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
 * never actuates anything at meaningful power. Same checks apply to both tiers; a
 * controllerBoard target additionally gets an axis/endstop continuity check.
 */
export async function* mockSelfTest(target: CanOtaTarget): AsyncGenerator<SelfTestStep> {
  const latency = hopLatencyMs(target);
  const steps: { id: string; labelKey: string }[] = [
    { id: 'comm', labelKey: 'comm' },
    { id: 'version', labelKey: 'version' },
    { id: 'fram', labelKey: 'fram' },
  ];
  if (target.tier === 'controllerBoard') steps.push({ id: 'axes', labelKey: 'axes' }, { id: 'endstops', labelKey: 'endstops' });
  if (target.tier === 'urtcHead') steps.push({ id: 'tool', labelKey: 'tool' }, { id: 'telemetry', labelKey: 'telemetry' });

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
  const base = tierBaseId(target.robotIndex0, target.tier);
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
