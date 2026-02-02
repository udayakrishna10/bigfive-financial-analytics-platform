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
            <p className="text-white font-mono text-sm">{status?.service || 'faang-api'}</p>
          </div>
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Globe size={14} /> <span className="text-[10px] uppercase font-black tracking-widest">External IP</span>
            </div>
            <p className="text-white font-mono text-sm">34.160.124.118</p>
          </div>
        </div>
      </div>
    </div>
  );
};