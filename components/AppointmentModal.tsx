
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Stethoscope, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { PATIENTS, PROFESSIONALS, UNITS } from '../constants';
import { UnitId, Session, SessionStatus, Professional, Patient } from '../types';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (session: Session) => void;
    currentUnit: UnitId;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({ isOpen, onClose, onSave, currentUnit }) => {
    if (!isOpen) return null;

    const unit = UNITS.find(u => u.id === currentUnit);
    const unitProfessionals = PROFESSIONALS.filter(p => p.unitIds.includes(currentUnit));

    // Form State
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState<string>('09:00');
    const [type, setType] = useState<string>('');
    const [notes, setNotes] = useState<string>('');

    // Derived State
    const selectedPatient = PATIENTS.find(p => p.id === selectedPatientId);
    const selectedProfessional = PROFESSIONALS.find(p => p.id === selectedProfessionalId);

    // Auto-fill type based on professional specialty if selected
    useEffect(() => {
        if (selectedProfessional) {
            // Se a especialidade do profissional estiver disponível na unidade, sugere ela
            if (unit?.specialties.includes(selectedProfessional.specialty)) {
                setType(selectedProfessional.specialty);
            }
        }
    }, [selectedProfessional, unit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedPatientId || !selectedProfessionalId || !date || !time || !type) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        const newSession: Session = {
            id: `sess-${Date.now()}`,
            patientId: selectedPatientId,
            professionalId: selectedProfessionalId,
            unitId: currentUnit,
            date: date,
            time: time,
            type: type,
            status: SessionStatus.SCHEDULED,
            notes: notes,
            signed: false
        };

        onSave(newSession);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative z-10 animate-fade-in flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-blue-600" />
                            Novo Agendamento
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Unidade: <span className="font-semibold text-gray-700">{unit?.name}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
                    
                    {/* Seleção de Paciente e Card de Plano */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Paciente</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <select 
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                    value={selectedPatientId}
                                    onChange={(e) => setSelectedPatientId(e.target.value)}
                                    required
                                >
                                    <option value="">Selecione o paciente...</option>
                                    {PATIENTS.filter(p => p.unitId === currentUnit || p.unitId).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedPatient && (
                            <div className={`p-4 rounded-lg border ${selectedPatient.plan.remainingSessions > 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'} flex items-start gap-3 transition-all`}>
                                <FileText className={`w-5 h-5 mt-0.5 ${selectedPatient.plan.remainingSessions > 0 ? 'text-blue-600' : 'text-red-600'}`} />
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className={`font-bold text-sm ${selectedPatient.plan.remainingSessions > 0 ? 'text-blue-900' : 'text-red-900'}`}>
                                            Plano: {selectedPatient.plan.name}
                                        </h4>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedPatient.plan.remainingSessions > 0 ? 'bg-blue-200 text-blue-800' : 'bg-red-200 text-red-800'}`}>
                                            {selectedPatient.plan.remainingSessions} restantes
                                        </span>
                                    </div>
                                    <p className={`text-xs ${selectedPatient.plan.remainingSessions > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                        Vence em: {new Date(selectedPatient.plan.expiresAt).toLocaleDateString('pt-BR')}
                                    </p>
                                    {selectedPatient.plan.remainingSessions === 0 && (
                                        <p className="text-xs font-bold text-red-600 mt-2 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Paciente sem saldo de sessões. Agendamento será avulso ou pendente de renovação.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-100 my-4"></div>

                    {/* Dados do Agendamento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data</label>
                            <input 
                                type="date"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horário</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="time"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Profissional</label>
                            <div className="relative">
                                <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <select 
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                    value={selectedProfessionalId}
                                    onChange={(e) => setSelectedProfessionalId(e.target.value)}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {unitProfessionals.map(prof => (
                                        <option key={prof.id} value={prof.id}>{prof.name} - {prof.specialty}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo de Sessão</label>
                            <select 
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                required
                            >
                                <option value="">Selecione...</option>
                                {unit?.specialties.map(spec => (
                                    <option key={spec} value={spec}>{spec}</option>
                                ))}
                                <option value="Avaliação">Avaliação</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Observações Internas</label>
                        <textarea 
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 h-20 resize-none"
                            placeholder="Ex: Paciente relatou dor lombar..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                        >
                            <CheckCircle className="w-5 h-5" />
                            Confirmar Agendamento
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AppointmentModal;
