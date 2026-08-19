import React, { useState, useRef, useEffect } from 'react';
import { 
    Clock, Stethoscope, Activity, ShieldCheck, CreditCard, User, 
    Printer, Phone as PhoneIcon, Edit2, Trash2, XCircle, CheckCircle, 
    UploadCloud, Camera, ChevronLeft, Plus, FileText, AlertCircle, 
    Calendar as CalendarIcon, FileSignature, Check, MapPin, Hash, Sparkles, X,
    RefreshCw, DollarSign, Save
} from 'lucide-react';
import { UnitId, Patient, SessionStatus, Professional, Session, Unit, PatientEvaluation, PatientEvolution, PatientContract, PlanTemplate } from '../types';
import { patientsApi, sessionsApi, unitsApi, evaluationsApi, evolutionsApi, contractsApi, planTemplatesApi } from '../src/services/api';
import { maskPhone, maskCpf, maskCep, validateCpf } from '../src/utils/masks';
import { storageApi } from '../src/services/storage-api';
import { EvaluationModal } from './EvaluationModal';
import { EvolutionModal } from './EvolutionModal';
import { ContractModal } from './ContractModal';
import { DocumentGeneratorModal } from './DocumentGeneratorModal';
import SignatureModal from './SignatureModal';
import { useAuth } from '../src/contexts/AuthContext';
import toast from 'react-hot-toast';

interface PatientDetailViewProps {
    patient: Patient;
    onClose: () => void;
    currentUnit: UnitId;
    professionals: Professional[];
    units: Unit[];
    onOpenFacialScan?: (patient: Patient) => void;
    onEdit?: (patient: Patient) => void;
    onToggleStatus?: (patient: Patient) => void;
    onDelete?: (id: string) => void;
    onUpdatePatient?: (updated: Partial<Patient> & { id: string }) => void;
    onRequestConfirm?: (config: { title: string; description: string; confirmLabel?: string; variant?: 'danger' | 'warning' | 'info'; onConfirm: () => void }) => void;
}

const getWhatsappUrl = (phone?: string) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return '#';
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent('Olá! Entro em contato da clínica FisioStar.')}`;
};

export const PatientDetailView: React.FC<PatientDetailViewProps> = ({
    patient: initialPatient,
    onClose,
    currentUnit,
    professionals,
    units,
    onOpenFacialScan,
    onToggleStatus,
    onDelete,
    onUpdatePatient,
    onRequestConfirm
}) => {
    const [patient, setPatient] = useState<Patient>(initialPatient);
    const [unitName, setUnitName] = useState('');
    const { systemUser } = useAuth();

    useEffect(() => {
        setPatient(initialPatient);
        setCurrentPhoto(initialPatient.photoUrl);
    }, [initialPatient]);

    useEffect(() => {
        if (currentUnit === 'ALL') {
            setUnitName(`Todas (Paciente: ${units.find(u => u.id === patient.unitId)?.name || 'N/A'})`);
        } else {
            unitsApi.getById(currentUnit).then(u => setUnitName(u.name)).catch(() => setUnitName('FisioStar'));
        }
    }, [currentUnit, patient.unitId, units]);

    const [activeTab, setActiveTab] = useState<'signatures' | 'evaluations' | 'evolutions' | 'contracts' | 'financial' | 'info'>('signatures');
    const [isScheduling, setIsScheduling] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [newProfessionalId, setNewProfessionalId] = useState('');

    // Clinical Records State
    const [evaluations, setEvaluations] = useState<PatientEvaluation[]>([]);
    const [evolutions, setEvolutions] = useState<PatientEvolution[]>([]);
    const [contracts, setContracts] = useState<PatientContract[]>([]);
    const [planTemplates, setPlanTemplates] = useState<PlanTemplate[]>([]);
    const [loadingClinical, setLoadingClinical] = useState(false);

    // Modals state
    const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
    const [selectedEvalToEdit, setSelectedEvalToEdit] = useState<PatientEvaluation | null>(null);
    const [isEvolModalOpen, setIsEvolModalOpen] = useState(false);
    const [selectedEvolToEdit, setSelectedEvolToEdit] = useState<PatientEvolution | null>(null);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [selectedContractToView, setSelectedContractToView] = useState<PatientContract | null>(null);
    const [isDocGenModalOpen, setIsDocGenModalOpen] = useState(false);

    // Modal de Vincular / Trocar Plano
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [selectedPlanTemplateId, setSelectedPlanTemplateId] = useState<string>('');
    const [customPlanName, setCustomPlanName] = useState('');
    const [planTotalSessions, setPlanTotalSessions] = useState(10);
    const [planRemainingSessions, setPlanRemainingSessions] = useState(10);
    const [planTotalPaid, setPlanTotalPaid] = useState<number>(0);
    const [planPaymentStatus, setPlanPaymentStatus] = useState<'paid' | 'pending'>('paid');
    const [planPaymentMethod, setPlanPaymentMethod] = useState<string>('pix');
    const [planExpiryDays, setPlanExpiryDays] = useState(60);
    const [savingPlan, setSavingPlan] = useState(false);

    // Modo de Edição de Dados Pessoais
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [editName, setEditName] = useState(patient.name);
    const [editCpf, setEditCpf] = useState(patient.cpf || '');
    const [editPhone, setEditPhone] = useState(patient.phone);
    const [editBirthDate, setEditBirthDate] = useState(patient.birthDate || '');
    const [editCep, setEditCep] = useState(patient.cep || '');
    const [editStreet, setEditStreet] = useState(patient.street || '');
    const [editNumber, setEditNumber] = useState(patient.number || '');
    const [editBairro, setEditBairro] = useState(patient.bairro || '');
    const [editCity, setEditCity] = useState(patient.city || '');
    const [editComplement, setEditComplement] = useState(patient.complement || '');
    const [savingInfo, setSavingInfo] = useState(false);

    // Photo Capture State
    const [showCamera, setShowCamera] = useState(false);
    const [currentPhoto, setCurrentPhoto] = useState<string | undefined>(patient.photoUrl);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Plan & Session History
    const [patientHistory, setPatientHistory] = useState<Session[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [sessionToSign, setSessionToSign] = useState<string | null>(null);

    const loadClinicalData = async () => {
        setLoadingClinical(true);
        try {
            const [evals, evos, conts, templates] = await Promise.all([
                evaluationsApi.getByPatientId(patient.id),
                evolutionsApi.getByPatientId(patient.id),
                contractsApi.getByPatientId(patient.id),
                planTemplatesApi.getAll()
            ]);
            setEvaluations(evals);
            setEvolutions(evos);
            setContracts(conts);
            setPlanTemplates(templates.filter(t => t.active));
        } catch (error) {
            console.error('Erro ao carregar dados clínicos:', error);
        } finally {
            setLoadingClinical(false);
        }
    };

    useEffect(() => {
        loadClinicalData();
        setLoadingHistory(true);
        sessionsApi.getAll({ patientId: patient.id }).then(sessions => {
            setPatientHistory(sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }).catch(err => {
            console.error('Error fetching sessions:', err);
        }).finally(() => {
            setLoadingHistory(false);
        });
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

                (async () => {
                    try {
                        const fileName = `patient-${patient.id}-${Date.now()}.jpg`;
                        const publicUrl = await storageApi.uploadBase64('patient-photos', fileName, dataUrl);
                        await patientsApi.update(patient.id, { photoUrl: publicUrl });
                        setCurrentPhoto(publicUrl);
                        setPatient(prev => ({ ...prev, photoUrl: publicUrl }));
                        if (onUpdatePatient) onUpdatePatient({ id: patient.id, photoUrl: publicUrl });
                        toast.success('Foto capturada e salva com sucesso!');
                    } catch (error) {
                        console.error('Error uploading photo:', error);
                        toast.error('Erro ao salvar foto');
                    }
                })();

                handleStopCamera();
            }
        }
    };

    const handleDeletePhoto = () => {
        const executeDelete = async () => {
            try {
                await patientsApi.update(patient.id, { photoUrl: '' });
                setCurrentPhoto(undefined);
                setPatient(prev => ({ ...prev, photoUrl: undefined }));
                if (onUpdatePatient) onUpdatePatient({ id: patient.id, photoUrl: undefined });
                toast.success('Foto de perfil removida com sucesso!');
            } catch (err) {
                console.error(err);
                toast.error('Erro ao remover foto de perfil');
            }
        };

        if (onRequestConfirm) {
            onRequestConfirm({
                title: 'Remover Foto de Perfil',
                description: 'Tem certeza que deseja remover a foto de perfil deste paciente?',
                confirmLabel: 'Remover Foto',
                variant: 'danger',
                onConfirm: executeDelete
            });
        } else {
            executeDelete();
        }
    };

    const handleOpenSignatureModal = (sessionId: string) => {
        setSessionToSign(sessionId);
        setShowSignatureModal(true);
    };

    const handleConfirmSignature = async (imageData: string, type: 'signature' | 'photo') => {
        if (!sessionToSign) return;
        try {
            const fileName = `session-${sessionToSign}-${Date.now()}.png`;
            const publicUrl = await storageApi.uploadBase64('signatures', fileName, imageData);
            await sessionsApi.update(sessionToSign, {
                status: SessionStatus.COMPLETED,
                signed: true,
                signatureUrl: publicUrl
            });

            setPatientHistory(prev => prev.map(s => s.id === sessionToSign ? {
                ...s,
                status: SessionStatus.COMPLETED,
                signed: true,
                signatureUrl: publicUrl
            } : s));

            toast.success(`Presença confirmada via ${type === 'signature' ? 'assinatura' : 'foto'}!`);
            setShowSignatureModal(false);
            setSessionToSign(null);
        } catch (error) {
            console.error('Error confirming presence:', error);
            toast.error('Erro ao salvar confirmação de presença');
        }
    };

    // Ações de Plano
    const handleOpenPlanModal = () => {
        if (patient.plan) {
            const match = planTemplates.find(t => t.name === patient.plan?.name);
            if (match) {
                setSelectedPlanTemplateId(match.id);
                setCustomPlanName(match.name);
            } else {
                setSelectedPlanTemplateId('custom');
                setCustomPlanName(patient.plan.name);
            }
            setPlanTotalSessions(patient.plan.totalSessions || 10);
            setPlanRemainingSessions(patient.plan.remainingSessions || 10);
            setPlanTotalPaid(patient.plan.totalPaid || 0);
            setPlanPaymentStatus(patient.plan.paymentStatus === 'paid' ? 'paid' : 'pending');
            setPlanPaymentMethod(patient.plan.paymentMethod || 'pix');
        } else {
            setSelectedPlanTemplateId(planTemplates[0]?.id || 'custom');
            if (planTemplates[0]) {
                setCustomPlanName(planTemplates[0].name);
                setPlanTotalSessions(planTemplates[0].sessions);
                setPlanRemainingSessions(planTemplates[0].sessions);
                setPlanTotalPaid(planTemplates[0].price);
            }
            setPlanPaymentStatus('paid');
            setPlanPaymentMethod('pix');
        }
        setIsPlanModalOpen(true);
    };

    const handleSelectTemplate = (templateId: string) => {
        setSelectedPlanTemplateId(templateId);
        if (templateId === 'avulso') {
            setCustomPlanName('Particular / Avulso');
            setPlanTotalSessions(0);
            setPlanRemainingSessions(0);
            setPlanTotalPaid(0);
            setPlanExpiryDays(365);
        } else if (templateId === 'custom') {
            setCustomPlanName('');
            setPlanTotalSessions(10);
            setPlanRemainingSessions(10);
            setPlanTotalPaid(0);
        } else {
            const t = planTemplates.find(tpl => tpl.id === templateId);
            if (t) {
                setCustomPlanName(t.name);
                setPlanTotalSessions(t.sessions);
                setPlanRemainingSessions(t.sessions);
                setPlanTotalPaid(t.price);
            }
        }
    };

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingPlan(true);
        try {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + planExpiryDays);

            const planPayload = {
                name: customPlanName.trim() || 'Plano Personalizado',
                totalSessions: Number(planTotalSessions),
                remainingSessions: Number(planRemainingSessions),
                expiresAt: expiryDate.toISOString(),
                totalPaid: Number(planTotalPaid) || 0,
                paymentStatus: planPaymentStatus,
                paymentDate: planPaymentStatus === 'paid' ? new Date().toISOString() : undefined,
                paymentMethod: planPaymentMethod
            };

            await patientsApi.update(patient.id, { plan: planPayload });
            setPatient(prev => ({ ...prev, plan: planPayload }));
            if (onUpdatePatient) onUpdatePatient({ id: patient.id, plan: planPayload });

            toast.success('Plano vinculado com sucesso!');
            setIsPlanModalOpen(false);
        } catch (error) {
            console.error('Erro ao salvar plano:', error);
            toast.error('Erro ao vincular plano ao paciente.');
        } finally {
            setSavingPlan(false);
        }
    };

    // Ações de Edição de Dados Pessoais
    const handleSaveInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editCpf && !validateCpf(editCpf)) {
            toast.error('CPF inválido. Por favor, verifique os números.');
            return;
        }

        setSavingInfo(true);
        try {
            const formattedAddress = [
                editStreet,
                editNumber ? `nº ${editNumber}` : '',
                editBairro ? `Bairro ${editBairro}` : '',
                editComplement
            ].filter(Boolean).join(', ');

            const updates: Partial<Patient> = {
                name: editName.trim(),
                phone: editPhone.trim(),
                cpf: editCpf.trim() || undefined,
                birthDate: editBirthDate || undefined,
                cep: editCep || undefined,
                street: editStreet || undefined,
                number: editNumber || undefined,
                bairro: editBairro || undefined,
                city: editCity || undefined,
                complement: editComplement || undefined,
                address: formattedAddress || undefined
            };

            await patientsApi.update(patient.id, updates);
            setPatient(prev => ({ ...prev, ...updates }));
            if (onUpdatePatient) onUpdatePatient({ id: patient.id, ...updates });

            toast.success('Dados cadastrais atualizados com sucesso!');
            setIsEditingInfo(false);
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
            toast.error('Erro ao salvar alterações do paciente.');
        } finally {
            setSavingInfo(false);
        }
    };

    const handleCepSearch = async (val: string) => {
        const masked = maskCep(val);
        setEditCep(masked);
        const clean = masked.replace(/\D/g, '');
        if (clean.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    if (data.localidade && data.uf) setEditCity(`${data.localidade} - ${data.uf}`);
                    if (data.logradouro) setEditStreet(data.logradouro);
                    if (data.bairro) setEditBairro(data.bairro);
                    toast.success('Endereço localizado via CEP!');
                }
            } catch (err) {
                console.error(err);
            }
        }
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
                    @media print { @page { size: A4; margin: 15mm; } body { padding: 0; } }
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
                    <div class="info-item"><label>Nome Completo</label><span>${patient.name}</span></div>
                    <div class="info-item"><label>Telefone</label><span>${patient.phone}</span></div>
                    <div class="info-item"><label>CPF</label><span>${patient.cpf || '-'}</span></div>
                    <div class="info-item"><label>Plano Contratado</label><span>${patient.plan?.name || 'N/A'}</span></div>
                </div>

                <div class="section-header">Registro de Presença</div>
                <table class="sessions-table">
                    <thead>
                        <tr>
                            <th style="width: 5%">#</th>
                            <th style="width: 15%">Data</th>
                            <th style="width: 15%">Horário</th>
                            <th style="width: 25%">Profissional</th>
                            <th style="width: 15%">Status</th>
                            <th style="width: 25%">Assinatura do Paciente</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.from({ length: patient.plan?.totalSessions || 10 }).map((_, index) => {
                            const session = patientHistory[index];
                            const dateStr = session ? new Date(session.date + 'T00:00:00').toLocaleDateString('pt-BR') : '____/____/____';
                            const timeStr = session ? session.time : '____:____';
                            const prof = session ? professionals.find(p => p.id === session.professionalId)?.name || '-' : '_________________';
                            const statusStr = session ? session.status : 'Pendente';
                            return `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${dateStr}</td>
                                    <td>${timeStr}</td>
                                    <td>${prof}</td>
                                    <td>${statusStr}</td>
                                    <td><div class="signature-box"></div></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <div class="footer">Documento gerado pelo sistema FisioStar - Sistema de Gestão para Clínicas de Fisioterapia</div>
            </body>
            </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    return (
        <div className="space-y-4 animate-fade-in pb-10">
            {/* Top Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:px-6 rounded-2xl border border-gray-200/90 shadow-xs">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
                        title="Voltar para lista de pacientes"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        <span>Voltar para Pacientes</span>
                    </button>
                    <div className="h-6 w-px bg-gray-200 hidden sm:block" />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Prontuário Clínico</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{unitName}</span>
                        </div>
                        <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">{patient.name}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrint}
                        className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                        <Printer className="w-4 h-4 text-gray-500" />
                        <span>Imprimir Ficha</span>
                    </button>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[750px]">
                {/* Left Sidebar */}
                <div className="w-full lg:w-80 bg-gray-50/70 border-r border-gray-200/80 p-6 flex flex-col items-center flex-shrink-0">
                    <div className="relative group mb-4">
                        <div className="w-32 h-32 rounded-full overflow-hidden shadow-md border-4 border-white relative bg-white">
                            {currentPhoto ? (
                                <img src={currentPhoto} alt={patient.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-4xl">
                                    {patient.name.charAt(0)}
                                </div>
                            )}

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
                                            setPatient(prev => ({ ...prev, photoUrl: publicUrl }));
                                            if (onUpdatePatient) onUpdatePatient({ id: patient.id, photoUrl: publicUrl });
                                            toast.success('Foto atualizada!');
                                        } catch (err) {
                                            console.error(err);
                                            toast.error('Erro ao enviar foto');
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        <div className="absolute bottom-0 right-0 flex items-center gap-1 z-10">
                            {currentPhoto && (
                                <button
                                    type="button"
                                    onClick={handleDeletePhoto}
                                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md transition-transform hover:scale-105"
                                    title="Excluir foto de perfil"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleStartCamera}
                                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-md transition-transform hover:scale-105"
                                title="Tirar foto com câmera"
                            >
                                <Camera className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-center text-gray-900 leading-snug">{patient.name}</h2>
                    <a
                        href={getWhatsappUrl(patient.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1.5 hover:underline mb-4 mt-1 transition-colors"
                        title="Abrir conversa no WhatsApp"
                    >
                        <PhoneIcon className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                        <span>{patient.phone}</span>
                    </a>

                    {/* Resumo do Plano Atual na Lateral */}
                    <div className="w-full bg-white p-3.5 rounded-xl border border-gray-200/90 shadow-2xs mb-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Plano Ativo</span>
                            <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${patient.plan && patient.plan.remainingSessions > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                                {patient.plan ? (patient.plan.remainingSessions > 0 ? 'Ativo' : 'Esgotado') : 'Sem Plano'}
                            </span>
                        </div>
                        <p className="text-sm font-extrabold text-gray-900 truncate">{patient.plan?.name || 'Nenhum plano vinculado'}</p>
                        <p className="text-xs text-blue-600 font-bold mt-0.5">
                            {patient.plan?.remainingSessions || 0} de {patient.plan?.totalSessions || 0} sessões restantes
                        </p>
                    </div>

                    {/* Botões Rápidos e Intuitivos */}
                    <div className="w-full flex flex-col gap-2 mb-4">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('info');
                                setIsEditingInfo(true);
                            }}
                            className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center shadow-xs cursor-pointer"
                        >
                            Editar Dados Pessoais
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('financial');
                                handleOpenPlanModal();
                            }}
                            className="w-full py-2.5 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center cursor-pointer"
                        >
                            Vincular / Renovar Plano
                        </button>

                        {onOpenFacialScan && (
                            <button
                                onClick={() => onOpenFacialScan(patient)}
                                className="w-full py-2.5 px-3 text-xs font-semibold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition-all flex items-center justify-center cursor-pointer"
                                title="Escanear biometria facial do paciente"
                            >
                                <span>{patient.facialDescriptor ? 'Face Cadastrada ✓' : 'Escanear Biometria'}</span>
                            </button>
                        )}

                        <div className="flex gap-2 w-full mt-1">
                            {onToggleStatus && (
                                <button
                                    onClick={() => onToggleStatus(patient)}
                                    className={`flex-1 py-2 px-2 text-xs font-semibold rounded-xl border transition-colors flex items-center justify-center cursor-pointer ${patient.status === 'Active' ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
                                >
                                    {patient.status === 'Active' ? 'Inativar' : 'Ativar'}
                                </button>
                            )}

                            {onDelete && (
                                <button
                                    onClick={() => {
                                        if (confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.')) {
                                            onClose();
                                            onDelete(patient.id);
                                        }
                                    }}
                                    className="py-2 px-3 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer"
                                    title="Excluir paciente"
                                >
                                    Excluir
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Content: Tabs */}
                <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
                    <div className="border-b border-gray-200 bg-gray-50/70 px-4 sm:px-6 overflow-x-auto custom-scrollbar">
                        <nav className="flex gap-1" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('signatures')}
                                className={`py-4 px-3.5 border-b-2 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'signatures' ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/60'}`}
                            >
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span>Sessões & Presença</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('evaluations')}
                                className={`py-4 px-3.5 border-b-2 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'evaluations' ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/60'}`}
                            >
                                <Stethoscope className="w-4 h-4 text-teal-600" />
                                <span>Avaliações</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'evaluations' ? 'bg-teal-100 text-teal-800' : 'bg-gray-200/80 text-gray-600'}`}>{evaluations.length}</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('evolutions')}
                                className={`py-4 px-3.5 border-b-2 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'evolutions' ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/60'}`}
                            >
                                <Activity className="w-4 h-4 text-purple-600" />
                                <span>Evoluções</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'evolutions' ? 'bg-purple-100 text-purple-800' : 'bg-gray-200/80 text-gray-600'}`}>{evolutions.length}</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('contracts')}
                                className={`py-4 px-3.5 border-b-2 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'contracts' ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/60'}`}
                            >
                                <ShieldCheck className="w-4 h-4 text-amber-600" />
                                <span>Contratos & Docs</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'contracts' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200/80 text-gray-600'}`}>{contracts.length}</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('financial')}
                                className={`py-4 px-3.5 border-b-2 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'financial' ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/60'}`}
                            >
                                <CreditCard className="w-4 h-4 text-emerald-600" />
                                <span>Financeiro & Plano</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('info')}
                                className={`py-4 px-3.5 border-b-2 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'info' ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/60'}`}
                            >
                                <User className="w-4 h-4 text-indigo-600" />
                                <span>Dados Pessoais</span>
                            </button>
                        </nav>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                        {/* TAB 1: SESSÕES & PRESENÇA */}
                        {activeTab === 'signatures' && (
                            <div className="space-y-5 animate-fade-in">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">Ficha de Presença & Controle</h3>
                                        <p className="text-xs text-gray-500">Histórico de atendimentos e confirmações de presença.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handlePrint}
                                            className="bg-gray-50 border border-gray-200 text-gray-700 hover:bg-white hover:border-blue-300 hover:text-blue-600 px-3.5 py-1.5 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                            Imprimir Ficha
                                        </button>
                                    </div>
                                </div>

                                {/* Sessions List */}
                                <div className="space-y-3">
                                    {loadingHistory ? (
                                        <div className="text-center py-8 text-gray-400">Carregando histórico...</div>
                                    ) : patientHistory.length > 0 ? (
                                        patientHistory.map((session, index) => (
                                            <div
                                                key={session.id}
                                                className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs hover:border-blue-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-100">
                                                        #{patientHistory.length - index}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-gray-900">
                                                                {new Date(session.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {session.time}
                                                            </span>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                                session.status === 'Realizada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                                session.status === 'Confirmada' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                                session.status === 'Cancelada' ? 'bg-red-50 text-red-700 border border-red-200' :
                                                                'bg-amber-50 text-amber-700 border border-amber-200'
                                                            }`}>
                                                                {session.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                                            <span>{session.type || 'Fisioterapia'}</span>
                                                            <span>•</span>
                                                            <span>{professionals.find(p => p.id === session.professionalId)?.name || 'Profissional não atribuído'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {session.status === 'Realizada' ? (
                                                        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs">
                                                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                            <span>Biometria Facial Confirmada</span>
                                                        </span>
                                                    ) : session.status === 'Cancelada' ? (
                                                        <span className="text-xs text-rose-500 font-medium">Sessão Cancelada</span>
                                                    ) : (
                                                        <span className="text-xs bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                            <span>Aguardando Check-in Biométrico</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 bg-white rounded-xl border border-gray-200 text-center text-gray-400 text-xs">
                                            Nenhuma sessão registrada para este paciente.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: AVALIAÇÕES CLÍNICAS */}
                        {activeTab === 'evaluations' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">Avaliações Clínicas (Anamneses)</h3>
                                        <p className="text-xs text-gray-500">Diagnóstico cinético-funcional, escala de dor EVA e plano terapêutico.</p>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedEvalToEdit(null); setIsEvalModalOpen(true); }}
                                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Nova Avaliação
                                    </button>
                                </div>

                                {loadingClinical ? (
                                    <div className="p-8 text-center text-gray-400 text-xs">Carregando avaliações...</div>
                                ) : evaluations.length > 0 ? (
                                    <div className="space-y-3">
                                        {evaluations.map(ev => (
                                            <div
                                                key={ev.id}
                                                className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs hover:border-blue-200 transition-all flex justify-between items-start"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-gray-900">
                                                            {new Date(ev.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                        </span>
                                                        <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md font-bold border border-teal-200">
                                                            {ev.specialty || 'Fisioterapia'}
                                                        </span>
                                                        {ev.painLevel !== undefined && (
                                                            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-bold border border-amber-200">
                                                                EVA: {ev.painLevel}/10
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-700 font-medium"><strong>Queixa Principal:</strong> {ev.chiefComplaint}</p>
                                                </div>

                                                <button
                                                    onClick={() => { setSelectedEvalToEdit(ev); setIsEvalModalOpen(true); }}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                                                    title="Editar / Visualizar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 bg-white rounded-xl border border-gray-200 text-center text-gray-400 text-xs">
                                        Nenhuma avaliação clínica cadastrada para este paciente.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: EVOLUÇÕES CLÍNICAS */}
                        {activeTab === 'evolutions' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">Evoluções Clínicas Diárias (SOAPE)</h3>
                                        <p className="text-xs text-gray-500">Registro diário de condutas com imutabilidade de 24h.</p>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedEvolToEdit(null); setIsEvolModalOpen(true); }}
                                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Nova Evolução
                                    </button>
                                </div>

                                {loadingClinical ? (
                                    <div className="p-8 text-center text-gray-400 text-xs">Carregando evoluções...</div>
                                ) : evolutions.length > 0 ? (
                                    <div className="space-y-3">
                                        {evolutions.map(evo => (
                                            <div
                                                key={evo.id}
                                                className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs hover:border-blue-200 transition-all flex justify-between items-start"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-gray-900">
                                                            {new Date(evo.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {evo.time?.slice(0, 5)}
                                                        </span>
                                                        {evo.painLevel !== undefined && (
                                                            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-bold border border-purple-200">
                                                                Dor EVA: {evo.painLevel}/10
                                                            </span>
                                                        )}
                                                        {evo.isLocked && (
                                                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-bold">
                                                                🔒 Bloqueado 24h
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-800 font-medium"><strong>Conduta:</strong> {evo.conduct}</p>
                                                </div>

                                                <button
                                                    onClick={() => { setSelectedEvolToEdit(evo); setIsEvolModalOpen(true); }}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                                                    title="Editar / Visualizar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 bg-white rounded-xl border border-gray-200 text-center text-gray-400 text-xs">
                                        Nenhuma evolução diária registrada para este paciente.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 4: CONTRATOS & DOCUMENTOS */}
                        {activeTab === 'contracts' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">Contratos, Termos & Atestados</h3>
                                        <p className="text-xs text-gray-500">Documentos assinados com registro criptográfico SHA-256 e emissão de atestados.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsDocGenModalOpen(true)}
                                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                        >
                                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                                            Emitir Atestado/Recibo
                                        </button>
                                        <button
                                            onClick={() => { setSelectedContractToView(null); setIsContractModalOpen(true); }}
                                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Novo Contrato
                                        </button>
                                    </div>
                                </div>

                                {loadingClinical ? (
                                    <div className="p-8 text-center text-gray-400 text-xs">Carregando contratos...</div>
                                ) : contracts.length > 0 ? (
                                    <div className="space-y-3">
                                        {contracts.map(cnt => (
                                            <div
                                                key={cnt.id}
                                                className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs hover:border-blue-200 transition-all flex justify-between items-start"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-gray-900">{cnt.title}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                                                            cnt.status === 'signed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                            'bg-amber-50 text-amber-700 border border-amber-200'
                                                        }`}>
                                                            {cnt.status === 'signed' ? '✓ Assinado Digitalmente' : 'Pendente de Assinatura'}
                                                        </span>
                                                    </div>
                                                    {cnt.documentHash && (
                                                        <p className="text-[11px] text-gray-400 font-mono">
                                                            SHA-256: {cnt.documentHash.slice(0, 16)}...{cnt.documentHash.slice(-8)}
                                                        </p>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => { setSelectedContractToView(cnt); setIsContractModalOpen(true); }}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                                                    title="Visualizar Contrato"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 bg-white rounded-xl border border-gray-200 text-center text-gray-400 text-xs">
                                        Nenhum contrato ou termo emitido para este paciente.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 5: FINANCEIRO & PLANOS (Super Intuitivo para Secretária) */}
                        {activeTab === 'financial' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">Controle de Planos & Sessões</h3>
                                        <p className="text-xs text-gray-500">Vincule novos pacotes, renove sessões ou altere o plano deste paciente.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleOpenPlanModal}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        {patient.plan ? 'Trocar / Renovar Plano' : 'Vincular Primeiro Plano'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Card do Plano Atual */}
                                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Plano Atual Contratado</span>
                                            <p className="text-2xl font-extrabold text-gray-900 mb-2">{patient.plan?.name || 'Nenhum plano ativo'}</p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${patient.plan && patient.plan.remainingSessions > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                                                    {patient.plan ? (patient.plan.remainingSessions > 0 ? 'Ativo' : 'Esgotado') : 'Inativo'}
                                                </span>
                                                {patient.plan?.expiresAt && (
                                                    <span className="text-xs text-gray-500 font-medium">
                                                        Validade: {new Date(patient.plan.expiresAt).toLocaleDateString('pt-BR')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                            <div>
                                                <span className="text-xs text-gray-400 block font-medium">Valor Contratado</span>
                                                <span className="text-sm font-bold text-gray-900">
                                                    {patient.plan?.totalPaid ? `R$ ${patient.plan.totalPaid.toFixed(2)}` : 'R$ 0,00'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-400 block font-medium">Pagamento</span>
                                                <span className={`text-xs font-bold ${patient.plan?.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                    {patient.plan?.paymentStatus === 'paid' ? '✓ Quitado' : '⏳ Pendente'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card de Saldo de Sessões */}
                                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Saldo de Sessões Restantes</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-extrabold text-blue-600">
                                                    {patient.plan?.remainingSessions || 0}
                                                </span>
                                                <span className="text-gray-400 text-sm font-semibold">
                                                    / {patient.plan?.totalSessions || 0} totais
                                                </span>
                                            </div>
                                            {patient.plan && (
                                                <div className="w-full bg-gray-100 rounded-full h-2.5 mt-4 overflow-hidden">
                                                    <div
                                                        className="bg-blue-600 h-2.5 rounded-full transition-all"
                                                        style={{ width: `${((patient.plan.remainingSessions || 0) / (patient.plan.totalSessions || 1)) * 100}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!patient.plan) return;
                                                    const newRemaining = (patient.plan.remainingSessions || 0) + 1;
                                                    const updatedPlan = { ...patient.plan, remainingSessions: newRemaining };
                                                    await patientsApi.update(patient.id, { plan: updatedPlan });
                                                    setPatient(prev => ({ ...prev, plan: updatedPlan }));
                                                    if (onUpdatePatient) onUpdatePatient({ id: patient.id, plan: updatedPlan });
                                                    toast.success('+1 Sessão adicionada ao saldo!');
                                                }}
                                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                            >
                                                +1 Sessão Bônus
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 6: DADOS PESSOAIS (Com Edição Direta e Clara) */}
                        {activeTab === 'info' && (
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs animate-fade-in">
                                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                                            <User className="w-5 h-5 text-blue-600" />
                                            Dados Cadastrais do Paciente
                                        </h3>
                                        <p className="text-xs text-gray-500">Informações pessoais e endereço completo para prontuário.</p>
                                    </div>
                                    {!isEditingInfo ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditName(patient.name);
                                                setEditCpf(patient.cpf || '');
                                                setEditPhone(patient.phone);
                                                setEditBirthDate(patient.birthDate || '');
                                                setEditCep(patient.cep || '');
                                                setEditStreet(patient.street || '');
                                                setEditNumber(patient.number || '');
                                                setEditBairro(patient.bairro || '');
                                                setEditCity(patient.city || '');
                                                setEditComplement(patient.complement || '');
                                                setIsEditingInfo(true);
                                            }}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            Editar Dados
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingInfo(false)}
                                                className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveInfo}
                                                disabled={savingInfo}
                                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                                            >
                                                <Save className="w-3.5 h-3.5" />
                                                {savingInfo ? 'Salvando...' : 'Salvar Alterações'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {!isEditingInfo ? (
                                    /* Modo Visualização */
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Identificação</h4>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nome Completo</label>
                                                <p className="text-gray-900 font-semibold bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-100 text-sm">{patient.name}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">CPF</label>
                                                    <p className="text-gray-900 font-semibold bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-100 text-sm">{patient.cpf || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nascimento</label>
                                                    <p className="text-gray-900 font-semibold bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-100 text-sm">
                                                        {patient.birthDate ? new Date(patient.birthDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contato & Localização</h4>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Telefone / WhatsApp</label>
                                                <p className="text-gray-900 font-semibold bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-100 text-sm">{patient.phone}</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Endereço Completo</label>
                                                <p className="text-gray-900 font-semibold bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-100 text-sm">{patient.address || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Modo Edição */
                                    <form onSubmit={handleSaveInfo} className="space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                            <div className="md:col-span-6">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Nome Completo *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900"
                                                />
                                            </div>

                                            <div className="md:col-span-3">
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">CPF</label>
                                                    {editCpf.replace(/\D/g, '').length === 11 && (
                                                        validateCpf(editCpf) ? (
                                                            <span className="text-[10px] font-bold text-emerald-600">✓ Válido</span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-red-500">⚠️ Inválido</span>
                                                        )
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    maxLength={14}
                                                    value={editCpf}
                                                    onChange={e => setEditCpf(maskCpf(e.target.value))}
                                                    placeholder="000.000.000-00"
                                                    className={`w-full px-3.5 py-2 border rounded-xl focus:ring-2 outline-none text-sm ${
                                                        editCpf.replace(/\D/g, '').length === 11
                                                            ? validateCpf(editCpf)
                                                                ? 'border-emerald-500 bg-emerald-50/20 text-gray-900 focus:ring-emerald-500'
                                                                : 'border-red-500 bg-red-50/20 text-red-900 focus:ring-red-500'
                                                            : 'border-gray-200 bg-white text-gray-900 focus:ring-blue-500'
                                                    }`}
                                                />
                                            </div>

                                            <div className="md:col-span-3">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Data de Nascimento</label>
                                                <input
                                                    type="date"
                                                    value={editBirthDate}
                                                    onChange={e => setEditBirthDate(e.target.value)}
                                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900"
                                                />
                                            </div>

                                            <div className="md:col-span-4">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Telefone / WhatsApp *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={editPhone}
                                                    onChange={e => setEditPhone(maskPhone(e.target.value))}
                                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900"
                                                />
                                            </div>

                                            <div className="md:col-span-4">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">CEP (Busca Automática)</label>
                                                <input
                                                    type="text"
                                                    maxLength={9}
                                                    value={editCep}
                                                    onChange={e => handleCepSearch(e.target.value)}
                                                    placeholder="00000-000"
                                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900"
                                                />
                                            </div>

                                            <div className="md:col-span-4">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Cidade</label>
                                                <input
                                                    type="text"
                                                    value={editCity}
                                                    onChange={e => setEditCity(e.target.value)}
                                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900"
                                                />
                                            </div>

                                            <div className="md:col-span-6">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Rua / Logradouro</label>
                                                <input
                                                    type="text"
                                                    value={editStreet}
                                                    onChange={e => setEditStreet(e.target.value)}
                                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900"
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Número</label>
                                                <input
                                                    type="text"
                                                    value={editNumber}
                                                    onChange={e => setEditNumber(e.target.value)}
                                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900"
                                                />
                                            </div>

                                            <div className="md:col-span-4">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Bairro</label>
                                                <input
                                                    type="text"
                                                    value={editBairro}
                                                    onChange={e => setEditBairro(e.target.value)}
                                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900"
                                                />
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Modais Clínicos */}
                    {isEvalModalOpen && (
                        <EvaluationModal
                            isOpen={isEvalModalOpen}
                            onClose={() => { setIsEvalModalOpen(false); setSelectedEvalToEdit(null); }}
                            patientId={patient.id}
                            existingEvaluation={selectedEvalToEdit}
                            currentUnit={currentUnit}
                            onSave={(savedEval) => {
                                setEvaluations(prev => {
                                    const idx = prev.findIndex(e => e.id === savedEval.id);
                                    if (idx >= 0) {
                                        const copy = [...prev];
                                        copy[idx] = savedEval;
                                        return copy;
                                    }
                                    return [savedEval, ...prev];
                                });
                            }}
                        />
                    )}

                    {isEvolModalOpen && (
                        <EvolutionModal
                            isOpen={isEvolModalOpen}
                            onClose={() => { setIsEvolModalOpen(false); setSelectedEvolToEdit(null); }}
                            patientId={patient.id}
                            existingEvolution={selectedEvolToEdit}
                            currentUnit={currentUnit}
                            onSave={(savedEvol) => {
                                setEvolutions(prev => {
                                    const idx = prev.findIndex(e => e.id === savedEvol.id);
                                    if (idx >= 0) {
                                        const copy = [...prev];
                                        copy[idx] = savedEvol;
                                        return copy;
                                    }
                                    return [savedEvol, ...prev];
                                });
                            }}
                        />
                    )}

                    {isContractModalOpen && (
                        <ContractModal
                            isOpen={isContractModalOpen}
                            onClose={() => { setIsContractModalOpen(false); setSelectedContractToView(null); }}
                            patientId={patient.id}
                            existingContract={selectedContractToView}
                            currentUnit={currentUnit}
                            onSave={(savedContract) => {
                                setContracts(prev => {
                                    const idx = prev.findIndex(c => c.id === savedContract.id);
                                    if (idx >= 0) {
                                        const copy = [...prev];
                                        copy[idx] = savedContract;
                                        return copy;
                                    }
                                    return [savedContract, ...prev];
                                });
                            }}
                        />
                    )}

                    {isDocGenModalOpen && (
                        <DocumentGeneratorModal
                            isOpen={isDocGenModalOpen}
                            onClose={() => setIsDocGenModalOpen(false)}
                            patientId={patient.id}
                            currentUnit={currentUnit}
                        />
                    )}
                </div>
            </div>

            {/* Modal Dedicado de Vincular / Renovar Plano (Super Intuitivo) */}
            {isPlanModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={() => setIsPlanModalOpen(false)} />
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-fade-in border border-gray-100">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-bold">
                                    Vincular / Renovar Plano do Paciente
                                </h3>
                                <p className="text-xs text-emerald-100 mt-0.5">Paciente: <strong>{patient.name}</strong></p>
                            </div>
                            <button onClick={() => setIsPlanModalOpen(false)} className="text-white/80 hover:text-white p-1 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlan} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                    Escolha o Pacote / Plano
                                </label>
                                <select
                                    value={selectedPlanTemplateId}
                                    onChange={e => handleSelectTemplate(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                                >
                                    <option value="avulso">Particular / Avulso (Sem Plano)</option>
                                    <optgroup label="Planos e Pacotes Cadastrados">
                                        {planTemplates.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} ({t.sessions} sessões) - R$ {t.price.toFixed(2)}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <option value="custom">Personalizado (Outro Nome)</option>
                                </select>
                            </div>

                            {selectedPlanTemplateId === 'custom' && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Nome do Plano Personalizado</label>
                                    <input
                                        type="text"
                                        required
                                        value={customPlanName}
                                        onChange={e => setCustomPlanName(e.target.value)}
                                        placeholder="Ex: Pacote Especial 15 Sessões"
                                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Total de Sessões</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={planTotalSessions}
                                        onChange={e => {
                                            const v = Number(e.target.value);
                                            setPlanTotalSessions(v);
                                            setPlanRemainingSessions(v);
                                        }}
                                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Saldo Inicial</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={planRemainingSessions}
                                        onChange={e => setPlanRemainingSessions(Number(e.target.value))}
                                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Valor do Pacote (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={planTotalPaid}
                                        onChange={e => setPlanTotalPaid(Number(e.target.value))}
                                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Validade (Dias)</label>
                                    <input
                                        type="number"
                                        value={planExpiryDays}
                                        onChange={e => setPlanExpiryDays(Number(e.target.value))}
                                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Forma de Pagamento</label>
                                    <select
                                        value={planPaymentMethod}
                                        onChange={e => setPlanPaymentMethod(e.target.value)}
                                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50 focus:bg-white outline-none cursor-pointer"
                                    >
                                        <option value="pix">Pix</option>
                                        <option value="credit_card">Cartão de Crédito</option>
                                        <option value="debit_card">Cartão de Débito</option>
                                        <option value="cash">Dinheiro</option>
                                        <option value="boleto">Boleto</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Status Pagamento</label>
                                    <select
                                        value={planPaymentStatus}
                                        onChange={e => setPlanPaymentStatus(e.target.value as 'paid' | 'pending')}
                                        className={`w-full px-3.5 py-2 border rounded-xl text-xs font-bold outline-none cursor-pointer ${planPaymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                                    >
                                        <option value="paid">✓ Pago (Confirmado)</option>
                                        <option value="pending">⏳ Pagamento Pendente</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsPlanModalOpen(false)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingPlan}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                    {savingPlan ? 'Salvando...' : 'Salvar e Ativar Plano'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Camera Overlay Modal */}
            {showCamera && (
                <div className="fixed inset-0 z-[80] bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
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
            )}

            {/* Session Signature Modal */}
            {showSignatureModal && (
                <SignatureModal
                    title="Assinar Sessão"
                    description="Desenhe sua assinatura ou tire uma foto para confirmar a sessão."
                    onConfirm={handleConfirmSignature}
                    onCancel={() => { setShowSignatureModal(false); setSessionToSign(null); }}
                />
            )}
        </div>
    );
};
