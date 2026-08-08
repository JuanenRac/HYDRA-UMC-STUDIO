import { useState } from 'react';
import { useHydraStore } from '../store';
import { Video, Maximize2, Minimize2, Camera as CameraIcon, Power, ScanLine } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function CamerasView() {
  const { cameras, updateCamera } = useHydraStore();
  const [fullScreenId, setFullScreenId] = useState<number | null>(null);

  const toggleConnection = (id: number) => {
    const cam = cameras.find(c => c.id === id);
    if (cam) {
      updateCamera(id, { connected: !cam.connected, yoloEnabled: false });
    }
  };

  const toggleYolo = (id: number) => {
    const cam = cameras.find(c => c.id === id);
    if (cam && cam.connected) {
      updateCamera(id, { yoloEnabled: !cam.yoloEnabled });
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Video className="text-emerald-400" size={20} /> <span className="glow-text-emerald">Octal Vision Matrix</span>
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
        <div className={cn("grid h-full", fullScreenId ? "grid-cols-1 gap-0" : "grid-cols-2 lg:grid-cols-4 grid-rows-4 lg:grid-rows-2 gap-2")}>
          {cameras.map((c, i) => {
            if (fullScreenId && fullScreenId !== c.id) return null;
            
            return (
            <div key={c.id} className={cn("bg-slate-900 border border-slate-700 hover:glow-border-sky flex flex-col relative group h-full transition-all duration-300", fullScreenId ? "rounded-none border-0" : "rounded-lg overflow-hidden shadow-lg")}>
              <div className="flex flex-col gap-2 p-2 border-b border-slate-800 bg-slate-900/80 shrink-0 w-full z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-200">Cam {i + 1}</span>
                    {c.connected && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LIVE</span>
                    )}
                    {c.yoloEnabled && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">YOLOv8</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                  <button onClick={() => toggleConnection(c.id)} className={cn("p-1.5 rounded transition-colors", c.connected ? "text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 glow-border-emerald" : "text-slate-500 hover:text-emerald-400 border border-transparent")}>
                    <Power size={14} />
                  </button>
                  <button onClick={() => toggleYolo(c.id)} disabled={!c.connected} className={cn("p-1.5 rounded transition-colors disabled:opacity-50", c.yoloEnabled ? "text-sky-400 hover:text-sky-300 bg-sky-500/10 border border-sky-500/30 glow-border-sky" : "text-slate-500 hover:text-sky-400 border border-transparent")}>
                    <ScanLine size={14} />
                  </button>
                  <button 
                    onClick={() => setFullScreenId(fullScreenId === c.id ? null : c.id)} 
                    className="p-1.5 text-slate-500 hover:text-slate-300 rounded border border-transparent hover:glow-border-sky"
                  >
                    {fullScreenId === c.id ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                </div>
                </div>
                <div className="w-full">
                  <select 
                    value={c.type} 
                    onChange={(e) => updateCamera(c.id, { type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-200 focus:border-sky-400 focus:glow-border-sky outline-none transition-all"
                  >
                    <option value="USB Vision Camera">USB Vision Camera</option>
                    <option value="Thermal (MLX90640)">Thermal (MLX90640)</option>
                    <option value="Thermal (MLX90641)">Thermal (MLX90641)</option>
                    <option value="Thermal (MLX90642)">Thermal (MLX90642)</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center relative p-2 overflow-hidden bg-slate-950">
                {c.connected ? (
                  <>
                    <div className="w-full h-full border border-slate-800 rounded bg-black/40 flex items-center justify-center relative overflow-hidden">
                      <CameraIcon size={32} className="text-slate-800" />
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-900/10 via-transparent to-transparent opacity-50" />
                      
                      {/* Grid overlay */}
                      <div className="absolute inset-0 bg-electric-grid opacity-30 mix-blend-screen" />
                      
                      {/* Yolo Bounding boxes mock */}
                      {c.yoloEnabled && c.detections.map((det, idx) => (
                        <div 
                          key={idx} 
                          className="absolute border border-emerald-400 glow-border-emerald bg-emerald-500/10"
                          style={{ left: `${det.box.x}%`, top: `${det.box.y}%`, width: `${det.box.w}%`, height: `${det.box.h}%` }}
                        >
                          <span className="absolute -top-4 left-0 bg-emerald-500 text-slate-950 text-[8px] font-bold px-1 py-0.5 rounded-sm whitespace-nowrap">
                            {det.label} {(det.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}

                      {c.yoloEnabled && c.detections.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sky-400/50 text-[10px] font-mono animate-pulse">Running Inference...</span>
                        </div>
                      )}

                      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] font-mono text-emerald-400/70">1080p 60fps</span>
                        <div className="flex items-center gap-1 text-[9px] text-emerald-400/70 font-mono">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> REC
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full border border-slate-800/50 border-dashed rounded flex flex-col items-center justify-center gap-2 text-slate-600 bg-slate-950/50">
                    <Video size={24} />
                    <span className="text-xs font-mono">NO SIGNAL</span>
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
