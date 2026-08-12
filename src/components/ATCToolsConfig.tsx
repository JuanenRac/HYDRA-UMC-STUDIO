import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { useHydraStore, type ATCGrid, type ToolType, type ATCConfig } from '../store';
import { RotateCcw, Settings, Grid3X3, CircleDashed, MapPin, ChevronDown, ChevronUp, Save, Upload, Server } from 'lucide-react';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cnm(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const URTC_TOOLS: ToolType[] = [
  'None',
  'Soldering Station (T12)',
  'SMT Solder Paste Dispenser',
  'Thermal Paste / Liquid Dispenser',
  'Smart Electric Screwdriver',
  'Vacuum / Pneumatic Gripper',
  'Drill (BL4260)',
  'Gimbal Gripper',
  'NEMA Gripper',
  'AOI (Automated Optical Inspection) System',
  'Engraving Laser Diode (10W optical)',
  '3D Printing Hotend',
  '3D Scanner Probe',
  'SMT Pick & Place Head',
  'Heavy-Duty Electromagnet',
  'Spot Welder Head',
  'Conformal Coating Airbrush',
  'Large-Format Vacuum Gripper',
  'Functional Testing Head',
  'UV Curing Head',
  'Hot Air Rework Nozzle',
  'Pneumatic Press-Fit Inserter',
  'Wire Harnessing / Crimping Actuator',
  'PCB Advanced Inspection',
  'Solder Paste Jetting Valve',
  'Ultrasonic Welder / Packaging Sealer'
];

const defaultAtcConfig: ATCConfig = {
  type: 'vertical_panel',
  panelGrid: '2x2',
  revolverSlots: 8,
  tools: []
};

export function ATCToolsConfig() {
  const { t } = useTranslation();
  const { robots, updateRobot } = useHydraStore();
  const [selectedRobotId, setSelectedRobotId] = useState<number>(robots[0]?.id || 1);
  const [editingSlot, setEditingSlot] = useState<number | 'revolver' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedRobot = robots.find(r => r.id === selectedRobotId);
  
  useEffect(() => {
    if (!selectedRobot && robots.length > 0) {
      setSelectedRobotId(robots[0].id);
    }
  }, [robots, selectedRobot]);

  if (!selectedRobot) return null;

  const atcConfig = selectedRobot.atc;

  const updateAtcConfig = (updates: Partial<ATCConfig>) => {
    if (!atcConfig) return;
    updateRobot(selectedRobot.id, {
      atc: { ...atcConfig, ...updates }
    });
  };

  const enableATC = () => {
    updateRobot(selectedRobot.id, { atc: { ...defaultAtcConfig } });
  };

  const disableATC = () => {
    updateRobot(selectedRobot.id, { atc: undefined });
  };

  if (!atcConfig) {
    
  const handleReset = () => {
    updateRobot(selectedRobot.id, {
      atc: { ...defaultAtcConfig }
    });
  };

  return (
      <div className="h-full flex flex-col space-y-4">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Settings className="text-sky-400" size={20} /> {t('modules.atc_title', 'ATC Tools Configuration')}
          </h2>
          <div className="flex items-center gap-2">
        {selectedRobot.atc && (
          <button onClick={handleReset} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-sm flex items-center gap-2 transition-colors">
            <RotateCcw size={16} /> {t('modules.reset', 'Reset')}
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
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 flex flex-col items-center justify-center text-center flex-1">
          <Settings className="text-slate-600 mb-3" size={48} />
          <h3 className="text-slate-200 font-medium mb-2">{t('modules.no_module_assigned', 'No ATC Configured', { machineType: 'ATC' })}</h3>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            {t('modules.no_module_desc', 'This robot does not currently have an Automatic Tool Changer (ATC) configured. Add one to enable automated tool swapping.')}
          </p>
          <button 
            onClick={enableATC}
            className="flex items-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/50 text-sky-400 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {t('modules.enable_module', 'Enable ATC', { machineType: 'ATC' })}
          </button>
        </div>
      </div>
    );
  }

  const handleGridChange = (grid: ATCGrid) => {
    updateAtcConfig({ panelGrid: grid, tools: [] });
  };

  const handleRevolverSlotsChange = (slots: number) => {
    updateAtcConfig({ revolverSlots: slots, tools: [] });
  };

  const getSlotCount = () => {
    if (atcConfig.type === 'vertical_panel' || atcConfig.type === 'horizontal_panel') {
      const [r, c] = atcConfig.panelGrid.split('x').map(Number);
      return r * c;
    }
    return atcConfig.revolverSlots;
  };

  const slotCount = getSlotCount();

  const handleToolUpdate = (slot: number, tool: ToolType) => {
    const existing = [...atcConfig.tools];
    const idx = existing.findIndex(t => t.slot === slot);
    if (idx >= 0) {
      existing[idx].tool = tool;
    } else {
      existing.push({ slot, tool, pos: { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, tx: 0, ty: 0 } });
    }
    updateAtcConfig({ tools: existing });
  };

  const handlePosUpdate = (slot: number | 'revolver', field: string, value: number) => {
    if (slot === 'revolver') {
      const p = atcConfig.revolverPos || { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, tx: 0, ty: 0 };
      updateAtcConfig({ revolverPos: { ...p, [field]: value } });
    } else {
      const existing = [...atcConfig.tools];
      let idx = existing.findIndex(t => t.slot === slot);
      if (idx === -1) {
        existing.push({ slot, tool: 'None', pos: { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, tx: 0, ty: 0 } });
        idx = existing.length - 1;
      }
      const p = existing[idx].pos || { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, tx: 0, ty: 0 };
      existing[idx].pos = { ...p, [field]: value };
      updateAtcConfig({ tools: existing });
    }
  };

  const saveConfig = () => {
    const data = JSON.stringify(atcConfig, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atc_config_${selectedRobot.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && json.type) {
          updateAtcConfig(json);
        }
      } catch {
        console.error('Invalid ATC config file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const renderPosEditor = (slot: number | 'revolver') => {
    let pos = slot === 'revolver' ? atcConfig.revolverPos : atcConfig.tools.find(t => t.slot === slot)?.pos;
    if (!pos) pos = { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, tx: 0, ty: 0 };

    return (
      <div className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-lg">
        <div className="grid grid-cols-3 gap-2 mb-2">
          {['j1', 'j2', 'j3', 'j4', 'j5', 'j6'].map(f => (
            <div key={f}>
              <label className="block text-[9px] font-bold text-slate-500 uppercase">{f.toUpperCase()} (°)</label>
              <input type="number" value={(pos as any)[f] || 0} onChange={(e) => handlePosUpdate(slot, f, Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono focus:border-sky-500 outline-none" />
            </div>
          ))}
        </div>
        {selectedRobot.hasXYTable && (
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/50">
            {['tx', 'ty'].map(f => (
              <div key={f}>
                <label className="block text-[9px] font-bold text-amber-500/80 uppercase">Table {f.replace('t', '').toUpperCase()} (mm)</label>
                <input type="number" value={(pos as any)[f] || 0} onChange={(e) => handlePosUpdate(slot, f, Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono focus:border-amber-500 outline-none" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Settings className="text-sky-400" size={20} /> {t('modules.atc_title', 'ATC Tools Configuration')}
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
        
        <div className="flex items-center gap-2">
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={loadConfig} />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 hover:glow-border-sky border border-slate-700 transition-all text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700">
            <Upload size={14} /> {t('robot_detail.load', 'Load Config')}
          </button>
          <button onClick={saveConfig} className="flex items-center gap-2 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-semibold rounded-lg transition-colors border border-sky-500/30">
            <Save size={14} />{t('modules.save_config', 'Save Config')}</button>
          <button onClick={disableATC} className="flex items-center gap-2 px-3 py-1.5 text-rose-400 text-xs font-semibold hover:text-rose-300 ml-2">
            {t('modules.remove_module', 'Remove ATC')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left Side: Config */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex flex-col sm:flex-row gap-2 mb-6 shrink-0">
            <button
              onClick={() => updateAtcConfig({ type: 'vertical_panel' })}
              className={cnm("flex-1 py-2 sm:py-3 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 sm:gap-2", 
                atcConfig.type === 'vertical_panel' ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm" : "text-slate-400 hover:text-slate-300 hover:bg-slate-950 border border-transparent")}
            >
              <Grid3X3 size={16} /> {t('modules.vertical', 'Vertical')}
            </button>
            <button
              onClick={() => updateAtcConfig({ type: 'horizontal_panel' })}
              className={cnm("flex-1 py-2 sm:py-3 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 sm:gap-2", 
                atcConfig.type === 'horizontal_panel' ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm" : "text-slate-400 hover:text-slate-300 hover:bg-slate-950 border border-transparent")}
            >
              <Server size={16} /> {t('modules.horizontal', 'Horizontal')}
            </button>
            <button
              onClick={() => updateAtcConfig({ type: 'revolver' })}
              className={cnm("flex-1 py-2 sm:py-3 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 sm:gap-2", 
                atcConfig.type === 'revolver' ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm" : "text-slate-400 hover:text-slate-300 hover:bg-slate-950 border border-transparent")}
            >
              <CircleDashed size={16} /> {t('modules.revolver', 'Revolver')}
            </button>
          </div>

          {(atcConfig.type === 'vertical_panel' || atcConfig.type === 'horizontal_panel') ? (
            <div className="mb-6 shrink-0">
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t('modules.panel_grid_layout', 'Panel Grid Layout')}</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                value={atcConfig.panelGrid}
                onChange={(e) => handleGridChange(e.target.value as ATCGrid)}
              >
                {['1x1', '1x2', '2x1', '2x2', '2x3', '3x2', '3x3', '3x4', '4x3', '4x4'].map(g => (
                  <option key={g} value={g}>{g} Grid</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mb-6 shrink-0">
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t('modules.revolver_capacity', 'Revolver Capacity')}</label>
              <input
                type="number"
                min={1}
                max={16}
                value={atcConfig.revolverSlots}
                onChange={(e) => handleRevolverSlotsChange(Math.max(1, Math.min(16, parseInt(e.target.value) || 1)))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              />
              
              <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-slate-500" />
                    <span className="text-sm font-semibold text-slate-300">{t('modules.base_pickup_pos', 'Base Pickup Position')}</span>
                  </div>
                  <button 
                    onClick={() => setEditingSlot(editingSlot === 'revolver' ? null : 'revolver')}
                    className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    {editingSlot === 'revolver' ? <><ChevronUp size={14}/> {t('modules.hide', 'Hide')}</> : <><ChevronDown size={14}/> {t('modules.edit_pos', 'Edit Pos')}</>}
                  </button>
                </div>
                {editingSlot === 'revolver' && renderPosEditor('revolver')}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{t('modules.tool_assignments', 'Tool Assignments')}</h3>
            {Array.from({ length: slotCount }).map((_, i) => {
              const currentTool = atcConfig.tools.find(t => t.slot === i)?.tool || 'None';
              const isEditing = editingSlot === i;
              
              return (
                <div key={i} className={cnm("flex flex-col p-3 border rounded-lg transition-colors", isEditing ? "bg-slate-900 border-sky-500/30" : "bg-slate-950 border-slate-800")}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-slate-900 rounded font-mono text-xs text-slate-400">
                      {i + 1}
                    </div>
                    <select
                      className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded px-2 sm:px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                      value={currentTool}
                      onChange={(e) => handleToolUpdate(i, e.target.value as ToolType)}
                    >
                      {URTC_TOOLS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {(atcConfig.type === 'vertical_panel' || atcConfig.type === 'horizontal_panel') && (
                      <button 
                        onClick={() => setEditingSlot(isEditing ? null : i)}
                        className={cnm("shrink-0 p-2 rounded hover:bg-slate-800 transition-colors", isEditing ? "text-sky-400 bg-sky-500/10" : "text-slate-500")}
                      >
                        <MapPin size={16} />
                      </button>
                    )}
                  </div>
                  {isEditing && (atcConfig.type === 'vertical_panel' || atcConfig.type === 'horizontal_panel') && renderPosEditor(i)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Graphic Representation */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-center relative overflow-hidden min-h-[300px]">
           <ATCGraphics config={atcConfig} />
        </div>
      </div>
    </div>
  );
}

function ATCGraphics({ config }: { config: ATCConfig }) {
  if (config.type === 'vertical_panel' || config.type === 'horizontal_panel') {
    const [rows, cols] = config.panelGrid.split('x').map(Number);
    const isHorizontal = config.type === 'horizontal_panel';
    
    return (
      <div 
        className={cnm("grid gap-2 p-4 bg-slate-800 rounded-xl border-4 border-slate-700 shadow-xl", isHorizontal ? "transform rotate-0" : "")}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
        }}
      >
        {Array.from({ length: rows * cols }).map((_, i) => {
          const tool = config.tools.find(t => t.slot === i)?.tool || 'None';
          const hasTool = tool !== 'None';
          return (
            <div key={i} className={cnm("w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex flex-col items-center justify-center rounded-lg border-2 transition-all", hasTool ? "bg-sky-950 border-sky-500/50" : "bg-slate-900 border-slate-700 border-dashed")}>
              <span className="text-xs font-mono text-slate-500 mb-1">{i + 1}</span>
              {hasTool && (
                <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-sky-500/80 shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
              )}
            </div>
          );
        })}
      </div>
    );
  } else {
    // Revolver Graphic
    const slots = config.revolverSlots;
    const radius = Math.max(90, slots * 9);
    
    return (
      <div className="relative" style={{ width: radius * 2.5, height: radius * 2.5 }}>
        <div className="absolute inset-0 rounded-full border-4 border-slate-700 bg-slate-800/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-700 border-4 border-slate-600 shadow-xl" />
        </div>
        {Array.from({ length: slots }).map((_, i) => {
          const angle = (i / slots) * Math.PI * 2 - Math.PI / 2;
          const cx = Math.cos(angle) * radius;
          const cy = Math.sin(angle) * radius;
          const tool = config.tools.find(t => t.slot === i)?.tool || 'None';
          const hasTool = tool !== 'None';
          
          return (
            <div 
              key={i}
              className={cnm("absolute w-10 h-10 sm:w-12 sm:h-12 -ml-5 -mt-5 sm:-ml-6 sm:-mt-6 rounded-full flex items-center justify-center border-2 transition-all", hasTool ? "bg-sky-950 border-sky-500/50" : "bg-slate-900 border-slate-700 border-dashed")}
              style={{ left: '50%', top: '50%', transform: `translate(${cx}px, ${cy}px)` }}
            >
              <span className="text-[10px] font-mono text-slate-500 absolute -top-4">{i + 1}</span>
              {hasTool && (
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-sky-500/80 shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
              )}
            </div>
          );
        })}
      </div>
    );
  }
}
