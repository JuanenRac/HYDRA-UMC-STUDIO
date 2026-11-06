// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/atcToolsConfig.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The tool changer screen of the configuration: a robot without a changer offers to enable one with the default layout and nothing else,
// and a robot with one shows its slots and sends only the change that was made.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '../src/i18n';
import { defaultControllers } from '../src/store';
import { HydraStoreProviders } from '../src/storeContexts';
import { ATCToolsConfig } from '../src/components/ATCToolsConfig';
import { defaultAtcConfig } from '../src/lib/moduleConfigs';

afterEach(() => cleanup());

function renderAtc(atc: ReturnType<typeof defaultAtcConfig> | undefined) {
  const updateRobot = vi.fn();
  const controller = defaultControllers[0];
  const robot = { ...controller.robots[0], atc };
  const value = { robots: [robot], controllers: [controller], activeController: controller, activeControllerId: controller.id, updateRobot };
  render(
    <HydraStoreProviders value={value as never}><ATCToolsConfig /></HydraStoreProviders>,
  );
  return { updateRobot, robot };
}

describe('ATCToolsConfig', () => {
  it('offers to enable a changer on a robot that has none, with the default layout', () => {
    const { updateRobot, robot } = renderAtc(undefined);
    fireEvent.click(screen.getByRole('button', { name: /enable atc/i }));
    expect(updateRobot).toHaveBeenCalledTimes(1);
    expect(updateRobot).toHaveBeenCalledWith(robot.id, { atc: defaultAtcConfig() });
  });

  it('shows no reset button before a changer exists', () => {
    renderAtc(undefined);
    expect(screen.queryByRole('button', { name: /reset/i })).toBeNull();
  });

  it('sends nothing on opening a robot that already has a changer', () => {
    const { updateRobot } = renderAtc(defaultAtcConfig());
    expect(updateRobot).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /enable atc/i })).toBeNull();
  });
});
