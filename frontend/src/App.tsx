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
          <header className="h-14 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-white/5 backdrop-blur-2xl flex items-center justify-end px-4 md:px-6 z-20 shadow-lg shadow-black/10 sticky top-0">

            {/* Branding - Responsive handling */}
            <div className="flex-1 flex items-center">
              <h1 className="font-black tracking-tighter text-xl sm:text-2xl text-gray-900 dark:text-white">BigFive</h1>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-slate-900 rounded-2xl border border-gray-300 dark:border-slate-800 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="hidden sm:inline">APP LIVE</span>
                <span className="sm:hidden">APP LIVE</span>
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
        <footer className="fixed bottom-0 w-full py-2.5 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl border-t border-slate-200/50 dark:border-white/5 flex items-center justify-center shrink-0 z-50">
          <div className="w-full max-w-7xl px-4 flex items-center justify-center gap-4 sm:gap-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-400/20 to-indigo-500/40" />
            <p className="text-[8.5px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em] sm:tracking-[0.5em] flex items-center gap-1.5 sm:gap-3 whitespace-nowrap">
              Designed & Built by
              <a href="https://www.linkedin.com/in/udayakrishnakaranam10" target="_blank" rel="noreferrer" className="text-sky-400 dark:text-sky-400 font-black transition-all hover:text-sky-300">
                Udaya Krishna Karanam
              </a>
            </p>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-400/20 to-indigo-500/40" />
          </div>
        </footer>
      </div>
    </RealtimeProvider>
  );
}