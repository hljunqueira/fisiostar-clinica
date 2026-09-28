import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Plus, RefreshCw, Users, Palette, ChevronDown, Search, Check } from 'lucide-react';
import { Unit, Professional, SessionStatus, Agreement } from '../../types';
import CalendarColorModal, { ColorConfig, getSavedColorConfig, PRESET_SWATCHES } from './CalendarColorModal';

export type ViewMode = 'day' | 'week' | 'month' | 'dayList' | 'weekList';

interface CalendarHeaderProps {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    selectedDate: Date;
    onNavigateDate: (days: number) => void;
    onDateSelect: (date: Date) => void;
    filterProf?: string;
    setFilterProf?: (id: string) => void;
    selectedProfIds?: string[];
    setSelectedProfIds?: (ids: string[]) => void;
    filterSpecialty: string;
    setFilterSpecialty: (spec: string) => void;
    filterStatus: string;
    setFilterStatus: (status: string) => void;
    filterAgreement?: string;
    setFilterAgreement?: (agreement: string) => void;
    agreements?: Agreement[];
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
    filterProf = 'all',
    setFilterProf,
    selectedProfIds,
    setSelectedProfIds,
    filterSpecialty,
    setFilterSpecialty,
    filterStatus,
    setFilterStatus,
    filterAgreement = 'all',
    setFilterAgreement,
    agreements = [],
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
    const [isProfDropdownOpen, setIsProfDropdownOpen] = useState(false);
    const [profSearchQuery, setProfSearchQuery] = useState('');
    const profDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profDropdownRef.current && !profDropdownRef.current.contains(event.target as Node)) {
                setIsProfDropdownOpen(false);
            }
        };
        if (isProfDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfDropdownOpen]);

    // Color configuration to show consistent colors for professionals
    const colorConfig = React.useMemo(() => getSavedColorConfig(), [isColorModalOpen]);

    const getProfColor = (profId: string, index: number = 0) => {
        try {
            if (colorConfig?.professionalColors && colorConfig.professionalColors[profId]?.hex) {
                return colorConfig.professionalColors[profId].hex;
            }
            if (Array.isArray(PRESET_SWATCHES) && PRESET_SWATCHES.length > 0) {
                const safeIndex = Math.max(0, typeof index === 'number' && !isNaN(index) ? index : 0);
                return PRESET_SWATCHES[safeIndex % PRESET_SWATCHES.length]?.hex || '#3B82F6';
            }
        } catch {
            // Safe fallback
        }
        return '#3B82F6';
    };

    // If unit is null (All Units), show all professionals. Otherwise filter by unit.
    const unitProfessionals = unit
        ? professionals.filter(p => p.unitIds.includes(unit.id))
        : professionals;

    // Resolve active selected IDs (strictly filter out invalid strings like 'all' and 'multiple')
    const currentSelectedProfIds = React.useMemo(() => {
        const raw = selectedProfIds !== undefined
            ? selectedProfIds
            : (filterProf && filterProf !== 'all' && filterProf !== 'multiple' ? [filterProf] : []);
        return raw.filter(id => Boolean(id) && id !== 'all' && id !== 'multiple');
    }, [selectedProfIds, filterProf]);

    const updateSelectedProf = (newIds: string[]) => {
        const cleanIds = newIds.filter(id => Boolean(id) && id !== 'all' && id !== 'multiple');
        if (setSelectedProfIds) {
            setSelectedProfIds(cleanIds);
        } else if (setFilterProf) {
            if (cleanIds.length === 1) {
                setFilterProf(cleanIds[0]);
            } else {
                setFilterProf('all');
            }
        }
    };

    const handleToggleProf = (profId: string) => {
        if (currentSelectedProfIds.includes(profId)) {
            const updated = currentSelectedProfIds.filter(id => id !== profId);
            updateSelectedProf(updated);
        } else {
            updateSelectedProf([...currentSelectedProfIds, profId]);
        }
    };

    const handleSelectAll = () => {
        updateSelectedProf([]);
    };

    const filteredUnitProfessionals = React.useMemo(() => {
        const query = profSearchQuery.toLowerCase().trim();
        if (!query) return unitProfessionals;
        return unitProfessionals.filter(p =>
            p.name.toLowerCase().includes(query) ||
            (p.specialty && p.specialty.toLowerCase().includes(query))
        );
    }, [unitProfessionals, profSearchQuery]);

    const getTriggerButtonText = () => {
        if (currentSelectedProfIds.length === 0) {
            return 'Todos os profissionais';
        }
        if (currentSelectedProfIds.length === 1) {
            const prof = professionals.find(p => p.id === currentSelectedProfIds[0]);
            return prof ? prof.name : '1 profissional';
        }
        if (currentSelectedProfIds.length === 2) {
            const prof1 = professionals.find(p => p.id === currentSelectedProfIds[0]);
            const prof2 = professionals.find(p => p.id === currentSelectedProfIds[1]);
            if (prof1 && prof2) {
                const n1 = prof1.name.split(' ')[0];
                const n2 = prof2.name.split(' ')[0];
                return `${n1}, ${n2}`;
            }
        }
        return `${currentSelectedProfIds.length} profissionais`;
    };

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
        <div className="bg-white border border-gray-200/90 rounded-xl shadow-xs relative z-30">
            {/* TOP ROW: Single Line View Selector + Date Navigation + Actions */}
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between gap-3 overflow-x-auto whitespace-nowrap custom-scrollbar rounded-t-xl">
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
            <div className="px-3 py-1.5 bg-gray-50/70 flex items-center justify-between gap-2 overflow-visible text-xs flex-wrap md:flex-nowrap rounded-b-xl relative">
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

                    {/* Agreement / Convênio Filter */}
                    <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-500 font-semibold">Convênio:</label>
                        <select
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 outline-none focus:border-blue-400 font-medium max-w-[160px]"
                            value={filterAgreement}
                            onChange={(e) => setFilterAgreement && setFilterAgreement(e.target.value)}
                        >
                            <option value="all">Todos os convênios</option>
                            <option value="particular">Particular / Avulso</option>
                            {agreements.map(agr => (
                                <option key={agr.id} value={agr.id}>
                                    {agr.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Professionals Multiselect Dropdown with Checkboxes */}
                {!hideProfessionalFilter && (
                    <div className="flex items-center gap-1 border-l border-gray-200 pl-2.5 shrink-0 relative" ref={profDropdownRef}>
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <label className="text-xs text-gray-500 font-semibold">Profissional:</label>

                        <button
                            type="button"
                            onClick={() => setIsProfDropdownOpen(prev => !prev)}
                            className={`text-xs border rounded-lg px-2 py-1 bg-white text-gray-700 outline-none font-medium flex items-center justify-between gap-1.5 min-w-[170px] max-w-[240px] transition-all duration-150 cursor-pointer shadow-2xs ${
                                isProfDropdownOpen
                                    ? 'border-blue-500 ring-2 ring-blue-100'
                                    : currentSelectedProfIds.length > 0
                                        ? 'border-blue-400 bg-blue-50/20'
                                        : 'border-gray-200 hover:border-gray-300'
                            }`}
                            title={
                                currentSelectedProfIds.length === 0
                                    ? 'Exibindo todos os profissionais'
                                    : `${currentSelectedProfIds.length} profissional(is) selecionado(s)`
                            }
                        >
                            <div className="flex items-center gap-1.5 truncate">
                                {currentSelectedProfIds.length === 1 && (
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                                        style={{
                                            backgroundColor: getProfColor(
                                                currentSelectedProfIds[0],
                                                Math.max(0, professionals.findIndex(p => p.id === currentSelectedProfIds[0]))
                                            )
                                        }}
                                    />
                                )}
                                <span className="truncate text-left text-xs text-gray-800">
                                    {getTriggerButtonText()}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                {currentSelectedProfIds.length > 0 && (
                                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        {currentSelectedProfIds.length}
                                    </span>
                                )}
                                {currentSelectedProfIds.length > 0 && (
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectAll();
                                        }}
                                        title="Limpar seleção (mostrar todos)"
                                        className="hover:bg-gray-100 rounded-full p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </span>
                                )}
                                <ChevronDown
                                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${
                                        isProfDropdownOpen ? 'rotate-180 text-blue-500' : ''
                                    }`}
                                />
                            </div>
                        </button>

                        {/* Dropdown Menu com Checkboxes */}
                        {isProfDropdownOpen && (
                            <div className="absolute right-0 top-full mt-1.5 z-50 w-72 bg-white rounded-xl shadow-xl border border-gray-200 py-2 animate-in fade-in zoom-in-95 duration-100 flex flex-col text-xs">
                                {/* Search input */}
                                <div className="px-2.5 pb-2">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder="Buscar profissional..."
                                            value={profSearchQuery}
                                            onChange={(e) => setProfSearchQuery(e.target.value)}
                                            className="w-full text-xs pl-7 pr-6 py-1.5 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-400 focus:outline-none transition-colors"
                                            autoFocus
                                        />
                                        {profSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setProfSearchQuery('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Ações rápidas */}
                                <div className="px-2.5 pb-1.5 flex items-center justify-between border-b border-gray-100 text-[11px] text-gray-500">
                                    <button
                                        type="button"
                                        onClick={handleSelectAll}
                                        className={`font-medium hover:text-blue-600 transition-colors cursor-pointer ${
                                            currentSelectedProfIds.length === 0 ? 'text-blue-600 font-semibold' : ''
                                        }`}
                                    >
                                        Exibir todos ({unitProfessionals.length})
                                    </button>
                                    {currentSelectedProfIds.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleSelectAll}
                                            className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                                        >
                                            Limpar seleção
                                        </button>
                                    )}
                                </div>

                                {/* Lista de profissionais com checkboxes */}
                                <div className="p-1 max-h-60 overflow-y-auto space-y-0.5">
                                    {/* Opção Todos */}
                                    <label
                                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors select-none ${
                                            currentSelectedProfIds.length === 0
                                                ? 'bg-blue-50 text-blue-900 font-semibold'
                                                : 'hover:bg-gray-50 text-gray-700'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={currentSelectedProfIds.length === 0}
                                            onChange={handleSelectAll}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                        />
                                        <div className="flex-1 truncate">
                                            <span>Todos os profissionais</span>
                                        </div>
                                        {currentSelectedProfIds.length === 0 && (
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                                                Ativo
                                            </span>
                                        )}
                                    </label>

                                    {/* Lista de cada profissional */}
                                    {filteredUnitProfessionals.map((prof, idx) => {
                                        const isChecked = currentSelectedProfIds.includes(prof.id);
                                        const color = getProfColor(prof.id, idx);
                                        return (
                                            <label
                                                key={prof.id}
                                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors select-none ${
                                                    isChecked
                                                        ? 'bg-blue-50/70 text-blue-900 font-medium'
                                                        : 'hover:bg-gray-50 text-gray-700'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleToggleProf(prof.id)}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                                />
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                                                    style={{ backgroundColor: color }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="truncate text-xs font-medium text-gray-800">
                                                        {prof.name}
                                                    </div>
                                                    {prof.specialty && (
                                                        <div className="text-[10px] text-gray-400 truncate leading-tight">
                                                            {prof.specialty}
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}

                                    {filteredUnitProfessionals.length === 0 && (
                                        <div className="py-4 text-center text-gray-400 text-xs">
                                            Nenhum profissional encontrado
                                        </div>
                                    )}
                                </div>

                                {/* Footer com status e botão de fechar */}
                                <div className="pt-2 px-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                                    <span>
                                        {currentSelectedProfIds.length === 0
                                            ? 'Exibindo todos'
                                            : `${currentSelectedProfIds.length} selecionado(s)`}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsProfDropdownOpen(false)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1 rounded-md text-[11px] transition-colors cursor-pointer"
                                    >
                                        Concluir
                                    </button>
                                </div>
                            </div>
                        )}
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
