
import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, MoreHorizontal, UserPlus, FileText, X, Camera, FileSignature, CheckCircle, Clock, UploadCloud, User, Printer, Check, Phone as PhoneIcon, CreditCard, Save, MapPin, Calendar as CalendarIcon, Hash, Edit2, Trash2, XCircle, DollarSign } from 'lucide-react';


import { UnitId, Patient, SessionStatus, PlanTemplate, Professional, Session, Unit } from '../types';
import { patientsApi, planTemplatesApi, professionalsApi, sessionsApi, unitsApi } from '../src/services/api';
import { maskPhone, maskCpf, validateCpf } from '../src/utils/masks';
import { storageApi } from '../src/services/storage-api';
import { revenuesApi } from '../src/services/financial-api';
import toast from 'react-hot-toast';
import SignatureModal from './SignatureModal';
import { useAuth } from '../src/contexts/AuthContext';

// ... (omitted)

// ScheduleSessionModal
const ScheduleSessionModal = ({ onClose, onSave, patient, professionals, units, currentUnit }: {
    onClose: () => void,
    onSave: (session: any) => void,
    patient: Patient,
    professionals: Professional[],
    units: Unit[],
    currentUnit: UnitId
}) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('08:00');
    const [professionalId, setProfessionalId] = useState('');
    const [type, setType] = useState('Fisioterapia');
    const [unitId, setUnitId] = useState(currentUnit === 'ALL' ? (patient.unitId || units[0]?.id) : currentUnit);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            date,
            time,
            professionalId,
            type,
            unitId,
            patientId: patient.id,
            status: 'scheduled'
        });
    };

    const availableProfessionals = professionals.filter(p => p.unitIds.includes(unitId));

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative z-10 animate-fade-in p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Agendar Sessão</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {currentUnit === 'ALL' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                            <select
                                value={unitId}
                                onChange={e => setUnitId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            >
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                            <input
                                type="time"
                                required
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Profissional</label>
                        <select
                            required
                            value={professionalId}
                            onChange={e => setProfessionalId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Selecione...</option>
                            {availableProfessionals.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo / Procedimento</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="Fisioterapia">Fisioterapia</option>
                            <option value="Pilates">Pilates</option>
                            <option value="Avaliação">Avaliação</option>
                            <option value="Hidroterapia">Hidroterapia</option>
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg">
                            Cancelar
                        </button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Confirmar Agendamento
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// CreatePatientModal
const CreatePatientModal = ({ onClose, onSave, currentUnit, planTemplates, initialData, allUnits }: { onClose: () => void, onSave: (p: Patient) => void, currentUnit: UnitId, planTemplates: PlanTemplate[], initialData?: Patient | null, allUnits: Unit[] }) => {
    // Basic Info
    const [name, setName] = useState(initialData?.name || '');
    const [cpf, setCpf] = useState(initialData?.cpf || '');
    const [birthDate, setBirthDate] = useState(initialData?.birthDate || '');
    const [selectedUnitId, setSelectedUnitId] = useState(initialData?.unitId || (currentUnit === 'ALL' ? allUnits[0]?.id : currentUnit));
    const [unitName, setUnitName] = useState('');

    useEffect(() => {
        if (currentUnit === 'ALL') {
            const u = allUnits.find(u => u.id === selectedUnitId);
            setUnitName(u?.name || 'Selecione');
        } else {
            unitsApi.getById(currentUnit).then(u => setUnitName(u.name)).catch(() => setUnitName('Unidade Desconhecida'));
        }
    }, [currentUnit, selectedUnitId, allUnits]);

    // Contact & Address
    const [phone, setPhone] = useState(initialData?.phone || '');
    const [city, setCity] = useState(initialData?.city || '');
    const [address, setAddress] = useState(initialData?.address || '');

    // Treatment - find matching plan template by name if editing, roughly
    const [selectedPlanId, setSelectedPlanId] = useState(() => {
        if (initialData?.plan) {
            if (initialData.plan.name === 'Particular / Avulso') return 'avulso';
            const match = planTemplates.find(p => p.name === initialData.plan.name);
            return match?.id || '';
        }
        return '';
    });

    const activePlans = planTemplates.filter(p => p.active);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const isAvulso = selectedPlanId === 'avulso';
        const planTemplate = planTemplates.find(p => p.id === selectedPlanId);

        if (!name) return;
        if (!planTemplate && !isAvulso) return;

        let planData = initialData?.plan;

        if (isAvulso) {
            planData = {
                name: 'Particular / Avulso',
                totalSessions: 0,
                remainingSessions: 0,
                expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 10)).toISOString() // Long expiry
            };
        } else if (planTemplate) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            if (initialData?.plan && initialData.plan.name === planTemplate.name) {
                planData = initialData.plan;
            } else {
                planData = {
                    name: planTemplate.name,
                    totalSessions: planTemplate.sessions,
                    remainingSessions: planTemplate.sessions,
                    expiresAt: expiresAt.toISOString()
                };
            }
        }

        const patientData: Patient = {
            id: initialData?.id || `p-${Date.now()}`,
            name,
            phone: phone || '(00) 00000-0000',
            cpf,
            birthDate,
            address,
            city,

            unitId: selectedUnitId || (currentUnit === 'ALL' ? allUnits[0].id : currentUnit),
            status: initialData?.status || 'Active',
            plan: planData!,
            lastVisit: initialData?.lastVisit,
            photoUrl: initialData?.photoUrl
        };

        onSave(patientData);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl relative z-10 animate-fade-in flex flex-col max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <UserPlus className="w-6 h-6 text-blue-600" />
                            {initialData ? 'Editar Paciente' : 'Novo Prontuário'}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Unidade: <span className="font-semibold">{unitName}</span></p>
                    </div>
                    {currentUnit === 'ALL' && (
                        <div className="mb-4">
                            <select
                                value={selectedUnitId}
                                onChange={e => setSelectedUnitId(e.target.value)}
                                className="px-3 py-1 border border-gray-200 rounded-lg text-sm"
                            >
                                {allUnits.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Section 1: Dados Pessoais */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            Dados Pessoais
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                    placeholder="Ex: João da Silva"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">CPF</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        maxLength={14}
                                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 placeholder:text-gray-400 ${cpf && !validateCpf(cpf) ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'}`}
                                        placeholder="000.000.000-00"
                                        value={cpf}
                                        onChange={e => setCpf(maskCpf(e.target.value))}
                                    />
                                    {cpf && !validateCpf(cpf) && (
                                        <span className="text-xs text-red-500 absolute -bottom-4 left-0">CPF inválido</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data de Nascimento</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                        value={birthDate}
                                        onChange={e => setBirthDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Contato e Endereço */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            Contato e Endereço
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefone</label>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        maxLength={15}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                        placeholder="(00) 90000-0000"
                                        value={phone}
                                        onChange={e => setPhone(maskPhone(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cidade</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                    placeholder="Ex: Araranguá"
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Endereço Completo</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                    placeholder="Rua, Número, Bairro"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Plano */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            Plano de Tratamento
                        </h3>

                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Plano ou Modalidade</label>
                                <div className="relative">
                                    <select
                                        value={selectedPlanId}
                                        onChange={e => setSelectedPlanId(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white font-medium text-gray-700"
                                        required
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="avulso" className="font-bold text-blue-700">✨ Atendimento Avulso / Particular</option>
                                        <optgroup label="Planos Disponíveis">
                                            {activePlans.map(plan => (
                                                <option key={plan.id} value={plan.id}>{plan.name} - {plan.sessions} sessões</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    <div className="absolute left-3 top-3 text-gray-400 pointer-events-none">
                                        <Hash className="w-4 h-4" />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Selecione "Avulso" para pacientes que pagam por sessão ou não possuem pacote fechado.
                                </p>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 pt-0 flex justify-end gap-3 bg-white sticky bottom-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Salvar Prontuário
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Sub-component: Patient Detail Modal ---

const PatientDetailModal = ({ patient, onClose, currentUnit, professionals, units }: { patient: Patient, onClose: () => void, currentUnit: UnitId, professionals: Professional[], units: Unit[] }) => {
    const [unitName, setUnitName] = useState('');
    const { systemUser } = useAuth();
    useEffect(() => {
        if (currentUnit === 'ALL') {
            setUnitName(`Todas (Paciente: ${units.find(u => u.id === patient.unitId)?.name || 'N/A'})`);
        } else {
            unitsApi.getById(currentUnit).then(u => setUnitName(u.name)).catch(() => setUnitName('FisioStar'));
        }
    }, [currentUnit, patient.unitId, units]);

    const [activeTab, setActiveTab] = useState<'info' | 'signatures' | 'financial'>('signatures');
    // ... items ...
    const [isScheduling, setIsScheduling] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [newProfessionalId, setNewProfessionalId] = useState('');

    // ... continue ...
    const [currentPhoto, setCurrentPhoto] = useState(patient.photoUrl);
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [patientHistory, setPatientHistory] = useState<Session[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        async function loadHistory() {
            try {
                setLoadingHistory(true);
                const sessions = await sessionsApi.getAll({ patientId: patient.id });
                setPatientHistory(sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } catch (error) {
                console.error("Error loading patient history", error);
            } finally {
                setLoadingHistory(false);
            }
        }
        loadHistory();
    }, [patient.id]);

    const handleStartCamera = async () => {
        setShowCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro ao acessar câmera. Verifique se você deu permissão.');
            setShowCamera(false);
        }
    };

    const handleStopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        setShowCamera(false);
    };

    const handleCapture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg');

                // Upload photo
                (async () => {
                    try {
                        const fileName = `patient-${patient.id}-${Date.now()}.jpg`;
                        const publicUrl = await storageApi.uploadBase64('patient-photos', fileName, dataUrl);
                        await patientsApi.update(patient.id, { photoUrl: publicUrl });
                        setCurrentPhoto(publicUrl);
                        toast.success('Foto capturada e salva!');
                    } catch (error) {
                        console.error('Error uploading photo:', error);
                        toast.error('Erro ao salvar foto');
                    }
                })();

                handleStopCamera();
            }
        }
    };

    // Signature modal state
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [sessionToSign, setSessionToSign] = useState<string | null>(null);
    const [showPaymentSignatureModal, setShowPaymentSignatureModal] = useState(false);

    const handleOpenSignatureModal = (sessionId: string) => {
        setSessionToSign(sessionId);
        setShowSignatureModal(true);
    };

    const handleConfirmSignature = async (imageData: string, type: 'signature' | 'photo') => {
        if (!sessionToSign) return;
        try {
            const session = patientHistory.find(s => s.id === sessionToSign);
            const fileName = `session-${sessionToSign}-${type}-${Date.now()}.png`;
            const publicUrl = await storageApi.uploadBase64('signatures', fileName, imageData);

            await sessionsApi.update(sessionToSign, {
                signed: true,
                signatureUrl: publicUrl
            });

            // Automatically create revenue if it's an outside plan session
            if (session?.isOutsidePlan && session.price) {
                try {
                    await revenuesApi.create({
                        unitId: currentUnit,
                        patientId: patient.id,
                        category: 'session',
                        description: `Sessão Avulsa - ${session.type} - ${patient.name}`,
                        amount: session.price,
                        revenueDate: new Date().toISOString().split('T')[0],
                        createdBy: systemUser?.id
                    });
                    toast.success('Financeiro atualizado com sucesso!');
                } catch (err) {
                    console.error('Error creating revenue:', err);
                    toast.error('Erro ao gerar lançamento financeiro');
                }
            }

            setPatientHistory(prev => prev.map(s =>
                s.id === sessionToSign ? { ...s, signed: true, signatureUrl: publicUrl } : s
            ));
            toast.success(`Assinatura confirmada via ${type === 'signature' ? 'desenho' : 'foto'}!`);
            setShowSignatureModal(false);
            setSessionToSign(null);
        } catch (error) {
            console.error('Error confirming signature:', error);
            toast.error('Erro ao confirmar assinatura');
        }
    }

    const handleScheduleSession = async (sessionData: any) => {
        try {
            const newSession = await sessionsApi.create(sessionData);
            setPatientHistory(prev => [newSession, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            toast.success('Sessão agendada com sucesso!');
            setIsScheduling(false);
        } catch (error) {
            console.error('Error scheduling session:', error);
            toast.error('Erro ao agendar sessão');
        }
    };

    const handleUpdateProfessional = async (sessionId: string, professionalId: string) => {
        try {
            await sessionsApi.update(sessionId, { professionalId });
            setPatientHistory(prev => prev.map(s => s.id === sessionId ? { ...s, professionalId } : s));
            toast.success('Profissional da sessão atualizado!');
            setEditingSessionId(null);
        } catch (error) {
            console.error('Error updating professional:', error);
            toast.error('Erro ao atualizar profissional');
        }
    };

    const handleConfirmPayment = async (imageData: string, type: 'signature' | 'photo') => {
        // In the future, this would save to patient_plans payment fields
        toast.success(`Pagamento confirmado via ${type === 'signature' ? 'assinatura' : 'foto'}!`);
        setShowPaymentSignatureModal(false);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=900,height=700');

        if (!printWindow) {
            toast.error('O bloqueador de pop-ups impediu a impressão. Por favor, permita pop-ups para este site.');
            return;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Ficha de Controle - ${patient.name}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                    body { font-family: 'Inter', sans-serif; color: #111; padding: 40px; max-width: 210mm; margin: 0 auto; background: white; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #111; padding-bottom: 20px; }
                    .brand { font-size: 26px; font-weight: 800; color: #2563EB; letter-spacing: -0.5px; }
                    .unit-details { text-align: right; font-size: 12px; color: #444; line-height: 1.5; }
                    
                    .section-header { font-size: 14px; text-transform: uppercase; font-weight: 700; color: #000; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; }
                    
                    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; font-size: 14px; }
                    .info-item label { font-size: 11px; text-transform: uppercase; color: #666; font-weight: 600; display: block; margin-bottom: 3px; }
                    .info-item span { font-weight: 500; font-size: 15px; color: #000; }
                    
                    .sessions-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
                    .sessions-table th { text-align: left; border-bottom: 2px solid #000; padding: 10px 5px; font-weight: 700; font-size: 12px; text-transform: uppercase; }
                    .sessions-table td { border-bottom: 1px solid #ddd; padding: 12px 5px; vertical-align: middle; }
                    .signature-box { border-bottom: 1px solid #000; height: 30px; width: 100%; }
                    
                    .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 15px; }
                    
                    @media print {
                        @page { size: A4; margin: 15mm; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="brand">FisioStar</div>
                    <div class="unit-details">
                        <strong>${unitName}</strong><br/>
                        Ficha de Controle de Sessões<br/>
                        Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
                    </div>
                </div>

                <div class="section-header">Dados do Paciente</div>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Nome Completo</label>
                        <span>${patient.name}</span>
                    </div>
                    <div class="info-item">
                        <label>Telefone</label>
                        <span>${patient.phone}</span>
                    </div>
                    <div class="info-item">
                        <label>CPF</label>
                        <span>${patient.cpf || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Plano Contratado</label>
                        <span>${patient.plan?.name || 'N/A'}</span>
                    </div>
                     <div class="info-item">
                        <label>Status do Plano</label>
                        <span>${patient.plan ? `${patient.plan.remainingSessions} sessões restantes de ${patient.plan.totalSessions}` : 'Sem plano ativo'}</span>
                    </div>
                </div>

                <div class="section-header">Registro de Presença</div>
                <table class="sessions-table">
                    <thead>
                        <tr>
                            <th width="15%">Data</th>
                            <th width="10%">Hora</th>
                            <th width="25%">Procedimento</th>
                            <th width="20%">Profissional</th>
                            <th width="30%">Assinatura do Paciente</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${patientHistory.map(session => {
            const prof = professionals.find(p => p.id === session.professionalId);
            return `
                                <tr>
                                    <td>${new Date(session.date).toLocaleDateString('pt-BR')}</td>
                                    <td>${session.time}</td>
                                    <td>${session.type}</td>
                                    <td>${prof?.name || '-'}</td>
                                    <td>
                                        ${session.signatureUrl ?
                    `<img src="${session.signatureUrl}" style="max-height: 25px; max-width: 100px;" alt="Assinado" />` :
                    `<div class="signature-box"></div>`
                }
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    Declaro que recebi os atendimentos descritos acima nas datas indicadas.
                    <br/>FisioStar - Documento Interno
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col md:flex-row animate-fade-in">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white rounded-full text-gray-500 hover:text-gray-900 z-20">
                    <X className="w-5 h-5" />
                </button>

                {/* Left Sidebar: Photo & Key Info */}
                <div className="w-full md:w-72 bg-gray-50 border-r border-gray-200 p-6 flex flex-col items-center flex-shrink-0">
                    <div className="relative group mb-4">
                        <div className="w-32 h-32 rounded-full overflow-hidden shadow-md border-4 border-white relative bg-white">
                            {currentPhoto ? (
                                <img src={currentPhoto} alt={patient.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-4xl">
                                    {patient.name.charAt(0)}
                                </div>
                            )}

                            {/* File Upload Overlay */}
                            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                <UploadCloud className="w-8 h-8 text-white" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        try {
                                            const publicUrl = await storageApi.uploadFile('patient-photos', `patient-${patient.id}-${Date.now()}`, file);
                                            await patientsApi.update(patient.id, { photoUrl: publicUrl });
                                            setCurrentPhoto(publicUrl);
                                            toast.success('Foto atualizada!');
                                        } catch (err) {
                                            console.error(err);
                                            toast.error('Erro ao enviar foto');
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        <button
                            onClick={handleStartCamera}
                            className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full hover:bg-primary-hover shadow-lg transition-transform hover:scale-105 z-10"
                            title="Tirar foto com câmera"
                        >
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>

                    <h2 className="text-xl font-bold text-center text-gray-900">{patient.name}</h2>
                    <span className="text-sm text-gray-500 mb-6">{patient.phone}</span>

                    <div className="w-full border-t border-gray-200 pt-4 mt-auto hidden md:block">
                        <p className="text-xs text-center text-gray-400">Cadastrado em {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>

                {/* Right Content: Tabs */}
                <div className="flex-1 flex flex-col min-h-0 bg-white">
                    <div className="border-b border-gray-200">
                        <nav className="flex px-6" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('signatures')}
                                className={`py-4 px-4 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'signatures' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <FileSignature className="w-4 h-4" />
                                Histórico & Assinaturas
                            </button>
                            <button
                                onClick={() => setActiveTab('financial')}
                                className={`py-4 px-4 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'financial' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <CreditCard className="w-4 h-4" />
                                Financeiro & Plano
                            </button>
                            <button
                                onClick={() => setActiveTab('info')}
                                className={`py-4 px-4 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <User className="w-4 h-4" />
                                Dados Pessoais
                            </button>
                        </nav>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                        {activeTab === 'signatures' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <div>
                                        <h3 className="font-bold text-gray-900">Ficha de Presença</h3>
                                        <p className="text-sm text-gray-600">Imprima a ficha para controle físico de assinaturas.</p>
                                    </div>
                                    <button
                                        onClick={handlePrint}
                                        className="bg-gray-50 border border-gray-200 text-gray-700 hover:bg-white hover:border-blue-300 hover:text-blue-600 px-4 py-2 rounded-lg font-medium transition-all text-sm flex items-center gap-2"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Imprimir
                                    </button>
                                </div>

                                {isScheduling && (
                                    <ScheduleSessionModal
                                        onClose={() => setIsScheduling(false)}
                                        onSave={handleScheduleSession}
                                        patient={patient}
                                        professionals={professionals}
                                        units={units}
                                        currentUnit={currentUnit}
                                    />
                                )}

                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-primary" />
                                        Histórico de Atendimentos
                                    </h3>
                                    <button
                                        onClick={() => setIsScheduling(true)}
                                        className="text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
                                    >
                                        <CalendarIcon className="w-4 h-4" />
                                        Agendar Sessão
                                    </button>
                                </div>


                                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                    {patientHistory.length > 0 ? (
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                                <tr>
                                                    <th className="px-5 py-3">Data/Hora</th>
                                                    <th className="px-5 py-3">Procedimento</th>
                                                    <th className="px-5 py-3">Profissional</th>
                                                    <th className="px-5 py-3 text-center">Status</th>
                                                    <th className="px-5 py-3 text-right">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {patientHistory.map(session => {
                                                    const prof = professionals.find(p => p.id === session.professionalId);
                                                    return (
                                                        <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-5 py-3 font-medium text-gray-900">
                                                                {new Date(session.date).toLocaleDateString('pt-BR')} <span className="text-gray-400 font-normal ml-1">{session.time}</span>
                                                            </td>

                                                            <td className="px-5 py-3 text-gray-600">{session.type}</td>
                                                            <td className="px-5 py-3 text-gray-600">
                                                                {editingSessionId === session.id ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <select
                                                                            className="text-xs border rounded p-1"
                                                                            value={newProfessionalId}
                                                                            onChange={(e) => setNewProfessionalId(e.target.value)}
                                                                        >
                                                                            <option value="">Selecione...</option>
                                                                            {professionals.map(p => (
                                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                                            ))}
                                                                        </select>
                                                                        <button onClick={() => handleUpdateProfessional(session.id, newProfessionalId)} className="text-green-600 hover:text-green-800"><Check className="w-3 h-3" /></button>
                                                                        <button onClick={() => setEditingSessionId(null)} className="text-red-600 hover:text-red-800"><X className="w-3 h-3" /></button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 group/prof">
                                                                        <span>{prof?.name || '-'}</span>
                                                                        <button
                                                                            onClick={() => { setEditingSessionId(session.id); setNewProfessionalId(session.professionalId); }}
                                                                            className="opacity-0 group-hover/prof:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity"
                                                                            title="Trocar Profissional"
                                                                        >
                                                                            <Edit2 className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-3 text-center">
                                                                {session.signed ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                                                                        <CheckCircle className="w-3 h-3" /> Assinado
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-medium border border-orange-100">
                                                                        <Clock className="w-3 h-3" /> Pendente
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-3 text-right">
                                                                {!session.signed && (
                                                                    <button
                                                                        onClick={() => handleOpenSignatureModal(session.id)}
                                                                        className="text-primary hover:text-primary-hover font-medium text-xs border border-primary/20 hover:border-primary/50 hover:bg-primary/5 px-3 py-1.5 rounded transition-all flex items-center gap-1 ml-auto"
                                                                        title="Assinar digitalmente"
                                                                    >
                                                                        <Check className="w-3 h-3" />
                                                                        Assinar
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-10 text-center text-gray-400 flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                                <CalendarIcon className="w-6 h-6 text-gray-300" />
                                            </div>
                                            Nenhuma sessão registrada neste histórico.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'financial' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Plan Details Card */}
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 relative z-10">Plano Atual</h3>
                                        <div className="relative z-10">
                                            <p className="text-2xl font-bold text-gray-900 mb-1">{patient.plan?.name || 'Nenhum plano ativo'}</p>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${patient.plan?.remainingSessions > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {patient.plan ? (patient.plan.remainingSessions > 0 ? 'Ativo' : 'Esgotado') : 'Inativo'}
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    {patient.plan?.expiresAt ? `Expira em: ${new Date(patient.plan.expiresAt).toLocaleDateString('pt-BR')}` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Balance Card */}
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Saldo de Sessões</h3>
                                        <div className="flex items-end gap-3 mb-2">
                                            <span className="text-4xl font-bold text-primary">{patient.plan?.remainingSessions || 0}</span>
                                            <span className="text-gray-400 font-medium mb-1">/ {patient.plan?.totalSessions || 0}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div
                                                className="bg-primary h-2 rounded-full transition-all duration-500"
                                                style={{ width: patient.plan ? `${(patient.plan.remainingSessions / patient.plan.totalSessions) * 100}%` : '0%' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Actions */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-green-600" />
                                        Status do Pagamento
                                    </h3>

                                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <div>
                                            <p className="font-semibold text-gray-900">Mensalidade Atual</p>
                                            <p className="text-sm text-gray-500">Valor referente ao pacote de {patient.plan?.name || 'N/A'}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {patient.plan ? (
                                                <>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${patient.plan.remainingSessions === patient.plan.totalSessions ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                                        {patient.plan.remainingSessions === patient.plan.totalSessions ? 'Pendente' : 'Pago Confirmado'}
                                                    </span>

                                                    {patient.plan.remainingSessions === patient.plan.totalSessions && (
                                                        <button
                                                            onClick={() => setShowPaymentSignatureModal(true)}
                                                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-colors flex items-center gap-2"
                                                        >
                                                            <FileSignature className="w-4 h-4" />
                                                            Confirmar Pagamento
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-sm text-gray-500 italic">Sem plano ativo</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'info' && (
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            Informações Pessoais
                                        </h3>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nome Completo</label>
                                            <p className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-md border border-gray-100">{patient.name}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Telefone</label>
                                            <p className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-md border border-gray-100">{patient.phone}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">CPF</label>
                                            <p className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-md border border-gray-100">{patient.cpf || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-gray-400" />
                                            Endereço
                                        </h3>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cidade</label>
                                            <p className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-md border border-gray-100">{patient.city || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Endereço Completo</label>
                                            <p className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-md border border-gray-100">{patient.address || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                        <button onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>

            {/* Camera Overlay Modal */}
            {
                showCamera && (
                    <div className="fixed inset-0 z-[60] bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
                        <div className="relative w-full max-w-md bg-black rounded-xl overflow-hidden shadow-2xl">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                onLoadedMetadata={() => videoRef.current?.play()}
                                className="w-full h-auto bg-gray-900"
                            />
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8">
                                <button
                                    onClick={handleStopCamera}
                                    className="bg-white/20 hover:bg-white/30 text-white rounded-full p-3 backdrop-blur-sm transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={handleCapture}
                                    className="bg-white rounded-full p-4 hover:scale-105 transition-transform border-4 border-gray-200"
                                >
                                    <div className="w-12 h-12 bg-transparent rounded-full border-2 border-black/10" />
                                </button>
                            </div>
                        </div>
                        <p className="text-white mt-4 text-sm font-medium">Ajuste o rosto no quadro e clique no botão central para capturar.</p>
                    </div>
                )
            }

            {/* Session Signature Modal */}
            {
                showSignatureModal && (
                    <SignatureModal
                        title="Assinar Sessão"
                        description="Desenhe sua assinatura ou tire uma foto para confirmar a sessão."
                        onConfirm={handleConfirmSignature}
                        onCancel={() => { setShowSignatureModal(false); setSessionToSign(null); }}
                    />
                )
            }

            {/* Payment Signature Modal */}
            {
                showPaymentSignatureModal && (
                    <SignatureModal
                        title="Confirmar Pagamento"
                        description="Desenhe sua assinatura ou tire uma foto para confirmar o pagamento do plano."
                        onConfirm={handleConfirmPayment}
                        onCancel={() => setShowPaymentSignatureModal(false)}
                    />
                )
            }
        </div >
    );
};


const Patients = ({ currentUnit }: { currentUnit: UnitId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [patientsList, setPatientsList] = useState<Patient[]>([]);
    const [planTemplates, setPlanTemplates] = useState<PlanTemplate[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [unitName, setUnitName] = useState('');
    const [allUnits, setAllUnits] = useState<Unit[]>([]);

    useEffect(() => {
        loadData();
    }, [currentUnit]);

    async function loadData() {
        try {
            setLoading(true);
            const [patientsData, plansData, professionalsData, unitData, allUnitsData] = await Promise.all([
                patientsApi.getAll(),
                planTemplatesApi.getAll(),
                professionalsApi.getAll(),
                currentUnit === 'ALL' ? Promise.resolve({ name: 'Todas as Unidades', id: 'ALL' } as Unit) : unitsApi.getById(currentUnit),
                unitsApi.getAll()
            ]);
            setPatientsList(patientsData);
            setPlanTemplates(plansData);
            setProfessionals(professionalsData);
            setUnitName(unitData.name);
            setAllUnits(allUnitsData);
        } catch (error) {
            console.error('Error loading data:', error);
            // toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    }

    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
    const [planFilter, setPlanFilter] = useState<'All' | 'ActivePlan' | 'ExpiredPlan'>('All');

    const filteredPatients = patientsList.filter(patient => {
        const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (patient.cpf && patient.cpf.includes(searchTerm));

        // Filter by unit if not ALL
        const matchesUnit = currentUnit === 'ALL' ? true : patient.unitId === currentUnit;

        const matchesStatus = statusFilter === 'All'
            ? true
            : patient.status === statusFilter;

        const matchesPlan = planFilter === 'All'
            ? true
            : planFilter === 'ActivePlan'
                ? (patient.plan?.remainingSessions || 0) > 0
                : (patient.plan?.remainingSessions || 0) === 0;

        return matchesSearch && matchesStatus && matchesPlan && matchesUnit;
    });

    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

    const handleCreatePatient = async (patientData: Patient) => {
        try {
            if (editingPatient) {
                await patientsApi.update(patientData.id, patientData);
                toast.success('Paciente atualizado com sucesso!');
            } else {
                await patientsApi.create(patientData);
                toast.success('Paciente cadastrado com sucesso!');
            }
            setIsCreateModalOpen(false);
            setEditingPatient(null);
            loadData();
        } catch (error) {
            console.error('Error saving patient:', error);
            toast.error('Erro ao salvar paciente');
        }
    };

    const handleDeletePatient = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.')) {
            try {
                await patientsApi.delete(id);
                toast.success('Paciente excluído com sucesso');
                loadData();
            } catch (error) {
                console.error('Error deleting patient:', error);
                toast.error('Erro ao excluir paciente');
            }
        }
    };

    const handleToggleStatus = async (patient: Patient, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const newStatus = patient.status === 'Active' ? 'Inactive' : 'Active';
            await patientsApi.update(patient.id, { status: newStatus });
            toast.success(`Paciente ${newStatus === 'Active' ? 'ativado' : 'inativado'} com sucesso`);
            loadData();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Erro ao atualizar status');
        }
    };

    const openEditModal = (patient: Patient, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingPatient(patient);
        setIsCreateModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
                    <p className="text-gray-500">Gestão de prontuários e tratamentos - {unitName}</p>
                </div>
                <button
                    onClick={() => { setEditingPatient(null); setIsCreateModalOpen(true); }}
                    className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm shadow-primary/30"
                >
                    <UserPlus className="w-4 h-4" />
                    Novo Paciente
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou CPF..."
                        className="input-primary pl-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="input-primary w-auto min-w-[140px]"
                    >
                        <option value="All">Todos Status</option>
                        <option value="Active">Ativos</option>
                        <option value="Inactive">Inativos</option>
                    </select>
                    <select
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value as any)}
                        className="input-primary w-auto min-w-[140px]"
                    >
                        <option value="All">Todos Planos</option>
                        <option value="ActivePlan">Plano Ativo</option>
                        <option value="ExpiredPlan">Sem Sessões</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-8 text-gray-500">Carregando pacientes...</div>
            ) : filteredPatients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPatients.map(patient => (
                        <div key={patient.id} onClick={() => setSelectedPatient(patient)} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative">

                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    {patient.photoUrl ? (
                                        <img src={patient.photoUrl} alt={patient.name} className="w-12 h-12 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                            {patient.name.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{patient.name}</h3>
                                        <p className="text-xs text-gray-500">{patient.phone}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                                        {allUnits.find(u => u.id === patient.unitId)?.name || 'N/A'}
                                    </span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${patient.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {patient.status === 'Active' ? 'Em Tratamento' : 'Inativo'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Plano</span>
                                    <span className="font-medium text-gray-900">{patient.plan?.name || 'Sem plano'}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Sessões</span>
                                    <span className="font-medium text-gray-900">
                                        {patient.plan ? `${patient.plan.remainingSessions} / ${patient.plan.totalSessions}` : '-'}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                                    <div
                                        className="bg-blue-600 h-1.5 rounded-full"
                                        style={{ width: patient.plan ? `${(patient.plan.remainingSessions / patient.plan.totalSessions) * 100}%` : '0%' }}
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            < div className="flex justify-end gap-2 pt-3 border-t border-gray-50 opacity-100 transition-opacity" >
                                <button
                                    onClick={(e) => openEditModal(patient, e)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => handleToggleStatus(patient, e)}
                                    className={`p-1.5 rounded-lg transition-colors ${patient.status === 'Active' ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                                    title={patient.status === 'Active' ? 'Inativar' : 'Ativar'}
                                >
                                    {patient.status === 'Active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={(e) => handleDeletePatient(patient.id, e)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <User className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum paciente encontrado</h3>
                    <p className="text-gray-500 max-w-sm">
                        Não encontramos nenhum paciente correspondente aos filtros selecionados.
                    </p>
                    <button
                        onClick={() => { setSearchTerm(''); setStatusFilter('All'); setPlanFilter('All'); }}
                        className="mt-6 text-primary hover:text-primary-hover font-medium text-sm transition-colors"
                    >
                        Limpar todos os filtros
                    </button>
                </div>
            )}

            {
                isCreateModalOpen && (
                    <CreatePatientModal
                        onClose={() => { setIsCreateModalOpen(false); setEditingPatient(null); }}
                        onSave={handleCreatePatient}
                        currentUnit={currentUnit}
                        planTemplates={planTemplates}
                        initialData={editingPatient}
                        allUnits={allUnits}
                    />
                )
            }

            {
                selectedPatient && (
                    <PatientDetailModal
                        patient={selectedPatient}
                        onClose={() => setSelectedPatient(null)}
                        currentUnit={currentUnit}
                        professionals={professionals}
                        units={allUnits}
                    />
                )
            }
        </div >
    );
};

export default Patients;
