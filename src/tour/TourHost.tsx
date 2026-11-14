// =============================================================================
// HYDRA-UMC STUDIO - src/tour/TourHost.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The window of the guided tours: dims the page, lights up the part a step explains with an outline, and puts a card with the words and the buttons next to
// it. It opens the screen a step belongs to by itself, waits for the part to be on the screen, follows it when the window is resized and works from the
// keyboard (arrows, Esc). A tour closes at once when the tours are switched off in the preferences.
// =============================================================================
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { stepTour, stopTour, useActiveTour } from './tourStore';
import { setTourPrefs, useTourPrefs } from './tourPrefs';
import { placeCard, stepKey, tourById, type Box } from './tours';

const READY_MS = 1800;
const PAD = 6;

/** The part of the page a step lights up, once it is on the screen (a screen that has just opened needs a moment). */
function useTarget(selector: string | undefined, key: string): { box: Box | null; searching: boolean } {
  const [state, setState] = useState<{ box: Box | null; searching: boolean }>({ box: null, searching: Boolean(selector) });
  useEffect(() => {
    if (!selector) { setState({ box: null, searching: false }); return undefined; }
    let frame = 0;
    let gaveUp = false;
    const started = Date.now();
    const measure = (): void => {
      const found = document.querySelector(`[data-tour="${selector}"]`);
      if (found) {
        const rect = found.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const box = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
          setState((current) => (current.box && !current.searching && current.box.left === box.left && current.box.top === box.top && current.box.width === box.width && current.box.height === box.height ? current : { box, searching: false }));
          return;
        }
      }
      if (Date.now() - started > READY_MS) { gaveUp = true; setState({ box: null, searching: false }); }
    };
    const loop = (): void => { measure(); if (!gaveUp) frame = window.requestAnimationFrame(loop); };
    setState({ box: null, searching: true });
    loop();
    return () => window.cancelAnimationFrame(frame);
  }, [selector, key]);
  return state;
}

export function TourHost({ view, setView }: { view: string; setView: (view: string) => void }) {
  const { t } = useTranslation();
  const active = useActiveTour();
  const prefs = useTourPrefs();
  const tour = active ? tourById(active.id) : undefined;
  const step = tour && active ? tour.steps[active.index] : undefined;
  const key = active ? `${active.id}:${active.index}` : '';
  const { box, searching } = useTarget(step?.target, key);
  const card = useRef<HTMLElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState({ width: 360, height: 240 });
  const [screen, setScreen] = useState({ width: window.innerWidth, height: window.innerHeight });

  // switched off in the preferences: the tour closes at once
  useEffect(() => { if (!prefs.tours && active) stopTour(); }, [prefs.tours, active]);
  // the screen this step belongs to opens by itself
  useEffect(() => { if (step?.view && step.view !== view) setView(step.view); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { if (card.current) setSize({ width: card.current.offsetWidth, height: card.current.offsetHeight }); }, [key, box, searching]);
  useEffect(() => {
    if (!active) return undefined;
    const resize = (): void => setScreen({ width: window.innerWidth, height: window.innerHeight });
    const keys = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') { event.preventDefault(); stopTour(); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); stepTour(1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); stepTour(-1); }
    };
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', keys, true);
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('keydown', keys, true); };
  }, [active !== null]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (active) next.current?.focus({ preventScroll: true }); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active || !tour || !step || !prefs.tours) return null;
  const last = active.index === tour.steps.length - 1;
  const placed = box ? placeCard(box, size, screen, step.placement ?? 'right') : { left: 0, top: 0, side: 'center' as const };
  const centred = !box;
  return (
    <div className="fixed inset-0 z-[100]" role="presentation" data-testid="tour-layer">
      <div className="absolute inset-0" />
      {box && <div className="absolute rounded-xl ring-2 ring-sky-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.72)] pointer-events-none" data-testid="tour-spot" style={{ left: box.left - PAD, top: box.top - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }} />}
      {!box && <div className="absolute inset-0 bg-slate-950/70 pointer-events-none" />}
      <section
        ref={card}
        className={`absolute w-[360px] max-w-[calc(100vw-24px)] bg-slate-900 border border-sky-500/60 rounded-xl shadow-2xl p-5 space-y-3 ${centred ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' : ''}`}
        style={centred ? undefined : { left: placed.left, top: placed.top }}
        role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body" tabIndex={-1} data-testid="tour-card"
      >
        <button onClick={() => stopTour()} className="absolute top-2 right-3 text-slate-400 hover:text-slate-200 text-lg leading-none" aria-label={t('tour.close')} title={t('tour.close')}>&times;</button>
        <p className="text-[10px] font-black uppercase tracking-widest text-sky-400">{t(`tour.name_${tour.id}`)} · {t('tour.step', { current: active.index + 1, total: tour.steps.length })}</p>
        <h3 id="tour-title" className="text-base font-bold text-slate-100">{t(stepKey(tour.id, active.index, 't'))}</h3>
        <p id="tour-body" className="text-sm text-slate-300 leading-relaxed">{t(stepKey(tour.id, active.index, 'b'))}</p>
        {step.target && !box && !searching && <p className="text-[11px] text-amber-400" data-testid="tour-missing">{t('tour.not_shown')}</p>}
        <div className="flex gap-1" aria-hidden="true">
          {tour.steps.map((_item, index) => <i key={index} className={`h-1.5 flex-1 rounded-full ${index === active.index ? 'bg-sky-400' : index < active.index ? 'bg-sky-700' : 'bg-slate-700'}`} />)}
        </div>
        <div className="flex justify-between gap-2">
          <button onClick={() => stepTour(-1)} disabled={active.index === 0} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40" data-testid="tour-back">{t('tour.back')}</button>
          <button ref={next} onClick={() => stepTour(1)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-500 text-slate-950 hover:bg-sky-400" data-testid="tour-next">{last ? t('tour.finish') : t('tour.next')}</button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <button onClick={() => stopTour()} className="underline hover:text-slate-200" data-testid="tour-skip">{t('tour.skip')}</button>
          <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" data-testid="tour-never" checked={false} onChange={() => { setTourPrefs({ tours: false }); stopTour(); }} /> {t('tour.never')}</label>
        </div>
        <small className="block text-[10px] text-slate-500">{t('tour.keys')}</small>
      </section>
    </div>
  );
}
