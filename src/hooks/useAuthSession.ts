// =============================================================================
// HYDRA-UMC STUDIO - The session of the signed-in person: hooks/useAuthSession.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The session token (read synchronously on the first render, from the address of a WebView or from the storage), the sign-in with its second
// step, the silent renewal with the refresh token and the sign-out. Moved out of HydraProvider unchanged, so the provider keeps the settings,
// the socket and the robots.
// =============================================================================
import { useCallback, useMemo, useRef, useState } from 'react';
import { apiUrl } from '../lib/apiBase';
import { clientHeader } from '../lib/connectionsApi';
import studioPackage from '../../package.json';
import { loginFailureText, totpNeededText, unreachableText } from '../lib/serverErrors';
import { loginNeedsCode as loginNeedsCodeFrom, normalizeCode } from '../lib/totpApi';
import { clearTokens, extractLaunchToken, readRefreshToken, readToken, replaceToken, saveLaunchToken, saveLoginTokens } from '../lib/session';
import { settingsSaveAllowed } from '../lib/settingsSave';
import { usernameFromToken } from '../lib/settingsScope';
import { decodeJwtRole } from '../store';

export function useAuthSession() {
  // Session token - lazy-initialized synchronously (not in a useEffect) so the
  // very first render already knows whether we're authenticated, avoiding a
  // flash of a login screen for a WebView launched with a real ?token= (the
  // Android app's embedded 3D view, ThreeDScreen.kt) or a browser tab that
  // already has one saved from a previous login. The login screen
  // (AuthGate.tsx) calls POST /api/login and keeps the session in sessionStorage; the server requires a bearer
  // token on GET/POST /api/settings, POST /api/robot/:id/command and the /ws upgrade, so a tab without a session
  // shows the login screen (or the read-only notice) instead of silently failing.
  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const launch = extractLaunchToken(window.location.href);
    if (launch) {
      // A token that came in the address belongs to this view only: it goes to sessionStorage (gone with the
      // view, not shared with other tabs), never to the storage that outlives it - see lib/session.ts.
      saveLaunchToken(launch.token);
      // And it must not stay in the address bar (history, screenshots, a copied link, a proxy log).
      try {
        window.history.replaceState(null, '', launch.cleanedUrl);
      } catch { /* a WebView without the History API keeps the address as it is */ }
      return launch.token;
    }
    return readToken();
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginNeedsCode, setLoginNeedsCode] = useState(false);
  // Who is signed in and whether the account may save the settings tree, for the callbacks that outlive a render.
  const accountRef = useRef<{ username: string | null; mayEditGlobal: boolean }>({ username: null, mayEditGlobal: true });
  const role = useMemo(() => decodeJwtRole(authToken), [authToken]);
  accountRef.current = { username: usernameFromToken(authToken), mayEditGlobal: settingsSaveAllowed(role) };

  const login = useCallback(async (username: string, password: string, keepSignedIn = false, totp?: string) => {
    setLoginError(null);
    try {
      const res = await fetch(apiUrl('/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...clientHeader(studioPackage.version) },
        body: JSON.stringify(totp ? { username, password, totp: normalizeCode(totp) } : { username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        // An account with the second step on answers 401 {totpRequired}: the form then asks for the code. A wrong code
        // answers the same way, so the form stays on the code field.
        if (loginNeedsCodeFrom(res.status, data)) setLoginNeedsCode(true);
        // First answer without a code: say what is needed, in the language of the screen, not the server's English line.
        setLoginError(!totp && loginNeedsCodeFrom(res.status, data) ? totpNeededText() : loginFailureText(data.error));
        return false;
      }
      // The refresh token returned beside the access token lets a later WS 1008 close (or a 401 on a command)
      // recover a fresh access token silently; a server that sends none degrades to a forced re-login.
      saveLoginTokens(data.token, typeof data.refreshToken === 'string' ? data.refreshToken : undefined, undefined, keepSignedIn);
      setAuthToken(data.token);
      return true;
    } catch {
      setLoginError(unreachableText());
      return false;
    }
  }, []);

  // called only when the WS reconnect effect below sees a real 1008
  // close - tries to recover silently (no visible interruption, no lost
  // view/robot selection) before falling back to logout()'s own full
  // reload. Deliberately NOT attempted for "no token"/never-logged-in
  // (nothing to refresh) - only when a refresh token is actually on file.
  // Mirrors server.ts's own /api/refresh contract exactly: success
  // rotates both tokens, failure (revoked account, expired refresh token,
  // or the server simply predating this feature) means a real re-login is
  // the only correct next step, same as before this fix existed.
  const attemptTokenRefresh = useCallback(async (): Promise<boolean> => {
    const refreshToken = readRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(apiUrl('/api/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) return false;
      replaceToken(data.token, typeof data.refreshToken === 'string' ? data.refreshToken : undefined);
      // Updating authToken re-runs the WS-reconnect effect below (it's in
      // that effect's own dependency array) with the fresh token - no
      // separate reconnect call needed here.
      setAuthToken(data.token);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Real bug reported live from the footer's own new Sign Out button
  // (Dashboard.tsx): clearing just authToken did nothing VISIBLE when the
  // session had actually gone through AuthGate's "Continue read-only"
  // path - that flag is separate local state inside AuthGate.tsx, which
  // this function has no reference to and can't reset directly, and
  // AuthGate's own gate is `if (authToken || readOnly)`, so readOnly
  // alone kept the app open regardless of authToken clearing. A full
  // reload resets every component's local state unconditionally (this
  // one included, and any other one on the same class of bug this or a
  // future screen might introduce) rather than trying to track down and
  // individually clear every local flag anything could ever gate on.
  const logout = useCallback(() => {
    // revoke the refresh token server-side too (best-effort - a
    // failed/slow request here must never block or delay the reload below,
    // this tab is logging out either way), not just discard it client-side,
    // which would otherwise leave it silently valid for the rest of its
    // real TTL on server.ts. See refresh_tokens.ts's own revokeRefreshToken().
    const refreshToken = readRefreshToken();
    if (refreshToken) {
      fetch(apiUrl('/api/logout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    clearTokens();
    setAuthToken(null);
    window.location.reload();
  }, []);

  return { authToken, setAuthToken, loginError, loginNeedsCode, accountRef, role, login, attemptTokenRefresh, logout };
}
