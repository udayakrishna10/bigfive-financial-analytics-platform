import { useEffect, useState } from 'react';
// 1. Import TickerData here
import { api, TickerData } from '../services/api';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getLogo } from '../helpers/logos';

export const Dashboard = () => {
  // 2. Add <TickerData[]> to the state
  const [stocks, setStocks] = useState<TickerData[]>([]);

  useEffect(() => {
    // 3. Optional: Add error handling to prevent crashes
    api.getDashboard()
      .then(data => setStocks(data.tickers))
      .catch(err => console.error("Dashboard fetch failed:", err));
  }, []);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 4. Now 's' is automatically typed as TickerData */}
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
              {/* Lightning icon removed */}
              <span className="text-xs text-slate-500 uppercase">RSI:</span>
              <span className={`text-sm font-mono ${s.rsi_14 > 70 ? 'text-rose-400' : s.rsi_14 < 30 ? 'text-emerald-400' : 'text-slate-200'}`}>
                {s.rsi_14.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 pb-8">
        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        <p className="text-[10px] text-slate-500 font-mono">
          Note: Data refreshes daily at ~6:00 PM EST (DAG Execution).
        </p>
      </div>
    </div>
  );
};