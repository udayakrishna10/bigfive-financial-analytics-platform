import { useState, useRef, useEffect } from 'react';
import { API_CONFIG } from '../config';
import {
    Users, TrendingUp, TrendingDown, Minus,
    Loader2, BarChart2, Globe, Newspaper, Scale,
    MessageSquare, Zap, AlertCircle, Shuffle, Activity, Shield,
    CheckCircle2, Search
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AgentMessage {
    type: 'agent_message';
    round: number;
    agent: string;
    text: string;
    icon_key?: string;
    color?: string;
    verdict?: string;
    signals?: string[]; // Auditable Signal IDs
    validation?: Record<string, { hit_rate: string; p50_ret: string }>;
}

interface ChairmanRuling {
    type: 'chairman';
    portfolio_resolution: {
        phase_01_summary: string;
        phase_02_audit: string;
        agreement_index: number;
        global_metrics: {
            total_allocation: number;
            market_regime: 'Mean-Reversion' | 'Trend' | 'Stress' | 'Risk-Off';
            gross_exposure_pct: number;
            net_exposure_pct: number;
            cash_pct: number;
            governance_active_measures: string[];
        };
        correlation_math: {
            avg_pairwise_corr: number;
            factor_overlap: number;
            regime_multiplier: number;
            effective_penalty_raw_pct: number;
            penalty_compression_benefit_pct: number;
            net_correlation_penalty_pct: number;
            net_risk_delta_pct: number;
            formula_summary: string;
        };
        risk_budget: {
            target_vol: number;
            governance_status: string;
            portfolio_distribution: {
                p25_tail: number;
                p50_median: number;
                p75_upside: number;
                risk_skew: string;
            };
        };
        allocation_table: Array<{
            destination_type: 'Risk Asset' | 'Cash' | 'Hedge';
            ticker: string;
            pre_correlation_weight: number;
            correlation_penalty_raw: number;
            weight: number;
            conviction_score: number;
            benchmark_delta?: string;
            justification: string;
        }>;
        concentration_allowance: string;
        confidence_decomposition: {
            tactical: { rating: 'HIGH' | 'MED' | 'LOW'; signals: string[] };
            structural: { rating: 'HIGH' | 'MED' | 'LOW'; signals: string[] };
            macro: { rating: 'HIGH' | 'MED' | 'LOW'; signals: string[] };
            composite_confidence: number;
            governor_action: string;
        };
        stress_test_summary: Array<{
            scenario: string;
            threshold: string;
            mechanical_action: string;
            forced_target_state: string;
        }>;
        invalidation_rules: string[];
        ic_decree: string;
        final_audit_check: string[];
    };
}

interface RegimeData {
    type: string;
    volatility: number;
    confidence: number;
    notes: string;
}

type CouncilEvent =
    | { type: 'round_start'; round: number; label: string; ticker?: string }
    | { type: 'regime' } & RegimeData
    | AgentMessage
    | ChairmanRuling
    | { type: 'done' }
    | { type: 'error'; detail: string };

const TICKERS = ['AAPL', 'AMZN', 'META', 'NFLX', 'GOOGL'];

const AGENT_ICON_MAP: Record<string, LucideIcon> = {
    'Growth Analyst': TrendingUp,
    'Risk Analyst': TrendingDown,
    'Technical Oracle': BarChart2,
    'Macro Strategist': Globe,
    'News Sentinel': Newspaper,
    'The Contrarian': Shuffle,
    'bull': TrendingUp,
    'bear': TrendingDown,
    'chart': BarChart2,
    'globe': Globe,
    'news': Newspaper,
    'shuffle': Shuffle,
};

const VERDICT_CONFIG = {
    BULLISH: { label: 'BULLISH', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: TrendingUp },
    BEARISH: { label: 'BEARISH', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', icon: TrendingDown },
    NEUTRAL: { label: 'NEUTRAL', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', icon: Minus },
};

interface FeedItem {
    type: 'round' | 'message';
    round?: number;
    label?: string;
    agent?: string;
    text?: string;
    icon_key?: string;
    color?: string;
    verdict?: string;
    signals?: string[];
    validation?: Record<string, { hit_rate: string; p50_ret: string }>;
}

export const AICouncil = () => {
    const [selectedTickers, setSelectedTickers] = useState<string[]>(['AAPL']);
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [regime, setRegime] = useState<RegimeData | null>(null);
    const [chairmanRuling, setChairmanRuling] = useState<ChairmanRuling | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const toggleTicker = (t: string) => {
        if (selectedTickers.includes(t)) {
            if (selectedTickers.length > 1) setSelectedTickers(prev => prev.filter(x => x !== t));
        } else {
            setSelectedTickers(prev => [...prev, t]);
        }
    };

    // Auto-scroll to bottom as feed updates
    useEffect(() => {
        if (scrollRef.current) {
            const timer = setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTo({
                        top: scrollRef.current.scrollHeight + 2000,
                        behavior: 'smooth'
                    });
                }
            }, 100);

            const timer2 = setTimeout(() => {
                if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }
            }, 600);

            return () => {
                clearTimeout(timer);
                clearTimeout(timer2);
            };
        }
    }, [feed, chairmanRuling]);

    const convene = async () => {
        setLoading(true);
        setError('');
        setFeed([]);
        setRegime(null);
        setChairmanRuling(null);

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/ai-council-stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tickers: selectedTickers }),
            });

            if (!response.ok) throw new Error('Failed to connect to Council');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error('Stream reader not available');

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6)) as CouncilEvent;
                            if (data.type === 'round_start') {
                                setFeed(prev => [...prev, { type: 'round', round: data.round, label: data.label }]);
                            } else if (data.type === 'regime') {
                                setRegime(data);
                            } else if (data.type === 'agent_message') {
                                setFeed(prev => [...prev, {
                                    type: 'message',
                                    round: data.round,
                                    agent: data.agent,
                                    text: data.text,
                                    icon_key: data.icon_key,
                                    color: data.color,
                                    verdict: data.verdict,
                                    signals: data.signals,
                                    validation: data.validation
                                }]);
                            } else if (data.type === 'chairman') {
                                setChairmanRuling(data);
                            } else if (data.type === 'error') {
                                setError(data.detail);
                            }
                        } catch (e) {
                            console.error('Error parsing stream chunk', e);
                        }
                    }
                }
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col space-y-6 w-full max-w-7xl mx-auto pb-10">
            {/* --- Control Header --- */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-xl shadow-indigo-500/5 transition-all duration-500">
                <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '24px 24px' }} />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 ${loading ? 'animate-pulse scale-110' : ''}`}>
                            <Users className="text-indigo-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 bg-clip-text text-transparent">
                                AI Strategic Council
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                <Zap size={12} className="text-amber-500 animate-pulse" />
                                Real-Time Deliberation Protocol
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        {TICKERS.map(t => (
                            <button
                                key={t}
                                onClick={() => toggleTicker(t)}
                                disabled={loading}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 border-2 ${selectedTickers.includes(t)
                                    ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_-5px_rgba(99,102,241,0.5)]'
                                    : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={convene}
                        disabled={loading || selectedTickers.length === 0}
                        className="flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-black text-sm shadow-xl shadow-indigo-500/20 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                        {loading ? 'ANALYZING PORTFOLIO...' : 'CONVENE COUNCIL'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 text-rose-700 dark:text-rose-300 text-sm font-bold animate-in fade-in zoom-in duration-300">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className={`relative flex flex-col gap-6 min-h-[500px] transition-all duration-700`}>
                <div
                    ref={scrollRef}
                    className="flex-1 bg-white/40 dark:bg-slate-900/40 border border-gray-200/50 dark:border-white/5 rounded-3xl overflow-y-auto p-4 space-y-2 custom-scrollbar scroll-smooth shadow-inner"
                    style={{ height: '700px' }}
                >
                    <div className="flex flex-col gap-4">
                        {(() => {
                            const rounds: any[] = [];
                            feed.forEach(item => {
                                if (item.type === 'round') {
                                    if (item.round === 3) return;
                                    rounds.push({ ...item, messages: [] });
                                } else if (item.type === 'message') {
                                    const r = rounds.find(rd => rd.round === item.round);
                                    if (r) r.messages.push(item);
                                }
                            });

                            return rounds.map((round, ri) => {
                                const isRound1 = round.round === 1;
                                const theme = isRound1
                                    ? "from-blue-600 via-indigo-600 to-cyan-500"
                                    : "from-purple-600 via-fuchsia-600 to-pink-500";
                                const bgGlow = isRound1 ? "bg-blue-500/10" : "bg-fuchsia-500/10";
                                const borderCol = isRound1 ? "border-blue-500/30" : "border-fuchsia-500/30";
                                const accentBorder = isRound1 ? "border-blue-500/10" : "border-fuchsia-500/10";

                                return (
                                    <div key={`round-group-${ri}`} className="relative overflow-hidden bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-black border-2 border-slate-200/60 dark:border-white/5 rounded-[2.5rem] p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-1000">
                                        <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-800/20 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.05))]" style={{ backgroundSize: '16px 16px' }} />

                                        <div className={`relative mb-4 overflow-hidden bg-gradient-to-r ${theme} p-[1px] rounded-2xl shadow-lg`}>
                                            <div className="relative bg-slate-950/90 dark:bg-slate-950 px-6 py-2 rounded-[15px] flex items-center justify-between">
                                                <div className="absolute inset-0 bg-grid-white/[0.03]" style={{ backgroundSize: '12px 12px' }} />
                                                <div className="relative flex items-center gap-4">
                                                    <div className={`p-2.5 ${bgGlow} rounded-xl border ${borderCol}`}>
                                                        {isRound1 ? <Shuffle size={16} className="text-blue-400" /> : <Zap size={16} className="text-fuchsia-400" />}
                                                    </div>
                                                    <div>
                                                        <p className={`text-[9px] font-black uppercase tracking-[0.4em] ${isRound1 ? 'text-blue-400' : 'text-fuchsia-400'} mb-1`}>
                                                            Phase 0{round.round}
                                                        </p>
                                                        <h4 className="text-base font-black text-white uppercase tracking-tight">
                                                            {round.label}
                                                        </h4>
                                                    </div>
                                                </div>
                                                <div className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full ${bgGlow} border ${borderCol}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isRound1 ? 'bg-blue-400' : 'bg-fuchsia-400'}`} />
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isRound1 ? 'text-blue-400' : 'text-fuchsia-400'}`}>Live Analysis</span>
                                                </div>
                                            </div>
                                        </div>

                                        {isRound1 && regime && (
                                            <div className="mb-6 flex items-center justify-between p-4 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                                                        <Zap size={14} className="text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-1">Regime Sentinel Identified</p>
                                                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{regime.type}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vol / Confidence</p>
                                                    <p className="text-sm font-black text-indigo-400 uppercase tracking-tight">{regime.volatility.toFixed(1)} / {(regime.confidence * 100).toFixed(0)}%</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                                            {round.messages.map((item: any, mi: number) => {
                                                const Icon = AGENT_ICON_MAP[item.agent || ''] || AGENT_ICON_MAP[item.icon_key || ''] || MessageSquare;
                                                const verdict = item.verdict ? (VERDICT_CONFIG[item.verdict as keyof typeof VERDICT_CONFIG] || null) : null;

                                                return (
                                                    <div
                                                        key={`msg-${ri}-${mi}`}
                                                        className={`group relative p-4 rounded-3xl border ${accentBorder} bg-slate-50/50 dark:bg-white/5 hover:bg-white/[0.08] transition-all duration-300 animate-in fade-in slide-in-from-left-4`}
                                                    >
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 ${isRound1 ? 'text-blue-500' : 'text-fuchsia-500'} group-hover:text-white transition-colors`}>
                                                                    <Icon size={14} />
                                                                </div>
                                                                <div>
                                                                    <p className={`font-black text-[11px] uppercase tracking-tight ${isRound1 ? 'text-blue-400 dark:text-blue-300' : 'text-fuchsia-400 dark:text-fuchsia-300'}`}>
                                                                        {item.agent}
                                                                    </p>
                                                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Council Member</p>
                                                                </div>
                                                            </div>
                                                            {verdict && (
                                                                <div className={`px-2 py-1 rounded-lg text-[8.5px] font-black border flex items-center gap-1.5 ${verdict.bg} ${verdict.text} ${verdict.border} uppercase tracking-widest`}>
                                                                    <verdict.icon size={10} />
                                                                    {verdict.label}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className={`text-[12.5px] text-slate-700 dark:text-slate-300 leading-relaxed font-bold italic pl-4 border-l-2 ${isRound1 ? 'border-blue-500/30' : 'border-fuchsia-500/30'} group-hover:border-white/40 mb-3`}>
                                                            "{item.text}"
                                                        </p>
                                                        {item.signals && item.signals.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                                {item.signals.map((sig: string) => {
                                                                    const stats = item.validation?.[sig];
                                                                    return (
                                                                        <span key={sig} className="px-1.5 py-0.5 bg-slate-900/10 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                                                                            {sig}
                                                                            {stats && (
                                                                                <span className="opacity-60 border-l border-slate-400/30 pl-1 ml-0.5 whitespace-nowrap">
                                                                                    {stats.hit_rate} HR | {stats.p50_ret} p50
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>

                    {chairmanRuling && chairmanRuling.portfolio_resolution && (
                        <div className="mt-12 relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border-2 border-indigo-500/30 rounded-[2.5rem] p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-1000">
                            <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[2.4rem] p-8 relative overflow-hidden">
                                <div className="absolute inset-0 bg-grid-indigo-500/[0.03] [mask-image:linear-gradient(0deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]" style={{ backgroundSize: '24px 24px' }} />

                                {/* Phase 01 & 02: Deliberation Synthesis */}
                                <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <MessageSquare size={14} className="opacity-50" />
                                            Phase 01 — Opening Statements
                                        </p>
                                        <p className="text-[11px] text-slate-300 font-medium leading-relaxed italic">
                                            {chairmanRuling.portfolio_resolution.phase_01_summary}
                                        </p>
                                    </div>
                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <Search size={14} className="opacity-50" />
                                            Phase 02 — Cross Examination
                                        </p>
                                        <p className="text-[11px] text-slate-300 font-medium leading-relaxed italic">
                                            {chairmanRuling.portfolio_resolution.phase_02_audit}
                                        </p>
                                    </div>
                                </div>

                                <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-10 pb-8 border-b border-white/5">
                                    <div className="flex items-center gap-6">
                                        <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                            <Scale className="text-indigo-400" size={32} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.5em] mb-2">Portfolio Construction Engine (IC-Ready)</p>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-4xl font-black text-white tracking-[0.05em] uppercase">
                                                    Capital-Complete Decree
                                                </h3>
                                                <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full">
                                                    <p className="text-[9px] text-indigo-300 font-black uppercase tracking-widest">AI: {chairmanRuling.portfolio_resolution.agreement_index.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        {chairmanRuling.portfolio_resolution.global_metrics.governance_active_measures.map((measure, i) => (
                                            <div key={i} className="px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2">
                                                <Shield size={12} className="text-rose-400" />
                                                <p className="text-[8px] text-rose-400 font-black uppercase tracking-widest">{measure}</p>
                                            </div>
                                        ))}
                                        <div className="px-6 py-2 bg-slate-800/50 border border-white/5 rounded-2xl text-center">
                                            <p className="text-[8px] text-white/30 font-black uppercase mb-1">Market Regime</p>
                                            <p className="text-xl font-black text-white uppercase tracking-widest">{chairmanRuling.portfolio_resolution.global_metrics.market_regime}</p>
                                        </div>
                                        <div className="px-6 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-center">
                                            <p className="text-[8px] text-indigo-400 font-black uppercase mb-1">Strategic Cash %</p>
                                            <p className="text-xl font-black text-white">{chairmanRuling.portfolio_resolution.global_metrics.cash_pct}%</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                    <div className="lg:col-span-4 space-y-6">
                                        <div className="flex items-center justify-between px-2">
                                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">Full Capital Allocation Matrix</p>
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest pl-2 border-l border-white/10">Active Decree</span>
                                        </div>
                                        <div className="space-y-3">
                                            {chairmanRuling.portfolio_resolution.allocation_table.map((asset, i) => (
                                                <div key={i} className={`p-4 border rounded-2xl group transition-all ${asset.destination_type === 'Risk Asset' ? 'bg-white/[0.03] border-white/5 lg:hover:border-indigo-500/30' : asset.destination_type === 'Hedge' ? 'bg-purple-500/5 border-purple-500/20' : 'bg-slate-900/60 border-white/10'}`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-6 rounded-full ${asset.destination_type === 'Risk Asset' ? 'bg-indigo-500/40' : asset.destination_type === 'Hedge' ? 'bg-purple-500/40' : 'bg-slate-500/40'}`} />
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-black text-white leading-none mb-1">{asset.ticker}</span>
                                                                <span className="text-[7px] font-black text-white/40 uppercase tracking-tighter">{asset.destination_type}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex flex-col items-end">
                                                            <span className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors">{asset.weight}%</span>
                                                            {asset.correlation_penalty_raw < 0 && <span className="text-[8px] text-rose-500 font-bold uppercase">Penalty: {asset.correlation_penalty_raw}%</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[8px] font-black uppercase mb-3 px-1">
                                                        <div className="flex flex-col">
                                                            <span className="text-white/20">Target: {asset.pre_correlation_weight}%</span>
                                                            {asset.benchmark_delta && <span className="text-amber-500/60 lowercase italic">{asset.benchmark_delta}</span>}
                                                        </div>
                                                        <span className="text-indigo-300/40">{(asset.conviction_score * 100).toFixed(0)}% conviction</span>
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 font-bold leading-relaxed border-t border-white/5 pt-3 italic">"{asset.justification}"</p>
                                                </div>
                                            ))}
                                        </div>
                                        {chairmanRuling.portfolio_resolution.concentration_allowance && (
                                            <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-start gap-3">
                                                <Shield className="w-4 h-4 text-indigo-400 mt-0.5" />
                                                <p className="text-[10px] text-indigo-300 font-bold leading-relaxed">
                                                    <span className="uppercase text-indigo-400 mr-2 font-black tracking-wider">Concentration Allowance:</span>
                                                    {chairmanRuling.portfolio_resolution.concentration_allowance}
                                                </p>
                                            </div>
                                        )}
                                        <div className="p-6 bg-slate-950/40 border border-white/5 rounded-3xl">
                                            <div className="flex justify-between items-center mb-4 text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400">
                                                <span>Correlation Math</span>
                                                <span className="text-white/20">{chairmanRuling.portfolio_resolution.correlation_math.effective_penalty_raw_pct}% Raw Penalty</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 mb-6 text-center">
                                                {['Avg Corr', 'Overlap', 'Regime x'].map((label, idx) => (
                                                    <div key={label} className={idx === 1 ? "border-x border-white/5" : ""}>
                                                        <p className="text-[7px] text-white/20 font-black uppercase mb-1">{label}</p>
                                                        <p className="text-xs font-black text-white">
                                                            {idx === 0 ? chairmanRuling.portfolio_resolution.correlation_math.avg_pairwise_corr :
                                                                idx === 1 ? chairmanRuling.portfolio_resolution.correlation_math.factor_overlap :
                                                                    chairmanRuling.portfolio_resolution.correlation_math.regime_multiplier}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 mb-4">
                                                <p className="text-[7px] text-indigo-400 font-black uppercase mb-2">Quantified Risk Delta</p>
                                                <div className="grid grid-cols-3 gap-1 text-center font-black">
                                                    <div><p className="text-[6px] text-white/30 uppercase">Compression</p><p className="text-[10px] text-emerald-400">+{chairmanRuling.portfolio_resolution.correlation_math.penalty_compression_benefit_pct}%</p></div>
                                                    <div><p className="text-[6px] text-white/30 uppercase">Net Penalty</p><p className="text-[10px] text-rose-400">{chairmanRuling.portfolio_resolution.correlation_math.net_correlation_penalty_pct}%</p></div>
                                                    <div><p className="text-[6px] text-white/30 uppercase">Net Delta</p><p className="text-[10px] text-white">+{chairmanRuling.portfolio_resolution.correlation_math.net_risk_delta_pct}%</p></div>
                                                </div>
                                            </div>
                                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider text-center">{chairmanRuling.portfolio_resolution.correlation_math.formula_summary}</p>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-1 border-x border-white/5 hidden lg:block" />

                                    <div className="lg:col-span-4 space-y-8">
                                        <div className="p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-[2.5rem] relative overflow-hidden">
                                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-6">Risk Budget Envelope</p>
                                            <div className="grid grid-cols-2 gap-4 mb-8">
                                                <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl"><p className="text-[8px] text-white/30 font-black uppercase mb-1">Target Volatility</p><p className="text-xl font-black text-white">{chairmanRuling.portfolio_resolution.risk_budget.target_vol}%</p></div>
                                                <div className="p-4 bg-slate-950/40 border border-white/10 rounded-2xl ring-2 ring-indigo-500/20">
                                                    <p className="text-[8px] text-indigo-400 font-black uppercase mb-1">Gov Status</p>
                                                    <p className={`text-xs font-black uppercase truncate ${chairmanRuling.portfolio_resolution.risk_budget.governance_status.toUpperCase() === 'COMPLIANT' ? 'text-emerald-400' : 'text-rose-500'}`}>{chairmanRuling.portfolio_resolution.risk_budget.governance_status}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between px-2 mb-8 border-t border-white/5 pt-6 font-black uppercase">
                                                <div><p className="text-[8px] text-white/30 mb-1">Gross Exposure</p><p className="text-xl text-white">{chairmanRuling.portfolio_resolution.global_metrics.gross_exposure_pct}%</p></div>
                                                <div className="text-right"><p className="text-[8px] text-white/30 mb-1">Net Exposure</p><p className="text-xl text-indigo-400">{chairmanRuling.portfolio_resolution.global_metrics.net_exposure_pct}%</p></div>
                                            </div>
                                            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                <p className="text-[7px] text-white/20 font-black uppercase mb-3 tracking-widest text-center">Outcome Distribution</p>
                                                <div className="grid grid-cols-3 gap-2 text-center font-black">
                                                    <div><p className="text-[6px] text-white/30 uppercase mb-1">Tail (P25)</p><p className="text-sm text-rose-400">{chairmanRuling.portfolio_resolution.risk_budget.portfolio_distribution.p25_tail}%</p></div>
                                                    <div className="border-x border-white/5"><p className="text-[6px] text-indigo-400/50 uppercase mb-1">Median (P50)</p><p className="text-sm text-white">+{chairmanRuling.portfolio_resolution.risk_budget.portfolio_distribution.p50_median}%</p></div>
                                                    <div><p className="text-[6px] text-white/30 uppercase mb-1">Peak (P75)</p><p className="text-sm text-emerald-400">+{chairmanRuling.portfolio_resolution.risk_budget.portfolio_distribution.p75_upside}%</p></div>
                                                </div>
                                                <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[7px] font-black uppercase tracking-widest px-2">
                                                    <span className="text-white/20">Risk Skew</span>
                                                    <span className={chairmanRuling.portfolio_resolution.risk_budget.portfolio_distribution.risk_skew === 'Positive' ? 'text-emerald-400' : 'text-slate-400'}>{chairmanRuling.portfolio_resolution.risk_budget.portfolio_distribution.risk_skew}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-4">Confidence Decomposition</p>
                                            <div className="grid grid-cols-3 gap-3">
                                                {(['tactical', 'structural', 'macro'] as const).map((key) => {
                                                    const data = chairmanRuling.portfolio_resolution.confidence_decomposition[key];
                                                    return (
                                                        <div key={key} className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl text-center group cursor-help relative">
                                                            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-2">{key}</p>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${data.rating === 'HIGH' ? 'text-emerald-400' : data.rating === 'MED' ? 'text-amber-400' : 'text-slate-400'} uppercase`}>{data.rating}</span>
                                                            <div className="hidden group-hover:block absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-900 border border-white/10 rounded-lg shadow-xl shadow-black/50 pointer-events-none">
                                                                {data.signals.map((s, si) => <p key={si} className="text-[7px] text-white/60 font-black whitespace-nowrap">{s}</p>)}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                                <div className="flex justify-between items-center"><span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Composite Confidence</span><span className="text-lg font-black text-indigo-400">{chairmanRuling.portfolio_resolution.confidence_decomposition.composite_confidence}%</span></div>
                                                <div className="p-3 rounded-xl border text-center transition-all bg-slate-500/10 border-white/10">
                                                    <p className="text-[7px] text-white/30 font-black uppercase mb-1">Governor Mandate</p>
                                                    <p className="text-sm font-black uppercase text-white">{chairmanRuling.portfolio_resolution.confidence_decomposition.governor_action}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-8 bg-white/[0.03] border border-white/5 rounded-[2.5rem] relative">
                                            <div className="absolute -top-3 -left-3 p-3 bg-slate-900 rounded-2xl border border-white/5"><MessageSquare className="text-indigo-400/30" size={24} /></div>
                                            <p className="text-[15px] text-slate-100 font-black leading-relaxed tracking-tight pl-4">"{chairmanRuling.portfolio_resolution.ic_decree}"</p>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-3 space-y-8">
                                        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                                            <div className="flex items-center gap-3 mb-6"><Activity size={12} className="text-indigo-400" /><p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">Stress Logic & Triggers</p></div>
                                            <div className="space-y-6">
                                                {chairmanRuling.portfolio_resolution.stress_test_summary.map((s, idx) => (
                                                    <div key={idx} className="space-y-3 group">
                                                        <div className="flex justify-between text-[9px] font-black uppercase flex-col">
                                                            <span className="text-white/30 truncate pr-2">{s.scenario}</span>
                                                            <span className="text-[7px] text-indigo-400/60 tracking-tighter">Trigger: {s.threshold}</span>
                                                        </div>
                                                        <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 group-hover:border-indigo-500/20 transition-all font-black uppercase">
                                                            <p className="text-[8px] text-white/20 mb-1.5 flex items-center gap-2"><Zap size={10} className="text-indigo-500" />{s.mechanical_action}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold lowercase italic">Target: {s.forced_target_state}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-3xl">
                                            <p className="text-[10px] text-rose-400 font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-4"><AlertCircle size={12} />Systemic Invalidation Rules</p>
                                            <div className="space-y-3">
                                                {chairmanRuling.portfolio_resolution.invalidation_rules.map((rule, i) => (
                                                    <div key={i} className="flex items-start gap-3">
                                                        <div className="w-1 h-3 rounded-full bg-rose-500/30 mt-0.5" /><p className="text-[9px] font-black text-rose-200/60 uppercase tracking-tighter">{rule}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-6 pt-4 border-t border-rose-500/10"><p className="text-[8px] text-rose-400/30 font-black uppercase flex items-center gap-2"><Zap size={10} className="animate-pulse" />IC Override Required</p></div>
                                        </div>

                                        <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl">
                                            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-4"><CheckCircle2 size={12} />Final Audit Check</p>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                                {chairmanRuling.portfolio_resolution.final_audit_check.map((check, i) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <div className="w-1 h-1 rounded-full bg-emerald-400/50" /><p className="text-[9px] font-black text-emerald-200/60 uppercase tracking-tight">{check}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-10 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-6">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(i => <div key={i} className="w-5 h-5 rounded-full border border-slate-900 bg-indigo-500/20" />)}
                                        </div>
                                        <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.3em]">Institutional Grade Execution</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] text-indigo-400/40 font-black uppercase tracking-widest leading-none mb-1">DESIGNED & ENGINEERED BY</p>
                                        <p className="text-[10px] font-black text-white/40 tracking-tighter uppercase">BigFive Analytics Platform v4.0</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-1 flex-shrink-0" />
                </div>

                {!loading && feed.length === 0 && !error && (
                    <div className="flex-1 flex flex-col items-center justify-center py-24 px-4 text-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-3xl">
                        <Users className="relative text-indigo-500 opacity-20 mb-8" size={80} />
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">Council Chamber Awaits</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mb-10 font-bold uppercase tracking-wider">Selection: <span className="text-indigo-500">{selectedTickers.join(', ')}</span></p>
                        <div className="flex items-center gap-4">
                            {['bull', 'bear', 'chart', 'globe', 'news'].map((icon, i) => {
                                const Icon = AGENT_ICON_MAP[icon];
                                return (
                                    <div key={icon} className="p-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-400 dark:text-slate-600 animate-bounce" style={{ animationDelay: `${i * 150}ms` }}><Icon size={20} /></div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
