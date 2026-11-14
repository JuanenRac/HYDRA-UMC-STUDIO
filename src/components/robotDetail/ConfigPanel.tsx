// =============================================================================
// HYDRA-UMC STUDIO - src/components/robotDetail/ConfigPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// A part of the robot detail screen, cut out of RobotDetail.tsx unchanged: it draws what the screen hands it and
// changes nothing by itself.
// =============================================================================
import { Power, Droplets, Save, FolderOpen, Download } from 'lucide-react';
import { cn, isUrtcTool, URTC_TOOLS } from './shared';
import { browserStorage } from '../../lib/robotDetailHelpers';
import { saveReachTolerance } from '../../lib/reachCheck';
import { examples } from '../../examples/kinematics';
import { ROBOT_MANUFACTURERS, isModelSelectable } from '../../store';
import type { RobotState, SystemSettings } from '../../store';
import type { TFunction } from 'i18next';

interface ConfigPanelProps {
  combinedBotsInfo: RobotState[];
  handleExportGCode: () => void;
  handleSaveWorkFile: () => unknown;
  handleUploadWorkFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loadExample: (id: string) => unknown;
  loadExampleForRobot: (botId: number, exId: string) => unknown;
  loadWorkFile: (fileName: string) => unknown;
  reachTolerance: number;
  previewOn: boolean;
  setPreviewOn: (on: boolean) => void;
  rightTab: string;
  robot: RobotState;
  robots: RobotState[];
  selectedExample: string;
  selectedWorkFile: string;
  setPendingModel: (model: string | null) => void;
  setPendingTool: (tool: string | null) => void;
  setReachTolerance: (value: number) => void;
  setRightTab: (tab: any) => void;
  settings: SystemSettings;
  t: TFunction;
  togglePump: (index: number) => void;
  toggleValve: (index: number) => void;
  updateRobot: (id: number, updates: Partial<RobotState>) => void;
  uploadWorkFileRef: React.RefObject<HTMLInputElement | null>;
  workFiles: string[];
}

export function ConfigPanel(props: ConfigPanelProps) {
  const { combinedBotsInfo, handleExportGCode, handleSaveWorkFile, handleUploadWorkFile, loadExample, loadExampleForRobot, loadWorkFile, previewOn, reachTolerance, rightTab, robot, robots, selectedExample, selectedWorkFile, setPendingModel, setPendingTool, setPreviewOn, setReachTolerance, setRightTab, settings, t, togglePump, toggleValve, updateRobot, uploadWorkFileRef, workFiles } = props;
  return (
    <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-0 shrink-0 max-h-[50%]">
      <div className="flex items-center border-b border-slate-800 bg-slate-900 overflow-x-auto custom-scrollbar shrink-0">
        <button 
          onClick={() => setRightTab('trajectories')} 
          className={cn("flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors", rightTab === 'trajectories' ? "text-sky-400 border-b-2 border-sky-400 bg-slate-800" : "text-slate-400 hover:text-slate-300")}
        >
          {t('robot_detail.trajectories_tab', 'Trajectories')}
        </button>
        <button 
          onClick={() => setRightTab('config')} 
          className={cn("flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors", rightTab === 'config' ? "text-sky-400 border-b-2 border-sky-400 bg-slate-800" : "text-slate-400 hover:text-slate-300")}
        >
          {t('robot_detail.config', 'Config')}
        </button>
        <button 
          onClick={() => setRightTab('io')} 
          className={cn("flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors", rightTab === 'io' ? "text-sky-400 border-b-2 border-sky-400 bg-slate-800" : "text-slate-400 hover:text-slate-300")}
        >
          {t('robot_detail.io', 'I/O')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">
        {rightTab === 'trajectories' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2" title={t('robot_detail.reach_tolerance_hint')}>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider" htmlFor="reach-tolerance">{t('robot_detail.reach_tolerance_label')}</label>
              <input
                id="reach-tolerance" type="number" min={0} max={5000} step={1}
                value={reachTolerance}
                onChange={(e) => setReachTolerance(saveReachTolerance(browserStorage(), Number(e.target.value)))}
                className="w-20 bg-slate-950 border border-slate-800 rounded p-1 text-xs text-slate-200 outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider" title={t('trajectory_preview.switch_hint')}>
              <input type="checkbox" data-testid="preview-before-play" checked={previewOn} onChange={(e) => setPreviewOn(e.target.checked)} />
              {t('trajectory_preview.switch_label')}
            </label>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t('robot_detail.works_robot', 'Works Robot')}</label>
              <div className="flex items-center gap-2">
                <select 
                  className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none"
                  value={selectedWorkFile}
                  onChange={(e) => loadWorkFile(e.target.value)}
                  disabled={robot.playbackState?.isPlaying}
                >
                  <option value="">{t('robot_detail.select', '-- Select --')}</option>
                  {workFiles.map(file => (
                    <option key={file} value={file}>{file}</option>
                  ))}
                </select>
                <button
                  onClick={handleSaveWorkFile}
                  disabled={robot.playbackState?.isPlaying || robot.recordedPoints.length === 0}
                  className="flex items-center justify-center w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors disabled:opacity-50 shrink-0"
                  title={t('common.save', 'Save')} aria-label={t('common.save', 'Save')}
                >
                  <Save size={20} />
                </button>
                <button
                  onClick={() => uploadWorkFileRef.current?.click()}
                  disabled={robot.playbackState?.isPlaying}
                  className="flex items-center justify-center w-10 h-10 bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors disabled:opacity-50 shrink-0"
                  title={t('robot_detail.upload_trajectory', 'Open / Add')} aria-label={t('robot_detail.upload_trajectory', 'Open / Add')}
                >
                  <FolderOpen size={20} />
                </button>
                <button
                  onClick={handleExportGCode}
                  disabled={robot.recordedPoints.length === 0}
                  className="flex items-center justify-center w-10 h-10 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors disabled:opacity-50 shrink-0"
                  title={t('robot_detail.export_gcode', 'Export as G-code')} aria-label={t('robot_detail.export_gcode', 'Export as G-code')}
                >
                  <Download size={20} />
                </button>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  ref={uploadWorkFileRef}
                  onChange={handleUploadWorkFile}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t('robot_detail.examples', 'Examples')}</label>
              <select 
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none"
                value={selectedExample}
                onChange={(e) => loadExample(e.target.value)}
                disabled={robot.playbackState?.isPlaying}
              >
                <option value="">{t('robot_detail.select', '-- Select --')}</option>
                {examples.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.points.length} pts)</option>
                ))}
              </select>
            </div>
            {combinedBotsInfo.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">{t('robot_detail.combined_robots', 'Combined Robots')}</label>
                <div className="space-y-3">
                  {combinedBotsInfo.map(bot => (
                    <div key={bot.id} className="bg-slate-900/50 p-2 rounded border border-slate-800/50">
                      <div className="text-xs text-slate-300 font-medium mb-1">{bot.name} ({bot.recordedPoints.length} pts)</div>
                      <select 
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 outline-none"
                        onChange={(e) => loadExampleForRobot(bot.id, e.target.value)}
                        defaultValue=""
                        disabled={robot.playbackState?.isPlaying}
                      >
                        <option value="">{t('robot_detail.select_example', '-- Select Example --')}</option>
                        {examples.map(e => (
                          <option key={e.id} value={e.id}>{e.name} ({e.points.length} pts)</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {rightTab === 'config' && (
          <div className="space-y-6">
                  
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3 mt-4">
              <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{t('robot_detail.model_and_tools', 'Model & Tools')}</h4>
                    
              <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('robot_detail.model', 'Model')}
                {ROBOT_MANUFACTURERS[robot.model] && (
                  <span className="text-slate-500 normal-case font-normal"> &middot; {ROBOT_MANUFACTURERS[robot.model]}</span>
                )}
              </label>
              <select
                value={robot.model}
                onChange={e => setPendingModel(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none"
              >
                <optgroup label="Source Robotics">
                  {isModelSelectable("Parol6 (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="Parol6 (6-DOF)">Parol6 (6-DOF)</option>}
                  {isModelSelectable("Faze4 (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="Faze4 (6-DOF)">Faze4 (6-DOF)</option>}
                </optgroup>
                <optgroup label="Annin Robotics">
                  {isModelSelectable("AR3 (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="AR3 (6-DOF)">AR3 (6-DOF)</option>}
                  {isModelSelectable("AR4 (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="AR4 (6-DOF)">AR4 (6-DOF)</option>}
                </optgroup>
                <optgroup label="Universal Robots">
                  {isModelSelectable("UR3e (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="UR3e (6-DOF)">UR3e (6-DOF)</option>}
                  {isModelSelectable("UR5e (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="UR5e (6-DOF)">UR5e (6-DOF)</option>}
                  {isModelSelectable("UR10e (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="UR10e (6-DOF)">UR10e (6-DOF)</option>}
                  {isModelSelectable("UR16e (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="UR16e (6-DOF)">UR16e (6-DOF)</option>}
                  {isModelSelectable("UR20 (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="UR20 (6-DOF)">UR20 (6-DOF)</option>}
                  {isModelSelectable("UR3 (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="UR3 (6-DOF)">UR3 (6-DOF, classic)</option>}
                  {isModelSelectable("UR5 (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="UR5 (6-DOF)">UR5 (6-DOF, classic)</option>}
                  {isModelSelectable("UR10 (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="UR10 (6-DOF)">UR10 (6-DOF, classic)</option>}
                </optgroup>
                <optgroup label="UFACTORY">
                  {isModelSelectable("xArm6 (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="xArm6 (6-DOF)">xArm6 (6-DOF)</option>}
                  {isModelSelectable("Lite 6 (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="Lite 6 (6-DOF)">Lite 6 (6-DOF)</option>}
                </optgroup>
                <optgroup label="Comau">
                  {isModelSelectable("e.DO (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="e.DO (6-DOF)">e.DO (6-DOF)</option>}
                </optgroup>
                <optgroup label="Kinova">
                  {isModelSelectable("Gen3 Lite (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="Gen3 Lite (6-DOF)">Gen3 Lite (6-DOF)</option>}
                  {isModelSelectable("Gen2 (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="Gen2 (6-DOF)">Gen2 (6-DOF)</option>}
                </optgroup>
                <optgroup label="FANUC">
                  {isModelSelectable("M-710iC (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="M-710iC (6-DOF)">M-710iC (6-DOF)</option>}
                </optgroup>
                <optgroup label="The Robot Studio">
                  {isModelSelectable("SO-ARM100 (5-DOF)", robot.model, settings.enabledRobotModels) && <option value="SO-ARM100 (5-DOF)">SO-ARM100 (5-DOF)</option>}
                </optgroup>
                <optgroup label="AgileX">
                  {isModelSelectable("PiPER (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="PiPER (6-DOF)">PiPER (6-DOF)</option>}
                </optgroup>
                <optgroup label="Unitree">
                  {isModelSelectable("Z1 (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="Z1 (6-DOF)">Z1 (6-DOF)</option>}
                </optgroup>
                <optgroup label="Trossen Robotics">
                  {isModelSelectable("ViperX 300 (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="ViperX 300 (6-DOF)">ViperX 300 (6-DOF)</option>}
                  {isModelSelectable("WidowX 250 (6-DOF)", robot.model, settings.enabledRobotModels) && <option value="WidowX 250 (6-DOF)">WidowX 250 (6-DOF)</option>}
                </optgroup>
                <optgroup label="Koch / Low-Cost Robot Arm">
                  {isModelSelectable("Koch v1.1 (5-DOF)", robot.model, settings.enabledRobotModels) && <option value="Koch v1.1 (5-DOF)">Koch v1.1 (5-DOF)</option>}
                </optgroup>
                <optgroup label="Generic">
                  <option value="Generic (6-DOF)">Generic (6-DOF)</option>
                </optgroup>
                {settings.customModels && settings.customModels.length > 0 && (
                  <optgroup label={t('robot_detail.custom_models', 'Custom')}>
                    {settings.customModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('common.role', 'Role')}</label>
              <select 
                value={robot.role}
                onChange={e => updateRobot(robot.id, { role: e.target.value as any })}
                className="bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none"
              >
                <option value="Idle">{t('robot_detail.role_idle')}</option>
                <option value="CNC">CNC</option>
                <option value="Laser">{t('robot_detail.role_laser')}</option>
                <option value="Pnp">Pnp</option>
                <option value="3D printing">{t('robot_detail.role_3d_printing')}</option>
                <option value="Inspection">{t('robot_detail.role_inspection')}</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('robot_detail.urtc_tool', 'URTC Tool')}</label>
              <select 
                value={robot.tool}
                onChange={e => setPendingTool(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none"
              >
                {robot.tool && !isUrtcTool(robot.tool) && <option value={robot.tool}>{robot.tool}</option>}
                {URTC_TOOLS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {robot.tool && !isUrtcTool(robot.tool) && (
                <p className="text-[11px] text-amber-400" data-testid="tool-not-in-family">{t('robot_detail.tool_not_in_family', 'This tool is not one of the URTC family; it is kept as it is.')}</p>
              )}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3 mt-4">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{t('robot_detail.virtual_environment', 'Virtual Environment')}</h4>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-400">{t('robot_detail.combine_with_robot', 'Combine with Robot')}</span>
                    
              <div className="flex flex-col gap-2">
                {robots.filter(r => r.id !== robot.id && r.online).map(r => (
                  <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={(robot.combinedWith || []).includes(r.id)}
                      onChange={(e) => {
                        // Dedupe defensively on every write, not just here - a stale
                        // `robot` closure (or any future double-fire of this handler)
                        // must not be able to grow this array unbounded: without this
                        // guard a robot's combinedWith can silently balloon to dozens of
                        // duplicate entries (the same handful of ids repeated over and
                        // over); a prior case had 144 entries and 3 ids repeated 48x.
                        const current = robot.combinedWith || [];
                        const next = e.target.checked
                          ? (current.includes(r.id) ? current : [...current, r.id])
                          : current.filter(id => id !== r.id);
                        updateRobot(robot.id, { combinedWith: Array.from(new Set(next)) });
                      }}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 focus:ring-opacity-50 focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer appearance-none checked:bg-sky-500 checked:border-sky-500 transition-colors relative"
                    />
                    <span className="text-sm text-slate-300">{r.name} (ID: {r.id})</span>
                  </label>
                ))}
                {robots.length <= 1 && <span className="text-xs text-slate-500">{t('robot_detail.no_other_robots')}</span>}
              </div>

            </div>
            <p className="text-xs text-slate-500 font-medium">
              {t('robot_detail.combine_desc', 'Shows the selected robot in the 3D view. Parameters are configured in its own menu.')}
            </p>
          </div>
        </div>
        )}


        {rightTab === 'io' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => toggleValve(0)}
                className={cn("flex flex-col items-center justify-center min-h-[64px] py-2 px-1 rounded-lg border transition-colors", 
                  robot.valves[0] ? "bg-sky-500/10 text-sky-400 glow-border-sky" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:glow-border-sky transition-all hover:glow-border-sky hover:text-sky-400 transition-all"
                )}
              >
                <Droplets size={20} className="mb-2" />
                <span className="text-xs font-semibold uppercase tracking-wider">{t('robot_detail.valve_1', 'Valve 1')}</span>
              </button>
              <button 
                onClick={() => toggleValve(1)}
                className={cn("flex flex-col items-center justify-center min-h-[64px] py-2 px-1 rounded-lg border transition-colors", 
                  robot.valves[1] ? "bg-sky-500/10 text-sky-400 glow-border-sky" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:glow-border-sky transition-all hover:glow-border-sky hover:text-sky-400 transition-all"
                )}
              >
                <Droplets size={20} className="mb-2" />
                <span className="text-xs font-semibold uppercase tracking-wider">{t('robot_detail.valve_2', 'Valve 2')}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => togglePump(0)}
                className={cn("flex flex-col items-center justify-center min-h-[64px] py-2 px-1 rounded-lg border transition-colors", 
                  robot.pumps[0] ? "bg-amber-500/10 border-amber-500/50 text-amber-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:glow-border-sky transition-all hover:glow-border-sky hover:text-sky-400 transition-all"
                )}
              >
                <Power size={20} className="mb-2" />
                <span className="text-xs font-semibold uppercase tracking-wider">Vac 1</span>
              </button>
              <button 
                onClick={() => togglePump(1)}
                className={cn("flex flex-col items-center justify-center min-h-[64px] py-2 px-1 rounded-lg border transition-colors", 
                  robot.pumps[1] ? "bg-amber-500/10 border-amber-500/50 text-amber-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:glow-border-sky transition-all hover:glow-border-sky hover:text-sky-400 transition-all"
                )}
              >
                <Power size={20} className="mb-2" />
                <span className="text-xs font-semibold uppercase tracking-wider">Vac 2</span>
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">{t('robot_detail.endstops_upper', 'ENDSTOPS')}</h4>
              <div className="flex gap-2">
                {(['x1', 'x2', 'y1', 'y2', 'z0'] as const).map(axis => (
                  <div key={axis} className={cn(
                    "flex-1 py-3 min-h-[48px] rounded-lg flex items-center justify-center gap-2 text-sm border font-mono font-bold uppercase",
                    robot.endstops[axis]
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      : "bg-slate-950 border-slate-800 text-slate-500"
                  )}>
                    <div className={cn("w-2.5 h-2.5 rounded-full", robot.endstops[axis] ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "bg-slate-700")} />
                    {axis}
                  </div>
                ))}
              </div>
            </div>

            {/* Robot Controller Board (STM32G474RET6, Tier 1) - real hardware status,
                surfaced here so it's visible without switching to Flasher/Tester. See
                HYDRA-UMC's own docs/CANBUS_STM32G474.TXT and docs/PINOUT_STM32G474_ROBOT_CONTROLLER.TXT. */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                {t('robot_detail.controller_board_upper', 'ROBOT CONTROLLER BOARD')}
                <span className={cn("w-2 h-2 rounded-full", robot.controllerBoard ? "bg-emerald-500" : "bg-slate-700")} />
              </h4>
              {robot.controllerBoard ? (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <span className="text-slate-500">{t('robot_detail.hardware_id', 'Hardware ID')}</span>
                  <span className="font-mono text-slate-200 text-right">{robot.controllerBoard.hardwareId || '?'}</span>
                  <span className="text-slate-500">{t('flasher.current_version', 'Firmware')}</span>
                  <span className="font-mono text-emerald-400 text-right">{robot.controllerBoard.firmwareVersion || '?'}</span>
                  <span className="text-slate-500">{t('flasher.bootloader', 'Bootloader')}</span>
                  <span className="font-mono text-slate-300 text-right">{robot.controllerBoard.bootloaderVersion || '?'}</span>
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-500">
                  {t('robot_detail.controller_board_unknown', 'No version known - query it from HYDRA-UMC â†’ Tester.')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
