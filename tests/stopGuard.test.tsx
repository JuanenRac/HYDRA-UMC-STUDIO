// @vitest-environment jsdom
// The floating STOP appears only while no marked STOP can be pressed. What covers what in a real page is checked in a browser (tools/check_stop_visible.mjs).
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STOP_GUARD_INTERVAL_MS, StopGuard, isPressable } from '../src/components/StopGuard';

vi.mock('../src/components/StopAll', () => ({ StopAllButton: ({ variant }: { variant: string }) => <button data-testid={`stop-${variant}`}>STOP</button> }));

const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;

function marked(box: DOMRect): HTMLButtonElement {
  const button = document.createElement('button');
  button.setAttribute('data-stop-global', '');
  button.getBoundingClientRect = () => box;
  document.body.appendChild(button);
  return button;
}

describe('StopGuard', () => {
  let onTop: Element | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    document.elementFromPoint = () => onTop;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    document.body.innerHTML = '';
    delete (document as { elementFromPoint?: unknown }).elementFromPoint;
  });

  it('is not pressable when empty, outside the window or covered', () => {
    const button = marked(rect(10, 10, 100, 40));
    onTop = button;
    expect(isPressable(button)).toBe(true);
    onTop = document.body;
    expect(isPressable(button)).toBe(false);
    onTop = null;
    expect(isPressable(button)).toBe(false);
    const outside = marked(rect(window.innerWidth - 10, 10, 100, 40));
    onTop = outside;
    expect(isPressable(outside)).toBe(false);
    const empty = marked(rect(0, 0, 0, 0));
    onTop = empty;
    expect(isPressable(empty)).toBe(false);
  });

  it('draws its own STOP while the others are covered and takes it away when one can be pressed again', () => {
    const button = marked(rect(10, 10, 100, 40));
    onTop = button;
    render(<StopGuard />);
    expect(screen.queryByTestId('stop-floating')).toBeNull();
    onTop = document.body;
    act(() => { vi.advanceTimersByTime(STOP_GUARD_INTERVAL_MS); });
    expect(screen.getByTestId('stop-floating')).toBeTruthy();
    onTop = button;
    act(() => { vi.advanceTimersByTime(STOP_GUARD_INTERVAL_MS); });
    expect(screen.queryByTestId('stop-floating')).toBeNull();
  });

  it('draws it when the screen has no STOP at all', () => {
    onTop = null;
    render(<StopGuard />);
    expect(screen.getByTestId('stop-floating')).toBeTruthy();
  });
});
