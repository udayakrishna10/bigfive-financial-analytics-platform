import { useState } from 'react';
import { API_CONFIG } from '../config';
import {
    Users, Gavel, TrendingUp, TrendingDown, Minus,
    Loader2, RefreshCw, ChevronDown, ChevronUp,
    BarChart2, Globe, Newspaper, Scale, Clock
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AgentResult {
    agent: string;
    icon: string;       // kept for API compat, not used for display
    specialty: string;
    color: string;
    verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    reasoning: string;
    key_signals: string[];
}

interface ChairmanVerdict {
    verdict: string;
    confidence: number;
    action: string;
    timeframe: string;
    synthesis: string;
}

interface CouncilResponse {
    ticker: string;
    generated_at: string;
    council: AgentResult[];
    chairman: ChairmanVerdict;
}

const TICKERS = ['AAPL', 'AMZN', 'META', 'NFLX', 'GOOGL', 'BTC', 'ETH'];

// Map agent names → lucide icons (replaces emoji)
const AGENT_ICON_MAP: Record<string, LucideIcon> = {
    'Bull Analyst': TrendingUp,
    'Bear Analyst': TrendingDown,
    'Technical Oracle': BarChart2,
    'Macro Strategist': Globe,
    'News Sentinel': Newspaper,
};

const VERDICT_CONFIG = {
    BULLISH: { label: 'BULLISH', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: TrendingUp },
    BEARISH: { label: 'BEARISH', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', icon: TrendingDown },
    NEUTRAL: { label: 'NEUTRAL', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', icon: Minus },
};

const ACTION_CONFIG: Record<string, { bg: string; text: string }> = {
    ACCUMULATE: { bg: 'bg-emerald-500', text: 'text-white' },
    HOLD: { bg: 'bg-blue-500', text: 'text-white' },
    REDUCE: { bg: 'bg-amber-500', text: 'text-white' },
    AVOID: { bg: 'bg-rose-500', text: 'text-white' },
};

const COLOR_MAP: Record<string, string> = {
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
    rose: 'from-rose-500/10 to-rose-500/5 border-rose-500/20',
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20',
    violet: 'from-violet-500/10 to-violet-500/5 border-violet-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
};

const ICON_COLOR_MAP: Record<string, string> = {
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    violet: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
};

const BAR_COLOR: Record<string, string> = {
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    blue: 'bg-blue-500',
    violet: 'bg-violet-500',
    amber: 'bg-amber-500',
};

// Loading agent stubs for skeleton animation
const LOADING_AGENTS = [
    { label: 'Bull Analyst', icon: TrendingUp, color: 'emerald' },
    { label: 'Bear Analyst', icon: TrendingDown, color: 'rose' },
    { label: 'Technical Oracle', icon: BarChart2, color: 'blue' },
    { label: 'Macro Strategist', icon: Globe, color: 'violet' },
    { label: 'News Sentinel', icon: Newspaper, color: 'amber' },
];

function AgentCard({ agent }: { agent: AgentResult }) {
    const [expanded, setExpanded] = useState(false);
    const v = VERDICT_CONFIG[agent.verdict] || VERDICT_CONFIG.NEUTRAL;
    const VIcon = v.icon;
    const AgentIcon = AGENT_ICON_MAP[agent.agent] || BarChart2;
    const iconCls = ICON_COLOR_MAP[agent.color] || ICON_COLOR_MAP.blue;

    return (
        <div className={`relative bg-gradient-to-br ${COLOR_MAP[agent.color] || COLOR_MAP.blue} border rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-xl border flex-shrink-0 ${iconCls}`}>
                        <AgentIcon size={16} />
                    </div>
                    <div>
                        <p className="font-black text-sm text-gray-900 dark:text-white">{agent.agent}</p>
                        <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider">{agent.specialty}</p>
                    </div>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border flex-shrink-0 ${v.bg} ${v.text} ${v.border}`}>
                    <VIcon size={11} />
                    {v.label}
                </div>
            </div>

            {/* Confidence bar */}
            <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">Confidence</span>
                    <span className="text-[10px] font-black text-gray-900 dark:text-white">{agent.confidence}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${BAR_COLOR[agent.color]}`}
                        style={{ width: `${agent.confidence}%` }}
                    />
                </div>
            </div>

            {/* Key signals */}
            {agent.key_signals.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                    {agent.key_signals.slice(0, 2).map((s, i) => (
                        <span key={i} className="text-[9px] font-semibold text-gray-600 dark:text-slate-400 bg-white/60 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-1.5 py-0.5 rounded-md truncate max-w-[150px]">
                            {s}
                        </span>
                    ))}
                </div>
            )}

            {/* Reasoning toggle */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 transition-colors w-full"
            >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded ? 'Hide' : 'Show'} reasoning
            </button>
            {expanded && (
                <p className="mt-2 text-[11px] text-gray-700 dark:text-slate-300 leading-relaxed border-t border-white/10 pt-2">
                    {agent.reasoning}
                </p>
            )}
        </div>
    );
}

export const AICouncil = () => {
    const [ticker, setTicker] = useState('AAPL');
    const [result, setResult] = useState<CouncilResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const convene = async () => {
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/ai-council`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Council failed');
            }
            setResult(await res.json());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const chairman = result?.chairman;
    const actionCfg = chairman ? (ACTION_CONFIG[chairman.action] || ACTION_CONFIG.HOLD) : null;
    const chairVerdict = chairman ? (VERDICT_CONFIG[chairman.verdict as keyof typeof VERDICT_CONFIG] || VERDICT_CONFIG.NEUTRAL) : null;

    return (
        <div className="flex flex-col space-y-5 w-full max-w-7xl mx-auto pb-4">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-lg shadow-indigo-500/5 flex-shrink-0">
                <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '30px 30px' }} />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                            <Users className="text-indigo-500" size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">AI Council</h2>
                            <p className="text-[11px] text-gray-600 dark:text-slate-400 font-medium">5 specialist agents deliberate in parallel → Chairman rules</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <select
                            value={ticker}
                            onChange={e => setTicker(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 flex-1 sm:flex-none"
                        >
                            {TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button
                            onClick={convene}
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 whitespace-nowrap"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Gavel size={16} />}
                            {loading ? 'Deliberating...' : 'Convene Council'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Error ──────────────────────────────────────────────────── */}
            {error && (
                <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 text-rose-700 dark:text-rose-300 text-sm font-medium">
                    {error}
                </div>
            )}

            {/* ── Loading state ──────────────────────────────────────────── */}
            {loading && (
                <div className="space-y-4">
                    {/* Chairman skeleton */}
                    <div className="h-36 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5 animate-pulse" />
                    {/* Agent card skeletons with real icons pulsing */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {LOADING_AGENTS.map((a, i) => {
                            const Icon = a.icon;
                            return (
                                <div
                                    key={a.label}
                                    className={`bg-gradient-to-br ${COLOR_MAP[a.color]} border rounded-2xl p-4 animate-pulse`}
                                    style={{ animationDelay: `${i * 120}ms` }}
                                >
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className={`p-1.5 rounded-xl border ${ICON_COLOR_MAP[a.color]}`}>
                                            <Icon size={16} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="h-3 w-24 bg-gray-300 dark:bg-slate-600 rounded" />
                                            <div className="h-2 w-16 bg-gray-200 dark:bg-slate-700 rounded" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-full" />
                                        <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-4/5" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-center items-center gap-2 py-2 text-sm text-gray-500 dark:text-slate-400 font-medium">
                        <Loader2 size={14} className="animate-spin text-indigo-500" />
                        Council is deliberating...
                    </div>
                </div>
            )}

            {/* ── Chairman's Ruling ──────────────────────────────────────── */}
            {result && chairman && chairVerdict && (
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl shadow-indigo-500/10">
                    <div className="absolute inset-0 bg-grid-slate-800 [mask-image:linear-gradient(0deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]" style={{ backgroundSize: '30px 30px' }} />
                    <div className="relative">
                        {/* Chairman header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                                <Scale className="text-indigo-300" size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Chairman's Ruling</p>
                                <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
                                    {result.ticker} · {new Date(result.generated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    <button onClick={convene} className="text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1">
                                        <RefreshCw size={10} /> Reconvene
                                    </button>
                                </p>
                            </div>
                        </div>

                        {/* Main verdict row */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className={`text-xl font-black px-4 py-2 rounded-xl border ${chairVerdict.bg} ${chairVerdict.text} ${chairVerdict.border}`}>
                                {chairman.verdict}
                            </span>
                            {actionCfg && (
                                <span className={`font-black text-sm px-3 py-1.5 rounded-xl ${actionCfg.bg} ${actionCfg.text}`}>
                                    {chairman.action}
                                </span>
                            )}
                            <span className="text-xs text-slate-400 font-semibold border border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                <Clock size={11} />
                                {chairman.timeframe}
                            </span>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Conviction</span>
                                <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${chairman.confidence}%` }} />
                                </div>
                                <span className="text-sm font-black text-white">{chairman.confidence}%</span>
                            </div>
                        </div>

                        {/* Synthesis */}
                        <p className="text-slate-200 text-sm leading-relaxed font-medium italic border-t border-indigo-500/20 pt-4">
                            "{chairman.synthesis}"
                        </p>
                    </div>
                </div>
            )}

            {/* ── Agent Cards Grid ───────────────────────────────────────── */}
            {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {result.council.map((agent, i) => (
                        <div key={agent.agent} className="animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards" style={{ animationDelay: `${i * 80}ms` }}>
                            <AgentCard agent={agent} />
                        </div>
                    ))}
                </div>
            )}

            {/* ── Empty state ────────────────────────────────────────────── */}
            {!loading && !result && !error && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="flex items-center justify-center gap-3">
                        {LOADING_AGENTS.map((a) => {
                            const Icon = a.icon;
                            return (
                                <div key={a.label} className={`p-2.5 rounded-xl border ${ICON_COLOR_MAP[a.color]}`}>
                                    <Icon size={18} />
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-gray-600 dark:text-slate-400 font-medium text-sm">Select a ticker and convene the council to begin deliberation</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-600 font-mono">50 req/day global · 5 min cache per ticker</p>
                </div>
            )}
        </div>
    );
};
