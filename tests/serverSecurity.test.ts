import { describe, expect, it } from 'vitest';
import { bleChangeNeedsConfirmation, blePatch, infoAuthChangeNeedsConfirmation, isLocked, knownWarnings, parseSecurityState, tlsPatch } from '../src/lib/serverSecurity';

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
