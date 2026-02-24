import { useState, useRef, useEffect } from 'react';
import { API_CONFIG } from '../config';
import {
    Users, Gavel, TrendingUp, TrendingDown, Minus,
    Loader2, BarChart2, Globe, Newspaper, Scale, Clock, MessageSquare, AlertCircle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ChairmanVerdict {
    verdict: string;
    confidence: number;
    action: string;
    timeframe: string;
    synthesis: string;
    decisive_signal?: string;
}

interface DebateMessage {
    type: 'agent_message';
    round: number;
    agent: string;
    color: string;
    icon_key: string;
    text: string;
    verdict?: string;
}

const TICKERS = ['AAPL', 'AMZN', 'META', 'NFLX', 'GOOGL', 'BTC', 'ETH'];

const AGENT_ICON_MAP: Record<string, LucideIcon> = {
    'Bull Analyst': TrendingUp,
    'Bear Analyst': TrendingDown,
    'Technical Oracle': BarChart2,
    'Macro Strategist': Globe,
    'News Sentinel': Newspaper,
    'bull': TrendingUp,
    'bear': TrendingDown,
    'chart': BarChart2,
    'globe': Globe,
    'news': Newspaper,
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



const ICON_COLOR_MAP: Record<string, string> = {
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    violet: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
};

const LOADING_AGENTS = [
    { label: 'Bull Analyst', icon: TrendingUp, color: 'emerald' },
    { label: 'Bear Analyst', icon: TrendingDown, color: 'rose' },
    { label: 'Technical Oracle', icon: BarChart2, color: 'blue' },
    { label: 'Macro Strategist', icon: Globe, color: 'violet' },
    { label: 'News Sentinel', icon: Newspaper, color: 'amber' },
];

function MessageBubble({ msg }: { msg: DebateMessage }) {
    const Icon = AGENT_ICON_MAP[msg.icon_key] || AGENT_ICON_MAP[msg.agent] || MessageSquare;
    const isRound2 = msg.round === 2;
    const verdict = msg.verdict && VERDICT_CONFIG[msg.verdict as keyof typeof VERDICT_CONFIG];

    return (
        <div className={`flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isRound2 ? 'pl-8' : ''}`}>
            <div className={`relative flex items-start gap-3 p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md ${isRound2 ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-gray-100 dark:border-white/5'}`}>
                <div className={`p-2 rounded-xl border flex-shrink-0 ${ICON_COLOR_MAP[msg.color] || ICON_COLOR_MAP.blue}`}>
                    <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                        <p className="font-black text-sm text-gray-900 dark:text-white truncate">
                            {msg.agent}
                            {isRound2 && <span className="ml-2 text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">Rebuttal</span>}
                        </p>
                        {verdict && (
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black border ${verdict.bg} ${verdict.text} ${verdict.border}`}>
                                {verdict.label}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
                        {isRound2 && <span className="text-indigo-500 mr-1 font-bold italic">@Council:</span>}
                        {msg.text}
                    </p>
                </div>
            </div>
        </div>
    );
}

export const AICouncil = () => {
    const [ticker, setTicker] = useState('AAPL');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [messages, setMessages] = useState<DebateMessage[]>([]);
    const [chairman, setChairman] = useState<ChairmanVerdict | null>(null);
    const [currentRound, setCurrentRound] = useState<number>(0);
    const [isDone, setIsDone] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [messages, chairman, loading]);

    const convene = async () => {
        setLoading(true);
        setError('');
        setMessages([]);
        setChairman(null);
        setCurrentRound(0);
        setIsDone(false);

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/ai-council-stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Connection failed');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No reader available');

            let buffer = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'round_start') {
                                setCurrentRound(data.round);
                            } else if (data.type === 'agent_message') {
                                setMessages(prev => [...prev, data]);
                            } else if (data.type === 'chairman') {
                                setChairman(data);
                            } else if (data.type === 'error') {
                                setError(data.detail);
                            } else if (data.type === 'done') {
                                setIsDone(true);
                            }
                        } catch (e) {
                            console.error('Error parsing SSE line', e);
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

    const actionCfg = chairman ? (ACTION_CONFIG[chairman.action] || ACTION_CONFIG.HOLD) : null;
    const chairVerdict = chairman ? (VERDICT_CONFIG[chairman.verdict as keyof typeof VERDICT_CONFIG] || VERDICT_CONFIG.NEUTRAL) : null;

    return (
        <div className="flex flex-col space-y-6 w-full max-w-5xl mx-auto pb-10">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 shadow-xl shadow-indigo-500/5">
                <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '30px 30px' }} />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                            <Users className="text-indigo-500" size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">AI Council Chamber</h2>
                            <p className="text-xs text-gray-600 dark:text-slate-400 font-medium">Multi-agent live deliberation and cross-examination</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <select
                            value={ticker}
                            onChange={e => setTicker(e.target.value)}
                            disabled={loading}
                            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all flex-1 sm:flex-none disabled:opacity-50"
                        >
                            {TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button
                            onClick={convene}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Gavel size={18} />}
                            {loading ? 'Deliberating...' : 'Convene Council'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Error ──────────────────────────────────────────────────── */}
            {error && (
                <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3 text-rose-700 dark:text-rose-300 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {/* ── Debate Feed ───────────────────────────────────────────── */}
            <div className="flex flex-col gap-6">
                {/* Round 1 */}
                {messages.filter(m => m.round === 1).length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 px-2">
                            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-slate-500 flex items-center gap-2">
                                Round 1: Opening Statements
                                {currentRound === 1 && !isDone && <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                            </span>
                            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent" />
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {messages.filter(m => m.round === 1).map((msg, idx) => (
                                <MessageBubble key={`r1-${idx}`} msg={msg} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Round 2 */}
                {messages.filter(m => m.round === 2).length > 0 && (
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-4 px-2">
                            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 flex items-center gap-2">
                                Round 2: Cross-Examination
                                {currentRound === 2 && !isDone && <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                            </span>
                            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {messages.filter(m => m.round === 2).map((msg, idx) => (
                                <MessageBubble key={`r2-${idx}`} msg={msg} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Chairman Section */}
                {chairman && chairVerdict && (
                    <div className="pt-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-400/30 rounded-3xl p-8 shadow-2xl shadow-indigo-500/20">
                            <div className="absolute inset-0 bg-grid-slate-800 [mask-image:linear-gradient(0deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]" style={{ backgroundSize: '30px 30px' }} />
                            <div className="relative">
                                {/* Chairman header */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
                                        <Scale className="text-indigo-300" size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">Chairman's Ruling</p>
                                        <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
                                            {ticker} Council Synthesis · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Main verdict row */}
                                <div className="flex flex-wrap items-center gap-4 mb-6">
                                    <span className={`text-2xl font-black px-5 py-2.5 rounded-2xl border ${chairVerdict.bg} ${chairVerdict.text} ${chairVerdict.border}`}>
                                        {chairman.verdict}
                                    </span>
                                    {actionCfg && (
                                        <span className={`font-black text-sm px-4 py-2 rounded-2xl ${actionCfg.bg} ${actionCfg.text} shadow-lg shadow-black/20`}>
                                            {chairman.action}
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-400 font-semibold border border-slate-700/50 bg-slate-800/50 px-4 py-2 rounded-2xl flex items-center gap-2">
                                        <Clock size={14} />
                                        {chairman.timeframe}
                                    </span>
                                    <div className="ml-auto flex items-center gap-3">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Conviction</span>
                                        <div className="w-32 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${chairman.confidence}%` }} />
                                        </div>
                                        <span className="text-base font-black text-white">{chairman.confidence}%</span>
                                    </div>
                                </div>

                                {/* Synthesis */}
                                <div className="space-y-4 border-t border-indigo-500/20 pt-6">
                                    <p className="text-slate-200 text-sm md:text-base leading-relaxed font-medium italic">
                                        "{chairman.synthesis}"
                                    </p>
                                    {chairman.decisive_signal && chairman.decisive_signal !== 'N/A' && (
                                        <div className="flex items-start gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
                                            <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400 mt-0.5">
                                                <AlertCircle size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">Decisive Factor</p>
                                                <p className="text-xs md:text-sm text-indigo-100 font-semibold">{chairman.decisive_signal}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={scrollRef} />
            </div>

            {/* ── Empty / Initial State ───────────────────────────────────── */}
            {!loading && !messages.length && !error && (
                <div className="flex flex-col items-center justify-center py-24 gap-6 animate-in fade-in duration-1000">
                    <div className="flex items-center justify-center gap-4">
                        {LOADING_AGENTS.map((a, i) => {
                            const Icon = a.icon;
                            return (
                                <div
                                    key={a.label}
                                    className={`p-3 rounded-2xl border ${ICON_COLOR_MAP[a.color]} shadow-sm animate-in zoom-in duration-500`}
                                    style={{ animationDelay: `${i * 100}ms` }}
                                >
                                    <Icon size={24} />
                                </div>
                            );
                        })}
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-gray-900 dark:text-white font-black text-lg">The Council is waiting</p>
                        <p className="text-gray-500 dark:text-slate-400 font-medium text-sm max-w-sm mx-auto">
                            Pick a ticker and convene the specialists for a dramatic live debate on market direction.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Mid-Debate Skeleton (only if Round 1 hasn't started yet but loading) ── */}
            {loading && messages.length === 0 && (
                <div className="space-y-6">
                    <div className="h-10 w-48 bg-gray-200 dark:bg-white/5 rounded-xl mx-auto animate-pulse" />
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-28 bg-gray-100 dark:bg-white/5 rounded-3xl border border-gray-200 dark:border-white/5 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                </div>
            )}
        </div>
    );
};
