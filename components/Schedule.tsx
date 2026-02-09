


import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UnitId, Session, Patient, Professional, Unit, SessionStatus } from '../types';
import AppointmentModal from './AppointmentModal';
import { sessionsApi, patientsApi, professionalsApi, unitsApi } from '../src/services/api';
import toast from 'react-hot-toast';
import CalendarHeader, { ViewMode } from './Calendar/CalendarHeader';
import DayView from './Calendar/DayView';
import WeekView from './Calendar/WeekView';
import MonthView from './Calendar/MonthView';
import DayListView from './Calendar/DayListView';
import WeekListView from './Calendar/WeekListView';

interface ScheduleProps {
    currentUnit: UnitId;
}

const Schedule: React.FC<ScheduleProps> = ({ currentUnit }) => {
    const [searchParams] = useSearchParams();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('week'); // Default to week view like ZenFisio

    // Filters
    const [filterProf, setFilterProf] = useState<string>(searchParams.get('professionalId') || 'all');
    const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [isSyncing, setIsSyncing] = useState(false);

    // Data State
    const [sessions, setSessions] = useState<Session[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [unit, setUnit] = useState<Unit | null>(null);

    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<Session | null>(null);

    // Auto-open modal if requested via URL
    useEffect(() => {
        if (searchParams.get('action') === 'new') {
            setIsAppointmentModalOpen(true);
        }
    }, [searchParams]);

    const [units, setUnits] = useState<Unit[]>([]);

    // Load data
    useEffect(() => {
        loadData();
    }, [currentUnit]);

    async function loadData() {
        try {
            // Se currentUnit for 'ALL', buscamos todas as unidades para ter a lista completa
            // Se for específico, também precisamos da lista para nomes, mas focamos na unidade
            const [sessionsData, patientsData, professionalsData, unitsData] = await Promise.all([
                sessionsApi.getAll(),
                patientsApi.getAll(),
                professionalsApi.getAll(),
                unitsApi.getAll()
            ]);

            setUnits(unitsData);

            if (currentUnit === 'ALL') {
                setSessions(sessionsData);
                setUnit(null); // 'ALL' units
            } else {
                const unitSessions = sessionsData.filter(s => s.unitId === currentUnit);
                setSessions(unitSessions);
                const currentUnitData = unitsData.find(u => u.id === currentUnit) || null;
                setUnit(currentUnitData);
            }

            setPatients(patientsData);
            setProfessionals(professionalsData);

        } catch (error) {
            console.error('Error loading schedule data:', error);
            toast.error('Erro ao carregar dados da agenda');
        }
    }

    // Apply Filters
    const filteredSessions = sessions.filter(s => {
        const isProf = filterProf === 'all' || s.professionalId === filterProf;
        const isSpecialty = filterSpecialty === 'all' || s.type === filterSpecialty;
        const isStatus = filterStatus === 'all' || s.status === filterStatus;
        return isProf && isSpecialty && isStatus;
    });


    const handleSyncGoogle = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            toast.success('Agenda sincronizada com Google Calendar com sucesso!');
        }, 1500);
    };

    const handleSaveSession = async (sessionData: Session) => {
        try {
            if (editingSession) {
                // Update existing session
                await sessionsApi.update(sessionData.id, sessionData);
                toast.success('Agendamento atualizado com sucesso!');
            } else {
                // Create new session
                await sessionsApi.create(sessionData);
                toast.success('Sessão agendada com sucesso!');
            }
            await loadData();

            // Navigate to the date of the appointment
            const [year, month, day] = sessionData.date.split('-').map(Number);
            const newDate = new Date(year, month - 1, day, 12, 0, 0);
            setSelectedDate(newDate);
            setEditingSession(null);

        } catch (error) {
            console.error('Error saving session:', error);
            toast.error('Erro ao salvar agendamento');
        }
    };

    const handleEditSession = (session: Session) => {
        setEditingSession(session);
        setIsAppointmentModalOpen(true);
    };

    const handleDeleteSession = async (sessionId: string) => {
        try {
            await sessionsApi.delete(sessionId);
            await loadData();
            toast.success('Agendamento excluído com sucesso!');
        } catch (error) {
            console.error('Error deleting session:', error);
            toast.error('Erro ao excluir agendamento');
        }
    };

    const handleCloseModal = () => {
        setIsAppointmentModalOpen(false);
        setEditingSession(null);
    };

    const handleNavigateDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
    };

    // Handler for drag-and-drop session updates
    const handleUpdateSession = async (sessionId: string, updates: Partial<Session>) => {
        try {
            const session = sessions.find(s => s.id === sessionId);
            if (!session) return;

            const updatedSession = { ...session, ...updates };
            await sessionsApi.update(sessionId, updatedSession);
            await loadData();
            toast.success('Agendamento movido com sucesso!');
        } catch (error) {
            console.error('Error updating session:', error);
            toast.error('Erro ao mover agendamento');
        }
    };

    const renderCalendarView = () => {
        switch (viewMode) {
            case 'day':
                return (
                    <DayView
                        date={selectedDate}
                        sessions={filteredSessions}
                        professionals={professionals}
                        patients={patients}
                        unit={unit}
                        units={units}
                        onEditSession={handleEditSession}
                        onUpdateSession={handleUpdateSession}
                    />
                );
            case 'month':
                return (
                    <MonthView
                        currentDate={selectedDate}
                        sessions={filteredSessions}
                        professionals={professionals}
                        patients={patients}
                        onEditSession={handleEditSession}
                        onDateClick={(date) => {
                            setSelectedDate(date);
                            setViewMode('day');
                        }}
                        onUpdateSession={handleUpdateSession}
                    />
                );
            case 'dayList':
                return (
                    <DayListView
                        date={selectedDate}
                        sessions={filteredSessions}
                        professionals={professionals}
                        patients={patients}
                        units={units}
                        onEditSession={handleEditSession}
                    />
                );
            case 'weekList':
                return (
                    <WeekListView
                        currentDate={selectedDate}
                        sessions={filteredSessions}
                        professionals={professionals}
                        patients={patients}
                        units={units}
                        onEditSession={handleEditSession}
                    />
                );
            default: // week
                return (
                    <WeekView
                        currentDate={selectedDate}
                        sessions={filteredSessions}
                        professionals={professionals}
                        patients={patients}
                        unit={unit}
                        units={units}
                        onEditSession={handleEditSession}
                        onDateClick={(date) => {
                            setSelectedDate(date);
                            setViewMode('day');
                        }}
                        onUpdateSession={handleUpdateSession}
                    />
                );
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 animate-fade-in">
            <CalendarHeader
                viewMode={viewMode}
                setViewMode={setViewMode}
                selectedDate={selectedDate}
                onNavigateDate={handleNavigateDate}
                onDateSelect={setSelectedDate}
                filterProf={filterProf}
                setFilterProf={setFilterProf}
                filterSpecialty={filterSpecialty}
                setFilterSpecialty={setFilterSpecialty}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                unit={unit}
                professionals={professionals}
                onNewAppointment={() => setIsAppointmentModalOpen(true)}
                onSyncGoogle={handleSyncGoogle}
                isSyncing={isSyncing}
            />

            <div className="flex-1 min-h-0">
                {renderCalendarView()}
            </div>

            <AppointmentModal
                isOpen={isAppointmentModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveSession}
                onDelete={handleDeleteSession}
                currentUnit={currentUnit}
                editingSession={editingSession}
            />
        </div>
    );
};

export default Schedule;

