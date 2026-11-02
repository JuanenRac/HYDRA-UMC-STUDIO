// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/trajectoryPreviewView.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The view shown before Play when the check of the trajectory is switched on: three views of the path, the summary,
// and either the all-clear or the list of what is wrong, as rendered.
// =============================================================================
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '../src/i18n';
import { TrajectoryPreview } from '../src/components/TrajectoryPreview';
import { analyzeTrajectory } from '../src/lib/trajectoryPreview';

afterEach(cleanup);

const point = (j1: number, x: number) => ({ j1, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, x, y: 0, z: 100 });

describe('TrajectoryPreview', () => {
  it('draws the three views and says that nothing is wrong', () => {
    render(<TrajectoryPreview report={analyzeTrajectory([point(0, 0), point(10, 50)], undefined)} />);
    expect(screen.getAllByRole('img')).toHaveLength(3);
    expect(screen.getByTestId('trajectory-preview-clean')).toBeTruthy();
    expect(screen.queryByTestId('trajectory-preview-issues')).toBeNull();
    expect(screen.getByTestId('trajectory-preview-summary').textContent).toContain('2');
  });

  it('lists the problems, a limited number of them', () => {
    const wild = Array.from({ length: 30 }, (_, i) => point(i % 2 === 0 ? 0 : 400, i));
    render(<TrajectoryPreview report={analyzeTrajectory(wild, undefined)} />);
    const list = screen.getByTestId('trajectory-preview-issues');
    expect(screen.queryByTestId('trajectory-preview-clean')).toBeNull();
    expect(list.querySelectorAll('li').length).toBe(13);
  });
});
