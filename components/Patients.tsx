
import React, { useState, useRef } from 'react';
import { Search, Filter, MoreHorizontal, UserPlus, FileText, X, Camera, FileSignature, CheckCircle, Clock, UploadCloud, User, Printer, Check, Phone as PhoneIcon, CreditCard, Save, MapPin, Calendar as CalendarIcon, Hash } from 'lucide-react';
import { PATIENTS, SESSIONS, PROFESSIONALS, UNITS, PLAN_TEMPLATES } from '../constants';
import { UnitId, Patient, SessionStatus, PlanTemplate } from '../types';

interface PatientsProps {
    currentUnit: UnitId;
}

const Patients: React.FC<PatientsProps> = ({ currentUnit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  // Use state for patients to allow addition
  const [patientsList, setPatientsList] = useState<Patient[]>(PATIENTS);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredPatients = patientsList.filter(p => 
    p.unitId === currentUnit && 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreatePatient = (newPatient: Patient) => {
      setPatientsList([newPatient, ...patientsList]);
      setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-gray-500">Gerencie prontuários, planos e assinaturas.</p>
        </div>
        <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Novo Paciente
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
                type="text" 
                placeholder="Buscar por nome, CPF ou telefone..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-900 placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium">
            <Filter className="w-4 h-4" />
            Filtros
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4 font-medium">Paciente</th>
                        <th className="px-6 py-4 font-medium">Plano Atual</th>
                        <th className="px-6 py-4 font-medium">Saldo Sessões</th>
                        <th className="px-6 py-4 font-medium">Vencimento</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredPatients.length > 0 ? filteredPatients.map(patient => (
                        <tr 
                            key={patient.id} 
                            onClick={() => setSelectedPatient(patient)}
                            className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                        >
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    {patient.photoUrl ? (
                                        <img src={patient.photoUrl} alt={patient.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                            {patient.name.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{patient.name}</span>
                                        <span className="text-xs text-gray-400">{patient.phone}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                                {patient.plan.name}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2 w-20">
                                        <div 
                                            className="bg-blue-600 h-2 rounded-full" 
                                            style={{ width: `${(patient.plan.remainingSessions / patient.plan.totalSessions) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-gray-600">{patient.plan.remainingSessions}/{patient.plan.totalSessions}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                                {new Date(patient.plan.expiresAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${patient.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {patient.status === 'Active' ? 'Ativo' : 'Inativo'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button className="text-gray-400 hover:text-blue-600 transition-colors p-1">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                Nenhum paciente encontrado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
         </div>
      </div>

      {/* Patient Details Modal */}
      {selectedPatient && (
          <PatientDetailModal 
            patient={selectedPatient} 
            onClose={() => setSelectedPatient(null)} 
            currentUnit={currentUnit}
          />
      )}

      {/* Create Patient Modal */}
      {isCreateModalOpen && (
          <CreatePatientModal 
            onClose={() => setIsCreateModalOpen(false)}
            onSave={handleCreatePatient}
            currentUnit={currentUnit}
          />
      )}
    </div>
  );
};

// --- Sub-component: Create Patient Modal ---

const CreatePatientModal = ({ onClose, onSave, currentUnit }: { onClose: () => void, onSave: (p: Patient) => void, currentUnit: UnitId }) => {
    // Basic Info
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [birthDate, setBirthDate] = useState('');
    
    // Contact & Address
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    
    // Treatment
    const [selectedPlanId, setSelectedPlanId] = useState('');
    
    const activePlans = PLAN_TEMPLATES.filter(p => p.active);
    const unitName = UNITS.find(u => u.id === currentUnit)?.name;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const planTemplate = PLAN_TEMPLATES.find(p => p.id === selectedPlanId);
        
        if (!name || !planTemplate) return;

        // Calculate expiration (e.g., 30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const newPatient: Patient = {
            id: `p-${Date.now()}`,
            name,
            phone: phone || '(00) 00000-0000',
            cpf,
            birthDate,
            address,
            city,
            unitId: currentUnit,
            status: 'Active',
            plan: {
                name: planTemplate.name,
                totalSessions: planTemplate.sessions,
                remainingSessions: planTemplate.sessions,
                expiresAt: expiresAt.toISOString()
            },
            lastVisit: undefined
        };

        onSave(newPatient);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl relative z-10 animate-fade-in flex flex-col max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <UserPlus className="w-6 h-6 text-blue-600" />
                            Novo Prontuário
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Unidade: <span className="font-semibold">{unitName}</span></p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto">
                    <div className="p-6 space-y-8">
                        
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
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 placeholder:text-gray-400"
                                            placeholder="000.000.000-00"
                                            value={cpf}
                                            onChange={e => setCpf(e.target.value)}
                                        />
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
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                            placeholder="(00) 90000-0000"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
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
                                <CreditCard className="w-4 h-4 text-blue-600" />
                                Plano de Tratamento
                            </h3>
                            <div className="relative">
                                <select 
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 appearance-none shadow-sm"
                                    value={selectedPlanId}
                                    onChange={e => setSelectedPlanId(e.target.value)}
                                >
                                    <option value="">Selecione um plano inicial...</option>
                                    {activePlans.map(plan => (
                                        <option key={plan.id} value={plan.id}>
                                            {plan.name} - {plan.sessions} sessões - R$ {plan.price.toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                    </div>

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
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Salvar Prontuário
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Sub-component: Patient Detail Modal ---

const PatientDetailModal = ({ patient, onClose, currentUnit }: { patient: Patient, onClose: () => void, currentUnit: UnitId }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'signatures'>('signatures');
    const [currentPhoto, setCurrentPhoto] = useState(patient.photoUrl);
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    
    // Mock patient history state just for this modal instance
    const [patientHistory, setPatientHistory] = useState(
        SESSIONS.filter(s => s.patientId === patient.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );

    const handleStartCamera = async () => {
        setShowCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error(err);
            alert("Erro ao acessar câmera. Verifique se você deu permissão.");
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
                setCurrentPhoto(dataUrl);
                handleStopCamera();
            }
        }
    };

    const handleConfirmSignature = (sessionId: string) => {
        // Update local state to show as signed
        setPatientHistory(prev => prev.map(s => 
            s.id === sessionId ? { ...s, signed: true } : s
        ));
    };

    const handlePrint = () => {
        const unitName = UNITS.find(u => u.id === currentUnit)?.name || 'FisioStar';
        const printWindow = window.open('', '', 'width=900,height=700');

        if (!printWindow) {
            alert("O bloqueador de pop-ups impediu a impressão. Por favor, permita pop-ups para este site.");
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
                        <span>${patient.plan.name}</span>
                    </div>
                     <div class="info-item">
                        <label>Status do Plano</label>
                        <span>${patient.plan.remainingSessions} sessões restantes de ${patient.plan.totalSessions}</span>
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
                            const prof = PROFESSIONALS.find(p => p.id === session.professionalId);
                            return `
                                <tr>
                                    <td>${new Date(session.date).toLocaleDateString('pt-BR')}</td>
                                    <td>${session.time}</td>
                                    <td>${session.type}</td>
                                    <td>${prof?.name || '-'}</td>
                                    <td><div class="signature-box"></div></td>
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
            
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col md:flex-row animate-fade-in">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white rounded-full text-gray-500 hover:text-gray-900 z-20">
                    <X className="w-5 h-5" />
                </button>

                {/* Left Sidebar: Photo & Key Info */}
                <div className="w-full md:w-80 bg-gray-50 border-r border-gray-200 p-6 flex flex-col items-center">
                    <div className="relative group mb-4">
                        {currentPhoto ? (
                            <img src={currentPhoto} alt={patient.name} className="w-32 h-32 rounded-full object-cover shadow-md border-4 border-white" />
                        ) : (
                            <div className="w-32 h-32 rounded-full bg-blue-200 flex items-center justify-center text-blue-600 font-bold text-4xl shadow-md border-4 border-white">
                                {patient.name.charAt(0)}
                            </div>
                        )}
                        <button 
                            onClick={handleStartCamera}
                            className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg transition-transform hover:scale-105" 
                            title="Tirar foto com câmera"
                        >
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>

                    <h2 className="text-xl font-bold text-center text-gray-900">{patient.name}</h2>
                    <span className="text-sm text-gray-500 mb-6">{patient.phone}</span>

                    <div className="w-full space-y-3">
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Plano Ativo</p>
                            <p className="font-medium text-blue-700">{patient.plan.name}</p>
                        </div>
                         <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Saldo</p>
                            <p className="font-medium text-gray-900">{patient.plan.remainingSessions} de {patient.plan.totalSessions} sessões</p>
                        </div>
                    </div>

                    <div className="mt-auto w-full pt-6">
                         <button className="w-full py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                             <UploadCloud className="w-4 h-4" />
                             Upload Documento
                         </button>
                    </div>
                </div>

                {/* Right Content: Tabs */}
                <div className="flex-1 flex flex-col min-h-0 bg-white">
                    <div className="border-b border-gray-200">
                        <nav className="flex gap-6 px-6" aria-label="Tabs">
                            <button 
                                onClick={() => setActiveTab('signatures')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'signatures' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <FileSignature className="w-4 h-4" />
                                Ficha de Assinaturas
                            </button>
                            <button 
                                onClick={() => setActiveTab('info')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <User className="w-4 h-4" />
                                Dados Cadastrais
                            </button>
                        </nav>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'signatures' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div>
                                        <h3 className="font-bold text-gray-900">Gestão de Assinaturas Físicas</h3>
                                        <p className="text-sm text-gray-600">Imprima a ficha de presença para que o paciente assine fisicamente.</p>
                                    </div>
                                    <button 
                                        onClick={handlePrint}
                                        className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center gap-2"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Imprimir Ficha
                                    </button>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-4">Histórico de Sessões</h3>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        {patientHistory.length > 0 ? (
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-4 py-3">Data</th>
                                                        <th className="px-4 py-3">Procedimento</th>
                                                        <th className="px-4 py-3">Profissional</th>
                                                        <th className="px-4 py-3 text-center">Assinatura</th>
                                                        <th className="px-4 py-3 text-right">Ação</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {patientHistory.map(session => {
                                                        const prof = PROFESSIONALS.find(p => p.id === session.professionalId);
                                                        return (
                                                            <tr key={session.id} className="hover:bg-gray-50">
                                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                                    {new Date(session.date).toLocaleDateString('pt-BR')} <span className="text-gray-400 font-normal ml-1">{session.time}</span>
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600">{session.type}</td>
                                                                <td className="px-4 py-3 text-gray-600">{prof?.name}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {session.signed ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                                                                            <CheckCircle className="w-3 h-3" /> Assinado
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-medium border border-orange-100">
                                                                            <Clock className="w-3 h-3" /> Pendente
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    {!session.signed && (
                                                                         <button 
                                                                             onClick={() => handleConfirmSignature(session.id)}
                                                                             className="text-emerald-600 hover:text-emerald-800 font-medium text-xs border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 px-2 py-1 rounded transition-colors flex items-center gap-1 ml-auto"
                                                                             title="Confirmar que o paciente assinou no papel"
                                                                         >
                                                                             <Check className="w-3 h-3" />
                                                                             Confirmar
                                                                         </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="p-8 text-center text-gray-400">
                                                Nenhuma sessão registrada.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'info' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Informações Pessoais</h3>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Nome Completo</label>
                                        <input type="text" value={patient.name} readOnly className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700" />
                                    </div>
                                     <div>
                                        <label className="block text-xs font-medium text-gray-500">Telefone</label>
                                        <input type="text" value={patient.phone} readOnly className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">CPF</label>
                                        <input type="text" value={patient.cpf || ''} readOnly className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700" placeholder="Não informado" />
                                    </div>
                                </div>
                                 <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Endereço</h3>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Cidade</label>
                                        <input type="text" value={patient.city || ''} readOnly className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700" placeholder="Não informado" />
                                    </div>
                                     <div>
                                        <label className="block text-xs font-medium text-gray-500">Endereço</label>
                                        <input type="text" value={patient.address || ''} readOnly className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700" placeholder="Não informado" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Modal Footer */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                            Fechar
                        </button>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm">
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            </div>

            {/* Camera Overlay Modal */}
            {showCamera && (
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
            )}
        </div>
    );
};

export default Patients;
