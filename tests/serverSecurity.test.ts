import { describe, expect, it } from 'vitest';
import { bleChangeNeedsConfirmation, blePatch, infoAuthChangeNeedsConfirmation, isLocked, knownWarnings, parseSecurityState, robotsChangeNeedsConfirmation, robotsPatch, tlsPatch } from '../src/lib/serverSecurity';

const answer = {
  port: 3000,
  aiAccess: { value: 'admin', source: 'config' },
  infoAuth: { value: true, source: 'env' },
  tls: { enabled: true, source: 'config', certPath: '/etc/c.pem', keyPath: '/etc/k.pem', fingerprint256: 'AA:BB', active: false, appliesOnRestart: true },
};

describe('the access options of the Server Admin screen', () => {
  it('reads what the server reports', () => {
    const state = parseSecurityState(answer);
    expect(state?.aiAccess).toEqual({ value: 'admin', source: 'config' });
    expect(state?.infoAuth.source).toBe('env');
    expect(state?.tls.fingerprint256).toBe('AA:BB');
    expect(state?.tls.appliesOnRestart).toBe(true);
  });

  it('shows nothing for a server that predates the options or answers nonsense', () => {
    expect(parseSecurityState({ port: 3000, pendingPort: null })).toBeNull();
    expect(parseSecurityState(null)).toBeNull();
    expect(parseSecurityState({ ...answer, aiAccess: { value: 'everyone', source: 'config' } })).toBeNull();
    expect(parseSecurityState({ ...answer, infoAuth: { value: 'yes', source: 'config' } })).toBeNull();
    expect(parseSecurityState({ ...answer, tls: { enabled: true, source: 'nowhere' } })).toBeNull();
  });

  it('locks a value that the environment of the server fixes', () => {
    expect(isLocked('env')).toBe(true);
    expect(isLocked('config')).toBe(false);
    expect(isLocked('default')).toBe(false);
  });

  it('asks for a confirmation only when the sign-in requirement is being turned off', () => {
    expect(infoAuthChangeNeedsConfirmation(true, false)).toBe(true);
    expect(infoAuthChangeNeedsConfirmation(false, true)).toBe(false);
    expect(infoAuthChangeNeedsConfirmation(true, true)).toBe(false);
    expect(infoAuthChangeNeedsConfirmation(false, false)).toBe(false);
  });

  it('needs both paths to turn TLS on and trims them', () => {
    expect(tlsPatch(true, '', '/k')).toBeNull();
    expect(tlsPatch(true, '/c', '  ')).toBeNull();
    expect(tlsPatch(true, ' /c ', ' /k ')).toEqual({ tls: { enabled: true, certPath: '/c', keyPath: '/k' } });
    expect(tlsPatch(false, '', '')).toEqual({ tls: { enabled: false, certPath: '', keyPath: '' } });
  });

  it('keeps only the warnings the screen can say', () => {
    expect(knownWarnings(['info_auth_off', 'something_new'])).toEqual(['info_auth_off']);
    expect(knownWarnings(undefined)).toEqual([]);
    expect(knownWarnings(['ble_commands_unencrypted'])).toEqual(['ble_commands_unencrypted']);
  });

  it('reads the Bluetooth options, and shows no section for a server without them', () => {
    expect(parseSecurityState(answer)?.ble).toBeNull();
    const ble = { mode: { value: 'commands', source: 'config' }, requireEncryption: { value: true, source: 'default' }, activeMode: 'state', appliesOnRestart: true };
    expect(parseSecurityState({ ...answer, ble })?.ble).toEqual(ble);
    expect(parseSecurityState({ ...answer, ble: { ...ble, activeMode: 'weird' } })?.ble?.activeMode).toBe('off');
    expect(parseSecurityState({ ...answer, ble: { ...ble, mode: { value: 'all', source: 'config' } } })?.ble).toBeNull();
    expect(parseSecurityState({ ...answer, ble: { ...ble, requireEncryption: { value: 'yes', source: 'config' } } })?.ble).toBeNull();
    // a damaged Bluetooth part never hides the rest of the options
    expect(parseSecurityState({ ...answer, ble: 7 })?.tls.enabled).toBe(true);
  });

  it('asks before commands are allowed over a link that is not encrypted, and only then', () => {
    expect(bleChangeNeedsConfirmation('commands', false)).toBe(true);
    expect(bleChangeNeedsConfirmation('commands', true)).toBe(false);
    expect(bleChangeNeedsConfirmation('state', false)).toBe(false);
    expect(bleChangeNeedsConfirmation('off', false)).toBe(false);
    expect(blePatch('state', true)).toEqual({ ble: { mode: 'state', requireEncryption: true } });
  });
});

import { mqttChangeNeedsConfirmation, mqttPatch, parseSecurityState as parseState } from '../src/lib/serverSecurity';

describe('the MQTT bridge options', () => {
  const base = {
    aiAccess: { value: 'open', source: 'default' }, infoAuth: { value: false, source: 'default' },
    tls: { enabled: false, source: 'default', certPath: '', keyPath: '', active: false, appliesOnRestart: false },
  };

  it('reads the section when the server has it and ignores a damaged one', () => {
    const state = parseState({ ...base, mqtt: { mode: { value: 'state', source: 'config' }, url: 'mqtt://b:1883', prefix: 'hydra/swarm', username: 'u', commandUser: '', activeMode: 'off', appliesOnRestart: true } });
    expect(state?.mqtt).toEqual({ mode: { value: 'state', source: 'config' }, url: 'mqtt://b:1883', prefix: 'hydra/swarm', username: 'u', commandUser: '', activeMode: 'off', appliesOnRestart: true });
    expect(parseState(base)?.mqtt).toBeNull();
    expect(parseState({ ...base, mqtt: { mode: { value: 'banana', source: 'config' } } })?.mqtt).toBeNull();
  });

  it('builds the request without any password and refuses what the server would refuse', () => {
    expect(mqttPatch('state', ' mqtts://b:8883 ', ' plant/a ', ' u ', '')).toEqual({ mqtt: { mode: 'state', url: 'mqtts://b:8883', prefix: 'plant/a', username: 'u', commandUser: '' } });
    expect(mqttPatch('commands', 'mqtt://b', '', '', '')).toBeNull();
    expect(mqttPatch('commands', 'mqtt://b', '', '', 'bridge')).not.toBeNull();
    expect(mqttPatch('state', 'http://b', '', '', '')).toBeNull();
    expect(mqttPatch('off', '', '', '', '')).not.toBeNull();
  });

  it('asks for a confirmation only when commands are being turned on', () => {
    expect(mqttChangeNeedsConfirmation('off', 'commands')).toBe(true);
    expect(mqttChangeNeedsConfirmation('state', 'commands')).toBe(true);
    expect(mqttChangeNeedsConfirmation('commands', 'commands')).toBe(false);
    expect(mqttChangeNeedsConfirmation('commands', 'off')).toBe(false);
  });
});

import { mavlinkChangeNeedsConfirmation, mavlinkPatch, voiceChangeNeedsConfirmation, voicePatch } from '../src/lib/serverSecurity';

describe('the voice and MAVLink signing options', () => {
  const base = {
    aiAccess: { value: 'open', source: 'default' }, infoAuth: { value: false, source: 'default' },
    tls: { enabled: false, source: 'default', certPath: '', keyPath: '', active: false, appliesOnRestart: false },
  };
  const voice = { includeHeardText: { value: false, source: 'default' }, minConfidence: { value: 0.6, source: 'env' } };
  const mavlink = { signingKeyFile: { value: '/etc/uav.key', source: 'config' }, signingAllowUnsigned: { value: false, source: 'default' }, signing: true, appliesOnRestart: true };

  it('reads both sections when the server has them and ignores damaged or missing ones', () => {
    const state = parseState({ ...base, voice, mavlink });
    expect(state?.voice).toEqual(voice);
    expect(state?.mavlink?.signing).toBe(true);
    expect(state?.mavlink?.signingKeyFile.value).toBe('/etc/uav.key');
    expect(parseState(base)?.voice).toBeNull();
    expect(parseState(base)?.mavlink).toBeNull();
    expect(parseState({ ...base, voice: { ...voice, minConfidence: { value: 3, source: 'env' } } })?.voice).toBeNull();
    expect(parseState({ ...base, voice: { ...voice, includeHeardText: { value: 'yes', source: 'env' } } })?.voice).toBeNull();
    expect(parseState({ ...base, mavlink: { ...mavlink, signingKeyFile: { value: 5, source: 'config' } } })?.mavlink).toBeNull();
    expect(parseState({ ...base, voice: 4, mavlink: 'x' })?.tls.enabled).toBe(false);
    expect(parseState({ ...base, mavlink: { ...mavlink, signingKeyFile: { value: '', source: 'default' } } })?.mavlink?.signing).toBe(false);
  });

  it('builds the voice request from what was typed and refuses what is not a number from 0 to 1', () => {
    expect(voicePatch(true, '0.8')).toEqual({ voice: { includeHeardText: true, minConfidence: 0.8 } });
    expect(voicePatch(false, ' 0,75 ')).toEqual({ voice: { includeHeardText: false, minConfidence: 0.75 } });
    expect(voicePatch(false, '0')).toEqual({ voice: { includeHeardText: false, minConfidence: 0 } });
    expect(voicePatch(false, '1')).toEqual({ voice: { includeHeardText: false, minConfidence: 1 } });
    for (const bad of ['', '  ', '1.1', '-0.1', 'abc', '0.5.5', '1e-1', '60%', 'NaN']) expect(voicePatch(false, bad)).toBeNull();
  });

  it('asks before the voice protection is lowered, and only then', () => {
    const now = { includeHeardText: false, minConfidence: 0.6 };
    expect(voiceChangeNeedsConfirmation(now, { includeHeardText: true, minConfidence: 0.6 })).toBe(true);
    expect(voiceChangeNeedsConfirmation(now, { includeHeardText: false, minConfidence: 0 })).toBe(true);
    expect(voiceChangeNeedsConfirmation(now, { includeHeardText: false, minConfidence: 0.2 })).toBe(false);
    expect(voiceChangeNeedsConfirmation(now, { includeHeardText: false, minConfidence: 0.95 })).toBe(false);
    expect(voiceChangeNeedsConfirmation({ includeHeardText: true, minConfidence: 0 }, { includeHeardText: true, minConfidence: 0 })).toBe(false);
  });

  it('sends only the path of the key file, trimmed, and asks before the link is left open', () => {
    expect(mavlinkPatch('  /etc/uav.key ', false)).toEqual({ mavlink: { signingKeyFile: '/etc/uav.key', signingAllowUnsigned: false } });
    const signed = { signing: true, signingAllowUnsigned: false };
    expect(mavlinkChangeNeedsConfirmation(signed, mavlinkPatch('', false).mavlink)).toBe(true);
    expect(mavlinkChangeNeedsConfirmation(signed, mavlinkPatch('/k', true).mavlink)).toBe(true);
    expect(mavlinkChangeNeedsConfirmation(signed, mavlinkPatch('/other', false).mavlink)).toBe(false);
    expect(mavlinkChangeNeedsConfirmation({ signing: false, signingAllowUnsigned: false }, mavlinkPatch('/k', false).mavlink)).toBe(false);
    expect(mavlinkChangeNeedsConfirmation({ signing: false, signingAllowUnsigned: false }, mavlinkPatch('', false).mavlink)).toBe(false);
  });

  it('knows the new warnings and drops the rest', () => {
    expect(knownWarnings(['voice_heard_text_on', 'voice_confidence_off', 'mavlink_unsigned_allowed', 'mavlink_signing_off', 'x', 5])).toEqual(['voice_heard_text_on', 'voice_confidence_off', 'mavlink_unsigned_allowed', 'mavlink_signing_off']);
  });
});

describe('the safe mode option of the robots', () => {
  it('reads the option the server reports and shows nothing for a server that predates it', () => {
    expect(parseSecurityState({ ...answer, robots: { allowEnable: { value: false, source: 'default' } } })?.robots).toEqual({ allowEnable: { value: false, source: 'default' } });
    expect(parseSecurityState(answer)?.robots).toBeNull();
    expect(parseSecurityState({ ...answer, robots: { allowEnable: { value: 'yes', source: 'default' } } })?.robots).toBeNull();
    expect(parseSecurityState({ ...answer, robots: { allowEnable: { value: true, source: 'nowhere' } } })?.robots).toBeNull();
  });

  it('builds the request and asks only before allowing', () => {
    expect(robotsPatch(true)).toEqual({ robots: { allowEnable: true } });
    expect(robotsChangeNeedsConfirmation(false, true)).toBe(true);
    expect(robotsChangeNeedsConfirmation(true, false)).toBe(false);
    expect(robotsChangeNeedsConfirmation(true, true)).toBe(false);
    expect(robotsChangeNeedsConfirmation(false, false)).toBe(false);
  });

  it('knows the warning of allowing it', () => {
    expect(knownWarnings(['robot_enable_allowed', 'other'])).toEqual(['robot_enable_allowed']);
  });
});
