
import React, { useEffect, useRef, useState } from 'react';
import { Session, SessionStatus, Professional, Patient, Unit, WeekDay } from '../../types';
import { Clock, CheckCircle, AlertCircle, XCircle, GripVertical } from 'lucide-react';

interface DayViewProps {
    date: Date;
    sessions: Session[];
    professionals: Professional[];
    patients: Patient[];
    unit?: Unit | null;
    onEditSession: (session: Session) => void;
    onUpdateSession?: (sessionId: string, updates: Partial<Session>) => void;
}

// Helper to format date as YYYY-MM-DD without timezone conversion
const formatDateYMD = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Get weekday name for DaySchedule lookup
const getWeekDayName = (date: Date): WeekDay => {
    const days: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
};

// Cores estilo ZenFisio - baseadas no profissional
const SESSION_COLORS = [
    { bg: 'bg-blue-100', border: 'border-l-blue-500', text: 'text-blue-900' },
    { bg: 'bg-emerald-100', border: 'border-l-emerald-500', text: 'text-emerald-900' },
    { bg: 'bg-amber-100', border: 'border-l-amber-500', text: 'text-amber-900' },
    { bg: 'bg-pink-100', border: 'border-l-pink-500', text: 'text-pink-900' },
    { bg: 'bg-purple-100', border: 'border-l-purple-500', text: 'text-purple-900' },
    { bg: 'bg-cyan-100', border: 'border-l-cyan-500', text: 'text-cyan-900' },
    { bg: 'bg-orange-100', border: 'border-l-orange-500', text: 'text-orange-900' },
    { bg: 'bg-lime-100', border: 'border-l-lime-600', text: 'text-lime-900' },
];

const getColorByProfessional = (professionalId: string, professionals: Professional[]) => {
    const index = professionals.findIndex(p => p.id === professionalId);
    return SESSION_COLORS[index % SESSION_COLORS.length];
};

const getStatusOverrideColor = (status: SessionStatus) => {
    switch (status) {
        case SessionStatus.NOSHOW:
            return { bg: 'bg-red-100', border: 'border-l-red-500', text: 'text-red-900' };
        case SessionStatus.COMPLETED:
            return { bg: 'bg-gray-200', border: 'border-l-gray-400', text: 'text-gray-600' };
        case SessionStatus.CANCELED:
            return { bg: 'bg-gray-100', border: 'border-l-gray-300', text: 'text-gray-400 line-through' };
        default:
            return null;
    }
};

const DayView: React.FC<DayViewProps> = ({ date, sessions, professionals, patients, unit, onEditSession, onUpdateSession }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const [draggingSession, setDraggingSession] = useState<Session | null>(null);
    const [dragOffset, setDragOffset] = useState({ y: 0 });

    // Get operating hours for this day, or use defaults (7-19)
    const dayName = getWeekDayName(date);
    const daySchedule = unit?.operatingHours?.find(oh => oh.day === dayName);

    const startHour = daySchedule?.isOpen && daySchedule.start
        ? parseInt(daySchedule.start.split(':')[0], 10)
        : 7;
    const endHour = daySchedule?.isOpen && daySchedule.end
        ? parseInt(daySchedule.end.split(':')[0], 10)
        : 19;

    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);

    // FIX: Use local date format instead of ISO to avoid timezone issues
    const selectedYMD = formatDateYMD(date);
    const todayYMD = formatDateYMD(new Date());
    const daySessions = sessions.filter(s => s.date === selectedYMD);

    // FIX: Start from the first hour (no scroll offset)
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0; // Start at the beginning
        }
    }, [date]);

    const getStatusIcon = (status: SessionStatus) => {
        switch (status) {
            case SessionStatus.COMPLETED: return <CheckCircle className="w-3 h-3" />;
            case SessionStatus.NOSHOW: return <AlertCircle className="w-3 h-3" />;
            case SessionStatus.CANCELED: return <XCircle className="w-3 h-3" />;
            default: return <Clock className="w-3 h-3" />;
        }
    };

    // Format header date
    const formatDayHeader = () => {
        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    // Check if unit is closed on this day
    const isClosed = daySchedule && !daySchedule.isOpen;

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, session: Session) => {
        setDraggingSession(session);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', session.id);

        // Calculate offset from top of card
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setDragOffset({ y: e.clientY - rect.top });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggingSession || !gridRef.current || !onUpdateSession) return;

        const gridRect = gridRef.current.getBoundingClientRect();
        const relativeY = e.clientY - gridRect.top - dragOffset.y + (scrollRef.current?.scrollTop || 0);

        // Calculate new time based on drop position
        const totalMinutes = (relativeY / 60) * 60 + startHour * 60;
        const newHour = Math.floor(totalMinutes / 60);
        const newMinutes = Math.round((totalMinutes % 60) / 15) * 15; // Snap to 15-minute intervals

        // Clamp to valid hours
        const clampedHour = Math.max(startHour, Math.min(endHour, newHour));
        const newTime = `${clampedHour.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;

        if (newTime !== draggingSession.time) {
            onUpdateSession(draggingSession.id, { time: newTime });
        }

        setDraggingSession(null);
    };

    const handleDragEnd = () => {
        setDraggingSession(null);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden rounded-lg border border-gray-200">
            {/* Day Header */}
            <div className="flex items-center justify-center py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-lg font-semibold text-gray-800 capitalize">{formatDayHeader()}</span>
                {isClosed && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Fechado</span>}
            </div>

            {isClosed ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                        <XCircle className="w-12 h-12 mx-auto mb-2" />
                        <p>Unidade fechada neste dia</p>
                    </div>
                </div>
            ) : (
                /* Scrollable Grid */
                <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
                    <div className="grid grid-cols-[50px_1fr] min-h-full">
                        {/* Time Column */}
                        <div className="bg-gray-50 border-r border-gray-300">
                            {hours.map(hour => (
                                <div key={hour} className="h-[60px] border-b border-gray-200 flex items-start justify-end pr-1 pt-0.5">
                                    <span className="text-[10px] text-gray-500 font-mono font-medium">
                                        {hour.toString().padStart(2, '0')}:00
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Sessions Column */}
                        <div
                            ref={gridRef}
                            className="relative bg-white"
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            {/* Hour grid lines */}
                            {hours.map(hour => (
                                <div key={hour} className="h-[60px] border-b border-gray-100 hover:bg-gray-50/50"></div>
                            ))}

                            {/* Current Time Line */}
                            {selectedYMD === todayYMD && (
                                <div
                                    className="absolute left-0 right-0 border-t-2 border-red-400 z-10 pointer-events-none"
                                    style={{
                                        top: `${(new Date().getHours() - startHour) * 60 + (new Date().getMinutes() / 60) * 60}px`
                                    }}
                                >
                                    <span className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></span>
                                </div>
                            )}

                            {/* Session Cards */}
                            {daySessions.map(session => {
                                const patient = patients.find(p => p.id === session.patientId);
                                const prof = professionals.find(p => p.id === session.professionalId);
                                const profName = prof?.name.split(' ')[0] || 'Prof';

                                const [sessionHour, sessionMin] = session.time.split(':').map(Number);
                                const topOffset = (sessionHour - startHour) * 60 + (sessionMin / 60) * 60;

                                // Use status override or professional color
                                const statusColor = getStatusOverrideColor(session.status);
                                const color = statusColor || getColorByProfessional(session.professionalId, professionals);
                                const isDragging = draggingSession?.id === session.id;

                                return (
                                    <div
                                        key={session.id}
                                        draggable={!!onUpdateSession}
                                        onDragStart={(e) => handleDragStart(e, session)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => onEditSession(session)}
                                        className={`absolute left-1 right-1 p-2 rounded-sm border-l-[3px] text-xs leading-tight cursor-pointer hover:z-20 hover:shadow-lg hover:scale-[1.02] transition-all overflow-hidden ${color.bg} ${color.border} ${color.text} ${isDragging ? 'opacity-50 scale-95' : ''} ${onUpdateSession ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                        style={{ top: `${topOffset}px`, height: '55px' }}
                                        title={`${session.time} - ${patient?.name} (${profName}) - Arraste para mover`}
                                    >
                                        <div className="flex justify-between items-start h-full">
                                            <div className="flex flex-col justify-between h-full overflow-hidden">
                                                <div>
                                                    <div className="font-bold truncate">[{profName}] {patient?.name}</div>
                                                    <div className="opacity-80 truncate text-[10px]">{session.type}</div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 flex flex-col items-end">
                                                <p className="font-bold text-[10px] opacity-80">{session.time.substring(0, 5)}</p>
                                                <div className="mt-1 flex items-center gap-1 opacity-70">
                                                    {onUpdateSession && <GripVertical className="w-3 h-3" />}
                                                    {getStatusIcon(session.status)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DayView;
