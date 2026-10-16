// =============================================================================
// HYDRA-UMC STUDIO - tests/assistant.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The assistant answers in words with no server and no model, so what it knows has to be checked: every task has all 8 languages, every sample question finds its own task in its own
// language, a question in another language than the interface's still finds the task, the steps are numbered lines, and the bubble placement never leaves the window.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { TOPICS } from '../src/assistant/knowledge';
import { answer, localeOf, normalize, rankTopics, suggestions } from '../src/assistant/engine';
import { placeBubble } from '../src/assistant/placement';
import { HELP_TABS, helpTabOf } from '../src/assistant/helpTabs';
import { speakable } from '../src/assistant/speech';

const NO_HELP = () => [] as string[];

describe('assistant knowledge', () => {
  it('has unique ids and every task is complete in all 8 languages', () => {
    expect(new Set(TOPICS.map(topic => topic.id)).size).toBe(TOPICS.length);
    for (const topic of TOPICS) {
      for (const list of [topic.kw, topic.q, topic.a]) {
        expect(list.length, topic.id).toBe(8);
        for (const text of list) expect(text.trim().length, topic.id).toBeGreaterThan(5);
      }
    }
  });

  it('writes the steps of every language as numbered lines, the same number in every language', () => {
    for (const topic of TOPICS) {
      const counts = topic.a.map(text => text.split('\n').length);
      expect(new Set(counts).size, `${topic.id}: ${counts.join(',')}`).toBe(1);
      for (const text of topic.a) for (const [i, line] of text.split('\n').entries()) expect(line.startsWith(`${i + 1}.`), `${topic.id}: ${line.slice(0, 30)}`).toBe(true);
    }
  });

  it('every sample question finds its own task, in each of the 8 languages', () => {
    const wrong: string[] = [];
    for (const topic of TOPICS) {
      topic.q.forEach((question, index) => {
        const best = rankTopics(question)[0];
        if (!best || best.topic.id !== topic.id) wrong.push(`${topic.id}[${index}] "${question}" -> ${best?.topic.id}`);
      });
    }
    expect(wrong).toEqual([]);
  });

  it('answers in the language of the interface even when the question was asked in another', () => {
    const spanishQuestion = TOPICS.find(topic => topic.id === 'estop')!.q[1];
    const reply = answer(spanishQuestion, 'de', HELP_TABS, NO_HELP);
    expect(reply.kind).toBe('topic');
    if (reply.kind === 'topic') expect(reply.text).toBe(reply.topic.a[2]);
  });

  it('says plainly when it found nothing, and answers greetings', () => {
    expect(answer('zzzz qqqq', 'en', HELP_TABS, NO_HELP).kind).toBe('none');
    expect(answer('hola', 'es', HELP_TABS, NO_HELP).kind).toBe('hello');
    expect(answer('obrigado', 'pt', HELP_TABS, NO_HELP).kind).toBe('thanks');
  });

  it('falls back to the paragraphs of the Help', () => {
    const paragraphs = (view: string) => (view === 'modules' ? ['The Vacuum Table controls the pump and valve state and monitors the pressure for hold-down work with suction cups.'] : []);
    const reply = answer('suction cups hold-down', 'en', HELP_TABS, paragraphs);
    expect(reply.kind).toBe('help');
  });

  it('normalises accents, case and punctuation', () => {
    expect(normalize('¿Cómo MUEVO el Robô?')).toBe('como muevo el robo');
    expect(localeOf('pt-BR')).toBe('pt');
    expect(localeOf('xx')).toBe('en');
    expect(suggestions('pt', 3, 1)).toHaveLength(3);
  });

  it('maps every screen to a Help tab that exists', () => {
    for (const view of ['overview', 'robot', 'cameras', 'cameraMedia', 'flasher', 'tester', 'adminServer', 'adminClients', 'ecosystemServices', 'systemSupervisor', 'settings', 'whatever']) {
      expect(HELP_TABS).toContain(helpTabOf(view));
    }
  });

  it('reads steps without their numbers', () => {
    expect(speakable('1. Open Config.\n2. Press Save.')).toBe('Open Config.. Press Save.');
  });
});

describe('assistant bubble placement', () => {
  it('keeps the whole bubble inside the window wherever the mascot is', () => {
    const viewport = { width: 1366, height: 768 };
    const bubble = { width: 340, height: 300 };
    for (const [left, top] of [[0, 0], [1300, 0], [0, 700], [1300, 700], [600, 300], [1300, 380]]) {
      const placed = placeBubble({ left: left!, top: top!, width: 56, height: 63 }, bubble, viewport);
      const x = left! + placed.dx, y = top! + placed.dy;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + bubble.width).toBeLessThanOrEqual(viewport.width);
      expect(y + bubble.height).toBeLessThanOrEqual(viewport.height);
    }
  });
});
