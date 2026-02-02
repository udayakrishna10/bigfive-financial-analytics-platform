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
    <div className="max-w-3xl mx-auto h-full flex flex-col">
      <div className="flex-1 bg-slate-900/40 rounded-3xl p-8 mb-6 overflow-y-auto border border-slate-800">
        {error ? <div className="text-rose-400 font-mono text-sm border border-rose-500/20 bg-rose-500/10 p-4 rounded-xl">{error}</div> :
          ans ? <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">{ans}</div> :
            <div className="text-slate-600 italic">Start an AI-powered technical audit...</div>}
      </div>
      <div className="relative">
        <input className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 outline-none focus:border-blue-500"
          placeholder="How is Meta RSI trending?" value={q} onChange={e => setQ(e.target.value)} />
        <button onClick={ask} className="absolute right-4 top-4 text-blue-500">{loading ? <Loader2 className="animate-spin" /> : <Send />}</button>
      </div>
      <p className="text-center text-[10px] text-slate-600 mt-2 font-mono">
        Usage Limit: 50 requests/day (Global)
      </p>
    </div>
  );
};