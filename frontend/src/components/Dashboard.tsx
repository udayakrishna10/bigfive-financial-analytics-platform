import { useEffect, useState } from 'react';
import { api, TickerData } from '../services/api';
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Radio } from 'lucide-react';
import { getLogo } from '../helpers/logos';
import { CryptoCards } from './CryptoCards';
import { useRealtimeData } from '../hooks/useRealtimeData';
import { FundamentalsCards } from './FundamentalsCards';
import { SentimentFeed } from './SentimentFeed';

interface DashboardProps {
  onTickerSelect?: (ticker: string) => void;
}

export const Dashboard = ({ onTickerSelect }: DashboardProps) => {
  const [stocks, setStocks] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { realtimeData, isLive, latency } = useRealtimeData();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    setError("");
    api.getDashboard()
      .then(data => {
        if (data && Array.isArray(data.tickers)) {
          setStocks(data.tickers);
        } else {
          console.warn("Invalid data format:", data);
          setStocks([]);
        }
      })
      .catch(err => {
        console.error("Dashboard fetch failed:", err);
        setError("Failed to load market data. " + (err.message || ""));
      })
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950 dark:to-red-950 border border-rose-200 dark:border-rose-900/30 rounded-3xl text-center shadow-xl">
        <AlertTriangle className="mx-auto text-rose-500 dark:text-rose-400 mb-4" size={40} />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Connection Error</h3>
        <p className="text-gray-700 dark:text-rose-300 text-sm mb-6">{error}</p>
        <button onClick={loadData} className="px-6 py-3 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-xl">
          Retry Connection
        </button>
      </div>
    );
  }

  // Separate crypto and tech stocks
  const techStocks = stocks.filter(s => !['BTC', 'ETH'].includes(s.ticker));
  const cryptoStocks = stocks.filter(s => ['BTC', 'ETH'].includes(s.ticker));

  return (
    <div className="flex flex-col gap-4 w-full max-w-[1600px] mx-auto h-[calc(100vh-80px)] overflow-hidden pb-2">
      {/* Tech Stocks Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-lg flex-shrink-0">
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '24px 24px' }}></div>
        <div className="relative">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Tech Stocks</h2>
            {isLive && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <Radio className="text-emerald-500 animate-pulse" size={12} />
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Live: {Math.round(latency / 1000)}s Latency</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {techStocks.map((s, i) => {
              const livePoint = realtimeData[s.ticker];
              const displayPrice = livePoint ? livePoint.price : s.close;
              const displayReturn = livePoint?.daily_return ?? s.daily_return;

              return (
                <div
                  key={s.ticker}
                  onClick={() => onTickerSelect?.(s.ticker)}
                  className={`bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 p-3 rounded-xl hover:border-blue-500/40 dark:hover:border-blue-500/40 cursor-pointer transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 ${livePoint ? 'ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5' : ''}`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        {getLogo(s.ticker) && <img src={getLogo(s.ticker) || ""} alt={s.ticker} className="w-5 h-5 object-contain" />}
                        <p className="text-gray-700 dark:text-slate-400 text-[10px] font-bold uppercase tracking-tight">{s.ticker}</p>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white">
                        ${typeof displayPrice === 'number' ? displayPrice.toFixed(2) : '0.00'}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {livePoint && (
                          <span className="text-[9px] text-emerald-500 font-black animate-pulse flex items-center gap-0.5">
                            <Radio size={8} /> LIVE
                          </span>
                        )}
                        <div className="flex flex-col">
                          <span className={`text-sm font-black leading-none ${displayReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {displayReturn >= 0 ? '+' : ''}{displayReturn.toFixed(2)}%
                          </span>
                          <span className="text-[8px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider leading-none mt-0.5">
                            today
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`p-1.5 rounded-lg flex flex-col items-center justify-center transition-colors duration-300 ${displayReturn >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {displayReturn >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">RSI</span>
                      {!livePoint && (
                        <span className="text-[7px] text-gray-400 dark:text-slate-600 font-bold uppercase tracking-wider border border-gray-200 dark:border-slate-700 px-0.5 rounded">prev</span>
                      )}
                    </div>
                    <span className={`font-mono font-bold text-xs ${s.rsi_14 > 70 ? 'text-rose-500' : s.rsi_14 < 30 ? 'text-emerald-500' : 'text-gray-900 dark:text-slate-200'}`}>
                      {s.rsi_14?.toFixed(2) || "N/A"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row - Takes remaining height */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">

        {/* Crypto Section (Col Span 3) */}
        <div className="lg:col-span-3 flex flex-col h-full bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950 p-3 rounded-2xl border border-purple-100 dark:border-purple-900/30 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '24px 24px' }}></div>
          <div className="relative flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-black bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent">Crypto Markets</h2>
            </div>
            <div className="flex-1 overflow-auto pr-1">
              <CryptoCards onTickerSelect={onTickerSelect} historicalData={cryptoStocks} realtimeUpdates={realtimeData} />
            </div>
          </div>
        </div>

        {/* Global Fundamentals Section (Col Span 5) */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col h-full min-h-0 overflow-hidden">
          <FundamentalsCards compact={true} />
        </div>

        {/* News & Sentiment Feed (Col Span 4) */}
        <div className="lg:col-span-3 xl:col-span-4 flex flex-col h-full min-h-0 overflow-hidden">
          <SentimentFeed />
        </div>
      </div>

      {/* Footer Note - Always visible */}
      <div className="flex items-center justify-center gap-1.5 mt-auto flex-shrink-0 pt-1">
        <div className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
        <p className="text-[9px] text-gray-500 dark:text-slate-500 font-medium">
          Market Data refreshes weekdays at 8:00 PM ET
        </p>
      </div>
    </div>
  );
};