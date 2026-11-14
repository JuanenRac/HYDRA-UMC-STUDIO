// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/tourHost.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The store of the tours, the window that shows them, the switch in the preferences and the buttons of the Help that start them.
// =============================================================================
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../src/i18n';
import { HelpModal } from '../src/components/HelpModal';
import { PreferencesTab } from '../src/components/config/PreferencesTab';
import { TourHost } from '../src/tour/TourHost';
import { TOUR_DEFAULTS, TOUR_PREFS_KEY, getTourPrefs, resetTourPrefs, setTourPrefs } from '../src/tour/tourPrefs';
import { getActiveTour, startTour, stepTour, stopTour } from '../src/tour/tourStore';

const part = (name: string, box = { left: 20, top: 100, width: 200, height: 60 }): HTMLElement => {
  const element = document.createElement('div');
  element.setAttribute('data-tour', name);
  element.getBoundingClientRect = () => ({ ...box, right: box.left + box.width, bottom: box.top + box.height, x: box.left, y: box.top, toJSON: () => ({}) });
  document.body.appendChild(element);
  return element;
};

beforeEach(() => { window.localStorage.removeItem(TOUR_PREFS_KEY); resetTourPrefs(); stopTour(); });
afterEach(() => { cleanup(); stopTour(); resetTourPrefs(); document.body.innerHTML = ''; });

describe('the switch of the tours', () => {
  it('is on by default, keeps a choice in this browser only and ignores a value that is not valid', () => {
    expect(getTourPrefs()).toEqual(TOUR_DEFAULTS);
    setTourPrefs({ tours: 'yes' as never });
    expect(getTourPrefs().tours).toBe(true);
    setTourPrefs({ tours: false });
    expect(getTourPrefs().tours).toBe(false);
    expect(window.localStorage.getItem(TOUR_PREFS_KEY)).toContain('false');
    resetTourPrefs();
    expect(getTourPrefs().tours).toBe(true);
  });

  it('is a checkbox of the preferences', () => {
    render(<PreferencesTab />);
    const box = screen.getByTestId('prefs-tours') as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    expect(getTourPrefs().tours).toBe(false);
    expect((screen.getByTestId('prefs-tours') as HTMLInputElement).checked).toBe(false);
  });
});

describe('the store of the tours', () => {
  it('opens a tour at its first step, moves through it and ends at the last', () => {
    expect(startTour('overview')).toBe(true);
    expect(getActiveTour()).toEqual({ id: 'overview', index: 0 });
    stepTour(-1);
    expect(getActiveTour()?.index).toBe(0);
    stepTour(1);
    expect(getActiveTour()?.index).toBe(1);
    stepTour(1);
    expect(getActiveTour()).toBeNull();
  });

  it('opens nothing for a tour that does not exist or when the tours are switched off', () => {
    expect(startTour('nope')).toBe(false);
    expect(getActiveTour()).toBeNull();
    setTourPrefs({ tours: false });
    expect(startTour('welcome')).toBe(false);
    expect(getActiveTour()).toBeNull();
    stepTour(1);
    stopTour();
    expect(getActiveTour()).toBeNull();
  });
});

describe('TourHost', () => {
  it('shows nothing while no tour is open', () => {
    render(<TourHost view="overview" setView={() => {}} />);
    expect(screen.queryByTestId('tour-card')).toBeNull();
  });

  it('lights up the part of a step, shows its words and moves with the buttons and the keyboard', async () => {
    part('nav-overview');
    part('stage', { left: 300, top: 80, width: 800, height: 600 });
    render(<TourHost view="overview" setView={() => {}} />);
    act(() => { startTour('overview'); });
    expect(screen.getByTestId('tour-card')).toBeTruthy();
    expect(screen.getByRole('dialog').textContent).toContain('Overview');
    await waitFor(() => expect(screen.getByTestId('tour-spot')).toBeTruthy());
    expect((screen.getByTestId('tour-back') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId('tour-next'));
    expect(getActiveTour()?.index).toBe(1);
    expect(screen.getByTestId('tour-next').textContent).toBe('Finish');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(getActiveTour()?.index).toBe(0);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.click(screen.getByTestId('tour-next'));
    expect(getActiveTour()).toBeNull();
    expect(screen.queryByTestId('tour-card')).toBeNull();
  });

  it('closes with Esc and with Skip', () => {
    render(<TourHost view="overview" setView={() => {}} />);
    act(() => { startTour('welcome'); });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(getActiveTour()).toBeNull();
    act(() => { startTour('welcome'); });
    fireEvent.click(screen.getByTestId('tour-skip'));
    expect(getActiveTour()).toBeNull();
  });

  it('says so when the lit part is not on the screen, and still shows the words', async () => {
    render(<TourHost view="overview" setView={() => {}} />);
    act(() => { startTour('overview'); });
    await waitFor(() => expect(screen.getByTestId('tour-missing')).toBeTruthy(), { timeout: 4000 });
    expect(screen.getByRole('dialog').textContent).toContain('Click here to come back to the overview');
  });

  it('opens by itself the screen a step belongs to', () => {
    const setView = vi.fn();
    render(<TourHost view="robot" setView={setView} />);
    act(() => { startTour('cameras'); });
    expect(setView).toHaveBeenCalledWith('cameras');
  });

  it('closes at once when the tours are switched off, and the tick "do not offer" does the same and turns them off', () => {
    render(<TourHost view="overview" setView={() => {}} />);
    act(() => { startTour('welcome'); });
    act(() => { setTourPrefs({ tours: false }); });
    expect(screen.queryByTestId('tour-card')).toBeNull();
    expect(getActiveTour()).toBeNull();
    resetTourPrefs();
    act(() => { startTour('welcome'); });
    fireEvent.click(screen.getByTestId('tour-never'));
    expect(getTourPrefs().tours).toBe(false);
    expect(getActiveTour()).toBeNull();
  });
});

describe('the buttons of the Help', () => {
  it('start the welcome tour or the tour of the screen and close the Help', () => {
    const onClose = vi.fn();
    render(<HelpModal onClose={onClose} onStartTour={startTour} screenTour="cameras" />);
    fireEvent.click(screen.getByTestId('help-start-screen-tour'));
    expect(onClose).toHaveBeenCalled();
    expect(getActiveTour()).toEqual({ id: 'cameras', index: 0 });
    stopTour();
    fireEvent.click(screen.getByTestId('help-start-tour'));
    expect(getActiveTour()).toEqual({ id: 'welcome', index: 0 });
  });

  it('show no tour button when there is no tour for the screen, when nobody listens or when the tours are off', () => {
    const { rerender } = render(<HelpModal onClose={() => {}} onStartTour={startTour} />);
    expect(screen.getByTestId('help-start-tour')).toBeTruthy();
    expect(screen.queryByTestId('help-start-screen-tour')).toBeNull();
    rerender(<HelpModal onClose={() => {}} />);
    expect(screen.queryByTestId('help-start-tour')).toBeNull();
    act(() => { setTourPrefs({ tours: false }); });
    rerender(<HelpModal onClose={() => {}} onStartTour={startTour} screenTour="cameras" />);
    expect(screen.queryByTestId('help-start-tour')).toBeNull();
    expect(screen.queryByTestId('help-start-screen-tour')).toBeNull();
  });
});
