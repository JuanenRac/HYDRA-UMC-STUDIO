// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/ros2Security.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The requirement of SROS2 of the ROS 2 bridge: off by default with nothing to add, the lines it prepares when switched on, the plain statement
// that STUDIO cannot read or change the bridge, and that nothing is sent to the server.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '../src/i18n';
import { Ros2SecurityPanel } from '../src/components/Ros2SecurityPanel';
import { SROS2_ENVIRONMENT, sros2Preparation } from '../src/lib/ros2Security';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('the lines it prepares', () => {
  it('has nothing to add by default', () => {
    expect(sros2Preparation(false)).toBeNull();
  });
  it('prepares the one key and the environment the bridge checks', () => {
    const prepared = sros2Preparation(true);
    expect(JSON.parse(prepared?.config ?? '')).toEqual({ security: { require_sros2: true } });
    expect(prepared?.environment).toBe(SROS2_ENVIRONMENT);
    expect(SROS2_ENVIRONMENT.map(line => line.split('=')[0])).toEqual(['ROS_SECURITY_ENABLE', 'ROS_SECURITY_STRATEGY', 'ROS_SECURITY_KEYSTORE']);
  });
});

describe('the screen', () => {
  it('is off by default, shows no lines and says it cannot read the bridge', () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    render(<Ros2SecurityPanel />);
    expect((screen.getByTestId('ros2-security-require') as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByTestId('ros2-security-lines')).toBeNull();
    expect(screen.getByTestId('ros2-security-honest').textContent).toBe(i18n.t('ros2Security.not_reported'));
    expect(screen.getByTestId('ros2-security-state').textContent).toBe(i18n.t('ros2Security.state_off'));
    expect(spy).not.toHaveBeenCalled();
  });
  it('shows the lines when switched on, still sends nothing, and hides them again when switched off', () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    render(<Ros2SecurityPanel />);
    fireEvent.click(screen.getByTestId('ros2-security-require'));
    expect(screen.getByTestId('ros2-security-config').textContent).toContain('"require_sros2": true');
    expect(screen.getByTestId('ros2-security-env').textContent).toContain('ROS_SECURITY_STRATEGY=Enforce');
    expect(screen.getByTestId('ros2-security-state').textContent).toBe(i18n.t('ros2Security.state_on'));
    expect(screen.getByTestId('ros2-security-honest').textContent).toBe(i18n.t('ros2Security.not_reported'));
    fireEvent.click(screen.getByTestId('ros2-security-require'));
    expect(screen.queryByTestId('ros2-security-lines')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});
