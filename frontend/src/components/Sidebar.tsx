
import {
  LayoutDashboard,
  BarChart3,
  Sparkles,
  Newspaper,
  Activity
} from 'lucide-react';


interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'insights', label: 'AI Insights', icon: Sparkles },
    { id: 'news', label: 'Sentiment', icon: Newspaper },
    { id: 'health', label: 'System and Data Architecture', icon: Activity },
  ];

  return (
    <aside className="w-64 border-r border-slate-900 bg-slate-950 flex flex-col z-30 pb-14">
      <div className="px-4 py-6 mb-4">
        <h1 className="font-black tracking-tighter text-3xl text-white">BigFive</h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${isActive
                ? 'bg-blue-600/10 text-blue-400'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                }`}
            >
              <Icon size={20} className={`flex-shrink-0 ${isActive ? 'text-blue-400' : 'group-hover:text-slate-300'}`} />
              <span className="font-semibold text-sm whitespace-normal text-left leading-tight">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-900">
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-300 font-mono">GKE_ONLINE</span>
          </div>
        </div>
      </div>
    </aside>
  );
};