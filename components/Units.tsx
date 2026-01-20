
import React, { useState } from 'react';
import { MapPin, Phone, CheckCircle, MoreHorizontal, Edit2, Clock, CalendarDays, X, Plus, Save, Building2 } from 'lucide-react';
import { UNITS } from '../constants';
import { Unit, DaySchedule } from '../types';

const Units: React.FC = () => {
  // Local state to handle updates (mocking database)
  const [units, setUnits] = useState<Unit[]>(UNITS);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // --- Handlers for Editing ---

  const handleEditClick = (unit: Unit) => {
      // Create a deep copy to avoid mutating state directly during edit
      setEditingUnit(JSON.parse(JSON.stringify(unit)));
      setIsEditModalOpen(true);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUnit) return;

      setUnits(prev => prev.map(u => u.id === editingUnit.id ? editingUnit : u));
      setIsEditModalOpen(false);
      setEditingUnit(null);
  };

  const handleUpdateHour = (day: string, field: 'start' | 'end' | 'isOpen', value: any) => {
      if (!editingUnit) return;
      const newHours = editingUnit.operatingHours?.map(h => {
          if (h.day !== day) return h;
          return { ...h, [field]: value };
      });
      setEditingUnit({ ...editingUnit, operatingHours: newHours });
  };

  const handleAddHoliday = () => {
      if (!editingUnit) return;
      const name = prompt("Nome do feriado:");
      const date = prompt("Data (YYYY-MM-DD):");
      if (name && date) {
          const newHolidays = [...(editingUnit.holidays || []), { id: `h_${Date.now()}`, date, name }];
          setEditingUnit({ ...editingUnit, holidays: newHolidays });
      }
  };

  const removeHoliday = (holidayId: string) => {
      if (!editingUnit) return;
      setEditingUnit({
          ...editingUnit,
          holidays: editingUnit.holidays?.filter(h => h.id !== holidayId)
      });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unidades</h1>
          <p className="text-gray-500">Gerencie as filiais, horários de funcionamento e especialidades.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Unidade
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {units.map(unit => (
          <div key={unit.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 relative overflow-hidden group">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{unit.name}</h3>
                  <p className="text-gray-500 text-sm">{unit.city}</p>
                </div>
              </div>
              <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${unit.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {unit.isActive ? 'Ativa' : 'Inativa'}
              </div>
            </div>

            {/* Specialties */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Especialidades Habilitadas</h4>
              <div className="flex flex-wrap gap-2">
                {unit.specialties.map(spec => (
                  <span key={spec} className="bg-gray-50 text-gray-700 px-2 py-1 rounded-md text-sm border border-gray-200">
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="border-t border-gray-100 pt-4 flex gap-4 text-sm text-gray-600">
                {unit.hasPool && (
                    <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                        <CheckCircle className="w-4 h-4" />
                        <span>Piscina (Hidro)</span>
                    </div>
                )}
                <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4" />
                    <span>(48) 3333-0000</span>
                </div>
            </div>

            {/* Actions */}
            <div className="absolute top-4 right-4 flex gap-2">
               <button 
                onClick={() => handleEditClick(unit)}
                className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all"
                title="Editar Unidade e Horários"
               >
                 <Edit2 className="w-4 h-4" />
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- EDIT UNIT MODAL --- */}
      {isEditModalOpen && editingUnit && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)} />
              
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl relative z-10 animate-fade-in flex flex-col max-h-[90vh] overflow-hidden">
                  <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                      <div>
                          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                              <Building2 className="w-6 h-6 text-blue-600" />
                              Editar Unidade
                          </h2>
                          <p className="text-sm text-gray-500 mt-1">Configure detalhes, horários de funcionamento e feriados.</p>
                      </div>
                      <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-all">
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  <form onSubmit={handleSaveUnit} className="overflow-y-auto p-6 space-y-8">
                      
                      {/* Section 1: Basic Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome da Unidade</label>
                              <input 
                                  type="text" 
                                  required
                                  value={editingUnit.name}
                                  onChange={e => setEditingUnit({...editingUnit, name: e.target.value})}
                                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cidade</label>
                              <input 
                                  type="text" 
                                  required
                                  value={editingUnit.city}
                                  onChange={e => setEditingUnit({...editingUnit, city: e.target.value})}
                                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                              />
                          </div>
                           <div className="md:col-span-2 flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={editingUnit.hasPool}
                                        onChange={e => setEditingUnit({...editingUnit, hasPool: e.target.checked})}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Possui Piscina (Hidroterapia)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={editingUnit.isActive}
                                        onChange={e => setEditingUnit({...editingUnit, isActive: e.target.checked})}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Unidade Ativa</span>
                                </label>
                           </div>
                      </div>

                      <div className="border-t border-gray-100 pt-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
                          {/* Section 2: Operating Hours */}
                          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                  <Clock className="w-5 h-5 text-blue-600" />
                                  Horário de Funcionamento
                              </h3>
                              <div className="space-y-3">
                                  {editingUnit.operatingHours?.map(schedule => (
                                      <div key={schedule.day} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                                          <div className="flex items-center gap-3 w-32">
                                              <input 
                                                type="checkbox" 
                                                checked={schedule.isOpen}
                                                onChange={(e) => handleUpdateHour(schedule.day, 'isOpen', e.target.checked)}
                                                className="w-4 h-4 text-blue-600 rounded"
                                              />
                                              <span className="text-sm font-medium capitalize text-gray-700">{
                                                schedule.day === 'monday' ? 'Segunda' :
                                                schedule.day === 'tuesday' ? 'Terça' :
                                                schedule.day === 'wednesday' ? 'Quarta' :
                                                schedule.day === 'thursday' ? 'Quinta' :
                                                schedule.day === 'friday' ? 'Sexta' :
                                                schedule.day === 'saturday' ? 'Sábado' : 'Domingo'
                                              }</span>
                                          </div>
                                          
                                          <div className={`flex items-center gap-2 ${!schedule.isOpen ? 'opacity-40 pointer-events-none' : ''}`}>
                                              <input 
                                                type="time" 
                                                value={schedule.start}
                                                onChange={(e) => handleUpdateHour(schedule.day, 'start', e.target.value)}
                                                className="px-2 py-1 border border-gray-200 rounded text-sm bg-white text-gray-900"
                                              />
                                              <span className="text-gray-400">-</span>
                                              <input 
                                                type="time" 
                                                value={schedule.end}
                                                onChange={(e) => handleUpdateHour(schedule.day, 'end', e.target.value)}
                                                className="px-2 py-1 border border-gray-200 rounded text-sm bg-white text-gray-900"
                                              />
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          {/* Section 3: Holidays */}
                          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 h-fit">
                              <div className="flex justify-between items-center mb-4">
                                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                      <CalendarDays className="w-5 h-5 text-red-500" />
                                      Feriados e Bloqueios
                                  </h3>
                                  <button type="button" onClick={handleAddHoliday} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-100 font-medium text-gray-700">
                                      + Adicionar
                                  </button>
                              </div>
                              
                              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                  {editingUnit.holidays?.length === 0 && (
                                      <p className="text-sm text-gray-400 italic text-center py-4">Nenhum feriado cadastrado.</p>
                                  )}
                                  {editingUnit.holidays?.map(h => (
                                      <div key={h.id} className="flex justify-between items-center bg-white p-3 rounded border border-gray-200 shadow-sm">
                                          <div>
                                              <p className="font-medium text-gray-900 text-sm">{h.name}</p>
                                              <p className="text-xs text-gray-500">{new Date(h.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                                          </div>
                                          <button type="button" onClick={() => removeHoliday(h.id)} className="text-gray-400 hover:text-red-600">
                                              <X className="w-4 h-4" />
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>

                      <div className="pt-6 flex justify-end gap-3 border-t border-gray-100 sticky bottom-0 bg-white">
                          <button 
                              type="button" 
                              onClick={() => setIsEditModalOpen(false)}
                              className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                          >
                              Cancelar
                          </button>
                          <button 
                              type="submit"
                              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                          >
                              <Save className="w-5 h-5" />
                              Salvar Alterações
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Units;
