import { useState, useEffect } from 'react';
import HydraIcon from './assets/HYDRA_UMC_ICON.svg';
import { useHydraStore, createDefaultRobots, createDefaultCameras } from './store';
import { 
  Activity, Crosshair, Layers, 
  Video, Focus, Settings, Menu, Plus, Trash2, Search, AlertTriangle, Power
, Cpu, PenTool, Zap, Wind, Thermometer } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Components
import { RobotDetail } from './components/RobotDetail';
import { CamerasView } from './components/CamerasView';
import { XYTableConfig } from './components/XYTableConfig';
import { JuanenPnPConfig } from './components/JuanenPnPConfig';
import { LumenPnPConfig } from './components/LumenPnPConfig';
import { JuanenCNCConfig } from './components/JuanenCNCConfig';
import { JuanenLaserConfig } from './components/JuanenLaserConfig';
import { VacuumTableConfig } from './components/VacuumTableConfig';
import { HeatedBedConfig } from './components/HeatedBedConfig';
import { ATCToolsConfig } from './components/ATCToolsConfig';
import { RackConfigView } from './components/RackConfigView';

export default function Dashboard() {
  const { controllers, activeControllerId, setActiveControllerId, activeController, updateController, robots, settings, updateSettings, updateRobot, addController, removeController } = useHydraStore();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedRobotId, setSelectedRobotId] = useState<number>(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [configTab, setConfigTab] = useState<'controllers' | 'ui' | 'robots' | 'models' | 'integrations'>('controllers');

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isModulesMenuOpen, setIsModulesMenuOpen] = useState(false);
  

  const activeRobot = robots.find(r => r.id === selectedRobotId);

  useEffect(() => {
    document.body.dataset.theme = settings.theme;
  }, [settings.theme]);

  return (
    <div className="w-full h-screen bg-slate-950 bg-electric-grid text-slate-200 flex flex-col font-sans overflow-hidden mx-auto touch-none relative">
      
            {isSettingsOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[800px] max-w-full overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Settings className="text-sky-400" size={20} /> System Configuration
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-200 p-1">
                &times;
              </button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
              <div className="w-48 bg-slate-950 border-r border-slate-800 flex flex-col">
                <button onClick={() => setConfigTab('controllers')} className={cn("px-4 py-3 text-sm font-semibold text-left transition-colors", configTab === 'controllers' ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-400 hover:bg-slate-900')}>Controllers</button>
                <button onClick={() => setConfigTab('ui')} className={cn("px-4 py-3 text-sm font-semibold text-left transition-colors", configTab === 'ui' ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-400 hover:bg-slate-900')}>UI & Themes</button>
                <button onClick={() => setConfigTab('robots')} className={cn("px-4 py-3 text-sm font-semibold text-left transition-colors", configTab === 'robots' ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-400 hover:bg-slate-900')}>Robot Names</button>
                <button onClick={() => setConfigTab('models')} className={cn("px-4 py-3 text-sm font-semibold text-left transition-colors", configTab === 'models' ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-400 hover:bg-slate-900')}>Custom Models</button>
                <button onClick={() => setConfigTab('integrations')} className={cn("px-4 py-3 text-sm font-semibold text-left transition-colors", configTab === 'integrations' ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-400 hover:bg-slate-900')}>Integrations</button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-900">
                {configTab === 'controllers' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Controller Management (Ethernet/IP)</h3>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900 border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-2 font-medium text-slate-400">Name</th>
                            <th className="px-4 py-2 font-medium text-slate-400">IP Address</th>
                            <th className="px-4 py-2 font-medium text-slate-400">Status</th>
                            <th className="px-4 py-2 text-right"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {controllers.map(c => (
                            <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                              <td className="px-4 py-2">
                                <input
                                  value={c.name}
                                  onChange={e => updateController(c.id, { name: e.target.value })}
                                  className="bg-transparent border-none outline-none text-slate-200 w-full"
                                />
                              </td>
                              <td className="px-4 py-2 flex items-center gap-2">
    <input
      value={c.ip}
      onChange={e => updateController(c.id, { ip: e.target.value })}
      className="bg-transparent border-none outline-none font-mono text-slate-300 w-full"
    />
    <button
      onClick={() => window.location.href = `http://${c.ip}:${window.location.port}`}
      className="p-1 hover:bg-slate-700 rounded text-sky-400 transition-colors"
      title="Connect to Host"
    >
      <Power size={14} />
    </button>
  </td>
                              <td className="px-4 py-2">
                                <select 
                                  value={c.status}
                                  onChange={e => updateController(c.id, { status: e.target.value as 'online' | 'offline' })}
                                  className="bg-transparent border-none outline-none font-semibold w-full"
                                  style={{ color: c.status === 'online' ? '#34d399' : '#f87171' }}
                                >
                                  <option value="online">Online</option>
                                  <option value="offline">Offline</option>
                                </select>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  onClick={() => removeController(c.id)}
                                  disabled={controllers.length <= 1}
                                  className="text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-30 p-1"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => addController({
                          id: 'new-' + Date.now(),
                          name: 'New Controller',
                          ip: '192.168.1.xxx',
                          status: 'offline',
                          fdcanBaudrate: 1000,
                          fdcanDataBaudrate: 5000,
                          robots: createDefaultRobots(),
                          cameras: createDefaultCameras()
                        })}
                        className="flex-1 flex items-center gap-2 px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded transition-colors justify-center border border-slate-700"
                      >
                        <Plus size={16} /> Add Node
                      </button>
                      <button 
                        className="flex-1 flex items-center gap-2 px-4 py-2 text-sm bg-sky-900/40 hover:bg-sky-800/60 text-sky-400 font-bold rounded transition-colors justify-center border border-sky-700/50"
                      >
                        <Search size={16} /> Auto-Search HYDRA-UMC
                      </button>
                    </div>

                    <div className="mt-6 space-y-4">
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Advanced Config</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">FDCAN Config</label>
                          <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none">
                            <option>Classic CAN</option>
                            <option>FDCAN</option>
                          </select>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CANBUS Bitrate</label>
                          <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none">
                            <option>500 kbps</option>
                            <option>1 Mbps</option>
                            <option>2 Mbps</option>
                            <option>5 Mbps</option>
                          </select>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telemetry</label>
                          <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none">
                            <option>10ms (100Hz)</option>
                            <option>20ms (50Hz)</option>
                            <option>50ms (20Hz)</option>
                            <option>100ms (10Hz)</option>
                          </select>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-center gap-2">
                          <button className="w-full py-2 bg-rose-900/40 hover:bg-rose-800/60 text-rose-400 border border-rose-700/50 rounded text-sm font-bold uppercase transition-colors flex items-center justify-center gap-2">
                            <AlertTriangle size={16} /> Global E-Stop
                          </button>
                          <button className="w-full py-2 bg-amber-900/40 hover:bg-amber-800/60 text-amber-400 border border-amber-700/50 rounded text-sm font-bold uppercase transition-colors flex items-center justify-center gap-2">
                            <Power size={16} /> Reboot Controller
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {configTab === 'ui' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">UI Theme</h3>
                      <select 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 min-h-[48px] text-sm text-slate-200 outline-none focus:border-sky-400 focus:glow-border-sky"
                        value={settings.theme}
                        onChange={(e) => updateSettings({ theme: e.target.value })}
                      >
                        <option value="Dark Mode (Default)">Dark Mode (Default)</option>
                        <option value="Light Mode (White)">Light Mode (White)</option>
                        <option value="Light Gray">Light Gray</option>
                        <option value="High Contrast">High Contrast</option>
                        <option value="Cyberpunk">Cyberpunk</option>
                        <option value="Ocean">Ocean</option>
                        <option value="Matrix">Matrix</option>
                        <option value="Sunset">Sunset</option>
                        <option value="Hacker">Hacker</option>
                        <option value="Synthwave">Synthwave</option>
  <option value="Dracula">Dracula</option>
  <option value="Nord">Nord</option>
  <option value="Solarized Dark">Solarized Dark</option>
  <option value="Solarized Light">Solarized Light</option>
  <option value="Monokai">Monokai</option>
  <option value="Gruvbox">Gruvbox</option>
  <option value="Tokyo Night">Tokyo Night</option>
  <option value="Catppuccin">Catppuccin</option>
  <option value="Midnight Blue">Midnight Blue</option>
  <option value="Neon">Neon</option>
                      </select>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Shared Resources Visibility</h3>
                      <div className="space-y-2 bg-slate-950 p-4 rounded-lg border border-slate-800">
                        {['Vision/Cameras', 'XY Table', 'ATC Tools', 'Rack', 'JuanenPnP', 'LumenPnP', 'JuanenCNC', 'JuanenLaser', 'Vacuum Table', 'Heated Bed'].map(module => (
                          <label key={module} className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              checked={settings.visibleModules.includes(module)}
                              onChange={(e) => {
                                let newModules = [...settings.visibleModules];
                                if (e.target.checked) newModules.push(module);
                                else newModules = newModules.filter(m => m !== module);
                                updateSettings({ visibleModules: newModules });
                              }}
                              disabled={module === 'Vision/Cameras'}
                              className="w-4 h-4 rounded border-slate-700 text-sky-500 focus:ring-sky-500 bg-slate-900"
                            />
                            <span className="text-sm text-slate-300">{module} {module === 'Vision/Cameras' && '(Required)'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {configTab === 'robots' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Rename Robots</h3>
                    <div className="space-y-2">
                      {activeController.robots.map(r => (
                        <div key={r.id} className="flex items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <span className="text-slate-400 font-mono text-xs w-8">#{r.id}</span>
                          <input 
                            value={r.name}
                            onChange={(e) => updateRobot(r.id, { name: e.target.value })}
                            className="bg-transparent border-none outline-none text-slate-200 flex-1 text-sm font-semibold"
                            placeholder="Robot Name"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {configTab === 'models' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Custom Models</h3>
                    </div>
                    <div className="space-y-2">
                      {settings.customModels.map((model, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <input 
                            value={model}
                            onChange={(e) => {
                              const newModels = [...settings.customModels];
                              newModels[idx] = e.target.value;
                              updateSettings({ customModels: newModels });
                            }}
                            className="bg-transparent border-none outline-none text-slate-200 flex-1 text-sm font-semibold"
                            placeholder="Model Name"
                          />
                          <button 
                            onClick={() => {
                              const newModels = settings.customModels.filter((_, i) => i !== idx);
                              updateSettings({ customModels: newModels });
                            }}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => updateSettings({ customModels: [...settings.customModels, 'New Custom Model'] })}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded transition-colors w-full justify-center border border-slate-700"
                      >
                        <Plus size={16} /> Add Custom Model
                      </button>
                    </div>
                  </div>
                )}

                {configTab === 'integrations' && (
                  <div className="space-y-6">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Software Integrations</h3>
                    
                    {/* OpenPNP */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sky-400">OpenPNP (Pick & Place)</span>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={settings.integrations?.openPnP?.enabled} 
                            onChange={(e) => updateSettings({ integrations: { ...settings.integrations, openPnP: { ...settings.integrations?.openPnP, enabled: e.target.checked } } })}
                            className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500" />
                          Enabled
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input placeholder="IP Address" value={settings.integrations?.openPnP?.ip} 
                          onChange={(e) => updateSettings({ integrations: { ...settings.integrations, openPnP: { ...settings.integrations?.openPnP, ip: e.target.value } } })}
                          className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm outline-none focus:border-sky-500 text-slate-200" />
                        <input placeholder="Port" type="number" value={settings.integrations?.openPnP?.port} 
                          onChange={(e) => updateSettings({ integrations: { ...settings.integrations, openPnP: { ...settings.integrations?.openPnP, port: parseInt(e.target.value) } } })}
                          className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm outline-none focus:border-sky-500 text-slate-200" />
                      </div>
                    </div>

                    {/* Slic3r / PrusaSlicer */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-orange-400">PrusaSlicer / Slic3r (3D Print)</span>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={settings.integrations?.prusaSlicer?.enabled} 
                            onChange={(e) => updateSettings({ integrations: { ...settings.integrations, prusaSlicer: { ...settings.integrations?.prusaSlicer, enabled: e.target.checked } } })}
                            className="rounded bg-slate-900 border-slate-700 text-orange-500 focus:ring-orange-500" />
                          Enabled
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input placeholder="IP Address" value={settings.integrations?.prusaSlicer?.ip} 
                          onChange={(e) => updateSettings({ integrations: { ...settings.integrations, prusaSlicer: { ...settings.integrations?.prusaSlicer, ip: e.target.value } } })}
                          className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm outline-none focus:border-orange-500 text-slate-200" />
                        <input placeholder="Port" type="number" value={settings.integrations?.prusaSlicer?.port} 
                          onChange={(e) => updateSettings({ integrations: { ...settings.integrations, prusaSlicer: { ...settings.integrations?.prusaSlicer, port: parseInt(e.target.value) } } })}
                          className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm outline-none focus:border-orange-500 text-slate-200" />
                      </div>
                    </div>

                    {/* CNC / Laser */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-rose-400">CNC / Laser Software</span>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={settings.integrations?.cnc?.enabled} 
                            onChange={(e) => updateSettings({ integrations: { ...settings.integrations, cnc: { ...settings.integrations?.cnc, enabled: e.target.checked } } })}
                            className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-rose-500" />
                          Enabled
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <select 
                          value={settings.integrations?.cnc?.software}
                          onChange={(e) => updateSettings({ integrations: { ...settings.integrations, cnc: { ...settings.integrations?.cnc, software: e.target.value } } })}
                          className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm outline-none focus:border-rose-500 text-slate-200"
                        >
                          <option value="LinuxCNC">LinuxCNC</option>
                          <option value="Mach3">Mach3</option>
                          <option value="LightBurn">LightBurn</option>
                          <option value="LaserGRBL">LaserGRBL</option>
                        </select>
                        <input placeholder="Port" type="number" value={settings.integrations?.cnc?.port} 
                          onChange={(e) => updateSettings({ integrations: { ...settings.integrations, cnc: { ...settings.integrations?.cnc, port: parseInt(e.target.value) } } })}
                          className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm outline-none focus:border-rose-500 text-slate-200" />
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950 shrink-0">
              <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-sm bg-sky-500 text-slate-950 font-bold rounded transition-colors shadow-[0_0_15px_rgba(0,229,255,0.6)] border border-sky-400 hover:shadow-[0_0_20px_rgba(0,229,255,0.8)]">Done</button>
            </div>
          </div>
        </div>
      )}
{/* Header - larger for touch */}
      <header className="h-16 shrink-0 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          <img src={HydraIcon} alt="Hydra Logo" className="w-8 h-8 object-contain" />
          <h1 className="text-2xl font-bold tracking-wider text-slate-100">HYDRA<span className="text-emerald-500">-UM</span><span className="text-rose-500">C</span> <span className="text-sky-400 font-medium">Studio</span></h1>
        </div>
        <div className="flex items-center gap-6 text-base font-medium">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 hover:glow-border-sky border border-slate-700 transition-all border border-slate-700 text-slate-300 transition-colors"
          >
            <Settings size={18} />
            <span className="text-sm">Config</span>
          </button>
          <div className="flex items-center gap-3">
            <span className={cn("w-4 h-4 rounded-full animate-pulse", activeController?.status === 'online' ? "bg-emerald-500 shadow-[0_0_10px_rgba(0,255,102,0.5)]" : "bg-rose-500 shadow-[0_0_10px_rgba(255,102,0,0.5)]")} />
            <span className={cn("tracking-wide font-bold", activeController?.status === 'online' ? "text-emerald-400" : "text-rose-400")}>{activeController?.status === 'online' ? 'System Online' : 'System Offline'}</span>
          </div>
          <select
            value={activeControllerId}
            onChange={(e) => {
              setActiveControllerId(e.target.value);
              setSelectedRobotId(1); // Reset selected robot
              setActiveTab('overview');
            }}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 font-mono text-slate-200 outline-none focus:border-sky-400 focus:glow-border-sky transition-all appearance-none cursor-pointer"
          >
            {controllers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.ip})
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden h-[calc(100%-4rem)]">
        {/* Sidebar Nav - larger targets for 10" touch */}
        <nav className={cn(
          "shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col gap-3 z-10 overflow-y-auto custom-scrollbar transition-all duration-300 ease-in-out relative",
          isSidebarOpen ? "w-64 p-4 opacity-100" : "w-0 p-0 opacity-0 overflow-hidden border-none"
        )}>
          {isModulesMenuOpen ? (
            <div className="flex flex-col gap-3 h-full animate-in slide-in-from-right-4 fade-in duration-300">
              <button 
                onClick={() => setIsModulesMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-400 hover:text-slate-200 transition-colors uppercase tracking-wider mb-2"
              >
                ← Back
              </button>
              
              <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Modules
              </div>
              
              {settings.visibleModules?.includes('XY Table') && (
                <NavItem icon={<Crosshair size={18} />} label="XY Table" active={activeTab === 'xytable'} onClick={() => setActiveTab('xytable')} />
              )}
              {settings.visibleModules?.includes('ATC Tools') && (
                <NavItem icon={<Focus size={18} />} label="ATC Tools" active={activeTab === 'atc'} onClick={() => setActiveTab('atc')} />
              )}
              {settings.visibleModules?.includes('Rack') && (
                <NavItem icon={<Layers size={18} />} label="Rack" active={activeTab === 'rack'} onClick={() => setActiveTab('rack')} />
              )}
              {settings.visibleModules?.includes('JuanenPnP') && (
                <NavItem icon={<Cpu size={18} />} label="JuanenPnP" active={activeTab === 'juanenpnp'} onClick={() => setActiveTab('juanenpnp')} />
              )}
              {settings.visibleModules?.includes('LumenPnP') && (
                <NavItem icon={<Cpu size={18} />} label="LumenPnP" active={activeTab === 'lumenpnp'} onClick={() => setActiveTab('lumenpnp')} />
              )}
              {settings.visibleModules?.includes('JuanenCNC') && (
                <NavItem icon={<PenTool size={18} />} label="JuanenCNC" active={activeTab === 'juanencnc'} onClick={() => setActiveTab('juanencnc')} />
              )}
              {settings.visibleModules?.includes('JuanenLaser') && (
                <NavItem icon={<Zap size={18} />} label="JuanenLaser" active={activeTab === 'juanenlaser'} onClick={() => setActiveTab('juanenlaser')} />
              )}
              {settings.visibleModules?.includes('Vacuum Table') && (
                <NavItem icon={<Wind size={18} />} label="Vacuum Table" active={activeTab === 'vacuumtable'} onClick={() => setActiveTab('vacuumtable')} />
              )}
              {settings.visibleModules?.includes('Heated Bed') && (
                <NavItem icon={<Thermometer size={18} />} label="Heated Bed" active={activeTab === 'heatedbed'} onClick={() => setActiveTab('heatedbed')} />
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3 h-full animate-in slide-in-from-left-4 fade-in duration-300">
              <NavItem 
                icon={<Activity size={18} />} 
                label="Overview" 
                active={activeTab === 'overview'} 
                onClick={() => setActiveTab('overview')} 
              />
              <div className="mt-3 mb-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Networked Robots
              </div>
              {robots.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRobotId(r.id);
                    setActiveTab('robot');
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-3 min-h-[50px] rounded-lg text-sm transition-all text-left",
                    activeTab === 'robot' && selectedRobotId === r.id
                      ? "bg-sky-500/10 text-sky-400 glow-border-sky"
                      : "text-slate-400 hover:bg-slate-800 hover:glow-border-sky hover:text-sky-400 transition-all hover:text-slate-200 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", r.online ? "bg-emerald-500" : "bg-slate-700")} />
                    <span className="truncate font-medium">{r.name}</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono opacity-60 shrink-0 ml-1">{r.model}</span>
                </button>
              ))}
              
              <div className="mt-3 mb-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Shared Resources
              </div>
              
              {settings.visibleModules?.includes('Vision/Cameras') && (
                <NavItem 
                  icon={<Video size={18} />} 
                  label="Vision / Cameras" 
                  active={activeTab === 'cameras'} 
                  onClick={() => setActiveTab('cameras')} 
                />
              )}

              <button
                onClick={() => setIsModulesMenuOpen(true)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 min-h-[64px] rounded-xl font-medium text-lg transition-all",
                  isModulesMenuOpen || ['xytable', 'atc', 'rack', 'juanenpnp', 'lumenpnp', 'juanencnc', 'juanenlaser', 'vacuumtable', 'heatedbed'].includes(activeTab)
                    ? "bg-sky-500/10 text-sky-400 glow-border-sky" 
                    : "text-slate-400 hover:bg-slate-800 hover:glow-border-sky hover:text-sky-400 transition-all hover:text-slate-200 border border-transparent"
                )}
              >
                <Layers size={18} />
                <span className="truncate">Modules</span>
              </button>
            </div>
          )}
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950/80 p-4 backdrop-blur-sm">
          {activeTab === 'overview' && <OverviewPanel />}
          {activeTab === 'robot' && activeRobot && <RobotDetail key={activeRobot.id} robot={activeRobot} />}
          {activeTab === 'cameras' && <CamerasView />}
          {activeTab === 'xytable' && <XYTableConfig />}
          {activeTab === 'atc' && <ATCToolsConfig />}
          {activeTab === 'rack' && <RackConfigView />}

        {activeTab === 'juanenpnp' && <JuanenPnPConfig />}
        {activeTab === 'lumenpnp' && <LumenPnPConfig />}
        {activeTab === 'juanencnc' && <JuanenCNCConfig />}
        {activeTab === 'juanenlaser' && <JuanenLaserConfig />}
        {activeTab === 'vacuumtable' && <VacuumTableConfig />}
        {activeTab === 'heatedbed' && <HeatedBedConfig />}

        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 px-4 py-4 min-h-[64px] rounded-xl font-medium text-lg transition-all",
        active 
          ? "bg-sky-500 text-slate-950 shadow-[0_0_15px_rgba(0,229,255,0.6)] border border-sky-400" 
          : "text-slate-400 hover:bg-slate-800 hover:glow-border-sky hover:text-sky-400 transition-all hover:text-slate-200 border border-transparent"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function OverviewPanel() {
  const { robots, cameras, updateRobot } = useHydraStore();
  
  return (
    <div className="w-full mx-auto space-y-6 px-2 2xl:px-8">
      <h2 className="text-2xl font-semibold text-slate-100">Micro-Factory Status</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 2xl:gap-6">
        {robots.map(r => (
          <div key={r.id} className={cn(
            "p-3 rounded-lg border flex flex-col gap-2",
            r.online ? "bg-slate-900 border-slate-700 hover:glow-border-emerald transition-all duration-300 shadow-lg" : "bg-slate-900/50 border-slate-800 opacity-60"
          )}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-200 flex items-center gap-2 truncate">
                {r.name}
              </span>
              <button onClick={(e) => { e.stopPropagation(); updateRobot(r.id, { online: !r.online }) }} className={cn("px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider transition-colors", r.online ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20" : "bg-slate-800 text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-500")}>
    {r.online ? 'Online' : 'Connect'}
  </button>
            </div>
            
            
            {(() => {
              const hosts = robots.filter(other => other.combinedWith?.includes(r.id));
              if (hosts.length === 0) return null;
              return (
                <div className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-1 rounded font-medium mt-1 mb-1 animate-pulse truncate" title={"Combined into: " + hosts.map(h => h.name).join(', ')}>
                  Combined into {hosts.map(h => h.name).join(', ')}
                </div>
              );
            })()}
            <div className="text-[11px] text-slate-400 grid grid-cols-[40px_1fr] gap-x-1 gap-y-1">

              <div>Model:</div>
              <div className="text-slate-200 font-medium">{r.model}</div>
              <div>Role:</div>
              <div className="text-slate-200 truncate">{r.role}</div>
              <div>Tool:</div>
              <div className="text-slate-200 truncate">{r.tool}</div>
            </div>

            {r.online && (
              <div className="mt-1 grid grid-cols-3 gap-1 text-[10px] font-mono bg-slate-950 p-1.5 rounded border border-slate-800 text-slate-300">
                <div className="text-center truncate">X:{r.pos.x.toFixed(0)}</div>
                <div className="text-center truncate">Y:{r.pos.y.toFixed(0)}</div>
                <div className="text-center truncate">Z:{r.pos.z.toFixed(0)}</div>
              </div>
            )}
            
            {r.hasXYTable && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] uppercase font-bold text-amber-400 bg-amber-400/10 p-1 rounded border border-amber-500/20">
                <Focus size={10} /> XY Assigned
              </div>
            )}
            {r.atc && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] uppercase font-bold text-sky-400 bg-sky-400/10 p-1 rounded border border-sky-500/20">
                <Settings size={10} /> ATC: {r.atc.type.replace("_", " ")}
              </div>
            )}
            {r.rackSystem?.enabled && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] uppercase font-bold text-rose-400 bg-rose-400/10 p-1 rounded border border-rose-500/20">
                <Layers size={10} /> Rack Active
              </div>
            )}
            {r.juanenPnP?.enabled && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] uppercase font-bold text-blue-400 bg-blue-400/10 p-1 rounded border border-blue-500/20">
                JuanenPnP
              </div>
            )}
            {r.lumenPnP?.enabled && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] uppercase font-bold text-indigo-400 bg-indigo-400/10 p-1 rounded border border-indigo-500/20">
                LumenPnP
              </div>
            )}
            {r.juanenCNC?.enabled && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] uppercase font-bold text-fuchsia-400 bg-fuchsia-400/10 p-1 rounded border border-fuchsia-500/20">
                JuanenCNC
              </div>
            )}
            {r.juanenLaser?.enabled && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] uppercase font-bold text-red-400 bg-red-400/10 p-1 rounded border border-red-500/20">
                JuanenLaser
              </div>
            )}
            {r.vacuumTable?.enabled && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] uppercase font-bold text-teal-400 bg-teal-400/10 p-1 rounded border border-teal-500/20">
                Vacuum Table
              </div>
            )}
            {r.heatedBed?.enabled && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] uppercase font-bold text-orange-400 bg-orange-400/10 p-1 rounded border border-orange-500/20">
                Heated Bed
              </div>
            )}
            {cameras.find(c => c.id === r.id)?.connected ? (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 p-1 rounded border border-emerald-500/20">
                <Video size={10} /> Camera Active
              </div>
            ) : (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] uppercase font-bold text-slate-500 bg-slate-800 p-1 rounded border border-slate-700">
                <Video size={10} /> Camera Offline
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
