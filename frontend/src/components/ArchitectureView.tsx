
import { CheckCircle2, XCircle, ArrowRight, Server, Cloud, Database, DollarSign, Wrench } from 'lucide-react';

export const ArchitectureView = () => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-gray-200 dark:border-white/5 backdrop-blur-xl">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
                    <Server className="text-blue-400" />
                    Evolution of Architecture
                </h2>
                <p className="text-gray-700 dark:text-slate-400 mt-2 max-w-2xl text-justify">
                    A strategic migration from an Enterprise-Native GKE stack to a fully optimized Serverless pipeline, achieving
                    <span className="text-emerald-400 font-bold ml-1">99% cost reduction</span> while maintaining identical performance.
                </p>
            </div>

            {/* Comparison Table */}
            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                                <th className="p-4 py-5 text-gray-700 dark:text-slate-400 font-semibold text-sm uppercase tracking-wider pl-8">Feature</th>
                                <th className="p-4 py-5 text-red-700 dark:text-red-300/80 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                    <XCircle size={16} /> Phase 1: Enterprise Native (GKE)
                                </th>
                                <th className="p-4 py-5 text-emerald-700 dark:text-emerald-300 font-bold text-sm uppercase tracking-wider">
                                    <span className="flex items-center gap-2">
                                        <CheckCircle2 size={16} /> Phase 2: Serverless Optimized
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/5 text-sm">
                            <tr className="hover:bg-white/5 transition-colors group">
                                <td className="p-5 pl-8 text-gray-900 dark:text-slate-300 font-medium flex items-center gap-3">
                                    <Cloud size={18} className="text-blue-500/50 group-hover:text-blue-400 transition-colors" />
                                    Compute
                                </td>
                                <td className="p-5 text-gray-700 dark:text-slate-400 bg-red-500/5 dark:bg-red-900/10">GKE Autopilot (Always-On)</td>
                                <td className="p-5 text-emerald-700 dark:text-emerald-100 font-medium bg-emerald-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50" />
                                    Cloud Run Jobs (Scale-to-Zero)
                                </td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors group">
                                <td className="p-5 pl-8 text-gray-900 dark:text-slate-300 font-medium flex items-center gap-3">
                                    <Wrench size={18} className="text-purple-500/50 group-hover:text-purple-400 transition-colors" />
                                    Orchestration
                                </td>
                                <td className="p-5 text-gray-700 dark:text-slate-400 bg-red-500/5 dark:bg-red-900/10">Apache Airflow (Cloud Composer)</td>
                                <td className="p-5 text-emerald-700 dark:text-emerald-100 font-medium bg-emerald-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50" />
                                    Native Cloud Scheduler
                                </td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors group">
                                <td className="p-5 pl-8 text-gray-900 dark:text-slate-300 font-medium flex items-center gap-3">
                                    <Database size={18} className="text-yellow-500/50 group-hover:text-yellow-400 transition-colors" />
                                    Storage Strategy
                                </td>
                                <td className="p-5 text-gray-700 dark:text-slate-400 bg-red-500/5 dark:bg-red-900/10">Monolithic BigQuery Storage</td>
                                <td className="p-5 text-emerald-700 dark:text-emerald-100 font-medium bg-emerald-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50" />
                                    BigQuery + GCS "Intelligence Sink"
                                </td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors group">
                                <td className="p-5 pl-8 text-gray-900 dark:text-slate-300 font-medium flex items-center gap-3">
                                    <DollarSign size={18} className="text-red-500/50 group-hover:text-red-400 transition-colors" />
                                    Operational Cost
                                </td>
                                <td className="p-5 text-red-700 dark:text-red-300 font-semibold bg-red-500/5 dark:bg-red-900/10">High (~$100+/month idle fees)</td>
                                <td className="p-5 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50" />
                                    Minimal (99% Reduction)
                                </td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors group">
                                <td className="p-5 pl-8 text-gray-900 dark:text-slate-300 font-medium flex items-center gap-3">
                                    <ArrowRight size={18} className="text-cyan-500/50 group-hover:text-cyan-400 transition-colors" />
                                    CI/CD Pipeline
                                </td>
                                <td className="p-5 text-gray-700 dark:text-slate-400 bg-red-500/5 dark:bg-red-900/10">Manual / Cloud Build</td>
                                <td className="p-5 text-emerald-700 dark:text-emerald-100 font-medium bg-emerald-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50" />
                                    GitHub Actions (Automated)
                                </td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors group">
                                <td className="p-5 pl-8 text-gray-900 dark:text-slate-300 font-medium flex items-center gap-3">
                                    <Wrench size={18} className="text-orange-500/50 group-hover:text-orange-400 transition-colors" />
                                    Maintenance
                                </td>
                                <td className="p-5 text-gray-700 dark:text-slate-400 bg-red-500/5 dark:bg-red-900/10">Cluster & Node Management</td>
                                <td className="p-5 text-emerald-700 dark:text-emerald-100 font-medium bg-emerald-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50" />
                                    Zero-Ops (Managed Serverless)
                                </td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors group">
                                <td className="p-5 pl-8 text-gray-900 dark:text-slate-300 font-medium flex items-center gap-3">
                                    <ArrowRight size={18} className="text-indigo-500/50 group-hover:text-indigo-400 transition-colors" />
                                    Best Use Case
                                </td>
                                <td className="p-5 text-gray-700 dark:text-slate-400 bg-red-500/5 dark:bg-red-900/10">Continuous Streaming / High Traffic</td>
                                <td className="p-5 text-emerald-700 dark:text-emerald-100 font-medium bg-emerald-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50" />
                                    Daily Post-Market Batch Processing
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
