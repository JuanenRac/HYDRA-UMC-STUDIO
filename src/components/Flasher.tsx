// =============================================================================
// HYDRA-UMC STUDIO - URTC Flasher Module: Flasher.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { useTranslation } from 'react-i18next';
import { Terminal, Cpu } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Flasher() {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] pointer-events-none" />
      
      <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
            <Cpu size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-200">Flasher</h2>
            <p className="text-xs text-slate-400">URTC Firmware Flashing Utility</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex items-center justify-center relative z-10">
        <div className="text-center text-slate-500">
          <Terminal size={48} className="mx-auto mb-4 opacity-50" />
          <p>Flasher module coming soon...</p>
        </div>
      </div>
    </div>
  );
}
