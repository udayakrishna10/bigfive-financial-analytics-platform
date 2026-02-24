import { useEffect, useState, useMemo } from 'react';
import { ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { api } from '../services/api';
import { getLogo } from '../helpers/logos';
import { Layers, Activity, BarChart2, Radio } from 'lucide-react';
import { useRealtimeData } from '../hooks/useRealtimeData';

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

  const { realtimeData, isLive, latency } = useRealtimeData();
  const [allPoints, setAllPoints] = useState<any[]>([]);
  const [intradayPoints, setIntradayPoints] = useState<any[]>([]);
  const [intradayPrevClose, setIntradayPrevClose] = useState<number | null>(null);
  const [range, setRange] = useState('1D');


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
    if (range === '1D') {
      setIntradayPoints([]);          // clear stale data on ticker/range change
      setIntradayPrevClose(null);
      api.getIntradayHistory(ticker).then(data => {
        const pts = (data.points || []).map((p: any) => ({
          ...p,
          close: p.close || p.price,
          volume: p.volume ?? 0,                           // yfinance Volume column
          timestamp: new Date(p.timestamp).getTime()
        }));
        setIntradayPoints(pts);
        // Store the authoritative prev_close from the API response
        if (data.prev_close != null) {
          setIntradayPrevClose(Number(data.prev_close));
        }
      });
    }
  }, [ticker, range]);

  // Append live tick to base data for 1D view only
  const activePoints = useMemo(() => {
    let baseData = range === '1D' ? intradayPoints : allPoints;

    if (range !== '1D') {
      const sliceMap: Record<string, number> = { '7D': 7, '1M': 30, '3M': 90, '6M': 180 };
      baseData = baseData.slice(-(sliceMap[range] ?? 90));
      return baseData;
    }

    const liveTick = realtimeData[ticker];
    if (!liveTick || !isLive) return baseData;

    const lastPoint = baseData[baseData.length - 1];
    const livePoint = {
      ...(lastPoint ?? {}),
      close: liveTick.price,
      prev_close: liveTick.prev_close || lastPoint?.prev_close,
      daily_return: liveTick.daily_return,
      trade_date: liveTick.timestamp,
      timestamp: new Date(liveTick.timestamp).getTime(),
      volume: liveTick.volume_24h || lastPoint?.volume,
      total_volume: liveTick.volume_24h || lastPoint?.total_volume,
      isLive: true
    };

    if (!lastPoint) return [livePoint];

    const liveTime = new Date(liveTick.timestamp).getTime();
    const isNewer = liveTime > (lastPoint.timestamp || 0);
    if (isNewer) return [...baseData, livePoint];

    // Same or older minute: update last bar in-place
    const newData = [...baseData];
    newData[newData.length - 1] = { ...newData[newData.length - 1], ...livePoint };
    return newData;
  }, [allPoints, intradayPoints, range, realtimeData, ticker, isLive]);

  // `points` is a direct alias of activePoints (no extra render cycle)
  const points = activePoints;
  const referencePrice = useMemo(() => {
    if (points.length === 0) return null;
    if (range !== '1D') return points[0]?.close;
    // Priority: API-provided prev_close (most reliable, ticker-specific)
    // → prev_close embedded in points → realtime feed → first candle close
    if (intradayPrevClose != null) return intradayPrevClose;
    const pointWithRef = points.find(p => p.prev_close != null && p.prev_close > 0);
    if (pointWithRef?.prev_close) return pointWithRef.prev_close;
    const rtPrev = realtimeData[ticker]?.prev_close;
    if (rtPrev && rtPrev > 0) return rtPrev;
    return points[0]?.close;
  }, [points, range, ticker, realtimeData, intradayPrevClose]);

  // Compute current price and performance vs prev_close for 1D view
  const currentPrice = useMemo(() => {
    if (points.length === 0) return null;
    return points[points.length - 1]?.close || null;
  }, [points]);

  const isGaining = useMemo(() => {
    if (!referencePrice || !currentPrice) return null;
    return currentPrice >= referencePrice;
  }, [referencePrice, currentPrice]);

  // Calculate % change for display
  const percentChangeForDisplay = useMemo(() => {
    if (!referencePrice || !currentPrice) {
      if (range === '1D') {
        // Fallback to realtime data or historical daily_return
        return realtimeData[ticker]?.daily_return ?? (points.length > 0 ? points[points.length - 1]?.daily_return : null);
      }
      return null;
    }
    const sign = currentPrice >= referencePrice ? 1 : -1;
    return sign * Math.abs(((currentPrice - referencePrice) / referencePrice) * 100);
  }, [range, referencePrice, currentPrice, realtimeData, ticker, points]);

  const comparisonText = range === '1D' ? 'vs prev close' : `vs ${range.toLowerCase()} ago`;

  const timeDomain = useMemo((): [number, number] | undefined => {
    if (range !== '1D') return undefined;

    const isCrypto = ['BTC', 'ETH'].includes(ticker);

    if (isCrypto) {
      // Crypto is 24/7 — anchor to UTC midnight of the last data point's day
      let referenceDay = new Date();
      if (points && points.length > 0) {
        const lastPoint = points[points.length - 1];
        const t = lastPoint.timestamp != null ? lastPoint.timestamp : 0;
        referenceDay = new Date(t);
      }
      // Get YYYY-MM-DD in UTC
      const utcDateStr = referenceDay.toISOString().slice(0, 10);
      const start = new Date(`${utcDateStr}T00:00:00Z`).getTime();
      const end = new Date(`${utcDateStr}T23:59:59Z`).getTime();
      return [start, end];
    } else {
      // Stocks: 9:30 AM - 4:00 PM ET. Use last data point's date to handle weekends/holidays.
      let referenceDateStr = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
      if (points && points.length > 0) {
        const lastPoint = points[points.length - 1];
        const t = lastPoint.timestamp != null ? lastPoint.timestamp : new Date(lastPoint.trade_date || new Date()).getTime();
        referenceDateStr = new Date(t).toLocaleDateString('en-US', { timeZone: 'America/New_York' });
      }

      const pad = (n: number) => n.toString().padStart(2, '0');
      const [month, day, year] = referenceDateStr.split('/').map(Number);
      const dateStr = `${year}-${pad(month)}-${pad(day)}`;

      // Determine NY timezone offset dynamically (handles DST)
      const isDST = new Date(`${dateStr}T12:00:00Z`).toLocaleTimeString('en-US', { timeZoneName: 'short', timeZone: 'America/New_York' }).includes('EDT');
      const offset = isDST ? '-04:00' : '-05:00';

      const start = new Date(`${dateStr}T09:30:00${offset}`).getTime();
      const end = new Date(`${dateStr}T16:00:00${offset}`).getTime();
      return [start, end];
    }
  }, [range, ticker, points]);


  // Build 1D chartData with crossover interpolation and two split-color fields
  const chartData = useMemo(() => {
    if (range !== '1D' || !referencePrice) return points;

    const isCrypto = ['BTC', 'ETH'].includes(ticker);
    let targetDateET = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
    if (!isCrypto && points && points.length > 0) {
      const lastPoint = points[points.length - 1];
      const t = lastPoint.timestamp != null ? lastPoint.timestamp : new Date(lastPoint.trade_date || new Date()).getTime();
      targetDateET = new Date(t).toLocaleDateString('en-US', { timeZone: 'America/New_York' });
    }
    const todayUTC = new Date().toISOString().slice(0, 10);
    const todayOnly = points.filter((p: any) => {
      const t = p.timestamp != null ? p.timestamp : new Date(p.trade_date || p.timestamp).getTime();
      const dateStr = isCrypto
        ? new Date(t).toISOString().slice(0, 10)
        : new Date(t).toLocaleDateString('en-US', { timeZone: 'America/New_York' });
      return isCrypto ? dateStr === todayUTC : dateStr === targetDateET;
    });

    const ref = referencePrice;
    const result: any[] = [];

    for (let i = 0; i < todayOnly.length; i++) {
      const p = todayOnly[i];
      const close = p.close ?? 0;

      // Insert interpolated crossover point when the line crosses the reference
      if (i > 0) {
        const prev = todayOnly[i - 1];
        const prevClose = prev.close ?? 0;
        const wasAbove = prevClose >= ref;
        const isAbove = close >= ref;
        if (wasAbove !== isAbove) {
          const frac = (ref - prevClose) / (close - prevClose);
          const crossTs = Math.round(prev.timestamp + frac * (p.timestamp - prev.timestamp));
          result.push({
            ...p, timestamp: crossTs, close: ref,
            volume: 0, volumeSqrt: 0,
            closeAbove: ref, closeBelow: ref,
            greenY: ref, redY: ref,
          });
        }
      }

      result.push({
        ...p,
        closeAbove: close >= ref ? close : null,   // green segment
        closeBelow: close < ref ? close : null,   // red segment
        greenY: close > ref ? close : ref,
        redY: close < ref ? close : ref,
        // Sqrt-transform volume so 9:30 spike doesn't dominate the histogram
        volumeSqrt: Math.sqrt(p.volume || 0),
      });
    }

    return result;
  }, [points, range, referencePrice, ticker]);



  const xTickFormatter = (val: any) => {
    if (range === '1D') {
      const date = new Date(val);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    // For trade_date (YYYY-MM-DD), parse manually to avoid timezone shifts
    if (typeof val === 'string' && val.includes('-')) {
      const [year, month, day] = val.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const date = new Date(val);
    if (typeof val === 'number') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderLiveDot = (props: any) => {
    const { cx, cy, payload, index, value, dataKey } = props;

    // Only render the pulsing dot on the very last active live tick for 1D chart
    if (range !== '1D' || !payload.isLive || index !== chartData.length - 1 || value == null) {
      return <svg key={`empty-dot-${index}`}></svg>;
    }

    const isAbove = payload.close >= (referencePrice || 0);

    // Prevent double drawing. Only draw the dot for the matching split-line 
    if ((isAbove && dataKey === 'closeBelow') || (!isAbove && dataKey === 'closeAbove')) {
      return <svg key={`empty-dot-${index}`}></svg>;
    }

    const color = isAbove ? '#10b981' : '#f43f5e'; // emerald or rose

    return (
      <svg x={cx - 6} y={cy - 6} width={12} height={12} overflow="visible" key={`live-dot-${index}`}>
        <circle cx="6" cy="6" r="4" fill={color} />
        <circle cx="6" cy="6" r="6" fill={color} className="animate-ping origin-center opacity-75" />
        <circle cx="6" cy="6" r="1.5" fill="#fff" />
      </svg>
    );
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 border border-blue-100 dark:border-blue-900/30 p-4 md:p-5 rounded-2xl backdrop-blur-xl shadow-lg shadow-blue-500/5">
      <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '30px 30px' }}></div>
      <div className="relative flex flex-col xl:flex-row justify-between items-start mb-5 gap-5">

        {/* Left Side: Branding + Time + Price */}
        <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-4 justify-between sm:items-center">

          <div className="flex items-start md:items-center gap-3 shrink-0 min-w-0">
            {getLogo(ticker) && <img src={getLogo(ticker) || ""} alt={ticker} className="w-10 h-10 object-contain shrink-0 mt-1 sm:mt-0" />}
            <div className="flex flex-col min-w-0">
              <h2 className="text-[16px] sm:text-lg font-black bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent truncate">Market Momentum</h2>

              {/* Time Range Selector */}
              <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 overflow-x-auto pb-1 scrollbar-hide">
                {['1D', '7D', '1M', '3M', '6M'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-bold rounded-lg transition-all border whitespace-nowrap flex items-center gap-1.5 ${range === r
                      ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700'
                      }`}
                  >
                    {r === '1D' && isLive && <Radio size={10} className="animate-pulse text-white" />}
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Real-time Momentum Header (Price) */}
          <div className="flex flex-col items-start sm:items-end shrink-0 pl-1 sm:pl-0">
            <div className="flex items-baseline gap-2 sm:gap-3">
              <span className={`text-2xl sm:text-3xl font-black ${(percentChangeForDisplay ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                ${currentPrice?.toFixed(2) || realtimeData[ticker]?.price?.toFixed(2) || (points.length > 0 ? points[points.length - 1].close.toFixed(2) : '0.00')}
              </span>
              <div className="flex flex-col items-start">
                <span className={`text-sm sm:text-lg font-black ${(percentChangeForDisplay ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {(percentChangeForDisplay ?? 0) >= 0 ? '+' : ''}{(percentChangeForDisplay ?? 0).toFixed(2)}%
                </span>
                <span className="text-[8px] sm:text-[9px] text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  {comparisonText}
                </span>
              </div>
            </div>
            <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest whitespace-nowrap mt-1">
              {(realtimeData[ticker] || isLive) ? 'Live Market Momentum' : 'Historical Snapshot'}
            </span>
          </div>
        </div>

        {/* Right Side: Select & Toggles */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full xl:w-auto">
          {/* Indicator Toggles — some are hidden in 1D as they have no intraday data */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`p-2 rounded-md transition-all ${showVolume ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}
              title="Toggle Volume"
            >
              <BarChart2 size={16} />
            </button>
            {range !== '1D' && (
              <>
                <button
                  onClick={() => setShowBB(!showBB)}
                  className={`p-2 rounded-md transition-all ${showBB ? 'bg-white dark:bg-slate-700 text-purple-500 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}
                  title="Toggle SMA 20 / SMA 50 + Bollinger Bands"
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
              </>
            )}
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
            <ComposedChart data={range === '1D' && referencePrice ? chartData : points} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} syncId="priceChart">
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPriceGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPriceRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>

              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.1} />

              <XAxis
                dataKey={range === '1D' ? 'timestamp' : 'trade_date'}
                type={range === '1D' ? 'number' : 'category'}
                domain={timeDomain}
                allowDataOverflow={true}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={xTickFormatter}
                minTickGap={range === '1D' ? 60 : 30}
                hide={showMACD}
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

              {showVolume && <YAxis yAxisId="volume" orientation="right" domain={[0, (dataMax: number) => dataMax * 3]} hide />}

              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', padding: '8px' }}
                itemStyle={{ fontSize: '11px', color: '#e2e8f0' }}
                labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px', fontWeight: 600 }}
                labelFormatter={(label) => {
                  if (range === '1D') {
                    const date = new Date(label);
                    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                    return `${dateStr} • ${timeStr}`;
                  }

                  // Handle YYYY-MM-DD trade_date
                  if (typeof label === 'string' && label.includes('-')) {
                    const [year, month, day] = label.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                  }

                  const date = new Date(label);
                  return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                }}
                formatter={(value: any, name: any) => {
                  // Hide internal series keys — only expose user-meaningful data
                  const hidden = new Set(['greenY', 'redY', 'closeAbove', 'closeBelow', 'volumeSqrt']);
                  if (hidden.has(name)) return [null, null];
                  // Volume: reverse sqrt transform to show real share count
                  if (name === 'Volume') {
                    const realVol = range === '1D' ? Math.round(value * value) : value;
                    return [new Intl.NumberFormat('en-US', { notation: 'compact' }).format(realVol), 'Volume'];
                  }
                  if (name === 'Price' || name === '') return [`$${Number(value).toFixed(2)}`, 'Price'];
                  if (typeof value === 'number') return [`$${value.toFixed(2)}`, name];
                  return [value, name];
                }}
              />

              {/* Volume Bars — Light/Dark Blue based on theme */}
              {showVolume && (
                <Bar
                  yAxisId="volume"
                  dataKey={range === '1D' ? 'volumeSqrt' : 'total_volume'}
                  name="Volume"
                  fill={range === '1D' ? 'var(--volume-color)' : '#3b82f6'}
                  fillOpacity={0.4}
                  opacity={1}
                  barSize={range === '1D' ? 2 : undefined}
                  radius={[1, 1, 0, 0]}
                  isAnimationActive={false}
                />
              )}

              {/* Reference Line for 1D View - always grey */}
              {range === '1D' && referencePrice && (
                <ReferenceLine
                  yAxisId="left"
                  y={referencePrice}
                  stroke="#94a3b8"
                  strokeDasharray="8 4"
                  strokeWidth={2}
                  strokeOpacity={0.8}
                  label={{
                    value: `Prev Close: $${referencePrice.toFixed(2)}`,
                    position: 'insideTopRight',
                    fill: '#94a3b8',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                />
              )}

              {/* 1D: green fill above prev close, red fill below - matched to split line */}
              {range === '1D' && referencePrice && chartData.length > 0 && (
                <>
                  <Area
                    yAxisId="left" type="linear" dataKey="greenY"
                    stroke="none" fill="#10b981" fillOpacity={0.12}
                    baseValue={referencePrice} isAnimationActive={false}
                    connectNulls legendType="none"
                  />
                  <Area
                    yAxisId="left" type="linear" dataKey="redY"
                    stroke="none" fill="#f43f5e" fillOpacity={0.12}
                    baseValue={referencePrice} isAnimationActive={false}
                    connectNulls legendType="none"
                  />
                </>
              )}

              {/* 1D price line: TWO separate series that meet exactly at crossover — pixel-perfect green/red */}
              {range === '1D' && referencePrice ? (
                <>
                  <Line
                    yAxisId="left" type="linear" dataKey="closeAbove"
                    name="Price" stroke="#10b981" strokeWidth={2.5}
                    dot={renderLiveDot} activeDot={{ r: 4, strokeWidth: 0 }}
                    connectNulls={false} isAnimationActive={false}
                  />
                  <Line
                    yAxisId="left" type="linear" dataKey="closeBelow"
                    name="" stroke="#f43f5e" strokeWidth={2.5}
                    dot={renderLiveDot} activeDot={{ r: 4, strokeWidth: 0 }}
                    connectNulls={false} isAnimationActive={false}
                    legendType="none"
                  />
                </>
              ) : (
                <Area
                  yAxisId="left" type="linear" dataKey="close" name="Price"
                  stroke={isGaining === true ? '#10b981' : isGaining === false ? '#f43f5e' : '#3b82f6'}
                  fill={isGaining === true ? 'url(#colorPriceGreen)' : isGaining === false ? 'url(#colorPriceRed)' : 'url(#colorPrice)'}
                  fillOpacity={1} strokeWidth={2.5} dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              )}

              {/* SMA 20 / SMA 50 + Bollinger Bands — all toggled together via the BB button */}
              {range !== '1D' && showBB && (
                <>
                  {/* SMA lines */}
                  <Line yAxisId="left" type="linear" dataKey="ma_20" name="SMA 20" stroke="#fbbf24" strokeWidth={1.5} dot={false} opacity={0.9} />
                  <Line yAxisId="left" type="linear" dataKey="ma_50" name="SMA 50" stroke="#f87171" strokeWidth={1.5} dot={false} opacity={0.9} />
                  {/* Bollinger Bands */}
                  <Line yAxisId="left" type="linear" dataKey="bb_upper" name="BB Upper" stroke="#a855f7" strokeWidth={1} dot={false} strokeDasharray="3 3" opacity={0.6} />
                  <Line yAxisId="left" type="linear" dataKey="bb_lower" name="BB Lower" stroke="#a855f7" strokeWidth={1} dot={false} strokeDasharray="3 3" opacity={0.6} />
                  <Line yAxisId="left" type="linear" dataKey="bb_middle" name="BB Middle" stroke="#c084fc" strokeWidth={1} dot={false} strokeDasharray="5 5" opacity={0.3} />
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
                  dataKey={range === '1D' ? 'timestamp' : 'trade_date'}
                  type={range === '1D' ? 'number' : 'category'}
                  domain={timeDomain}
                  allowDataOverflow={true}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={xTickFormatter}
                  minTickGap={range === '1D' ? 60 : 30}
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
          <div className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
          <p className="text-[10px] text-gray-500 font-mono uppercase">
            {isLive ? 'Live Stream Active' : 'Delayed Data'}
          </p>
          {isLive && latency > 0 && (
            <span className="text-[10px] text-blue-500/60 font-mono ml-2">
              {(latency / 1000).toFixed(1)}s LAG
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-600 font-mono">
          Updated: {isLive ? 'Just now' : 'Today'}
        </p>
      </div>
    </div>
  );
};