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
          setStocks([]);
        }
      })
      .catch(err => {
        setError("Failed to load market data. " + (err.message || ""));
      })
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
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

  const techStocks = stocks.filter(s => !['BTC', 'ETH'].includes(s.ticker));
  const cryptoStocks = stocks.filter(s => ['BTC', 'ETH'].includes(s.ticker));

  return (
    // Strict proportional column — fills the bounded h-screen shell, no overflow
    <div className="h-full w-full max-w-7xl mx-auto flex flex-col gap-3 overflow-hidden">

      {/* ── Tech Stocks ── flex-[3]: takes ~60% of height */}
      <div className="relative flex-[3] min-h-0 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 p-3 md:p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-lg shadow-blue-500/5">
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '30px 30px' }}></div>
        <div className="relative h-full flex flex-col">
          {/* Header row */}
          <div className="flex justify-between items-center mb-2 shrink-0">
            <h2 className="text-base md:text-lg font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Tech Stocks</h2>
            {isLive && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <Radio className="text-emerald-500 animate-pulse" size={12} />
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest hidden sm:inline">Live: {Math.round(latency / 1000)}s Latency</span>
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest sm:hidden">Live</span>
              </div>
            )}
          </div>
          {/* Cards grid — flex-1 ensures it fills remaining height inside the panel */}
          <div className="flex-1 min-h-0 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-3 content-start">
            {techStocks.map((s, i) => {
              const livePoint = realtimeData[s.ticker];
              const displayPrice = livePoint ? livePoint.price : s.close;
              const displayReturn = livePoint?.daily_return ?? s.daily_return;

              return (
                <div
                  key={s.ticker}
                  onClick={() => onTickerSelect?.(s.ticker)}
                  className={`bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 p-3 rounded-xl hover:border-blue-500/40 dark:hover:border-blue-500/40 cursor-pointer transition-all duration-300 animate-in fade-in fill-mode-backwards hover:shadow-md hover:shadow-blue-500/10 hover:-translate-y-0.5 flex flex-col justify-between ${livePoint ? 'ring-1 ring-emerald-500/20 shadow-sm shadow-emerald-500/10' : ''}`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Top row: logo + ticker + trend icon */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5">
                      {getLogo(s.ticker) && <img src={getLogo(s.ticker) || ""} alt={s.ticker} className="w-5 h-5 object-contain" />}
                      <p className="text-gray-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-tight">{s.ticker}</p>
                    </div>
                    <div className={`p-1 rounded-lg ${displayReturn >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {displayReturn >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mt-1">
                    <div className="flex items-center gap-1">
                      {livePoint && <Radio size={8} className="text-emerald-500 animate-pulse shrink-0" />}
                      <span className="text-lg md:text-xl font-black text-gray-900 dark:text-white leading-none">
                        ${typeof displayPrice === 'number' ? displayPrice.toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <span className={`text-sm font-black ${displayReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {displayReturn >= 0 ? '+' : ''}{displayReturn.toFixed(2)}%
                    </span>
                  </div>

                  {/* RSI row */}
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
                    <span className="text-gray-400 dark:text-slate-500 text-[9px] font-semibold uppercase tracking-wider">RSI</span>
                    <span className={`font-mono font-bold text-[11px] ${s.rsi_14 > 70 ? 'text-rose-500' : s.rsi_14 < 30 ? 'text-emerald-500' : 'text-gray-700 dark:text-slate-300'}`}>
                      {s.rsi_14?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Crypto Markets ── flex-[2]: takes ~40% of height */}
      <div className="relative flex-[2] min-h-0 overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950 p-3 md:p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30 shadow-lg shadow-purple-500/5">
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '30px 30px' }}></div>
        <div className="relative h-full flex flex-col">
          <div className="flex justify-between items-center mb-2 shrink-0">
            <h2 className="text-base md:text-lg font-black bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent">Crypto Markets</h2>
            {isLive && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-500/10 rounded-full border border-purple-500/20">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping" />
                <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Real-time</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <CryptoCards onTickerSelect={onTickerSelect} historicalData={cryptoStocks} realtimeUpdates={realtimeData} />
          </div>
        </div>
      </div>

      {/* ── Footer note ── fixed height, never grows */}
      <div className="shrink-0 flex items-center justify-center gap-2 py-1">
        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        <p className="text-[9px] text-gray-500 dark:text-slate-500 font-medium">
          Market Data refreshes weekdays at 8:00 PM ET
        </p>
      </div>

    </div>
  );
};