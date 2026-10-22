import { describe, expect, it } from 'vitest';
import { infoAuthChangeNeedsConfirmation, isLocked, knownWarnings, parseSecurityState, tlsPatch } from '../src/lib/serverSecurity';

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
  });
});
