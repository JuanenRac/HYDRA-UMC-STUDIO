/**
 * The assistant: a small animated mascot ("Hydri") that floats in a corner of the work area and says, in a bubble, what the screen the person is in is for. It can walk through a task step
 * by step, answer a question typed in words (in any of the eight languages, with no server and no model), read the answer aloud, be dragged anywhere and pinned there, and be put away.
 * It never covers the work: the bubble can be closed and the mascot itself can be put away until the next screen.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setPrefs, usePrefs } from './prefs';
import { placeBubble, type Side } from './placement';
import { answer as answerQuestion, localeOf, suggestions, type Answer } from './engine';
import { TOPICS, type Topic } from './knowledge';
import { speak, speechAvailable, stopSpeech } from './speech';
import { HELP_TABS, helpTabOf, paragraphsOfTab } from './helpTabs';
import './assistant.css';

const SCALE = { small: 0.8, normal: 1, large: 1.35 } as const;
const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));
const LOCALES = ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt'] as const;

export function Mascot({ talking, speaking = false, scale = 1 }: { talking: boolean; speaking?: boolean; scale?: number }) {
  return (
    <svg className={`mascot ${talking ? 'talking' : ''} ${speaking ? 'speaking' : ''}`} viewBox="0 0 64 72" width={Math.round(56 * scale)} height={Math.round(63 * scale)} aria-hidden="true" focusable="false">
      <path className="mascot-antenna" d="M32 14 L32 6 M24 15 L16 7 M40 15 L48 7" />
      <circle className="mascot-bulb b" cx="32" cy="4" r="3" />
      <circle className="mascot-bulb g" cx="15" cy="6" r="3" />
      <circle className="mascot-bulb r" cx="49" cy="6" r="3" />
      <rect className="mascot-head" x="10" y="14" width="44" height="34" rx="12" />
      <rect className="mascot-visor" x="16" y="22" width="32" height="16" rx="8" />
      <circle className="mascot-eye" cx="25" cy="30" r="3.2" />
      <circle className="mascot-eye" cx="39" cy="30" r="3.2" />
      <path className="mascot-mouth" d="M26 43 Q32 47 38 43" />
      <g className="mascot-speak"><g className="mascot-speak-open"><ellipse cx="32" cy="44" rx="6" ry="4.2" /></g></g>
      <rect className="mascot-body" x="18" y="50" width="28" height="16" rx="7" />
      <circle className="mascot-core" cx="32" cy="58" r="3" />
    </svg>
  );
}

type Props = {
  /** The id of the Dashboard tab the person is in. */
  view: string;
  go: (view: string) => void;
  openHelp: (tab?: string, topic?: string) => void;
  openSettings: () => void;
};

export function Assistant({ view, go, openHelp, openSettings }: Props) {
  const { t, i18n } = useTranslation();
  const language = localeOf(i18n.language);
  const prefs = usePrefs();
  const [away, setAway] = useState<ReadonlySet<string>>(new Set());   // the screens where the person put the mascot away
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState(0);
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState<{ asked: string; answer: Answer } | null>(null);
  const [guide, setGuide] = useState<{ topic: Topic; step: number } | null>(null);
  const [seed, setSeed] = useState(0);
  const [live, setLive] = useState<{ left: number; top: number } | null>(null);   // while it is being dragged
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [speaking, setSpeaking] = useState(false);
  const [bubbleAt, setBubbleAt] = useState<{ side: Side; dx: number; dy: number; arrow: number } | null>(null);
  const [, setViewportTick] = useState(0);
  const hidden = away.has(view);
  const free = prefs.assistantX !== null && prefs.assistantY !== null;
  const index = Math.max(0, LOCALES.indexOf(language));

  useEffect(() => { setOpen(prefs.assistantAutoOpen); setTip(0); setReply(null); setGuide(null); }, [view, prefs.assistantAutoOpen]);
  useEffect(() => { const again = () => setViewportTick(value => value + 1); window.addEventListener('resize', again); return () => window.removeEventListener('resize', again); }, []);

  const scale = SCALE[prefs.assistantSize];
  const mascotWidth = Math.round(56 * scale), mascotHeight = Math.round(63 * scale);
  const maxLeft = () => Math.max(0, window.innerWidth - Math.round(70 * scale));
  const maxTop = () => Math.max(0, window.innerHeight - Math.round(90 * scale));
  const place = (left: number, top: number) => { setPrefs({ assistantX: clamp(left, 0, maxLeft()) / window.innerWidth, assistantY: clamp(top, 0, maxTop()) / window.innerHeight }); };
  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (prefs.assistantPinned) return;
    const box = (event.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    drag.current = { x: event.clientX, y: event.clientY, left: box.left, top: box.top, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.x, dy = event.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    d.moved = true;
    setLive({ left: clamp(d.left + dx, 0, maxLeft()), top: clamp(d.top + dy, 0, maxTop()) });
  };
  const endDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    dragged.current = true;   // the click that follows a drag is not a click
    place(d.left + event.clientX - d.x, d.top + event.clientY - d.y);
    setLive(null);
  };
  const arrow = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = ({ ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] } as Record<string, number[]>)[event.key];
    if (!step || prefs.assistantPinned) return;
    event.preventDefault();
    const box = (event.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    place(box.left + step[0]!, box.top + step[1]!);
  };

  const kept = free ? { left: clamp(prefs.assistantX! * window.innerWidth, 0, maxLeft()), top: clamp(prefs.assistantY! * window.innerHeight, 0, maxTop()) } : null;
  const corner = { left: Math.max(0, window.innerWidth - 18 - mascotWidth), top: Math.max(0, window.innerHeight - 52 - mascotHeight) };
  const where = live ?? kept ?? corner;

  // the bubble opens where it fits: right, left, below, above or on a diagonal of the mascot, never outside the window (it is measured, then placed)
  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (!open || !bubble) { setBubbleAt(null); return; }
    const measure = () => {
      const size = { width: bubble.offsetWidth, height: bubble.offsetHeight };
      const mascot = { left: where.left, top: where.top, width: mascotWidth, height: mascotHeight };
      const placed = placeBubble(mascot, size, { width: window.innerWidth, height: window.innerHeight });
      const along = placed.side === 'above' || placed.side === 'below' ? mascotWidth / 2 - placed.dx : mascotHeight / 2 - placed.dy;
      const length = placed.side === 'above' || placed.side === 'below' ? size.width : size.height;
      setBubbleAt(current => current && current.side === placed.side && current.dx === placed.dx && current.dy === placed.dy ? current : { ...placed, arrow: clamp(along - 6, 12, Math.max(12, length - 24)) });
    };
    measure();
    const watcher = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    watcher?.observe(bubble);
    return () => watcher?.disconnect();
  }, [open, where.left, where.top, mascotWidth, mascotHeight, reply, guide, tip]);

  const tab = helpTabOf(view);
  const paragraphs = paragraphsOfTab(t, tab);
  const text = paragraphs.length > 0 ? paragraphs[tip % paragraphs.length]! : t('assistant.hello');
  const short = text.length > 330 ? `${text.slice(0, 327)}…` : text;
  const heading = t(`help.tabs.${tab}.label`);

  const topicText = (topic: Topic): string => topic.a[index] ?? topic.a[0];
  const steps = guide ? topicText(guide.topic).split('\n') : [];
  const replyText = (item: Answer): string => item.kind === 'topic' || item.kind === 'help' ? item.text : item.kind === 'hello' ? t('assistant.hi') : item.kind === 'thanks' ? t('assistant.thanks') : t('assistant.none');

  // what the bubble says now, to be read aloud when the person asked for it
  const sayNow = !prefs.assistant || !open ? '' : guide ? steps[guide.step] ?? '' : reply ? replyText(reply.answer) : `${heading}. ${short}`;
  const speakOn = prefs.assistantSpeak && !hidden && speechAvailable();
  useEffect(() => {
    if (!speakOn || !sayNow) { stopSpeech(); setSpeaking(false); return; }
    speak(sayNow, language, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) });
    return () => { stopSpeech(); setSpeaking(false); };
  }, [speakOn, sayNow, language]);

  if (!prefs.assistant) return null;
  const style = { left: where.left, top: where.top, width: mascotWidth, height: mascotHeight };
  const classes = `${free || live ? 'free' : ''} ${live ? 'dragging' : ''} ${prefs.assistantPinned ? 'pinned' : ''}`;
  const examples = suggestions(language, 3, seed);

  const ask = (value: string) => {
    const asked = value.trim();
    if (!asked) return;
    setQuestion('');
    setSeed(current => current + 1);
    setGuide(null);
    setReply({ asked, answer: answerQuestion(asked, language, HELP_TABS, key => paragraphsOfTab(t, key)) });
  };
  const showTopic = (topic: Topic) => { setGuide(null); setReply({ asked: topic.q[index] ?? topic.q[0], answer: { kind: 'topic', topic, text: topicText(topic), others: [] } }); };
  const goTo = (target: string) => { if (target === 'settings') openSettings(); else go(target); };
  const targetTopic = reply?.answer.kind === 'topic' ? reply.answer.topic : null;
  const here = TOPICS.filter(item => item.view === view);

  if (hidden) {
    return <button type="button" className={`assistant-call ${classes}`} style={style} onClick={() => setAway(current => { const next = new Set(current); next.delete(view); return next; })} title={t('assistant.call')} aria-label={t('assistant.call')}><Mascot talking={false} scale={scale} /></button>;
  }

  return (
    <div className={`assistant ${classes}`} style={style} role="complementary" aria-label={t('assistant.name')}>
      <button type="button" className="assistant-mascot" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={arrow}
        onClick={() => { if (dragged.current) { dragged.current = false; return; } setOpen(value => !value); }}
        title={prefs.assistantPinned ? (open ? t('assistant.quiet') : t('assistant.call')) : `${open ? t('assistant.quiet') : t('assistant.call')} · ${t('assistant.drag_hint')}`} aria-label={prefs.assistantPinned ? (open ? t('assistant.quiet') : t('assistant.call')) : `${open ? t('assistant.quiet') : t('assistant.call')} · ${t('assistant.drag_hint')}`} aria-expanded={open}>
        <Mascot talking={open && !prefs.assistantSpeak} speaking={speaking} scale={scale} />
      </button>
      {open && (
        <div ref={bubbleRef} className={`assistant-bubble side-${bubbleAt?.side ?? 'right'}`} role="status" style={bubbleAt ? { left: bubbleAt.dx, top: bubbleAt.dy, '--arrow': `${bubbleAt.arrow}px` } as React.CSSProperties : { visibility: 'hidden' }}>
          {guide ? (
            <>
              <strong>{guide.topic.q[index]}</strong>
              <small className="assistant-asked">{t('assistant.step_of', { step: guide.step + 1, total: steps.length })}</small>
              <p>{steps[guide.step]}</p>
              <div className="assistant-actions">
                <button type="button" disabled={guide.step === 0} onClick={() => setGuide({ ...guide, step: guide.step - 1 })}>{t('assistant.prev')}</button>
                {guide.step < steps.length - 1
                  ? <button type="button" className="primary" onClick={() => setGuide({ ...guide, step: guide.step + 1 })}>{t('assistant.next')}</button>
                  : <button type="button" className="primary" onClick={() => setGuide(null)}>{t('assistant.done')}</button>}
                {guide.topic.view !== view && <button type="button" onClick={() => goTo(guide.topic.view)}>{t('assistant.goto')}</button>}
              </div>
            </>
          ) : reply ? (
            <>
              <small className="assistant-asked">{t('assistant.you')}: {reply.asked}</small>
              {reply.answer.kind === 'topic' && <strong>{reply.answer.topic.q[index]}</strong>}
              {reply.answer.kind === 'help' && <strong>{t(`help.tabs.${reply.answer.view}.label`)}</strong>}
              <p>{replyText(reply.answer)}</p>
              {(reply.answer.kind === 'none' || reply.answer.kind === 'hello' || reply.answer.kind === 'thanks') && <div className="assistant-chips">{examples.map(example => <button key={example} type="button" onClick={() => ask(example)}>{example}</button>)}</div>}
              {reply.answer.kind === 'topic' && reply.answer.others.length > 0 && <div className="assistant-chips"><small>{t('assistant.see_also')}</small>{reply.answer.others.map(other => <button key={other.id} type="button" onClick={() => showTopic(other)}>{other.q[index]}</button>)}</div>}
              <div className="assistant-actions">
                {targetTopic && <button type="button" className="primary" onClick={() => setGuide({ topic: targetTopic, step: 0 })}>{t('assistant.show')}</button>}
                {targetTopic && targetTopic.view !== view && <button type="button" onClick={() => goTo(targetTopic.view)}>{t('assistant.goto')}</button>}
                <button type="button" onClick={() => openHelp(reply.answer.kind === 'help' ? reply.answer.view : undefined, targetTopic?.id)}>{t('assistant.help')}</button>
                <button type="button" onClick={() => setReply(null)}>{t('assistant.back')}</button>
              </div>
            </>
          ) : (
            <>
              <strong>{heading}</strong>
              <p>{short}</p>
              <div className="assistant-actions">
                {here[0] && <button type="button" className="primary" onClick={() => setGuide({ topic: here[0]!, step: 0 })}>{t('assistant.show')}</button>}
                {paragraphs.length > 1 && <button type="button" onClick={() => setTip(value => value + 1)}>{t('assistant.more')} ({(tip % paragraphs.length) + 1}/{paragraphs.length})</button>}
                <button type="button" onClick={() => openHelp(tab)}>{t('assistant.help')}</button>
                <button type="button" onClick={() => setAway(current => new Set(current).add(view))}>{t('assistant.hide')}</button>
              </div>
              <div className="assistant-chips"><small>{t('assistant.try')}</small>{examples.map(example => <button key={example} type="button" onClick={() => ask(example)}>{example}</button>)}</div>
            </>
          )}
          <div className="assistant-corner">
            {speechAvailable() && (
              <button type="button" className={prefs.assistantSpeak ? 'on' : ''} aria-pressed={prefs.assistantSpeak} title={prefs.assistantSpeak ? t('assistant.speak_on') : t('assistant.speak_off')} aria-label={prefs.assistantSpeak ? t('assistant.speak_on') : t('assistant.speak_off')}
                onClick={() => { if (prefs.assistantSpeak) { stopSpeech(); setSpeaking(false); } setPrefs({ assistantSpeak: !prefs.assistantSpeak }); }}>{prefs.assistantSpeak ? '🔊' : '🔇'}</button>
            )}
            <button type="button" className={prefs.assistantPinned ? 'on' : ''} aria-pressed={prefs.assistantPinned} title={prefs.assistantPinned ? t('assistant.unpin') : t('assistant.pin')} aria-label={prefs.assistantPinned ? t('assistant.unpin') : t('assistant.pin')}
              onClick={() => { if (!prefs.assistantPinned && !free) { const box = document.querySelector<HTMLElement>('.assistant')?.getBoundingClientRect(); if (box) place(box.left, box.top); } setPrefs({ assistantPinned: !prefs.assistantPinned }); }}>📌</button>
            {(free || prefs.assistantPinned) && <button type="button" title={t('assistant.home')} aria-label={t('assistant.home')} onClick={() => setPrefs({ assistantX: null, assistantY: null, assistantPinned: false })}>↩</button>}
          </div>
          <form className="assistant-ask" onSubmit={event => { event.preventDefault(); ask(question); }}>
            <input value={question} onChange={event => setQuestion(event.target.value)} placeholder={t('assistant.ask_ph')} aria-label={t('assistant.ask_ph')} maxLength={200} />
            <button type="submit" className="primary" disabled={!question.trim()}>{t('assistant.ask_send')}</button>
          </form>
        </div>
      )}
    </div>
  );
}
