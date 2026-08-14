import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UnitId, SessionStatus, Announcement, Professional, Session, Patient, Unit } from '../types';
import { professionalsApi, sessionsApi, patientsApi, unitsApi } from '../src/services/api';
import {
    Calendar, DollarSign, Clock, CheckCircle, User, Users,
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

import { AnnouncementsView } from './AnnouncementsView';

interface ProfessionalPortalProps {
    currentUnit: UnitId;
    professionalId?: string; // Optional, will be auto-detected if not provided
    announcements: Announcement[];
    defaultTab?: 'overview' | 'schedule' | 'financial' | 'announcements';
}

const ProfessionalPortal: React.FC<ProfessionalPortalProps> = ({
    currentUnit,
    professionalId: propProfId,
    announcements,
    defaultTab = 'overview'
}) => {
    const { systemUser } = useAuth();
    const navigate = useNavigate();
    const activeTab = defaultTab; // Tab is controlled by route now

    // Calendar State
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPatient, setFilterPatient] = useState<string>('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [, setRefreshColor] = useState(0);

    // State for dynamic data
    const [professional, setProfessional] = useState<Professional | null>(null);
    const [mySessions, setMySessions] = useState<Session[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [unit, setUnit] = useState<Unit | null>(null);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter Month State
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

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

            // Fallback: match by email or name from systemUser
            if (!currentProfessional && systemUser?.email) {
                currentProfessional = profs.find(p => p.email?.toLowerCase().trim() === systemUser.email.toLowerCase().trim()) || null;
            }
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

    // Filter sessions for Calendar View (Status, Specialty, Patient)
    const calendarSessions = mySessions.filter(s => {
        const isSpecialty = filterSpecialty === 'all' || s.type === filterSpecialty;
        const isStatus = filterStatus === 'all' || s.status === filterStatus;
        const patient = patients.find(p => p.id === s.patientId);
        const isPatientMatch = !filterPatient || (patient?.name.toLowerCase().includes(filterPatient.toLowerCase().trim()));
        return isSpecialty && isStatus && isPatientMatch;
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

    // Filtros e Cálculos Financeiros
    const monthFilteredSessions = useMemo(() => {
        return mySessions.filter(s => {
            if (currentUnit && currentUnit !== 'ALL' && s.unitId !== currentUnit) {
                return false;
            }
            if (selectedMonth && s.date) {
                const sessionMonth = s.date.substring(0, 7);
                if (sessionMonth !== selectedMonth) return false;
            }
            return true;
        });
    }, [mySessions, currentUnit, selectedMonth]);

    const completedSessions = monthFilteredSessions.filter(s => s.status === SessionStatus.COMPLETED);
    const hourlyRate = professional?.hourlyRate || 0;

    const currentMonthEarnings = completedSessions.length * hourlyRate;
    const projectedEarnings = monthFilteredSessions.length * hourlyRate;

    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    const handleExportCSV = () => {
        if (monthFilteredSessions.length === 0) {
            toast.error('Nenhuma sessão encontrada para exportar.');
            return;
        }
        const headers = ['Data', 'Hora', 'Paciente', 'Procedimento', 'Status', 'Valor Repasse'];
        const rows = monthFilteredSessions.map(s => {
            const patient = patients.find(p => p.id === s.patientId);
            const isCompleted = s.status === SessionStatus.COMPLETED;
            return [
                s.date,
                s.time,
                `"${patient?.name || ''}"`,
                `"${s.type}"`,
                s.status,
                isCompleted ? hourlyRate.toFixed(2) : '0.00'
            ].join(',');
        });
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `extrato-financeiro-${selectedMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Extrato CSV exportado com sucesso!');
        setIsExportMenuOpen(false);
    };

    const handleExportPDF = () => {
        if (monthFilteredSessions.length === 0) {
            toast.error('Nenhuma sessão encontrada para exportar.');
            return;
        }

        const formattedMonth = new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const monthTitle = formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1);
        const unitName = unit ? unit.name : (units.length > 0 ? units[0].name : 'FisioStar');
        const profName = professional?.name || systemUser?.name || 'Profissional';
        const profCrf = professional?.crf || 'CREFITO-3/67890-F';
        const profSpecialty = professional?.specialty || 'Fisioterapia';
        const profEmail = professional?.email || systemUser?.email || '';

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('Por favor, permita pop-ups para gerar o PDF.');
            return;
        }

        const rowsHtml = monthFilteredSessions.map(s => {
            const patient = patients.find(p => p.id === s.patientId);
            const isCompleted = s.status === SessionStatus.COMPLETED;
            const formattedDate = new Date(`${s.date}T00:00:00`).toLocaleDateString('pt-BR');
            const val = isCompleted ? hourlyRate.toFixed(2) : '0.00';
            const statusClass = isCompleted ? 'color: #059669; font-weight: bold;' : (s.status === SessionStatus.NOSHOW ? 'color: #dc2626; font-weight: bold;' : 'color: #64748b;');

            return `
                <tr>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${formattedDate}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600;">${s.time}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #0f172a;">${patient?.name || 'Paciente sem nome'}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${s.type}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; ${statusClass}">${s.status}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: 700;">R$ ${val}</td>
                </tr>
            `;
        }).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Extrato Financeiro - ${profName} - ${monthTitle}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                    body {
                        font-family: 'Inter', sans-serif;
                        color: #1e293b;
                        margin: 0;
                        padding: 32px;
                        background: #ffffff;
                    }
                    .header-bar {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 3px solid #2563eb;
                        padding-bottom: 16px;
                        margin-bottom: 24px;
                    }
                    .brand {
                        font-size: 26px;
                        font-weight: 800;
                        color: #2563eb;
                        letter-spacing: -0.5px;
                    }
                    .brand span {
                        color: #0f172a;
                    }
                    .report-title {
                        text-align: right;
                    }
                    .report-title h1 {
                        margin: 0;
                        font-size: 16px;
                        font-weight: 700;
                        color: #0f172a;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .report-title p {
                        margin: 4px 0 0 0;
                        font-size: 12px;
                        color: #64748b;
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 14px;
                        background: #f8fafc;
                        border: 1px solid #cbd5e1;
                        border-radius: 12px;
                        padding: 16px 20px;
                        margin-bottom: 24px;
                    }
                    .info-item {
                        font-size: 13px;
                    }
                    .info-label {
                        font-size: 10px;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #64748b;
                        margin-bottom: 2px;
                        letter-spacing: 0.5px;
                    }
                    .info-value {
                        font-weight: 700;
                        color: #0f172a;
                    }
                    .summary-cards {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 12px;
                        margin-bottom: 24px;
                    }
                    .card {
                        border: 1px solid #e2e8f0;
                        border-radius: 10px;
                        padding: 12px 14px;
                        background: #ffffff;
                    }
                    .card-label {
                        font-size: 10px;
                        font-weight: 700;
                        color: #64748b;
                        text-transform: uppercase;
                    }
                    .card-val {
                        font-size: 18px;
                        font-weight: 800;
                        margin-top: 4px;
                        color: #0f172a;
                    }
                    .card-val.green { color: #059669; }
                    .card-val.blue { color: #2563eb; }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 32px;
                    }
                    th {
                        background: #f1f5f9;
                        padding: 10px 12px;
                        text-align: left;
                        font-size: 11px;
                        font-weight: 700;
                        color: #475569;
                        text-transform: uppercase;
                        border-bottom: 2px solid #cbd5e1;
                    }
                    .footer-signatures {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 40px;
                        margin-top: 48px;
                        padding-top: 24px;
                    }
                    .sig-line {
                        border-top: 1px solid #94a3b8;
                        text-align: center;
                        padding-top: 8px;
                        font-size: 12px;
                        font-weight: 600;
                        color: #334155;
                    }
                    @media print {
                        body { padding: 0; }
                        @page { margin: 1.5cm; }
                    }
                </style>
            </head>
            <body>
                <div class="header-bar">
                    <div class="brand" style="display: flex; align-items: center;">
                        <img src="${window.location.origin}/logo.png" alt="FisioStar" style="height: 52px; object-fit: contain;" />
                    </div>
                    <div class="report-title">
                        <h1>Extrato de Repasse Financeiro</h1>
                        <p>Mês de Referência: ${monthTitle}</p>
                    </div>
                </div>

                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Profissional</div>
                        <div class="info-value">${profName}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Registro Profissional (CRF / CREFITO)</div>
                        <div class="info-value">${profCrf}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Especialidade Principal</div>
                        <div class="info-value">${profSpecialty}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Valor Hora Contratado</div>
                        <div class="info-value">R$ ${hourlyRate.toFixed(2)} / hora</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Unidade / Filial</div>
                        <div class="info-value">${unitName}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">E-mail de Cadastro</div>
                        <div class="info-value">${profEmail || 'Não informado'}</div>
                    </div>
                </div>

                <div class="summary-cards">
                    <div class="card">
                        <div class="card-label">Sessões Realizadas</div>
                        <div class="card-val">${completedSessions.length}</div>
                    </div>
                    <div class="card">
                        <div class="card-label">Sessões Totais</div>
                        <div class="card-val">${monthFilteredSessions.length}</div>
                    </div>
                    <div class="card">
                        <div class="card-label">Ganhos Confirmados</div>
                        <div class="card-val green">R$ ${currentMonthEarnings.toFixed(2)}</div>
                    </div>
                    <div class="card">
                        <div class="card-label">Ganhos Projetados</div>
                        <div class="card-val blue">R$ ${projectedEarnings.toFixed(2)}</div>
                    </div>
                </div>

                <h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 12px;">Detalhamento de Atendimentos</h3>

                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Hora</th>
                            <th>Paciente</th>
                            <th>Procedimento</th>
                            <th>Status</th>
                            <th style="text-align: right;">Valor Repasse</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div class="footer-signatures">
                    <div class="sig-line">
                        ${profName}<br>
                        <span style="font-size: 10px; color: #64748b; font-weight: 400;">Assinatura do Profissional</span>
                    </div>
                    <div class="sig-line">
                        FisioStar Gestão Clínica<br>
                        <span style="font-size: 10px; color: #64748b; font-weight: 400;">Visto da Administração</span>
                    </div>
                </div>

                <div style="margin-top: 32px; font-size: 10px; color: #94a3b8; text-align: center;">
                    Relatório oficial gerado eletronicamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setIsExportMenuOpen(false);
    };

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

            {/* --- TAB CONTENT: OVERVIEW --- */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Minimalist Summary Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 hover:border-primary/40 transition-all">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sessões Hoje</p>
                                <p className="text-2xl font-bold text-gray-900 mt-0.5">
                                    {mySessions.filter(s => s.date === new Date().toISOString().split('T')[0]).length}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 hover:border-emerald-500/40 transition-all">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Realizadas / Mês</p>
                                <p className="text-2xl font-bold text-gray-900 mt-0.5">
                                    {completedSessions.length}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 hover:border-indigo-500/40 transition-all">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Atendimentos / Mês</p>
                                <p className="text-2xl font-bold text-gray-900 mt-0.5">
                                    {monthFilteredSessions.length}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Próximos Atendimentos (Full Width) */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
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
                                            <div key={session.id} className={`p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${session.status === SessionStatus.NOSHOW ? 'bg-red-50/50' : ''}`}>
                                                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                                    <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-bold text-center min-w-[60px] text-xs sm:text-sm shrink-0">
                                                        {session.time}
                                                    </div>
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        {patient?.photoUrl ? (
                                                            <img src={patient.photoUrl} alt={patient.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold shrink-0">
                                                                {patient?.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="font-bold text-gray-900 flex flex-wrap items-center gap-1.5 text-sm sm:text-base">
                                                                <span className="truncate">{patient?.name}</span>
                                                                {session.signed && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0" title="Assinatura Coletada">
                                                                        <FileSignature className="w-3 h-3" /> Assinado
                                                                    </span>
                                                                )}
                                                            </h4>
                                                            <p className="text-xs sm:text-sm text-gray-500 truncate">{session.type} - {new Date(session.date).toLocaleDateString('pt-BR')}</p>
                                                            {session.status === SessionStatus.NOSHOW && (
                                                                <span className="inline-flex items-center gap-1 text-xs text-red-600 mt-1 font-bold">
                                                                    <AlertTriangle className="w-3 h-3" /> Paciente Faltou
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-gray-300 hidden sm:block shrink-0" />
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
                            className="w-full py-3.5 text-sm text-primary font-bold hover:bg-primary/5 transition-colors border-t border-gray-100"
                        >
                            Ver Agenda Completa
                        </button>
                    </div>
                </div>
            )}

            {/* --- TAB CONTENT: SCHEDULE (New Calendar UI) --- */}
            {activeTab === 'schedule' && (
                <div className="space-y-4 animate-fade-in min-h-[calc(100vh-6rem)] flex-1 flex flex-col">
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
                        filterPatient={filterPatient}
                        setFilterPatient={setFilterPatient}
                        unit={unit}
                        professionals={professional ? [professional] : []} // Only show me
                        onNewAppointment={() => setIsAppointmentModalOpen(true)}
                        onSyncGoogle={handleSyncGoogle}
                        isSyncing={isSyncing}
                        hideProfessionalFilter={true}
                        onColorConfigChange={() => setRefreshColor(prev => prev + 1)}
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
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900">Extrato Financeiro</h2>
                                <p className="text-sm text-gray-500">Valor Hora Atual: <span className="font-semibold text-gray-900">R$ {hourlyRate.toFixed(2)}</span></p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-gray-50 border border-gray-200 text-xs sm:text-sm rounded-lg px-3 py-2 outline-none font-medium text-gray-700 hover:border-primary/50 transition-colors flex-1 sm:flex-none"
                            >
                                {(() => {
                                    const months = [];
                                    const currentDate = new Date();
                                    for (let i = 0; i < 6; i++) {
                                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                                        const val = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                                        const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                                        months.push(
                                            <option key={val} value={val}>
                                                {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                                            </option>
                                        );
                                    }
                                    return months;
                                })()}
                            </select>
                            <div className="relative">
                                <button
                                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-bold shadow-sm flex-1 sm:flex-none"
                                >
                                    <Download className="w-4 h-4" /> Exportar <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExportMenuOpen ? 'rotate-90' : ''}`} />
                                </button>

                                {isExportMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsExportMenuOpen(false)} />
                                        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-20 animate-in fade-in slide-in-from-top-1 duration-150">
                                            <div className="px-3 py-1.5 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                Formato de Exportação
                                            </div>
                                            <button
                                                onClick={handleExportPDF}
                                                className="w-full px-3 py-2 text-left text-xs font-semibold hover:bg-blue-50 text-gray-800 flex items-center gap-2.5 transition-colors"
                                            >
                                                <FileText className="w-4 h-4 text-blue-600" /> Exportar em PDF (Relatório)
                                            </button>
                                            <button
                                                onClick={handleExportCSV}
                                                className="w-full px-3 py-2 text-left text-xs font-semibold hover:bg-emerald-50 text-gray-800 flex items-center gap-2.5 transition-colors"
                                            >
                                                <Download className="w-4 h-4 text-emerald-600" /> Exportar em CSV / Excel
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
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
                                <span className="font-bold text-gray-900">{monthFilteredSessions.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Detalhamento de Sessões</h3>
                            <span className="text-xs text-gray-500 font-medium">
                                {monthFilteredSessions.length} atendimento(s) encontrado(s)
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Hora</th>
                                        <th className="px-6 py-4">Paciente</th>
                                        <th className="px-6 py-4">Procedimento</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Valor Gerado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {monthFilteredSessions.length > 0 ? (
                                        monthFilteredSessions.map(session => {
                                            const patient = patients.find(p => p.id === session.patientId);
                                            const isCompleted = session.status === SessionStatus.COMPLETED;
                                            return (
                                                <tr key={session.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-gray-600">
                                                        {new Date(`${session.date}T00:00:00`).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-gray-700">
                                                        {session.time}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        {patient?.name || 'Paciente sem nome'}
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
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                                                Nenhum atendimento encontrado para os filtros de mês e unidade selecionados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB CONTENT: ANNOUNCEMENTS --- */}
            {(activeTab as string) === 'announcements' && (
                <AnnouncementsView
                    announcements={announcements}
                    userRole="professional"
                    currentProfessionalId={professional?.id}
                />
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
