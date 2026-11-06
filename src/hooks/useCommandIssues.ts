// =============================================================================
// HYDRA-UMC STUDIO - The problem of the last command and the answer of the global STOP: hooks/useCommandIssues.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The state of the feedback domain of the store: the problem of the last command and the answer of the global STOP.
// =============================================================================
import { useCallback, useRef, useState } from 'react';
import type { CommandIssue } from '../lib/commandResult';
import type { StopAllReport } from '../lib/stopAll';

export function useCommandIssues() {
  // The problem the last command ran into, kept on screen until it is dismissed (see lib/commandResult.ts).
  const [commandIssue, setCommandIssue] = useState<CommandIssue | null>(null);
  const issueSequenceRef = useRef(0);
  const reportCommandIssue = useCallback((issue: Omit<CommandIssue, 'id'>) => {
    issueSequenceRef.current += 1;
    setCommandIssue({ ...issue, id: issueSequenceRef.current });
  }, []);
  const dismissCommandIssue = useCallback(() => setCommandIssue(null), []);

  // The newest answer of the global STOP, robot by robot (see lib/stopAll.ts), until it is dismissed; and how many
  // global STOPs are on the wire right now.
  const [stopAllReport, setStopAllReport] = useState<StopAllReport | null>(null);
  const [stopAllInFlight, setStopAllInFlight] = useState(0);
  const dismissStopAllReport = useCallback(() => setStopAllReport(null), []);

  return {
    commandIssue, setCommandIssue, reportCommandIssue, dismissCommandIssue,
    stopAllReport, setStopAllReport, stopAllInFlight, setStopAllInFlight, dismissStopAllReport,
  };
}
