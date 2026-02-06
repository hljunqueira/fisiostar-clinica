
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Calendar,
    Clock,
    ArrowUpRight,
    CheckCircle2,
    AlertCircle,
    Phone,
    Plus,
    Megaphone
} from 'lucide-react';
import { UnitId, Patient, Session, Announcement } from '../types';
import { patientsApi, sessionsApi } from '../src/services/api';

interface SecretaryDashboardProps {
    currentUnit: UnitId;
    announcements: Announcement[];
}

const SecretaryDashboard: React.FC<SecretaryDashboardProps> = ({ currentUnit, announcements }) => {
    const navigate = useNavigate();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const [patientsData, sessionsData] = await Promise.all([
                    patientsApi.getAll(),
                    sessionsApi.getAll()
                ]);
                setPatients(patientsData);
                setSessions(sessionsData);
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Today's sessions
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s =>
        s.unitId === currentUnit && s.date === today
    ).sort((a, b) => a.time.localeCompare(b.time));

    const confirmedToday = todaySessions.filter(s => s.status === 'Confirmada').length;
    const pendingToday = todaySessions.filter(s => s.status === 'Agendada').length;
    const completedToday = todaySessions.filter(s => s.status === 'Realizada').length;

    // Upcoming sessions (next 3 hours)
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const upcomingSessions = todaySessions.filter(s => s.time >= currentTime).slice(0, 5);

    // Active patients
    const activePatients = patients.filter(p => p.status === 'Active');

    // Patients with expiring plans (next 7 days)
    const expiringPlans = activePatients.filter(p => {
        if (!p.plan?.expiresAt) return false;
        const expiryDate = new Date(p.plan.expiresAt);
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        return expiryDate < sevenDaysFromNow;
    }).slice(0, 5);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Carregando...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Recepção</h1>
                <p className="text-gray-500">Gerencie os atendimentos de hoje</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <QuickStatCard
                    title="Sessões Hoje"
                    value={todaySessions.length.toString()}
                    subtitle={`${completedToday} realizadas`}
                    icon={<Calendar className="h-5 w-5 text-blue-600" />}
                    color="blue"
                />
                <QuickStatCard
                    title="Confirmadas"
                    value={confirmedToday.toString()}
                    subtitle="Chegadas confirmadas"
                    icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
                    color="green"
                />
                <QuickStatCard
                    title="Pendentes"
                    value={pendingToday.toString()}
                    subtitle="Aguardando confirmação"
                    icon={<Clock className="h-5 w-5 text-orange-600" />}
                    color="orange"
                />
                <QuickStatCard
                    title="Pacientes Ativos"
                    value={activePatients.length.toString()}
                    subtitle="Com planos vigentes"
                    icon={<Users className="h-5 w-5 text-purple-600" />}
                    color="purple"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Column - Today's Schedule */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => navigate('/agenda?action=new')}
                                className="flex items-center justify-between p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                            >
                                <span>Nova Sessão</span>
                                <Plus className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => navigate('/pacientes')}
                                className="flex items-center justify-between p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors font-medium"
                            >
                                <span>Novo Paciente</span>
                                <Users className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => navigate('/agenda')}
                                className="flex items-center justify-between p-4 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                            >
                                <span>Ver Agenda</span>
                                <Calendar className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => navigate('/pacientes')}
                                className="flex items-center justify-between p-4 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                            >
                                <span>Buscar Paciente</span>
                                <ArrowUpRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Today's Schedule */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Agenda de Hoje</h3>
                            <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                                {today.split('-').reverse().join('/')}
                            </span>
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {todaySessions.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>Nenhuma sessão agendada para hoje</p>
                                </div>
                            ) : (
                                todaySessions.map(session => {
                                    const patient = patients.find(p => p.id === session.patientId);
                                    const isPast = session.time < currentTime;

                                    return (
                                        <div
                                            key={session.id}
                                            className={`p-4 rounded-lg border transition-all ${session.status === 'Realizada' ? 'bg-green-50 border-green-200' :
                                                session.status === 'Confirmada' ? 'bg-blue-50 border-blue-200' :
                                                    session.status === 'Falta' ? 'bg-red-50 border-red-200' :
                                                        isPast ? 'bg-gray-50 border-gray-200 opacity-60' :
                                                            'bg-white border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-center min-w-[60px]">
                                                        <p className="text-lg font-bold text-gray-900">{session.time}</p>
                                                        <p className="text-xs text-gray-500">{session.type}</p>
                                                    </div>
                                                    <div className="border-l border-gray-200 pl-3">
                                                        <p className="font-medium text-gray-900">{patient?.name || 'Paciente não encontrado'}</p>
                                                        <p className="text-sm text-gray-600 flex items-center gap-2">
                                                            <Phone className="h-3 w-3" />
                                                            {patient?.phone || '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <StatusBadge status={session.status} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Alerts & Info */}
                <div className="space-y-6">
                    {/* Admin Announcements Card */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Megaphone className="h-5 w-5 text-orange-500" />
                            Mural de Avisos
                        </h3>
                        <div className="space-y-3">
                            {announcements.filter(a => a.targetRole !== 'professional').length > 0 ? (
                                announcements.filter(a => a.targetRole !== 'professional').map(ann => (
                                    <div key={ann.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                        <p className="font-bold text-sm text-gray-900 mb-1">{ann.title}</p>
                                        <p className="text-xs text-gray-600 leading-relaxed">{ann.message}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-400 text-center py-4">Nenhum aviso.</p>
                            )}
                        </div>
                    </div>

                    {/* Próximas Sessões */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-600" />
                            Próximas Sessões
                        </h3>
                        <div className="space-y-3">
                            {upcomingSessions.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">Nenhuma sessão próxima</p>
                            ) : (
                                upcomingSessions.map(session => {
                                    const patient = patients.find(p => p.id === session.patientId);
                                    return (
                                        <div key={session.id} className="flex items-start gap-3 text-sm p-2 rounded hover:bg-gray-50">
                                            <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                            <div>
                                                <p className="font-medium text-gray-900">{session.time}</p>
                                                <p className="text-gray-600">{patient?.name}</p>
                                                <p className="text-gray-500 text-xs">{session.type}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Planos Expirando */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-600" />
                            Planos Expirando
                        </h3>
                        <div className="space-y-3">
                            {expiringPlans.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">Nenhum plano expirando</p>
                            ) : (
                                expiringPlans.map(patient => {
                                    const daysUntilExpiry = Math.ceil(
                                        (new Date(patient.plan!.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                                    );
                                    const isExpired = daysUntilExpiry < 0;

                                    return (
                                        <div key={patient.id} className={`p-3 rounded-lg border ${isExpired ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                                            }`}>
                                            <p className="font-medium text-sm text-gray-900">{patient.name}</p>
                                            <p className="text-xs text-gray-600">{patient.plan!.name}</p>
                                            <p className={`text-xs mt-1 font-semibold ${isExpired ? 'text-red-600' : 'text-yellow-700'
                                                }`}>
                                                {isExpired ? '⚠️ Expirado' : `Expira em ${daysUntilExpiry} dias`}
                                            </p>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const QuickStatCard = ({ title, value, subtitle, icon, color }: any) => {
    const bgColors: any = {
        blue: 'bg-blue-50',
        green: 'bg-green-50',
        purple: 'bg-purple-50',
        orange: 'bg-orange-50',
    };

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className={`p-2 rounded-lg ${bgColors[color]} w-fit mb-3`}>
                {icon}
            </div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        'Agendada': 'bg-gray-100 text-gray-700',
        'Confirmada': 'bg-blue-100 text-blue-700',
        'Realizada': 'bg-green-100 text-green-700',
        'Cancelada': 'bg-red-100 text-red-700',
        'Falta': 'bg-orange-100 text-orange-700',
    };

    return (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${styles[status] || styles['Agendada']}`}>
            {status}
        </span>
    );
};

export default SecretaryDashboard;
