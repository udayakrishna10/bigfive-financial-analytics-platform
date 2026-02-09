import { useEffect, useState } from 'react';
import { ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../services/api';
import { getLogo } from '../helpers/logos';
import { Layers, Activity, BarChart2 } from 'lucide-react';

interface ChartSectionProps {
  ticker?: string;
  onTickerChange?: (ticker: string) => void;
}

export const ChartSection = ({ ticker: propTicker, onTickerChange }: ChartSectionProps) => {
  const [internalTicker, setInternalTicker] = useState('AAPL');
  const ticker = propTicker || internalTicker;

  const handleTickerChange = (t: string) => {
    if (onTickerChange) {
      onTickerChange(t);
    } else {
      setInternalTicker(t);
    }
  };

  const [allPoints, setAllPoints] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [range, setRange] = useState('3M');

  // Indicator Toggles
  const [showBB, setShowBB] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showVolume, setShowVolume] = useState(true);

  useEffect(() => {
    api.getChart(ticker).then(data => {
      setAllPoints(data.points);
    });
  }, [ticker]);

  useEffect(() => {
    if (allPoints.length === 0) return;

    // Filter based on range
    let sliceCount = 90; // Default 3M
    if (range === '7D') sliceCount = 7;
    if (range === '1M') sliceCount = 30;
    if (range === '3M') sliceCount = 90;
    if (range === '6M') sliceCount = 180;
    if (range === '1Y') sliceCount = 252;
    if (range === 'ALL') sliceCount = allPoints.length;

    setPoints(allPoints.slice(-sliceCount));
  }, [allPoints, range]);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 border border-blue-100 dark:border-blue-900/30 p-5 rounded-2xl backdrop-blur-xl shadow-lg shadow-blue-500/5">
      <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '30px 30px' }}></div>
      <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center mb-5 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          {getLogo(ticker) && <img src={getLogo(ticker) || ""} alt={ticker} className="w-10 h-10 object-contain" />}
          <div className="flex-1">
            <h2 className="text-lg font-black bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">Market Momentum</h2>

            {/* Time Range Selector */}
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              {['7D', '1M', '3M', '6M'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all border whitespace-nowrap ${range === r
                    ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full xl:w-auto">
          {/* Indicator Toggles */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`p-2 rounded-md transition-all ${showVolume ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}
              title="Toggle Volume"
            >
              <BarChart2 size={16} />
            </button>
            <button
              onClick={() => setShowBB(!showBB)}
              className={`p-2 rounded-md transition-all ${showBB ? 'bg-white dark:bg-slate-700 text-purple-500 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}
              title="Toggle Bollinger Bands"
            >
              <Layers size={16} />
            </button>
            <button
              onClick={() => setShowMACD(!showMACD)}
              className={`p-2 rounded-md transition-all ${showMACD ? 'bg-white dark:bg-slate-700 text-orange-500 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}
              title="Toggle MACD"
            >
              <Activity size={16} />
            </button>
          </div>

          <div className="flex gap-4 items-center w-full md:w-auto">
            <select value={ticker} onChange={(e) => handleTickerChange(e.target.value)} className="bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg px-4 py-2 outline-none text-sm w-full md:w-auto border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20">
              {["AAPL", "AMZN", "META", "NFLX", "GOOGL", "BTC", "ETH"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {points.length > 0 && points[points.length - 1].rsi_14 && (
              <div className="flex flex-col items-end min-w-[80px]">
                <span className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase">RSI (14)</span>
                <span className={`text-lg font-bold leading-none ${points[points.length - 1].rsi_14 > 70 ? 'text-rose-500' :
                  points[points.length - 1].rsi_14 < 30 ? 'text-emerald-500' :
                    'text-gray-900 dark:text-white'
                  }`}>
                  {points[points.length - 1].rsi_14.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Main Price Chart */}
        <div className={`transition-all duration-500 ${showMACD ? 'h-[350px]' : 'h-[500px]'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} syncId="priceChart">
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.1} />

              <XAxis
                dataKey="trade_date"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                minTickGap={30}
                hide={showMACD} // Hide X axis if MACD is shown below
              />

              <YAxis
                yAxisId="left"
                domain={['auto', 'auto']}
                stroke="#64748b"
                fontSize={10}
                tickFormatter={(val) => val.toFixed(0)}
                width={40}
                tickLine={false}
                axisLine={false}
              />

              {showVolume && <YAxis yAxisId="volume" orientation="right" domain={[0, 'dataMax * 4']} hide />}

              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', padding: '8px' }}
                itemStyle={{ fontSize: '11px', color: '#e2e8f0' }}
                labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px', fontWeight: 600 }}
                labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                formatter={(value: any, name: any) => {
                  if (name === "Volume") return [new Intl.NumberFormat('en-US', { notation: "compact" }).format(value), name];
                  if (typeof value === 'number') return [value.toFixed(2), name];
                  return [value, name];
                }}
              />

              {/* Volume Bars */}
              {showVolume && <Bar yAxisId="volume" dataKey="total_volume" name="Volume" fill="#3b82f6" opacity={0.1} radius={[2, 2, 0, 0]} />}

              {/* Price Area */}
              <Area yAxisId="left" type="monotone" dataKey="close" name="Price" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} activeDot={{ r: 4, strokeWidth: 0 }} />

              {/* Moving Averages */}
              <Line yAxisId="left" type="monotone" dataKey="ma_20" name="SMA 20" stroke="#fbbf24" strokeWidth={1} dot={false} opacity={0.8} />
              <Line yAxisId="left" type="monotone" dataKey="ma_50" name="SMA 50" stroke="#f87171" strokeWidth={1} dot={false} opacity={0.8} />

              {/* Bollinger Bands */}
              {showBB && (
                <>
                  <Line yAxisId="left" type="monotone" dataKey="bb_upper" name="BB Upper" stroke="#a855f7" strokeWidth={1} dot={false} strokeDasharray="3 3" opacity={0.6} />
                  <Line yAxisId="left" type="monotone" dataKey="bb_lower" name="BB Lower" stroke="#a855f7" strokeWidth={1} dot={false} strokeDasharray="3 3" opacity={0.6} />
                  <Line yAxisId="left" type="monotone" dataKey="bb_middle" name="BB Middle" stroke="#c084fc" strokeWidth={1} dot={false} strokeDasharray="5 5" opacity={0.3} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* MACD Chart (Synced) */}
        {showMACD && (
          <div className="h-[150px] animate-in fade-in slide-in-from-top-4 duration-300">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} syncId="priceChart">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.1} />
                <XAxis
                  dataKey="trade_date"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                  minTickGap={30}
                />
                <YAxis domain={['auto', 'auto']} fontSize={10} width={40} tickFormatter={(val) => val.toFixed(1)} stroke="#64748b" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', padding: '8px' }}
                  itemStyle={{ fontSize: '11px', color: '#e2e8f0' }}
                  labelStyle={{ display: 'none' }}
                  formatter={(value: any, name: any) => [value.toFixed(3), name]}
                />

                {/* MACD Histogram */}
                <Bar dataKey="macd_histogram" name="Histogram" radius={[2, 2, 0, 0]}>
                  {points.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.macd_histogram > 0 ? '#22c55e' : '#ef4444'} opacity={0.6} />
                  ))}
                </Bar>

                {/* MACD Lines */}
                <Line type="monotone" dataKey="macd_line" name="MACD" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="macd_signal" name="Signal" stroke="#f97316" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] text-gray-500 font-mono">LATEST CLOSE</p>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-600 font-mono">
          Updated: Today
        </p>
      </div>
    </div>
  );
};