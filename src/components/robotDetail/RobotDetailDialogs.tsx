// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: robotDetail/RobotDetailDialogs.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// The five confirmation dialogs of the robot detail screen (the pose and point actions, the preview before Play, the reach check, the tool and the model).
import { ConfirmDialog } from '../ConfirmDialog';
import { TrajectoryPreview } from '../TrajectoryPreview';
import type { usePlayback } from '../../hooks/usePlayback';
import type { useReachGate } from '../../hooks/useReachGate';

export type PendingAction = 'home' | 'reset' | 'delete_points' | null;

export interface RobotDetailDialogsProps {
  t: any;
  robotModel: string;
  pendingAction: PendingAction;
  setPendingAction: (action: PendingAction) => void;
  runPendingAction: () => void;
  pendingPreview: ReturnType<typeof usePlayback>['pendingPreview'];
  runPendingPreview: () => void;
  cancelPreview: () => void;
  pendingReach: ReturnType<typeof useReachGate>['pendingReach'];
  runPendingReach: () => void;
  cancelPendingReach: () => void;
  pendingTool: string | null;
  setPendingTool: (tool: string | null) => void;
  runPendingTool: () => void;
  pendingModel: string | null;
  setPendingModel: (model: string | null) => void;
  runPendingModel: () => void;
}

export function RobotDetailDialogs({
  t, robotModel, pendingAction, setPendingAction, runPendingAction, pendingPreview, runPendingPreview, cancelPreview,
  pendingReach, runPendingReach, cancelPendingReach, pendingTool, setPendingTool, runPendingTool, pendingModel, setPendingModel, runPendingModel,
}: RobotDetailDialogsProps) {
  return (
    <>
      <ConfirmDialog
        open={pendingAction !== null}
        message={pendingAction ? t(`robot_detail.confirm_${pendingAction}`) : ''}
        danger={pendingAction === 'delete_points'}
        onConfirm={runPendingAction}
        onCancel={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingPreview !== null}
        title={t('trajectory_preview.title')}
        message={pendingPreview ? (pendingPreview.clean ? t('trajectory_preview.ask_clean') : t('trajectory_preview.ask_issues', { count: pendingPreview.issues.length })) : ''}
        details={pendingPreview && <TrajectoryPreview report={pendingPreview} />}
        confirmLabel={pendingPreview && !pendingPreview.clean ? t('trajectory_preview.play_anyway') : t('trajectory_preview.play')}
        danger={pendingPreview ? !pendingPreview.clean : false}
        onConfirm={runPendingPreview}
        onCancel={cancelPreview}
      />
      <ConfirmDialog
        open={pendingReach !== null}
        title={t('robot_detail.reach_title')}
        message={pendingReach ? t('robot_detail.reach_rejected', { count: pendingReach.report.count, model: robotModel, worst: Number.isFinite(pendingReach.report.worstMm) ? Math.round(pendingReach.report.worstMm) : '-', threshold: pendingReach.report.toleranceMm }) : ''}
        details={pendingReach && (
          <div className="flex flex-col gap-2 text-xs text-slate-400">
            <ul data-testid="reach-offenders" className="max-h-32 overflow-y-auto font-mono">
              {pendingReach.report.offenders.slice(0, 12).map((o) => (
                <li key={o.index}>{t('robot_detail.reach_point', { point: o.index + 1, mm: Number.isFinite(o.mm) ? Math.round(o.mm) : '-' })}</li>
              ))}
              {pendingReach.report.offenders.length > 12 && <li>{t('robot_detail.reach_more', { count: pendingReach.report.offenders.length - 12 })}</li>}
            </ul>
            {pendingReach.sendScaled && pendingReach.fit && (
              <p>{pendingReach.fit.fits
                ? t('robot_detail.reach_scale_fits', { percent: Math.round(pendingReach.fit.scale * 100) })
                : t('robot_detail.reach_scale_partial', { percent: Math.round(pendingReach.fit.scale * 100), remaining: pendingReach.fit.remaining })}</p>
            )}
          </div>
        )}
        hideConfirm={!pendingReach?.sendScaled}
        confirmLabel={t('robot_detail.reach_scale_button')}
        cancelLabel={t('robot_detail.reach_reject_button')}
        danger={false}
        onConfirm={runPendingReach}
        onCancel={cancelPendingReach}
      />
      <ConfirmDialog
        open={pendingTool !== null}
        message={t('robot_detail.confirm_tool', { tool: pendingTool ?? '' })}
        danger={false}
        onConfirm={runPendingTool}
        onCancel={() => setPendingTool(null)}
      />
      <ConfirmDialog
        open={pendingModel !== null}
        message={t('robot_detail.confirm_model', { model: pendingModel ?? '' })}
        danger={false}
        onConfirm={runPendingModel}
        onCancel={() => setPendingModel(null)}
      />
    </>
  );
}
