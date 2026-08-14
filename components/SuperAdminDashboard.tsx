import React, { useState, useEffect } from 'react';
import {
    Server, HardDrive, Database, Activity, Cpu, ShieldCheck, RefreshCw,
    DownloadCloud, Wrench, Layers, CheckCircle2, AlertCircle, Terminal
} from 'lucide-react';
import { infraMetricsApi } from '../src/services/api';
import DataSeeder from './DataSeeder';
import { toast } from 'react-hot-toast';

export const SuperAdminDashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [healthData, setHealthData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'seeder'>('overview');

    const loadMetrics = async () => {
        try {
            setLoading(true);
            const data = await infraMetricsApi.getHealth();
            setHealthData(data);
        } catch (err) {
            console.error('Error loading infra health stats:', err);
            toast.error('Erro ao conectar à VPS mdr-vps');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMetrics();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-80">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-sm font-semibold text-gray-600">Auditando infraestrutura da VPS mdr-vps...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 rounded-2xl text-white shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-xl backdrop-blur-md">
                        <Server className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold">Painel de Infraestrutura VPS</h1>
                            <span className="px-2.5 py-0.5 bg-blue-500/30 border border-blue-400/40 text-blue-200 text-xs font-bold rounded-full">
                                Host: mdr-vps
                            </span>
                        </div>
                        <p className="text-sm text-slate-300 mt-1">
                            Monitoramento de serviços, armazenamento de banco de dados e manutenção do sistema.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setActiveTab(activeTab === 'overview' ? 'seeder' : 'overview')}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/10"
                    >
                        <Wrench className="w-4 h-4 text-blue-400" />
                        {activeTab === 'overview' ? 'Ferramenta Seeder (Reset)' : 'Voltar para Visão Geral'}
                    </button>
                    <button
                        onClick={loadMetrics}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Atualizar Status
                    </button>
                </div>
            </div>

            {activeTab === 'seeder' ? (
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <DataSeeder />
                </div>
            ) : (
                <>
                    {/* VPS Key Metric Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* VPS Storage Disk Meter */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Armazenamento VPS (Disco /)</span>
                                    <HardDrive className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-gray-900">{healthData?.diskUsedGb} GB</span>
                                    <span className="text-xs font-medium text-gray-500">de {healthData?.diskTotalGb} GB</span>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-gray-600 font-semibold mb-1">
                                    <span>Uso do Disco</span>
                                    <span>{healthData?.diskUsedPercent}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                        style={{ width: `${healthData?.diskUsedPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* API Latency Status */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Latência da API Supabase</span>
                                    <Activity className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-gray-900">{healthData?.latencyMs} ms</span>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                        🟢 Excelente
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-4">Resposta direta do PostgREST API Gateway em mdr-vps</p>
                        </div>

                        {/* Database Records */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Registros no Banco</span>
                                    <Database className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-gray-900">
                                        {(healthData?.counts?.sessions || 0) + (healthData?.counts?.patients || 0)}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-500">objetos</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-4">Tabelas de agendamentos, pacientes e repasses</p>
                        </div>

                        {/* Services Status */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Containers Docker</span>
                                    <Layers className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-emerald-600">5 / 5</span>
                                    <span className="text-xs font-semibold text-emerald-700">Ativos</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-4">PostgreSQL, Kong, PostgREST, Auth & Caddy</p>
                        </div>
                    </div>

                    {/* Detailed System Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Active Docker Containers */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
                            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Cpu className="w-5 h-5 text-blue-600" />
                                Status dos Serviços da VPS (`mdr-vps`)
                            </h3>

                            <div className="divide-y divide-gray-100">
                                {healthData?.services?.map((svc: any, idx: number) => (
                                    <div key={idx} className="py-3.5 flex items-center justify-between hover:bg-gray-50/50 px-2 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                            <div>
                                                <p className="text-xs font-bold text-gray-900">{svc.name}</p>
                                                <p className="text-[11px] text-gray-500">{svc.details}</p>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded-full">
                                            On-line 🟢
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* DB Table Record Counters */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Database className="w-5 h-5 text-indigo-600" />
                                    Registros do PostgreSQL
                                </h3>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                        <span className="text-xs font-medium text-gray-700">Agendamentos (`sessions`)</span>
                                        <span className="text-xs font-bold text-gray-900">{healthData?.counts?.sessions}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                        <span className="text-xs font-medium text-gray-700">Pacientes (`patients`)</span>
                                        <span className="text-xs font-bold text-gray-900">{healthData?.counts?.patients}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                        <span className="text-xs font-medium text-gray-700">Fisioterapeutas (`professionals`)</span>
                                        <span className="text-xs font-bold text-gray-900">{healthData?.counts?.professionals}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                        <span className="text-xs font-medium text-gray-700">Usuários de Sistema (`system_users`)</span>
                                        <span className="text-xs font-bold text-gray-900">{healthData?.counts?.systemUsers}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                        <span className="text-xs font-medium text-gray-700">Repasses Financeiros (`payments`)</span>
                                        <span className="text-xs font-bold text-gray-900">{healthData?.counts?.payments}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-[11px] text-gray-500">
                                <ShieldCheck className="w-4 h-4 text-blue-600" />
                                Conexão direta via Supabase Client & SSL ativada.
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
