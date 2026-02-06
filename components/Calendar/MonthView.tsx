
import React, { useState } from 'react';
import { Session, SessionStatus, Professional, Patient } from '../../types';
import { GripVertical } from 'lucide-react';

interface MonthViewProps {
    currentDate: Date;
    sessions: Session[];
    professionals: Professional[];
    patients: Patient[];
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

// Cores por profissional
const SESSION_COLORS = [
    { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-900' },
    { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-900' },
    { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-900' },
    { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-900' },
    { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-900' },
    { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-900' },
];

const getColorByProfessional = (professionalId: string, professionals: Professional[]) => {
    const index = professionals.findIndex(p => p.id === professionalId);
    return SESSION_COLORS[index % SESSION_COLORS.length];
};

const MonthView: React.FC<MonthViewProps> = ({ currentDate, sessions, professionals, patients, onEditSession, onDateClick, onUpdateSession }) => {
    const [draggingSession, setDraggingSession] = useState<Session | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and number of days
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Get the day of week for the first day (0 = Sunday)
    // Adjust to start week on Monday
    let startDayOfWeek = firstDayOfMonth.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Convert: Sun=6, Mon=0, Tue=1, etc.

    // Generate calendar grid
    const calendarDays: (Date | null)[] = [];

    // Add empty slots for days before first day
    for (let i = 0; i < startDayOfWeek; i++) {
        calendarDays.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(new Date(year, month, day));
    }

    // Pad to complete last week
    while (calendarDays.length % 7 !== 0) {
        calendarDays.push(null);
    }

    // Week day headers
    const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    // Format month name
    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    // FIX: Use local date format instead of ISO
    const todayYMD = formatDateYMD(new Date());

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, session: Session) => {
        setDraggingSession(session);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', session.id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetDate: Date) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggingSession || !onUpdateSession) return;

        const newDate = formatDateYMD(targetDate);

        if (newDate !== draggingSession.date) {
            onUpdateSession(draggingSession.id, { date: newDate });
        }

        setDraggingSession(null);
    };

    const handleDragEnd = () => {
        setDraggingSession(null);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden rounded-lg border border-gray-200">
            {/* Month Header */}
            <div className="flex items-center justify-center py-3 bg-gray-50 border-b border-gray-200">
                <span className="text-lg font-semibold text-gray-800 capitalize">{monthName}</span>
            </div>

            {/* Week Day Headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {weekDays.map((day, idx) => (
                    <div key={idx} className="py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-[repeat(auto-fill,minmax(80px,1fr))] overflow-y-auto">
                {calendarDays.map((date, idx) => {
                    if (!date) {
                        return <div key={idx} className="border-r border-b border-gray-100 bg-gray-50/30 last:border-r-0"></div>;
                    }

                    // FIX: Use local date format
                    const dayYMD = formatDateYMD(date);
                    const daySessions = sessions.filter(s => s.date === dayYMD);
                    const isToday = dayYMD === todayYMD;
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    return (
                        <div
                            key={idx}
                            onClick={() => onDateClick(date)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, date)}
                            className={`border-r border-b border-gray-100 last:border-r-0 p-1 cursor-pointer hover:bg-blue-50/50 transition-colors min-h-[80px] ${isWeekend ? 'bg-gray-50/50' : 'bg-white'} ${draggingSession ? 'hover:bg-blue-100/50' : ''}`}
                        >
                            {/* Day Number */}
                            <div className={`text-xs font-semibold mb-1 ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>
                                {date.getDate()}
                            </div>

                            {/* Sessions */}
                            <div className="space-y-0.5 overflow-hidden">
                                {daySessions.slice(0, 3).map(session => {
                                    const patient = patients.find(p => p.id === session.patientId);
                                    const color = getColorByProfessional(session.professionalId, professionals);
                                    const isDragging = draggingSession?.id === session.id;

                                    return (
                                        <div
                                            key={session.id}
                                            draggable={!!onUpdateSession}
                                            onDragStart={(e) => handleDragStart(e, session)}
                                            onDragEnd={handleDragEnd}
                                            onClick={(e) => { e.stopPropagation(); onEditSession(session); }}
                                            className={`text-[9px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 flex items-center gap-0.5 ${color.bg} ${color.text} ${isDragging ? 'opacity-50' : ''} ${onUpdateSession ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                            title={`${session.time} - ${patient?.name} - Arraste para mover`}
                                        >
                                            {onUpdateSession && <GripVertical className="w-2 h-2 opacity-50 shrink-0" />}
                                            <span className="truncate">{session.time.substring(0, 5)} {patient?.name?.split(' ')[0]}</span>
                                        </div>
                                    );
                                })}
                                {daySessions.length > 3 && (
                                    <div className="text-[9px] text-gray-500 px-1">
                                        +{daySessions.length - 3} mais
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MonthView;
