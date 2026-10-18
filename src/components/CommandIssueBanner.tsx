// =============================================================================
// HYDRA-UMC STUDIO - UI Component: CommandIssueBanner.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// What the interface says when a command did not do what the operator asked: a stop that never reached the server, a
// robot held by someone else, a jog step refused as too large - and when the first read of the settings was refused
// for lack of a session (the robots on screen are then the built-in sample). It stays until it is dismissed (a
// remark on an accepted command fades by itself), because a failed STOP is exactly the thing that must not scroll
// past unnoticed.
// =============================================================================

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertOctagon, X } from 'lucide-react';
import { useHydraStore } from '../store';

export function CommandIssueBanner() {
  const { t } = useTranslation();
  const { commandIssue, dismissCommandIssue, emergencyStop, settingsLoadError, robots } = useHydraStore();

  // A remark on a command the server accepted is information, not an alarm: it fades. Every failure stays.
  const fades = commandIssue?.code === 'warnings';
  useEffect(() => {
    if (!commandIssue || !fades) return;
    const timer = setTimeout(dismissCommandIssue, 8000);
    return () => clearTimeout(timer);
  }, [commandIssue, fades, dismissCommandIssue]);

  if (!commandIssue && settingsLoadError !== 'login_required') return null;

  const robotsLabel = commandIssue
    ? commandIssue.robotIds.map((id) => robots.find((r) => r.id === id)?.name ?? `#${id}`).join(', ')
    : '';

  return (
    <div className="fixed top-0 inset-x-0 z-[100] flex flex-col items-center gap-1 p-2 pointer-events-none">
      {settingsLoadError === 'login_required' && (
        <div role="status" className="pointer-events-auto max-w-3xl w-full rounded-lg border border-amber-500/50 bg-amber-950/95 text-amber-200 text-xs font-bold px-4 py-2 shadow-2xl">
          {t('command_issue.login_required')}
        </div>
      )}
      {commandIssue && (
        <div
          role="alert"
          aria-live="assertive"
          className={
            'pointer-events-auto max-w-3xl w-full rounded-lg border px-4 py-3 shadow-2xl flex items-start gap-3 ' +
            (commandIssue.code === 'warnings'
              ? 'border-amber-500/50 bg-amber-950/95 text-amber-100'
              : 'border-rose-500 bg-rose-950/95 text-rose-100')
          }
        >
          <AlertOctagon size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1 text-xs leading-relaxed">
            <div className="font-black uppercase tracking-widest">{t('command_issue.title')}</div>
            <div className="font-bold">
              {t(`command_issue.${commandIssue.code}`, {
                command: commandIssue.command,
                robots: robotsLabel,
                detail: commandIssue.detail ?? '',
              })}
            </div>
            {commandIssue.code === 'estop_failed' && (
              <button
                type="button"
                onClick={() => { void emergencyStop(); }}
                className="mt-2 px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest"
              >
                {t('command_issue.retry_estop')}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={dismissCommandIssue}
            title={t('command_issue.dismiss')}
            aria-label={t('command_issue.dismiss')}
            className="shrink-0 p-1 rounded hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
