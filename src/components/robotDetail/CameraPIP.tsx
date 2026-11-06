// =============================================================================
// HYDRA-UMC STUDIO - src/components/robotDetail/CameraPIP.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The floating picture-in-picture window of the camera of a robot over its 3D view: movable, resizable, with the
// stream of the camera. Cut out of RobotDetail.tsx unchanged.
// =============================================================================
import { useRef, useState, useEffect, useMemo } from 'react';
import { motion, useDragControls } from 'motion/react';
import { Camera as CameraIcon, X } from 'lucide-react';
import type { RobotState } from '../../store';
import { apiUrl } from '../../lib/apiBase';
import { useMediaTicket, withTicket } from '../../lib/mediaTicket';
import { useFleet, useSession, useSettingsStore } from '../../storeContexts';
import { cn } from './shared';

/**
 * Renders the  camera p i p component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const CameraPIP = ({ bot, initialX, initialY, label, t: _t }: { bot: RobotState, initialX: number, initialY: number, label: string, t: any }) => {
  const { authToken } = useSession();
  const { settings, updateSettings } = useSettingsStore();
  const { cameras } = useFleet();
  const mediaTicket = useMediaTicket(authToken);
  // Renders the real MJPEG stream (GET /api/camera/:id/stream of HYDRA-UMC-SERVER, a proxy) through a plain <img> (a browser understands
  // multipart/x-mixed-replace natively, no <video>/MSE plumbing) once a camera is assigned and connected, with the same isVisionActive gating this
  // file's top-level component uses elsewhere; before that the decorative CameraIcon shows.
  const camera = cameras.find(c => c.assignedRobotId === bot.id);
  const isStreaming = bot.visionEnabled && (camera?.connected ?? false);
  const controls = useDragControls();
  const savedPipConfig = settings.uiLayout?.cameraPips?.[bot.id];
  // Memoized so the fallback object keeps ONE stable identity across
  // renders (as long as initialX/initialY themselves don't change) instead
  // of being a brand-new object literal every render - that fresh identity
  // was making the ref-sync effect below re-run on every single render of
  // this panel, not just when the saved pip config or initialX/Y actually
  // changed.
  const defaultPipConfig = useMemo(
    () => ({ w: 192, h: 144, x: initialX, y: initialY, isOpen: true }),
    [initialX, initialY]
  );
  const pipConfig = savedPipConfig || defaultPipConfig;
  const isOpen = pipConfig.isOpen !== false;

  const [size, setSize] = useState({ w: pipConfig.w || 192, h: pipConfig.h || 144 });
  const resizeRef = useRef(false);
  const startSize = useRef({ w: 0, h: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  
  const pipConfigRef = useRef(pipConfig);
  const layoutRef = useRef(settings.uiLayout);
  const sizeRef = useRef(size);
  const settingsRef = useRef(settings);
  const updateSettingsRef = useRef(updateSettings);

  useEffect(() => {
    pipConfigRef.current = pipConfig;
    layoutRef.current = settings.uiLayout;
    settingsRef.current = settings;
    updateSettingsRef.current = updateSettings;
  }, [pipConfig, settings, updateSettings]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => {
    if (!resizeRef.current) {
      setSize({ w: pipConfig.w || 192, h: pipConfig.h || 144 });
    }
  }, [pipConfig.w, pipConfig.h]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!resizeRef.current) return;
      const newW = Math.max(160, startSize.current.w + (e.clientX - startPos.current.x));
      const newH = Math.max(120, startSize.current.h + (e.clientY - startPos.current.y));
      setSize({ w: newW, h: newH });
      sizeRef.current = { w: newW, h: newH };
    };
    const handleUp = () => {
      if (resizeRef.current) {
        document.body.classList.remove('select-none');
        resizeRef.current = false;
        // Save size on drop
        const finalSize = sizeRef.current;
        const freshSettings = settingsRef.current;
        // Reads pipConfigRef (kept fresh by the ref-sync effect above)
        // rather than closing over pipConfig directly - handleUp is
        // registered once via addEventListener and this effect only
        // re-attaches it on [bot.id, updateSettings], so a direct pipConfig
        // closure would go stale the moment settings changed without
        // bot.id/updateSettings themselves changing.
        const freshPip = freshSettings.uiLayout?.cameraPips?.[bot.id] || pipConfigRef.current;
        updateSettingsRef.current({
          uiLayout: {
            ...freshSettings.uiLayout,
            cameraPips: {
              ...freshSettings.uiLayout?.cameraPips,
              [bot.id]: { ...freshPip, w: finalSize.w, h: finalSize.h }
            }
          }
        });
      }
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [bot.id, updateSettings]);

  if (!isOpen) return null;

  return (
    <motion.div 
      drag
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      initial={{ x: pipConfig.x || initialX, y: pipConfig.y || initialY }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setSize({ w: 192, h: 144 });
        sizeRef.current = { w: 192, h: 144 };
        const freshSettings = settingsRef.current;
        const freshPip = freshSettings.uiLayout?.cameraPips?.[bot.id] || pipConfig;
        updateSettingsRef.current({
          uiLayout: {
            ...freshSettings.uiLayout,
            cameraPips: {
              ...freshSettings.uiLayout?.cameraPips,
              [bot.id]: { ...freshPip, w: 192, h: 144 }
            }
          }
        });
      }}
      onDragEnd={(e, info) => {
        const freshSettings = settingsRef.current;
        const freshPip = freshSettings.uiLayout?.cameraPips?.[bot.id] || pipConfig;
        updateSettingsRef.current({
          uiLayout: {
            ...freshSettings.uiLayout,
            cameraPips: {
              ...freshSettings.uiLayout?.cameraPips,
              [bot.id]: { 
                ...freshPip, 
                x: (freshPip.x || initialX) + info.offset.x, 
                y: (freshPip.y || initialY) + info.offset.y 
              }
            }
          }
        });
      }}
      style={{ width: size.w, height: size.h }}
      className="absolute bottom-4 right-4 bg-slate-950/80 backdrop-blur border border-slate-700 rounded-lg overflow-hidden shadow-2xl z-50 flex flex-col pointer-events-auto"
    >
      <div 
        className="bg-slate-900/90 px-2 py-1 flex justify-between items-center border-b border-slate-800 cursor-move"
        onPointerDown={(e) => {
          e.stopPropagation();
          controls.start(e);
        }}
      >
        <span className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1 truncate"><CameraIcon size={12} className="shrink-0" /> {label}</span>
        <div className="flex items-center gap-2">
          <span className={cn("shrink-0 w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.8)]", bot.online ? "bg-emerald-500" : "bg-rose-500")} />
          <button 
            onClick={(e) => {
              e.stopPropagation();
              updateSettings({
                uiLayout: {
                  ...settings.uiLayout,
                  cameraPips: {
                    ...settings.uiLayout?.cameraPips,
                    [bot.id]: { ...pipConfig, isOpen: false }
                  }
                }
              });
            }}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-black relative flex items-center justify-center pointer-events-none">
         {isStreaming && camera ? (
           <img
             src={withTicket(apiUrl(`/api/camera/${camera.id}/stream`), mediaTicket)}
             alt={`${label} camera`}
             className="absolute inset-0 w-full h-full object-cover pointer-events-none"
           />
         ) : (
           <>
             <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(transparent 50%, rgba(0,0,0,0.5) 50%)', backgroundSize: '100% 4px' }} />
             <CameraIcon size={24} className="text-slate-800 pointer-events-none" />
           </>
         )}
         {bot.playbackState?.isPlaying && (
           <div className="absolute inset-0 border-2 border-emerald-500/30 animate-pulse pointer-events-none" />
         )}
         <div className="absolute bottom-1 left-1 text-[8px] font-mono text-emerald-500/70 pointer-events-none">
           {bot.pos.tx?.toFixed(1) || 0} {bot.pos.ty?.toFixed(1) || 0}
         </div>
      </div>
      <div 
        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-20 flex items-end justify-end p-1"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          document.body.classList.add('select-none');
          resizeRef.current = true;
          startSize.current = size;
          startPos.current = { x: e.clientX, y: e.clientY };
        }}
      >
        <div className="w-2 h-2 border-r-2 border-b-2 border-slate-400 opacity-50 pointer-events-none" />
      </div>
    </motion.div>
  );
};
