// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Server Admin Panel: AdminServer.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Reduced STUDIO-native version of HYDRA-UMC-SERVER/admin-ui/src/tabs/
// ConfigTab.tsx - only the pieces STUDIO's own Config.tsx doesn't already
// own: listen port (GET/PUT /api/admin/server-config) and a graceful
// restart (POST /api/admin/restart). Server name stays exclusively in
// Config.tsx (POST /api/settings) - not duplicated here, same field either
// way. Uses STUDIO's own ConfirmDialog instead of window.confirm() - see
// that component's own header comment for why a blocking native confirm()
// is a real problem in an app with a live WebSocket + WebGL viewport.
//
// Also shows a real, live snapshot from GET /api/hydra-info (product name,
// uptime, controller/robot counts) - data this app already has a client
// for elsewhere (About.tsx), reused here rather than a bare port-config
// form with nothing else to look at on what's meant to be the server's
// own admin overview.
// =============================================================================
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Power, Save, Server as ServerIcon, Settings } from 'lucide-react';
import { apiUrl } from '../lib/apiBase';
import { authFetch } from '../lib/session';
import { ConfirmDialog } from './ConfirmDialog';
import { TotpPanel } from './TotpPanel';
import { ConnectorHubGatePanel } from './ConnectorHubGatePanel';
import { PlannerIdentityPanel } from './PlannerIdentityPanel';
import { OpsProposalsPanel } from './OpsProposalsPanel';
import { HilBridgePanel } from './HilBridgePanel';
import { ServiceIdentityPanel } from './ServiceIdentityPanel';
import { bridgeOptionId, bridgesPatch, bridgesChangeNeedsConfirmation, type BridgeValue, type BridgesPatchBody, RATE_LIMIT_KEYS, rateLimitsPatch, rateLimitsChangeNeedsConfirmation, rateLimitTextsValid, type RateLimitKey, type RateLimitsPatchBody, bleChangeNeedsConfirmation, blePatch, infoAuthChangeNeedsConfirmation, isLocked, knownWarnings, parseSecurityState, tlsPatch, mqttPatch, mqttChangeNeedsConfirmation, voicePatch, voiceChangeNeedsConfirmation, robotsPatch, robotsChangeNeedsConfirmation, connectionsPatch, connectionsChangeNeedsConfirmation, healthPatch, bridgeGatewayPatch, trustedNetworksPatch, ecosystemHealthPatch, rulPatch, exposurePatch, exposureChangeNeedsConfirmation, installPatch, installChangeNeedsConfirmation, healthChangeNeedsConfirmation, authPatch, authChangeNeedsConfirmation, JWT_ALGORITHMS, type JwtAlgorithm, safetyPatch, mavlinkPatch, mavlinkChangeNeedsConfirmation, type VoicePatchBody, type ExposureValues, type ExposurePatchBody, type InstallValues, type InstallPatchBody, type MavlinkPatchBody, type BleMode, type MqttMode, type SecurityState, jobDispatcherPatch, jobDispatcherChangeNeedsConfirmation, parseRobotMapText, robotMapToText, type JobDispatcherPatchBody } from '../lib/serverSecurity';
import { useSession } from '../storeContexts';

interface HydraInfo {
  product?: string;
  appVersion?: string;
  hostname?: string;
  controllerCount?: number;
  robotCount?: number;
  uptimeSeconds?: number;
}

function formatUptime(seconds: number | undefined): string {
  if (!seconds && seconds !== 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/** Time between two questions to the server while the dispatcher has not answered the request to read its file again. */
/** The text of the label of each number of the request limits. */
const RL_LABELS: Record<RateLimitKey, string> = {
  loginMax: 'ecosystem.admin_security_rl_login_max',
  loginWindowSeconds: 'ecosystem.admin_security_rl_login_window',
  refreshMax: 'ecosystem.admin_security_rl_refresh_max',
  apiMax: 'ecosystem.admin_security_rl_api_max',
  sensitiveMax: 'ecosystem.admin_security_rl_sensitive_max',
  apiWindowSeconds: 'ecosystem.admin_security_rl_api_window',
  stopAllMax: 'ecosystem.admin_security_rl_stopall_max',
  stopAllWindowSeconds: 'ecosystem.admin_security_rl_stopall_window',
};

const RELOAD_POLL_MS = 2000;

const RELOAD_CHIP_STYLE: Record<'pending' | 'applied' | 'failed' | 'not_configured', string> = {
  pending: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  applied: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  failed: 'text-red-400 border-red-500/30 bg-red-500/10',
  not_configured: 'text-slate-400 border-slate-600/40 bg-slate-700/20',
};

export function AdminServer() {
  const { t } = useTranslation();
  const { authToken, isAdmin } = useSession();
  const [currentPort, setCurrentPort] = useState<number | null>(null);
  const [pendingPort, setPendingPort] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [info, setInfo] = useState<HydraInfo | null>(null);
  const [security, setSecurity] = useState<SecurityState | null>(null);
  const [confirmInfoOff, setConfirmInfoOff] = useState(false);
  const [warning, setWarning] = useState('');
  const [tlsEnabled, setTlsEnabled] = useState(false);
  const [tlsCert, setTlsCert] = useState('');
  const [tlsKey, setTlsKey] = useState('');
  const [mqttMode, setMqttMode] = useState<MqttMode>('off');
  const [mqttUrl, setMqttUrl] = useState('');
  const [mqttPrefix, setMqttPrefix] = useState('');
  const [mqttUser, setMqttUser] = useState('');
  const [mqttCommandUser, setMqttCommandUser] = useState('');
  const [confirmMqtt, setConfirmMqtt] = useState(false);
  const [voiceHeard, setVoiceHeard] = useState(false);
  const [voiceConfidence, setVoiceConfidence] = useState('0.6');
  const [pendingVoice, setPendingVoice] = useState<VoicePatchBody | null>(null);
  const [robotsAllowEnable, setRobotsAllowEnable] = useState(false);
  const [pendingRobots, setPendingRobots] = useState(false);
  const [connectionsRecordAddress, setConnectionsRecordAddress] = useState(false);
  const [pendingConnections, setPendingConnections] = useState(false);
  const [authAlgorithm, setAuthAlgorithm] = useState<JwtAlgorithm>('HS256');
  const [authAcceptHs256, setAuthAcceptHs256] = useState(true);
  const [pendingAuth, setPendingAuth] = useState(false);
  const [pendingRotate, setPendingRotate] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [pendingHealth, setPendingHealth] = useState(false);
  const [ecosystemHealthOn, setEcosystemHealthOn] = useState(false);
  const [bridgeGatewayOn, setBridgeGatewayOn] = useState(false);
  const [trustedNetworksOn, setTrustedNetworksOn] = useState(false);
  const [rulOn, setRulOn] = useState(false);
  const [safetyPublish, setSafetyPublish] = useState(false);
  const [jdRelay, setJdRelay] = useState(false);
  const [jdMapText, setJdMapText] = useState('');
  const [jdAllow, setJdAllow] = useState(false);
  const [jdTimeout, setJdTimeout] = useState('30');
  const [pendingJd, setPendingJd] = useState<JobDispatcherPatchBody | null>(null);
  const [exposure, setExposure] = useState<ExposureValues>({ cameraOpen: false, wsQueryToken: false, logRedaction: true, voiceSignature: false });
  const [pendingExposure, setPendingExposure] = useState<ExposurePatchBody | null>(null);
  const [install, setInstall] = useState<InstallValues>({ cameraCredentialsViaEnv: true, newInstallTls: true });
  const [pendingInstall, setPendingInstall] = useState<InstallPatchBody | null>(null);
  const [rlEnabled, setRlEnabled] = useState(true);
  const [rlTexts, setRlTexts] = useState<Record<RateLimitKey, string>>({ loginMax: '', loginWindowSeconds: '', refreshMax: '', apiMax: '', sensitiveMax: '', apiWindowSeconds: '', stopAllMax: '', stopAllWindowSeconds: '' });
  const [pendingRl, setPendingRl] = useState<RateLimitsPatchBody | null>(null);
  const [bridgeValues, setBridgeValues] = useState<Record<string, BridgeValue>>({});
  const [pendingBridges, setPendingBridges] = useState<BridgesPatchBody | null>(null);
  const [mavlinkKey, setMavlinkKey] = useState('');
  const [mavlinkUnsigned, setMavlinkUnsigned] = useState(false);
  const [pendingMavlink, setPendingMavlink] = useState<MavlinkPatchBody | null>(null);
  const [pendingBle, setPendingBle] = useState<{ mode: BleMode; requireEncryption: boolean } | null>(null);

  const authHeaders = () => ({ 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) });

  const applySecurity = (state: SecurityState | null) => {
    setSecurity(state);
    if (state) {
      setTlsEnabled(state.tls.enabled);
      setTlsCert(state.tls.certPath);
      setTlsKey(state.tls.keyPath);
      if (state.voice) {
        setVoiceHeard(state.voice.includeHeardText.value);
        setVoiceConfidence(String(state.voice.minConfidence.value));
      }
      if (state.robots) setRobotsAllowEnable(state.robots.allowEnable.value);
      if (state.connections) setConnectionsRecordAddress(state.connections.recordAddress.value);
      if (state.auth) { setAuthAlgorithm(state.auth.jwtAlgorithm.value); setAuthAcceptHs256(state.auth.acceptHs256.value); }
      if (state.health) setHealthOpen(state.health.open.value);
      if (state.ecosystemHealth) setEcosystemHealthOn(state.ecosystemHealth.enabled.value);
      if (state.bridgeGateway) setBridgeGatewayOn(state.bridgeGateway.enabled.value);
      if (state.trustedNetworks) setTrustedNetworksOn(state.trustedNetworks.enabled.value);
      if (state.rul) setRulOn(state.rul.enabled.value);
      if (state.safety) setSafetyPublish(state.safety.publishGlobalStop.value);
      if (state.jobDispatcher) {
        setJdRelay(state.jobDispatcher.stopRelay.enabled.value);
        setJdMapText(robotMapToText(state.jobDispatcher.stopRelay.robotMap));
        setJdAllow(state.jobDispatcher.replan.allowUnconfirmed.value);
        setJdTimeout(String(state.jobDispatcher.replan.stopAckTimeoutSeconds.value));
      }
      if (state.exposure) setExposure({ cameraOpen: state.exposure.cameraOpen.value, wsQueryToken: state.exposure.wsQueryToken.value, logRedaction: state.exposure.logRedaction.value, voiceSignature: state.exposure.voiceSignature.value });
      if (state.rateLimits) {
        setRlEnabled(state.rateLimits.enabled.value);
        setRlTexts(Object.fromEntries(RATE_LIMIT_KEYS.map(key => [key, String(state.rateLimits!.numbers[key].value)])) as Record<RateLimitKey, string>);
      }
      if (state.bridges) setBridgeValues(Object.fromEntries(state.bridges.options.map(o => [bridgeOptionId(o), o.value])));
      if (state.install) setInstall({ cameraCredentialsViaEnv: state.install.cameraCredentialsViaEnv.value, newInstallTls: state.install.newInstallTls.value });
      if (state.mavlink) {
        setMavlinkKey(state.mavlink.signingKeyFile.value);
        setMavlinkUnsigned(state.mavlink.signingAllowUnsigned.value);
      }
      if (state.mqtt) {
        setMqttMode(state.mqtt.mode.value);
        setMqttUrl(state.mqtt.url);
        setMqttPrefix(state.mqtt.prefix);
        setMqttUser(state.mqtt.username);
        setMqttCommandUser(state.mqtt.commandUser);
      }
    }
  };

  // Sends one part of the access options and shows what the server answered (or why it refused).
  const saveSecurity = async (patch: Record<string, unknown>) => {
    setSaving(true); setError(''); setNotice(''); setWarning('');
    try {
      const res = await fetch(apiUrl('/api/admin/server-config'), { method: 'PUT', headers: authHeaders(), body: JSON.stringify(patch) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `HTTP ${res.status}`); return; }
      applySecurity(parseSecurityState(data));
      if (knownWarnings(data.warnings).includes('info_auth_off')) setWarning(t('ecosystem.admin_security_info_off_warning'));
      if (knownWarnings(data.warnings).includes('ble_commands_unencrypted')) setWarning(t('ecosystem.admin_security_ble_unencrypted_warning'));
      if (knownWarnings(data.warnings).includes('mqtt_commands_on')) setWarning(t('ecosystem.admin_security_mqtt_commands_warning'));
      if (knownWarnings(data.warnings).includes('voice_heard_text_on')) setWarning(t('ecosystem.admin_security_voice_heard_warning'));
      if (knownWarnings(data.warnings).includes('voice_confidence_off')) setWarning(t('ecosystem.admin_security_voice_confidence_warning'));
      if (knownWarnings(data.warnings).includes('robot_enable_allowed')) setWarning(t('ecosystem.admin_security_robots_warning'));
      if (knownWarnings(data.warnings).includes('connection_address_recorded')) setWarning(t('ecosystem.admin_security_connections_warning'));
      if (knownWarnings(data.warnings).includes('health_open')) setWarning(t('ecosystem.admin_security_health_warning'));
      if (knownWarnings(data.warnings).includes('jwt_eddsa_on')) setWarning(t('ecosystem.admin_security_auth_eddsa_warning'));
      if (knownWarnings(data.warnings).includes('jwt_hs256_refused')) setWarning(t('ecosystem.admin_security_auth_hs256_refused_warning'));
      if (knownWarnings(data.warnings).includes('bridge_gateway_on')) setWarning(t('ecosystem.admin_security_bridge_gateway_warning'));
      if (knownWarnings(data.warnings).includes('trusted_networks_on')) setWarning(t('ecosystem.admin_security_trusted_networks_warning'));
      if (knownWarnings(data.warnings).includes('camera_open')) setWarning(t('ecosystem.admin_security_exposure_camera_warning'));
      if (knownWarnings(data.warnings).includes('ws_query_token_allowed')) setWarning(t('ecosystem.admin_security_exposure_ws_warning'));
      if (knownWarnings(data.warnings).includes('log_redaction_off')) setWarning(t('ecosystem.admin_security_exposure_log_warning'));
      if (knownWarnings(data.warnings).includes('camera_credentials_in_arguments')) setWarning(t('ecosystem.admin_security_install_camera_warning'));
      if (knownWarnings(data.warnings).includes('new_install_tls_off')) setWarning(t('ecosystem.admin_security_install_tls_warning'));
      if (knownWarnings(data.warnings).some(w => w.startsWith('bridge_'))) setWarning(t('ecosystem.admin_bridges_warning'));
      if (knownWarnings(data.warnings).includes('rate_limits_loose')) setWarning(t('ecosystem.admin_security_rl_loose_warning'));
      if (knownWarnings(data.warnings).includes('rate_limits_off')) setWarning(t('ecosystem.admin_security_rl_off_warning'));
      if (knownWarnings(data.warnings).includes('mavlink_unsigned_allowed')) setWarning(t('ecosystem.admin_security_mavlink_unsigned_warning'));
      if (knownWarnings(data.warnings).includes('mavlink_signing_off')) setWarning(t('ecosystem.admin_security_mavlink_off_warning'));
      if (knownWarnings(data.warnings).includes('job_stop_relay_on')) setWarning(t('ecosystem.admin_security_jd_warning_relay'));
      if (knownWarnings(data.warnings).includes('replan_unconfirmed_allowed')) setWarning(t('ecosystem.admin_security_jd_warning_replan'));
      setNotice(t('ecosystem.admin_security_saved'));
    } catch {
      setError(t('ecosystem.admin_server_load_error'));
    } finally {
      setSaving(false);
    }
  };

  const toggleInfoAuth = (next: boolean) => {
    if (!security) return;
    if (infoAuthChangeNeedsConfirmation(security.infoAuth.value, next)) setConfirmInfoOff(true);
    else void saveSecurity({ infoAuth: next });
  };

  const changeBle = (mode: BleMode, requireEncryption: boolean) => {
    if (bleChangeNeedsConfirmation(mode, requireEncryption)) setPendingBle({ mode, requireEncryption });
    else void saveSecurity(blePatch(mode, requireEncryption));
  };

  const saveMqtt = () => {
    const patch = mqttPatch(mqttMode, mqttUrl, mqttPrefix, mqttUser, mqttCommandUser);
    if (!patch) { setError(t('ecosystem.admin_security_mqtt_invalid')); return; }
    if (mqttChangeNeedsConfirmation(security?.mqtt?.mode.value ?? 'off', mqttMode)) setConfirmMqtt(true);
    else void saveSecurity(patch);
  };

  const saveVoice = () => {
    const patch = voicePatch(voiceHeard, voiceConfidence);
    if (!patch || !security?.voice) { setError(t('ecosystem.admin_security_voice_invalid')); return; }
    if (voiceChangeNeedsConfirmation({ includeHeardText: security.voice.includeHeardText.value, minConfidence: security.voice.minConfidence.value }, patch.voice)) setPendingVoice(patch);
    else void saveSecurity(patch);
  };

  const saveJobDispatcher = () => {
    if (!security?.jobDispatcher) return;
    const body = jobDispatcherPatch({ relayEnabled: jdRelay, robotMapText: jdMapText, replanEditable: security.jobDispatcher.replan.editable, allowUnconfirmed: jdAllow, timeoutText: jdTimeout });
    if (!body) {
      setError(parseRobotMapText(jdMapText) === null ? t('ecosystem.admin_security_jd_map_invalid') : t('ecosystem.admin_security_jd_timeout_invalid'));
      return;
    }
    if (jobDispatcherChangeNeedsConfirmation(security.jobDispatcher, body)) setPendingJd(body);
    else void saveSecurity(body);
  };

  const saveRobots = () => {
    if (!security?.robots) return;
    if (robotsChangeNeedsConfirmation(security.robots.allowEnable.value, robotsAllowEnable)) setPendingRobots(true);
    else void saveSecurity(robotsPatch(robotsAllowEnable));
  };

  const saveConnections = () => {
    if (!security?.connections) return;
    if (connectionsChangeNeedsConfirmation(security.connections.recordAddress.value, connectionsRecordAddress)) setPendingConnections(true);
    else void saveSecurity(connectionsPatch(connectionsRecordAddress));
  };

  const authBody = () => {
    if (!security?.auth) return null;
    return authPatch({
      ...(authAlgorithm !== security.auth.jwtAlgorithm.value && !isLocked(security.auth.jwtAlgorithm.source) ? { jwtAlgorithm: authAlgorithm } : {}),
      ...(authAcceptHs256 !== security.auth.acceptHs256.value && !isLocked(security.auth.acceptHs256.source) ? { acceptHs256: authAcceptHs256 } : {}),
    });
  };

  const saveAuth = () => {
    const body = authBody();
    if (!security?.auth || !body) return;
    if (authChangeNeedsConfirmation(security.auth.acceptHs256.value, authAcceptHs256)) setPendingAuth(true);
    else void saveSecurity(body);
  };

  // Makes a new key the active one; the previous one stays valid for the overlap of the server.
  const rotateAuthKey = async () => {
    setSaving(true); setError(''); setNotice(''); setWarning('');
    try {
      const res = await fetch(apiUrl('/api/admin/jwt-keys/rotate'), { method: 'POST', headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || `HTTP ${res.status}`); return; }
      setNotice(t('ecosystem.admin_security_auth_rotated'));
    } catch {
      setError(t('ecosystem.admin_security_auth_rotate_error'));
    } finally {
      setSaving(false);
    }
  };

  const saveHealth = () => {
    if (!security?.health) return;
    if (healthChangeNeedsConfirmation(security.health.open.value, healthOpen)) setPendingHealth(true);
    else void saveSecurity(healthPatch(healthOpen));
  };

  const currentExposure = (): ExposureValues | null =>
    security?.exposure
      ? { cameraOpen: security.exposure.cameraOpen.value, wsQueryToken: security.exposure.wsQueryToken.value, logRedaction: security.exposure.logRedaction.value, voiceSignature: security.exposure.voiceSignature.value }
      : null;

  const saveExposure = () => {
    const current = currentExposure();
    if (!current) return;
    const body = exposurePatch(current, exposure);
    if (!body) return;
    if (exposureChangeNeedsConfirmation(current, exposure)) setPendingExposure(body);
    else void saveSecurity(body);
  };

  const currentInstall = (): InstallValues | null =>
    security?.install
      ? { cameraCredentialsViaEnv: security.install.cameraCredentialsViaEnv.value, newInstallTls: security.install.newInstallTls.value }
      : null;

  const saveInstall = () => {
    const current = currentInstall();
    if (!current) return;
    const body = installPatch(current, install);
    if (!body) return;
    if (installChangeNeedsConfirmation(current, install)) setPendingInstall(body);
    else void saveSecurity(body);
  };

  const saveRateLimits = () => {
    const current = security?.rateLimits;
    if (!current) return;
    if (!rateLimitTextsValid(current, rlTexts)) { setNotice(''); setError(t('ecosystem.admin_security_rl_invalid')); return; }
    const body = rateLimitsPatch(current, rlEnabled, rlTexts);
    if (!body) return;
    if (rateLimitsChangeNeedsConfirmation(current, rlEnabled)) setPendingRl(body);
    else void saveSecurity(body);
  };

  const saveBridges = () => {
    const current = security?.bridges;
    if (!current) return;
    const body = bridgesPatch(current, bridgeValues);
    if (!body) return;
    if (bridgesChangeNeedsConfirmation(current, body)) setPendingBridges(body);
    else void saveSecurity(body);
  };

  const saveMavlink = () => {
    if (!security?.mavlink) return;
    const patch = mavlinkPatch(mavlinkKey, mavlinkUnsigned);
    if (mavlinkChangeNeedsConfirmation({ signing: security.mavlink.signing, signingAllowUnsigned: security.mavlink.signingAllowUnsigned.value }, patch.mavlink)) setPendingMavlink(patch);
    else void saveSecurity(patch);
  };

  const saveTls = () => {
    const patch = tlsPatch(tlsEnabled, tlsCert, tlsKey);
    if (!patch) { setError(t('ecosystem.admin_security_tls_paths_required')); return; }
    void saveSecurity(patch);
  };

  const sourceText = (source: 'env' | 'config' | 'default') => t(`ecosystem.admin_security_source_${source}`);

  const load = async () => {
    try {
      const res = await fetch(apiUrl('/api/admin/server-config'), { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `HTTP ${res.status}`); return; }
      setCurrentPort(data.port);
      setPendingPort(String(data.pendingPort ?? data.port));
      applySecurity(parseSecurityState(data));
    } catch {
      setError(t('ecosystem.admin_server_load_error'));
    }
    try {
      const res = await authFetch(apiUrl('/api/hydra-info'));
      if (res.ok) setInfo(await res.json());
    } catch {
      // Best-effort overview snapshot - the port form above is the real
      // admin surface, this just enriches it when it's reachable.
    }
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  // While the dispatcher has not answered the request to read its file again, ask the server again; only the state of the chip changes, not what is being edited.
  const reloadPending = security?.jobDispatcher?.replan.reload === 'pending';
  useEffect(() => {
    if (!isAdmin || !reloadPending) return undefined;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl('/api/admin/server-config'), { headers: authHeaders() });
        if (res.ok) setSecurity(parseSecurityState(await res.json()));
      } catch {
        // The next change of the page asks again.
      }
    }, RELOAD_POLL_MS);
    return () => clearTimeout(timer);
  }, [isAdmin, reloadPending, security]); // eslint-disable-line react-hooks/exhaustive-deps

  const savePort = async () => {
    const portNum = parseInt(pendingPort, 10);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      setError(t('ecosystem.admin_server_port_invalid'));
      return;
    }
    setSaving(true); setError(''); setNotice('');
    try {
      const res = await fetch(apiUrl('/api/admin/server-config'), { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ port: portNum }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `HTTP ${res.status}`); return; }
      setNotice(t('ecosystem.admin_server_port_saved'));
    } catch {
      setError(t('ecosystem.admin_server_load_error'));
    } finally {
      setSaving(false);
    }
  };

  const restartNow = async () => {
    setConfirmRestart(false);
    try {
      const res = await fetch(apiUrl('/api/admin/restart'), { method: 'POST', headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || `HTTP ${res.status}`); return; }
      setNotice(t('ecosystem.admin_server_restart_requested'));
    } catch {
      setError(t('ecosystem.admin_server_load_error'));
    }
  };

  if (!isAdmin) {
    return <p className="text-xs text-slate-500">{t('ecosystem.admin_only')}</p>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl">
      <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><Settings size={16} /> {t('ecosystem.admin_server_title')}</h3>

      {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</p>}
      {notice && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">{notice}</p>}

      {info && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <ServerIcon size={14} className="text-sky-400" />
            <span className="text-xs font-bold text-slate-200">{info.product || '-'}</span>
            <span className="text-[10px] text-slate-600 font-mono ml-auto">v{info.appVersion || '-'}</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.admin_server_stat_uptime')}</div>
              <div className="text-sm font-black text-slate-200 font-mono mt-0.5">{formatUptime(info.uptimeSeconds)}</div>
            </div>
            <div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.admin_server_stat_controllers')}</div>
              <div className="text-sm font-black text-slate-200 font-mono mt-0.5">{info.controllerCount ?? '-'}</div>
            </div>
            <div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.admin_server_stat_robots')}</div>
              <div className="text-sm font-black text-slate-200 font-mono mt-0.5">{info.robotCount ?? '-'}</div>
            </div>
            <div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.admin_server_stat_host')}</div>
              <div className="text-sm font-black text-slate-200 font-mono mt-0.5 truncate">{info.hostname || '-'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.admin_server_port_label', { port: currentPort ?? '...' })}</label>
        <div className="flex gap-2">
          <input
            type="number" min={1} max={65535}
            value={pendingPort}
            onChange={e => setPendingPort(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
          />
          <button onClick={savePort} disabled={saving} className="flex items-center gap-1.5 px-4 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
            <Save size={14} /> {t('ecosystem.admin_server_save')}
          </button>
        </div>
        <div className="flex items-start gap-2 text-[10px] text-amber-400/90 bg-amber-950/20 border border-amber-900/40 rounded-lg p-3">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{t('ecosystem.admin_server_port_note')}</span>
        </div>
        <button onClick={() => setConfirmRestart(true)} className="self-start flex items-center gap-1.5 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
          <Power size={14} /> {t('ecosystem.admin_server_restart')}
        </button>
      </div>

      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <TotpPanel />
      </div>

      {security && (
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('ecosystem.admin_security_title')}</h4>
          {warning && <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">{warning}</p>}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-200" htmlFor="admin-security-ai">{t('ecosystem.admin_security_ai_label')}</label>
            <select
              id="admin-security-ai"
              value={security.aiAccess.value}
              disabled={saving || isLocked(security.aiAccess.source)}
              onChange={e => void saveSecurity({ aiAccess: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 disabled:opacity-50"
            >
              <option value="open">{t('ecosystem.admin_security_ai_open')}</option>
              <option value="admin">{t('ecosystem.admin_security_ai_admin')}</option>
            </select>
            <span className="text-[10px] text-slate-500">{sourceText(security.aiAccess.source)}</span>
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <input
                type="checkbox"
                checked={security.infoAuth.value}
                disabled={saving || isLocked(security.infoAuth.source)}
                onChange={e => toggleInfoAuth(e.target.checked)}
              />
              {t('ecosystem.admin_security_info_label')}
            </label>
            <span className="text-[10px] text-slate-500">{sourceText(security.infoAuth.source)}</span>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <input
                type="checkbox"
                checked={tlsEnabled}
                disabled={saving || isLocked(security.tls.source)}
                onChange={e => setTlsEnabled(e.target.checked)}
              />
              {t('ecosystem.admin_security_tls_label')}
            </label>
            <input
              type="text" value={tlsCert} placeholder={t('ecosystem.admin_security_tls_cert')} aria-label={t('ecosystem.admin_security_tls_cert')}
              disabled={saving || isLocked(security.tls.source)}
              onChange={e => setTlsCert(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 disabled:opacity-50"
            />
            <input
              type="text" value={tlsKey} placeholder={t('ecosystem.admin_security_tls_key')} aria-label={t('ecosystem.admin_security_tls_key')}
              disabled={saving || isLocked(security.tls.source)}
              onChange={e => setTlsKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 disabled:opacity-50"
            />
            <div className="flex items-center gap-2">
              <button onClick={saveTls} disabled={saving || isLocked(security.tls.source)} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                <Save size={14} /> {t('ecosystem.admin_server_save')}
              </button>
              <span className="text-[10px] text-slate-500">{sourceText(security.tls.source)}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono break-all">
              {t('ecosystem.admin_security_tls_fingerprint')}: {security.tls.fingerprint256 ?? '-'}
            </div>
            <div className="text-[10px] text-slate-500">
              {security.tls.active ? t('ecosystem.admin_security_tls_active') : t('ecosystem.admin_security_tls_inactive')}
              {security.tls.appliesOnRestart ? ` ${t('ecosystem.admin_security_tls_restart')}` : ''}
            </div>
          </div>

          {security.ble && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200" htmlFor="admin-security-ble">{t('ecosystem.admin_security_ble_label')}</label>
              <select
                id="admin-security-ble"
                value={security.ble.mode.value}
                disabled={saving || isLocked(security.ble.mode.source)}
                onChange={e => changeBle(e.target.value as BleMode, security.ble!.requireEncryption.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 disabled:opacity-50"
              >
                <option value="off">{t('ecosystem.admin_security_ble_off')}</option>
                <option value="state">{t('ecosystem.admin_security_ble_state')}</option>
                <option value="commands">{t('ecosystem.admin_security_ble_commands')}</option>
              </select>
              <span className="text-[10px] text-slate-500">{sourceText(security.ble.mode.source)}</span>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  checked={security.ble.requireEncryption.value}
                  disabled={saving || isLocked(security.ble.requireEncryption.source)}
                  onChange={e => changeBle(security.ble!.mode.value, e.target.checked)}
                />
                {t('ecosystem.admin_security_ble_encryption')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.ble.requireEncryption.source)}</span>
              <div className="text-[10px] text-slate-500">
                {t('ecosystem.admin_security_ble_running', { mode: t(`ecosystem.admin_security_ble_${security.ble.activeMode}`) })}
                {security.ble.appliesOnRestart ? ` ${t('ecosystem.admin_security_tls_restart')}` : ''}
              </div>
            </div>
          )}

          {security.mqtt && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200" htmlFor="admin-security-mqtt">{t('ecosystem.admin_security_mqtt_label')}</label>
              <select
                id="admin-security-mqtt"
                value={mqttMode}
                disabled={saving || isLocked(security.mqtt.mode.source)}
                onChange={e => setMqttMode(e.target.value as MqttMode)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 disabled:opacity-50"
              >
                <option value="off">{t('ecosystem.admin_security_mqtt_off')}</option>
                <option value="state">{t('ecosystem.admin_security_mqtt_state')}</option>
                <option value="commands">{t('ecosystem.admin_security_mqtt_commands')}</option>
              </select>
              <span className="text-[10px] text-slate-500">{sourceText(security.mqtt.mode.source)}</span>
              <input value={mqttUrl} onChange={e => setMqttUrl(e.target.value)} placeholder={t('ecosystem.admin_security_mqtt_url')} aria-label={t('ecosystem.admin_security_mqtt_url')}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500" />
              <input value={mqttPrefix} onChange={e => setMqttPrefix(e.target.value)} placeholder={t('ecosystem.admin_security_mqtt_prefix')} aria-label={t('ecosystem.admin_security_mqtt_prefix')}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500" />
              <input value={mqttUser} onChange={e => setMqttUser(e.target.value)} placeholder={t('ecosystem.admin_security_mqtt_user')} aria-label={t('ecosystem.admin_security_mqtt_user')}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500" />
              <input value={mqttCommandUser} onChange={e => setMqttCommandUser(e.target.value)} placeholder={t('ecosystem.admin_security_mqtt_command_user')} aria-label={t('ecosystem.admin_security_mqtt_command_user')}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500" />
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_mqtt_passwords')}</div>
              <button onClick={saveMqtt} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                {t('ecosystem.admin_security_mqtt_save')}
              </button>
              <div className="text-[10px] text-slate-500">
                {t('ecosystem.admin_security_mqtt_running', { mode: t(`ecosystem.admin_security_mqtt_${security.mqtt.activeMode}`) })}
                {security.mqtt.appliesOnRestart ? ` ${t('ecosystem.admin_security_tls_restart')}` : ''}
              </div>
            </div>
          )}

          {security.voice && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_voice_title')}</h5>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  checked={voiceHeard}
                  disabled={saving || isLocked(security.voice.includeHeardText.source)}
                  onChange={e => setVoiceHeard(e.target.checked)}
                />
                {t('ecosystem.admin_security_voice_heard_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.voice.includeHeardText.source)}</span>
              <label className="text-xs font-bold text-slate-200" htmlFor="admin-security-voice-confidence">{t('ecosystem.admin_security_voice_confidence_label')}</label>
              <input
                id="admin-security-voice-confidence" type="text" inputMode="decimal" value={voiceConfidence}
                disabled={saving || isLocked(security.voice.minConfidence.source)}
                onChange={e => setVoiceConfidence(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 disabled:opacity-50"
              />
              <span className="text-[10px] text-slate-500">{sourceText(security.voice.minConfidence.source)}</span>
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_voice_help')}</div>
              <button onClick={saveVoice} disabled={saving || (isLocked(security.voice.includeHeardText.source) && isLocked(security.voice.minConfidence.source))} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                <Save size={14} /> {t('ecosystem.admin_security_voice_save')}
              </button>
            </div>
          )}

          {security.robots && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_robots_title')}</h5>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="robots-allow-enable"
                  checked={robotsAllowEnable}
                  disabled={saving || isLocked(security.robots.allowEnable.source)}
                  onChange={e => setRobotsAllowEnable(e.target.checked)}
                />
                {t('ecosystem.admin_security_robots_enable_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.robots.allowEnable.source)}</span>
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_robots_help')}</div>
              <button onClick={saveRobots} disabled={saving || isLocked(security.robots.allowEnable.source)} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                <Save size={14} /> {t('ecosystem.admin_security_robots_save')}
              </button>
            </div>
          )}

          {security.connections && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_connections_title')}</h5>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="connections-record-address"
                  checked={connectionsRecordAddress}
                  disabled={saving || isLocked(security.connections.recordAddress.source)}
                  onChange={e => setConnectionsRecordAddress(e.target.checked)}
                />
                {t('ecosystem.admin_security_connections_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.connections.recordAddress.source)}</span>
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_connections_help')}</div>
              <button onClick={saveConnections} disabled={saving || isLocked(security.connections.recordAddress.source)} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                <Save size={14} /> {t('ecosystem.admin_security_connections_save')}
              </button>
            </div>
          )}

          {security.auth && (
            <div className="space-y-2" data-testid="auth-section">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_auth_title')}</h5>
              <label className="text-xs font-bold text-slate-200" htmlFor="auth-algorithm">{t('ecosystem.admin_security_auth_algorithm_label')}</label>
              <select
                id="auth-algorithm"
                data-testid="auth-algorithm"
                value={authAlgorithm}
                disabled={saving || isLocked(security.auth.jwtAlgorithm.source)}
                onChange={e => setAuthAlgorithm(e.target.value as JwtAlgorithm)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
              >
                {JWT_ALGORITHMS.map(algorithm => <option key={algorithm} value={algorithm}>{t(`ecosystem.admin_security_auth_${algorithm.toLowerCase()}`)}</option>)}
              </select>
              <span className="text-[10px] text-slate-500">{sourceText(security.auth.jwtAlgorithm.source)}</span>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="auth-accept-hs256"
                  checked={authAcceptHs256}
                  disabled={saving || isLocked(security.auth.acceptHs256.source)}
                  onChange={e => setAuthAcceptHs256(e.target.checked)}
                />
                {t('ecosystem.admin_security_auth_accept_hs256_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.auth.acceptHs256.source)}</span>
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_auth_help')}</div>
              <div className="flex gap-2">
                <button onClick={saveAuth} disabled={saving || authBody() === null || Object.keys(authBody()?.auth ?? {}).length === 0} data-testid="auth-save" className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                  <Save size={14} /> {t('ecosystem.admin_security_auth_save')}
                </button>
                {security.auth.jwtAlgorithm.value === 'EdDSA' && (
                  <button onClick={() => setPendingRotate(true)} disabled={saving} data-testid="auth-rotate" className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                    {t('ecosystem.admin_security_auth_rotate')}
                  </button>
                )}
              </div>
            </div>
          )}

          {security.health && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_health_title')}</h5>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="health-open"
                  checked={healthOpen}
                  disabled={saving || isLocked(security.health.open.source)}
                  onChange={e => setHealthOpen(e.target.checked)}
                />
                {t('ecosystem.admin_security_health_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.health.open.source)}</span>
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_health_help')}</div>
              <button onClick={saveHealth} disabled={saving || isLocked(security.health.open.source)} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                <Save size={14} /> {t('ecosystem.admin_security_health_save')}
              </button>
            </div>
          )}

          {security.ecosystemHealth && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_ecosystem_health_title')}</h5>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="ecosystem-health-enabled"
                  checked={ecosystemHealthOn}
                  disabled={saving || isLocked(security.ecosystemHealth.enabled.source)}
                  onChange={e => setEcosystemHealthOn(e.target.checked)}
                />
                {t('ecosystem.admin_security_ecosystem_health_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.ecosystemHealth.enabled.source)}</span>
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_ecosystem_health_help')}</div>
              <button onClick={() => void saveSecurity(ecosystemHealthPatch(ecosystemHealthOn))} disabled={saving || isLocked(security.ecosystemHealth.enabled.source)} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                <Save size={14} /> {t('ecosystem.admin_security_ecosystem_health_save')}
              </button>
            </div>
          )}

          {security.bridgeGateway && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_bridge_gateway_title')}</h5>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="bridge-gateway-enabled"
                  checked={bridgeGatewayOn}
                  disabled={saving || isLocked(security.bridgeGateway.enabled.source)}
                  onChange={e => setBridgeGatewayOn(e.target.checked)}
                />
                {t('ecosystem.admin_security_bridge_gateway_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.bridgeGateway.enabled.source)}</span>
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_bridge_gateway_help')}</div>
              <button onClick={() => void saveSecurity(bridgeGatewayPatch(bridgeGatewayOn))} disabled={saving || isLocked(security.bridgeGateway.enabled.source)} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-50 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold transition-all">
                <Save size={14} /> {t('ecosystem.admin_security_bridge_gateway_save')}
              </button>
            </div>
          )}

          {security.trustedNetworks && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_trusted_networks_title')}</h5>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="trusted-networks-enabled"
                  checked={trustedNetworksOn}
                  disabled={saving || isLocked(security.trustedNetworks.enabled.source)}
                  onChange={e => setTrustedNetworksOn(e.target.checked)}
                />
                {t('ecosystem.admin_security_trusted_networks_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.trustedNetworks.enabled.source)}</span>
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_trusted_networks_help')}</div>
              <button onClick={() => void saveSecurity(trustedNetworksPatch(trustedNetworksOn))} disabled={saving || isLocked(security.trustedNetworks.enabled.source)} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-50 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold transition-all">
                <Save size={14} /> {t('ecosystem.admin_security_trusted_networks_save')}
              </button>
            </div>
          )}

          <ConnectorHubGatePanel />

          <PlannerIdentityPanel />

          <OpsProposalsPanel />

          <HilBridgePanel />
          <ServiceIdentityPanel />

          {security.rul && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_rul_title')}</h5>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="rul-enabled"
                  checked={rulOn}
                  disabled={saving || isLocked(security.rul.enabled.source)}
                  onChange={e => setRulOn(e.target.checked)}
                />
                {t('ecosystem.admin_security_rul_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.rul.enabled.source)}</span>
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_rul_help')}</div>
              <button onClick={() => void saveSecurity(rulPatch(rulOn))} disabled={saving || isLocked(security.rul.enabled.source)} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                <Save size={14} /> {t('ecosystem.admin_security_rul_save')}
              </button>
            </div>
          )}

          {security.exposure && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_exposure_title')}</h5>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="exposure-camera-open"
                  checked={exposure.cameraOpen}
                  disabled={saving || isLocked(security.exposure.cameraOpen.source)}
                  onChange={e => setExposure({ ...exposure, cameraOpen: e.target.checked })}
                />
                {t('ecosystem.admin_security_exposure_camera_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.exposure.cameraOpen.source)}</span>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="exposure-ws-query-token"
                  checked={exposure.wsQueryToken}
                  disabled={saving || isLocked(security.exposure.wsQueryToken.source)}
                  onChange={e => setExposure({ ...exposure, wsQueryToken: e.target.checked })}
                />
                {t('ecosystem.admin_security_exposure_ws_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.exposure.wsQueryToken.source)}</span>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="exposure-log-redaction"
                  checked={exposure.logRedaction}
                  disabled={saving || isLocked(security.exposure.logRedaction.source)}
                  onChange={e => setExposure({ ...exposure, logRedaction: e.target.checked })}
                />
                {t('ecosystem.admin_security_exposure_log_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.exposure.logRedaction.source)}</span>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="exposure-voice-signature"
                  checked={exposure.voiceSignature}
                  disabled={saving || isLocked(security.exposure.voiceSignature.source)}
                  onChange={e => setExposure({ ...exposure, voiceSignature: e.target.checked })}
                />
                {t('ecosystem.admin_security_exposure_voice_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.exposure.voiceSignature.source)}</span>
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_exposure_help')}</div>
              <button onClick={saveExposure} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                <Save size={14} /> {t('ecosystem.admin_security_exposure_save')}
              </button>
            </div>
          )}

          {security.install && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_install_title')}</h5>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="install-camera-credentials-via-env"
                  checked={install.cameraCredentialsViaEnv}
                  disabled={saving || isLocked(security.install.cameraCredentialsViaEnv.source)}
                  onChange={e => setInstall({ ...install, cameraCredentialsViaEnv: e.target.checked })}
                />
                {t('ecosystem.admin_security_install_camera_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.install.cameraCredentialsViaEnv.source)}</span>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="install-new-install-tls"
                  checked={install.newInstallTls}
                  disabled={saving || isLocked(security.install.newInstallTls.source)}
                  onChange={e => setInstall({ ...install, newInstallTls: e.target.checked })}
                />
                {t('ecosystem.admin_security_install_tls_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.install.newInstallTls.source)}</span>
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_install_help')}</div>
              <button onClick={saveInstall} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                <Save size={14} /> {t('ecosystem.admin_security_install_save')}
              </button>
            </div>
          )}

          {security.rateLimits && (
            <div className="space-y-2" data-testid="security-rate-limits">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_rl_title')}</h5>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="rl-enabled"
                  checked={rlEnabled}
                  disabled={saving || isLocked(security.rateLimits.enabled.source)}
                  onChange={e => setRlEnabled(e.target.checked)}
                />
                {t('ecosystem.admin_security_rl_enabled_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.rateLimits.enabled.source)}</span>
              {RATE_LIMIT_KEYS.map(key => {
                const entry = security.rateLimits!.numbers[key];
                return (
                  <div key={key} className="flex flex-col gap-0.5">
                    <label className="text-xs font-bold text-slate-200" htmlFor={`rl-${key}`}>{t(RL_LABELS[key])}</label>
                    <input
                      id={`rl-${key}`}
                      data-testid={`rl-${key}`}
                      type="text"
                      inputMode="numeric"
                      value={rlTexts[key]}
                      disabled={saving || isLocked(entry.source)}
                      onChange={e => setRlTexts({ ...rlTexts, [key]: e.target.value })}
                      className="w-32 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
                    />
                    <span className="text-[10px] text-slate-500">{entry.min} - {entry.max} · {sourceText(entry.source)}</span>
                  </div>
                );
              })}
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_rl_help')}</div>
              <button onClick={saveRateLimits} disabled={saving} data-testid="rl-save" className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-wider">
                <Save size={14} /> {t('ecosystem.admin_security_rl_save')}
              </button>
            </div>
          )}

          {security.bridges && (
            <div className="space-y-2" data-testid="security-bridges">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_bridges_title')}</h5>
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_bridges_help')}</div>
              <div className="text-[10px] text-slate-400" data-testid="bridges-delivery">{t(security.bridges.delivery === 'gateway_on' ? 'ecosystem.admin_bridges_delivery_on' : 'ecosystem.admin_bridges_delivery_off')}</div>
              {security.bridges.signing.length > 0 && (
                <div className="space-y-0.5" data-testid="bridges-signing">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t('ecosystem.admin_bridges_signing_title')}</span>
                  <div className="text-[10px] text-slate-500">{t('ecosystem.admin_bridges_signing_help')}</div>
                  {security.bridges.signing.map(s => (
                    <div key={s.bridge} className="text-[10px] text-slate-400" data-testid={`bridge-signing-${s.bridge}`}>
                      BRIDGE-{s.bridge.toUpperCase()}: {t(`ecosystem.admin_bridges_signing_key_${s.key}`)} · {t('ecosystem.admin_bridges_signing_last')}: {s.lastSignedAt ?? t('ecosystem.admin_bridges_signing_never')} · {t('ecosystem.admin_bridges_signing_file')}: {s.keyFile}
                    </div>
                  ))}
                </div>
              )}
              {security.bridges.options.map(o => {
                const id = bridgeOptionId(o);
                const label = t(`ecosystem.admin_bridges_opt_${o.bridge}_${o.key}`);
                const value = bridgeValues[id] ?? o.value;
                return (
                  <div key={id} className="flex flex-col gap-0.5" data-testid={`bridge-${id}`}>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">BRIDGE-{o.bridge.toUpperCase()}</span>
                    {o.choices ? (
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                        {label}
                        <select
                          data-testid={`bridge-select-${id}`}
                          value={String(value)}
                          disabled={saving}
                          onChange={e => setBridgeValues({ ...bridgeValues, [id]: e.target.value })}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none focus:border-sky-500"
                        >
                          {o.choices.map(c => <option key={c} value={c}>{t(`ecosystem.admin_bridges_choice_${c}`)}</option>)}
                        </select>
                      </label>
                    ) : (
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                        <input
                          type="checkbox"
                          data-testid={`bridge-check-${id}`}
                          checked={value === true}
                          disabled={saving}
                          onChange={e => setBridgeValues({ ...bridgeValues, [id]: e.target.checked })}
                        />
                        {label}
                      </label>
                    )}
                    <span className="text-[10px] text-slate-500">
                      {t(`ecosystem.admin_security_source_${o.source}`)} · {t('ecosystem.admin_bridges_default_label')}: {typeof o.default === 'boolean' ? t(o.default ? 'ecosystem.admin_bridges_on' : 'ecosystem.admin_bridges_off') : t(`ecosystem.admin_bridges_choice_${o.default}`)} · {t('ecosystem.admin_bridges_local_label')}: {o.localName}
                    </span>
                  </div>
                );
              })}
              <button onClick={saveBridges} disabled={saving} data-testid="bridges-save" className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-wider">
                <Save size={14} /> {t('ecosystem.admin_bridges_save')}
              </button>
            </div>
          )}

          {security.safety && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_stop_title')}</h5>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="safety-publish-stop"
                  checked={safetyPublish}
                  disabled={saving || isLocked(security.safety.publishGlobalStop.source)}
                  onChange={e => setSafetyPublish(e.target.checked)}
                />
                {t('ecosystem.admin_security_stop_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.safety.publishGlobalStop.source)}</span>
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_stop_help')}</div>
              <button onClick={() => void saveSecurity(safetyPatch(safetyPublish))} disabled={saving || isLocked(security.safety.publishGlobalStop.source)} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                <Save size={14} /> {t('ecosystem.admin_security_stop_save')}
              </button>
            </div>
          )}

          {security.jobDispatcher && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_jd_title')}</h5>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="jd-relay"
                  checked={jdRelay}
                  disabled={saving || isLocked(security.jobDispatcher.stopRelay.enabled.source)}
                  onChange={e => setJdRelay(e.target.checked)}
                />
                {t('ecosystem.admin_security_jd_relay_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.jobDispatcher.stopRelay.enabled.source)}</span>
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_jd_relay_help')}</div>
              <label className="text-xs font-bold text-slate-200" htmlFor="admin-security-jd-map">{t('ecosystem.admin_security_jd_map_label')}</label>
              <textarea
                id="admin-security-jd-map" data-testid="jd-map" rows={4} value={jdMapText} placeholder={t('ecosystem.admin_security_jd_map_placeholder')}
                disabled={saving}
                onChange={e => setJdMapText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono outline-none"
              />
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_jd_map_help')}</div>
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_jd_replan_title')}</h5>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  data-testid="jd-allow-unconfirmed"
                  checked={jdAllow}
                  disabled={saving || !security.jobDispatcher.replan.editable}
                  onChange={e => setJdAllow(e.target.checked)}
                />
                {t('ecosystem.admin_security_jd_allow_label')}
              </label>
              <label className="text-xs font-bold text-slate-200" htmlFor="admin-security-jd-timeout">{t('ecosystem.admin_security_jd_timeout_label')}</label>
              <input
                id="admin-security-jd-timeout" data-testid="jd-timeout" type="text" inputMode="decimal" value={jdTimeout}
                disabled={saving || !security.jobDispatcher.replan.editable}
                onChange={e => setJdTimeout(e.target.value)}
                className="w-32 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
              />
              {security.jobDispatcher.replan.reload !== 'none' && (
                <div className="flex items-center gap-2 text-[10px] text-slate-400" data-testid="jd-reload-status">
                  {t('ecosystem.admin_security_jd_reload_label')}
                  <span data-testid="jd-reload-chip" data-state={security.jobDispatcher.replan.reload} className={`px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ${RELOAD_CHIP_STYLE[security.jobDispatcher.replan.reload]}`}>
                    {t(`ecosystem.admin_security_jd_reload_${security.jobDispatcher.replan.reload}`)}
                  </span>
                </div>
              )}
              <div className="text-[10px] text-slate-500">{security.jobDispatcher.replan.editable ? t('ecosystem.admin_security_jd_replan_help') : t('ecosystem.admin_security_jd_not_editable')}</div>
              <button onClick={saveJobDispatcher} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-all">
                <Save size={14} /> {t('ecosystem.admin_security_jd_save')}
              </button>
            </div>
          )}

          {security.mavlink && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_mavlink_title')}</h5>
              <label className="text-xs font-bold text-slate-200" htmlFor="admin-security-mavlink-key">{t('ecosystem.admin_security_mavlink_key_label')}</label>
              <input
                id="admin-security-mavlink-key" type="text" value={mavlinkKey} placeholder={t('ecosystem.admin_security_mavlink_key_placeholder')}
                disabled={saving || isLocked(security.mavlink.signingKeyFile.source)}
                onChange={e => setMavlinkKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 disabled:opacity-50"
              />
              <span className="text-[10px] text-slate-500">{sourceText(security.mavlink.signingKeyFile.source)}</span>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  checked={mavlinkUnsigned}
                  disabled={saving || isLocked(security.mavlink.signingAllowUnsigned.source)}
                  onChange={e => setMavlinkUnsigned(e.target.checked)}
                />
                {t('ecosystem.admin_security_mavlink_unsigned_label')}
              </label>
              <span className="text-[10px] text-slate-500">{sourceText(security.mavlink.signingAllowUnsigned.source)}</span>
              <div className="text-[10px] text-slate-500">{t('ecosystem.admin_security_mavlink_help')}</div>
              <button onClick={saveMavlink} disabled={saving || (isLocked(security.mavlink.signingKeyFile.source) && isLocked(security.mavlink.signingAllowUnsigned.source))} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                <Save size={14} /> {t('ecosystem.admin_security_mavlink_save')}
              </button>
              <div className="text-[10px] text-slate-500">
                {security.mavlink.signing ? t('ecosystem.admin_security_mavlink_signing_on') : t('ecosystem.admin_security_mavlink_signing_off')}
                {security.mavlink.appliesOnRestart ? ` ${t('ecosystem.admin_security_mavlink_restart')}` : ''}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingVoice !== null}
        message={t('ecosystem.admin_security_voice_confirm')}
        onConfirm={() => { const next = pendingVoice; setPendingVoice(null); if (next) void saveSecurity(next); }}
        onCancel={() => setPendingVoice(null)}
      />

      <ConfirmDialog
        open={pendingJd !== null}
        message={t('ecosystem.admin_security_jd_confirm')}
        onConfirm={() => { const body = pendingJd; setPendingJd(null); if (body) void saveSecurity(body); }}
        onCancel={() => setPendingJd(null)}
      />

      <ConfirmDialog
        open={pendingRobots}
        message={t('ecosystem.admin_security_robots_confirm')}
        onConfirm={() => { setPendingRobots(false); void saveSecurity(robotsPatch(robotsAllowEnable)); }}
        onCancel={() => setPendingRobots(false)}
      />

      <ConfirmDialog
        open={pendingConnections}
        message={t('ecosystem.admin_security_connections_confirm')}
        onConfirm={() => { setPendingConnections(false); void saveSecurity(connectionsPatch(connectionsRecordAddress)); }}
        onCancel={() => setPendingConnections(false)}
      />

      <ConfirmDialog
        open={pendingExposure !== null}
        message={t('ecosystem.admin_security_exposure_confirm')}
        onConfirm={() => { const body = pendingExposure; setPendingExposure(null); if (body) void saveSecurity(body); }}
        onCancel={() => setPendingExposure(null)}
      />

      <ConfirmDialog
        open={pendingInstall !== null}
        message={t('ecosystem.admin_security_install_confirm')}
        onConfirm={() => { const body = pendingInstall; setPendingInstall(null); if (body) void saveSecurity(body); }}
        onCancel={() => setPendingInstall(null)}
      />

      <ConfirmDialog
        open={pendingBridges !== null}
        message={t('ecosystem.admin_bridges_confirm')}
        onConfirm={() => { const body = pendingBridges; setPendingBridges(null); if (body) void saveSecurity(body); }}
        onCancel={() => setPendingBridges(null)}
      />

      <ConfirmDialog
        open={pendingRl !== null}
        message={t('ecosystem.admin_security_rl_confirm')}
        onConfirm={() => { const body = pendingRl; setPendingRl(null); if (body) void saveSecurity(body); }}
        onCancel={() => setPendingRl(null)}
      />

      <ConfirmDialog
        open={pendingAuth}
        message={t('ecosystem.admin_security_auth_confirm')}
        onConfirm={() => { setPendingAuth(false); const body = authBody(); if (body) void saveSecurity(body); }}
        onCancel={() => setPendingAuth(false)}
      />

      <ConfirmDialog
        open={pendingRotate}
        message={t('ecosystem.admin_security_auth_rotate_confirm')}
        onConfirm={() => { setPendingRotate(false); void rotateAuthKey(); }}
        onCancel={() => setPendingRotate(false)}
      />

      <ConfirmDialog
        open={pendingHealth}
        message={t('ecosystem.admin_security_health_confirm')}
        onConfirm={() => { setPendingHealth(false); void saveSecurity(healthPatch(healthOpen)); }}
        onCancel={() => setPendingHealth(false)}
      />

      <ConfirmDialog
        open={pendingMavlink !== null}
        message={t('ecosystem.admin_security_mavlink_confirm')}
        onConfirm={() => { const next = pendingMavlink; setPendingMavlink(null); if (next) void saveSecurity(next); }}
        onCancel={() => setPendingMavlink(null)}
      />

      <ConfirmDialog
        open={confirmMqtt}
        message={t('ecosystem.admin_security_mqtt_commands_confirm')}
        onConfirm={() => {
          setConfirmMqtt(false);
          const patch = mqttPatch(mqttMode, mqttUrl, mqttPrefix, mqttUser, mqttCommandUser);
          if (patch) void saveSecurity(patch);
        }}
        onCancel={() => setConfirmMqtt(false)}
      />

      <ConfirmDialog
        open={pendingBle !== null}
        message={t('ecosystem.admin_security_ble_unencrypted_confirm')}
        onConfirm={() => { const next = pendingBle; setPendingBle(null); if (next) void saveSecurity(blePatch(next.mode, next.requireEncryption)); }}
        onCancel={() => setPendingBle(null)}
      />

      <ConfirmDialog
        open={confirmInfoOff}
        message={t('ecosystem.admin_security_info_off_confirm')}
        onConfirm={() => { setConfirmInfoOff(false); void saveSecurity({ infoAuth: false }); }}
        onCancel={() => setConfirmInfoOff(false)}
      />

      <ConfirmDialog
        open={confirmRestart}
        message={t('ecosystem.admin_server_restart_confirm')}
        onConfirm={restartNow}
        onCancel={() => setConfirmRestart(false)}
      />
    </div>
  );
}
