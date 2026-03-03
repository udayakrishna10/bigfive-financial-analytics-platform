import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Loader2, AlertCircle, RefreshCw, BarChart3, TrendingUp, Scale, Wallet, Percent, Activity, LineChart, ShieldCheck, Banknote, Target, Receipt, Landmark, AlignRight, DollarSign, Users, Briefcase, TrendingDown, BookOpen } from 'lucide-react';
import { getLogo } from '../helpers/logos';

interface Fundamental {
    ticker: string;
    forwardPE: number | null;
    trailingPE: number | null;
    priceToBook: number | null;
    profitMargins: number | null;
    debtToEquity: number | null;
    beta: number | null;
    shortPercentOfFloat: number | null;
    returnOnEquity: number | null;
    operatingMargins: number | null;
    revenueGrowth: number | null;
    freeCashflow: number | null;
    enterpriseToEbitda: number | null;
    dividendYield: number | null;
    priceToSales: number | null;
    currentRatio: number | null;
    returnOnAssets: number | null;
    marketCap: number | null;
    trailingEps: number | null;
    forwardEps: number | null;
    trailingPegRatio: number | null;
    totalDebt: number | null;
    totalCash: number | null;
    heldPercentInstitutions: number | null;
    heldPercentInsiders: number | null;
    grossMargins: number | null;
    revenuePerShare: number | null;
    bookValue: number | null;
    shortRatio: number | null;
    impliedSharesOutstanding: number | null;
    totalRevenue: number | null;
    grossProfits: number | null;
    ebitda: number | null;
    operatingCashflow: number | null;
    earningsQuarterlyGrowth: number | null;
    enterpriseValue: number | null;
    payoutRatio: number | null;
    targetHighPrice: number | null;
    targetLowPrice: number | null;
    targetMeanPrice: number | null;
    recommendationMean: number | null;
    recommendationKey: string | null;
    numberOfAnalystOpinions: number | null;
    overallRisk: number | null;
    auditRisk: number | null;
    boardRisk: number | null;
    compensationRisk: number | null;
    shareHolderRightsRisk: number | null;
    fiftyTwoWeekLow: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekChange: number | null;
    allTimeHigh: number | null;
    allTimeLow: number | null;
    quickRatio: number | null;
    averageVolume: number | null;
    averageDailyVolume10Day: number | null;
    dividendRate: number | null;
    fiveYearAvgDividendYield: number | null;
    ebitdaMargins: number | null;
    sharesShort: number | null;
    sharesShortPriorMonth: number | null;
    fullTimeEmployees: number | null;
    updated_at: string;
}

export const FundamentalsCards: React.FC<{ ticker?: string; compact?: boolean }> = ({ ticker, compact }) => {
    const [fundamentals, setFundamentals] = useState<Fundamental[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFundamentals = () => {
        setLoading(true);
        setError(null);
        api.getFundamentals()
            .then((data: { fundamentals: Fundamental[] }) => {
                if (data && Array.isArray(data.fundamentals)) {
                    setFundamentals(data.fundamentals);
                } else {
                    setFundamentals([]);
                }
            })
            .catch((err: Error) => {
                console.error('Failed to fetch fundamentals', err);
                setError('Failed to load fundamental metrics.');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchFundamentals();
    }, []);

    const formatRatio = (val: number | null) => (val ? `${val.toFixed(2)}x` : 'N/A');
    const formatDecimal = (val: number | null) => (val ? val.toFixed(2) : 'N/A');
    const formatPercent = (val: number | null) => (val ? `${(val * 100).toFixed(2)}%` : 'N/A');
    const formatDebtToEq = (val: number | null) => (val ? `${(val / 100).toFixed(2)}x` : 'N/A');
    const formatCurrency = (val: number | null) => {
        if (!val) return 'N/A';
        if (Math.abs(val) > 1e9) return `$${(val / 1e9).toFixed(1)}B`;
        if (Math.abs(val) > 1e6) return `$${(val / 1e6).toFixed(1)}M`;
        return `$${val.toLocaleString()}`;
    };

    const getIndicatorColor = (key: keyof Fundamental, val: any) => {
        if (val === null || val === undefined) return 'text-slate-700 dark:text-slate-300';

        switch (key) {
            case 'trailingPE':
            case 'forwardPE':
            case 'enterpriseToEbitda':
                return val < 25 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : val > 45 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300 font-medium';
            case 'profitMargins':
            case 'operatingMargins':
            case 'grossMargins':
            case 'ebitdaMargins':
            case 'returnOnEquity':
            case 'returnOnAssets':
                return val > 0.2 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : val < 0.1 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300 font-medium';
            case 'revenueGrowth':
            case 'earningsQuarterlyGrowth':
                return val > 0.15 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : val < 0.05 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300 font-medium';
            case 'debtToEquity':
                return val < 50 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : val > 150 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300 font-medium';
            case 'currentRatio':
            case 'quickRatio':
                return val > 1.25 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : val < 1.0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300 font-medium';
            case 'overallRisk':
                return val <= 3 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : val >= 7 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300 font-medium';
            case 'recommendationKey':
                if (val === 'buy' || val === 'strong_buy') return 'text-emerald-600 dark:text-emerald-400 font-bold';
                if (val === 'sell' || val === 'strong_sell') return 'text-rose-600 dark:text-rose-400 font-bold';
                return 'text-amber-600 dark:text-amber-400 font-bold';
            default:
                return 'text-slate-700 dark:text-slate-300 font-medium';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="text-red-700 dark:text-red-300 font-medium mb-4">{error}</p>
                <button
                    onClick={fetchFundamentals}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                    <RefreshCw className="w-4 h-4 inline-block mr-2" />
                    Retry
                </button>
            </div>
        );
    }

    const filteredFundamentals = ticker
        ? fundamentals.filter(f => f.ticker === ticker)
        : fundamentals;

    if (!filteredFundamentals.length) {
        return (
            <div className="p-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <p className="font-bold">No Fundamentals Data Available</p>
                <p className="text-xs mt-1">Found 0 records in database for this view.</p>
                <button
                    onClick={fetchFundamentals}
                    className="mt-3 px-3 py-1 bg-white border border-orange-200 rounded text-xs font-bold hover:bg-orange-100"
                >
                    Retry Fetch
                </button>
            </div>
        );
    }

    if (compact) {
        return (
            <div className="relative flex flex-col bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 p-1.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm overflow-hidden h-fit">
                <div className="flex justify-between items-center mb-1 px-1">
                    <h2 className="text-xs font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">Key Fundamentals</h2>
                    <div className="text-[8px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><BarChart3 size={10} /> BQ</div>
                </div>
                <div className="flex-1 overflow-auto pr-1 scrollbar-hide">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-indigo-100 dark:border-indigo-500/20 text-slate-500 dark:text-slate-400">
                                <th className="pb-1.5 font-bold">Ticker</th>
                                <th className="pb-1.5 font-bold text-right pt-0">P/E</th>
                                <th className="pb-1.5 font-bold text-right">Mkt Cap</th>
                                <th className="pb-1.5 font-bold text-right">Rev Grwth</th>
                                <th className="pb-1.5 font-bold text-right">Net Margin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFundamentals.map(fund => (
                                <tr key={fund.ticker} className="border-b border-gray-100 dark:border-slate-800/80 last:border-0 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="py-0.5 px-1 font-bold text-gray-800 dark:text-gray-200">
                                        <div className="flex items-center gap-1">
                                            {getLogo(fund.ticker) && <img src={getLogo(fund.ticker) || ''} alt="" className="w-3.5 h-3.5 object-contain" />}
                                            {fund.ticker}
                                        </div>
                                    </td>
                                    <td className={`py-0.5 text-right font-mono text-[11px] ${getIndicatorColor('trailingPE', fund.trailingPE)}`}>{formatRatio(fund.trailingPE)}</td>
                                    <td className="py-0.5 text-right text-gray-700 dark:text-gray-300 font-medium font-mono text-[11px]">{formatCurrency(fund.marketCap)}</td>
                                    <td className={`py-0.5 text-right font-mono text-[11px] ${getIndicatorColor('revenueGrowth', fund.revenueGrowth)}`}>{formatPercent(fund.revenueGrowth)}</td>
                                    <td className={`py-0.5 text-right font-mono text-[11px] ${getIndicatorColor('profitMargins', fund.profitMargins)}`}>{formatPercent(fund.profitMargins)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-lg shadow-indigo-500/5">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                    {ticker ? `${ticker} Key Fundamentals & Analysis` : 'Valuation Fundamentals'}
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <BarChart3 size={14} /> LIVE BIGQUERY
                </div>
            </div>

            <div className={`grid gap-4 ${ticker ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5'}`}>
                {filteredFundamentals.map(fund => (
                    <div key={fund.ticker} className="bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/60 rounded-xl p-4 hover:shadow-md transition-shadow">
                        {!ticker && (
                            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">
                                {getLogo(fund.ticker) && (
                                    <img src={getLogo(fund.ticker) || ''} alt="" className="w-6 h-6 object-contain" />
                                )}
                                <span className="font-bold text-gray-800 dark:text-slate-200">{fund.ticker}</span>
                            </div>
                        )}

                        <div className={ticker ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6' : 'space-y-4'}>
                            {/* Valuation & Size block */}
                            <div>
                                <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-2 border-b border-indigo-100 dark:border-indigo-500/20 pb-1">
                                    Valuation & Size
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Banknote size={10} className="text-emerald-400" /> Market Cap</span><span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{formatCurrency(fund.marketCap)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Briefcase size={10} className="text-emerald-500" /> Ent Value</span><span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{formatCurrency(fund.enterpriseValue)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Users size={10} className="text-blue-400" /> Shares Out</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatCurrency(fund.impliedSharesOutstanding).replace('$', '')}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Users size={10} className="text-indigo-400" /> Employees</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{fund.fullTimeEmployees ? fund.fullTimeEmployees.toLocaleString() : 'N/A'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><TrendingUp size={10} className="text-indigo-400" /> Fwd P/E</span><span className={`text-[11px] ${getIndicatorColor('forwardPE', fund.forwardPE)}`}>{formatRatio(fund.forwardPE)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><BarChart3 size={10} className="text-blue-400" /> Trail P/E</span><span className={`text-[11px] ${getIndicatorColor('trailingPE', fund.trailingPE)}`}>{formatRatio(fund.trailingPE)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Target size={10} className="text-rose-400" /> PEG Ratio</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatRatio(fund.trailingPegRatio)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Receipt size={10} className="text-purple-400" /> P/S</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatRatio(fund.priceToSales)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Scale size={10} className="text-emerald-400" /> P/B</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatRatio(fund.priceToBook)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Target size={10} className="text-rose-400" /> EV/EBITDA</span><span className={`text-[11px] ${getIndicatorColor('enterpriseToEbitda', fund.enterpriseToEbitda)}`}>{formatRatio(fund.enterpriseToEbitda)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><BookOpen size={10} className="text-amber-500" /> Book Val</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{fund.bookValue ? `$${fund.bookValue.toFixed(2)}` : 'N/A'}</span></div>
                                </div>
                            </div>

                            {/* Profitability block */}
                            <div>
                                <div className={`text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider mb-2 border-b border-emerald-100 dark:border-emerald-500/20 pb-1 ${!ticker && 'mt-3'}`}>
                                    Financials & Profitability
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Banknote size={10} className="text-emerald-400" /> Revenue</span><span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{formatCurrency(fund.totalRevenue)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><DollarSign size={10} className="text-teal-400" /> Gross Profit</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatCurrency(fund.grossProfits)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Activity size={10} className="text-indigo-400" /> EBITDA</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatCurrency(fund.ebitda)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Banknote size={10} className="text-green-400" /> Trail EPS</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{fund.trailingEps ? `$${fund.trailingEps.toFixed(2)}` : 'N/A'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><TrendingUp size={10} className="text-teal-400" /> Fwd EPS</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{fund.forwardEps ? `$${fund.forwardEps.toFixed(2)}` : 'N/A'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><TrendingUp size={10} className="text-blue-400" /> EPS Grwth</span><span className={`text-[11px] ${getIndicatorColor('earningsQuarterlyGrowth', fund.earningsQuarterlyGrowth)}`}>{formatPercent(fund.earningsQuarterlyGrowth)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><TrendingUp size={10} className="text-indigo-400" /> Rev Grwth</span><span className={`text-[11px] ${getIndicatorColor('revenueGrowth', fund.revenueGrowth)}`}>{formatPercent(fund.revenueGrowth)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Percent size={10} className="text-emerald-400" /> Net Margin</span><span className={`text-[11px] ${getIndicatorColor('profitMargins', fund.profitMargins)}`}>{formatPercent(fund.profitMargins)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Activity size={10} className="text-teal-400" /> Op Margin</span><span className={`text-[11px] ${getIndicatorColor('operatingMargins', fund.operatingMargins)}`}>{formatPercent(fund.operatingMargins)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Percent size={10} className="text-emerald-500" /> Gr Margin</span><span className={`text-[11px] ${getIndicatorColor('grossMargins', fund.grossMargins)}`}>{formatPercent(fund.grossMargins)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><LineChart size={10} className="text-blue-400" /> ROA</span><span className={`text-[11px] ${getIndicatorColor('returnOnAssets', fund.returnOnAssets)}`}>{formatPercent(fund.returnOnAssets)}</span></div>
                                </div>
                            </div>

                            {/* Health & Risk block */}
                            <div>
                                <div className={`text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider mb-2 border-b border-rose-100 dark:border-rose-500/20 pb-1 ${!ticker && 'mt-3'}`}>
                                    Health & Cash
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Banknote size={10} className="text-emerald-400" /> Total Cash</span><span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(fund.totalCash)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Wallet size={10} className="text-rose-400" /> Total Debt</span><span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{formatCurrency(fund.totalDebt)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Activity size={10} className="text-blue-400" /> Op Cashflw</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatCurrency(fund.operatingCashflow)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Banknote size={10} className="text-emerald-500" /> Free Cash</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatCurrency(fund.freeCashflow)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Wallet size={10} className="text-rose-400" /> Debt/Eq</span><span className={`text-[11px] ${getIndicatorColor('debtToEquity', fund.debtToEquity)}`}>{formatDebtToEq(fund.debtToEquity)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><ShieldCheck size={10} className="text-green-400" /> Curr Ratio</span><span className={`text-[11px] ${getIndicatorColor('currentRatio', fund.currentRatio)}`}>{formatRatio(fund.currentRatio)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Receipt size={10} className="text-indigo-400" /> Payout Rat</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatPercent(fund.payoutRatio)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Landmark size={10} className="text-amber-400" /> Div Yield</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatPercent(fund.dividendYield)}</span></div>
                                </div>
                            </div>

                            {/* Wall Street block */}
                            <div>
                                <div className={`text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider mb-2 border-b border-amber-100 dark:border-amber-500/20 pb-1 ${!ticker && 'mt-3'}`}>
                                    Wall Street & Markets
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Activity size={10} className="text-orange-400" /> Beta</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatDecimal(fund.beta)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><LineChart size={10} className="text-red-400" /> Short Float</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatPercent(fund.shortPercentOfFloat)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><TrendingDown size={10} className="text-red-500" /> Short Ratio</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatDecimal(fund.shortRatio)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Users size={10} className="text-blue-500" /> Inst Hold</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatPercent(fund.heldPercentInstitutions)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Users size={10} className="text-purple-500" /> Insider Hold</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatPercent(fund.heldPercentInsiders)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Target size={10} className="text-emerald-500" /> Target High</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{fund.targetHighPrice ? `$${fund.targetHighPrice.toFixed(2)}` : 'N/A'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Target size={10} className="text-blue-500" /> Target Mean</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{fund.targetMeanPrice ? `$${fund.targetMeanPrice.toFixed(2)}` : 'N/A'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Target size={10} className="text-rose-500" /> Target Low</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{fund.targetLowPrice ? `$${fund.targetLowPrice.toFixed(2)}` : 'N/A'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><AlignRight size={10} className="text-indigo-500" /> Analysts</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{fund.numberOfAnalystOpinions || 'N/A'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Target size={10} className={fund.recommendationKey === 'buy' || fund.recommendationKey === 'strong_buy' ? 'text-emerald-500' : 'text-amber-500'} /> Rating</span><span className={`text-[11px] font-bold uppercase ${getIndicatorColor('recommendationKey', fund.recommendationKey)}`}>{fund.recommendationKey ? fund.recommendationKey.replace('_', ' ') : 'N/A'}</span></div>
                                </div>
                            </div>

                            {/* Governance & Risk block */}
                            <div>
                                <div className={`text-[10px] font-bold text-violet-500 dark:text-violet-400 uppercase tracking-wider mb-2 border-b border-violet-100 dark:border-violet-500/20 pb-1 ${!ticker && 'mt-3'}`}>
                                    Governance & Price Action
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><ShieldCheck size={10} className="text-violet-400" /> Overall Risk</span><span className={`text-[11px] ${getIndicatorColor('overallRisk', fund.overallRisk)}`}>{fund.overallRisk || 'N/A'}/10</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><ShieldCheck size={10} className="text-violet-400" /> Audit Risk</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{fund.auditRisk || 'N/A'}/10</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><ShieldCheck size={10} className="text-violet-400" /> Board Risk</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{fund.boardRisk || 'N/A'}/10</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><ShieldCheck size={10} className="text-violet-400" /> Comp Risk</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{fund.compensationRisk || 'N/A'}/10</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><ShieldCheck size={10} className="text-violet-400" /> Rights Risk</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{fund.shareHolderRightsRisk || 'N/A'}/10</span></div>

                                    <div className="mt-4 mb-2 border-b border-violet-100 dark:border-violet-500/20 pb-1" />

                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Activity size={10} className="text-rose-400" /> 52W Low</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatCurrency(fund.fiftyTwoWeekLow)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><TrendingUp size={10} className="text-emerald-400" /> 52W High</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatCurrency(fund.fiftyTwoWeekHigh)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Activity size={10} className="text-blue-400" /> All-Time-H</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatCurrency(fund.allTimeHigh)}</span></div>

                                    <div className="mt-4 mb-2 border-b border-violet-100 dark:border-violet-500/20 pb-1" />

                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Activity size={10} className="text-orange-400" /> Avg Vol 10D</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatCurrency(fund.averageDailyVolume10Day).replace('$', '')}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Activity size={10} className="text-orange-500" /> Avg Vol 3M</span><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{formatCurrency(fund.averageVolume).replace('$', '')}</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 text-[9px] text-right text-slate-400 border-t border-gray-100 dark:border-slate-700/60 pt-2">{new Date(fund.updated_at).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
