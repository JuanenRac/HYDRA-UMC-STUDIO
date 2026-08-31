// =============================================================================
// HYDRA-UMC STUDIO - Session Login Gate: AuthGate.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// See store.tsx's own authToken comment for the full why: server.ts's
// `authenticate` middleware unconditionally requires a bearer token on every
// write (POST /api/settings, POST /api/robot/:id/command) and on the /ws
// upgrade, but nothing else in this app calls POST /api/login to get one -
// without this screen, a plain browser tab could read state but could
// never save a change or receive a live push. A ?token= URL param (the Android app's embedded 3D WebView,
// ThreeDScreen.kt) or a token already in localStorage from a previous login
// skips this screen entirely - see authToken's lazy initializer in store.tsx.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, User, LogIn, Power, RotateCcw, LayoutDashboard } from 'lucide-react';
import { useHydraStore } from '../store';
import { apiUrl } from '../lib/apiBase';
import HydraIcon from '../assets/HYDRA_UMC_ICON.svg';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { authToken, login, loginError } = useHydraStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  // Independent from isSubmitting (the sign-in button's own state) -
  // shutdown/restart hit a different endpoint entirely and should disable
  // themselves without touching the login form.
  const [powerAction, setPowerAction] = useState<'shutdown' | 'restart' | null>(null);

  if (authToken || readOnly) return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login(username, password);
    setIsSubmitting(false);
  };

  // Real, deliberately unauthenticated on the Server side too (see
  // server.ts's own requireLoopbackCaller) - this screen is shown before
  // any login, exactly where an operator standing at the physical kiosk
  // (HYDRA-UMC-OS's own HDMI kiosk, see install_kiosk.sh) needs a real
  // power button. Server only accepts these 2 calls from its own
  // loopback, so the same request from anywhere else on the LAN is
  // refused regardless of what this button sends.
  const handlePower = async (action: 'shutdown' | 'restart') => {
    const confirmed = window.confirm(
      action === 'shutdown' ? t('auth.confirm_shutdown') : t('auth.confirm_restart')
    );
    if (!confirmed) return;
    setPowerAction(action);
    try {
      await fetch(apiUrl(action === 'shutdown' ? '/api/system/shutdown' : '/api/system/reboot'), { method: 'POST' });
      // No res.ok check and no finally-reset of powerAction below: a
      // successful call means this device is now actually going down -
      // the button staying disabled/labelled "Shutting down..." until the
      // page itself loses its connection is the correct, honest state,
      // not a bug to fix. A REAL failure (e.g. run from a browser that
      // isn't this device's own kiosk, refused with 403) still needs to
      // recover, which the catch block below handles.
    } catch {
      setPowerAction(null);
    }
  };

  return (
    <div className="w-full h-screen bg-slate-950 bg-electric-grid flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-[380px] max-w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5">
        <img src={HydraIcon} alt="Hydra Logo" className="w-16 h-16 object-contain" />
        <div className="text-center space-y-1">
          <h1 className="text-lg font-bold text-slate-100">{t('auth.title')}</h1>
          <p className="text-xs text-slate-500 leading-relaxed">{t('auth.subtitle')}</p>
        </div>

        <div className="w-full space-y-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-sky-400 transition-all">
            <User size={16} className="text-slate-500 shrink-0" />
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={t('auth.username')}
              autoComplete="username"
              className="bg-transparent outline-none text-sm text-slate-100 flex-1"
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-sky-400 transition-all">
            <Lock size={16} className="text-slate-500 shrink-0" />
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('auth.password')}
              type="password"
              autoComplete="current-password"
              className="bg-transparent outline-none text-sm text-slate-100 flex-1"
            />
          </div>
        </div>

        {loginError && <p className="text-xs text-rose-400 text-center">{loginError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg border border-sky-400 uppercase tracking-wide transition-all"
        >
          <LogIn size={16} /> {isSubmitting ? t('auth.signing_in') : t('auth.sign_in')}
        </button>

        <div className="w-full pt-3 border-t border-slate-800 text-center space-y-1">
          <button type="button" onClick={() => setReadOnly(true)} className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors">
            {t('auth.continue_read_only')}
          </button>
          <p className="text-[10px] text-slate-600">{t('auth.read_only_hint')}</p>
        </div>
      </form>

      {/* Kiosk-only device controls, deliberately outside the login card
          itself - real per-corner placement the operator asked for, not
          part of the sign-in flow. Both hit Server directly (see
          server.ts's own loopback gate); nothing here needs authToken. */}
      <div className="fixed bottom-4 left-4 flex gap-2">
        <button
          type="button"
          onClick={() => handlePower('shutdown')}
          disabled={powerAction !== null}
          title={t('auth.shutdown')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-900/80 hover:bg-rose-950 disabled:opacity-50 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800 rounded-lg backdrop-blur-sm transition-colors"
        >
          <Power size={14} /> {powerAction === 'shutdown' ? t('auth.shutting_down') : t('auth.shutdown')}
        </button>
        <button
          type="button"
          onClick={() => handlePower('restart')}
          disabled={powerAction !== null}
          title={t('auth.restart')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-900/80 hover:bg-amber-950 disabled:opacity-50 text-slate-400 hover:text-amber-300 border border-slate-800 hover:border-amber-800 rounded-lg backdrop-blur-sm transition-colors"
        >
          <RotateCcw size={14} /> {powerAction === 'restart' ? t('auth.restarting') : t('auth.restart')}
        </button>
      </div>

      <a
        href={apiUrl('/admin')}
        className="fixed bottom-4 right-4 flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-sky-300 border border-slate-800 hover:border-sky-800 rounded-lg backdrop-blur-sm transition-colors"
      >
        <LayoutDashboard size={14} /> {t('auth.server_admin')}
      </a>
    </div>
  );
}
