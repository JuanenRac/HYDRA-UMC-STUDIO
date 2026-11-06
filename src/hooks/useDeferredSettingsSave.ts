// =============================================================================
// HYDRA-UMC STUDIO - The deferred save of the settings tree: hooks/useDeferredSettingsSave.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// A change of the settings, the controllers or the active controller is saved 500 ms later. The timer lives in a ref and
// not in the effect's cleanup: a change that arrives from the server re-runs the effect, and cancelling the pending save
// there would drop an edit the operator made a moment earlier. The payload is built when the timer fires, from the
// latest state.
// =============================================================================
import { useEffect, useRef, type MutableRefObject } from 'react';
import { saveFailureText } from '../lib/serverErrors';
import { settingsSaveAllowed } from '../lib/settingsSave';
import { robotRevisions } from '../lib/revisions';
import { isTemperatureWarning, parseWarnings } from '../lib/safetyLimits';
import type { SettingsSaveOutcome } from '../lib/settingsConcurrency';
import type { CommandIssue } from '../lib/commandResult';

export const SETTINGS_SAVE_DEBOUNCE_MS = 500;

export interface DeferredSaveOptions {
  /** The first read of the settings has finished: nothing is saved before. */
  isLoaded: boolean;
  /** Re-runs the schedule when any of these changes (settings, controllers, active controller). */
  watch: unknown[];
  role: string | null;
  /** Set by a delta or a command: the next change is already in sync with the server. */
  skipNextSaveRef: MutableRefObject<boolean>;
  lastPayloadJsonRef: MutableRefObject<string | null>;
  /** Builds the JSON of the whole tree from the latest state. */
  buildPayloadJson: () => string;
  persistTree: (payloadJson: string, force: boolean) => Promise<SettingsSaveOutcome>;
  setOperatorEdited: (edited: boolean) => void;
  setSettingsSaveError: (message: string | null) => void;
  reportCommandIssue: (issue: Omit<CommandIssue, 'id'>) => void;
}

export function useDeferredSettingsSave(o: DeferredSaveOptions): void {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  useEffect(() => {
    if (!o.isLoaded) return;
    // This change already came from a delta or a command: it is in sync with the server, so no new save is scheduled -
    // but one already pending for an earlier local edit is left alone. Consumed so the next real edit is saved.
    if (o.skipNextSaveRef.current) {
      o.skipNextSaveRef.current = false;
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      const payloadJson = o.buildPayloadJson();
      if (payloadJson === o.lastPayloadJsonRef.current) return; // unchanged since the last send/receive
      if (!settingsSaveAllowed(o.role)) {
        // An operator cannot save the tree: it would be a 403 after every edit. The edit stays in this window.
        o.setOperatorEdited(true);
        o.setSettingsSaveError(null);
        return;
      }
      void o.persistTree(payloadJson, false).then((outcome) => {
        if (outcome.kind === 'failed') {
          // Not marked as sent, so the next real change (or a manual retry) tries again instead of giving up for good.
          o.setSettingsSaveError(saveFailureText('save', outcome.status));
          return;
        }
        if (outcome.kind === 'conflict') return; // persistTree has already shown the server's version and said so
        o.lastPayloadJsonRef.current = payloadJson;
        o.setSettingsSaveError(null);
        // Saving the whole tree changes the robots on the server too: what was known of their revisions is stale.
        robotRevisions.forget();
        // The server lowers a bed target above the ceiling of its model and says so.
        const lowered = parseWarnings(outcome.body).find(isTemperatureWarning);
        if (lowered) o.reportCommandIssue({ code: 'temperature_limit', command: 'settings', robotIds: lowered.robotId === null ? [] : [lowered.robotId], detail: `${lowered.requested ?? '?'} -> ${lowered.applied ?? '?'}` });
      });
    }, SETTINGS_SAVE_DEBOUNCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.isLoaded, o.role, o.persistTree, o.reportCommandIssue, ...o.watch]);
}
