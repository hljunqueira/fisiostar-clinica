
import React from 'react';
import { Session, SessionStatus, Professional, Patient } from '../../types';
import { Clock, CheckCircle, AlertCircle, XCircle, User, Calendar, MapPin } from 'lucide-react';

interface DayListViewProps {
    date: Date;
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

const DayListView: React.FC<DayListViewProps> = ({ date, sessions, professionals, patients, onEditSession }) => {
    const selectedYMD = formatDateYMD(date);
    const daySessions = sessions.filter(s => s.date === selectedYMD);

    // Sort by time
    const sortedSessions = [...daySessions].sort((a, b) => a.time.localeCompare(b.time));

    const formatDayHeader = () => {
        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden rounded-lg border border-gray-200">
            {/* Day Header */}
            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 border-b border-gray-200">
                <span className="text-lg font-semibold text-gray-800 capitalize">{formatDayHeader()}</span>
                <span className="text-sm text-gray-500">{sortedSessions.length} agendamento(s)</span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sortedSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Calendar className="w-12 h-12 mb-2" />
                        <p className="text-sm">Nenhum agendamento para este dia</p>
                    </div>
                ) : (
                    sortedSessions.map(session => {
                        const patient = patients.find(p => p.id === session.patientId);
                        const prof = professionals.find(p => p.id === session.professionalId);
                        const statusInfo = getStatusInfo(session.status);
                        const StatusIcon = statusInfo.icon;

                        return (
                            <div
                                key={session.id}
                                onClick={() => onEditSession(session)}
                                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
                            >
                                {/* Time */}
                                <div className="text-center min-w-[60px]">
                                    <p className="text-lg font-bold text-gray-900">{session.time.substring(0, 5)}</p>
                                </div>

                                {/* Divider */}
                                <div className="w-px h-12 bg-gray-200"></div>

                                {/* Main Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <p className="font-semibold text-gray-900">{patient?.name || 'Paciente'}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded">{session.type}</span>
                                        <span>{prof?.name}</span>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    {statusInfo.label}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default DayListView;
