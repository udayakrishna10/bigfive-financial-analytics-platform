import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Quote, Globe } from 'lucide-react';


export const SentimentFeed = ({ ticker = "AAPL" }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Force "ALL" mode for market overview
  const effectiveTicker = 'ALL';

  useEffect(() => {
    setLoading(true);
    setError("");
    api.getSentiment(effectiveTicker)
      .then(res => {
        setData(res);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [effectiveTicker, ticker]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
          <Globe className="text-purple-400" size={20} />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Global Market Pulse</h2>
        <span className="text-[10px] text-slate-500 font-mono border border-slate-800 px-2 py-1 rounded-full bg-slate-900/50">
          Limit: 50 req/day
        </span>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl border border-white/5" />)}
        </div>
      ) : (
        <>
          {/* AI Consensus Card */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden group shadow-xl">
            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center gap-2 text-blue-400">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Quote size={18} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest">AI Consensus Analysis</h3>
              </div>
              <p className="text-slate-200 italic text-sm leading-relaxed font-medium">
                "{error ? <span className="text-rose-400">{error}</span> : data?.sentiment_summary}"
              </p>
            </div>
          </div>

          {/* Article List */}
          <div className="grid gap-4">
            {data?.articles.map((article: any, i: number) => {
              const dateStr = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
              const timeStr = article.publishedAt ? new Date(article.publishedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

              return (
                <a key={i} href={article.url} target="_blank" rel="noreferrer"
                  className="group flex justify-between items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-black/20 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-backwards"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <h4 className="text-slate-200 text-sm font-semibold leading-snug group-hover:text-blue-400 transition-colors flex-1">
                    {article.title}
                  </h4>

                  <div className="flex flex-col items-end shrink-0 gap-0.5 mt-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{dateStr} {timeStr}</span>
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{article.source}</span>
                  </div>
                </a>
              )
            })}
          </div>
        </>
      )}
    </div>
  );
};