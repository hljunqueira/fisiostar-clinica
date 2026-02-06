
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Stethoscope, AlertCircle, CheckCircle, FileText, Trash2 } from 'lucide-react';
import { UnitId, Session, SessionStatus, Professional, Patient, Unit } from '../types';
import { patientsApi, professionalsApi, unitsApi } from '../src/services/api';
import toast from 'react-hot-toast';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (session: Session) => void;
    onDelete?: (sessionId: string) => void;
    currentUnit: UnitId;
    editingSession?: Session | null; // Session to edit (null/undefined = create mode)
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({ isOpen, onClose, onSave, onDelete, currentUnit, editingSession }) => {
    if (!isOpen) return null;

    const isEditMode = !!editingSession;

    // State for loaded data
    const [patients, setPatients] = useState<Patient[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [unit, setUnit] = useState<Unit | null>(null);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedPatientId, setSelectedPatientId] = useState<string>(editingSession?.patientId || '');
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(editingSession?.professionalId || '');
    const [date, setDate] = useState<string>(editingSession?.date || new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState<string>(editingSession?.time || '09:00');
    const [type, setType] = useState<string>(editingSession?.type || '');
    const [notes, setNotes] = useState<string>(editingSession?.notes || '');
    const [status, setStatus] = useState<SessionStatus>(editingSession?.status || SessionStatus.SCHEDULED);

    // Load data when modal opens
    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const [patientsData, professionalsData, unitData] = await Promise.all([
                    patientsApi.getAll(),
                    professionalsApi.getAll(),
                    unitsApi.getById(currentUnit)
                ]);
                setPatients(patientsData); // Pacientes são globais, podem ser agendados em qualquer unidade
                setProfessionals(professionalsData.filter(p => p.unitIds.includes(currentUnit)));
                setUnit(unitData);
            } catch (error) {
                console.error('Error loading data:', error);
                toast.error('Erro ao carregar dados');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [currentUnit]);

    // Derived State
    const selectedPatient = patients.find(p => p.id === selectedPatientId);
    const selectedProfessional = professionals.find(p => p.id === selectedProfessionalId);

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
            toast.error('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const sessionData: Session = {
            id: editingSession?.id || `sess-${Date.now()}`,
            patientId: selectedPatientId,
            professionalId: selectedProfessionalId,
            unitId: currentUnit,
            date: date,
            time: time,
            type: type,
            status: status,
            notes: notes,
            signed: editingSession?.signed || false
        };

        onSave(sessionData);
        onClose();
    };

    const handleDelete = () => {
        if (editingSession && onDelete) {
            if (confirm('Tem certeza que deseja excluir este agendamento?')) {
                onDelete(editingSession.id);
                onClose();
            }
        }
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
                            {isEditMode ? 'Editar Agendamento' : 'Novo Agendamento'}
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
                                    {patients.filter(p => p.unitId === currentUnit || p.unitId).map(p => (
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
                                    {professionals.map(prof => (
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

                    {/* Status (only in edit mode) */}
                    {isEditMode && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status do Agendamento</label>
                            <select
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as SessionStatus)}
                            >
                                <option value={SessionStatus.SCHEDULED}>Agendado</option>
                                <option value={SessionStatus.CONFIRMED}>Confirmado</option>
                                <option value={SessionStatus.COMPLETED}>Realizado</option>
                                <option value={SessionStatus.NOSHOW}>Faltou</option>
                                <option value={SessionStatus.CANCELED}>Cancelado</option>
                            </select>
                        </div>
                    )}

                    <div className="pt-4 flex justify-between gap-3 border-t border-gray-100">
                        <div>
                            {isEditMode && onDelete && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Excluir
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
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
                                {isEditMode ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AppointmentModal;
