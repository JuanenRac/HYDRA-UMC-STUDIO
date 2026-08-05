import { useState } from 'react';
import { useHydraStore } from './store';
import { 
  Activity, Cpu, Crosshair, 
  Video, Focus
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

export default function Dashboard() {
  const { robots } = useHydraStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'robot' | 'cameras' | 'xytable'>('overview');
  const [selectedRobotId, setSelectedRobotId] = useState<number>(1);

  const activeRobot = robots.find(r => r.id === selectedRobotId);

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-12 shrink-0 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-2">
          <Cpu className="text-sky-400" size={24} />
          <h1 className="text-lg font-bold tracking-wider text-slate-100">HYDRA-UMC <span className="text-sky-400 font-medium">Studio</span></h1>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400">System Online</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-800 border border-slate-700">
            FDCAN: 1000 kbps
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden h-[calc(100vh-3rem)]">
        {/* Sidebar Nav */}
        <nav className="w-48 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col p-3 gap-1 z-10 overflow-y-auto">
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
                "flex items-center justify-between px-3 py-2 min-h-[44px] rounded text-xs transition-colors text-left",
                activeTab === 'robot' && selectedRobotId === r.id
                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn("w-2 h-2 rounded-full shrink-0", r.online ? "bg-emerald-500" : "bg-slate-700")} />
                <span className="truncate">{r.name}</span>
              </div>
              <span className="text-[9px] uppercase font-mono opacity-50 shrink-0 ml-1">{r.model}</span>
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
            icon={<Video size={18} />} 
            label="Vision / Cameras" 
            active={activeTab === 'cameras'} 
            onClick={() => setActiveTab('cameras')} 
          />
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4">
          {activeTab === 'overview' && <OverviewPanel />}
          {activeTab === 'robot' && activeRobot && <RobotDetail robot={activeRobot} />}
          {activeTab === 'cameras' && <CamerasView />}
          {activeTab === 'xytable' && <XYTableConfig />}
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
        "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded font-medium text-xs transition-colors",
        active 
          ? "bg-sky-500 text-slate-950 shadow shadow-sky-500/20" 
          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function OverviewPanel() {
  const { robots, xyTable } = useHydraStore();
  
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <h2 className="text-xl font-semibold text-slate-100">Micro-Factory Status</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {robots.map(r => (
          <div key={r.id} className={cn(
            "p-3 rounded-lg border flex flex-col gap-2",
            r.online ? "bg-slate-900 border-slate-700 shadow-lg shadow-black/20" : "bg-slate-900/50 border-slate-800 opacity-60"
          )}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-200 flex items-center gap-2 truncate">
                {r.name}
              </span>
              {r.online ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">Online</span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-500 shrink-0">Offline</span>
              )}
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
            
            {xyTable.assignedRobotId === r.id && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] uppercase font-bold text-amber-400 bg-amber-400/10 p-1 rounded border border-amber-500/20">
                <Focus size={10} /> XY Assigned
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
