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
import { useHydraStore } from '../store';
import { apiUrl } from '../lib/apiBase';
import { authFetch } from '../lib/session';
import { ConfirmDialog } from './ConfirmDialog';
import { bleChangeNeedsConfirmation, blePatch, infoAuthChangeNeedsConfirmation, isLocked, knownWarnings, parseSecurityState, tlsPatch, mqttPatch, mqttChangeNeedsConfirmation, voicePatch, voiceChangeNeedsConfirmation, mavlinkPatch, mavlinkChangeNeedsConfirmation, type VoicePatchBody, type MavlinkPatchBody, type BleMode, type MqttMode, type SecurityState } from '../lib/serverSecurity';

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

export function AdminServer() {
  const { t } = useTranslation();
  const { authToken, isAdmin } = useHydraStore();
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
      if (knownWarnings(data.warnings).includes('mavlink_unsigned_allowed')) setWarning(t('ecosystem.admin_security_mavlink_unsigned_warning'));
      if (knownWarnings(data.warnings).includes('mavlink_signing_off')) setWarning(t('ecosystem.admin_security_mavlink_off_warning'));
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
