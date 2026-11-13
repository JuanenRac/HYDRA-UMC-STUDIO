// =============================================================================
// HYDRA-UMC STUDIO - tests/serverReadOnly.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Read-only mode of the whole server: the code the server answers with is told apart from a robot in safe mode (both are 423), the option of Server
// Admin is read only when the server has it, every change is confirmed, and the texts exist in the eight languages.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { failureCodeFor, interpretCommandResponse, summarizeBulk } from '../src/lib/commandResult';
import { knownWarnings, readOnlyChangeNeedsConfirmation, readOnlyPatch } from '../src/lib/serverSecurity';
import en from '../src/locales/en.json';
import es from '../src/locales/es.json';
import de from '../src/locales/de.json';
import fr from '../src/locales/fr.json';
import itLocale from '../src/locales/it.json';
import ja from '../src/locales/ja.json';
import zh from '../src/locales/zh.json';
import pt from '../src/locales/pt.json';

describe('the answer of a read-only server', () => {
  it('is its own failure, not a robot in safe mode', () => {
    expect(failureCodeFor(423, 'server-read-only')).toBe('server_read_only');
    expect(failureCodeFor(423, 'robot-disabled')).toBe('robot_disabled');
    expect(failureCodeFor(423, null)).toBe('robot_disabled');
  });

  it('is read from the body of a command', () => {
    const result = interpretCommandResponse(423, false, { error: 'this server is in read-only mode', code: 'server-read-only' });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('server_read_only');
    expect(result.serverCode).toBe('server-read-only');
  });

  it('is the most telling failure of a bulk command', () => {
    const readOnly = interpretCommandResponse(423, false, { code: 'server-read-only' });
    const disabled = interpretCommandResponse(423, false, { code: 'robot-disabled' });
    expect(summarizeBulk([{ robotId: 1, result: disabled }, { robotId: 2, result: readOnly }]).code).toBe('server_read_only');
  });
});

describe('the option in Server Admin', () => {
  it('builds the request', () => {
    expect(readOnlyPatch(true)).toEqual({ robots: { readOnly: true } });
    expect(readOnlyPatch(false)).toEqual({ robots: { readOnly: false } });
  });

  it('asks before any change and never when nothing changes', () => {
    expect(readOnlyChangeNeedsConfirmation(false, true)).toBe(true);
    expect(readOnlyChangeNeedsConfirmation(true, false)).toBe(true);
    expect(readOnlyChangeNeedsConfirmation(true, true)).toBe(false);
    expect(readOnlyChangeNeedsConfirmation(false, false)).toBe(false);
  });

  it('knows the warning of the server', () => {
    expect(knownWarnings(['server_read_only_on', 'x'])).toEqual(['server_read_only_on']);
  });
});

describe('the texts', () => {
  it('exist in the eight languages', () => {
    for (const [code, locale] of Object.entries({ en, es, de, fr, it: itLocale, ja, zh, pt })) {
      const l = locale as unknown as { command_issue: Record<string, string>; ecosystem: Record<string, string> };
      expect(l.command_issue.server_read_only, code).toContain('{{command}}');
      for (const key of ['title', 'label', 'help', 'save', 'confirm', 'warning']) {
        expect(l.ecosystem[`admin_security_readonly_${key}`]?.length, `${code} ${key}`).toBeGreaterThan(4);
      }
    }
  });
});
