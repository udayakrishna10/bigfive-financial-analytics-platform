import React, { useEffect, useState } from 'react';
// Changed from apiService to api to match your standard
import { api } from '../services/api';
import { ShieldCheck, Server, Globe } from 'lucide-react';

export const HealthView = () => {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    // Calling 'api' instead of 'apiService'
    api.checkHealth()
      .then(setStatus)
      .catch(() => setStatus({ status: "offline" }));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl shadow-blue-500/5">
        <div className="flex items-center gap-4 mb-8">
          <div className={`p-3 rounded-2xl ${status?.status === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <ShieldCheck size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">System Integrity</h2>
            <p className="text-slate-500 text-sm">GKE Autopilot Cluster Status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Server size={14} /> <span className="text-[10px] uppercase font-black tracking-widest">Backend</span>
            </div>
            <p className="text-white font-mono text-sm">{status?.service || 'bigfive-backend'}</p>
          </div>
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Globe size={14} /> <span className="text-[10px] uppercase font-black tracking-widest">External IP</span>
            </div>
            <p className="text-white font-mono text-sm">34.160.xxx.xxx</p>
          </div>
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl shadow-purple-500/5">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">Data Architecture</h2>
          <p className="text-slate-500 text-sm">End-to-End Pipeline Visualization</p>
        </div>

        <div className="relative">


          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 relative">
            {/* Step 1: Ingestion */}
            {/* Step 1: Market Data */}
            <div className="flex flex-col items-center group">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center mb-4 z-10 transition-colors group-hover:border-blue-500 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <span className="text-2xl">📡</span>
              </div>
              <h3 className="text-white font-bold mb-1">Market Data</h3>
              <p className="text-xs text-slate-500 text-center">yFinance Library</p>
              <div className="mt-2 px-2 py-1 bg-slate-800 rounded text-[10px] text-blue-400 font-mono">OHLCV</div>
            </div>

            {/* Step 2: News Data */}
            <div className="flex flex-col items-center group">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center mb-4 z-10 transition-colors group-hover:border-pink-500 group-hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]">
                <span className="text-2xl">📰</span>
              </div>
              <h3 className="text-white font-bold mb-1">News Data</h3>
              <p className="text-xs text-slate-500 text-center">NewsAPI.org</p>
              <div className="mt-2 px-2 py-1 bg-slate-800 rounded text-[10px] text-pink-400 font-mono">SENTIMENT</div>
            </div>

            {/* Step 2: Orchestration (New) */}
            <div className="flex flex-col items-center group">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center mb-4 z-10 transition-colors group-hover:border-sky-500 group-hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]">
                <span className="text-2xl">🌪️</span>
              </div>
              <h3 className="text-white font-bold mb-1">Orchestration</h3>
              <p className="text-xs text-slate-500 text-center">Apache Airflow</p>
              <div className="mt-2 px-2 py-1 bg-slate-800 rounded text-[10px] text-sky-400 font-mono">DAG_FLOW</div>
            </div>

            {/* Step 3: Storage / ETL */}
            <div className="flex flex-col items-center group">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center mb-4 z-10 transition-colors group-hover:border-yellow-500 group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                <span className="text-2xl">🏗️</span>
              </div>
              <h3 className="text-white font-bold mb-1">BigQuery</h3>
              <p className="text-xs text-slate-500 text-center">Data Warehouse</p>
              <div className="mt-2 flex gap-1">
                <span className="px-1.5 py-0.5 bg-orange-900/30 text-orange-400 rounded text-[9px] border border-orange-900/50">Bz</span>
                <span className="px-1.5 py-0.5 bg-slate-700/30 text-slate-400 rounded text-[9px] border border-slate-700/50">Ag</span>
                <span className="px-1.5 py-0.5 bg-yellow-900/30 text-yellow-400 rounded text-[9px] border border-yellow-900/50">Au</span>
              </div>
            </div>

            {/* Step 4: Infrastructure (New) */}
            <div className="flex flex-col items-center group">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center mb-4 z-10 transition-colors group-hover:border-indigo-500 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                <span className="text-2xl">☸️</span>
              </div>
              <h3 className="text-white font-bold mb-1">Infrastructure</h3>
              <p className="text-xs text-slate-500 text-center">Google GKE</p>
              <div className="mt-2 px-2 py-1 bg-slate-800 rounded text-[10px] text-indigo-400 font-mono">K8S_CLUSTER</div>
            </div>

            {/* Step 5: Analysis */}
            <div className="flex flex-col items-center group">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center mb-4 z-10 transition-colors group-hover:border-emerald-500 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-white font-bold mb-1">AI Analysis</h3>
              <p className="text-xs text-slate-500 text-center">OpenAI GPT-4</p>
              <div className="mt-2 px-2 py-1 bg-slate-800 rounded text-[10px] text-emerald-400 font-mono">INSIGHTS</div>
            </div>

            {/* Step 6: Presentation */}
            <div className="flex flex-col items-center group">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center mb-4 z-10 transition-colors group-hover:border-purple-500 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-white font-bold mb-1">Frontend</h3>
              <p className="text-xs text-slate-500 text-center">React/Vite</p>
              <div className="mt-2 px-2 py-1 bg-slate-800 rounded text-[10px] text-purple-400 font-mono">UI/UX</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};