
import React from 'react';
import { Session, SessionStatus, Professional, Patient } from '../../types';
import { Clock, CheckCircle, AlertCircle, XCircle, User, Calendar } from 'lucide-react';

interface WeekListViewProps {
    currentDate: Date;
    sessions: Session[];
    professionals: Professional[];
    patients: Patient[];
    onEditSession: (session: Session) => void;
}

// Helper to format date as YYYY-MM-DD without timezone conversion
const formatDateYMD = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getStatusInfo = (status: SessionStatus) => {
    switch (status) {
        case SessionStatus.SCHEDULED:
            return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Agendado' };
        case SessionStatus.CONFIRMED:
            return { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Confirmado' };
        case SessionStatus.COMPLETED:
            return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100', label: 'Realizado' };
        case SessionStatus.NOSHOW:
            return { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-100', label: 'Faltou' };
        case SessionStatus.CANCELED:
            return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', label: 'Cancelado' };
        default:
            return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: status };
    }
};

const WeekListView: React.FC<WeekListViewProps> = ({ currentDate, sessions, professionals, patients, onEditSession }) => {
    // Calculate start of week (Monday)
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 5);

    // Generate 6 days (Mon-Sat)
    const weekDays = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
    });

    const todayYMD = formatDateYMD(new Date());

    // Format week range
    const formatWeekRange = () => {
        const startDay = startOfWeek.getDate();
        const endDay = endOfWeek.getDate();
        const month = startOfWeek.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const year = startOfWeek.getFullYear();
        return `${startDay} – ${endDay} de ${month}. de ${year}`;
    };

    // Get all sessions in this week, sorted by date and time
    const weekSessions = sessions
        .filter(s => {
            const sessionDate = new Date(s.date + 'T00:00:00');
            return sessionDate >= startOfWeek && sessionDate <= endOfWeek;
        })
        .sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time.localeCompare(b.time);
        });

    return (
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden rounded-lg border border-gray-200">
            {/* Week Header */}
            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 border-b border-gray-200">
                <span className="text-lg font-semibold text-gray-800">{formatWeekRange()}</span>
                <span className="text-sm text-gray-500">{weekSessions.length} agendamento(s)</span>
            </div>

            {/* List grouped by day */}
            <div className="flex-1 overflow-y-auto">
                {weekDays.map(dayDate => {
                    const dayYMD = formatDateYMD(dayDate);
                    const daySessions = weekSessions.filter(s => s.date === dayYMD);
                    const isToday = dayYMD === todayYMD;
                    const dayName = dayDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' });

                    return (
                        <div key={dayYMD} className="border-b border-gray-100 last:border-b-0">
                            {/* Day Header */}
                            <div className={`sticky top-0 px-4 py-2 text-sm font-semibold capitalize ${isToday ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'}`}>
                                {dayName}
                                {daySessions.length > 0 && (
                                    <span className="ml-2 text-xs font-normal text-gray-400">({daySessions.length})</span>
                                )}
                            </div>

                            {/* Sessions for this day */}
                            {daySessions.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-gray-400 italic">
                                    Nenhum agendamento
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {daySessions.map(session => {
                                        const patient = patients.find(p => p.id === session.patientId);
                                        const prof = professionals.find(p => p.id === session.professionalId);
                                        const statusInfo = getStatusInfo(session.status);
                                        const StatusIcon = statusInfo.icon;

                                        return (
                                            <div
                                                key={session.id}
                                                onClick={() => onEditSession(session)}
                                                className="flex items-center gap-4 p-3 px-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                            >
                                                {/* Time */}
                                                <div className="text-center min-w-[50px]">
                                                    <p className="text-sm font-bold text-gray-900">{session.time.substring(0, 5)}</p>
                                                </div>

                                                {/* Divider */}
                                                <div className="w-px h-8 bg-gray-200"></div>

                                                {/* Main Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">{patient?.name || 'Paciente'}</p>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span>{session.type}</span>
                                                        <span>•</span>
                                                        <span>{prof?.name}</span>
                                                    </div>
                                                </div>

                                                {/* Status */}
                                                <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusInfo.label}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WeekListView;
