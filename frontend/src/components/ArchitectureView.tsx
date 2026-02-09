
import { CheckCircle2, XCircle, ArrowRight, Cloud, Database, DollarSign, Wrench, Shield, Sparkles, Activity, ChevronDown } from 'lucide-react';

export const ArchitectureView = () => {
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-4">

            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 p-6 pb-12 rounded-3xl border border-blue-100 dark:border-blue-900/30 shadow-xl shadow-blue-500/5">
                <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '30px 30px' }}></div>
                <div className="relative z-10">
                    <h2 className="text-3xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-3">
                        Evolution of Architecture
                    </h2>
                    <p className="text-gray-700 dark:text-slate-300 max-w-3xl text-base leading-relaxed">
                        The platform's transformation from legacy enterprise clusters (Phase 1) to a high-performance serverless core (Phase 2), now culminating in a global intelligence layer (Phase 3) for agentic AI and unified data synthesis.
                    </p>
                </div>

                {/* Scroll Indicator - Absolute Bottom Center */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-2 text-blue-500/80 dark:text-blue-400/80 text-[10px] font-bold uppercase tracking-widest animate-pulse z-20">
                    <ChevronDown size={14} className="animate-bounce" />
                    Scroll for Details
                </div>
            </div>

            {/* Comparison Table */}
            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl bg-white dark:bg-slate-900/60 backdrop-blur-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-slate-800/50 dark:to-slate-900/50">
                                <th className="p-3 text-gray-700 dark:text-slate-300 font-bold text-sm uppercase tracking-wider pl-4">Feature</th>
                                <th className="p-3 text-red-700 dark:text-red-300 font-bold text-sm uppercase tracking-wider">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <XCircle size={16} /> Phase 1: Heavy Enterprise
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full font-semibold inline-block w-fit">DEPRECATED</span>
                                    </div>
                                </th>
                                <th className="p-3 text-emerald-700 dark:text-emerald-300 font-bold text-sm uppercase tracking-wider">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={16} /> Phase 2: Serverless
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full font-semibold inline-block w-fit">ACTIVE (CORE)</span>
                                    </div>
                                </th>
                                <th className="p-3 text-blue-700 dark:text-blue-300 font-bold text-sm uppercase tracking-wider">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={16} /> Phase 3: Intelligence
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full font-semibold inline-block w-fit">LIVE (ENHANCED)</span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
                            <tr className="hover:bg-blue-50/50 dark:hover:bg-white/5 transition-all duration-200 group">
                                <td className="p-3 pl-4 text-gray-900 dark:text-slate-200 font-semibold flex items-center gap-3">
                                    <Cloud size={20} className="text-blue-500/70 group-hover:text-blue-500 transition-colors" />
                                    Compute
                                </td>
                                <td className="p-3 text-gray-600 dark:text-slate-400 bg-red-500/5 dark:bg-red-900/10">GKE Autopilot (Always-On)</td>
                                <td className="p-3 text-emerald-700 dark:text-emerald-200 font-medium bg-emerald-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                                    Cloud Run Jobs (Scale-to-Zero)
                                </td>
                                <td className="p-3 text-blue-700 dark:text-blue-200 font-bold bg-blue-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600" />
                                    Serverless + Agentic AI
                                </td>
                            </tr>
                            <tr className="hover:bg-blue-50/50 dark:hover:bg-white/5 transition-all duration-200 group">
                                <td className="p-3 pl-4 text-gray-900 dark:text-slate-200 font-semibold flex items-center gap-3">
                                    <Wrench size={20} className="text-purple-500/70 group-hover:text-purple-500 transition-colors" />
                                    Orchestration
                                </td>
                                <td className="p-3 text-gray-600 dark:text-slate-400 bg-red-500/5 dark:bg-red-900/10">Apache Airflow (Cloud Composer)</td>
                                <td className="p-3 text-emerald-700 dark:text-emerald-200 font-medium bg-emerald-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                                    Native Cloud Scheduler
                                </td>
                                <td className="p-3 text-blue-700 dark:text-blue-200 font-bold bg-blue-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600" />
                                    Real-time Cross-Market Sync
                                </td>
                            </tr>
                            <tr className="hover:bg-blue-50/50 dark:hover:bg-white/5 transition-all duration-200 group">
                                <td className="p-3 pl-4 text-gray-900 dark:text-slate-200 font-semibold flex items-center gap-3">
                                    <Database size={20} className="text-yellow-500/70 group-hover:text-yellow-500 transition-colors" />
                                    Data Strategy
                                </td>
                                <td className="p-3 text-gray-600 dark:text-slate-400 bg-red-500/5 dark:bg-red-900/10">Monolithic BigQuery Storage</td>
                                <td className="p-3 text-emerald-700 dark:text-emerald-200 font-medium bg-emerald-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                                    BigQuery + GCS "Intelligence Sink"
                                </td>
                                <td className="p-3 text-blue-700 dark:text-blue-200 font-bold bg-blue-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600" />
                                    Cross-Asset Global Integration
                                </td>
                            </tr>
                            <tr className="hover:bg-blue-50/50 dark:hover:bg-white/5 transition-all duration-200 group">
                                <td className="p-3 pl-4 text-gray-900 dark:text-slate-200 font-semibold flex items-center gap-3">
                                    <DollarSign size={20} className="text-red-500/70 group-hover:text-red-500 transition-colors" />
                                    Operational Cost
                                </td>
                                <td className="p-3 text-red-700 dark:text-red-300 font-semibold bg-red-500/5 dark:bg-red-900/10">High (~$100+/month idle fees)</td>
                                <td className="p-3 text-emerald-700 dark:text-emerald-200 font-medium bg-emerald-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                                    Scale-to-Zero Efficiency
                                </td>
                                <td className="p-3 text-blue-700 dark:text-blue-200 font-bold bg-blue-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600" />
                                    Usage-Based Costing
                                </td>
                            </tr>
                            <tr className="hover:bg-blue-50/50 dark:hover:bg-white/5 transition-all duration-200 group">
                                <td className="p-3 pl-4 text-gray-900 dark:text-slate-200 font-semibold flex items-center gap-3">
                                    <ArrowRight size={20} className="text-cyan-500/70 group-hover:text-cyan-500 transition-colors" />
                                    CI/CD Pipeline
                                </td>
                                <td className="p-3 text-gray-600 dark:text-slate-400 bg-red-500/5 dark:bg-red-900/10">Manual / Cloud Build</td>
                                <td className="p-3 text-emerald-700 dark:text-emerald-200 font-medium bg-emerald-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                                    GitHub Actions (Automated)
                                </td>
                                <td className="p-3 text-blue-700 dark:text-blue-200 font-bold bg-blue-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600" />
                                    Pull Request & Verified Deploy
                                </td>
                            </tr>
                            <tr className="hover:bg-blue-50/50 dark:hover:bg-white/5 transition-all duration-200 group">
                                <td className="p-3 pl-4 text-gray-900 dark:text-slate-200 font-semibold flex items-center gap-3">
                                    <Wrench size={20} className="text-orange-500/70 group-hover:text-orange-500 transition-colors" />
                                    Maintenance
                                </td>
                                <td className="p-3 text-gray-600 dark:text-slate-400 bg-red-500/5 dark:bg-red-900/10">Cluster & Node Management</td>
                                <td className="p-3 text-emerald-700 dark:text-emerald-200 font-medium bg-emerald-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                                    Zero-Ops (Managed Serverless)
                                </td>
                                <td className="p-3 text-blue-700 dark:text-blue-200 font-bold bg-blue-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600" />
                                    Automated Data Quality Logic
                                </td>
                            </tr>
                            <tr className="hover:bg-blue-50/50 dark:hover:bg-white/5 transition-all duration-200 group">
                                <td className="p-3 pl-4 text-gray-900 dark:text-slate-200 font-semibold flex items-center gap-3">
                                    <ArrowRight size={20} className="text-indigo-500/70 group-hover:text-indigo-500 transition-colors" />
                                    Best Use Case
                                </td>
                                <td className="p-3 text-gray-600 dark:text-slate-400 bg-red-500/5 dark:bg-red-900/10">Continuous Streaming / High Traffic</td>
                                <td className="p-3 text-emerald-700 dark:text-emerald-200 font-medium bg-emerald-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                                    Daily Post-Market Batch Processing
                                </td>
                                <td className="p-3 text-blue-700 dark:text-blue-200 font-bold bg-blue-500/5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600" />
                                    Automated Insights
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Impact Metrics (Moved & Resized) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-blue-600 p-3 rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-3">
                        <div className="flex-1 text-center">
                            <h4 className="text-emerald-100 font-bold uppercase tracking-widest text-[10px] mb-0.5">Impact Metric</h4>
                            <h3 className="text-lg font-black text-white tracking-tight mb-0.5">97.5% Cost Reduction</h3>
                            <p className="text-[10px] text-emerald-100 leading-tight">From $40/mo (GKE) to ~$1/mo (Cloud Run).</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-md">
                            <DollarSign size={16} className="text-white" />
                        </div>
                    </div>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-3">
                        <div className="flex-1 text-center">
                            <h4 className="text-purple-100 font-bold uppercase tracking-widest text-[10px] mb-0.5">System Strategy</h4>
                            <h3 className="text-lg font-black text-white tracking-tight mb-0.5">Zero-Ops Managed</h3>
                            <p className="text-[10px] text-purple-100 leading-tight">Fully automated, decoupled serverless.</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-md">
                            <Activity size={16} className="text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Architecture Visualization */}
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950 border border-purple-100 dark:border-purple-900/30 p-6 rounded-3xl shadow-2xl shadow-purple-500/10">
                <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" style={{ backgroundSize: '30px 30px' }}></div>
                <div className="relative">
                    <div className="mb-6">
                        <h2 className="text-3xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">Data Architecture</h2>
                        <p className="text-gray-700 dark:text-slate-400 text-base">End-to-End Pipeline Visualization</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {/* Step 1: Market Data */}
                        <div className="flex flex-col items-center group text-center w-full">
                            <h3 className="text-lg font-black bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent mb-3 whitespace-nowrap">Market Data</h3>
                            <p className="text-xs text-gray-700 dark:text-slate-300 mb-3 font-medium whitespace-nowrap">yFinance + FRED + CoinGecko</p>
                            <div className="px-2 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl text-[10px] text-white font-mono font-bold shadow-lg shadow-blue-500/30 whitespace-nowrap">OHLCV + MACRO + CRYPTO</div>
                        </div>

                        {/* Step 2: News Data */}
                        <div className="flex flex-col items-center group">
                            <h3 className="text-lg font-black bg-gradient-to-r from-pink-600 to-pink-700 dark:from-pink-400 dark:to-pink-500 bg-clip-text text-transparent mb-3 text-center">News Data</h3>
                            <p className="text-xs text-gray-700 dark:text-slate-300 text-center mb-3 font-medium">NewsAPI.org</p>
                            <div className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 dark:from-pink-600 dark:to-pink-700 rounded-xl text-[10px] text-white font-mono font-bold text-center shadow-lg shadow-pink-500/30">SENTIMENT</div>
                        </div>

                        {/* Step 3: Orchestration */}
                        <div className="flex flex-col items-center group">
                            <h3 className="text-lg font-black bg-gradient-to-r from-sky-600 to-sky-700 dark:from-sky-400 dark:to-sky-500 bg-clip-text text-transparent mb-3 text-center">Orchestration</h3>
                            <p className="text-xs text-gray-700 dark:text-slate-300 text-center mb-3 font-medium">Cloud Run Jobs</p>
                            <div className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-sky-600 dark:from-sky-600 dark:to-sky-700 rounded-xl text-[10px] text-white font-mono font-bold text-center shadow-lg shadow-sky-500/30">DAILY_ETL</div>
                        </div>

                        {/* Step 4: BigQuery */}
                        <div className="flex flex-col items-center group">
                            <h3 className="text-lg font-black bg-gradient-to-r from-yellow-600 to-yellow-700 dark:from-yellow-400 dark:to-yellow-500 bg-clip-text text-transparent mb-3 text-center">BigQuery</h3>
                            <p className="text-xs text-gray-700 dark:text-slate-300 text-center mb-3 font-medium">Data Warehouse</p>
                            <div className="flex gap-2">
                                <span className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-[10px] font-bold shadow-md">Bz</span>
                                <span className="px-3 py-1.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg text-[10px] font-bold shadow-md">Ag</span>
                                <span className="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg text-[10px] font-bold shadow-md">Au</span>
                            </div>
                        </div>

                        {/* Step 5: Infrastructure */}
                        <div className="flex flex-col items-center group">
                            <h3 className="text-lg font-black bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-400 dark:to-indigo-500 bg-clip-text text-transparent mb-3 text-center">Infrastructure</h3>
                            <p className="text-xs text-gray-700 dark:text-slate-300 text-center mb-3 font-medium">Google Cloud Run</p>
                            <div className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 rounded-xl text-[10px] text-white font-mono font-bold text-center shadow-lg shadow-indigo-500/30">SERVERLESS</div>
                        </div>

                        {/* Step 6: AI Analysis */}
                        <div className="flex flex-col items-center group">
                            <h3 className="text-lg font-black bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-400 dark:to-emerald-500 bg-clip-text text-transparent mb-3 text-center">AI Analysis</h3>
                            <p className="text-xs text-gray-700 dark:text-slate-300 text-center mb-3 font-medium">OpenAI GPT-4</p>
                            <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 rounded-xl text-[10px] text-white font-mono font-bold text-center shadow-lg shadow-emerald-500/30">REASONING</div>
                        </div>

                        {/* Step 7: Frontend */}
                        <div className="flex flex-col items-center group">
                            <h3 className="text-lg font-black bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-400 dark:to-purple-500 bg-clip-text text-transparent mb-3 text-center">Frontend</h3>
                            <p className="text-xs text-gray-700 dark:text-slate-300 text-center mb-3 font-medium">React/Vite</p>
                            <div className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-xl text-[10px] text-white font-mono font-bold text-center shadow-lg shadow-purple-500/30">UI/UX</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Security & Governance */}
            <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-xl shadow-emerald-500/5">
                <h3 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mb-4 flex items-center gap-3">
                    <Shield className="text-emerald-500" size={24} />
                    Security & Governance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800/50 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/30 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mb-3" />
                        <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                            <span className="text-gray-900 dark:text-white font-bold block mb-2">Encrypted Secret Handling</span>
                            Sensitive credentials are encrypted at rest and injected into the runtime environment via secured pipelines, ensuring zero code exposure.
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/30 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mb-3" />
                        <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                            <span className="text-gray-900 dark:text-white font-bold block mb-2">Identity-Based Access</span>
                            All services operate under strict "Least Privilege" identities with access limited to necessary data storage and processing scopes.
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/30 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mb-3" />
                        <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                            <span className="text-gray-900 dark:text-white font-bold block mb-2">Retention & Compliance</span>
                            Automated snapshots of platform activity and analysis are persisted in immutable storage for historical auditing and data integrity.
                        </p>
                    </div>
                </div>
            </div>

            {/* Engineering Lifecycle */}
            <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950 p-6 rounded-3xl border border-purple-100 dark:border-purple-900/30 shadow-xl shadow-purple-500/5">
                <h3 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent mb-4 flex items-center gap-3">
                    <Wrench size={24} className="text-purple-500" />
                    Engineering Lifecycle & CI/CD
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800/50 p-5 rounded-2xl border border-purple-200 dark:border-purple-900/30 shadow-sm hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
                            <span className="text-lg font-black text-white">1</span>
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-base mb-3">Automated Verification</h4>
                        <p className="text-sm text-gray-700 dark:text-slate-400 leading-relaxed">
                            Every Pull Request triggers a GitHub Action that runs linting, type checks, and build verification to ensure code integrity before merging.
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 p-5 rounded-2xl border border-blue-200 dark:border-blue-900/30 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                            <span className="text-lg font-black text-white">2</span>
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-base mb-3">Dockerized Deployment</h4>
                        <p className="text-sm text-gray-700 dark:text-slate-400 leading-relaxed">
                            Verified code is packaged into immutable Docker containers, pushed to Google Artifact Registry, and deployed to Cloud Run with zero-downtime.
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/30 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                            <span className="text-lg font-black text-white">3</span>
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-base mb-3">Post-Deploy Audits</h4>
                        <p className="text-sm text-gray-700 dark:text-slate-400 leading-relaxed">
                            Automated health checks and latency monitoring ensure the API and ETL jobs are performing within optimized serverless thresholds.
                        </p>
                    </div>
                </div>
            </div>


        </div>
    );
};
export default ArchitectureView;
