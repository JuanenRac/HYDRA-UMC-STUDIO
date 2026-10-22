// =============================================================================
// HYDRA-UMC STUDIO - Operator-facing server error texts: serverErrors.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The store keeps the last failure of a settings save or a factory reset as a
// string shown in a tooltip and in the login form. Those strings were English
// literals; they now come from the catalogs in the language chosen by the
// operator. The translation is resolved when the failure happens, so the text
// stays in that language even if the language is changed afterwards.
// =============================================================================
import i18n from '../i18n';

export type SaveKind = 'save' | 'reset';

/** Text for a settings request that came back with `status`, or null when it never reached the server. */
export function saveFailureText(kind: SaveKind, status: number | null): string {
  if (status === null) return i18n.t(`serverErrors.${kind}_unreachable`);
  if (status === 401) return i18n.t(`serverErrors.${kind}_401`);
  if (status === 403) return i18n.t(`serverErrors.${kind}_403`);
  return i18n.t(`serverErrors.${kind}_http`, { status });
}

/** The server's own message when it sent one, otherwise the translated generic text. */
export function loginFailureText(serverMessage: unknown): string {
  return typeof serverMessage === 'string' && serverMessage ? serverMessage : i18n.t('serverErrors.login_failed');
}

export function unreachableText(): string {
  return i18n.t('serverErrors.cannot_reach_server');
}
