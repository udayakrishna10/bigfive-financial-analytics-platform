import React, { useEffect, useState } from 'react';
import { API_CONFIG } from '../config';
import { ArrowUp, ArrowDown, Minus, Info, Loader2, AlertCircle } from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip
} from 'recharts';

interface HistoryPoint {
    date: string;
    value: number;
}

interface Indicator {
    series_id: string;
    series_name: string;
    latest_date: string;
    latest_value: number;
    frequency: string;
    units: string;
    change_pct: number;
    history: HistoryPoint[];
    trend: 'up' | 'down' | 'stable';
}

export const EconomicIndicators: React.FC = () => {
    const [indicators, setIndicators] = useState<Indicator[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchIndicators();
    }, []);

    const fetchIndicators = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}/economic-indicators`);
            if (!response.ok) {
                throw new Error('Failed to fetch economic indicators');
            }
            const data = await response.json();
            setIndicators(data.indicators || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching indicators:', err);
            setError('Failed to load economic data. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const getTrendIcon = (change: number) => {
        if (change > 0) return <ArrowUp className="w-4 h-4 text-emerald-500" />;
        if (change < 0) return <ArrowDown className="w-4 h-4 text-rose-500" />;
        return <Minus className="w-4 h-4 text-gray-400" />;
    };



    const formatValue = (value: number, units: string) => {
        if (value === undefined || value === null) return 'N/A';

        // Percent values
        if (units.toLowerCase().includes('percent') || units.includes('%')) {
            return `${value.toFixed(2)}%`;
        }

        // Dollar values
        if (units.toLowerCase().includes('dollar')) {
            if (value > 1000) return `$${(value / 1000).toFixed(2)}T`; // Trillions usually for GDP
            return `$${value.toLocaleString()}`;
        }

        // Index values
        return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="text-red-700 dark:text-red-300 font-medium mb-4">{error}</p>
                <button
                    onClick={fetchIndicators}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header Section with Gradient Background */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-lg shadow-indigo-500/5 flex-shrink-0">
                <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '30px 30px' }}></div>
                <div className="relative flex justify-between items-center">
                    <h1 className="text-lg font-black bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                        Economic Dashboard
                    </h1>
                    <div className="text-[10px] font-mono font-bold text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
                        FRED
                    </div>
                </div>
            </div>

            {/* Indicators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 overflow-auto pb-2">
                {indicators.map((indicator) => (
                    <div
                        key={indicator.series_id}
                        className="group relative bg-white dark:bg-slate-800/50 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700/50 hover:shadow-lg hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all duration-300 hover:-translate-y-0.5 hover:z-10"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="space-y-0.5 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 line-clamp-1" title={indicator.series_name}>
                                        {indicator.series_name}
                                    </h3>
                                    <div className="group/tooltip relative">
                                        <Info className="w-3 h-3 text-gray-400 cursor-help flex-shrink-0" />
                                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-40 p-1.5 bg-gray-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 text-center whitespace-nowrap">
                                            {indicator.units} • {indicator.frequency}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                    {formatDate(indicator.latest_date)}
                                </div>
                            </div>

                            <div className={`flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold gap-0.5 flex-shrink-0
                ${indicator.change_pct > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                    indicator.change_pct < 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                            >
                                {getTrendIcon(indicator.change_pct)}
                                <span>{Math.abs(indicator.change_pct < 100 ? indicator.change_pct : 0).toFixed(2)}%</span>
                            </div>
                        </div>

                        {/* Main Value */}
                        <div className="mb-3">
                            <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                {formatValue(indicator.latest_value, indicator.units)}
                            </span>
                        </div>

                        <div className="h-16 w-full mt-2 relative overflow-hidden rounded-lg">
                            {indicator.history && indicator.history.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={indicator.history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id={`colorValue-${indicator.series_id}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={indicator.change_pct >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={indicator.change_pct >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke={indicator.change_pct >= 0 ? "#10b981" : "#f43f5e"}
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill={`url(#colorValue-${indicator.series_id})`}
                                            isAnimationActive={true}
                                        />
                                        <XAxis dataKey="date" hide />
                                        <YAxis domain={['auto', 'auto']} hide />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '0.5rem',
                                                color: '#f3f4f6',
                                                fontSize: '0.625rem',
                                                padding: '0.4rem 0.6rem',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                                            }}
                                            itemStyle={{ color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}
                                            formatter={(value: number) => [formatValue(value, indicator.units), '']}
                                            labelFormatter={(label: any) => formatDate(label)}
                                            cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '3 3' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg font-medium border border-dashed border-gray-200 dark:border-gray-700">
                                    Waiting for trend data...
                                </div>
                            )}
                        </div>

                        {/* Visual Indicator Bar */}
                        <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left
              ${indicator.change_pct > 0 ? 'bg-emerald-500' : indicator.change_pct < 0 ? 'bg-rose-500' : 'bg-gray-400'}`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};


