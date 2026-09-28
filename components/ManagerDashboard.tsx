import React, { useState, useEffect } from 'react';
import {
    Activity, Users, Calendar, AlertTriangle, TrendingUp,
    CheckCircle2, XCircle, Clock, RefreshCw, ChevronRight, UserCheck, Phone
} from 'lucide-react';
import { UnitId, isClinicalProfessional } from '../types';
import { managerMetricsApi, professionalsApi } from '../src/services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface ManagerDashboardProps {
    currentUnit: UnitId;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ currentUnit }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<any>(null);
    const [professionals, setProfessionals] = useState<any[]>([]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [stats, profs] = await Promise.all([
                managerMetricsApi.getStats(currentUnit),
                professionalsApi.getAll()
            ]);
            setMetrics(stats);
            setProfessionals(profs);
        } catch (err) {
            console.error('Error loading manager dashboard metrics:', err);
            toast.error('Erro ao carregar dados da unidade');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentUnit]);

    // Filtra equipe clínica estrita respeitando a unidade atual
    const clinicalProfs = professionals.filter(prof => {
        if (!isClinicalProfessional(prof)) return false;
        if (currentUnit !== 'ALL') {
            const inUnit = (prof.unitIds && prof.unitIds.includes(currentUnit)) || prof.unitId === currentUnit;
            if (!inUnit) return false;
        }
        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-80">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-sm font-semibold text-gray-600">Carregando painel do gerente...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Painel do Gerente Operacional</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Acompanhe a taxa de ocupação, produtividade da equipe e renovação de pacotes de pacientes.
                    </p>
                </div>
                <button
                    onClick={loadData}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                    Atualizar Dados
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Occupancy Rate */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Aproveitamento da Agenda</span>
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-gray-900">{metrics?.occupancyRate || 0}%</span>
                            <span className="text-xs font-semibold text-emerald-600">Realizadas + Confirmadas</span>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${metrics?.occupancyRate || 0}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Total Sessions */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Atendimentos no Mês</span>
                            <Calendar className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-gray-900">{metrics?.totalSessions || 0}</span>
                            <span className="text-xs font-semibold text-gray-500">sessões</span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">{metrics?.completedSessions || 0} realizadas / {metrics?.confirmedSessions || 0} confirmadas</p>
                </div>

                {/* No-Shows */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Faltas & Cancelamentos</span>
                            <XCircle className="w-5 h-5 text-rose-500" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-gray-900">
                                {(metrics?.noShowSessions || 0) + (metrics?.cancelledSessions || 0)}
                            </span>
                            <span className="text-xs font-semibold text-rose-600">no mês</span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">{metrics?.noShowSessions || 0} ausências sem aviso / {metrics?.cancelledSessions || 0} cancelamentos</p>
                </div>

                {/* Active Patients */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Pacientes Ativos</span>
                            <Users className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-gray-900">{metrics?.totalPatients || 0}</span>
                            <span className="text-xs font-semibold text-gray-500">ativos</span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">Prontuários em acompanhamento ativo</p>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Team Productivity */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-blue-600" />
                            Equipe Técnica de Fisioterapeutas ({clinicalProfs.length})
                        </h3>
                        <button
                            onClick={() => navigate('/profissionais')}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                        >
                            Ver Todos
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="divide-y divide-gray-100 max-h-[360px] overflow-y-auto pr-1">
                        {clinicalProfs.map(prof => (
                            <div key={prof.id} className="py-3 flex items-center justify-between hover:bg-gray-50/50 px-2 rounded-xl transition-colors">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                                        style={{ backgroundColor: prof.color || '#2563EB' }}
                                    >
                                        {prof.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">{prof.name}</p>
                                        <p className="text-[11px] text-gray-500">{prof.specialty} • CRF: {prof.crf}</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                                    Ativo na Unidade
                                </span>
                            </div>
                        ))}
                        {clinicalProfs.length === 0 && (
                            <div className="py-8 text-center text-gray-400 text-xs">
                                Nenhum profissional clínico vinculado a esta unidade.
                            </div>
                        )}
                    </div>
                </div>

                {/* Patient Renewal Alerts */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                Alertas de Renovação
                            </h3>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full">
                                {metrics?.patientsNeedingRenewal?.length || 0} pendentes
                            </span>
                        </div>

                        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                            {metrics?.patientsNeedingRenewal && metrics.patientsNeedingRenewal.length > 0 ? (
                                metrics.patientsNeedingRenewal.map((p: any) => (
                                    <div key={p.id} className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl hover:bg-amber-100/60 transition-colors">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-bold text-xs text-gray-900 truncate">{p.name}</p>
                                                <p className="text-[11px] text-gray-500 truncate">{p.planName}</p>
                                                {p.phone && (
                                                    <p className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5 font-medium">
                                                        <Phone className="w-3 h-3 text-gray-400" />
                                                        {p.phone}
                                                    </p>
                                                )}
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black whitespace-nowrap ${
                                                p.remainingSessions === 0 
                                                    ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                                    : 'bg-amber-200/80 text-amber-900'
                                            }`}>
                                                {p.remainingSessions === 0 ? 'Zerado' : `${p.remainingSessions} rest.`}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-6 bg-gray-50/80 rounded-xl border border-dashed border-gray-200 text-center">
                                    <p className="text-xs text-gray-500 font-medium">
                                        Todos os pacientes com planos vigentes possuem mais de 2 sessões restantes.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/pacientes')}
                        className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
                    >
                        Gerenciar Pacientes
                    </button>
                </div>
            </div>
        </div>
    );
};
