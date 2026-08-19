
import React, { useEffect, useRef, useState } from 'react';
import { Session, SessionStatus, Professional, Patient, Unit, WeekDay } from '../../types';
import { Clock, CheckCircle, AlertCircle, XCircle, User, GripVertical, Lock } from 'lucide-react';
import { getSavedColorConfig, getColorStyles } from './CalendarColorModal';
import { calculateOverlappingLayout } from '../../src/utils/calendar-layout';

interface DayViewProps {
    date: Date;
    sessions: Session[];
    professionals: Professional[];
    patients: Patient[];
    unit: Unit | null;
    units: Unit[]; // Added units list
    onEditSession: (session: Session) => void;
    onSlotClick?: (date: Date, time: string) => void;
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
    return SESSION_COLORS[index >= 0 ? index % SESSION_COLORS.length : 0];
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

const getDynamicColor = (session: Session, professionals: Professional[]) => {
    const config = getSavedColorConfig();

    if (config.mode === 'status') {
        const found = config.statusColors[session.status];
        if (found) return found;
    } else if (config.mode === 'specialty') {
        const found = config.specialtyColors[session.type];
        if (found) return found;
    } else if (config.mode === 'professional') {
        const found = config.professionalColors[session.professionalId];
        if (found) return found;
    }

    const statusColor = getStatusOverrideColor(session.status);
    return statusColor || getColorByProfessional(session.professionalId, professionals);
};

const DayView: React.FC<DayViewProps> = ({ date, sessions, professionals, patients, unit, units, onEditSession, onSlotClick, onUpdateSession }) => {
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
                                <div
                                    key={hour}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                                        if (onSlotClick) {
                                            onSlotClick(date, timeStr);
                                        }
                                    }}
                                    className="h-[60px] border-b border-gray-100 hover:bg-primary/5 transition-colors cursor-pointer group relative"
                                >
                                    <span className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center text-[10px] text-primary font-bold transition-opacity pointer-events-none">
                                        Agendar {hour.toString().padStart(2, '0')}:00
                                    </span>
                                </div>
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

                            {/* Session Cards with Smart Dynamic Overlapping Layout */}
                            {(() => {
                                const dayLayouts = calculateOverlappingLayout(daySessions, startHour, 60, false);

                                return daySessions.map(session => {
                                    const patient = patients.find(p => p.id === session.patientId);
                                    const prof = professionals.find(p => p.id === session.professionalId);
                                    const layout = dayLayouts.get(session.id);

                                    const [sessionHour, sessionMin] = session.time.split(':').map(Number);
                                    const topOffset = layout ? layout.top : ((sessionHour - startHour) * 60 + (sessionMin / 60) * 60);
                                    const cardHeight = layout ? `${layout.height}px` : '55px';
                                    const leftStyle = layout ? `calc(${layout.leftPercent}% + 2px)` : '4px';
                                    const widthStyle = layout ? `calc(${layout.widthPercent}% - 4px)` : 'calc(100% - 8px)';
                                    const zIndex = layout ? layout.zIndex : 10;
                                    const isMultiCol = layout && layout.totalColumns > 1;

                                    // Use dynamic user-configured color (supports preset and custom HEX)
                                    const colorObj = getDynamicColor(session, professionals);
                                    const colorStyles = getColorStyles(colorObj);
                                    const isDragging = draggingSession?.id === session.id;

                                    const isBlocked = session.type?.includes('Bloqueio');

                                    if (isBlocked) {
                                        return (
                                            <div
                                                key={session.id}
                                                onClick={() => onEditSession(session)}
                                                className="absolute p-2 px-3 rounded-lg border-l-[4px] border-l-amber-500 bg-slate-100 text-slate-800 text-xs cursor-pointer hover:z-50 hover:shadow-xl hover:scale-[1.01] transition-all overflow-hidden border border-slate-300 shadow-xs"
                                                style={{
                                                    top: `${topOffset + 1}px`,
                                                    height: `${layout ? Math.max(36, layout.height) : 56}px`,
                                                    left: leftStyle,
                                                    width: widthStyle,
                                                    zIndex
                                                }}
                                                title={`🔒 Horário Bloqueado: ${session.time} - ${prof?.name || ''} (${session.notes || 'Indisponível'}) - Clique para editar ou liberar`}
                                            >
                                                <div className="flex flex-col justify-center h-full">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                                            <span className="font-bold text-xs text-slate-900 truncate">
                                                                {isMultiCol ? 'Bloqueio' : 'Bloqueio de Horário'}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-slate-500 font-bold shrink-0">
                                                            {session.time.substring(0, 5)}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-600 truncate mt-0.5 font-medium">
                                                        {prof?.name ? `${prof.name} ` : ''}{!isMultiCol && session.notes ? `• ${session.notes}` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={session.id}
                                            draggable={!!onUpdateSession}
                                            onDragStart={(e) => handleDragStart(e, session)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => onEditSession(session)}
                                            className={`absolute p-2 px-3 rounded-lg border-l-[4px] text-xs cursor-pointer hover:z-50 hover:shadow-xl hover:scale-[1.01] transition-all overflow-hidden border border-black/10 shadow-xs ${colorStyles.className} ${isDragging ? 'opacity-50 scale-95' : ''} ${onUpdateSession ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                            style={{
                                                top: `${topOffset + 1}px`,
                                                height: `${layout ? Math.max(36, layout.height) : 56}px`,
                                                left: leftStyle,
                                                width: widthStyle,
                                                zIndex,
                                                ...colorStyles.style
                                            }}
                                            title={`${session.time} - Paciente: ${patient?.name || 'Sem nome'} | Profissional: ${prof?.name || 'Não informado'} - Arraste para mover`}
                                        >
                                            <div className="flex flex-col justify-center h-full">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="font-bold text-xs text-gray-900 truncate">
                                                        {patient?.name || 'Paciente'}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-gray-500 font-bold shrink-0">
                                                        {session.time.substring(0, 5)}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] opacity-85 truncate mt-0.5 font-medium text-gray-700">
                                                    {session.type || 'Sessão'} {prof?.name ? `• ${prof.name}` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DayView;
