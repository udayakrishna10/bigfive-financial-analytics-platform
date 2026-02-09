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
    <div className="flex flex-col h-full space-y-4">
      {/* Header with Gradient Background */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30 shadow-lg shadow-purple-500/5 flex-shrink-0">
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '30px 30px' }}></div>
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <Globe className="text-purple-500 dark:text-purple-400" size={18} />
            </div>
            <h2 className="text-xl font-black bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">Global Market Pulse</h2>
          </div>
          <span className="text-[10px] text-gray-600 dark:text-slate-400 font-mono font-bold border border-gray-200 dark:border-slate-700 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800">
            50 req/day
          </span>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5" />)}
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-4">
          {/* AI Consensus Card */}
          <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-500/10 dark:to-purple-500/10 border border-blue-200 dark:border-white/10 p-4 rounded-2xl backdrop-blur-md relative overflow-hidden group shadow-lg flex-shrink-0">
            <div className="absolute inset-0 bg-blue-50 dark:bg-blue-500/5 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/10 transition-colors" />
            <div className="relative flex flex-col gap-3">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <div className="p-1.5 bg-blue-200 dark:bg-blue-500/20 rounded-lg">
                  <Quote size={16} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider">AI Consensus</h3>
              </div>
              <p className="text-gray-700 dark:text-slate-200 italic text-sm leading-relaxed font-medium whitespace-pre-line">
                "{error ? <span className="text-rose-400">{error}</span> : data?.sentiment_summary}"
              </p>
            </div>
          </div>

          {/* Article List */}
          <div className="grid gap-3">
            {data?.articles.map((article: any, i: number) => {
              const dateStr = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
              const timeStr = article.publishedAt ? new Date(article.publishedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

              return (
                <a key={i} href={article.url} target="_blank" rel="noreferrer"
                  className="group flex justify-between items-start gap-3 p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 hover:border-purple-300 dark:hover:border-purple-500/40 transition-all hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-backwards"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <h4 className="text-gray-900 dark:text-slate-200 text-sm font-bold leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex-1">
                    {article.title}
                  </h4>

                  <div className="flex flex-col items-end shrink-0 gap-0.5">
                    <span className="text-[10px] font-bold text-gray-600 dark:text-slate-500 uppercase tracking-wider">{dateStr} {timeStr}</span>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">{article.source}</span>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
};