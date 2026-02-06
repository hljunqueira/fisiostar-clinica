
import React from 'react';
import { ChevronLeft, ChevronRight, X, Plus, RefreshCw, Users } from 'lucide-react';
import { Unit, Professional, SessionStatus } from '../../types';

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
    unit: Unit | null;
    professionals: Professional[];
    onNewAppointment: () => void;
    onSyncGoogle: () => void;
    isSyncing: boolean;
    hideProfessionalFilter?: boolean;
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
    unit,
    professionals,
    onNewAppointment,
    onSyncGoogle,
    isSyncing,
    hideProfessionalFilter = false
}) => {
    const unitProfessionals = professionals.filter(p => unit && p.unitIds.includes(unit.id));

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
        return `${startDay} – ${endDay} de ${month}. de ${year}`;
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
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Top Row: Filters */}
            <div className="p-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
                {/* Status Filter */}
                <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-500 font-medium">Status:</label>
                    <select
                        className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 outline-none focus:border-blue-400"
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

                {/* Patient Filter - placeholder for now */}
                <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-500 font-medium">Paciente:</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Filtrar por paciente"
                            className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 outline-none focus:border-blue-400 w-36"
                        />
                        <button className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Specialty Filter */}
                <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-500 font-medium">Especialidade:</label>
                    <select
                        className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 outline-none focus:border-blue-400"
                        value={filterSpecialty}
                        onChange={(e) => setFilterSpecialty(e.target.value)}
                    >
                        <option value="all">Todas especialidades</option>
                        {unit?.specialties.map(spec => (
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
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                    <RefreshCw className="w-3 h-3" />
                    Limpar
                </button>

                {/* Professionals Dropdown (Right side) */}
                {!hideProfessionalFilter && (
                    <div className="flex items-center gap-1 border-l border-gray-200 pl-3 ml-auto">
                        <Users className="w-4 h-4 text-gray-400" />
                        <label className="text-xs text-gray-500 font-medium">Profissional:</label>
                        <select
                            className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 outline-none focus:border-blue-400 min-w-[180px]"
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

            {/* Bottom Row: View Tabs + Navigation + Actions */}
            <div className="p-3 flex flex-wrap items-center justify-between gap-3">
                {/* View Mode Tabs */}
                <div className="flex items-center border border-gray-200 rounded overflow-hidden bg-gray-50">
                    <button
                        onClick={() => setViewMode('month')}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'month' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Mês
                    </button>
                    <button
                        onClick={() => setViewMode('day')}
                        className={`px-3 py-1.5 text-xs font-medium border-l border-gray-200 transition-colors ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Dia
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={`px-3 py-1.5 text-xs font-medium border-l border-gray-200 transition-colors ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Semana
                    </button>
                    <button
                        onClick={() => setViewMode('dayList')}
                        className={`px-3 py-1.5 text-xs font-medium border-l border-gray-200 transition-colors ${viewMode === 'dayList' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Lista do dia
                    </button>
                    <button
                        onClick={() => setViewMode('weekList')}
                        className={`px-3 py-1.5 text-xs font-medium border-l border-gray-200 transition-colors ${viewMode === 'weekList' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Lista da semana
                    </button>
                </div>

                {/* Date Navigation */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onNavigateDate(-getNavAmount())}
                        className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-gray-700"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Date Range Display */}
                    <span className="text-sm font-semibold text-gray-800 min-w-[180px] text-center capitalize">
                        {(viewMode === 'day' || viewMode === 'dayList')
                            ? selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                            : (viewMode === 'week' || viewMode === 'weekList')
                                ? getWeekRange()
                                : getMonthDisplay()
                        }
                    </span>

                    <button
                        onClick={() => onNavigateDate(getNavAmount())}
                        className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-gray-700"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input
                            type="date"
                            value={inputValue}
                            onChange={handleDateInput}
                            className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
                        />
                    </div>

                    <button
                        onClick={() => onDateSelect(new Date())}
                        className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Hoje
                    </button>

                    <button
                        onClick={onNewAppointment}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        Novo Agendamento
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CalendarHeader;
