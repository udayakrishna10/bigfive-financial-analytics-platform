import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { API_CONFIG } from '../config';

interface CryptoData {
    bitcoin: {
        usd: number;
        usd_24h_change: number;
        usd_market_cap: number;
    };
    ethereum: {
        usd: number;
        usd_24h_change: number;
        usd_market_cap: number;
    };
}

export function CryptoCards() {
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
        const interval = setInterval(fetchCrypto, 300000); // Update every 5 min
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                    <div key={i} className="bg-slate-900/50 rounded-xl p-6 animate-pulse">
                        <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
                        <div className="h-8 bg-slate-800 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!crypto) return null;

    const cryptos = [
        { name: 'Bitcoin', symbol: 'BTC', data: crypto.bitcoin, color: 'orange' },
        { name: 'Ethereum', symbol: 'ETH', data: crypto.ethereum, color: 'blue' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {cryptos.map(({ name, symbol, data, color }) => {
                const isPositive = data.usd_24h_change >= 0;
                return (
                    <div
                        key={symbol}
                        className="bg-gradient-to-br from-gray-100 to-gray-50 dark:from-slate-900/80 dark:to-slate-800/50 rounded-xl p-6 border border-gray-300 dark:border-slate-700/50 hover:border-gray-400 dark:hover:border-slate-600 transition-all"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{name}</h3>
                                <p className="text-sm text-gray-600 dark:text-slate-400">{symbol}</p>
                            </div>
                            <div className={`text-2xl ${color === 'orange' ? 'text-orange-500' : 'text-blue-500'}`}>
                                ₿
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    ${data.usd.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-slate-500 mt-1">
                                    MCap: ${(data.usd_market_cap / 1e9).toFixed(1)}B
                                </p>
                            </div>
                            <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                <span className="text-sm font-semibold">
                                    {isPositive ? '+' : ''}{data.usd_24h_change.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
