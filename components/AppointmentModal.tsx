import React, { useState, useEffect, useMemo } from 'react';
import { UnitId, Session, SessionStatus, Professional, Patient, Unit, Agreement, Room } from '../types';
import { patientsApi, professionalsApi, unitsApi, agreementsApi, sessionsApi } from '../src/services/api';
import { roomsApi } from '../src/services/rooms-api';
import { QuickPatientModal } from './QuickPatientModal';
import { ProfessionalHoursModal } from './Calendar/ProfessionalHoursModal';
import { maskPhone, formatPhone } from '../src/utils/masks';
import { timeToMinutes } from '../src/utils/calendar-layout';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Unlock, Info, Calendar as CalendarIcon, UserPlus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: Session) => void;
  onDelete?: (sessionId: string) => void;
  currentUnit: UnitId;
  editingSession?: Session | null;
  initialDate?: string;
  initialTime?: string;
  initialProfessionalId?: string;
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string }> = {
  [SessionStatus.SCHEDULED]: { label: 'Agendado', color: 'bg-blue-500' },
  [SessionStatus.CONFIRMED]: { label: 'Confirmado', color: 'bg-emerald-500' },
  [SessionStatus.COMPLETED]: { label: 'Realizado', color: 'bg-gray-400' },
  [SessionStatus.NOSHOW]: { label: 'Falta', color: 'bg-red-500' },
  [SessionStatus.CANCELED]: { label: 'Cancelado', color: 'bg-amber-500' }
};

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  currentUnit,
  editingSession,
  initialDate,
  initialTime,
  initialProfessionalId
}) => {
  const isEditMode = !!editingSession;
  const navigate = useNavigate();

  // Data Sources
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    editingSession?.unitId || (currentUnit === 'ALL' ? '' : currentUnit)
  );
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [isQuickPatientModalOpen, setIsQuickPatientModalOpen] = useState(false);
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);

  // Form State
  const [date, setDate] = useState<string>(
    editingSession?.date || initialDate || new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState<string>(editingSession?.time || initialTime || '08:00');
  const [endTime, setEndTime] = useState<string>(editingSession?.endTime || '09:00');
  const [repeatWeekly, setRepeatWeekly] = useState<boolean>(editingSession?.repeatWeekly || false);
  const [isEncaixe, setIsEncaixe] = useState<boolean>(editingSession?.isEncaixe || false);

  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(
    editingSession?.professionalId || initialProfessionalId || ''
  );
  const [selectedPatientId, setSelectedPatientId] = useState<string>(editingSession?.patientId || '');
  const [agreementId, setAgreementId] = useState<string>(editingSession?.agreementId || '');
  const [authorizationCode, setAuthorizationCode] = useState<string>(editingSession?.authorizationCode || '');

  const [type, setType] = useState<string>(editingSession?.type || 'Fisioterapia');
  const [isOutsidePlan, setIsOutsidePlan] = useState<boolean>(editingSession?.isOutsidePlan || false);
  const [price, setPrice] = useState<string>(editingSession?.price?.toString() || '');

  const [status, setStatus] = useState<SessionStatus>(editingSession?.status || SessionStatus.SCHEDULED);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(editingSession?.roomId || '');

  const [patientPhone, setPatientPhone] = useState<string>('');
  const [reminderSms, setReminderSms] = useState<string>(editingSession?.reminderSms || 'none');
  const [reminderWhatsapp, setReminderWhatsapp] = useState<string>(
    editingSession?.reminderWhatsapp || 'none'
  );
  const [notes, setNotes] = useState<string>(editingSession?.notes || '');
  const [isBlockingMode, setIsBlockingMode] = useState(false);

  // Cadastro Rápido Simplificado (Apenas Nome)
  const [isInlineCreatingPatient, setIsInlineCreatingPatient] = useState(false);
  const [quickPatientName, setQuickPatientName] = useState('');
  const [isSavingQuickPatient, setIsSavingQuickPatient] = useState(false);

  const handleSaveQuickPatient = async () => {
    if (!quickPatientName.trim()) {
      toast.error('Informe o nome do paciente.');
      return;
    }

    try {
      setIsSavingQuickPatient(true);
      const newPatientData: Omit<Patient, 'id'> = {
        name: quickPatientName.trim(),
        phone: '',
        unitId: selectedUnitId || (currentUnit === 'ALL' ? (allUnits[0]?.id || '') : currentUnit),
        status: 'Active',
        plan: {
          name: 'Particular / Avulso',
          totalSessions: 0,
          remainingSessions: 0,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      };

      const created = await patientsApi.create(newPatientData);
      setPatients((prev) => [...prev, created]);
      setSelectedPatientId(created.id);
      setIsInlineCreatingPatient(false);
      setQuickPatientName('');
      toast.success(`Paciente ${created.name} cadastrado! A recepção poderá completar os dados depois.`);
    } catch (err: any) {
      console.error('Erro ao cadastrar paciente rápido:', err);
      toast.error('Erro ao cadastrar paciente.');
    } finally {
      setIsSavingQuickPatient(false);
    }
  };

  // Load Data
  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      try {
        setLoading(true);
        const [patientsData, professionalsData, unitsList, agreementsData] = await Promise.all([
          patientsApi.getAll(),
          professionalsApi.getAll(),
          unitsApi.getAll(),
          agreementsApi.getAll().catch(() => [])
        ]);

        setPatients(patientsData);
        setAllUnits(unitsList);
        setAgreements(agreementsData);

        const activeUnitId =
          editingSession?.unitId || (currentUnit === 'ALL' ? (unitsList[0]?.id || '') : currentUnit);
        setSelectedUnitId(activeUnitId);

        const activeUnitObj = unitsList.find((u) => u.id === activeUnitId) || unitsList[0] || null;
        setUnit(activeUnitObj);

        const availablePros = professionalsData.filter(
          (p) => !activeUnitId || p.unitIds.includes(activeUnitId) || currentUnit === 'ALL'
        );
        setProfessionals(availablePros);

        if (!selectedProfessionalId && availablePros.length > 0) {
          setSelectedProfessionalId(initialProfessionalId || availablePros[0].id);
        }

        // Carregar Salas
        if (activeUnitId) {
          const roomsData = await roomsApi.getAll(activeUnitId).catch(() => []);
          setRooms(roomsData);
          if (!selectedRoomId && roomsData.length > 0) {
            setSelectedRoomId(roomsData[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading appointment data:', error);
        toast.error('Erro ao carregar dados do agendamento');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen, currentUnit, editingSession, initialDate, initialTime, initialProfessionalId]);

  // Sincronizar dados ao abrir/editar
  useEffect(() => {
    if (editingSession) {
      setDate(editingSession.date);
      setStartTime(editingSession.time);
      setEndTime(editingSession.endTime || '');
      setRepeatWeekly(editingSession.repeatWeekly || false);
      setIsEncaixe(editingSession.isEncaixe || false);
      setSelectedProfessionalId(editingSession.professionalId);
      setSelectedPatientId(editingSession.patientId);
      setAgreementId(editingSession.agreementId || '');
      setAuthorizationCode(editingSession.authorizationCode || '');
      setType(editingSession.type || 'Fisioterapia');
      setIsOutsidePlan(editingSession.isOutsidePlan || false);
      setPrice(editingSession.price?.toString() || '');
      setStatus(editingSession.status || SessionStatus.SCHEDULED);
      setSelectedRoomId(editingSession.roomId || '');
      setReminderSms(editingSession.reminderSms || 'none');
      setReminderWhatsapp(editingSession.reminderWhatsapp || 'none');
      setNotes(editingSession.notes || '');
      setIsBlockingMode(editingSession.type?.includes('Bloqueio') || false);
    } else {
      if (initialDate) setDate(initialDate);
      if (initialTime) {
        setStartTime(initialTime);
        const [h, m] = initialTime.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          const endH = (h + 1) % 24;
          setEndTime(`${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      }
      if (initialProfessionalId) setSelectedProfessionalId(initialProfessionalId);
      setIsBlockingMode(false);
    }
  }, [editingSession, initialDate, initialTime, initialProfessionalId, isOpen]);

  // Sincronizar telefone ao selecionar paciente
  useEffect(() => {
    if (selectedPatientId) {
      const p = patients.find((pat) => pat.id === selectedPatientId);
      if (p && p.phone) {
        setPatientPhone(formatPhone(p.phone));
        if (p.agreementId && !agreementId) {
          setAgreementId(p.agreementId);
        }
      }
    }
  }, [selectedPatientId, patients]);

  // Recalcular horário de término ao alterar início
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const [h, m] = newStart.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const endH = (h + 1) % 24;
      const endStr = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      setEndTime(endStr);
    }
  };

  const handleToggleBlocking = () => {
    setIsBlockingMode((prev) => !prev);
    if (!isBlockingMode) {
      setType('Bloqueio de Horário');
      setNotes((prev) => (prev ? prev : 'Horário bloqueado na agenda'));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProfessionalId || !date || !startTime) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    if (!isBlockingMode && !selectedPatientId) {
      toast.error('Selecione ou cadastre o paciente.');
      return;
    }

    // Calcula a duração em minutos
    let durationMinutes = 60;
    if (startTime && endTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff > 0) durationMinutes = diff;
      }
    }

    const sessionData: Session = {
      id: editingSession?.id || '',
      patientId: isBlockingMode ? (selectedPatientId || patients[0]?.id || '') : selectedPatientId,
      professionalId: selectedProfessionalId,
      unitId: selectedUnitId || (currentUnit === 'ALL' ? (allUnits[0]?.id || '') : currentUnit),
      date,
      time: startTime,
      endTime,
      duration: durationMinutes,
      type: isBlockingMode ? 'Bloqueio de Horário' : type || 'Fisioterapia',
      status: isBlockingMode ? SessionStatus.SCHEDULED : status,
      notes: isBlockingMode ? (notes.trim() || 'Horário Bloqueado') : notes.trim(),
      isOutsidePlan,
      price: isOutsidePlan && price ? parseFloat(price) : undefined,
      agreementId: agreementId || undefined,
      roomId: selectedRoomId || undefined,
      authorizationCode: authorizationCode.trim() || undefined,
      isEncaixe,
      reminderSms,
      reminderWhatsapp,
      repeatWeekly
    };

    onSave(sessionData);
  };

  if (!isOpen) return null;

  const selectedProfessional = professionals.find((p) => p.id === selectedProfessionalId);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[92vh] border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            {isBlockingMode
              ? (isEditMode ? 'Editar Bloqueio de Horário' : 'Bloquear Horário na Agenda')
              : isEditMode
              ? 'Editar Agendamento'
              : 'Novo agendamento'}
          </h2>

          <div className="flex items-center gap-2">
            {isEditMode && isBlockingMode && onDelete && editingSession ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(editingSession.id);
                  toast.success('Horário liberado com sucesso!');
                  onClose();
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Liberar Horário</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleBlocking}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isBlockingMode
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isBlockingMode ? 'Desbloquear' : 'Bloquear horário'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Linha 1: Data, Horário e Repetir */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Data: *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Horário: *
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 text-[11px]">das</span>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                />
                <span className="text-gray-400 text-[11px]">às</span>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                />
              </div>
            </div>

            <div className="sm:col-span-3 pb-2">
              <label className="inline-flex items-center gap-2 cursor-pointer text-gray-700 font-semibold">
                <input
                  type="checkbox"
                  checked={repeatWeekly}
                  onChange={(e) => setRepeatWeekly(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <span>Repetir</span>
              </label>
            </div>
          </div>

          {/* Linha 2: Encaixe */}
          <div className="pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-gray-700 font-medium">
              <input
                type="checkbox"
                checked={isEncaixe}
                onChange={(e) => setIsEncaixe(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <span>Realizar encaixe de horário para o atendimento</span>
              <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
            </label>
          </div>

          {/* Linha 3: Profissional */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Profissional: *
            </label>
            <select
              required
              value={selectedProfessionalId}
              onChange={(e) => setSelectedProfessionalId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="" disabled>Selecione o profissional...</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.specialty})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsHoursModalOpen(true)}
              className="text-[10px] text-blue-600 mt-1 hover:underline cursor-pointer inline-block text-left"
            >
              Verifique o horário de trabalho e o horário de intervalo de cada profissional.
            </button>
          </div>

          {/* Linha 4: Paciente & Cadastro Rápido Simplificado */}
          {!isBlockingMode && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">
                  Paciente: *
                </label>
                <button
                  type="button"
                  onClick={() => setIsInlineCreatingPatient((prev) => !prev)}
                  className="text-[11px] text-primary font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>{isInlineCreatingPatient ? 'Selecionar da Lista' : 'Novo Paciente (Apenas Nome)'}</span>
                </button>
              </div>

              {isInlineCreatingPatient ? (
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Digite o nome completo do paciente..."
                      value={quickPatientName}
                      onChange={(e) => setQuickPatientName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={isSavingQuickPatient || !quickPatientName.trim()}
                      onClick={handleSaveQuickPatient}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {isSavingQuickPatient ? 'Salvando...' : 'Cadastrar'}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 italic">
                    Cadastro rápido: apenas o nome é obrigatório agora. A recepção poderá completar CPF, convênio e endereço depois.
                  </p>
                </div>
              ) : (
                <>
                  <select
                    required={!isBlockingMode}
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="">Selecione o paciente...</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.cpf ? `(CPF: ${p.cpf})` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedPatientId && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate(`/pacientes?patientId=${selectedPatientId}&tab=timeline`);
                      }}
                      className="text-[11px] text-blue-600 font-bold hover:text-blue-800 hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver Prontuário & Linha do Tempo de {patients.find(p => p.id === selectedPatientId)?.name || 'Paciente'} →</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Linha 5: Convênio & Senha/Autorização */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Convênio: *
              </label>
              <select
                value={agreementId}
                onChange={(e) => setAgreementId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="">Particular</option>
                {agreements.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <span>Senha/Autorização/Autenticador:</span>
                <Info className="w-3 h-3 text-gray-400" />
              </label>
              <input
                type="text"
                placeholder="Ex: AUT-984321"
                value={authorizationCode}
                onChange={(e) => setAuthorizationCode(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Linha 6: Procedimento & Lançar no financeiro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Procedimento:
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="Fisioterapia">Fisioterapia Geral</option>
                <option value="Pilates">Studio Pilates</option>
                <option value="Hidroterapia">Hidroterapia</option>
                <option value="RPG">RPG</option>
                <option value="Osteopatia">Osteopatia</option>
                <option value="Avaliação">Avaliação Fisioterapêutica</option>
                {unit?.specialties.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 pb-1">
              <label className="inline-flex items-center gap-2 cursor-pointer text-gray-700 font-semibold">
                <input
                  type="checkbox"
                  checked={isOutsidePlan}
                  onChange={(e) => setIsOutsidePlan(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <span>Lançar atendimento no financeiro</span>
              </label>

              {isOutsidePlan && (
                <input
                  type="number"
                  step="0.01"
                  placeholder="Valor (R$)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </div>
          </div>

          {/* Linha 7: Status & Sala Física */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Status:
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SessionStatus)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Sala:
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="">Não especificada</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Capacidade: {r.capacity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 8: Celular & Lembretes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Celular:
              </label>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={patientPhone}
                onChange={(e) => setPatientPhone(formatPhone(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Lembrete SMS:
              </label>
              <select
                value={reminderSms}
                onChange={(e) => setReminderSms(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="none">Sem lembrete</option>
                <option value="1_day_before">1 dia antes</option>
                <option value="2_hours_before">2 horas antes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Lembrete WhatsApp:
              </label>
              <select
                value={reminderWhatsapp}
                onChange={(e) => setReminderWhatsapp(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="none">Sem lembrete</option>
                <option value="1_day_before">1 dia antes</option>
                <option value="2_hours_before">2 horas antes</option>
              </select>
            </div>
          </div>

          {/* Linha 9: Observações */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Observações:
            </label>
            <textarea
              rows={2}
              placeholder="Anotações do agendamento ou observações da recepção..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/settings?tab=schedule');
              }}
              className="text-xs text-primary font-bold hover:underline cursor-pointer"
            >
              Configurações da agenda
            </button>

            <div className="flex items-center gap-2">
              {isEditMode && onDelete && editingSession && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(editingSession.id);
                    toast.success(isBlockingMode ? 'Horário liberado com sucesso!' : 'Agendamento excluído com sucesso!');
                    onClose();
                  }}
                  className={`px-3 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isBlockingMode
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  {isBlockingMode ? (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Liberar Horário (Desbloquear)</span>
                    </>
                  ) : (
                    <span>Excluir</span>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Fechar
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-primary/20 cursor-pointer active:scale-95"
              >
                Salvar
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Quick Patient Modal */}
      {isQuickPatientModalOpen && (
        <QuickPatientModal
          isOpen={isQuickPatientModalOpen}
          onClose={() => setIsQuickPatientModalOpen(false)}
          onPatientCreated={(newPat) => {
            setPatients((prev) => [...prev, newPat]);
            setSelectedPatientId(newPat.id);
            setPatientPhone(formatPhone(newPat.phone));
            setIsQuickPatientModalOpen(false);
          }}
          currentUnit={selectedUnitId || currentUnit}
        />
      )}

      {/* Professional Working Hours Modal */}
      {isHoursModalOpen && (
        <ProfessionalHoursModal
          isOpen={isHoursModalOpen}
          onClose={() => setIsHoursModalOpen(false)}
          professionals={professionals}
          initialProfessionalId={selectedProfessionalId}
        />
      )}
    </div>
  );
};

export default AppointmentModal;
