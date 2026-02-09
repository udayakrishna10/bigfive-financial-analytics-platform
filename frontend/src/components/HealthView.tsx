import { useEffect, useState } from 'react';
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
    <div className="flex flex-col h-full justify-center">
      <div className="max-w-2xl mx-auto w-full">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-lg shadow-emerald-500/5">
          <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '30px 30px' }}></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-xl ${status?.status === 'ok' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent">System Integrity</h2>
                <p className="text-gray-600 dark:text-slate-400 text-xs font-medium">Cloud Run (Serverless) Status</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/50">
                <div className="flex items-center gap-2 text-gray-700 dark:text-slate-400 mb-2">
                  <Server size={14} /> <span className="text-[10px] uppercase font-black tracking-wider">Backend</span>
                </div>
                <p className="text-gray-900 dark:text-white font-mono text-sm font-bold">{status?.service || 'bigfive-backend'}</p>
              </div>
              <div className="p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/50">
                <div className="flex items-center gap-2 text-gray-700 dark:text-slate-400 mb-2">
                  <Globe size={14} /> <span className="text-[10px] uppercase font-black tracking-wider">External IP</span>
                </div>
                <p className="text-gray-900 dark:text-white font-mono text-sm font-bold">Managed URL</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};