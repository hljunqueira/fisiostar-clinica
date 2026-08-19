
import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, MoreHorizontal, UserPlus, FileText, X, Camera, FileSignature, CheckCircle, Clock, UploadCloud, User, Printer, Check, Phone as PhoneIcon, CreditCard, Save, MapPin, Calendar, Calendar as CalendarIcon, Hash, Edit2, Trash2, XCircle, DollarSign, Sparkles, LayoutGrid, List, ChevronLeft, ChevronRight, Stethoscope, Activity, Scan } from 'lucide-react';
import { FacialScanModal } from './FacialScanModal';
import { ConfirmModal } from './ConfirmModal';
import { PatientDetailView } from './PatientDetailView';
import { EvaluationModal } from './EvaluationModal';
import { EvolutionModal } from './EvolutionModal';
import AppointmentModal from './AppointmentModal';
import { CheckInPresenceModal } from './CheckIn/CheckInPresenceModal';


import { UnitId, Patient, SessionStatus, PlanTemplate, Professional, Session, Unit } from '../types';
import { patientsApi, planTemplatesApi, professionalsApi, sessionsApi, unitsApi } from '../src/services/api';
import { maskPhone, maskCpf, maskCep, validateCpf } from '../src/utils/masks';
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
            status: 'Agendada'
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
    const [cep, setCep] = useState(initialData?.cep || '');
    const [phone, setPhone] = useState(initialData?.phone || '');
    const [city, setCity] = useState(initialData?.city || '');
    const [street, setStreet] = useState(initialData?.street || '');
    const [number, setNumber] = useState(initialData?.number || '');
    const [bairro, setBairro] = useState(initialData?.bairro || '');
    const [complement, setComplement] = useState(initialData?.complement || '');
    const [isFetchingCep, setIsFetchingCep] = useState(false);
    
    // CEP Control States:
    // isCepFetched: true after successfully querying ViaCEP
    // isGeneralCep: true if CEP is city-wide (no logradouro)
    // isManualUnlocked: true if user clicks "Digitar Sem CEP" or edits record without CEP
    const [isCepFetched, setIsCepFetched] = useState(!!initialData?.street || !!initialData?.city);
    const [isGeneralCep, setIsGeneralCep] = useState(false);
    const [isManualUnlocked, setIsManualUnlocked] = useState(!!initialData && !initialData.cep);
    const numberInputRef = useRef<HTMLInputElement>(null);

    const handleCepChange = async (val: string) => {
        const masked = maskCep(val);
        setCep(masked);
        const cleanCep = masked.replace(/\D/g, '');

        if (cleanCep.length === 8) {
            setIsFetchingCep(true);
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setIsCepFetched(true);
                    if (data.localidade && data.uf) {
                        setCity(`${data.localidade} - ${data.uf}`);
                    }
                    if (data.logradouro) {
                        setStreet(data.logradouro);
                        setIsGeneralCep(false);
                        setTimeout(() => numberInputRef.current?.focus(), 150);
                        toast.success('Rua localizada! Digite apenas o Número.');
                    } else {
                        // CEP Único da Cidade
                        setStreet('');
                        setIsGeneralCep(true);
                        toast.success('CEP Geral da Cidade! Preencha a Rua e Bairro.');
                    }
                    if (data.bairro) {
                        setBairro(data.bairro);
                    } else {
                        setBairro('');
                    }
                } else {
                    toast.error('CEP não encontrado');
                    setIsCepFetched(false);
                    setIsGeneralCep(false);
                }
            } catch (err) {
                console.error('Erro ao buscar CEP:', err);
                setIsCepFetched(false);
            } finally {
                setIsFetchingCep(false);
            }
        } else if (cleanCep.length < 8) {
            setIsCepFetched(false);
            setIsGeneralCep(false);
        }
    };

    // Treatment - find matching plan template by name if editing, roughly
    const [selectedPlanId, setSelectedPlanId] = useState(() => {
        if (initialData?.plan) {
            if (initialData.plan.name === 'Particular / Avulso') return 'avulso';
            const match = planTemplates.find(p => p.name === initialData.plan.name);
            return match?.id || 'avulso';
        }
        return 'avulso';
    });

    const activePlans = planTemplates.filter(p => p.active);

    // Guardian / Pediatric Info
    const [hasGuardian, setHasGuardian] = useState(initialData?.hasGuardian || false);
    const [guardianName, setGuardianName] = useState(initialData?.guardianName || '');
    const [guardianRelationship, setGuardianRelationship] = useState(initialData?.guardianRelationship || 'Mãe');
    const [guardianPhone, setGuardianPhone] = useState(initialData?.guardianPhone || '');
    const [guardianCpf, setGuardianCpf] = useState(initialData?.guardianCpf || '');
    const [guardianEmail, setGuardianEmail] = useState(initialData?.guardianEmail || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const isAvulso = selectedPlanId === 'avulso' || !selectedPlanId;
        const planTemplate = planTemplates.find(p => p.id === selectedPlanId);

        if (!name.trim()) return;

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

        const formattedAddress = [
            street,
            number ? `nº ${number}` : '',
            bairro ? `Bairro ${bairro}` : '',
            complement
        ].filter(Boolean).join(', ');

        const patientData: Patient = {
            id: initialData?.id || `p-${Date.now()}`,
            name: name.trim(),
            phone: phone || '(00) 00000-0000',
            cpf: cpf.trim() || undefined,
            birthDate: birthDate || undefined,
            cep: cep || undefined,
            street: street || undefined,
            number: number || undefined,
            bairro: bairro || undefined,
            complement: complement || undefined,
            address: formattedAddress || initialData?.address,
            city: city || undefined,

            hasGuardian,
            guardianName: guardianName.trim() || undefined,
            guardianRelationship: guardianRelationship || undefined,
            guardianPhone: guardianPhone.trim() || undefined,
            guardianCpf: guardianCpf.trim() || undefined,
            guardianEmail: guardianEmail.trim() || undefined,

            unitId: selectedUnitId || (currentUnit === 'ALL' ? allUnits[0]?.id : currentUnit),
            status: initialData?.status || 'Active',
            plan: planData!,
            lastVisit: initialData?.lastVisit,
            photoUrl: initialData?.photoUrl
        };

        onSave(patientData);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-8">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl relative z-10 animate-fade-in flex flex-col max-h-[90vh] overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 via-white to-blue-50/20">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
                            <UserPlus className="w-7 h-7 text-blue-600" />
                            {initialData ? 'Editar Paciente' : 'Novo Prontuário'}
                        </h2>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                            Unidade Responsável: <span className="font-semibold text-gray-800 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">{unitName}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {currentUnit === 'ALL' && (
                            <select
                                value={selectedUnitId}
                                onChange={e => setSelectedUnitId(e.target.value)}
                                className="px-3.5 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {allUnits.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                    {/* Section 1: Dados Pessoais */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 border-b border-gray-100 pb-2 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            Dados Pessoais
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                            <div className="md:col-span-6">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Nome Completo *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 placeholder:text-gray-400 font-medium text-sm transition-all shadow-sm"
                                    placeholder="Ex: João da Silva"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-3">
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">CPF</label>
                                    {cpf.replace(/\D/g, '').length === 11 && (
                                        validateCpf(cpf) ? (
                                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">✓ CPF Válido</span>
                                        ) : (
                                            <span className="text-[11px] font-bold text-red-500 flex items-center gap-1">⚠️ CPF Inválido</span>
                                        )
                                    )}
                                </div>
                                <div className="relative">
                                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        maxLength={14}
                                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 outline-none font-medium text-sm transition-all shadow-sm ${
                                            cpf.replace(/\D/g, '').length === 11
                                                ? validateCpf(cpf)
                                                    ? 'border-emerald-500 bg-emerald-50/20 text-gray-900 focus:ring-emerald-500'
                                                    : 'border-red-500 bg-red-50/20 text-red-900 focus:ring-red-500'
                                                : 'border-gray-200 bg-white text-gray-900 focus:ring-blue-500'
                                        }`}
                                        placeholder="000.000.000-00"
                                        value={cpf}
                                        onChange={e => setCpf(maskCpf(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Data de Nascimento</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 font-medium text-sm transition-all shadow-sm"
                                        value={birthDate}
                                        onChange={e => setBirthDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Contato e Endereço */}
                    <div>
                        <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-2">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                Contato e Localização
                            </h3>
                            {!isManualUnlocked ? (
                                <button
                                    type="button"
                                    onClick={() => setIsManualUnlocked(true)}
                                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors"
                                    title="Clique para liberar a digitação manual de todo o endereço sem consultar CEP"
                                >
                                    <span>🔓 Digitar Endereço Sem CEP</span>
                                </button>
                            ) : (
                                <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                                    <span>✍️ Digitação Manual Liberada</span>
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                            {/* Linha 1: Telefone, CEP, Cidade */}
                            <div className="md:col-span-4">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Telefone / WhatsApp *</label>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        maxLength={15}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 placeholder:text-gray-400 font-medium text-sm transition-all shadow-sm"
                                        placeholder="(00) 90000-0000"
                                        value={phone}
                                        onChange={e => setPhone(maskPhone(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                                    <span>CEP</span>
                                    {isFetchingCep && <span className="text-[10px] text-blue-600 animate-pulse font-semibold">Buscando...</span>}
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        maxLength={9}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 placeholder:text-gray-400 font-medium text-sm transition-all shadow-sm"
                                        placeholder="00000-000"
                                        value={cep}
                                        onChange={e => handleCepChange(e.target.value)}
                                    />
                                    {isFetchingCep && (
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-5">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Cidade e UF</label>
                                <input
                                    type="text"
                                    disabled={!isManualUnlocked && !isGeneralCep}
                                    className={`w-full px-4 py-2.5 border rounded-xl outline-none font-medium text-sm transition-all shadow-sm ${!isManualUnlocked && !isGeneralCep ? 'bg-gray-100/90 text-gray-700 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-900 border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
                                    placeholder={!isManualUnlocked && !isCepFetched ? "Digite o CEP para buscar..." : "Ex: Araranguá - SC"}
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                />
                            </div>

                            {/* Linha 2: Rua, Número, Bairro */}
                            <div className="md:col-span-6">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                                    <span>Logradouro / Rua</span>
                                    {!isManualUnlocked && !isCepFetched && <span className="text-[10px] text-amber-600 font-semibold">🔒 Digite o CEP</span>}
                                    {!isManualUnlocked && isCepFetched && !isGeneralCep && <span className="text-[10px] text-emerald-600 font-semibold">✓ Bloqueado pelo CEP</span>}
                                    {!isManualUnlocked && isGeneralCep && <span className="text-[10px] text-blue-600 font-semibold">CEP Único - Digite a Rua</span>}
                                </label>
                                <input
                                    type="text"
                                    disabled={!isManualUnlocked && (!isCepFetched || !isGeneralCep)}
                                    className={`w-full px-4 py-2.5 border rounded-xl outline-none font-medium text-sm transition-all shadow-sm ${!isManualUnlocked && (!isCepFetched || !isGeneralCep) ? 'bg-gray-100/90 text-gray-700 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-900 border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
                                    placeholder={!isManualUnlocked && !isCepFetched ? "Digite o CEP para liberar..." : "Rua / Avenida"}
                                    value={street}
                                    onChange={e => setStreet(e.target.value)}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                                    <span>Número *</span>
                                    {!isManualUnlocked && !isCepFetched && <span className="text-[10px] text-amber-600 font-semibold">🔒 Bloqueado</span>}
                                </label>
                                <input
                                    ref={numberInputRef}
                                    type="text"
                                    disabled={!isManualUnlocked && !isCepFetched}
                                    className={`w-full px-4 py-2.5 border rounded-xl outline-none font-bold text-sm transition-all shadow-sm ${!isManualUnlocked && !isCepFetched ? 'bg-gray-100/90 text-gray-400 border-gray-200 cursor-not-allowed' : (isCepFetched && !number ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 text-gray-900' : 'border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500')}`}
                                    placeholder="Nº"
                                    value={number}
                                    onChange={e => setNumber(e.target.value)}
                                />
                            </div>

                            <div className="md:col-span-4">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                                    <span>Bairro</span>
                                    {!isManualUnlocked && !isCepFetched && <span className="text-[10px] text-amber-600 font-semibold">🔒 Digite o CEP</span>}
                                    {!isManualUnlocked && isCepFetched && !isGeneralCep && <span className="text-[10px] text-emerald-600 font-semibold">✓ Auto-preenchido</span>}
                                </label>
                                <input
                                    type="text"
                                    disabled={!isManualUnlocked && (!isCepFetched || !isGeneralCep)}
                                    className={`w-full px-4 py-2.5 border rounded-xl outline-none font-medium text-sm transition-all shadow-sm ${!isManualUnlocked && (!isCepFetched || !isGeneralCep) ? 'bg-gray-100/90 text-gray-700 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-900 border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
                                    placeholder={!isManualUnlocked && !isCepFetched ? "Digite o CEP..." : "Bairro"}
                                    value={bairro}
                                    onChange={e => setBairro(e.target.value)}
                                />
                            </div>

                            {/* Linha 3: Complemento */}
                            <div className="md:col-span-12">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Complemento / Ponto de Referência <span className="font-normal text-gray-400 text-[11px]">(Opcional)</span></label>
                                <input
                                    type="text"
                                    disabled={!isManualUnlocked && !isCepFetched}
                                    className={`w-full px-4 py-2.5 border rounded-xl outline-none font-medium text-sm transition-all shadow-sm ${!isManualUnlocked && !isCepFetched ? 'bg-gray-100/90 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-900 border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
                                    placeholder="Ex: Apto 302, Bloco B / Próximo ao Mercado"
                                    value={complement}
                                    onChange={e => setComplement(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Responsável Legal (Pediátrico / Dependente) */}
                    <div>
                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <User className="w-4 h-4 text-indigo-600" />
                                Responsável Legal (Criança / Dependente)
                            </h3>
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={hasGuardian}
                                    onChange={e => setHasGuardian(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                />
                                <span>Paciente menor de idade / Dependente</span>
                            </label>
                        </div>

                        {hasGuardian && (
                            <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-6">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Nome do Responsável *</label>
                                        <input
                                            type="text"
                                            value={guardianName}
                                            onChange={e => setGuardianName(e.target.value)}
                                            placeholder="Ex: Maria Rodrigues da Silva"
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Parentesco</label>
                                        <select
                                            value={guardianRelationship}
                                            onChange={e => setGuardianRelationship(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="Mãe">Mãe</option>
                                            <option value="Pai">Pai</option>
                                            <option value="Avó/Avô">Avó / Avô</option>
                                            <option value="Tutor Legal">Tutor Legal</option>
                                            <option value="Cuidador">Cuidador</option>
                                            <option value="Outro">Outro</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">WhatsApp do Responsável</label>
                                        <input
                                            type="text"
                                            value={guardianPhone}
                                            onChange={e => setGuardianPhone(maskPhone(e.target.value))}
                                            placeholder="(00) 90000-0000"
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div className="md:col-span-6">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">CPF do Responsável</label>
                                        <input
                                            type="text"
                                            maxLength={14}
                                            value={guardianCpf}
                                            onChange={e => setGuardianCpf(maskCpf(e.target.value))}
                                            placeholder="000.000.000-00"
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div className="md:col-span-6">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">E-mail do Responsável</label>
                                        <input
                                            type="email"
                                            value={guardianEmail}
                                            onChange={e => setGuardianEmail(e.target.value)}
                                            placeholder="responsavel@email.com"
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 3: Plano */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            Plano de Tratamento
                        </h3>

                        <div className="bg-blue-50/40 p-5 md:p-6 rounded-2xl border border-blue-100/80">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Selecione o Plano ou Modalidade *</label>
                                <div className="relative">
                                    <select
                                        value={selectedPlanId}
                                        onChange={e => setSelectedPlanId(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white font-semibold text-sm text-gray-800 shadow-sm"
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
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
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
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 sticky bottom-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gray-100 transition-all shadow-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Salvar Prontuário
                    </button>
                </div>
            </div>
        </div>
    );
};

const getWhatsappUrl = (phone?: string) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return '#';
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent('Olá! Entro em contato da clínica FisioStar.')}`;
};

const Patients = ({ currentUnit }: { currentUnit: UnitId }) => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [isPresenceModalOpen, setIsPresenceModalOpen] = useState(false);
    const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
    const [isEvolModalOpen, setIsEvolModalOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [patientsList, setPatientsList] = useState<Patient[]>([]);
    const [planTemplates, setPlanTemplates] = useState<PlanTemplate[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [unitName, setUnitName] = useState('');
    const [allUnits, setAllUnits] = useState<Unit[]>([]);

    // Sincroniza seleção automática se houver patientId na URL
    useEffect(() => {
        const pId = searchParams.get('patientId');
        if (pId && patientsList.length > 0) {
            const found = patientsList.find(p => p.id === pId);
            if (found) {
                setSelectedPatient(found);
            }
        }
    }, [searchParams, patientsList]);

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
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

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

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(12);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, planFilter, currentUnit]);

    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredPatients.length);
    const paginatedPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [facialScanPatient, setFacialScanPatient] = useState<Patient | null>(null);

    const handleSaveFacialData = async (descriptor: string, capturedPhotoUrl?: string) => {
        if (!facialScanPatient) return;
        try {
            const updates: Partial<Patient> = {
                facialDescriptor: descriptor,
                ...(capturedPhotoUrl ? { photoUrl: capturedPhotoUrl } : {})
            };
            await patientsApi.update(facialScanPatient.id, updates);
            handlePatientUpdated({
                id: facialScanPatient.id,
                facialDescriptor: descriptor,
                ...(capturedPhotoUrl ? { photoUrl: capturedPhotoUrl } : {})
            });
            toast.success('Biometria facial e foto do perfil atualizadas com sucesso!');
        } catch (error) {
            console.error('Error saving facial descriptor:', error);
            toast.error('Erro ao salvar biometria facial');
        }
    };

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        confirmLabel?: string;
        variant?: 'danger' | 'warning' | 'info';
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: () => {}
    });

    const handlePatientUpdated = (updated: Partial<Patient> & { id: string }) => {
        setPatientsList(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
        setSelectedPatient(prev => prev && prev.id === updated.id ? { ...prev, ...updated } : prev);
    };

    const handleCreatePatient = async (patientData: Patient) => {
        try {
            if (editingPatient) {
                await patientsApi.update(patientData.id, patientData);
                handlePatientUpdated(patientData);
                toast.success('Paciente atualizado com sucesso!');
            } else {
                const newPatient = await patientsApi.create(patientData);
                setPatientsList(prev => [newPatient, ...prev]);
                toast.success('Paciente cadastrado com sucesso!');
            }
            setIsCreateModalOpen(false);
            setEditingPatient(null);
        } catch (error) {
            console.error('Error saving patient:', error);
            toast.error('Erro ao salvar paciente');
        }
    };

    const handleSaveAppointment = async (session: Session) => {
        try {
            await sessionsApi.create(session);
            toast.success('Agendamento realizado com sucesso!');
            setIsAppointmentModalOpen(false);
        } catch (error: any) {
            console.error('Erro ao agendar:', error);
            toast.error(error.message || 'Erro ao criar agendamento');
        }
    };

    const handleDeletePatient = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Paciente',
            description: 'Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.',
            confirmLabel: 'Excluir Paciente',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await patientsApi.delete(id);
                    setPatientsList(prev => prev.filter(p => p.id !== id));
                    if (selectedPatient?.id === id) setSelectedPatient(null);
                    toast.success('Paciente excluído com sucesso');
                } catch (error) {
                    console.error('Error deleting patient:', error);
                    toast.error('Erro ao excluir paciente');
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleToggleStatus = async (patient: Patient, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            const newStatus = patient.status === 'Active' ? 'Inactive' : 'Active';
            await patientsApi.update(patient.id, { status: newStatus });
            handlePatientUpdated({ id: patient.id, status: newStatus });
            toast.success(`Paciente ${newStatus === 'Active' ? 'ativado' : 'inativado'} com sucesso`);
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Erro ao atualizar status');
        }
    };

    const openEditModal = (patient: Patient, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setEditingPatient(patient);
        setIsCreateModalOpen(true);
    };

    if (selectedPatient) {
        return (
            <div className="space-y-6">
                <PatientDetailView
                    patient={selectedPatient}
                    initialTab={(searchParams.get('tab') as any) || 'timeline'}
                    onClose={() => {
                        setSelectedPatient(null);
                        setSearchParams({});
                    }}
                    currentUnit={currentUnit}
                    professionals={professionals}
                    units={allUnits}
                    onOpenFacialScan={(p) => setFacialScanPatient(p)}
                    onEdit={(p) => openEditModal(p)}
                    onToggleStatus={(p) => handleToggleStatus(p)}
                    onDelete={(id) => { setSelectedPatient(null); handleDeletePatient(id); }}
                    onUpdatePatient={handlePatientUpdated}
                    onRequestConfirm={(config) => setConfirmModal({ ...config, isOpen: true })}
                />

                {facialScanPatient && (
                    <FacialScanModal
                        isOpen={!!facialScanPatient}
                        onClose={() => setFacialScanPatient(null)}
                        patientName={facialScanPatient.name}
                        onSaveFacialData={handleSaveFacialData}
                    />
                )}

                {isCreateModalOpen && (
                    <CreatePatientModal
                        onClose={() => { setIsCreateModalOpen(false); setEditingPatient(null); }}
                        onSave={handleCreatePatient}
                        currentUnit={currentUnit}
                        planTemplates={planTemplates}
                        initialData={editingPatient}
                        allUnits={allUnits}
                    />
                )}

                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    description={confirmModal.description}
                    confirmLabel={confirmModal.confirmLabel}
                    variant={confirmModal.variant}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
                    <p className="text-gray-500">Gestão de prontuários e tratamentos - {unitName}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setIsPresenceModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm shadow-blue-600/20 cursor-pointer active:scale-95"
                        title="Registrar Presença / Biometria Facial"
                    >
                        <Scan className="w-3.5 h-3.5" />
                        <span>Presença / Biometria</span>
                    </button>
                    <button
                        onClick={() => setIsEvalModalOpen(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                        title="Nova Avaliação Clínica"
                    >
                        <Stethoscope className="w-3.5 h-3.5 text-blue-300" />
                        <span>Avaliação</span>
                    </button>
                    <button
                        onClick={() => setIsEvolModalOpen(true)}
                        className="bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                        title="Nova Evolução de Atendimento"
                    >
                        <Activity className="w-3.5 h-3.5 text-teal-200" />
                        <span>Evolução</span>
                    </button>
                    <button
                        onClick={() => { setEditingPatient(null); setIsCreateModalOpen(true); }}
                        className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 shadow-sm shadow-primary/30 cursor-pointer active:scale-95"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Novo Paciente</span>
                    </button>
                </div>
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

                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200/80">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all ${
                                viewMode === 'grid'
                                    ? 'bg-white text-gray-900 shadow-sm font-bold'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                            title="Visualização em Cards"
                        >
                            <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
                            <span className="hidden sm:inline">Cards</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all ${
                                viewMode === 'table'
                                    ? 'bg-white text-gray-900 shadow-sm font-bold'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                            title="Visualização em Lista / Tabela"
                        >
                            <List className="w-3.5 h-3.5 text-blue-600" />
                            <span className="hidden sm:inline">Lista</span>
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-8 text-gray-500">Carregando pacientes...</div>
            ) : filteredPatients.length > 0 ? (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedPatients.map(patient => (
                                <div
                                    key={patient.id}
                                    onClick={() => setSelectedPatient(patient)}
                                    className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group relative flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                {patient.photoUrl ? (
                                                    <img src={patient.photoUrl} alt={patient.name} className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-gray-100" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 font-bold text-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                                                        {patient.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                                                        {patient.name}
                                                    </h3>
                                                    <a
                                                        href={getWhatsappUrl(patient.phone)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 hover:underline transition-colors mt-0.5"
                                                        title="Conversar no WhatsApp"
                                                    >
                                                        <PhoneIcon className="w-3.5 h-3.5 text-emerald-600 fill-emerald-50" />
                                                        <span>{patient.phone}</span>
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                                                    {allUnits.find(u => u.id === patient.unitId)?.name || 'N/A'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${patient.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                    {patient.status === 'Active' ? 'Em Tratamento' : 'Inativo'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 py-2 border-t border-gray-100">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500 font-medium">Plano Contratado</span>
                                                <span className="font-bold text-gray-800">{patient.plan?.name || 'Sem plano'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500 font-medium">Sessões Restantes</span>
                                                <span className="font-bold text-gray-900">
                                                    {patient.plan ? `${patient.plan.remainingSessions} de ${patient.plan.totalSessions}` : '-'}
                                                </span>
                                            </div>
                                            {patient.plan && (
                                                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                                    <div
                                                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                                                        style={{ width: `${(patient.plan.remainingSessions / patient.plan.totalSessions) * 100}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs text-blue-600 font-semibold group-hover:text-blue-700">
                                        <span>Ver Prontuário Completo</span>
                                        <span className="text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Table View Mode */
                        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden animate-fade-in">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/80 border-b border-gray-200/80 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Paciente</th>
                                            <th className="px-6 py-4">Telefone / WhatsApp</th>
                                            <th className="px-6 py-4">Unidade</th>
                                            <th className="px-6 py-4">Plano Contratado</th>
                                            <th className="px-6 py-4 text-center">Sessões Restantes</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {paginatedPatients.map(patient => (
                                            <tr
                                                key={patient.id}
                                                onClick={() => setSelectedPatient(patient)}
                                                className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    <div className="flex items-center gap-3">
                                                        {patient.photoUrl ? (
                                                            <img src={patient.photoUrl} alt={patient.name} className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-gray-100" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-bold text-sm flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                                                                {patient.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                                {patient.name}
                                                            </div>
                                                            {patient.cpf && (
                                                                <div className="text-xs text-gray-400 font-mono mt-0.5">
                                                                    CPF: {patient.cpf}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <a
                                                        href={getWhatsappUrl(patient.phone)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                                                        title="Conversar no WhatsApp"
                                                    >
                                                        <PhoneIcon className="w-3.5 h-3.5 text-emerald-600 fill-emerald-50" />
                                                        <span>{patient.phone}</span>
                                                    </a>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
                                                        {allUnits.find(u => u.id === patient.unitId)?.name || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-800 font-medium">
                                                    {patient.plan?.name || 'Sem plano'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {patient.plan ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                            {patient.plan.remainingSessions} de {patient.plan.totalSessions}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${patient.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                        {patient.status === 'Active' ? 'Em Tratamento' : 'Inativo'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700 flex items-center justify-end gap-1">
                                                        <span>Ver Prontuário</span>
                                                        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pagination Controls Bar */}
                    <div className="bg-white px-6 py-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                        <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                            <span>
                                Mostrando <strong className="text-gray-900">{filteredPatients.length > 0 ? startIndex + 1 : 0}</strong> a <strong className="text-gray-900">{endIndex}</strong> de <strong className="text-gray-900">{filteredPatients.length}</strong> pacientes
                            </span>
                            <span className="hidden md:inline text-gray-300">|</span>
                            <div className="hidden md:flex items-center gap-1.5">
                                <span>Exibir:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                >
                                    <option value={9}>9 por pág.</option>
                                    <option value={12}>12 por pág.</option>
                                    <option value={24}>24 por pág.</option>
                                    <option value={48}>48 por pág.</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all ${
                                    currentPage === 1
                                        ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 shadow-sm cursor-pointer'
                                }`}
                                title="Página Anterior"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">Anterior</span>
                            </button>

                            {/* Page Numbers */}
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                                    .map((page, idx, arr) => {
                                        const prevPage = arr[idx - 1];
                                        const showEllipsis = prevPage && page - prevPage > 1;
                                        return (
                                            <React.Fragment key={page}>
                                                {showEllipsis && <span className="px-1 text-gray-400 text-xs">...</span>}
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                                        currentPage === page
                                                            ? 'bg-primary text-white shadow-sm shadow-primary/30'
                                                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            </React.Fragment>
                                        );
                                    })}
                            </div>

                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all ${
                                    currentPage === totalPages
                                        ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 shadow-sm cursor-pointer'
                                }`}
                                title="Próxima Página"
                            >
                                <span className="hidden sm:inline">Próxima</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </>
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
                facialScanPatient && (
                    <FacialScanModal
                        isOpen={!!facialScanPatient}
                        onClose={() => setFacialScanPatient(null)}
                        patientName={facialScanPatient.name}
                        onSaveFacialData={handleSaveFacialData}
                    />
                )
            }

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                description={confirmModal.description}
                confirmLabel={confirmModal.confirmLabel}
                variant={confirmModal.variant}
            />

            {isEvalModalOpen && (
                <EvaluationModal
                    isOpen={isEvalModalOpen}
                    onClose={() => setIsEvalModalOpen(false)}
                    currentUnit={currentUnit}
                />
            )}

            {isEvolModalOpen && (
                <EvolutionModal
                    isOpen={isEvolModalOpen}
                    onClose={() => setIsEvolModalOpen(false)}
                    currentUnit={currentUnit}
                />
            )}

            {isAppointmentModalOpen && (
                <AppointmentModal
                    isOpen={isAppointmentModalOpen}
                    onClose={() => setIsAppointmentModalOpen(false)}
                    onSave={handleSaveAppointment}
                    currentUnit={currentUnit}
                />
            )}

            {isPresenceModalOpen && (
                <CheckInPresenceModal
                    isOpen={isPresenceModalOpen}
                    onClose={() => setIsPresenceModalOpen(false)}
                    patients={patientsList}
                    currentUnit={currentUnit}
                    onSuccess={loadData}
                />
            )}
        </div>
    );
};

export default Patients;
