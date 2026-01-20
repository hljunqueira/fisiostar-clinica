
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Filter, Plus, Calendar as CalendarIcon, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';
import { SESSIONS, PROFESSIONALS, PATIENTS, UNITS } from '../constants';
import { UnitId, Session, SessionStatus } from '../types';
import AppointmentModal from './AppointmentModal';

interface ScheduleProps {
  currentUnit: UnitId;
}

const Schedule: React.FC<ScheduleProps> = ({ currentUnit }) => {
  const [searchParams] = useSearchParams();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  // Inicializa filtros com base na URL se existirem
  const [filterProf, setFilterProf] = useState<string>(searchParams.get('professionalId') || 'all');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // State for sessions (initialized with constant data)
  const [sessions, setSessions] = useState<Session[]>(SESSIONS);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  // Auto-open modal if requested via URL
  useEffect(() => {
      if (searchParams.get('action') === 'new') {
          setIsAppointmentModalOpen(true);
      }
  }, [searchParams]);

  const unitData = UNITS.find(u => u.id === currentUnit);

  // Calculate local YYYY-MM-DD for selectedDate to ensure correct filtering regardless of Timezone
  const selYear = selectedDate.getFullYear();
  const selMonth = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const selDay = String(selectedDate.getDate()).padStart(2, '0');
  const selectedYMD = `${selYear}-${selMonth}-${selDay}`;

  const filteredSessions = sessions.filter(s => {
    const isUnit = s.unitId === currentUnit;
    const isProf = filterProf === 'all' || s.professionalId === filterProf;
    const isSpecialty = filterSpecialty === 'all' || s.type === filterSpecialty;
    
    // Date Filtering using robust local comparison
    const isDate = s.date === selectedYMD; 
    
    return isUnit && isProf && isDate && isSpecialty;
  });

  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8:00 to 18:00

  const handleSyncGoogle = () => {
      setIsSyncing(true);
      setTimeout(() => {
          setIsSyncing(false);
          alert('Agenda sincronizada com Google Calendar com sucesso!');
      }, 1500);
  };

  const handleAddSession = (newSession: Session) => {
      setSessions([...sessions, newSession]);
  };

  const handleNavigateDate = (days: number) => {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + days);
      setSelectedDate(newDate);
  };

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Input date returns YYYY-MM-DD. We need to set this date preserving local time logic roughly
      if (!e.target.value) return;
      const [year, month, day] = e.target.value.split('-').map(Number);
      const newDate = new Date(year, month - 1, day);
      setSelectedDate(newDate);
  };

  const getStatusColor = (status: SessionStatus) => {
    switch (status) {
      case SessionStatus.CONFIRMED: return 'bg-blue-50 text-blue-700 border-l-4 border-blue-500';
      case SessionStatus.COMPLETED: return 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-500';
      case SessionStatus.NOSHOW: return 'bg-orange-50 text-orange-700 border-l-4 border-orange-500';
      case SessionStatus.SCHEDULED: return 'bg-gray-50 text-gray-700 border-l-4 border-gray-400';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  const getStatusIcon = (status: SessionStatus) => {
    switch (status) {
      case SessionStatus.COMPLETED: return <CheckCircle className="w-3 h-3" />;
      case SessionStatus.NOSHOW: return <AlertCircle className="w-3 h-3" />;
      case SessionStatus.CANCELED: return <XCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  // Format date for display
  const displayDate = selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  
  // Reuse selectedYMD for input value to ensure sync
  const inputValue = selectedYMD;

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      {/* Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                <button 
                    onClick={() => handleNavigateDate(-1)}
                    className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500 hover:text-gray-900"
                    title="Dia Anterior"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                
                {/* Robust Date Picker Trigger via Overlay */}
                <div className="relative flex items-center justify-center group">
                    {/* CSS Hack to ensure the native picker indicator covers the whole input on Desktop */}
                    <style>{`
                        .date-picker-overlay::-webkit-calendar-picker-indicator {
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            margin: 0;
                            padding: 0;
                            cursor: pointer;
                            opacity: 0;
                        }
                    `}</style>
                    <div className="flex items-center gap-2 px-3 font-medium text-gray-900 min-w-[180px] justify-center cursor-pointer hover:bg-white hover:shadow-sm rounded-md py-1.5 transition-all">
                        <CalendarIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        <span className="capitalize">{displayDate}</span>
                        <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    
                    {/* Native Input Overlay - 100% reliable for clicks */}
                    <input 
                        type="date" 
                        value={inputValue}
                        onChange={handleDateInput}
                        onClick={(e) => {
                            try {
                                if ('showPicker' in HTMLInputElement.prototype) {
                                    e.currentTarget.showPicker();
                                }
                            } catch (error) {
                                // Ignore SecurityError in iframes, fallback to focus/CSS hack
                            }
                        }}
                        className="date-picker-overlay absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        aria-label="Selecionar data"
                    />
                </div>

                <button 
                    onClick={() => handleNavigateDate(1)}
                    className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500 hover:text-gray-900"
                    title="Próximo Dia"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
            
            <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>
            
            <div className="flex flex-wrap gap-2">
                <select 
                    className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                    value={filterSpecialty}
                    onChange={(e) => setFilterSpecialty(e.target.value)}
                >
                    <option value="all">Todas Especialidades</option>
                    {unitData?.specialties.map(spec => (
                        <option key={spec} value={spec}>{spec}</option>
                    ))}
                </select>

                <select 
                    className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                    value={filterProf}
                    onChange={(e) => setFilterProf(e.target.value)}
                >
                    <option value="all">Todos Profissionais</option>
                    {PROFESSIONALS.filter(p => p.unitIds.includes(currentUnit)).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto justify-end">
            <button 
                onClick={handleSyncGoogle}
                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                title="Sincronizar com Google Calendar"
            >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Google Agenda</span>
            </button>
            <button 
                onClick={() => setIsAppointmentModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
            >
                <Plus className="w-4 h-4" />
                <span>Novo Agendamento</span>
            </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="grid grid-cols-[60px_1fr] md:grid-cols-[80px_1fr] flex-1 overflow-y-auto relative">
             {/* Time Column */}
            <div className="border-r border-gray-100 bg-gray-50/50 sticky left-0 z-20">
                {hours.map(hour => (
                    <div key={hour} className="h-32 border-b border-gray-100 relative">
                        <span className="absolute -top-3 right-3 text-xs text-gray-400 font-medium">
                            {hour}:00
                        </span>
                    </div>
                ))}
            </div>

            {/* Sessions Column */}
            <div className="relative bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] min-w-[600px]">
                {/* Horizontal Lines */}
                {hours.map(hour => (
                    <div key={hour} className="h-32 border-b border-gray-100/50 w-full"></div>
                ))}
                
                {/* Current Time Line (if today) */}
                {selectedYMD === new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-') && (
                     <div 
                        className="absolute left-0 right-0 border-t-2 border-red-400 z-10 pointer-events-none"
                        style={{ 
                            top: `${(new Date().getHours() - 8) * 128 + (new Date().getMinutes() / 60) * 128}px` 
                        }}
                     >
                        <span className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></span>
                     </div>
                )}

                {/* Session Cards - Absolute Positioning Mockup */}
                {filteredSessions.map(session => {
                    const patient = PATIENTS.find(p => p.id === session.patientId);
                    const prof = PROFESSIONALS.find(p => p.id === session.professionalId);
                    
                    // Simple mock positioning
                    const startHour = parseInt(session.time.split(':')[0]);
                    const minutes = parseInt(session.time.split(':')[1]);
                    // 128px per hour. Start at 8:00 (index 0).
                    const topOffset = (startHour - 8) * 128 + (minutes / 60) * 128;
                    
                    return (
                        <div 
                            key={session.id}
                            className={`absolute left-4 right-4 h-28 p-3 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer group ${getStatusColor(session.status)}`}
                            style={{ top: `${topOffset}px`, maxWidth: '95%' }}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-sm text-gray-900">{patient?.name}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-semibold border bg-white/50 border-transparent`}>
                                            {session.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <span className="font-medium bg-white/60 px-1 rounded">{session.type}</span>
                                        <span>•</span>
                                        <span>{prof?.name}</span>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="p-1 bg-white rounded-full shadow-sm text-gray-500">
                                        {getStatusIcon(session.status)}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                                {/* Actions Mock */}
                                <button className="text-xs bg-white/80 hover:bg-white px-2 py-1 rounded shadow-sm text-gray-700 font-medium">Editar</button>
                                {session.status === SessionStatus.SCHEDULED && (
                                    <button className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2 py-1 rounded shadow-sm font-medium">Confirmar</button>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {filteredSessions.length === 0 && (
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="text-center text-gray-400">
                             <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                             <p>Nenhum agendamento para este dia.</p>
                         </div>
                     </div>
                )}
            </div>
        </div>
      </div>

      <AppointmentModal 
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        onSave={handleAddSession}
        currentUnit={currentUnit}
      />
    </div>
  );
};

export default Schedule;
