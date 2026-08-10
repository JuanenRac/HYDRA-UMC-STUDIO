import { useState } from 'react';
import { useHydraStore, type RackConfig } from '../store';
import { RotateCcw, Layers, MapPin, CheckSquare, Square, Settings2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cnm(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function RackConfigView() {
  const { robots, updateRobot } = useHydraStore();
  const [selectedRobotId, setSelectedRobotId] = useState<number>(1);
  const selectedRobot = robots.find(r => r.id === selectedRobotId);

  if (!selectedRobot) return null;

  const config = selectedRobot.rackSystem;
  
  const handleToggleSystem = () => {
    updateRobot(selectedRobotId, {
      rackSystem: {
        ...config,
        enabled: !config.enabled
      }
    });
  };

  const updateRack = (rackId: 'rack1' | 'rack2', updates: Partial<RackConfig>) => {
    updateRobot(selectedRobotId, {
      rackSystem: {
        ...config,
        [rackId]: { ...config[rackId], ...updates }
      }
    });
  };

  const handlePosUpdate = (rackId: 'rack1' | 'rack2', field: string, value: number) => {
    updateRack(rackId, {
      basePickupPos: { ...config[rackId].basePickupPos, [field]: value }
    });
  };

  const toggleSlot = (rackId: 'rack1' | 'rack2', index: number) => {
    const rack = config[rackId];
    const newSlots = [...rack.usableSlots];
    newSlots[index] = !newSlots[index];
    updateRack(rackId, { usableSlots: newSlots });
  };

  const renderRack = (rackId: 'rack1' | 'rack2', title: string) => {
    const rack = config[rackId];
    
  const handleReset = () => {
    updateRobot(selectedRobot.id, {
      rackSystem: {
        enabled: true,
        rack1: {
          type: 'Input',
          capacity: 24,
          usableSlots: Array(24).fill(true),
          basePickupPos: { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, tx: 0, ty: 0 },
          renderPos: { x: 300, y: 150 },
          renderRot: 0,
          renderScale: 1
        },
        rack2: {
          type: 'Output',
          capacity: 24,
          usableSlots: Array(24).fill(true),
          basePickupPos: { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, tx: 0, ty: 0 },
          renderPos: { x: -300, y: 150 },
          renderRot: 0,
          renderScale: 1
        }
      }
    });
  };

  return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-3 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-200">{title}</h3>
          <div className="flex items-center gap-2">
        {config.enabled && (
          <button onClick={handleReset} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-sm flex items-center gap-2 transition-colors">
            <RotateCcw size={16} /> Reset
          </button>
        )}
        <select 
            value={rack.type}
            onChange={(e) => updateRack(rackId, { type: e.target.value as any })}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-sky-500 outline-none"
          >
            <option value="None">Disabled</option>
            <option value="Input">Input Rack</option>
            <option value="Output">Output Rack</option>
          </select>
      </div>
        </div>
        
        {rack.type !== 'None' && (
          <div className="p-4 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Capacity (Plates)</label>
                <span className="text-xs font-mono text-sky-400">{rack.capacity}</span>
              </div>
              <input 
                type="range" min="1" max="24" 
                value={rack.capacity}
                onChange={(e) => updateRack(rackId, { capacity: Number(e.target.value) })}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Usable Slots Config</label>
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: rack.capacity }).map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => toggleSlot(rackId, i)}
                    className={cnm("flex flex-col items-center justify-center p-2 rounded border transition-colors", rack.usableSlots[i] ? "bg-sky-500/10 border-sky-500/30 text-sky-400" : "bg-slate-950 border-slate-800 text-slate-600 hover:text-slate-400")}
                  >
                    <span className="text-[10px] font-mono mb-1">{i + 1}</span>
                    {rack.usableSlots[i] ? <CheckSquare size={14} /> : <Square size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/50">
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><MapPin size={14}/> Base Pickup Position</label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {['j1', 'j2', 'j3', 'j4', 'j5', 'j6'].map(f => (
                  <div key={f}>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">{f.toUpperCase()} (°)</label>
                    <input type="number" value={(rack.basePickupPos as any)[f] || 0} onChange={(e) => handlePosUpdate(rackId, f, Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono focus:border-sky-500 outline-none" />
                  </div>
                ))}
              </div>
              {selectedRobot.hasXYTable && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/50">
                  {['tx', 'ty'].map(f => (
                    <div key={f}>
                      <label className="block text-[9px] font-bold text-amber-500/80 uppercase">Table {f.replace('t', '').toUpperCase()} (mm)</label>
                      <input type="number" value={(rack.basePickupPos as any)[f] || 0} onChange={(e) => handlePosUpdate(rackId, f, Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono focus:border-amber-500 outline-none" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4 overflow-y-auto pr-2 pb-10">
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-2 sticky top-0 bg-slate-950/90 py-2 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="text-rose-400" size={20} /> Rack
          </h2>
          <select 
            className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 min-h-[36px] text-sm font-medium text-slate-200 focus:outline-none focus:border-sky-500"
            value={selectedRobotId}
            onChange={(e) => setSelectedRobotId(Number(e.target.value))}
          >
            {robots.map(r => (
              <option key={r.id} value={r.id}>{r.name} - {r.role}</option>
            ))}
          </select>
        </div>
        
        
      </div>

      {config.enabled ? (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-end mb-4">
            <button 
              onClick={handleToggleSystem}
              className="text-[10px] text-rose-400 hover:text-rose-300 uppercase tracking-wider font-semibold"
            >
              Remove Rack
            </button>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {renderRack('rack1', 'Rack 1 (Default Input)')}
          {renderRack('rack2', 'Rack 2 (Default Output)')}
        </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 flex flex-col items-center justify-center text-center flex-1">
          <Layers className="text-slate-600 mb-3" size={48} />
          <h3 className="text-slate-200 font-medium mb-2">No Rack Assigned</h3>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            This robot does not currently have a Rack configured. Add one to enable 
            input and output buffers.
          </p>
          <button 
            onClick={handleToggleSystem}
            className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/50 text-rose-400 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Layers size={16} /> Enable Rack
          </button>
        </div>
      )}
    </div>
  );
}
