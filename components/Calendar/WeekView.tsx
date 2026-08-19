
import React, { useRef, useEffect, useState } from 'react';
import { Session, SessionStatus, Professional, Patient, Unit, WeekDay } from '../../types';
import { Clock, CheckCircle, AlertCircle, XCircle, User, GripVertical, Lock } from 'lucide-react';
import { getSavedColorConfig, getColorStyles } from './CalendarColorModal';
import { calculateOverlappingLayout } from '../../src/utils/calendar-layout';

interface WeekViewProps {
    currentDate: Date;
    sessions: Session[];
    professionals: Professional[];
    patients: Patient[];
    unit: Unit | null;
    units: Unit[]; // Added units list
    onEditSession: (session: Session) => void;
    onDateClick: (date: Date) => void;
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

// Cores estilo ZenFisio - baseadas no profissional ou status
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

const WeekView: React.FC<WeekViewProps> = ({ currentDate, sessions, professionals, patients, unit, units, onEditSession, onDateClick, onSlotClick, onUpdateSession }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [draggingSession, setDraggingSession] = useState<Session | null>(null);
    const [dragOffset, setDragOffset] = useState({ y: 0 });

    // Get operating hours range from unit, default to 7-19
    const getStartEndHours = (): { startHour: number; endHour: number } => {
        if (!unit?.operatingHours || unit.operatingHours.length === 0) {
            return { startHour: 7, endHour: 19 };
        }
        let minStart = 23;
        let maxEnd = 0;
        for (const oh of unit.operatingHours) {
            if (oh.isOpen && oh.start && oh.end) {
                const start = parseInt(oh.start.split(':')[0], 10);
                const end = parseInt(oh.end.split(':')[0], 10);
                if (start < minStart) minStart = start;
                if (end > maxEnd) maxEnd = end;
            }
        }
        return { startHour: minStart !== 23 ? minStart : 7, endHour: maxEnd !== 0 ? maxEnd : 19 };
    };

    const { startHour, endHour } = getStartEndHours();
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);

    // Calculate start of week (Monday)
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 5); // Saturday (6 days, Mon-Sat)

    // Generate 6 days (Mon-Sat like ZenFisio)
    const weekDays = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
    });

    // FIX: Use local date format instead of ISO to avoid timezone issues
    const todayYMD = formatDateYMD(new Date());

    // FIX: Start from the first hour (no scroll offset)
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0; // Start at the beginning
        }
    }, [currentDate]);

    // Format date range for header like "2 – 7 de fev. de 2026"
    const formatWeekRange = () => {
        const startDay = startOfWeek.getDate();
        const endDay = endOfWeek.getDate();
        const month = startOfWeek.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const year = startOfWeek.getFullYear();
        return `${startDay} – ${endDay} de ${month}. de ${year}`;
    };

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

    const handleDrop = (e: React.DragEvent, targetDate: Date) => {
        e.preventDefault();
        if (!draggingSession || !onUpdateSession) return;

        const targetCell = e.currentTarget as HTMLElement;
        const gridRect = targetCell.getBoundingClientRect();
        const relativeY = e.clientY - gridRect.top - dragOffset.y + (scrollRef.current?.scrollTop || 0);

        // Calculate new time based on drop position
        const totalMinutes = (relativeY / 60) * 60 + startHour * 60;
        const newHour = Math.floor(totalMinutes / 60);
        const newMinutes = Math.round((totalMinutes % 60) / 15) * 15; // Snap to 15-minute intervals

        // Clamp to valid hours
        const clampedHour = Math.max(startHour, Math.min(endHour, newHour));
        const newTime = `${clampedHour.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
        const newDate = formatDateYMD(targetDate);

        const updates: Partial<Session> = {};
        if (newTime !== draggingSession.time) updates.time = newTime;
        if (newDate !== draggingSession.date) updates.date = newDate;

        if (Object.keys(updates).length > 0) {
            onUpdateSession(draggingSession.id, updates);
        }

        setDraggingSession(null);
    };

    const handleDragEnd = () => {
        setDraggingSession(null);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden rounded-lg border border-gray-200">
            {/* Week Range Header (ZenFisio Style) */}
            <div className="flex items-center justify-center py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-base sm:text-lg font-semibold text-gray-800">{formatWeekRange()}</span>
            </div>

            {/* Scrollable Container for Mobile Responsiveness */}
            <div className="overflow-x-auto flex-1 flex flex-col min-w-full custom-scrollbar">
                <div className="min-w-[650px] flex-1 flex flex-col">
                    {/* Days Header Row */}
                    <div className="grid grid-cols-[50px_repeat(6,1fr)] border-b border-gray-300 bg-gray-100 sticky top-0 z-10">
                <div className="border-r border-gray-300"></div>
                {weekDays.map((dayDate, idx) => {
                    const dayYMD = formatDateYMD(dayDate);
                    const isToday = dayYMD === todayYMD;
                    const dayName = dayDate.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                    const dayNum = dayDate.getDate().toString().padStart(2, '0');
                    const monthNum = (dayDate.getMonth() + 1).toString().padStart(2, '0');

                    // Check if this day is closed
                    const dayWeekName = getWeekDayName(dayDate);
                    const daySchedule = unit?.operatingHours?.find(oh => oh.day === dayWeekName);
                    const isClosed = daySchedule && !daySchedule.isOpen;

                    return (
                        <div
                            key={idx}
                            onClick={() => onDateClick(dayDate)}
                            className={`px-1 py-2 text-center border-r border-gray-300 last:border-r-0 cursor-pointer hover:bg-gray-200 transition-colors ${isToday ? 'bg-blue-50' : ''} ${isClosed ? 'bg-gray-200/50' : ''}`}
                        >
                            <span className={`text-xs font-bold ${isToday ? 'text-blue-600' : isClosed ? 'text-gray-400' : 'text-gray-700'}`}>
                                {dayName}. {dayNum}/{monthNum}
                            </span>
                            {isClosed && <span className="block text-[9px] text-gray-400">Fechado</span>}
                        </div>
                    );
                })}
            </div>

            {/* Scrollable Grid Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="grid grid-cols-[50px_repeat(6,1fr)] min-h-full">
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

                    {/* Day Columns */}
                    {weekDays.map((dayDate, dayIdx) => {
                        // FIX: Use local date format instead of ISO
                        const dayYMD = formatDateYMD(dayDate);
                        const daySessions = sessions.filter(s => s.date === dayYMD);
                        const isToday = dayYMD === todayYMD;

                        // Check if closed
                        const dayWeekName = getWeekDayName(dayDate);
                        const daySchedule = unit?.operatingHours?.find(oh => oh.day === dayWeekName);
                        const isClosed = daySchedule && !daySchedule.isOpen;

                        return (
                            <div
                                key={dayIdx}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, dayDate)}
                                className={`relative border-r border-gray-200 last:border-r-0 ${isToday ? 'bg-blue-50/30' : isClosed ? 'bg-gray-100/50' : 'bg-white'}`}
                            >
                                {/* Hour grid lines */}
                                {hours.map(hour => (
                                    <div
                                        key={hour}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isClosed) return;
                                            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                                            if (onSlotClick) {
                                                onSlotClick(dayDate, timeStr);
                                            } else {
                                                onDateClick(dayDate);
                                            }
                                        }}
                                        className="h-[60px] border-b border-gray-100 hover:bg-primary/5 transition-colors cursor-pointer group relative"
                                    >
                                        <span className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center text-[10px] text-primary font-bold transition-opacity pointer-events-none">
                                            Agendar {hour.toString().padStart(2, '0')}:00
                                        </span>
                                    </div>
                                ))}

                                {/* Closed overlay */}
                                {isClosed && (
                                    <div className="absolute inset-0 bg-gray-200/30 flex items-center justify-center">
                                        <span className="text-gray-400 text-xs font-medium">Fechado</span>
                                    </div>
                                )}

                                {/* Sessions with Smart Dynamic Overlapping Layout */}
                                {!isClosed && (() => {
                                    const dayLayouts = calculateOverlappingLayout(daySessions, startHour, 60, true);

                                    return daySessions.map(session => {
                                        const patient = patients.find(p => p.id === session.patientId);
                                        const professional = professionals.find(p => p.id === session.professionalId);
                                        const layout = dayLayouts.get(session.id);

                                        const [sessionHour, sessionMin] = session.time.split(':').map(Number);
                                        const topOffset = layout ? layout.top : ((sessionHour - startHour) * 60 + (sessionMin / 60) * 60);
                                        const cardHeight = layout ? `${layout.height}px` : '55px';
                                        const leftStyle = layout ? `calc(${layout.leftPercent}% + 1px)` : '2px';
                                        const widthStyle = layout ? `calc(${layout.widthPercent}% - 2px)` : 'calc(100% - 4px)';
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
                                                    onClick={(e) => { e.stopPropagation(); onEditSession(session); }}
                                                    className="absolute p-1.5 rounded-lg border-l-[4px] border-l-amber-500 bg-slate-100/95 text-slate-800 text-[10px] leading-tight cursor-pointer hover:z-50 hover:shadow-2xl hover:scale-[1.03] transition-all overflow-hidden border border-slate-300/80 shadow-xs ring-1 ring-black/5"
                                                    style={{
                                                        top: `${topOffset}px`,
                                                        height: cardHeight,
                                                        left: leftStyle,
                                                        width: widthStyle,
                                                        zIndex
                                                    }}
                                                    title={`🔒 Horário Bloqueado: ${session.time} - ${professional?.name || ''} (${session.notes || 'Indisponível'}) - Clique para editar ou liberar`}
                                                >
                                                    <div className="flex items-center justify-between gap-1 font-bold text-slate-900 truncate">
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                                                            <span className="truncate">{isMultiCol ? 'Bloqueio' : 'Bloqueio de Horário'}</span>
                                                        </div>
                                                        <span className="text-[9px] font-mono text-slate-500 font-semibold shrink-0">{session.time.substring(0, 5)}</span>
                                                    </div>
                                                    <div className="text-[9px] text-slate-600 truncate mt-0.5 font-medium">
                                                        {professional?.name ? `${professional.name} ` : ''}{!isMultiCol && session.notes ? `• ${session.notes}` : ''}
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
                                                onClick={(e) => { e.stopPropagation(); onEditSession(session); }}
                                                className={`absolute p-1.5 rounded-lg border-l-[4px] text-[10px] leading-tight cursor-pointer hover:z-50 hover:shadow-2xl hover:scale-[1.03] transition-all overflow-hidden border border-black/10 shadow-xs ring-1 ring-black/5 ${colorStyles.className} ${isDragging ? 'opacity-50 scale-95' : ''} ${onUpdateSession ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                                style={{
                                                    top: `${topOffset}px`,
                                                    height: cardHeight,
                                                    left: leftStyle,
                                                    width: widthStyle,
                                                    zIndex,
                                                    ...colorStyles.style
                                                }}
                                                title={`${session.time} - Paciente: ${patient?.name || 'Sem nome'} | Profissional: ${professional?.name || 'Não informado'} - Arraste para mover`}
                                            >
                                                <div className="flex items-start justify-between h-full">
                                                    <div className="flex flex-col flex-1 min-h-0">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <div className="font-black truncate text-[11px] leading-3 text-gray-900">
                                                                {patient?.name || 'Paciente'}
                                                            </div>
                                                            <span className="text-[9px] font-mono text-gray-600 font-bold shrink-0">{session.time.substring(0, 5)}</span>
                                                        </div>
                                                        <div className="opacity-85 truncate text-[9px] mt-0.5 font-semibold text-gray-700">
                                                            {session.type || 'Sessão'} {professional?.name ? `• ${professional.name}` : ''}
                                                        </div>
                                                    </div>
                                                    {onUpdateSession && !isMultiCol && <GripVertical className="w-3 h-3 opacity-40 shrink-0 ml-0.5" />}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    </div>
</div>
);
};

export default WeekView;
