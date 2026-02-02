
import { LayoutDashboard, TrendingUp, Cpu, Newspaper, Activity } from 'lucide-react';

interface MobileNavProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const MobileNav = ({ activeTab, setActiveTab }: MobileNavProps) => {
    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dash' },
        { id: 'analytics', icon: TrendingUp, label: 'Chart' },
        { id: 'insights', icon: Cpu, label: 'AI' },
        { id: 'news', icon: Newspaper, label: 'News' },
        { id: 'health', icon: Activity, label: 'Health' }, // Optional, maybe hide regarding screen space
    ];

    return (
        <div className="md:hidden fixed bottom-11 left-6 right-6 h-16 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-between px-6 shadow-2xl z-50">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-blue-400 -translate-y-1' : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <div className={`p-1.5 rounded-full transition-all ${isActive ? 'bg-blue-500/20' : ''}`}>
                            <Icon size={20} className={isActive ? "fill-current" : ""} />
                        </div>
                        {/* <span className="text-[9px] font-medium tracking-wide">{item.label}</span> */}
                    </button>
                );
            })}
        </div>
    );
};
