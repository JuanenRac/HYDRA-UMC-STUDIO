// =============================================================================
// HYDRA-UMC STUDIO - the size of the panels of a robot screen: usePanelLayout.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The width of the right-hand panel and the height of the 3D view can be dragged; the new size is kept in the settings
// (`uiLayout`) when the pointer is released. This was written inside RobotDetail.tsx; it lives here so it can be tested
// on its own. The limits are the same as before: the panel is 250..800 px wide and the 3D view is at least 200 px high.
// =============================================================================
import { useEffect, useRef, useState } from 'react';

export interface UiLayout {
  rightPanelWidth?: number;
  threeDHeight?: number;
  [key: string]: unknown;
}

export const RIGHT_PANEL_MIN = 250;
export const RIGHT_PANEL_MAX = 800;
export const RIGHT_PANEL_DEFAULT = 320;
export const THREE_D_MIN_HEIGHT = 200;

/** The width the right panel takes when it is dragged by `dx` pixels (leftwards is positive) from `start`. */
export function clampRightPanelWidth(start: number, dx: number): number {
  return Math.max(RIGHT_PANEL_MIN, Math.min(RIGHT_PANEL_MAX, start + dx));
}

/** The height of the 3D view when its bottom edge is dragged by `dy` pixels (downwards is positive) from `start`. */
export function clampThreeDHeight(start: number, dy: number): number {
  return Math.max(THREE_D_MIN_HEIGHT, start + dy);
}

export function usePanelLayout(uiLayout: UiLayout | undefined, updateSettings: (patch: { uiLayout: UiLayout }) => void) {
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(uiLayout?.rightPanelWidth || RIGHT_PANEL_DEFAULT);
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false);
  const rightPanelResizeStartRef = useRef({ width: 0, x: 0 });
  const rightPanelWidthRef = useRef(rightPanelWidth);
  const uiLayoutRef = useRef(uiLayout);

  const [threeDHeight, setThreeDHeight] = useState<number | undefined>(uiLayout?.threeDHeight);
  const dragRef = useRef(false);
  const startDragY = useRef(0);
  const startHeight = useRef(0);
  const currentHeightRef = useRef(threeDHeight);

  useEffect(() => {
    rightPanelWidthRef.current = rightPanelWidth;
    uiLayoutRef.current = uiLayout;
  }, [rightPanelWidth, uiLayout]);

  useEffect(() => {
    currentHeightRef.current = threeDHeight;
  }, [threeDHeight]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (isResizingRightPanel) {
        setRightPanelWidth(clampRightPanelWidth(rightPanelResizeStartRef.current.width, rightPanelResizeStartRef.current.x - e.clientX));
      }
    };
    const handleUp = () => {
      document.body.classList.remove('select-none');
      setIsResizingRightPanel(false);
      updateSettings({ uiLayout: { ...uiLayoutRef.current, rightPanelWidth: rightPanelWidthRef.current } });
    };
    if (isResizingRightPanel) {
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isResizingRightPanel, updateSettings]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      setThreeDHeight(clampThreeDHeight(startHeight.current, e.clientY - startDragY.current));
    };
    const handleUp = () => {
      if (dragRef.current) {
        document.body.classList.remove('select-none');
        dragRef.current = false;
        if (currentHeightRef.current) {
          updateSettings({ uiLayout: { ...uiLayoutRef.current, threeDHeight: currentHeightRef.current } });
        }
      }
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [updateSettings]);

  /** The pointer went down on the handle of the right panel. */
  const beginResizeRightPanel = (clientX: number) => {
    document.body.classList.add('select-none');
    setIsResizingRightPanel(true);
    rightPanelResizeStartRef.current = { width: rightPanelWidth, x: clientX };
  };

  /** The pointer went down on the bottom handle of the 3D view, whose current height is `currentHeight`. */
  const beginResizeThreeD = (currentHeight: number, clientY: number) => {
    document.body.classList.add('select-none');
    dragRef.current = true;
    startHeight.current = currentHeight;
    startDragY.current = clientY;
  };

  return { rightPanelWidth, isResizingRightPanel, beginResizeRightPanel, threeDHeight, beginResizeThreeD };
}
