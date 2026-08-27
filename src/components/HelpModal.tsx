// =============================================================================
// HYDRA-UMC STUDIO - React Component: HelpModal.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Rocket, Bot, Route, LayoutGrid, Video, Cpu, ShieldCheck } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TABS = [
  { key: 'start', icon: Rocket },
  { key: 'robots', icon: Bot },
  { key: 'trajectories', icon: Route },
  { key: 'modules', icon: LayoutGrid },
  { key: 'cameras_gamepad', icon: Video },
  { key: 'firmware_settings', icon: Cpu },
  { key: 'accounts_access', icon: ShieldCheck },
] as const;

type TabKey = typeof TABS[number]['key'];

/**
 * Centered, tabbed Help window explaining how HYDRA-UMC STUDIO works - content is fully
 * translated (see locales/*.json's "help" namespace) and follows the app's own language
 * setting, same as everything else.
 */
export function HelpModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('start');

  const heading = t(`help.tabs.${tab}.heading`);
  const paragraphs = t(`help.tabs.${tab}.paragraphs`, { returnObjects: true }) as string[];

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[900px] max-w-full overflow-hidden flex flex-col h-[620px]">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <HelpCircle className="text-sky-400" size={20} /> {t('help.title', 'Help')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
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
                <span>{t(`help.tabs.${key}.label`)}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-900">
            <h3 className="text-base font-bold text-slate-100 mb-4">{heading}</h3>
            <div className="space-y-4">
              {Array.isArray(paragraphs) && paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-slate-300 leading-relaxed">{p}</p>
              ))}
            </div>
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
