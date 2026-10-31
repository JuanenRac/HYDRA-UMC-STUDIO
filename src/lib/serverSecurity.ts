// =============================================================================
// HYDRA-UMC STUDIO - src/lib/serverSecurity.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The access options the Server Admin screen shows and changes (GET/PUT /api/admin/server-config):
// who may use the local AI relay, whether the host information asks for a sign-in, and TLS. The
// reading is tolerant: a server that predates these options answers without them and the screen
// simply does not show the section. The Bluetooth LE service (off, state only, or state and commands, with an
// encrypted link required by default) is one more option of the same kind.

export type SecuritySource = 'env' | 'config' | 'default';
export type BleMode = 'off' | 'state' | 'commands';
export type MqttMode = 'off' | 'state' | 'commands';

export interface SecurityState {
  aiAccess: { value: 'open' | 'admin'; source: SecuritySource };
  infoAuth: { value: boolean; source: SecuritySource };
  tls: {
    enabled: boolean;
    source: SecuritySource;
    certPath: string;
    keyPath: string;
    fingerprint256: string | null;
    active: boolean;
    appliesOnRestart: boolean;
  };
  /** Absent when the server predates the Bluetooth LE service. */
  ble: {
    mode: { value: BleMode; source: SecuritySource };
    requireEncryption: { value: boolean; source: SecuritySource };
    activeMode: BleMode;
    appliesOnRestart: boolean;
  } | null;
  /** Absent when the server predates the MQTT bridge. */
  mqtt: {
    mode: { value: MqttMode; source: SecuritySource };
    url: string;
    prefix: string;
    username: string;
    commandUser: string;
    activeMode: MqttMode;
    appliesOnRestart: boolean;
  } | null;
  /** Absent when the server predates the voice options. */
  voice: {
    includeHeardText: { value: boolean; source: SecuritySource };
    minConfidence: { value: number; source: SecuritySource };
  } | null;
  /** Absent when the server predates safe mode. */
  robots: {
    allowEnable: { value: boolean; source: SecuritySource };
  } | null;
  /** Absent when the server predates the history of connections. */
  connections: {
    recordAddress: { value: boolean; source: SecuritySource };
  } | null;
  /** Absent when the server predates the unauthenticated health route. */
  health: {
    open: { value: boolean; source: SecuritySource };
  } | null;
  /** Absent when the server predates the announcement of the global stop. */
  safety: {
    publishGlobalStop: { value: boolean; source: SecuritySource };
  } | null;
  /** Absent when the server predates the exposure options (camera pictures, token in the WebSocket address, blanking of secrets in the log, signature of a spoken confirmation). */
  exposure: {
    cameraOpen: { value: boolean; source: SecuritySource };
    wsQueryToken: { value: boolean; source: SecuritySource };
    logRedaction: { value: boolean; source: SecuritySource };
    voiceSignature: { value: boolean; source: SecuritySource };
  } | null;
  /** Absent when the server predates the installation options (the password of an IP camera handed over through the environment, TLS switched on by a new installation). */
  install: {
    cameraCredentialsViaEnv: { value: boolean; source: SecuritySource };
    newInstallTls: { value: boolean; source: SecuritySource };
  } | null;
  /** Absent when the server predates the MAVLink options. The key itself is never sent, only where its file is. */
  mavlink: {
    signingKeyFile: { value: string; source: SecuritySource };
    signingAllowUnsigned: { value: boolean; source: SecuritySource };
    signing: boolean;
    appliesOnRestart: boolean;
  } | null;
}

const isConfidence = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

const isSource = (value: unknown): value is SecuritySource => value === 'env' || value === 'config' || value === 'default';

const isBleMode = (value: unknown): value is BleMode => value === 'off' || value === 'state' || value === 'commands';

const isMqttMode = (value: unknown): value is MqttMode => value === 'off' || value === 'state' || value === 'commands';

function parseMqtt(raw: any): SecurityState['mqtt'] {
  if (!raw || typeof raw !== 'object') return null;
  const mode = raw.mode;
  if (!mode || !isMqttMode(mode.value) || !isSource(mode.source)) return null;
  return {
    mode: { value: mode.value, source: mode.source },
    url: typeof raw.url === 'string' ? raw.url : '',
    prefix: typeof raw.prefix === 'string' ? raw.prefix : '',
    username: typeof raw.username === 'string' ? raw.username : '',
    commandUser: typeof raw.commandUser === 'string' ? raw.commandUser : '',
    activeMode: isMqttMode(raw.activeMode) ? raw.activeMode : 'off',
    appliesOnRestart: raw.appliesOnRestart === true,
  };
}

function parseVoice(raw: any): SecurityState['voice'] {
  if (!raw || typeof raw !== 'object') return null;
  const heard = raw.includeHeardText;
  const confidence = raw.minConfidence;
  if (!heard || !confidence) return null;
  if (typeof heard.value !== 'boolean' || !isSource(heard.source)) return null;
  if (!isConfidence(confidence.value) || !isSource(confidence.source)) return null;
  return {
    includeHeardText: { value: heard.value, source: heard.source },
    minConfidence: { value: confidence.value, source: confidence.source },
  };
}

function parseRobots(raw: any): SecurityState['robots'] {
  if (!raw || typeof raw !== 'object') return null;
  const allow = raw.allowEnable;
  if (!allow || typeof allow.value !== 'boolean' || !isSource(allow.source)) return null;
  return { allowEnable: { value: allow.value, source: allow.source } };
}

function parseConnections(raw: any): SecurityState['connections'] {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw.recordAddress;
  if (!record || typeof record.value !== 'boolean' || !isSource(record.source)) return null;
  return { recordAddress: { value: record.value, source: record.source } };
}

function parseHealth(raw: any): SecurityState['health'] {
  if (!raw || typeof raw !== 'object') return null;
  const open = raw.open;
  if (!open || typeof open.value !== 'boolean' || !isSource(open.source)) return null;
  return { open: { value: open.value, source: open.source } };
}

function parseExposure(raw: any): SecurityState['exposure'] {
  if (!raw || typeof raw !== 'object') return null;
  const pick = (value: any) => (value && typeof value.value === 'boolean' && isSource(value.source) ? { value: value.value as boolean, source: value.source as SecuritySource } : null);
  const cameraOpen = pick(raw.camera?.open);
  const wsQueryToken = pick(raw.websocket?.allowQueryToken);
  const logRedaction = pick(raw.logging?.redactSecrets);
  const voiceSignature = pick(raw.voice?.requireSignature);
  if (!cameraOpen || !wsQueryToken || !logRedaction || !voiceSignature) return null;
  return { cameraOpen, wsQueryToken, logRedaction, voiceSignature };
}

function parseInstall(raw: any): SecurityState['install'] {
  if (!raw || typeof raw !== 'object') return null;
  const pick = (value: any) => (value && typeof value.value === 'boolean' && isSource(value.source) ? { value: value.value as boolean, source: value.source as SecuritySource } : null);
  const cameraCredentialsViaEnv = pick(raw.camera?.credentialsViaEnv);
  const newInstallTls = pick(raw.install?.newInstallTls);
  if (!cameraCredentialsViaEnv || !newInstallTls) return null;
  return { cameraCredentialsViaEnv, newInstallTls };
}

function parseSafety(raw: any): SecurityState['safety'] {
  if (!raw || typeof raw !== 'object') return null;
  const publish = raw.publishGlobalStop;
  if (!publish || typeof publish.value !== 'boolean' || !isSource(publish.source)) return null;
  return { publishGlobalStop: { value: publish.value, source: publish.source } };
}

function parseMavlink(raw: any): SecurityState['mavlink'] {
  if (!raw || typeof raw !== 'object') return null;
  const key = raw.signingKeyFile;
  const unsigned = raw.signingAllowUnsigned;
  if (!key || !unsigned) return null;
  if (typeof key.value !== 'string' || !isSource(key.source)) return null;
  if (typeof unsigned.value !== 'boolean' || !isSource(unsigned.source)) return null;
  return {
    signingKeyFile: { value: key.value, source: key.source },
    signingAllowUnsigned: { value: unsigned.value, source: unsigned.source },
    signing: key.value !== '',
    appliesOnRestart: raw.appliesOnRestart === true,
  };
}

function parseBle(raw: any): SecurityState['ble'] {
  if (!raw || typeof raw !== 'object') return null;
  const mode = raw.mode;
  const encryption = raw.requireEncryption;
  if (!mode || !encryption) return null;
  if (!isBleMode(mode.value) || !isSource(mode.source)) return null;
  if (typeof encryption.value !== 'boolean' || !isSource(encryption.source)) return null;
  return {
    mode: { value: mode.value, source: mode.source },
    requireEncryption: { value: encryption.value, source: encryption.source },
    activeMode: isBleMode(raw.activeMode) ? raw.activeMode : 'off',
    appliesOnRestart: raw.appliesOnRestart === true,
  };
}

export function parseSecurityState(data: unknown): SecurityState | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, any>;
  const ai = raw.aiAccess;
  const info = raw.infoAuth;
  const tls = raw.tls;
  if (!ai || !info || !tls) return null;
  if ((ai.value !== 'open' && ai.value !== 'admin') || !isSource(ai.source)) return null;
  if (typeof info.value !== 'boolean' || !isSource(info.source)) return null;
  if (typeof tls.enabled !== 'boolean' || !isSource(tls.source)) return null;
  return {
    aiAccess: { value: ai.value, source: ai.source },
    infoAuth: { value: info.value, source: info.source },
    tls: {
      enabled: tls.enabled,
      source: tls.source,
      certPath: typeof tls.certPath === 'string' ? tls.certPath : '',
      keyPath: typeof tls.keyPath === 'string' ? tls.keyPath : '',
      fingerprint256: typeof tls.fingerprint256 === 'string' ? tls.fingerprint256 : null,
      active: tls.active === true,
      appliesOnRestart: tls.appliesOnRestart === true,
    },
    ble: parseBle(raw.ble),
    mqtt: parseMqtt(raw.mqtt),
    voice: parseVoice(raw.voice),
    robots: parseRobots(raw.robots),
    connections: parseConnections(raw.connections),
    health: parseHealth(raw.health),
    safety: parseSafety(raw.safety),
    exposure: parseExposure(raw),
    install: parseInstall(raw),
    mavlink: parseMavlink(raw.mavlink),
  };
}

/** A value fixed by the environment of the server cannot be changed from the screen. */
export const isLocked = (source: SecuritySource): boolean => source === 'env';

/** Turning the sign-in requirement of the host information off asks for a confirmation first. */
export function infoAuthChangeNeedsConfirmation(current: boolean, next: boolean): boolean {
  return current && !next;
}

/** The request body for the TLS part; null when it is switched on without both paths. */
export function tlsPatch(enabled: boolean, certPath: string, keyPath: string): { tls: { enabled: boolean; certPath: string; keyPath: string } } | null {
  const cert = certPath.trim();
  const key = keyPath.trim();
  if (enabled && (cert === '' || key === '')) return null;
  return { tls: { enabled, certPath: cert, keyPath: key } };
}

/** The request body for the Bluetooth LE part. */
export function blePatch(mode: BleMode, requireEncryption: boolean): { ble: { mode: BleMode; requireEncryption: boolean } } {
  return { ble: { mode, requireEncryption } };
}

export type MqttPatchBody = { mqtt: { mode: MqttMode; url: string; prefix: string; username: string; commandUser: string } };

/**
 * The request body for the MQTT bridge part; null when commands are asked for without the account that carries them
 * out, or when the address does not start like a broker address. The passwords are never part of it: the server reads
 * them from its environment only.
 */
export function mqttPatch(mode: MqttMode, url: string, prefix: string, username: string, commandUser: string): MqttPatchBody | null {
  const address = url.trim();
  if (address !== '' && !/^(mqtts?|wss?):\/\/\S+$/i.test(address)) return null;
  if (mode === 'commands' && commandUser.trim() === '') return null;
  return { mqtt: { mode, url: address, prefix: prefix.trim(), username: username.trim(), commandUser: commandUser.trim() } };
}

/** Carrying out commands that arrive on the broker asks for a confirmation first. */
export function mqttChangeNeedsConfirmation(current: MqttMode, next: MqttMode): boolean {
  return next === 'commands' && current !== 'commands';
}

/**
 * Taking commands over Bluetooth (the access token of the account travels in every one) without an encrypted
 * link, or dropping the encrypted link while commands are on, asks for a confirmation first.
 */
export function bleChangeNeedsConfirmation(mode: BleMode, requireEncryption: boolean): boolean {
  return mode === 'commands' && !requireEncryption;
}

export type VoicePatchBody = { voice: { includeHeardText: boolean; minConfidence: number } };

/**
 * The request body for the voice options; null when the confidence is not a number from 0 to 1 (a comma is read as a
 * decimal point, as people type it). An empty text is not a number: it never silently becomes 0.
 */
export function voicePatch(includeHeardText: boolean, minConfidence: string): VoicePatchBody | null {
  const text = minConfidence.trim().replace(',', '.');
  if (text === '' || !/^\d*\.?\d+$|^\d+\.$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0 || value > 1) return null;
  return { voice: { includeHeardText, minConfidence: value } };
}

/** Showing what was said, or switching the confidence check off, lowers the protection of the voice commands: ask first. */
export function voiceChangeNeedsConfirmation(current: { includeHeardText: boolean; minConfidence: number }, next: VoicePatchBody['voice']): boolean {
  return (!current.includeHeardText && next.includeHeardText) || (current.minConfidence > 0 && next.minConfidence === 0);
}

export type RobotsPatchBody = { robots: { allowEnable: boolean } };

/** The request body for the option that lets a client bring a disabled robot back (off by default). */
export function robotsPatch(allowEnable: boolean): RobotsPatchBody {
  return { robots: { allowEnable } };
}

/** Allowing a client to enable a robot lowers the protection of safe mode: ask first. Turning it off never asks. */
export function robotsChangeNeedsConfirmation(current: boolean, next: boolean): boolean {
  return !current && next;
}

export type ConnectionsPatchBody = { connections: { recordAddress: boolean } };

/** The request body for the option that keeps the address and user agent of each client in the history of connections (off by default). */
export function connectionsPatch(recordAddress: boolean): ConnectionsPatchBody {
  return { connections: { recordAddress } };
}

/** Keeping the address of the clients stores personal data: ask first. Turning it off never asks. */
export function connectionsChangeNeedsConfirmation(current: boolean, next: boolean): boolean {
  return !current && next;
}

export type HealthPatchBody = { health: { open: boolean } };

/** The request body for the option that lets anyone on the network read GET /health without signing in (off by default). */
export function healthPatch(open: boolean): HealthPatchBody {
  return { health: { open } };
}

/** Opening the health route to clients that are not signed in widens what the network can read: ask first. Closing it never asks. */
export function healthChangeNeedsConfirmation(current: boolean, next: boolean): boolean {
  return !current && next;
}

export interface ExposureValues {
  cameraOpen: boolean;
  wsQueryToken: boolean;
  logRedaction: boolean;
  voiceSignature: boolean;
}

export type ExposurePatchBody = {
  camera?: { open: boolean };
  websocket?: { allowQueryToken: boolean };
  logging?: { redactSecrets: boolean };
  voice?: { requireSignature: boolean };
};

/** The request body for the exposure options: only what changed (an option fixed by the server environment must not be sent again); null when nothing changed. */
export function exposurePatch(current: ExposureValues, next: ExposureValues): ExposurePatchBody | null {
  const body: ExposurePatchBody = {};
  if (current.cameraOpen !== next.cameraOpen) body.camera = { open: next.cameraOpen };
  if (current.wsQueryToken !== next.wsQueryToken) body.websocket = { allowQueryToken: next.wsQueryToken };
  if (current.logRedaction !== next.logRedaction) body.logging = { redactSecrets: next.logRedaction };
  if (current.voiceSignature !== next.voiceSignature) body.voice = { requireSignature: next.voiceSignature };
  return Object.keys(body).length === 0 ? null : body;
}

/** Opening the camera pictures, accepting a token in the WebSocket address, writing secrets in the log or dropping the signature of a spoken confirmation lowers the protection: ask first. The other direction never asks. */
export function exposureChangeNeedsConfirmation(current: ExposureValues, next: ExposureValues): boolean {
  return (!current.cameraOpen && next.cameraOpen) || (!current.wsQueryToken && next.wsQueryToken) || (current.logRedaction && !next.logRedaction) || (current.voiceSignature && !next.voiceSignature);
}

export interface InstallValues {
  cameraCredentialsViaEnv: boolean;
  newInstallTls: boolean;
}

export type InstallPatchBody = {
  camera?: { credentialsViaEnv: boolean };
  install?: { newInstallTls: boolean };
};

/** The request body for the installation options: only what changed (an option fixed by the server environment must not be sent again); null when nothing changed. */
export function installPatch(current: InstallValues, next: InstallValues): InstallPatchBody | null {
  const body: InstallPatchBody = {};
  if (current.cameraCredentialsViaEnv !== next.cameraCredentialsViaEnv) body.camera = { credentialsViaEnv: next.cameraCredentialsViaEnv };
  if (current.newInstallTls !== next.newInstallTls) body.install = { newInstallTls: next.newInstallTls };
  return Object.keys(body).length === 0 ? null : body;
}

/** Putting a camera password on a command line or dropping TLS from a new installation lowers the protection: ask first. The other direction never asks. */
export function installChangeNeedsConfirmation(current: InstallValues, next: InstallValues): boolean {
  return (current.cameraCredentialsViaEnv && !next.cameraCredentialsViaEnv) || (current.newInstallTls && !next.newInstallTls);
}

export type SafetyPatchBody = { safety: { publishGlobalStop: boolean } };

/** The request body for the option that announces a global stop on the MQTT bridge (off by default). Announcing a stop is the safe direction: it never asks. */
export function safetyPatch(publishGlobalStop: boolean): SafetyPatchBody {
  return { safety: { publishGlobalStop } };
}

export type MavlinkPatchBody = { mavlink: { signingKeyFile: string; signingAllowUnsigned: boolean } };

/** The request body for the MAVLink signing options: only the path of the key file travels, never the key. */
export function mavlinkPatch(signingKeyFile: string, signingAllowUnsigned: boolean): MavlinkPatchBody {
  return { mavlink: { signingKeyFile: signingKeyFile.trim(), signingAllowUnsigned } };
}

/** Switching signing off, or accepting unsigned messages while it is on, leaves the link to the vehicle open: ask first. */
export function mavlinkChangeNeedsConfirmation(current: { signing: boolean; signingAllowUnsigned: boolean }, next: MavlinkPatchBody['mavlink']): boolean {
  const signingNext = next.signingKeyFile !== '';
  return (current.signing && !signingNext) || (signingNext && next.signingAllowUnsigned && !current.signingAllowUnsigned);
}

/** The warnings of a PUT answer that the screen knows how to say. */
export function knownWarnings(warnings: unknown): string[] {
  if (!Array.isArray(warnings)) return [];
  const known = ['info_auth_off', 'ble_commands_unencrypted', 'mqtt_commands_on', 'voice_heard_text_on', 'voice_confidence_off', 'robot_enable_allowed', 'connection_address_recorded', 'health_open', 'camera_open', 'ws_query_token_allowed', 'log_redaction_off', 'camera_credentials_in_arguments', 'new_install_tls_off', 'global_stop_published', 'mavlink_unsigned_allowed', 'mavlink_signing_off'];
  return warnings.filter((item): item is string => typeof item === 'string' && known.includes(item));
}
