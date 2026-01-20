
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, FileText, Download, DollarSign, Calendar, Search, Plus, X, Save, Building2 } from 'lucide-react';
import { PROFESSIONALS, SESSIONS, UNITS } from '../constants';
import { UnitId, Professional } from '../types';

interface ProfessionalsProps {
    currentUnit: UnitId;
}

const Professionals: React.FC<ProfessionalsProps> = ({ currentUnit }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'list' | 'payroll'>('list');
  // Transformando a constante em estado para permitir "adicionar" na demo
  const [professionalsList, setProfessionalsList] = useState<Professional[]>(PROFESSIONALS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
      name: '',
      crf: '',
      specialty: '',
      hourlyRate: ''
  });

  // Filter professionals that work in the current unit based on the state list
  const unitProfessionals = professionalsList.filter(p => p.unitIds.includes(currentUnit));
  const currentUnitName = UNITS.find(u => u.id === currentUnit)?.name;

  const handleSaveProfessional = (e: React.FormEvent) => {
      e.preventDefault();
      
      const newProfessional: Professional = {
          id: `new-${Date.now()}`,
          name: formData.name,
          crf: formData.crf,
          specialty: formData.specialty,
          hourlyRate: parseFloat(formData.hourlyRate) || 0,
          unitIds: [currentUnit], // <--- AQUI: Vincula automaticamente à unidade atual
          color: '#2563EB' // Default color
      };

      setProfessionalsList([...professionalsList, newProfessional]);
      setIsModalOpen(false);
      setFormData({ name: '', crf: '', specialty: '', hourlyRate: '' }); // Reset form
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe</h1>
          <p className="text-gray-500">Gestão de profissionais e folha de pagamento.</p>
        </div>
        
        {/* Tab Switcher */}
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
            <button 
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Profissionais
            </button>
            <button 
                onClick={() => setActiveTab('payroll')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'payroll' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <DollarSign className="w-4 h-4" />
                Folha de Pagamento
            </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {unitProfessionals.map(prof => (
                <div key={prof.id} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                {prof.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{prof.name}</h3>
                                <p className="text-sm text-gray-500">{prof.specialty}</p>
                            </div>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {prof.crf}
                        </span>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-3 mt-auto">
                        <div className="flex justify-between text-sm mb-2">
                             <span className="text-gray-500">Valor Hora</span>
                             <span className="font-medium text-gray-900">R$ {prof.hourlyRate.toFixed(2)}</span>
                        </div>
                        <button 
                            onClick={() => navigate(`/agenda?professionalId=${prof.id}`)}
                            className="w-full mt-2 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        >
                            Ver Agenda
                        </button>
                    </div>
                </div>
            ))}
            
            {/* Add New Card - Trigger Modal */}
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all group"
            >
                <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <User className="w-6 h-6" />
                </div>
                <span className="font-medium">Cadastrar Profissional</span>
            </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                         <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                         <select className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500">
                             <option>Maio 2024</option>
                             <option>Abril 2024</option>
                         </select>
                    </div>
                </div>
                <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm border border-gray-200 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <Download className="w-4 h-4" />
                    Exportar CSV
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-medium">Profissional</th>
                            <th className="px-6 py-4 font-medium">Sessões Realizadas</th>
                            <th className="px-6 py-4 font-medium">Valor Hora</th>
                            <th className="px-6 py-4 font-medium text-right">Total a Pagar</th>
                            <th className="px-6 py-4 font-medium text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {unitProfessionals.map(prof => {
                             // Mock calculation based on constants
                             const sessionCount = SESSIONS.filter(s => s.professionalId === prof.id && s.unitId === currentUnit && s.status === 'Realizada').length + Math.floor(Math.random() * 20); // Adding random for fullness
                             const total = sessionCount * prof.hourlyRate;
                             
                             return (
                                <tr key={prof.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{prof.name}</td>
                                    <td className="px-6 py-4 text-gray-500">{sessionCount}</td>
                                    <td className="px-6 py-4 text-gray-500">R$ {prof.hourlyRate.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">R$ {total.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            Pendente
                                        </span>
                                    </td>
                                </tr>
                             )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Modal de Cadastro */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
              
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg relative z-10 animate-fade-in flex flex-col">
                  <div className="flex justify-between items-center p-6 border-b border-gray-100">
                      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <User className="w-5 h-5 text-blue-600" />
                          Novo Profissional
                      </h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <form onSubmit={handleSaveProfessional} className="p-6 space-y-4">
                      {/* Aviso de Unidade */}
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3">
                          <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                              <p className="text-sm font-medium text-blue-900">Vinculação Automática</p>
                              <p className="text-xs text-blue-700">Este profissional será cadastrado e habilitado para atender na unidade: <strong>{currentUnitName}</strong>.</p>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nome Completo</label>
                          <input 
                              type="text" 
                              required
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-400"
                              placeholder="Ex: Dra. Maria Souza"
                              value={formData.name}
                              onChange={e => setFormData({...formData, name: e.target.value})}
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">CRF/Registro</label>
                              <input 
                                  type="text" 
                                  required
                                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-400"
                                  placeholder="00000-F"
                                  value={formData.crf}
                                  onChange={e => setFormData({...formData, crf: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Valor Hora (R$)</label>
                              <input 
                                  type="number" 
                                  required
                                  min="0"
                                  step="0.01"
                                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-400"
                                  placeholder="0.00"
                                  value={formData.hourlyRate}
                                  onChange={e => setFormData({...formData, hourlyRate: e.target.value})}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Especialidade Principal</label>
                          <select 
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900"
                              value={formData.specialty}
                              onChange={e => setFormData({...formData, specialty: e.target.value})}
                              required
                          >
                              <option value="">Selecione...</option>
                              <option value="Traumato-Ortopedia">Traumato-Ortopedia</option>
                              <option value="Hidroterapia">Hidroterapia</option>
                              <option value="Pilates">Pilates</option>
                              <option value="Geriátrica">Geriátrica</option>
                              <option value="Neurológica">Neurológica</option>
                          </select>
                      </div>

                      <div className="pt-4 flex justify-end gap-3">
                          <button 
                              type="button" 
                              onClick={() => setIsModalOpen(false)}
                              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                          >
                              Cancelar
                          </button>
                          <button 
                              type="submit"
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                          >
                              <Save className="w-4 h-4" />
                              Salvar Cadastro
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Professionals;
