import React, { useState, useEffect } from 'react';
import { Room, Unit } from '../../types';
import { roomsApi } from '../../src/services/rooms-api';
import { unitsApi } from '../../src/services/api';
import { DoorClosed, Plus, Edit2, Trash2, Check, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const RoomsSettingsTab: React.FC = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [color, setColor] = useState('#3b82f6');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUnits();
  }, []);

  useEffect(() => {
    if (selectedUnitId) {
      loadRooms(selectedUnitId);
    }
  }, [selectedUnitId]);

  const loadUnits = async () => {
    try {
      setLoading(true);
      const unitsData = await unitsApi.getAll();
      setUnits(unitsData);
      if (unitsData.length > 0) {
        setSelectedUnitId(unitsData[0].id);
      }
    } catch (e) {
      console.error('Error loading units:', e);
      toast.error('Erro ao carregar unidades');
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async (unitId: string) => {
    try {
      const data = await roomsApi.getAll(unitId);
      setRooms(data);
    } catch (e) {
      console.error('Error loading rooms:', e);
    }
  };

  const openNewRoom = () => {
    setEditingRoom(null);
    setName('');
    setDescription('');
    setCapacity(1);
    setColor('#3b82f6');
    setIsModalOpen(true);
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setName(room.name);
    setDescription(room.description || '');
    setCapacity(room.capacity || 1);
    setColor(room.color || '#3b82f6');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome da sala');
      return;
    }

    try {
      setSubmitting(true);
      if (editingRoom) {
        await roomsApi.updateRoom(editingRoom.id, {
          name: name.trim(),
          description: description.trim(),
          capacity,
          color
        });
        toast.success('Sala atualizada com sucesso!');
      } else {
        await roomsApi.createRoom({
          unitId: selectedUnitId,
          name: name.trim(),
          description: description.trim(),
          capacity,
          color,
          active: true
        });
        toast.success('Sala criada com sucesso!');
      }
      setIsModalOpen(false);
      loadRooms(selectedUnitId);
    } catch (error: any) {
      console.error('Error saving room:', error);
      toast.error(error.message || 'Erro ao salvar sala');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta sala?')) return;
    try {
      await roomsApi.deleteRoom(id);
      toast.success('Sala excluída com sucesso');
      loadRooms(selectedUnitId);
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error('Erro ao excluir sala');
    }
  };

  const PRESET_COLORS = [
    '#3b82f6', // Azul
    '#059669', // Esmeralda
    '#0d9488', // Teal
    '#7c3aed', // Roxo
    '#d97706', // Âmbar
    '#e11d48', // Vermelho
    '#4f46e5', // Índigo
    '#0284c7'  // Ciano
  ];

  return (
    <div className="space-y-6">
      {/* Header & Unit Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <DoorClosed className="w-5 h-5 text-primary" />
            Configuração de Salas de Atendimento
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Cadastre os consultórios, estúdios de pilates e salas para reserva física
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <button
            onClick={openNewRoom}
            className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Sala</span>
          </button>
        </div>
      </div>

      {/* Lista de Salas */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Carregando salas...</div>
      ) : rooms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <DoorClosed className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-700">Nenhuma sala cadastrada nesta unidade</p>
          <p className="text-xs text-gray-400 mt-1">Clique no botão "Nova Sala" acima para criar a primeira.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: room.color || '#3b82f6' }}
                    />
                    <h4 className="font-bold text-gray-900 text-sm truncate">{room.name}</h4>
                  </div>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold">
                    Capacidade: {room.capacity}
                  </span>
                </div>
                {room.description && (
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {room.description}
                  </p>
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-end gap-1">
                <button
                  onClick={() => openEditRoom(room)}
                  className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  title="Editar sala"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(room.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  title="Excluir sala"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova / Editar Sala */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in border border-gray-100">
            <div className="p-5 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <DoorClosed className="w-5 h-5 text-primary" />
                {editingRoom ? 'Editar Sala' : 'Nova Sala de Atendimento'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Nome da Sala *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sala 01 - Pilates Studio"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Descrição / Equipamentos (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 2 Reformers, 1 Cadillac, Maca de RPG..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Cor de Identificação */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Cor da Sala no Calendário
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${color === c ? 'scale-110 ring-2 ring-offset-2 ring-primary' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
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
                  {submitting ? 'Salvando...' : 'Salvar Sala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
