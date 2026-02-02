import { useState } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { MobileNav } from './components/MobileNav';
import { Dashboard } from './components/Dashboard';
import { ChartSection } from './components/ChartSection';
import { AIChat } from './components/AIChat.tsx';
import { SentimentFeed } from './components/SentimentFeed';
import { HealthView } from './components/HealthView';
import { Toaster } from 'sonner';


export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'analytics': return <ChartSection />;
      case 'insights': return <AIChat />;
      case 'news': return <SentimentFeed />;
      case 'health': return <HealthView />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex overflow-hidden relative">
      {/* Sonner for stylish toast notifications */}
      <Toaster position="top-right" theme="dark" />

      {/* Desktop Navigation */}
      <div className="hidden md:flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <main className="flex-1 flex flex-col min-w-0 relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Futuristic Header - Responsive */}
        <header className="h-20 border-b border-white/5 bg-white/5 backdrop-blur-2xl flex items-center justify-between px-6 md:px-8 z-20 shadow-2xl shadow-black/20 sticky top-0 relative">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white capitalize tracking-tight md:block hidden">{activeTab}</h1>
            {/* Mobile: Show active tab smaller or rely on bottom nav, keeping space for centered logo */}
            <h1 className="text-sm font-bold text-slate-400 capitalize tracking-tight md:hidden">{activeTab}</h1>
          </div>

          {/* Mobile Center Branding */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden">
            <h1 className="font-black tracking-tighter text-2xl text-white">BigFive</h1>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 rounded-2xl border border-slate-800 text-[10px] font-mono text-blue-400">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="hidden sm:inline">GKE_CLUSTER_LIVE</span>
            <span className="sm:hidden">LIVE</span>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 pb-32 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            {renderContent()}

          </div>
        </div>




        {/* Mobile Navigation */}
        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </main>

      {/* Global Fixed Footer */}
      <footer className="fixed bottom-0 w-full py-3 bg-slate-950/90 backdrop-blur-md border-t border-white/5 flex flex-col items-center justify-center shrink-0 z-50">
        <p className="text-sm text-slate-400 font-bold tracking-wide flex items-center gap-2">
          Designed & Built by <span className="text-blue-400">Udaya Krishna Karanam</span>
        </p>
      </footer>
    </div >
  );
}