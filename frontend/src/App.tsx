import { useState } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { MobileNav } from './components/MobileNav';
import { Dashboard } from './components/Dashboard';
import { ChartSection } from './components/ChartSection';
import { AIChat } from './components/AIChat.tsx';
import { SentimentFeed } from './components/SentimentFeed';
import { CryptoNews } from './components/CryptoNews';
import { HealthView } from './components/HealthView';
import { ArchitectureView } from './components/ArchitectureView';
import { EconomicIndicators } from './components/EconomicIndicators';
import { AICouncil } from './components/AICouncil';
import { ThemeToggle } from './components/ThemeToggle';
import { Toaster } from 'sonner';


import { RealtimeProvider } from './hooks/RealtimeContext';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTicker, setSelectedTicker] = useState('AAPL');

  const handleTickerSelect = (ticker: string) => {
    setSelectedTicker(ticker);
    setActiveTab('analytics');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onTickerSelect={handleTickerSelect} />;
      case 'analytics': return <ChartSection ticker={selectedTicker} onTickerChange={setSelectedTicker} />;
      case 'insights': return <AIChat />;
      case 'council': return <AICouncil />;
      case 'news': return <SentimentFeed />;
      case 'crypto': return <CryptoNews />;
      case 'economic': return <EconomicIndicators />;
      case 'architecture': return <ArchitectureView />;
      case 'health': return <HealthView />;
      default: return <Dashboard onTickerSelect={handleTickerSelect} />;
    }
  };

  return (
    <RealtimeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-200 flex overflow-hidden relative">
        {/* Sonner for stylish toast notifications */}
        <Toaster position="top-right" theme="dark" />

        {/* Desktop Navigation */}
        <div className="hidden md:flex">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        <main className="flex-1 flex flex-col min-w-0 relative bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          {/* Futuristic Header - Responsive */}
          <header className="h-14 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-white/5 backdrop-blur-2xl flex items-center justify-between px-4 md:px-6 z-20 shadow-lg shadow-black/10 sticky top-0 relative">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white capitalize tracking-tight md:block hidden">{activeTab}</h1>
              {/* Mobile: Show active tab smaller or rely on bottom nav, keeping space for centered logo */}
              <h1 className="text-sm font-bold text-gray-600 dark:text-slate-400 capitalize tracking-tight md:hidden">{activeTab}</h1>
            </div>

            {/* Mobile Center Branding */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden">
              <h1 className="font-black tracking-tighter text-2xl text-gray-900 dark:text-white">BigFive</h1>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-slate-900 rounded-2xl border border-gray-300 dark:border-slate-800 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="hidden sm:inline">DASHBOARD_LIVE</span>
                <span className="sm:hidden">LIVE</span>
              </div>
            </div>
          </header>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-4 pb-32 md:p-5 md:pb-16 custom-scrollbar">
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
              {renderContent()}
            </div>
          </div>

          {/* Mobile Navigation */}
          <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </main>

        {/* Global Fixed Footer - Optimized for Density */}
        <footer className="fixed bottom-0 w-full py-2.5 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl border-t border-slate-200/50 dark:border-white/5 flex flex-col items-center justify-center shrink-0 z-50">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent via-slate-400/20 to-indigo-500/40" />
            <p className="text-[8.5px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] flex items-center gap-2 sm:gap-3">
              Designed & Engineered by
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 bg-clip-text text-transparent transition-all hover:scale-105 cursor-default">
                Udaya Krishna Karanam
              </span>
            </p>
            <div className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent via-slate-400/20 to-indigo-500/40" />
          </div>
        </footer>
      </div >
    </RealtimeProvider>
  );
}