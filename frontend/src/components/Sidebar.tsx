import { useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Sparkles,
  Newspaper,
  Bitcoin,
  Activity,
  Server,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Users
} from 'lucide-react';


interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onClose?: () => void;
}

export const Sidebar = ({ activeTab, setActiveTab, onClose }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'economic', label: 'Economic Data', icon: TrendingUp },
    { id: 'insights', label: 'AI Insights', icon: Sparkles },
    { id: 'council', label: 'AI Council', icon: Users },
    { id: 'news', label: 'Stock News', icon: Newspaper },
    { id: 'crypto', label: 'Crypto News', icon: Bitcoin },
    { id: 'architecture', label: 'Architecture', icon: Activity },
    { id: 'health', label: 'System Health', icon: Server },
  ];

  return (
    <aside className={`transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} border-r border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 flex flex-col z-30 pb-14 relative`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-1 text-slate-500 hover:text-blue-500 z-50 shadow-sm hover:shadow-md transition-all hidden md:flex"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className={`px-4 py-6 mb-4 flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
        <h1 className={`font-black tracking-tighter text-slate-900 dark:text-white transition-all ${isCollapsed ? 'text-sm' : 'text-3xl'}`}>
          BigFive
        </h1>
      </div>

      <nav className={`flex-1 px-4 space-y-2 ${isCollapsed ? 'px-2' : ''}`}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-2xl transition-all duration-200 group relative ${isActive
                ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={20} className={`flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'group-hover:text-slate-900 dark:group-hover:text-slate-200'}`} />
              {!isCollapsed && <span className="font-semibold text-sm whitespace-normal text-left leading-tight">{item.label}</span>}
              {isActive && !isCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-900">
        <div className={`bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 ${isCollapsed ? 'p-3 flex justify-center items-center' : 'p-4'}`}>
          {!isCollapsed && <p className="text-[10px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-widest mb-1">Status</p>}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            {!isCollapsed && <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">SERVERLESS</span>}
          </div>
        </div>
      </div>
    </aside>
  );
};