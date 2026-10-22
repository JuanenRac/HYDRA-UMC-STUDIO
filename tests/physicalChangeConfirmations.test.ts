// =============================================================================
// HYDRA-UMC STUDIO - tests/physicalChangeConfirmations.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Changing the tool or the model of a robot changes how the next moves are
// computed and limited, so the selectors must go through a confirmation
// dialog instead of writing straight to the robot.
// =============================================================================
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(path.resolve(__dirname, '../src/components/RobotDetail.tsx'), 'utf8');

describe('robot selectors ask before acting', () => {
  it('the tool selector only stages the change', () => {
    expect(source).toContain('onChange={e => setPendingTool(e.target.value)}');
  });

  it('the model selector only stages the change', () => {
    expect(source).toContain('onChange={e => setPendingModel(e.target.value)}');
    expect(source).not.toMatch(/onChange=\{e => updateRobot\(robot\.id, \{ model:/);
  });

  it('the model change is applied by the confirmation, with its own text', () => {
    expect(source).toContain("t('robot_detail.confirm_model'");
    expect(source).toMatch(/runPendingModel[\s\S]{0,200}updateRobot\(robot\.id, \{ model:/);
  });
});
