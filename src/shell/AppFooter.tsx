// =============================================================================
// HYDRA-UMC STUDIO - src/shell/AppFooter.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The status bar: server name, robots online, machine readings, the gamepad, the STOP, power, sign out and the clock.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gamepad2, LogOut, Power, RefreshCw } from 'lucide-react';
import { cn } from '../components/robotDetail/shared';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StopAllButton } from '../components/StopAll';
import { useGamepadSession } from '../lib/gamepadSession';
import { ServerHttpError, serverClient } from '../lib/serverClient';
import { useCommandFeedback, useFleet, useServerStatus, useSession, useSettingsStore } from '../storeContexts';
import { SystemMetricsBar } from './SystemMetricsBar';

export function AppFooter({ selectedRobotId }: { selectedRobotId: number }) {
  const { t } = useTranslation();
  const { logout } = useSession();
  const { reportCommandIssue } = useCommandFeedback();
  const { serverReachable } = useServerStatus();
  const { settings } = useSettingsStore();
  const { robots } = useFleet();
  const gamepadSession = useGamepadSession();
  const [currentTime, setCurrentTime] = useState(new Date());
  // Real per-corner request: shutdown/restart for this CM5's own kiosk
  // node, next to the existing global E-STOP. Same loopback-only Server
  // endpoints AuthGate.tsx's pre-login power buttons already call (see
  // that file's own comment on why they're safe unauthenticated) - here
  // they're reached from inside an already-authenticated session instead,
  // so no extra gate is needed on this side either way.
  const [showShutdownConfirm, setShowShutdownConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [powerAction, setPowerAction] = useState<'shutdown' | 'restart' | null>(null);
  const handlePower = async (action: 'shutdown' | 'restart') => {
    setPowerAction(action);
    try {
      await (action === 'shutdown' ? serverClient.postSystemShutdown() : serverClient.postSystemReboot());
      // On success no reset: this device is actually going down - staying disabled/labelled until the page
      // itself loses its connection is the correct, honest state.
    } catch (error) {
      setPowerAction(null);
      // The server refuses these two calls from anywhere but its own device (a kiosk opened by the LAN address,
      // another computer): the buttons must recover and say why, not stay on "Shutting down..." for ever.
      if (error instanceof ServerHttpError) reportCommandIssue({ code: 'power_failed', command: action, robotIds: [], detail: String(error.status) });
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <footer className="h-10 shrink-0 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-6 z-20 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 shadow-2xl overflow-x-auto">
        <div className="flex items-center gap-8 shrink-0">
           <div className="flex items-center gap-3">
              <span className="text-sky-400 font-black tracking-widest bg-sky-500/10 px-3 py-1 rounded border border-sky-500/20">{settings.serverName || "HYDRA-UMC TEST"}</span>
              <div className="w-px h-4 bg-slate-800"></div>
              <span className={cn("w-2.5 h-2.5 rounded-full", serverReachable ? "bg-emerald-500 shadow-[0_0_12px_#10b981]" : "bg-rose-500 shadow-[0_0_12px_#f43f5e]")} />
              <span className="text-slate-200 tracking-[0.4em]">{t('dashboard.system_master_hub')}</span>
           </div>
           <span>{robots.filter(r => r.online).length} / {robots.length} {t('dashboard.nodes_active')}</span>
           <SystemMetricsBar />
        </div>
        <div className="flex items-center gap-8 shrink-0">
          {settings.gamepadEnabled && (
            <span data-testid="gamepad-badge" className={cn("flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border", gamepadSession.armed ? "border-emerald-500/60 text-emerald-300" : "border-slate-700 text-slate-500")} title={t('gamepad_config.controlling', { robot: robots.find(r => r.id === selectedRobotId)?.name ?? `#${selectedRobotId}` })}>
              <Gamepad2 size={14} /> {robots.find(r => r.id === selectedRobotId)?.name ?? `#${selectedRobotId}`} - {gamepadSession.armed ? t('gamepad_config.mode.badge_armed') : t('gamepad_config.mode.badge_off')}
            </span>
          )}
          <StopAllButton variant="footer" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowShutdownConfirm(true)}
              disabled={powerAction !== null}
              title={powerAction === 'shutdown' ? t('auth.shutting_down') : t('auth.shutdown')}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 hover:bg-rose-950 disabled:opacity-50 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition-colors"
            >
              <Power size={14} /> {powerAction === 'shutdown' ? t('auth.shutting_down') : t('auth.shutdown')}
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={powerAction !== null}
              title={powerAction === 'restart' ? t('auth.restarting') : t('auth.restart')}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 hover:bg-amber-950 disabled:opacity-50 text-slate-400 hover:text-amber-300 border border-slate-700 hover:border-amber-800 transition-colors"
            >
              <RefreshCw size={14} /> {powerAction === 'restart' ? t('auth.restarting') : t('auth.restart')}
            </button>
            <button
              onClick={logout}
              title={t('auth.sign_out')}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
            >
              <LogOut size={14} /> {t('auth.sign_out')}
            </button>
          </div>
          {/* Doubled per request (was inheriting the footer's own
              text-[9px]). hour12:false per request too - this CM5 runs
              on European time, 24h clock (00:20, not 12:20:02 AM),
              independent of whatever locale the browser itself reports. */}
          <div className="font-mono text-sky-400 text-[18px]">{currentTime.toLocaleTimeString([], { hour12: false })}</div>
        </div>
      </footer>
      <ConfirmDialog
        open={showShutdownConfirm}
        message={t('auth.confirm_shutdown')}
        onConfirm={() => { setShowShutdownConfirm(false); handlePower('shutdown'); }}
        onCancel={() => setShowShutdownConfirm(false)}
      />
      <ConfirmDialog
        open={showResetConfirm}
        message={t('auth.confirm_restart')}
        onConfirm={() => { setShowResetConfirm(false); handlePower('restart'); }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </>
  );
}
