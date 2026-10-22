// =============================================================================
// HYDRA-UMC STUDIO - tests/serverErrors.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The save, factory-reset and login failures the store keeps are translated
// when they happen, and carry the HTTP status when the server gave one.
// =============================================================================
import { afterEach, describe, expect, it } from 'vitest';
import { setLanguage } from '../src/i18n';
import { loginFailureText, saveFailureText, unreachableText } from '../src/lib/serverErrors';

afterEach(async () => {
  await setLanguage('en');
});

describe('saveFailureText', () => {
  it('keeps the English wording by default', () => {
    expect(saveFailureText('save', 401)).toBe('Save failed (401): your session has expired - log in again.');
    expect(saveFailureText('save', 403)).toContain('does not have permission');
    expect(saveFailureText('save', 502)).toBe('Save failed (HTTP 502).');
    expect(saveFailureText('save', null)).toBe('Save failed: could not reach the server.');
    expect(saveFailureText('reset', 500)).toBe('Factory reset failed (HTTP 500).');
    expect(saveFailureText('reset', null)).toBe('Factory reset failed: could not reach the server.');
  });

  it('follows the selected language and fills the status in', async () => {
    await setLanguage('es');
    expect(saveFailureText('save', 503)).toBe('Error al guardar (HTTP 503).');
    await setLanguage('de');
    expect(saveFailureText('reset', null)).toContain('Server nicht erreichbar');
  });
});

describe('login failures', () => {
  it('prefers the server message and falls back to the translated one', async () => {
    expect(loginFailureText('Account locked')).toBe('Account locked');
    expect(loginFailureText(undefined)).toBe('Login failed');
    await setLanguage('pt');
    expect(loginFailureText('')).toBe('Falha no início de sessão');
    expect(unreachableText()).toBe('Não é possível contactar o servidor');
  });
});
