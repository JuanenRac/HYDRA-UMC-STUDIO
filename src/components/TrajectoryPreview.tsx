// =============================================================================
// HYDRA-UMC STUDIO - the preview of a trajectory before Play: TrajectoryPreview.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Three views of the path (from above, from the side, from the front) and a fourth that turns around it in steps, the length
// and the largest swing of a joint, and the list of what is wrong with it. Shown by RobotDetail before Play when the operator
// switched the check on.
// =============================================================================
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ORBIT_SETTINGS, PREVIEW_LISTED_ISSUES, PREVIEW_VIEW, projectOrbit, projectPath, turnOrbit, type PreviewIssue, type PreviewPlane, type PreviewReport } from '../lib/trajectoryPreview';

const PLANES: readonly PreviewPlane[] = ['top', 'side', 'front'];
const ORBIT_BUTTONS = [
  { key: 'orbit_left', glyph: '◀', dYaw: -1, dPitch: 0 },
  { key: 'orbit_right', glyph: '▶', dYaw: 1, dPitch: 0 },
  { key: 'orbit_up', glyph: '▲', dYaw: 0, dPitch: 1 },
  { key: 'orbit_down', glyph: '▼', dYaw: 0, dPitch: -1 },
] as const;

function issueText(t: (key: string, options?: Record<string, unknown>) => string, issue: PreviewIssue): string {
  const point = issue.point + 1;
  if (issue.kind === 'joint-limit') return t('trajectory_preview.issue_limit', { point, joint: issue.joint.toUpperCase(), value: Math.round(issue.valueDeg), min: issue.minDeg, max: issue.maxDeg });
  if (issue.kind === 'joint-step') return t('trajectory_preview.issue_step', { point, joint: issue.joint.toUpperCase(), delta: Math.round(issue.deltaDeg) });
  return t('trajectory_preview.issue_pose', { point, mm: Math.round(issue.mm) });
}

function PathDrawing({ points, label }: { points: Array<{ x: number; y: number }>; label: string }) {
  const { width, height } = PREVIEW_VIEW;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="rounded border border-slate-700 bg-slate-950">
      {points.length > 1 && <polyline fill="none" stroke="#38bdf8" strokeWidth={2} points={points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />}
      {points.length > 0 && <circle cx={points[0].x} cy={points[0].y} r={4} fill="#34d399" />}
      {points.length > 1 && <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={4} fill="#fb7185" />}
    </svg>
  );
}

export function TrajectoryPreview({ report }: { report: PreviewReport }) {
  const { t } = useTranslation();
  const [orbit, setOrbit] = useState({ yawDeg: ORBIT_SETTINGS.yawDeg, pitchDeg: ORBIT_SETTINGS.pitchDeg });
  const orbitLabel = t('trajectory_preview.view_orbit', { yaw: Math.round(orbit.yawDeg), pitch: Math.round(orbit.pitchDeg) });
  return (
    <div className="flex flex-col gap-3 text-xs text-slate-300" data-testid="trajectory-preview">
      <div className="flex flex-wrap gap-2">
        {PLANES.map((plane) => (
          <figure key={plane} className="m-0 flex flex-col items-center gap-1">
            <PathDrawing points={projectPath(report.path, plane)} label={t(`trajectory_preview.view_${plane}`)} />
            <figcaption className="text-[10px] uppercase tracking-wider text-slate-500">{t(`trajectory_preview.view_${plane}`)}</figcaption>
          </figure>
        ))}
        <figure className="m-0 flex flex-col items-center gap-1">
          <PathDrawing points={projectOrbit(report.path, orbit.yawDeg, orbit.pitchDeg)} label={orbitLabel} />
          <figcaption className="text-[10px] uppercase tracking-wider text-slate-500" data-testid="trajectory-preview-orbit-caption">{orbitLabel}</figcaption>
          <div className="flex gap-1">
            {ORBIT_BUTTONS.map((b) => (
              <button
                key={b.key}
                type="button"
                data-testid={`trajectory-preview-${b.key}`}
                title={t(`trajectory_preview.${b.key}`)}
                aria-label={t(`trajectory_preview.${b.key}`)}
                onClick={() => setOrbit((o) => turnOrbit(o.yawDeg, o.pitchDeg, b.dYaw, b.dPitch))}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-300 hover:border-sky-500"
              >
                {b.glyph}
              </button>
            ))}
          </div>
        </figure>
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
