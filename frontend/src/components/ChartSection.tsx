import React, { useEffect, useState } from 'react';
import { ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
import { getLogo } from '../helpers/logos';

export const ChartSection = () => {
  const [ticker, setTicker] = useState('AAPL');
  const [allPoints, setAllPoints] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [range, setRange] = useState('1M');

  useEffect(() => {
    api.getChart(ticker).then(data => {
      setAllPoints(data.points);
    });
  }, [ticker]);

  useEffect(() => {
    if (allPoints.length === 0) return;

    // Filter based on range
    let sliceCount = 30; // Default 1M
    if (range === '7D') sliceCount = 7;
    if (range === '1M') sliceCount = 30;
    if (range === '3M') sliceCount = 90;
    if (range === '6M') sliceCount = 180;

    setPoints(allPoints.slice(-sliceCount));
  }, [allPoints, range]);

  return (
    <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-6 md:gap-0">
        <div className="flex items-center gap-4 w-full md:w-auto">
          {getLogo(ticker) && <img src={getLogo(ticker) || ""} alt={ticker} className="w-12 h-12 md:w-14 md:h-14 object-contain" />}
          <div className="flex-1 md:flex-none">
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">Market Momentum</h2>

            {/* Time Range Selector */}
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              {['7D', '1M', '3M', '6M'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors border whitespace-nowrap ${range === r
                      ? 'bg-blue-500 text-white border-blue-400'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-2 w-full md:w-auto justify-between md:justify-start">
          <select value={ticker} onChange={(e) => setTicker(e.target.value)} className="bg-slate-800 text-white rounded-lg px-3 py-2 md:py-1 outline-none text-sm w-full md:w-auto">
            {["AAPL", "AMZN", "META", "NFLX", "GOOGL"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {points.length > 0 && points[points.length - 1].rsi_14 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Current RSI (14)</span>
              <span className={`text-sm font-bold ${points[points.length - 1].rsi_14 > 70 ? 'text-red-400' :
                points[points.length - 1].rsi_14 < 30 ? 'text-green-400' :
                  'text-white'
                }`}>
                {points[points.length - 1].rsi_14.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Combined Price & Volume Chart */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.2} />

            {/* X Axis */}
            <XAxis
              dataKey="trade_date"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
              minTickGap={30}
            />

            {/* Left Axis: Price */}
            <YAxis
              yAxisId="left"
              domain={['auto', 'auto']}
              stroke="#475569"
              fontSize={10}
              tickFormatter={(val) => val.toFixed(0)}
              width={40}
            />

            {/* Right Axis: RSI (Hidden/Optional) or just hide it to clean up */}
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} hide />

            {/* Volume Axis (Hidden, scaled to bottom 20%) */}
            <YAxis yAxisId="volume" orientation="right" domain={[0, 'dataMax * 5']} hide />

            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
              itemStyle={{ fontSize: '12px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
              labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
              formatter={(value: any, name: any) => {
                if (name === "Volume") return [new Intl.NumberFormat('en-US', { notation: "compact" }).format(value), name];
                if (typeof value === 'number') return [value.toFixed(2), name];
                return [value, name];
              }}
            />

            {/* Volume Bars (Bottom Layer) */}
            <Bar yAxisId="volume" dataKey="total_volume" name="Volume" fill="#3b82f6" opacity={0.15} radius={[2, 2, 0, 0]} />

            {/* Price Area */}
            <Area yAxisId="left" type="monotone" dataKey="close" name="Price" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} />

            {/* Moving Averages */}
            <Line yAxisId="left" type="monotone" dataKey="ma_20" name="SMA 20" stroke="#fbbf24" strokeWidth={1.5} dot={false} opacity={0.7} />
            <Line yAxisId="left" type="monotone" dataKey="ma_50" name="SMA 50" stroke="#f87171" strokeWidth={1.5} dot={false} opacity={0.7} />

          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};