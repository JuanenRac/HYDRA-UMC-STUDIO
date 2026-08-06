import { useState, useEffect } from 'react';
import { useHydraStore } from '../store';
import { Crosshair, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Save, Maximize2, Plus } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Cylinder } from '@react-three/drei';

function XYTableVisualizer({ xyTable }: { xyTable: any }) {
  // Convert mm to meters for visualization and scale 4x
  const VISUAL_SCALE = 4;
  const width = (xyTable.tableSize.width / 1000) * VISUAL_SCALE;
  const length = (xyTable.tableSize.length / 1000) * VISUAL_SCALE;
  
  // Position is clamped to table bounds for visual safety
  const px = (Math.max(0, Math.min(xyTable.pos.x, xyTable.tableSize.width)) / 1000) * VISUAL_SCALE;
  const py = (Math.max(0, Math.min(xyTable.pos.y, xyTable.tableSize.length)) / 1000) * VISUAL_SCALE;
  
  return (
    <group position={[-width/2, 0, -length/2]}>
      {/* Table Bed */}
      <Box args={[width, 0.02, length]} position={[width/2, -0.01, length/2]} material-color="#1e293b" castShadow receiveShadow />
      
      {/* X/Y Axes indicators (Origin 0,0) */}
      <Box args={[width, 0.01, 0.01]} position={[width/2, 0.01, 0]} material-color="#ef4444" /> {/* X - Red */}
      <Box args={[0.01, 0.01, length]} position={[0, 0.01, length/2]} material-color="#22c55e" /> {/* Y - Green */}

      {/* Target Pointer */}
      <group position={[px, 0.05, py]}>
        <Cylinder args={[0.01, 0, 0.05]} position={[0, -0.025, 0]} material-color="#eab308" />
        <Cylinder args={[0.002, 0.002, 1]} position={[0, -0.5, 0]} material-color="#eab308" material-transparent material-opacity={0.3} />
      </group>
      
      <Grid 
        renderOrder={-1} 
        position={[width/2, 0, length/2]} 
        infiniteGrid 
        cellSize={0.05} 
        cellThickness={0.5} 
        sectionSize={0.5} 
        sectionThickness={1} 
        sectionColor="#334155" 
        fadeDistance={3} 
      />
    </group>
  );
}

export function XYTableConfig() {
  const { robots, updateRobot } = useHydraStore();
  const [selectedRobotId, setSelectedRobotId] = useState<number>(robots[0]?.id || 1);
  const [jogStep, setJogStep] = useState<number>(10);

  const selectedRobot = robots.find(r => r.id === selectedRobotId);
  const xyTable = selectedRobot?.xyTable;

  useEffect(() => {
    if (!selectedRobot && robots.length > 0) {
      setSelectedRobotId(robots[0].id);
    }
  }, [robots, selectedRobot]);

  const handleJog = (axis: 'x' | 'y', direction: number) => {
    if (!selectedRobot || !selectedRobot.hasXYTable || !xyTable) return;
    
    let newPos = xyTable.pos[axis] + (direction * jogStep);
    // Clamp to table size
    if (axis === 'x') newPos = Math.max(0, Math.min(newPos, xyTable.tableSize.width));
    if (axis === 'y') newPos = Math.max(0, Math.min(newPos, xyTable.tableSize.length));
    
    updateRobot(selectedRobot.id, {
      xyTable: { ...xyTable, pos: { ...xyTable.pos, [axis]: newPos } }
    });
  };

  const handleSizeChange = (axis: 'width' | 'length', value: number) => {
    if (!selectedRobot || !selectedRobot.hasXYTable || !xyTable) return;
    updateRobot(selectedRobot.id, {
      xyTable: { ...xyTable, tableSize: { ...xyTable.tableSize, [axis]: value } }
    });
  };

  const handleAddTable = () => {
    if (!selectedRobot) return;
    updateRobot(selectedRobot.id, { hasXYTable: true });
  };

  if (!selectedRobot) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Crosshair className="text-amber-400" size={20} /> XY Table Configuration
        </h2>
        <select 
          className="bg-slate-900 border border-slate-700 rounded px-3 py-2 min-h-[40px] text-sm font-medium text-slate-200 focus:outline-none focus:border-amber-500"
          value={selectedRobotId}
          onChange={(e) => setSelectedRobotId(Number(e.target.value))}
        >
          {robots.map(r => (
            <option key={r.id} value={r.id}>{r.name} - {r.role}</option>
          ))}
        </select>
      </div>

      {!selectedRobot.hasXYTable ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 flex flex-col items-center justify-center text-center">
          <Crosshair className="text-slate-600 mb-3" size={48} />
          <h3 className="text-slate-200 font-medium mb-2">No XY Table Assigned</h3>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            This robot does not currently have an XY table configured. Add one to enable 
            extended working area and coordinated motion.
          </p>
          <button 
            onClick={handleAddTable}
            className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/50 text-amber-400 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={16} /> Enable XY Table
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-200">Table Settings</h3>
                <button 
                  onClick={() => updateRobot(selectedRobot.id, { hasXYTable: false })}
                  className="text-[10px] text-rose-400 hover:text-rose-300 uppercase tracking-wider font-semibold"
                >
                  Remove Table
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
                      min="100" max="5000" step="10"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 min-h-[40px] text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      value={xyTable?.tableSize.width || 500}
                      onChange={(e) => handleSizeChange('width', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                      <Maximize2 size={12} className="rotate-90" /> Length (Y mm)
                    </label>
                    <input 
                      type="number"
                      min="100" max="5000" step="10"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 min-h-[40px] text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      value={xyTable?.tableSize.length || 500}
                      onChange={(e) => handleSizeChange('length', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-200">Manual Jog Control</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Step:</span>
                  <select 
                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 min-h-[36px] text-xs text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                    value={jogStep}
                    onChange={(e) => setJogStep(Number(e.target.value))}
                  >
                    <option value={0.01}>0.01 mm</option>
                    <option value={0.1}>0.1 mm</option>
                    <option value={1}>1.0 mm</option>
                    <option value={2}>2.0 mm</option>
                    <option value={5}>5.0 mm</option>
                    <option value={10}>10.0 mm</option>
                    <option value={100}>100.0 mm</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded p-3 flex flex-col items-center gap-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">X Axis</div>
                  <div className="text-lg font-mono text-amber-400">{xyTable?.pos.x.toFixed(2) || '0.00'}</div>
                  <div className="flex gap-2 mt-1 w-full justify-center">
                    <button onClick={() => handleJog('x', -1)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded text-slate-300">
                      <ArrowLeft size={20} />
                    </button>
                    <button onClick={() => handleJog('x', 1)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded text-slate-300">
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
                
                <div className="bg-slate-950 border border-slate-800 rounded p-3 flex flex-col items-center gap-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Y Axis</div>
                  <div className="text-lg font-mono text-amber-400">{xyTable?.pos.y.toFixed(2) || '0.00'}</div>
                  <div className="flex gap-2 mt-1 w-full justify-center">
                    <button onClick={() => handleJog('y', -1)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded text-slate-300">
                      <ArrowDown size={20} />
                    </button>
                    <button onClick={() => handleJog('y', 1)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded text-slate-300">
                      <ArrowUp size={20} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button className="flex items-center justify-center gap-2 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded transition-colors text-xs font-medium">
                  <Save size={16} /> Save Table Calibration
                </button>
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
              <color attach="background" args={['#020617']} />
              <ambientLight intensity={0.4} />
              <directionalLight position={[2, 5, 2]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
              
              {xyTable && <XYTableVisualizer xyTable={xyTable} />}
              
              <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 + 0.1} minDistance={0.2} maxDistance={3} target={[0, 0, 0]} />
            </Canvas>
          </div>
        </div>
      )}
    </div>
  );
}
