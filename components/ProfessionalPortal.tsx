
import React, { useState } from 'react';
import { SESSIONS, PATIENTS, PROFESSIONALS } from '../constants';
import { UnitId, SessionStatus, Announcement } from '../types';
import { 
    Calendar, DollarSign, Clock, CheckCircle, User, 
    LayoutDashboard, List, TrendingUp, Filter, Search, 
    Download, AlertCircle, ChevronRight, FileText, FileSignature, AlertTriangle, Megaphone
} from 'lucide-react';

interface ProfessionalPortalProps {
    currentUnit: UnitId;
    professionalId: string; // Hardcoded for demo usually
    announcements: Announcement[];
}

const ProfessionalPortal: React.FC<ProfessionalPortalProps> = ({ currentUnit, professionalId, announcements }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'financial'>('overview');
    const [searchTerm, setSearchTerm] = useState('');

    // Dados do Profissional
    const professional = PROFESSIONALS.find(p => p.id === professionalId);
    
    // Filter sessions for this professional
    const mySessions = SESSIONS.filter(s => s.professionalId === professionalId && s.unitId === currentUnit);
    
    // Filtros e Cálculos
    const completedSessions = mySessions.filter(s => s.status === SessionStatus.COMPLETED);
    const hourlyRate = professional?.hourlyRate || 0;
    
    // Cálculo financeiro simples (Valor Hora * Sessões Realizadas)
    const currentMonthEarnings = completedSessions.length * hourlyRate;
    const projectedEarnings = mySessions.length * hourlyRate; // Inclui agendadas

    // Avisos filtrados para profissionais ou todos
    const myAnnouncements = announcements.filter(a => a.targetRole === 'all' || a.targetRole === 'professional');

    // Renderização das Abas
    return (
        <div className="space-y-6 animate-fade-in">
             {/* Header Profissional */}
             <div className="bg-white border-b border-gray-200 -mx-4 md:-mx-8 px-4 md:px-8 pt-6 pb-0 mb-6 flex flex-col gap-6 sticky top-0 z-20 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Portal do Profissional</h1>
                        <p className="text-gray-500">Gerencie seus atendimentos e acompanhe seus rendimentos.</p>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-gray-900">{professional?.name}</p>
                        <p className="text-xs text-gray-500">{professional?.specialty} • CRF {professional?.crf}</p>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex gap-6 overflow-x-auto no-scrollbar">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`pb-3 border-b-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Visão Geral
                    </button>
                    <button 
                        onClick={() => setActiveTab('schedule')}
                        className={`pb-3 border-b-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'schedule' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <List className="w-4 h-4" />
                        Minha Agenda
                    </button>
                    <button 
                        onClick={() => setActiveTab('financial')}
                        className={`pb-3 border-b-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'financial' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <DollarSign className="w-4 h-4" />
                        Financeiro
                    </button>
                </div>
             </div>

            {/* --- TAB CONTENT: OVERVIEW --- */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                        
                        <h2 className="text-xl font-bold mb-2 relative z-10">Resumo do Dia</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 relative z-10">
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                                <div className="flex items-center gap-3 mb-2">
                                    <Calendar className="w-5 h-5 text-blue-200" />
                                    <span className="font-medium text-blue-50">Sessões Hoje</span>
                                </div>
                                <p className="text-3xl font-bold">{mySessions.filter(s => s.date === new Date().toISOString().split('T')[0]).length}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                                <div className="flex items-center gap-3 mb-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-300" />
                                    <span className="font-medium text-blue-50">Realizadas (Mês)</span>
                                </div>
                                <p className="text-3xl font-bold">{completedSessions.length}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                                <div className="flex items-center gap-3 mb-2">
                                    <TrendingUp className="w-5 h-5 text-yellow-300" />
                                    <span className="font-medium text-blue-50">Produção (Mês)</span>
                                </div>
                                <p className="text-3xl font-bold">R$ {currentMonthEarnings.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                    Próximos Atendimentos
                                </h3>
                            </div>
                            
                            {mySessions.length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {mySessions.slice(0, 5).map(session => {
                                        const patient = PATIENTS.find(p => p.id === session.patientId);
                                        return (
                                            <div key={session.id} className={`p-4 hover:bg-gray-50 transition-colors flex items-center justify-between ${session.status === SessionStatus.NOSHOW ? 'bg-red-50/50' : ''}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-bold text-center min-w-[60px]">
                                                        {session.time}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {/* Patient Photo in List */}
                                                        {patient?.photoUrl ? (
                                                            <img src={patient.photoUrl} alt={patient.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold">
                                                                {patient?.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                                                {patient?.name}
                                                                {session.signed && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200" title="Assinatura Coletada">
                                                                        <FileSignature className="w-3 h-3" /> Assinado
                                                                    </span>
                                                                )}
                                                            </h4>
                                                            <p className="text-sm text-gray-500">{session.type}</p>
                                                            {session.status === SessionStatus.NOSHOW && (
                                                                <span className="inline-flex items-center gap-1 text-xs text-red-600 mt-1 font-bold">
                                                                    <AlertTriangle className="w-3 h-3" /> Paciente Faltou
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-gray-300" />
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="p-12 text-center text-gray-400">
                                    Sem atendimentos agendados.
                                </div>
                            )}
                             <button 
                                onClick={() => setActiveTab('schedule')}
                                className="w-full py-3 text-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors border-t border-gray-100"
                            >
                                Ver Agenda Completa
                            </button>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-fit">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-orange-500" />
                                Mural da Administração
                            </h3>
                            <div className="space-y-3">
                                {myAnnouncements.length > 0 ? myAnnouncements.map(ann => (
                                    <div key={ann.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                        <p className="font-bold text-sm text-gray-900 mb-1">{ann.title}</p>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            {ann.message}
                                        </p>
                                    </div>
                                )) : (
                                    <p className="text-gray-400 text-sm text-center italic">Nenhum aviso no momento.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB CONTENT: SCHEDULE --- */}
            {activeTab === 'schedule' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar paciente..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-900 placeholder:text-gray-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <input type="date" className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white" />
                            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium">
                                <Filter className="w-4 h-4" /> Filtros
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Data/Hora</th>
                                    <th className="px-6 py-4">Paciente</th>
                                    <th className="px-6 py-4">Procedimento</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {mySessions
                                    .filter(s => {
                                        const pName = PATIENTS.find(p => p.id === s.patientId)?.name.toLowerCase() || '';
                                        return pName.includes(searchTerm.toLowerCase());
                                    })
                                    .map(session => {
                                    const patient = PATIENTS.find(p => p.id === session.patientId);
                                    return (
                                        <tr key={session.id} className={`hover:bg-gray-50/50 ${session.status === SessionStatus.NOSHOW ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900">{new Date(session.date).toLocaleDateString('pt-BR')}</span>
                                                    <span className="text-gray-500">{session.time}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {patient?.photoUrl ? (
                                                        <img src={patient.photoUrl} alt={patient.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                            {patient?.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-gray-900 flex items-center gap-1">
                                                            {patient?.name}
                                                            {session.signed && (
                                                                <span title="Assinado">
                                                                    <FileSignature className="w-3 h-3 text-emerald-600" />
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{patient?.phone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                <span className="bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200">
                                                    {session.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                                                    ${session.status === SessionStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700' : 
                                                      session.status === SessionStatus.SCHEDULED ? 'bg-blue-50 text-blue-700' :
                                                      session.status === SessionStatus.NOSHOW ? 'bg-red-100 text-red-700 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                                                    {session.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                                                    Ver Detalhes
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- TAB CONTENT: FINANCIAL --- */}
            {activeTab === 'financial' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900">Extrato Financeiro</h2>
                                <p className="text-sm text-gray-500">Valor Hora Atual: <span className="font-semibold text-gray-900">R$ {hourlyRate.toFixed(2)}</span></p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <select className="bg-gray-50 border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none">
                                <option>Maio 2024</option>
                                <option>Abril 2024</option>
                            </select>
                            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm">
                                <Download className="w-4 h-4" /> Exportar
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-500 mb-1">Ganhos Confirmados (Mês)</p>
                            <h3 className="text-3xl font-bold text-emerald-600">R$ {currentMonthEarnings.toFixed(2)}</h3>
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                                <span className="text-gray-500">Sessões Realizadas</span>
                                <span className="font-bold text-gray-900">{completedSessions.length}</span>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-500 mb-1">Ganhos Projetados (Mês)</p>
                            <h3 className="text-3xl font-bold text-blue-600">R$ {projectedEarnings.toFixed(2)}</h3>
                             <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                                <span className="text-gray-500">Sessões Totais</span>
                                <span className="font-bold text-gray-900">{mySessions.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Detalhamento de Sessões</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Paciente</th>
                                        <th className="px-6 py-4">Procedimento</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Valor Gerado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {mySessions.map(session => {
                                        const patient = PATIENTS.find(p => p.id === session.patientId);
                                        const isCompleted = session.status === SessionStatus.COMPLETED;
                                        return (
                                            <tr key={session.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-gray-600">
                                                    {new Date(session.date).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {patient?.name}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {session.type}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isCompleted ? (
                                                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded">
                                                            <CheckCircle className="w-3 h-3" /> Processado
                                                        </span>
                                                    ) : session.status === SessionStatus.NOSHOW ? (
                                                        <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">
                                                            <AlertTriangle className="w-3 h-3" /> Faltou
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded">
                                                            <Clock className="w-3 h-3" /> Pendente
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-bold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                                                    R$ {isCompleted ? hourlyRate.toFixed(2) : '0.00'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfessionalPortal;
