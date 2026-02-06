
import React, { useRef, useEffect, useState } from 'react';
import { Session, SessionStatus, Professional, Patient, Unit, WeekDay } from '../../types';
import { GripVertical } from 'lucide-react';

interface WeekViewProps {
    currentDate: Date;
    sessions: Session[];
    professionals: Professional[];
    patients: Patient[];
    unit?: Unit | null;
    onEditSession: (session: Session) => void;
    onDateClick: (date: Date) => void;
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
    return SESSION_COLORS[index % SESSION_COLORS.length];
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

const WeekView: React.FC<WeekViewProps> = ({ currentDate, sessions, professionals, patients, unit, onEditSession, onDateClick, onUpdateSession }) => {
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
                <span className="text-lg font-semibold text-gray-800">{formatWeekRange()}</span>
            </div>

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
                                onClick={() => onDateClick(dayDate)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, dayDate)}
                                className={`relative border-r border-gray-200 last:border-r-0 cursor-pointer ${isToday ? 'bg-blue-50/30' : isClosed ? 'bg-gray-100/50' : 'bg-white'}`}
                            >
                                {/* Hour grid lines */}
                                {hours.map(hour => (
                                    <div key={hour} className="h-[60px] border-b border-gray-100 hover:bg-gray-50/50"></div>
                                ))}

                                {/* Closed overlay */}
                                {isClosed && (
                                    <div className="absolute inset-0 bg-gray-200/30 flex items-center justify-center">
                                        <span className="text-gray-400 text-xs font-medium">Fechado</span>
                                    </div>
                                )}

                                {/* Sessions */}
                                {!isClosed && daySessions.map(session => {
                                    const patient = patients.find(p => p.id === session.patientId);
                                    const professional = professionals.find(p => p.id === session.professionalId);
                                    const profName = professional?.name.split(' ')[0] || 'Prof';

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
                                            onClick={(e) => { e.stopPropagation(); onEditSession(session); }}
                                            className={`absolute left-0.5 right-0.5 p-1 rounded-sm border-l-[3px] text-[10px] leading-tight cursor-pointer hover:z-20 hover:shadow-lg hover:scale-[1.02] transition-all overflow-hidden ${color.bg} ${color.border} ${color.text} ${isDragging ? 'opacity-50 scale-95' : ''} ${onUpdateSession ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                            style={{ top: `${topOffset}px`, height: '55px' }}
                                            title={`${session.time} - ${patient?.name} (${profName}) - Arraste para mover`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="font-semibold truncate">[{profName}] {patient?.name}</div>
                                                    <div className="opacity-80 truncate">{session.time.substring(0, 5)} - {session.type}</div>
                                                </div>
                                                {onUpdateSession && <GripVertical className="w-3 h-3 opacity-50 shrink-0" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default WeekView;
