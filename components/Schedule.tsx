


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
import { getSavedScheduleConfig } from './Settings/ScheduleSettingsTab';

interface ScheduleProps {
    currentUnit: UnitId;
}

const Schedule: React.FC<ScheduleProps> = ({ currentUnit }) => {
    const [searchParams] = useSearchParams();
    const scheduleConfig = getSavedScheduleConfig();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>(scheduleConfig.defaultView || 'week'); // Default to week view like ZenFisio

    // Filters
    const [filterProf, setFilterProf] = useState<string>(searchParams.get('professionalId') || 'all');
    const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPatient, setFilterPatient] = useState<string>('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [, setRefreshColor] = useState(0);

    // Data State
    const [sessions, setSessions] = useState<Session[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [unit, setUnit] = useState<Unit | null>(null);

    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);
    const [modalInitialTime, setModalInitialTime] = useState<string | undefined>(undefined);
    const [modalInitialProf, setModalInitialProf] = useState<string | undefined>(undefined);

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
        const patient = patients.find(p => p.id === s.patientId);
        const isPatientMatch = !filterPatient || (patient?.name.toLowerCase().includes(filterPatient.toLowerCase().trim()));
        return isProf && isSpecialty && isStatus && isPatientMatch;
    });

    const handleEditSession = (session: Session) => {
        setEditingSession(session);
        setIsAppointmentModalOpen(true);
    };

    const handleSlotClick = (date: Date, time: string) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        setEditingSession(null);
        setModalInitialDate(dateStr);
        setModalInitialTime(time);
        setModalInitialProf(filterProf !== 'all' ? filterProf : undefined);
        setIsAppointmentModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAppointmentModalOpen(false);
        setEditingSession(null);
        setModalInitialDate(undefined);
        setModalInitialTime(undefined);
        setModalInitialProf(undefined);
    };

    const handleSaveSession = async (sessionData: Session) => {
        try {
            if (editingSession) {
                await sessionsApi.update(sessionData.id, sessionData);
                toast.success('Agendamento atualizado com sucesso!');
            } else {
                await sessionsApi.create(sessionData);

                // Se solicitou repetição semanal
                if (sessionData.repeatWeekly) {
                    const repeatCount = scheduleConfig.defaultRepeatCount || 10;
                    const baseDate = new Date(`${sessionData.date}T12:00:00`);
                    const promises = [];
                    for (let i = 1; i < repeatCount; i++) {
                        const nextDate = new Date(baseDate);
                        nextDate.setDate(baseDate.getDate() + (i * 7));
                        const y = nextDate.getFullYear();
                        const m = (nextDate.getMonth() + 1).toString().padStart(2, '0');
                        const d = nextDate.getDate().toString().padStart(2, '0');
                        const nextDateStr = `${y}-${m}-${d}`;
                        promises.push(
                            sessionsApi.create({
                                ...sessionData,
                                date: nextDateStr,
                                repeatWeekly: false
                            })
                        );
                    }
                    await Promise.allSettled(promises);
                    toast.success(`Agendamento e ${repeatCount - 1} repetições criados com sucesso!`);
                } else {
                    toast.success('Agendamento criado com sucesso!');
                }
            }
            await loadData();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving session:', error);
            toast.error('Erro ao salvar agendamento');
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        try {
            await sessionsApi.delete(sessionId);
            toast.success('Agendamento excluído');
            loadData();
        } catch (error) {
            console.error('Error deleting session:', error);
            toast.error('Erro ao excluir agendamento');
        }
    };

    const handleUpdateSession = async (sessionId: string, updates: Partial<Session>) => {
        try {
            await sessionsApi.update(sessionId, updates);
            toast.success('Agendamento atualizado');
            loadData();
        } catch (error) {
            console.error('Error updating session:', error);
            toast.error('Erro ao atualizar agendamento');
        }
    };

    const handleNavigateDate = (arg: any) => {
        if (arg === 'today') {
            setSelectedDate(new Date());
            return;
        }

        const newDate = new Date(selectedDate);

        if (typeof arg === 'number') {
            if (viewMode === 'month') {
                newDate.setMonth(selectedDate.getMonth() + (arg > 0 ? 1 : -1));
            } else {
                newDate.setDate(selectedDate.getDate() + arg);
            }
        } else {
            const step = arg === 'next' ? 1 : -1;
            if (viewMode === 'day' || viewMode === 'dayList') {
                newDate.setDate(selectedDate.getDate() + step);
            } else if (viewMode === 'week' || viewMode === 'weekList') {
                newDate.setDate(selectedDate.getDate() + (step * 7));
            } else if (viewMode === 'month') {
                newDate.setMonth(selectedDate.getMonth() + step);
            }
        }
        setSelectedDate(newDate);
    };

    const handleSyncGoogle = async () => {
        try {
            setIsSyncing(true);
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success('Agenda sincronizada com sucesso!');
        } catch {
            toast.error('Erro ao sincronizar agenda');
        } finally {
            setIsSyncing(false);
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
                        onSlotClick={handleSlotClick}
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
                        onSlotClick={handleSlotClick}
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
        <div className="min-h-[calc(100vh-6rem)] flex-1 flex flex-col gap-2 animate-fade-in">
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
                filterPatient={filterPatient}
                setFilterPatient={setFilterPatient}
                unit={unit}
                professionals={professionals}
                onNewAppointment={() => {
                    setEditingSession(null);
                    setModalInitialDate(undefined);
                    setModalInitialTime(undefined);
                    setModalInitialProf(filterProf !== 'all' ? filterProf : undefined);
                    setIsAppointmentModalOpen(true);
                }}
                onSyncGoogle={handleSyncGoogle}
                isSyncing={isSyncing}
                onColorConfigChange={() => setRefreshColor(prev => prev + 1)}
            />

            {/* Banner de Aniversariantes do Dia */}
            {scheduleConfig.showBirthdays && (() => {
                const todayMD = `${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`;
                const birthdayPatients = patients.filter(p => p.birthDate && p.birthDate.endsWith(todayMD));
                if (birthdayPatients.length === 0) return null;
                return (
                    <div className="bg-amber-50/80 border border-amber-200 text-amber-900 px-4 py-2 rounded-xl text-xs flex items-center justify-between animate-fade-in shadow-xs">
                        <span className="font-semibold flex items-center gap-1.5">
                            🎂 <strong>Aniversariantes de hoje:</strong> {birthdayPatients.map(p => p.name).join(', ')}
                        </span>
                        <span className="text-[10px] text-amber-700 font-bold">Deseje um feliz aniversário!</span>
                    </div>
                );
            })()}

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
                initialDate={modalInitialDate}
                initialTime={modalInitialTime}
                initialProfessionalId={modalInitialProf}
            />
        </div>
    );
};

export default Schedule;
