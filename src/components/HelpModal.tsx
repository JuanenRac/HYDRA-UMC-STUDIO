// =============================================================================
// HYDRA-UMC STUDIO - React Component: HelpModal.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Rocket, Bot, Route, LayoutGrid, Video, Cpu, ShieldCheck, Boxes, ListChecks, Search } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TOPICS, type Level } from '../assistant/knowledge';
import { localeOf, normalize } from '../assistant/engine';
import { setPrefs, usePrefs } from '../assistant/prefs';
import { speechAvailable } from '../assistant/speech';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TABS = [
  { key: 'guides', icon: ListChecks },
  { key: 'start', icon: Rocket },
  { key: 'robots', icon: Bot },
  { key: 'trajectories', icon: Route },
  { key: 'modules', icon: LayoutGrid },
  { key: 'cameras_gamepad', icon: Video },
  { key: 'firmware_settings', icon: Cpu },
  { key: 'accounts_access', icon: ShieldCheck },
  { key: 'ecosystem', icon: Boxes },
] as const;

type TabKey = typeof TABS[number]['key'];
const LEVELS: ReadonlyArray<Level | 'all'> = ['all', 'basic', 'advanced', 'technical'];
const LOCALES = ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt'] as const;

/**
 * Centered, tabbed Help window explaining how HYDRA-UMC STUDIO works. Besides the tabs that describe each part of the app there is a "Step-by-step guides" tab: one guide per task, with a
 * level (basic, advanced, technical), a search box and a button that goes to the screen where the task is done. The same guides are what the assistant walks a person through.
 * All the text is translated (see locales/*.json's "help" namespace and assistant/knowledge.ts) and follows the app's own language setting.
 */
export function HelpModal({ onClose, initialTab, initialTopic, onGo }: { onClose: () => void; initialTab?: string; initialTopic?: string; onGo?: (view: string) => void }) {
  const { t, i18n } = useTranslation();
  const prefs = usePrefs();
  const [tab, setTab] = useState<TabKey>(initialTopic ? 'guides' : TABS.some(item => item.key === initialTab) ? initialTab as TabKey : 'start');
  const [level, setLevel] = useState<Level | 'all'>('all');
  const [search, setSearch] = useState('');
  const [openGuide, setOpenGuide] = useState<string | null>(initialTopic ?? null);
  const index = Math.max(0, LOCALES.indexOf(localeOf(i18n.language)));

  const guides = useMemo(() => {
    const wanted = normalize(search);
    return TOPICS.filter(topic => (level === 'all' || topic.level === level)
      && (!wanted || normalize(`${topic.q[index]} ${topic.a[index]} ${topic.kw[index]}`).includes(wanted)));
  }, [level, search, index]);

  const heading = tab === 'guides' ? t('help.guides.heading') : t(`help.tabs.${tab}.heading`);
  const paragraphs = tab === 'guides' ? [] : t(`help.tabs.${tab}.paragraphs`, { returnObjects: true }) as string[];

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[900px] max-w-full overflow-hidden flex flex-col h-[620px]">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <HelpCircle className="text-sky-400" size={20} /> {t('help.title', 'Help')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1" aria-label={t('dashboard.close', 'Close')}>
            &times;
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 bg-slate-950 border-r border-slate-800 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
            {TABS.map(({ key, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'px-4 py-3 text-sm font-semibold text-left transition-colors flex items-center gap-2',
                  tab === key ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-400 hover:bg-slate-900'
                )}
              >
                <Icon size={16} className="shrink-0" />
                <span>{key === 'guides' ? t('help.guides.label') : t(`help.tabs.${key}.label`)}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-900">
            <h3 className="text-base font-bold text-slate-100 mb-4">{heading}</h3>
            {tab === 'guides' ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-400 leading-relaxed">{t('help.guides.intro')}</p>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('help.guides.search')} aria-label={t('help.guides.search')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-400" />
                  </div>
                  {LEVELS.map(item => (
                    <button key={item} onClick={() => setLevel(item)} aria-pressed={level === item}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-colors', level === item ? 'bg-sky-500 text-slate-950 border-sky-400' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600')}>
                      {t(`help.guides.level_${item}`)}
                    </button>
                  ))}
                </div>

                {guides.length === 0 && <p className="text-sm text-slate-500 italic">{t('help.guides.none')}</p>}
                {guides.map(topic => {
                  const isOpen = openGuide === topic.id;
                  return (
                    <div key={topic.id} className="bg-slate-950 border border-slate-800 rounded-xl">
                      <button onClick={() => setOpenGuide(isOpen ? null : topic.id)} aria-expanded={isOpen} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
                        <span className="text-sm font-semibold text-slate-200">{topic.q[index]}</span>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-sky-400 shrink-0">{t(`help.guides.level_${topic.level}`)}</span>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 space-y-3">
                          <ol className="space-y-2">
                            {topic.a[index]!.split('\n').map((step, i) => (
                              <li key={i} className="text-sm text-slate-300 leading-relaxed">{step}</li>
                            ))}
                          </ol>
                          {onGo && (
                            <button onClick={() => { onGo(topic.view); onClose(); }} className="px-4 py-1.5 text-xs bg-sky-500 text-slate-950 font-bold rounded border border-sky-400 uppercase">
                              {t('help.guides.go')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('help.guides.assistant_heading')}</h4>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={prefs.assistant} onChange={e => setPrefs({ assistant: e.target.checked })} /> {t('help.guides.assistant_show')}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={prefs.assistantAutoOpen} onChange={e => setPrefs({ assistantAutoOpen: e.target.checked })} /> {t('help.guides.assistant_auto')}
                  </label>
                  {speechAvailable() && (
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" checked={prefs.assistantSpeak} onChange={e => setPrefs({ assistantSpeak: e.target.checked })} /> {t('help.guides.assistant_speak')}
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    {t('help.guides.assistant_size')}
                    <select value={prefs.assistantSize} onChange={e => setPrefs({ assistantSize: e.target.value as 'small' | 'normal' | 'large' })} className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-sm text-slate-200 outline-none focus:border-sky-400">
                      <option value="small">{t('help.guides.size_small')}</option>
                      <option value="normal">{t('help.guides.size_normal')}</option>
                      <option value="large">{t('help.guides.size_large')}</option>
                    </select>
                  </label>
                  <button onClick={() => setPrefs({ assistantX: null, assistantY: null, assistantPinned: false })} className="px-3 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-slate-300 hover:border-sky-500">
                    {t('help.guides.assistant_reset')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.isArray(paragraphs) && paragraphs.map((p, i) => (
                  <p key={i} className="text-sm text-slate-300 leading-relaxed">{p}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950 shrink-0">
          <button onClick={onClose} className="px-6 py-2 text-sm bg-sky-500 text-slate-950 font-bold rounded transition-colors shadow-[0_0_15px_rgba(0,229,255,0.6)] border border-sky-400 hover:shadow-[0_0_20px_rgba(0,229,255,0.8)] uppercase">
            {t('dashboard.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}
