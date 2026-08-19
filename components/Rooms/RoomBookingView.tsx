import React, { useState, useEffect } from 'react';
import { UnitId, Room, RoomReservation, Professional, Unit, UserRole } from '../../types';
import { roomsApi } from '../../src/services/rooms-api';
import { professionalsApi, unitsApi } from '../../src/services/api';
import { Calendar, Clock, Plus, Trash2, DoorClosed, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface RoomBookingViewProps {
  currentUnit: UnitId;
  userRole?: UserRole;
  currentProfessionalId?: string;
}

export const RoomBookingView: React.FC<RoomBookingViewProps> = ({
  currentUnit,
  userRole = 'admin',
  currentProfessionalId
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(currentUnit === 'ALL' ? '' : currentUnit);
  const [units, setUnits] = useState<Unit[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<RoomReservation[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State Reserva
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedProfId, setSelectedProfId] = useState<string>(currentProfessionalId || '');
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('09:00');
  const [purpose, setPurpose] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Modal State Cadastro de Sala
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomCapacity, setRoomCapacity] = useState(1);
  const [roomColor, setRoomColor] = useState('#3b82f6');
  const [savingRoom, setSavingRoom] = useState(false);

  const navigate = useNavigate();

  // Permissões
  const canBook = userRole === 'admin' || userRole === 'super_admin' || userRole === 'professional' || userRole === 'manager';
  const canManageRooms = userRole === 'admin' || userRole === 'super_admin' || userRole === 'manager';
  const isViewOnly = userRole === 'secretary' || userRole === 'financial';

  useEffect(() => {
    loadBaseData();
  }, [currentUnit]);

  useEffect(() => {
    loadReservations();
  }, [selectedDate, selectedUnitId]);

  const loadBaseData = async () => {
    try {
      setLoading(true);
      const [unitsData, prosData] = await Promise.all([
        unitsApi.getAll(),
        professionalsApi.getAll()
      ]);
      setUnits(unitsData);
      setProfessionals(prosData);

      const activeUnit = selectedUnitId || (currentUnit === 'ALL' ? (unitsData[0]?.id || '') : currentUnit);
      setSelectedUnitId(activeUnit);

      const roomsData = await roomsApi.getAll(activeUnit);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading room base data:', error);
      toast.error('Erro ao carregar salas');
    } finally {
      setLoading(false);
    }
  };

  const loadReservations = async () => {
    if (!selectedUnitId) return;
    try {
      const [roomsData, resData] = await Promise.all([
        roomsApi.getAll(selectedUnitId),
        roomsApi.getReservations(selectedDate, selectedUnitId)
      ]);
      setRooms(roomsData);
      setReservations(resData);
    } catch (error) {
      console.error('Error loading reservations:', error);
    }
  };

  const handleUnitChange = (uId: string) => {
    setSelectedUnitId(uId);
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const openNewRoomModal = () => {
    setRoomName('');
    setRoomDescription('');
    setRoomCapacity(1);
    setRoomColor('#3b82f6');
    setIsRoomModalOpen(true);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      toast.error('Informe o nome da sala.');
      return;
    }
    if (!selectedUnitId) {
      toast.error('Selecione uma unidade primeiro.');
      return;
    }

    try {
      setSavingRoom(true);
      await roomsApi.createRoom({
        unitId: selectedUnitId,
        name: roomName.trim(),
        description: roomDescription.trim(),
        capacity: roomCapacity,
        color: roomColor,
        active: true
      });
      toast.success('Sala cadastrada com sucesso!');
      setIsRoomModalOpen(false);
      loadReservations();
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast.error(error.message || 'Erro ao cadastrar sala');
    } finally {
      setSavingRoom(false);
    }
  };

  const openNewReservation = (roomId?: string) => {
    if (!canBook) {
      toast.error('Seu perfil possui apenas permissão de visualização de salas.');
      return;
    }
    if (rooms.length === 0) {
      toast.error('Nenhuma sala cadastrada nesta unidade. Clique em "Cadastrar Sala".');
      return;
    }
    setSelectedRoomId(roomId || rooms[0]?.id || '');
    if (currentProfessionalId) {
      setSelectedProfId(currentProfessionalId);
    } else if (professionals.length > 0) {
      setSelectedProfId(professionals[0].id);
    }
    setStartTime('08:00');
    setEndTime('09:00');
    setPurpose('');
    setIsModalOpen(true);
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoomId || !selectedProfId || !startTime || !endTime) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (endTime <= startTime) {
      toast.error('O horário de término deve ser posterior ao horário de início.');
      return;
    }

    try {
      setSubmitting(true);
      await roomsApi.createReservation({
        roomId: selectedRoomId,
        unitId: selectedUnitId,
        professionalId: selectedProfId,
        date: selectedDate,
        startTime,
        endTime,
        purpose: purpose.trim(),
        status: 'confirmed'
      });

      toast.success('Reserva confirmada com sucesso!');
      setIsModalOpen(false);
      loadReservations();
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      toast.error(error.message || 'Erro ao realizar reserva de sala');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReservation = async (id: string) => {
    if (!canBook) return;
    if (!window.confirm('Deseja realmente cancelar esta reserva de sala?')) return;

    try {
      await roomsApi.cancelReservation(id);
      toast.success('Reserva cancelada com sucesso');
      loadReservations();
    } catch (error) {
      console.error('Error canceling reservation:', error);
      toast.error('Erro ao cancelar reserva');
    }
  };

  const formattedDateTitle = new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DoorClosed className="w-7 h-7 text-primary" />
            Reserva de Salas
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestão de ocupação dos espaços físicos da clínica
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Unidade */}
          {units.length > 1 && (
            <select
              value={selectedUnitId}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="bg-white border border-gray-200 text-gray-800 text-xs font-bold rounded-xl px-3 py-2 outline-none shadow-xs focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}

          {/* Botão Cadastrar Sala */}
          {canManageRooms && (
            <button
              onClick={openNewRoomModal}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <DoorClosed className="w-4 h-4 text-primary" />
              <span>Cadastrar Sala</span>
            </button>
          )}

          {/* Botão Nova Reserva */}
          {canBook && (
            <button
              onClick={() => openNewReservation()}
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-primary/30 cursor-pointer active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>Nova Reserva</span>
            </button>
          )}
        </div>
      </div>

      {/* Aviso Modo Visualização (Secretária / Financeiro) */}
      {isViewOnly && (
        <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Modo Consulta:</strong> Você pode visualizar a ocupação das salas. Para solicitar trocas ou avisar o profissional, use o Chat Interno.
            </span>
          </div>
          <button
            onClick={() => navigate('/chat')}
            className="px-2.5 py-1 bg-white border border-blue-200 rounded-lg font-bold text-blue-700 hover:bg-blue-50 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Abrir Chat</span>
          </button>
        </div>
      )}

      {/* Barra de Navegação por Data */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevDay}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer"
            title="Dia anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Hoje
          </button>
          <button
            onClick={handleNextDay}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer"
            title="Próximo dia"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="ml-2 text-sm font-bold text-gray-800 capitalize">
            {formattedDateTitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          />
        </div>
      </div>

      {/* Grade de Salas & Ocupação */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 font-medium text-sm">
          Carregando salas e reservas...
        </div>
      ) : rooms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <DoorClosed className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 text-base mb-1">Nenhuma sala cadastrada nesta unidade</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mb-5">
            Cadastre os consultórios, estúdios de pilates e salas de atendimento para habilitar as reservas.
          </p>
          {canManageRooms && (
            <button
              onClick={openNewRoomModal}
              className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 shadow-md shadow-primary/20 cursor-pointer active:scale-95 mx-auto"
            >
              <DoorClosed className="w-4 h-4" />
              <span>Cadastrar Sala</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const roomReservations = reservations.filter((r) => r.roomId === room.id);

            return (
              <div
                key={room.id}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden flex flex-col transition-all hover:shadow-md"
              >
                {/* Header da Sala */}
                <div
                  className="p-4 text-white flex justify-between items-start"
                  style={{ backgroundColor: room.color || '#3b82f6' }}
                >
                  <div>
                    <h3 className="font-bold text-base leading-tight">{room.name}</h3>
                    {room.description && (
                      <p className="text-xs text-white/80 mt-0.5">{room.description}</p>
                    )}
                    <span className="inline-block mt-2 px-2 py-0.5 bg-black/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                      Capacidade: {room.capacity} {room.capacity === 1 ? 'pessoa' : 'pessoas'}
                    </span>
                  </div>
                  {canBook && (
                    <button
                      onClick={() => openNewReservation(room.id)}
                      title="Reservar esta sala"
                      className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Lista de Reservas do Dia */}
                <div className="p-3.5 flex-1 divide-y divide-gray-100 space-y-2">
                  <div className="flex items-center justify-between pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <span>Horários Reservados</span>
                    <span>{roomReservations.length} ocupação(ões)</span>
                  </div>

                  {roomReservations.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs">
                      Sala livre neste dia
                    </div>
                  ) : (
                    roomReservations.map((res) => (
                      <div
                        key={res.id}
                        className="pt-2 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 font-mono font-bold text-gray-900">
                            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>
                              {res.startTime} às {res.endTime}
                            </span>
                          </div>
                          <p className="font-semibold text-gray-800 truncate mt-0.5">
                            {res.professionalName}
                          </p>
                          {res.purpose && (
                            <p className="text-[11px] text-gray-500 truncate">{res.purpose}</p>
                          )}
                        </div>

                        {canBook && (
                          <button
                            onClick={() => handleCancelReservation(res.id)}
                            title="Cancelar reserva"
                            className="p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Nova Reserva */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in border border-gray-100">
            <div className="bg-gradient-to-r from-primary to-primary-hover p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <DoorClosed className="w-6 h-6 text-white" />
                <h3 className="text-lg font-bold">Nova Reserva de Sala</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReservation} className="p-6 space-y-4">
              {/* Seleção de Sala */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Sala de Atendimento *
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Capacidade: {r.capacity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Profissional */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Profissional Responsável *
                </label>
                <select
                  value={selectedProfId}
                  onChange={(e) => setSelectedProfId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.specialty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Data & Horários */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                    Horário Início *
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                    Horário Término *
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>

              {/* Finalidade / Procedimento */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Finalidade / Procedimento (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pilates em Dupla, RPG, Avaliação..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Ações */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-primary/30 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Reservando...' : 'Confirmar Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Sala */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsRoomModalOpen(false)}
          />

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in border border-gray-100">
            <div className="p-5 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <DoorClosed className="w-5 h-5 text-primary" />
                Cadastrar Sala de Atendimento
              </h3>
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Nome da Sala *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sala 01 - Fisioterapia Geral"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Capacidade (Simultânea) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={roomCapacity}
                  onChange={(e) => setRoomCapacity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Descrição / Equipamentos (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Maca hidráulica, turbilhão, aparelhos de eletroterapia..."
                  value={roomDescription}
                  onChange={(e) => setRoomDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Cor de Identificação */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Cor da Sala no Calendário
                </label>
                <div className="flex items-center gap-2">
                  {['#3b82f6', '#059669', '#0d9488', '#7c3aed', '#d97706', '#e11d48', '#4f46e5', '#0284c7'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setRoomColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${roomColor === c ? 'scale-110 ring-2 ring-offset-2 ring-primary' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Ações */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRoom}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-primary/30 cursor-pointer disabled:opacity-50"
                >
                  {savingRoom ? 'Salvando...' : 'Cadastrar Sala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
