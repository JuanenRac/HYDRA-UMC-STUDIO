// =============================================================================
// HYDRA-UMC STUDIO - UI Component: StopAll.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The global STOP: ONE click, no confirmation, every robot (POST /api/stop-all through the store's emergencyStop()).
//   - StopAllButton: the red STOP button. The header and the footer carry one, and the remote-control overlay of a robot has its
//     own, so it is on screen whatever is open.
//   - StopAllShortcut: the keyboard chord (Ctrl+Shift+Space) - a modifier chord that is not typed by accident and
//     does not fire on a held key.
//   - StopAllReportBanner: what the stop did, robot by robot. A failed robot or a stop the server could not save is
//     a warning that stays until it is dismissed; a clean result fades by itself.
// A stop that got no answer at all is the "STOP not confirmed" issue of CommandIssueBanner.tsx, which stays until a
// later stop is answered.
// =============================================================================

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertOctagon, CheckCircle2, X } from 'lucide-react';
import { useHydraStore } from '../store';
import { STOP_ALL_SHORTCUT_LABEL, isStopAllShortcut, reportNeedsAttention } from '../lib/stopAll';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function StopAllButton({ variant = 'header' }: { variant?: 'header' | 'footer' }) {
  const { t } = useTranslation();
  const { emergencyStop, stopAllPending, commandIssue } = useHydraStore();
  const unconfirmed = commandIssue?.code === 'estop_failed';
  return (
    <button
      type="button"
      data-testid="stop-all"
      onClick={() => { void emergencyStop(); }}
      title={t('stop_all.tooltip', { shortcut: STOP_ALL_SHORTCUT_LABEL })}
      aria-label={t('stop_all.tooltip', { shortcut: STOP_ALL_SHORTCUT_LABEL })}
      className={cn(
        'flex items-center justify-center gap-2 rounded-full bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black uppercase tracking-widest border transition-all shrink-0',
        unconfirmed ? 'border-white animate-pulse shadow-[0_0_24px_rgba(255,255,255,0.7)]' : 'border-rose-300 shadow-[0_0_18px_rgba(244,63,94,0.7)]',
        variant === 'header' && 'px-6 py-2 text-base min-h-[44px]',
        variant === 'footer' && 'px-6 py-1 text-[11px]',
        stopAllPending && 'opacity-80',
      )}
    >
      <AlertOctagon size={variant === 'footer' ? 14 : 20} />
      {t('stop_all.label')}
    </button>
  );
}

/** Mounted once: Ctrl+Shift+Space presses STOP from anywhere, even while a text field has the focus. */
export function StopAllShortcut() {
  const { emergencyStop } = useHydraStore();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isStopAllShortcut(event)) return;
      event.preventDefault();
      void emergencyStop();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });
  return null;
}

export function StopAllReportBanner({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { stopAllReport, dismissStopAllReport, emergencyStop } = useHydraStore();
  const attention = stopAllReport ? reportNeedsAttention(stopAllReport) : false;

  // A clean result is information: it fades. A warning stays until it is dismissed.
  useEffect(() => {
    if (!stopAllReport || attention) return;
    const timer = setTimeout(dismissStopAllReport, 8000);
    return () => clearTimeout(timer);
  }, [stopAllReport, attention, dismissStopAllReport]);

  if (!stopAllReport) return null;
  return (
    <div className={cn('fixed inset-x-0 z-[95] flex justify-center p-2 pointer-events-none', compact ? 'bottom-0' : 'bottom-12')}>
      <div
        role={attention ? 'alert' : 'status'}
        aria-live={attention ? 'assertive' : 'polite'}
        data-testid="stop-all-report"
        className={cn(
          'pointer-events-auto max-w-2xl w-full rounded-lg border px-4 py-3 shadow-2xl flex items-start gap-3',
          attention ? 'border-rose-500 bg-rose-950/95 text-rose-100' : 'border-emerald-500/60 bg-emerald-950/95 text-emerald-100',
        )}
      >
        {attention ? <AlertOctagon size={20} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={20} className="shrink-0 mt-0.5" />}
        <div className="flex-1 text-xs leading-relaxed min-w-0">
          <div className="font-black uppercase tracking-widest">
            {t('stop_all.summary', { stopped: stopAllReport.stoppedCount, failed: stopAllReport.failedCount })}
          </div>
          {!stopAllReport.persisted && <div className="font-bold">{t('stop_all.not_saved')}</div>}
          {stopAllReport.viaFallback && <div className="opacity-80">{t('stop_all.by_robot')}</div>}
          <ul className="mt-1 max-h-32 overflow-y-auto custom-scrollbar">
            {stopAllReport.robots.map((robot) => (
              <li key={`${robot.controllerId ?? ''}-${robot.robotId}`} className={robot.stopped ? '' : 'font-black'}>
                {robot.stopped ? '✓' : '✗'} {robot.name}: {robot.stopped ? t('stop_all.robot_stopped') : t('stop_all.robot_failed')}
                {robot.stopped && (robot.valvesOff > 0 || robot.pumpsOff > 0) && ` (${t('stop_all.outputs', { valves: robot.valvesOff, pumps: robot.pumpsOff })})`}
                {robot.reservedBy && ` - ${t('stop_all.reserved_by', { owner: robot.reservedBy })}`}
                {robot.error && ` - ${robot.error}`}
              </li>
            ))}
          </ul>
          {attention && (
            <button
              type="button"
              onClick={() => { void emergencyStop(); }}
              className="mt-2 px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest"
            >
              {t('stop_all.retry')}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismissStopAllReport}
          title={t('command_issue.dismiss')}
          aria-label={t('command_issue.dismiss')}
          className="shrink-0 p-1 rounded hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
