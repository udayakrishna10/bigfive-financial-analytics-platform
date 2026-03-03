import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { API_CONFIG } from '../config';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { TickerData } from '../services/api';
import { getLogo } from '../helpers/logos';
import { RealtimeMessage } from '../hooks/useRealtimeData';

interface CryptoData {
    bitcoin: {
        usd: number;
        usd_24h_change: number;
        usd_market_cap: number;
        usd_24h_vol: number;
    };
    ethereum: {
        usd: number;
        usd_24h_change: number;
        usd_market_cap: number;
        usd_24h_vol: number;
    };
}

interface CryptoCardsProps {
    onTickerSelect?: (ticker: string) => void;
    historicalData?: TickerData[];
    realtimeUpdates?: Record<string, RealtimeMessage>;
}

export function CryptoCards({ onTickerSelect, historicalData = [], realtimeUpdates = {} }: CryptoCardsProps) {
    const [crypto, setCrypto] = useState<CryptoData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCrypto = async () => {
            try {
                const response = await fetch(`${API_CONFIG.BASE_URL}/crypto`);
                const data = await response.json();
                setCrypto(data);
            } catch (error) {
                console.error('Failed to fetch crypto:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCrypto();
        const interval = setInterval(fetchCrypto, 60000); // Update every 1 min
        return () => clearInterval(interval);
    }, []);

    if (loading && !crypto && historicalData.length === 0) {
        return (
            <div className="flex flex-col gap-1.5 mb-2">
                {[1, 2].map((i) => (
                    <div key={i} className="bg-slate-900/50 rounded-xl p-3 animate-pulse h-16"></div>
                ))}
            </div>
        );
    }

    const cryptos = [
        { name: 'Bitcoin', symbol: 'BTC', cgKey: 'bitcoin' as const, color: '#f97316' },
        { name: 'Ethereum', symbol: 'ETH', cgKey: 'ethereum' as const, color: '#3b82f6' },
    ];

    return (
        <div className="flex flex-col gap-1.5">
            {cryptos.map(({ name, symbol, cgKey }) => {
                const bqData = historicalData.find(h => h.ticker === symbol);
                const cgData = crypto ? crypto[cgKey] : null;
                const livePoint = realtimeUpdates[symbol];

                // Price priority: live realtime (yfinance SSE) → BigQuery historical close → CoinGecko
                const price = livePoint?.price ?? bqData?.close ?? cgData?.usd ?? 0;

                // % change priority: live realtime (yfinance, same source as chart) → BigQuery daily_return
                // CoinGecko usd_24h_change is a rolling 24h figure — intentionally NOT used here
                // because it differs from the chart's day-over-day prev_close calculation
                const change = livePoint?.daily_return ?? bqData?.daily_return ?? cgData?.usd_24h_change ?? 0;

                const mcap = cgData?.usd_market_cap ?? 0;
                const volume = cgData?.usd_24h_vol ?? 0;

                const hasData = cgData || bqData || livePoint;
                if (!hasData) return null;

                const isPositive = change >= 0;
                const history = bqData?.history || [];

                return (
                    <div
                        key={symbol}
                        onClick={() => onTickerSelect?.(symbol)}
                        className="bg-white dark:bg-slate-800/50 rounded-xl p-1.5 border border-gray-200 dark:border-slate-700/50 hover:border-purple-500/40 dark:hover:border-purple-500/40 cursor-pointer transition-all duration-300 hover:shadow-sm hover:shadow-purple-500/10 hover:-translate-y-0.5 relative overflow-hidden group flex flex-col justify-between"
                    >
                        <div className="flex justify-between items-start mb-1 relative z-10">
                            <div>
                                <div className="flex items-center gap-1 mb-0.5">
                                    {getLogo(symbol) && <img src={getLogo(symbol) || ""} alt={symbol} className="w-3.5 h-3.5 object-contain" />}
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white">{name}</h3>
                                    <span className="text-[8px] font-mono font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-1 py-0.5 rounded-md">{symbol}</span>
                                </div>
                                <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none mt-1">
                                    ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className={`flex flex-col items-end ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                <div className={`flex items-center gap-1 px-1 py-0.5 rounded-md ${isPositive ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                    {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                    <span className="font-bold text-[10px]">{Math.abs(change).toFixed(2)}%</span>
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                    {!cgData && !livePoint && <span className="text-[8px] text-gray-400 font-medium">Delayed</span>}
                                    {livePoint && <span className="text-[8px] text-purple-500 font-bold animate-pulse">LIVE</span>}
                                    <span className="text-[8px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                                        24H
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-end justify-between relative z-10">
                            <div className="flex flex-col leading-tight">
                                {mcap > 0 && (
                                    <p className="text-[9px] text-gray-600 dark:text-slate-400 font-medium flex gap-1">
                                        <span>MC:</span> <span className="font-mono font-bold text-gray-900 dark:text-slate-200">${(mcap / 1e9).toFixed(1)}B</span>
                                    </p>
                                )}
                                {volume > 0 && (
                                    <p className="text-[9px] text-gray-600 dark:text-slate-400 font-medium flex gap-1">
                                        <span>Vol:</span> <span className="font-mono font-bold text-gray-900 dark:text-slate-200">${(volume / 1e9).toFixed(1)}B</span>
                                    </p>
                                )}
                            </div>

                            <div className="h-6 w-16 opacity-80">
                                {history.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={history}>
                                            <Line
                                                type="monotone"
                                                dataKey="close"
                                                stroke={isPositive ? '#10b981' : '#f43f5e'}
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', padding: '4px 6px' }}
                                                itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                                                labelStyle={{ display: 'none' }}
                                                formatter={(val: number) => [`$${val.toLocaleString()}`, '']}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-xs text-slate-500 font-medium">
                                        No History
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
