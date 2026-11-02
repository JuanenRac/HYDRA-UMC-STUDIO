// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/panelLayout.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The drag of the right panel and of the 3D view of a robot screen: limits, what is kept in the settings and when.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { clampRightPanelWidth, clampThreeDHeight, usePanelLayout } from '../src/hooks/usePanelLayout';

afterEach(() => {
  cleanup();
  document.body.classList.remove('select-none');
});

function move(clientX: number, clientY: number) {
  window.dispatchEvent(new MouseEvent('pointermove', { clientX, clientY }));
}
function up() {
  window.dispatchEvent(new MouseEvent('pointerup'));
}

describe('the limits of the drag', () => {
  it('keeps the right panel between 250 and 800 px, growing when the pointer goes left', () => {
    expect(clampRightPanelWidth(320, 100)).toBe(420);
    expect(clampRightPanelWidth(320, -500)).toBe(250);
    expect(clampRightPanelWidth(320, 5000)).toBe(800);
  });

  it('never lets the 3D view get under 200 px', () => {
    expect(clampThreeDHeight(500, 40)).toBe(540);
    expect(clampThreeDHeight(500, -450)).toBe(200);
  });
});

describe('usePanelLayout', () => {
  it('starts from the saved layout, or from the defaults', () => {
    const saved = renderHook(() => usePanelLayout({ rightPanelWidth: 410, threeDHeight: 380 }, vi.fn()));
    expect(saved.result.current.rightPanelWidth).toBe(410);
    expect(saved.result.current.threeDHeight).toBe(380);
    const fresh = renderHook(() => usePanelLayout(undefined, vi.fn()));
    expect(fresh.result.current.rightPanelWidth).toBe(320);
    expect(fresh.result.current.threeDHeight).toBeUndefined();
  });

  it('drags the right panel and saves the width once, when the pointer is released', () => {
    const update = vi.fn();
    const layout = { rightPanelWidth: 320, pointsTableHeight: 99 };
    const { result } = renderHook(() => usePanelLayout(layout, update));
    act(() => result.current.beginResizeRightPanel(1000));
    expect(document.body.classList.contains('select-none')).toBe(true);
    act(() => move(900, 0));
    expect(result.current.rightPanelWidth).toBe(420);
    act(() => move(400, 0));
    expect(result.current.rightPanelWidth).toBe(800);
    expect(update).not.toHaveBeenCalled();
    act(() => up());
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ uiLayout: { rightPanelWidth: 800, pointsTableHeight: 99 } });
    expect(document.body.classList.contains('select-none')).toBe(false);
    expect(result.current.isResizingRightPanel).toBe(false);
  });

  it('a pointer that was not pressed on the handle moves nothing and saves nothing', () => {
    const update = vi.fn();
    const { result } = renderHook(() => usePanelLayout({ rightPanelWidth: 320 }, update));
    act(() => move(10, 10));
    expect(result.current.rightPanelWidth).toBe(320);
    expect(result.current.threeDHeight).toBeUndefined();
    act(() => up());
    expect(update).not.toHaveBeenCalled();
  });

  it('drags the 3D view from its current height and saves its height when released', () => {
    const update = vi.fn();
    const { result } = renderHook(() => usePanelLayout({ rightPanelWidth: 330 }, update));
    act(() => result.current.beginResizeThreeD(500, 100));
    act(() => move(0, 160));
    expect(result.current.threeDHeight).toBe(560);
    act(() => move(0, -1000));
    expect(result.current.threeDHeight).toBe(200);
    act(() => move(0, 220));
    act(() => up());
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ uiLayout: { rightPanelWidth: 330, threeDHeight: 620 } });
    // a second release without a new press saves nothing
    act(() => up());
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('stops listening when it is removed', () => {
    const update = vi.fn();
    const { result, unmount } = renderHook(() => usePanelLayout(undefined, update));
    act(() => result.current.beginResizeThreeD(300, 0));
    unmount();
    up();
    expect(update).not.toHaveBeenCalled();
  });
});
