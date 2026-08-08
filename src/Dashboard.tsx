import { useState, useEffect } from 'react';
import HydraIcon from './assets/HYDRA_UMC_ICON.svg';
import { useHydraStore, createDefaultRobots, createDefaultCameras } from './store';
import { 
  Activity, Crosshair, Layers, 
  Video, Focus, Settings, Menu, Plus, Trash2, Search
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Components
import { RobotDetail } from './components/RobotDetail';
import { CamerasView } from './components/CamerasView';
import { XYTableConfig } from './components/XYTableConfig';
import { ATCToolsConfig } from './components/ATCToolsConfig';
import { RackConfigView } from './components/RackConfigView';

export default function Dashboard() {
  const { controllers, activeControllerId, setActiveControllerId, activeController, updateController, robots, cameras, updateCamera, settings, updateSettings, updateRobot, addController, removeController } = useHydraStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'robot' | 'cameras' | 'xytable' | 'atc' | 'rack'>('overview');
  const [selectedRobotId, setSelectedRobotId] = useState<number>(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  const activeRobot = robots.find(r => r.id === selectedRobotId);

  useEffect(() => {
    document.body.dataset.theme = settings.theme;
  }, [settings.theme]);

  return (
    <div className="w-full h-screen bg-slate-950 bg-electric-grid text-slate-200 flex flex-col font-sans overflow-hidden mx-auto touch-none relative">
      {isSettingsOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[600px] max-w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Settings className="text-sky-400" size={20} /> System Configuration
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-200 p-1">
                &times;
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              
              <div className="space-y-4">
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
                          <td className="px-4 py-2">
                            <input
                              value={c.ip}
                              onChange={e => updateController(c.id, { ip: e.target.value })}
                              className="bg-transparent border-none outline-none font-mono text-slate-300 w-full"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select 
                              value={c.status}
                              onChange={e => updateController(c.id, { status: e.target.value as any })}
                              className="bg-transparent border-none outline-none font-bold text-xs uppercase tracking-wider"
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
                  <div className="p-2 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
                    <button
                      onClick={() => {
                        const ip = `192.168.1.${100 + controllers.length}`;
                        addController({
                          id: Date.now().toString(),
                          name: `HYDRA-UMC Node ${controllers.length + 1}`,
                          ip,
                          status: 'offline',
                          fdcanBaudrate: 1000,
                          fdcanDataBaudrate: 5000,
                          robots: createDefaultRobots().map(r => ({ ...r, online: false, urtcConnected: false })),
                          cameras: createDefaultCameras().map(cam => ({ ...cam, connected: false }))
                        });
                      }}
                      className="flex items-center gap-2 text-sky-400 hover:text-sky-300 text-xs font-bold uppercase tracking-wider p-2"
                    >
                      <Plus size={14} /> Add Controller
                    </button>
                    <button
                      onClick={() => {
                        setIsScanning(true);
                        setTimeout(() => {
                          setIsScanning(false);
                          const ip = `192.168.1.${Math.floor(Math.random() * 200) + 20}`;
                          const hasExisting = controllers.find(c => c.ip === ip);
                          if (!hasExisting) {
                            addController({
                              id: Date.now().toString(),
                              name: `HYDRA-UMC Node (Auto-Discovered)`,
                              ip,
                              status: 'online',
                              fdcanBaudrate: 1000,
                              fdcanDataBaudrate: 5000,
                              robots: createDefaultRobots().map((r, i) => ({ ...r, online: i < 2, urtcConnected: i < 2 })),
                              cameras: createDefaultCameras().map((cam, i) => ({ ...cam, connected: i < 1 }))
                            });
                          }
                        }, 2000);
                      }}
                      disabled={isScanning}
                      className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-wider p-2 transition-colors", isScanning ? "text-emerald-400 opacity-80" : "text-emerald-500 hover:text-emerald-400")}
                    >
                      <Search size={14} className={cn(isScanning && "animate-pulse")} /> 
                      {isScanning ? "Scanning Network..." : "Auto-Discover IP"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{activeController?.name} Settings</h3>
                  <button 
                    onClick={() => {
                      robots.forEach(r => updateRobot(r.id, { online: true, urtcConnected: true }));
                      cameras.forEach(c => updateCamera(c.id, { connected: true }));
                    }}
                    className="px-3 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded text-xs font-bold uppercase tracking-wider hover:bg-sky-500/20 transition-colors">
                    Detect Hardware
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">CAN Bus Bitrate</label>
                    <select value={activeController?.fdcanBaudrate || 1000} onChange={(e) => updateController(activeControllerId, { fdcanBaudrate: parseInt(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:border-sky-400 focus:glow-border-sky outline-none transition-all">
                      <option value={1000}>1000 kbps</option>
                      <option value={500}>500 kbps</option>
                      <option value={250}>250 kbps</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">FDCAN Data Baudrate</label>
                    <select value={activeController?.fdcanDataBaudrate || 5000} onChange={(e) => updateController(activeControllerId, { fdcanDataBaudrate: parseInt(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:border-sky-400 focus:glow-border-sky outline-none transition-all">
                      <option value={5000}>5000 kbps</option>
                      <option value={4000}>4000 kbps</option>
                      <option value={2000}>2000 kbps</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">System Preferences</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Theme</label>
                    <select value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:border-sky-400 focus:glow-border-sky outline-none transition-all">
                      <option value="Dark Mode (Default)">Dark Mode (Default)</option>\n                      <option value="High Contrast">High Contrast</option>\n                      <option value="Cyberpunk">Cyberpunk</option>\n                      <option value="Oceanic">Oceanic</option>\n                      <option value="Matrix">Matrix</option>\n                      <option value="Crimson Red">Crimson Red</option>\n                      <option value="Solarized Dark">Solarized Dark</option>\n                      <option value="Dracula">Dracula</option>\n                      <option value="Neon Purple">Neon Purple</option>\n                      <option value="Monokai">Monokai</option>\n                      <option value="Synthwave">Synthwave</option>\n                      <option value="Sunset">Sunset</option>\n                      <option value="Obsidian Black">Obsidian Black</option>\n                      <option value="Midnight Blue">Midnight Blue</option>\n                      <option value="Forest Green">Forest Green</option>\n                      <option value="Gold Rush">Gold Rush</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Telemetry Sync Interval</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:border-sky-400 focus:glow-border-sky outline-none transition-all">
                      <option>10 ms (Real-time)</option>
                      <option>50 ms</option>
                      <option>100 ms</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Emergency Protocol</h3>
                <div className="flex gap-4">
                  <button className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 glow-border-rose hover:shadow-[0_0_20px_rgba(255,102,0,0.4)] py-3 rounded-lg font-bold tracking-widest uppercase transition-colors">
                    Global E-Stop
                  </button>
                  <button className="flex-1 bg-slate-800 hover:bg-slate-700 hover:glow-border-sky border border-slate-700 transition-all border border-slate-700 text-slate-300 py-3 rounded-lg font-bold tracking-widest uppercase transition-colors">
                    Reboot Controller
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
              <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-rose-400 transition-colors hover:glow-border-rose px-4 py-2 rounded">Cancel</button>
              <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-sm bg-sky-500 text-slate-950 font-bold rounded transition-colors shadow-[0_0_15px_rgba(0,229,255,0.6)] border border-sky-400 hover:shadow-[0_0_20px_rgba(0,229,255,0.8)]">Save Changes</button>
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
          "shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col gap-3 z-10 overflow-y-auto custom-scrollbar transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-64 p-4 opacity-100" : "w-0 p-0 opacity-0 overflow-hidden border-none"
        )}>
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
          <NavItem 
            icon={<Crosshair size={18} />} 
            label="XY Table config" 
            active={activeTab === 'xytable'} 
            onClick={() => setActiveTab('xytable')} 
          />
          <NavItem 
            icon={<Focus size={18} />} 
            label="ATC Tools" 
            active={activeTab === 'atc'} 
            onClick={() => setActiveTab('atc')} 
          />
          <NavItem 
            icon={<Video size={18} />} 
            label="Vision / Cameras" 
            active={activeTab === 'cameras'} 
            onClick={() => setActiveTab('cameras')} 
          />
          <NavItem 
            icon={<Layers size={18} />} 
            label="RACK Config" 
            active={activeTab === 'rack'} 
            onClick={() => setActiveTab('rack')} 
          />
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950/80 p-4 backdrop-blur-sm">
          {activeTab === 'overview' && <OverviewPanel />}
          {activeTab === 'robot' && activeRobot && <RobotDetail robot={activeRobot} />}
          {activeTab === 'cameras' && <CamerasView />}
          {activeTab === 'xytable' && <XYTableConfig />}
          {activeTab === 'atc' && <ATCToolsConfig />}
          {activeTab === 'rack' && <RackConfigView />}
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
