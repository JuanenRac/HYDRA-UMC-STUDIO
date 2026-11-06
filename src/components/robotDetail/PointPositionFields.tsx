// =============================================================================
// HYDRA-UMC STUDIO - src/components/robotDetail/PointPositionFields.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Move the point being edited to a typed position (millimetres): the joints are solved by the inverse kinematics of the model
// and a position out of its reach is refused with the reason. The result goes into the edit form; Save keeps it.
// =============================================================================
import { useState } from 'react';
import type { TFunction } from 'i18next';
import type { RobotState } from '../../store';
import { jointsToCartesianForModel } from '../../examples/robotKinematicsDispatch';
import { loadReachTolerance } from '../../lib/reachCheck';
import { movePointToPosition, parseMillimetres } from '../../lib/trajectoryPreview';

type EditedPoint = RobotState['recordedPoints'][number];

interface PointPositionFieldsProps {
  model: RobotState['model'] | undefined;
  point: EditedPoint;
  onMoved: (point: EditedPoint) => void;
  t: TFunction;
}

const fieldClass = 'bg-slate-950 border border-slate-800 rounded px-1 py-1.5 text-[10px] font-mono text-slate-200 outline-none w-full focus:border-sky-500 transition-colors';

function browserStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function PointPositionFields({ model, point, onMoved, t }: PointPositionFieldsProps) {
  const start = jointsToCartesianForModel(model, point);
  const [text, setText] = useState({ x: start.x.toFixed(1), y: start.y.toFixed(1), z: start.z.toFixed(1) });
  const [notice, setNotice] = useState<{ kind: 'ok' | 'warn'; message: string } | null>(null);

  const apply = () => {
    const x = parseMillimetres(text.x);
    const y = parseMillimetres(text.y);
    const z = parseMillimetres(text.z);
    if (x === null || y === null || z === null) {
      setNotice({ kind: 'warn', message: t('robot_detail.edit_invalid') });
      return;
    }
    const tolerance = loadReachTolerance(browserStorage());
    const result = movePointToPosition(model, point, { x, y, z }, tolerance);
    if (result.point === null) {
      const key = result.code === 'no_kinematics' ? 'robot_detail.edit_no_model' : result.code === 'unreachable' ? 'robot_detail.edit_unreachable' : 'robot_detail.edit_invalid';
      setNotice({ kind: 'warn', message: t(key, { miss: result.missMm.toFixed(1), tolerance }) });
      return;
    }
    onMoved(result.point);
    setText({ x: (result.point.x ?? x).toFixed(1), y: (result.point.y ?? y).toFixed(1), z: (result.point.z ?? z).toFixed(1) });
    setNotice({ kind: 'ok', message: t('robot_detail.edit_done', { miss: result.missMm.toFixed(1) }) });
  };

  return (
    <div className="flex flex-col gap-1" data-testid="point-position-fields">
      <div className="grid grid-cols-6 gap-2 items-end">
        {(['x', 'y', 'z'] as const).map((axis) => (
          <div key={axis} className="flex flex-col gap-1 col-span-1">
            <label className="text-[9px] text-slate-500 uppercase">{t(`robot_detail.edit_${axis}`)}</label>
            <input type="text" inputMode="decimal" data-testid={`point-position-${axis}`} className={fieldClass} value={text[axis]} onChange={(e) => setText({ ...text, [axis]: e.target.value })} />
          </div>
        ))}
        <button type="button" data-testid="point-position-apply" onClick={apply} className="col-span-3 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded text-[10px] font-bold transition-colors">
          {t('robot_detail.edit_apply')}
        </button>
      </div>
      {notice && (
        <p data-testid="point-position-notice" role="status" className={notice.kind === 'ok' ? 'text-[10px] text-emerald-400' : 'text-[10px] text-amber-300'}>
          {notice.message}
        </p>
      )}
    </div>
  );
}
