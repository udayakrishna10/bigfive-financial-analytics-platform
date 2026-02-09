import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { API_CONFIG } from '../config';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { TickerData } from '../services/api';
import { getLogo } from '../helpers/logos';

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
}

export function CryptoCards({ onTickerSelect, historicalData = [] }: CryptoCardsProps) {
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {[1, 2].map((i) => (
                    <div key={i} className="bg-slate-900/50 rounded-xl p-6 animate-pulse h-32"></div>
                ))}
            </div>
        );
    }

    const cryptos = [
        { name: 'Bitcoin', symbol: 'BTC', cgKey: 'bitcoin' as const, color: '#f97316' },
        { name: 'Ethereum', symbol: 'ETH', cgKey: 'ethereum' as const, color: '#3b82f6' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cryptos.map(({ name, symbol, cgKey }) => {
                const bqData = historicalData.find(h => h.ticker === symbol);
                const cgData = crypto ? crypto[cgKey] : null;

                // Prioritize CoinGecko data, fallback to BigQuery
                const price = cgData?.usd ?? bqData?.close ?? 0;
                const change = cgData?.usd_24h_change ?? bqData?.daily_return ?? 0;
                const mcap = cgData?.usd_market_cap ?? 0;
                const volume = cgData?.usd_24h_vol ?? 0; // BQ doesn't have volume in TickerData yet

                const hasData = cgData || bqData;
                if (!hasData) return null; // Should not render if no data at all

                const isPositive = change >= 0;
                const history = bqData?.history || [];

                return (
                    <div
                        key={symbol}
                        onClick={() => onTickerSelect?.(symbol)}
                        className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700/50 hover:border-purple-500/40 dark:hover:border-purple-500/40 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5 relative overflow-hidden group"
                    >
                        <div className="flex justify-between items-start mb-3 relative z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    {getLogo(symbol) && <img src={getLogo(symbol) || ""} alt={symbol} className="w-6 h-6 object-contain" />}
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white">{name}</h3>
                                    <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg">{symbol}</span>
                                </div>
                                <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                    ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className={`flex flex-col items-end ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${isPositive ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                    {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    <span className="font-bold text-sm">{Math.abs(change).toFixed(2)}%</span>
                                </div>
                                {!cgData && <span className="text-[10px] text-gray-400 mt-1 font-medium">Delayed</span>}
                            </div>
                        </div>

                        <div className="flex items-end justify-between relative z-10">
                            <div className="flex flex-col gap-1">
                                {mcap > 0 && (
                                    <p className="text-xs text-gray-600 dark:text-slate-400 font-medium">
                                        MCap: <span className="font-mono font-bold text-gray-900 dark:text-slate-200">${(mcap / 1e9).toFixed(1)}B</span>
                                    </p>
                                )}
                                {volume > 0 && (
                                    <p className="text-xs text-gray-600 dark:text-slate-400 font-medium">
                                        Vol (24h): <span className="font-mono font-bold text-gray-900 dark:text-slate-200">${(volume / 1e9).toFixed(1)}B</span>
                                    </p>
                                )}
                            </div>

                            {/* Sparkline */}
                            <div className="h-12 w-28">
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
