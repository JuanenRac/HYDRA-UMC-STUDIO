// =============================================================================
// HYDRA-UMC STUDIO - playback step numbering: playbackStep.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// `playbackState.activeStep` as the server publishes it is the index of the point the robot is about to go to: after
// it has moved to point N the value is N + 1, and 0 before the first move. The list highlighted the point numbered
// `activeStep` - the next one, not the one the robot is at - and the progress bar passed 100 % before the end.
// =============================================================================

/** Index of the point the robot is at now, or -1 before the first move / when nothing is playing. */
export function currentPlaybackStep(activeStep: number | null | undefined): number {
  return typeof activeStep === 'number' && Number.isFinite(activeStep) && activeStep >= 1 ? Math.floor(activeStep) - 1 : -1;
}

/** Playback progress 0..100: how far along the points the robot is, 100 once the run is finished. */
export function playbackProgressPercent(
  activeStep: number | null | undefined,
  pointCount: number,
  isFinished: boolean | undefined,
): number {
  if (isFinished) return 100;
  if (pointCount <= 0) return 0;
  const current = Math.max(0, currentPlaybackStep(activeStep));
  const percent = (current / Math.max(1, pointCount - 1)) * 100;
  return Math.min(100, Math.max(0, percent));
}
