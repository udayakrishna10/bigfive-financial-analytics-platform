import { useState } from 'react';
import { api } from '../services/api';
import { Send, Loader2 } from 'lucide-react';

export const AIChat = () => {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async () => {
    setLoading(true);
    setError("");
    setAns("");
    try {
      const data = await api.askAI(q);
      setAns(data.answer);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950 p-4 rounded-2xl border border-cyan-100 dark:border-cyan-900/30 shadow-lg shadow-cyan-500/5 flex-shrink-0">
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '30px 30px' }}></div>
        <div className="relative">
          <h2 className="text-xl font-black bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">AI Technical Audit</h2>
          <p className="text-gray-600 dark:text-slate-400 text-xs font-medium">GPT-4 powered market analysis</p>
        </div>
      </div>

      {/* Response Area */}
      <div className="flex-1 bg-white dark:bg-slate-800/50 rounded-2xl p-6 overflow-y-auto border border-gray-200 dark:border-slate-700/50">
        {error ? <div className="text-rose-500 font-mono text-sm border border-rose-500/20 bg-rose-500/10 p-4 rounded-xl font-medium">{error}</div> :
          ans ? <div className="text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">{ans}</div> :
            <div className="text-gray-500 dark:text-slate-500 italic text-sm">Start an AI-powered technical audit...</div>}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 space-y-2">
        <div className="relative">
          <input className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-4 pr-12 outline-none focus:border-cyan-500 dark:focus:border-cyan-500 text-gray-900 dark:text-white text-sm transition-colors"
            placeholder="How is Meta RSI trending?" value={q} onChange={e => setQ(e.target.value)} />
          <button onClick={ask} className="absolute right-3 top-3 text-cyan-500 hover:text-cyan-600 transition-colors">{loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}</button>
        </div>
        <p className="text-center text-[10px] text-gray-600 dark:text-gray-400 font-mono font-bold">
          Usage Limit: 50 requests/day (Global)
        </p>
      </div>
    </div>
  );
};