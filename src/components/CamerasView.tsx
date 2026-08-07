import { useState } from 'react';
import { useHydraStore } from '../store';
import { Video, Maximize2, Minimize2, Camera as CameraIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function CamerasView() {
  const { robots } = useHydraStore();
  const [fullScreenId, setFullScreenId] = useState<number | null>(null);

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Video className="text-sky-400" size={20} /> Octal Vision Matrix
        </h2>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono">
            Hailo-8 AI: 26 TOPS
          </div>
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono hidden sm:block">
            USB3 Hubs: GL3523
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 pb-4">
        <div className={cn("grid h-full", fullScreenId ? "grid-cols-1 gap-0" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2")}>
          {robots.map((r, i) => {
            if (fullScreenId && fullScreenId !== r.id) return null;
            return (
            <div key={r.id} className={cn("bg-slate-900 border border-slate-800 flex flex-col relative group h-full transition-all", fullScreenId ? "rounded-none border-0" : "rounded-lg overflow-hidden")}>
              <div className="flex items-center justify-between p-2 border-b border-slate-800 bg-slate-900/80 shrink-0 w-full z-10">
                <span className="text-[11px] font-medium text-slate-200">Cam {i + 1} - {r.name}</span>
                <button 
                  onClick={() => setFullScreenId(fullScreenId === r.id ? null : r.id)} 
                  className="text-slate-500 hover:text-slate-300"
                >
                  {fullScreenId === r.id ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
              </div>
              
              <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center relative">
              {r.online ? (
                <>
                  {r.tool.includes('Camera') ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                      <CameraIcon size={32} className="mb-1 opacity-50" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold">Active Stream</span>
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1.5 text-[9px] font-mono text-emerald-500 bg-slate-900/80 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> REC
                      </div>
                      <div className="absolute bottom-1.5 right-1.5 text-[9px] font-mono text-sky-400">
                        YOLOv8
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-600 text-[10px] text-center px-4">
                      No Camera<br/>Installed
                    </div>
                  )}
                </>
              ) : (
                <div className="text-slate-700 text-[10px] font-medium uppercase tracking-widest">
                  Signal Lost
                </div>
              )}
            </div>
          </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
