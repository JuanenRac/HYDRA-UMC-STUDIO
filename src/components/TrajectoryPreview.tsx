// =============================================================================
// HYDRA-UMC STUDIO - the preview of a trajectory before Play: TrajectoryPreview.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Three views of the path (from above, from the side, from the front), the length and the largest swing of a joint, and the
// list of what is wrong with it. Shown by RobotDetail before Play when the operator switched the check on.
// =============================================================================
import { useTranslation } from 'react-i18next';
import { PREVIEW_LISTED_ISSUES, PREVIEW_VIEW, projectPath, type PreviewIssue, type PreviewPlane, type PreviewReport } from '../lib/trajectoryPreview';

const PLANES: readonly PreviewPlane[] = ['top', 'side', 'front'];

function issueText(t: (key: string, options?: Record<string, unknown>) => string, issue: PreviewIssue): string {
  const point = issue.point + 1;
  if (issue.kind === 'joint-limit') return t('trajectory_preview.issue_limit', { point, joint: issue.joint.toUpperCase(), value: Math.round(issue.valueDeg), min: issue.minDeg, max: issue.maxDeg });
  if (issue.kind === 'joint-step') return t('trajectory_preview.issue_step', { point, joint: issue.joint.toUpperCase(), delta: Math.round(issue.deltaDeg) });
  return t('trajectory_preview.issue_pose', { point, mm: Math.round(issue.mm) });
}

export function TrajectoryPreview({ report }: { report: PreviewReport }) {
  const { t } = useTranslation();
  const { width, height } = PREVIEW_VIEW;
  return (
    <div className="flex flex-col gap-3 text-xs text-slate-300" data-testid="trajectory-preview">
      <div className="flex flex-wrap gap-2">
        {PLANES.map((plane) => {
          const points = projectPath(report.path, plane);
          return (
            <figure key={plane} className="m-0 flex flex-col items-center gap-1">
              <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t(`trajectory_preview.view_${plane}`)} className="rounded border border-slate-700 bg-slate-950">
                {points.length > 1 && <polyline fill="none" stroke="#38bdf8" strokeWidth={2} points={points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />}
                {points.length > 0 && <circle cx={points[0].x} cy={points[0].y} r={4} fill="#34d399" />}
                {points.length > 1 && <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={4} fill="#fb7185" />}
              </svg>
              <figcaption className="text-[10px] uppercase tracking-wider text-slate-500">{t(`trajectory_preview.view_${plane}`)}</figcaption>
            </figure>
          );
        })}
      </div>
      <p data-testid="trajectory-preview-summary">{t('trajectory_preview.summary', { count: report.points, length: Math.round(report.pathLengthMm), step: Math.round(report.maxStepDeg) })}</p>
      {report.clean ? (
        <p className="font-bold text-emerald-400" data-testid="trajectory-preview-clean">{t('trajectory_preview.clean')}</p>
      ) : (
        <ul className="max-h-32 overflow-y-auto font-mono text-amber-300" data-testid="trajectory-preview-issues">
          {report.issues.slice(0, PREVIEW_LISTED_ISSUES).map((issue, i) => <li key={i}>{issueText(t, issue)}</li>)}
          {report.issues.length > PREVIEW_LISTED_ISSUES && <li>{t('trajectory_preview.more', { count: report.issues.length - PREVIEW_LISTED_ISSUES })}</li>}
        </ul>
      )}
    </div>
  );
}
