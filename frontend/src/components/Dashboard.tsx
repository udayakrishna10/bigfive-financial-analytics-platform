import { useEffect, useState } from 'react';
import { api, TickerData } from '../services/api';
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Radio } from 'lucide-react';
import { getLogo } from '../helpers/logos';
import { CryptoCards } from './CryptoCards';
import { useRealtimeData } from '../hooks/useRealtimeData';

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
    <div className="flex flex-col gap-4 w-full max-w-7xl mx-auto h-full md:overflow-y-auto md:overflow-x-hidden custom-scrollbar pb-4 pr-1">
      {/* Tech Stocks Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-lg shadow-blue-500/5 shrink-0">
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '30px 30px' }}></div>
        <div className="relative">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Tech Stocks</h2>
            {isLive && (
              <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <Radio className="text-emerald-500 animate-pulse" size={14} />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live: {Math.round(latency / 1000)}s Latency</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {techStocks.map((s, i) => {
              const livePoint = realtimeData[s.ticker];
              const displayPrice = livePoint ? livePoint.price : s.close;
              const displayReturn = livePoint?.daily_return ?? s.daily_return;

              return (
                <div
                  key={s.ticker}
                  onClick={() => onTickerSelect?.(s.ticker)}
                  className={`bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 p-4 rounded-xl hover:border-blue-500/40 dark:hover:border-blue-500/40 cursor-pointer transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 ${livePoint ? 'ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5' : ''}`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {getLogo(s.ticker) && <img src={getLogo(s.ticker) || ""} alt={s.ticker} className="w-6 h-6 object-contain" />}
                        <p className="text-gray-700 dark:text-slate-400 text-xs font-bold uppercase tracking-tight">{s.ticker}</p>
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                        ${typeof displayPrice === 'number' ? displayPrice.toFixed(2) : '0.00'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {livePoint && (
                          <span className="text-[10px] text-emerald-500 font-black animate-pulse flex items-center gap-1">
                            <Radio size={10} /> LIVE
                          </span>
                        )}
                        <div className="flex flex-col">
                          <span className={`text-base font-black ${displayReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {displayReturn >= 0 ? '+' : ''}{displayReturn.toFixed(2)}%
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                            today
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`p-2 rounded-xl flex flex-col items-center justify-center transition-colors duration-300 ${displayReturn >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {displayReturn >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-gray-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">RSI</span>
                    <span className={`font-mono font-bold text-sm ${s.rsi_14 > 70 ? 'text-rose-500' : s.rsi_14 < 30 ? 'text-emerald-500' : 'text-gray-900 dark:text-slate-200'}`}>
                      {s.rsi_14?.toFixed(2) || "N/A"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Crypto Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30 shadow-lg shadow-purple-500/5 shrink-0">
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '30px 30px' }}></div>
        <div className="relative">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent">Crypto Markets</h2>
            {isLive && (
              <div className="flex items-center gap-2 px-2 py-1 bg-purple-500/10 rounded-full border border-purple-500/20">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping" />
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Real-time Stream</span>
              </div>
            )}
          </div>
          <CryptoCards onTickerSelect={onTickerSelect} historicalData={cryptoStocks} realtimeUpdates={realtimeData} />
        </div>
      </div>

      {/* Footer Note - Always visible */}
      <div className="flex items-center justify-center gap-2 mt-auto flex-shrink-0 pt-2">
        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        <p className="text-[10px] text-gray-600 dark:text-slate-500 font-medium">
          Market Data refreshes weekdays at 8:00 PM ET
        </p>
      </div>
    </div>
  );
};