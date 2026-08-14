import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Plus, RefreshCw, Users, Palette } from 'lucide-react';
import { Unit, Professional, SessionStatus } from '../../types';
import CalendarColorModal, { ColorConfig } from './CalendarColorModal';

export type ViewMode = 'day' | 'week' | 'month' | 'dayList' | 'weekList';

interface CalendarHeaderProps {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    selectedDate: Date;
    onNavigateDate: (days: number) => void;
    onDateSelect: (date: Date) => void;
    filterProf: string;
    setFilterProf: (id: string) => void;
    filterSpecialty: string;
    setFilterSpecialty: (spec: string) => void;
    filterStatus: string;
    setFilterStatus: (status: string) => void;
    filterPatient?: string;
    setFilterPatient?: (patient: string) => void;
    unit: Unit | null;
    professionals: Professional[];
    onNewAppointment: () => void;
    onSyncGoogle: () => void;
    isSyncing: boolean;
    hideProfessionalFilter?: boolean;
    onColorConfigChange?: (config: ColorConfig) => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
    viewMode,
    setViewMode,
    selectedDate,
    onNavigateDate,
    onDateSelect,
    filterProf,
    setFilterProf,
    filterSpecialty,
    setFilterSpecialty,
    filterStatus,
    setFilterStatus,
    filterPatient = '',
    setFilterPatient,
    unit,
    professionals,
    onNewAppointment,
    onSyncGoogle,
    isSyncing,
    hideProfessionalFilter = false,
    onColorConfigChange
}) => {
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);

    // If unit is null (All Units), show all professionals. Otherwise filter by unit.
    const unitProfessionals = unit
        ? professionals.filter(p => p.unitIds.includes(unit.id))
        : professionals;

    // Get specialties: in professional portal mode (hideProfessionalFilter), pull only that professional's specialties
    const specialties = React.useMemo(() => {
        if (hideProfessionalFilter && professionals.length > 0) {
            const list: string[] = [];
            professionals.forEach(p => {
                if (p.specialty) {
                    p.specialty.split(',').forEach(s => list.push(s.trim()));
                }
            });
            return Array.from(new Set(list.filter(Boolean)));
        }
        return unit
            ? unit.specialties
            : Array.from(new Set(professionals.flatMap(p => p.specialty ? p.specialty.split(',').map(s => s.trim()) : []).filter(Boolean)));
    }, [unit, professionals, hideProfessionalFilter]);

    // Calculate week range for display
    const getWeekRange = () => {
        const startOfWeek = new Date(selectedDate);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 5);

        const startDay = startOfWeek.getDate();
        const endDay = endOfWeek.getDate();
        const month = startOfWeek.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const year = startOfWeek.getFullYear();
        return `${startDay} – ${endDay} de ${month}. ${year}`;
    };

    // Get month display format
    const getMonthDisplay = () => {
        return selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    };

    const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        const [year, month, day] = e.target.value.split('-').map(Number);
        const newDate = new Date(year, month - 1, day);
        onDateSelect(newDate);
    };

    const inputValue = selectedDate.toISOString().split('T')[0];

    // Get navigation amount based on view mode
    const getNavAmount = () => {
        if (viewMode === 'day' || viewMode === 'dayList') return 1;
        if (viewMode === 'week' || viewMode === 'weekList') return 7;
        return 30; // month
    };

    return (
        <div className="bg-white border border-gray-200/90 rounded-xl shadow-xs overflow-hidden">
            {/* TOP ROW: Single Line View Selector + Date Navigation + Actions */}
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between gap-3 overflow-x-auto whitespace-nowrap custom-scrollbar">
                {/* View Mode Tabs (Segmented Control Style) */}
                <div className="bg-gray-100/80 p-0.5 rounded-lg flex gap-0.5 border border-gray-200/70 shrink-0">
                    <button
                        onClick={() => setViewMode('month')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${viewMode === 'month' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Mês
                    </button>
                    <button
                        onClick={() => setViewMode('day')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${viewMode === 'day' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Dia
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${viewMode === 'week' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Semana
                    </button>
                    <button
                        onClick={() => setViewMode('dayList')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${viewMode === 'dayList' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Lista do dia
                    </button>
                    <button
                        onClick={() => setViewMode('weekList')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${viewMode === 'weekList' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Lista da semana
                    </button>
                </div>

                {/* Date Navigation (Centered) */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => onNavigateDate(-getNavAmount())}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-500 hover:text-gray-700"
                        title="Anterior"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-bold text-gray-800 px-1 capitalize min-w-[150px] text-center">
                        {(viewMode === 'day' || viewMode === 'dayList')
                            ? selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                            : (viewMode === 'week' || viewMode === 'weekList')
                                ? getWeekRange()
                                : getMonthDisplay()
                        }
                    </span>

                    <button
                        onClick={() => onNavigateDate(getNavAmount())}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-500 hover:text-gray-700"
                        title="Próximo"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Quick Actions (Right Aligned in the Same Line) */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <input
                        type="date"
                        value={inputValue}
                        onChange={handleDateInput}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
                    />

                    <button
                        onClick={() => onDateSelect(new Date())}
                        className="px-2.5 py-1 text-xs font-semibold border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
                    >
                        Hoje
                    </button>

                    {onColorConfigChange && (
                        <button
                            onClick={() => setIsColorModalOpen(true)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg transition-colors shadow-2xs"
                            title="Personalizar Cores dos Cards"
                        >
                            <Palette className="w-3.5 h-3.5 text-purple-600" />
                            Cores
                        </button>
                    )}

                    <button
                        onClick={onNewAppointment}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Novo Agendamento
                    </button>
                </div>
            </div>

            {/* BOTTOM ROW: Filters (Status, Paciente, Especialidade, Profissional on the SAME line) */}
            <div className="px-3 py-1.5 bg-gray-50/70 flex items-center justify-between gap-2 overflow-x-auto text-xs whitespace-nowrap">
                <div className="flex items-center gap-2.5">
                    {/* Status Filter */}
                    <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-500 font-semibold">Status:</label>
                        <select
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 outline-none focus:border-blue-400 font-medium"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">Todos os status</option>
                            <option value={SessionStatus.SCHEDULED}>Agendado</option>
                            <option value={SessionStatus.CONFIRMED}>Confirmado</option>
                            <option value={SessionStatus.COMPLETED}>Realizado</option>
                            <option value={SessionStatus.NOSHOW}>Faltou</option>
                            <option value={SessionStatus.CANCELED}>Cancelado</option>
                        </select>
                    </div>

                    {/* Patient Filter */}
                    <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-500 font-semibold">Paciente:</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Filtrar por paciente"
                                value={filterPatient}
                                onChange={(e) => setFilterPatient && setFilterPatient(e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 outline-none focus:border-blue-400 w-32 font-medium"
                            />
                            {filterPatient && (
                                <button
                                    onClick={() => setFilterPatient && setFilterPatient('')}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Specialty Filter */}
                    <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-500 font-semibold">Especialidade:</label>
                        <select
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 outline-none focus:border-blue-400 font-medium"
                            value={filterSpecialty}
                            onChange={(e) => setFilterSpecialty(e.target.value)}
                        >
                            <option value="all">Todas especialidades</option>
                            {specialties.map(spec => (
                                <option key={spec} value={spec}>{spec}</option>
                            ))}
                        </select>
                    </div>

                    {/* Clear Filters */}
                    <button
                        onClick={() => {
                            setFilterProf('all');
                            setFilterSpecialty('all');
                            setFilterStatus('all');
                            if (setFilterPatient) setFilterPatient('');
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Limpar
                    </button>
                </div>

                {/* Professionals Dropdown (Same line on the right) */}
                {!hideProfessionalFilter && (
                    <div className="flex items-center gap-1 border-l border-gray-200 pl-2.5 shrink-0">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <label className="text-xs text-gray-500 font-semibold">Profissional:</label>
                        <select
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 outline-none focus:border-blue-400 font-medium max-w-[210px]"
                            value={filterProf}
                            onChange={(e) => setFilterProf(e.target.value)}
                        >
                            <option value="all">Todos os profissionais</option>
                            {unitProfessionals.map(prof => (
                                <option key={prof.id} value={prof.id}>
                                    {prof.name} ({prof.specialty || 'Geral'})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Color Settings Modal */}
            {isColorModalOpen && (
                <CalendarColorModal
                    isOpen={isColorModalOpen}
                    onClose={() => setIsColorModalOpen(false)}
                    professionals={professionals}
                    onSaveConfig={(cfg) => {
                        if (onColorConfigChange) onColorConfigChange(cfg);
                    }}
                />
            )}
        </div>
    );
};

export default CalendarHeader;
