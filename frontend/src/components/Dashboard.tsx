import { useEffect, useState } from 'react';
import { api, TickerData } from '../services/api';
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from 'lucide-react';
import { getLogo } from '../helpers/logos';

export const Dashboard = () => {
  const [stocks, setStocks] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          // Don't error hard, just show empty
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
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-center">
        <AlertTriangle className="mx-auto text-rose-400 mb-2" size={32} />
        <h3 className="text-white font-bold mb-1">Connection Error</h3>
        <p className="text-rose-300 text-sm mb-4">{error}</p>
        <button onClick={loadData} className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-sm transition-colors">
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stocks.map((s, i) => (
          <div
            key={s.ticker}
            className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-blue-500/40 transition-all animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 mb-1">
                  {getLogo(s.ticker) && <img src={getLogo(s.ticker) || ""} alt={s.ticker} className="w-8 h-8 object-contain" />}
                  <p className="text-slate-500 text-xs font-black uppercase tracking-tighter">{s.ticker}</p>
                </div>
                <h3 className="text-3xl font-bold text-white mt-1">
                  ${typeof s.close === 'number' ? s.close.toFixed(2) : '0.00'}
                </h3>
              </div>
              <div className={`p-2 rounded-xl ${s.daily_return >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {s.daily_return >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-2">
              <span className="text-xs text-slate-500 uppercase">RSI:</span>
              <span className={`text-sm font-mono ${s.rsi_14 > 70 ? 'text-rose-400' : s.rsi_14 < 30 ? 'text-emerald-400' : 'text-slate-200'}`}>
                {s.rsi_14?.toFixed(2) || "N/A"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 pb-8">
        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        <p className="text-[10px] text-slate-500 font-mono">
          Note: Data refreshes daily at ~6:00 PM EST (Cloud Run Jobs).
        </p>
      </div>
    </div>
  );
};