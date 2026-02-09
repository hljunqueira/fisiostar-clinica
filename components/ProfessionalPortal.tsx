
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UnitId, SessionStatus, Announcement, Professional, Session, Patient, Unit } from '../types';
import { professionalsApi, sessionsApi, patientsApi, unitsApi } from '../src/services/api';
import {
    Calendar, DollarSign, Clock, CheckCircle, User,
    LayoutDashboard, List, TrendingUp, Filter, Search,
    Download, AlertCircle, ChevronRight, FileText, FileSignature, AlertTriangle, Megaphone, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import CalendarHeader, { ViewMode } from './Calendar/CalendarHeader';
import DayView from './Calendar/DayView';
import WeekView from './Calendar/WeekView';
import MonthView from './Calendar/MonthView';
import DayListView from './Calendar/DayListView';
import WeekListView from './Calendar/WeekListView';
import AppointmentModal from './AppointmentModal';
import { useAuth } from '../src/contexts/AuthContext';

interface ProfessionalPortalProps {
    currentUnit: UnitId;
    professionalId?: string; // Optional, will be auto-detected if not provided
    announcements: Announcement[];
    defaultTab?: 'overview' | 'schedule' | 'financial';
}

const ProfessionalPortal: React.FC<ProfessionalPortalProps> = ({ currentUnit, professionalId: propProfId, announcements, defaultTab = 'overview' }) => {
    const { systemUser } = useAuth();
    const navigate = useNavigate();
    const activeTab = defaultTab; // Tab is controlled by route now

    // Calendar State
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

    // State for dynamic data
    const [professional, setProfessional] = useState<Professional | null>(null);
    const [mySessions, setMySessions] = useState<Session[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [unit, setUnit] = useState<Unit | null>(null);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [profs, sess, pats, unitsData] = await Promise.all([
                professionalsApi.getAll(),
                sessionsApi.getAll(),
                patientsApi.getAll(),
                unitsApi.getAll()
            ]);

            setUnits(unitsData);

            // Find professional: first try by prop ID, then by systemUser name match
            let currentProfessional: Professional | null = null;

            if (propProfId) {
                currentProfessional = profs.find(p => p.id === propProfId) || null;
            }

            // Fallback: match by name from systemUser
            if (!currentProfessional && systemUser?.name) {
                currentProfessional = profs.find(p =>
                    p.name.toLowerCase().trim() === systemUser.name.toLowerCase().trim()
                ) || null;
            }

            setProfessional(currentProfessional);

            // Filter sessions for this professional (across all units to see all appointments)
            const filteredSessions = currentProfessional
                ? sess.filter(s => s.professionalId === currentProfessional.id)
                : [];
            setMySessions(filteredSessions);

            setPatients(pats);

            if (currentUnit === 'ALL') {
                setUnit(null);
            } else {
                setUnit(unitsData.find(u => u.id === currentUnit) || null);
            }

        } catch (error) {
            console.error("Error loading professional data:", error);
            toast.error("Erro ao carregar dados do profissional.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentUnit, propProfId, systemUser?.name]);

    // Calendar Actions
    const handleSyncGoogle = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            toast.success('Sincronizado com Google Agenda!');
        }, 1500);
    };

    const handleAddSession = async (newSession: Session) => {
        try {
            // Force professional ID to be the current user
            const sessionToCreate = { ...newSession, professionalId: professional?.id || '' };
            await sessionsApi.create(sessionToCreate);
            await loadData();
            toast.success('Agendamento criado com sucesso!');
            setIsAppointmentModalOpen(false);

            // Navigate to date
            const [year, month, day] = newSession.date.split('-').map(Number);
            const newDate = new Date(year, month - 1, day, 12, 0, 0);
            setSelectedDate(newDate);

        } catch (error) {
            console.error('Error creating session:', error);
            toast.error('Erro ao agendar.');
        }
    };

    const handleNavigateDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
    };

    // Filter sessions for Calendar View
    const calendarSessions = mySessions.filter(s => {
        const isSpecialty = filterSpecialty === 'all' || s.type === filterSpecialty;
        return isSpecialty;
    });

    // Handler for drag-and-drop session updates
    const handleUpdateSession = async (sessionId: string, updates: Partial<Session>) => {
        try {
            const session = mySessions.find(s => s.id === sessionId);
            if (!session) return;

            const updatedSession = { ...session, ...updates };
            await sessionsApi.update(sessionId, updatedSession);
            loadData();
            toast.success('Agendamento movido com sucesso!');
        } catch (error) {
            console.error('Error updating session:', error);
            toast.error('Erro ao mover agendamento');
        }
    };

    // Filtros e Cálculos
    const completedSessions = mySessions.filter(s => s.status === SessionStatus.COMPLETED);
    const hourlyRate = professional?.hourlyRate || 0;

    // Cálculo financeiro simples (Valor Hora * Sessões Realizadas)
    const currentMonthEarnings = completedSessions.length * hourlyRate;
    const projectedEarnings = mySessions.length * hourlyRate; // Inclui agendadas

    // Avisos filtrados para profissionais ou todos
    const myAnnouncements = announcements.filter(a => a.targetRole === 'all' || a.targetRole === 'professional');

    if (loading && !professional) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    // Renderização das Abas
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Profissional */}
            <div className="bg-white border-b border-gray-200 -mx-4 md:-mx-8 px-4 md:px-8 py-6 mb-6 flex justify-between items-start sticky top-0 z-20 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {activeTab === 'overview' ? 'Visão Geral' : activeTab === 'schedule' ? 'Minha Agenda' : 'Financeiro'}
                    </h1>
                    <p className="text-gray-500">Gerencie seus atendimentos e acompanhe seus rendimentos.</p>
                </div>
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{professional?.name}</p>
                    <p className="text-xs text-gray-500">{professional?.specialty} • CRF {professional?.crf}</p>
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
                                    {mySessions
                                        .filter(s => new Date(s.date) >= new Date())
                                        .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())
                                        .slice(0, 5)
                                        .map(session => {
                                            const patient = patients.find(p => p.id === session.patientId);
                                            return (
                                                <div key={session.id} className={`p-4 hover:bg-gray-50 transition-colors flex items-center justify-between ${session.status === SessionStatus.NOSHOW ? 'bg-red-50/50' : ''}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-bold text-center min-w-[60px]">
                                                            {session.time}
                                                        </div>
                                                        <div className="flex items-center gap-3">
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
                                                                <p className="text-sm text-gray-500">{session.type} - {new Date(session.date).toLocaleDateString('pt-BR')}</p>
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
                                onClick={() => navigate('/meu-portal/agenda')}
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

            {/* --- TAB CONTENT: SCHEDULE (New Calendar UI) --- */}
            {activeTab === 'schedule' && (
                <div className="space-y-4 animate-fade-in h-[calc(100vh-12rem)] flex flex-col">
                    <CalendarHeader
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        selectedDate={selectedDate}
                        onNavigateDate={handleNavigateDate}
                        onDateSelect={setSelectedDate}
                        filterProf={professional?.id || ''}
                        setFilterProf={() => { }} // No-op, fixed to current professional
                        filterSpecialty={filterSpecialty}
                        setFilterSpecialty={setFilterSpecialty}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        unit={unit}
                        professionals={professional ? [professional] : []} // Only show me
                        onNewAppointment={() => setIsAppointmentModalOpen(true)}
                        onSyncGoogle={handleSyncGoogle}
                        isSyncing={isSyncing}
                        hideProfessionalFilter={true}
                    />

                    <div className="flex-1 min-h-0">
                        {viewMode === 'day' ? (
                            <DayView
                                date={selectedDate}
                                sessions={calendarSessions}
                                professionals={professional ? [professional] : []}
                                patients={patients}
                                unit={unit}
                                units={units}
                                onEditSession={() => { }} // TODO: Add Edit
                                onUpdateSession={handleUpdateSession}
                            />
                        ) : viewMode === 'month' ? (
                            <MonthView
                                currentDate={selectedDate}
                                sessions={calendarSessions}
                                professionals={professional ? [professional] : []}
                                patients={patients}
                                onEditSession={() => { }}
                                onDateClick={(date) => {
                                    setSelectedDate(date);
                                    setViewMode('day');
                                }}
                            />
                        ) : viewMode === 'dayList' ? (
                            <DayListView
                                date={selectedDate}
                                sessions={calendarSessions}
                                professionals={professional ? [professional] : []}
                                patients={patients}
                                units={units}
                                onEditSession={() => { }}
                            />
                        ) : viewMode === 'weekList' ? (
                            <WeekListView
                                currentDate={selectedDate}
                                sessions={calendarSessions}
                                professionals={professional ? [professional] : []}
                                patients={patients}
                                units={units}
                                onEditSession={() => { }}
                            />
                        ) : (
                            <WeekView
                                currentDate={selectedDate}
                                sessions={calendarSessions}
                                professionals={professional ? [professional] : []}
                                patients={patients}
                                unit={unit}
                                units={units}
                                onEditSession={() => { }} // TODO: Add Edit
                                onDateClick={(date) => {
                                    setSelectedDate(date);
                                    setViewMode('day');
                                }}
                                onUpdateSession={handleUpdateSession}
                            />
                        )}
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
                                {(() => {
                                    const months = [];
                                    const now = new Date();
                                    for (let i = 0; i < 6; i++) {
                                        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                                        const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                                        months.push(<option key={i} value={`${date.getFullYear()}-${date.getMonth() + 1}`}>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</option>);
                                    }
                                    return months;
                                })()}
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
                                        const patient = patients.find(p => p.id === session.patientId);
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

            <AppointmentModal
                isOpen={isAppointmentModalOpen}
                onClose={() => setIsAppointmentModalOpen(false)}
                onSave={handleAddSession}
                currentUnit={currentUnit}
            />
        </div>
    );
};

export default ProfessionalPortal;
