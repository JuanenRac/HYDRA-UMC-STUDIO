// =============================================================================
// HYDRA-UMC STUDIO - React Component: JuanenPnPConfig.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { useState } from 'react';
import { useHydraStore } from '../store';
import { RotateCcw, Cpu, Maximize2, Plus } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Box } from '@react-three/drei';
import { Shared3DEnvironment } from './3d/Shared3DEnvironment';
import SharedModule3DView from './3d/SharedModule3DView';



/**
 * Executes the  juanen pn p config logic. 
 * This function handles the necessary computations and state updates.
 */
export function JuanenPnPConfig() {
  const { robots, updateRobot } = useHydraStore();
  const [selectedRobotId, setSelectedRobotId] = useState<number>(1);
  const selectedRobot = robots.find(r => r.id === selectedRobotId);

  if (!selectedRobot) return null;

  const moduleData = selectedRobot.juanenPnP as any;
  const isEnabled = moduleData?.enabled || false;

  const handleToggle = () => {
    updateRobot(selectedRobot.id, {
      juanenPnP: { ...moduleData, enabled: !isEnabled }
    } as any);
  };

  const handleSizeChange = (axis: 'width' | 'length', value: number) => {
    updateRobot(selectedRobot.id, {
      juanenPnP: { ...moduleData, size: { ...moduleData.size, [axis]: value } }
    } as any);
  };



  
  const handleReset = () => {
    updateRobot(selectedRobot.id, {
      juanenPnP: { enabled: true, size: { width: 500, length: 500 }, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 }
    } as any);
  };
  
  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Cpu className="text-sky-400" size={20} /> JuanenPnP
        </h2>
        <div className="flex items-center gap-2">
          {isEnabled && (
            <button onClick={handleReset} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-sm flex items-center gap-2 transition-colors">
              <RotateCcw size={16} /> Reset
            </button>
          )}
          <select 
          className="bg-slate-900 border border-slate-700 rounded px-3 py-2 min-h-[40px] text-sm font-medium text-slate-200 focus:outline-none focus:border-sky-500"
          value={selectedRobotId}
          onChange={(e) => setSelectedRobotId(Number(e.target.value))}
        >
          {robots.map(r => (
            <option key={r.id} value={r.id}>{r.name} - {r.role}</option>
          ))}
        </select>
        </div>
      </div>

      {!isEnabled ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 flex flex-col items-center justify-center text-center flex-1">
          <Cpu className="text-slate-600 mb-3" size={48} />
          <h3 className="text-slate-200 font-medium mb-2">No JuanenPnP Assigned</h3>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            This robot does not currently have this module configured. Add one to enable its features.
          </p>
          <button 
            onClick={handleToggle}
            className="flex items-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/50 text-sky-400 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={16} /> Enable JuanenPnP
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
          <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-200">Module Settings</h3>
                <button 
                  onClick={handleToggle}
                  className="text-[10px] text-rose-400 hover:text-rose-300 uppercase tracking-wider font-semibold"
                >
                  Remove Module
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                      <Maximize2 size={12} /> Width (X mm)
                    </label>
                    <input 
                      type="number"
                      min="10" max="5000" step="10"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 min-h-[40px] text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                      value={moduleData?.size?.width || 500}
                      onChange={(e) => handleSizeChange('width', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                      <Maximize2 size={12} className="rotate-90" /> Length (Y mm)
                    </label>
                    <input 
                      type="number"
                      min="10" max="5000" step="10"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 min-h-[40px] text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                      value={moduleData?.size?.length || 500}
                      onChange={(e) => handleSizeChange('length', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>



          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden relative h-[400px] md:h-auto min-h-[400px]">
            <div className="absolute top-3 left-3 z-10 pointer-events-none">
              <span className="bg-slate-950/80 backdrop-blur text-slate-300 text-[10px] px-2 py-1 rounded border border-slate-800">
                3D Live View
              </span>
            </div>
            <Canvas camera={{ position: [0.6, 0.6, 0.6], fov: 50 }} shadows className="w-full h-full outline-none">
              <Shared3DEnvironment />
              
              {moduleData && <SharedModule3DView module={moduleData} type="juanenPnP" />}
              
              <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 + 0.1} minDistance={0.2} maxDistance={3} target={[0, 0, 0]} />
            </Canvas>
          </div>
        </div>
      )}
    </div>
  );
}
