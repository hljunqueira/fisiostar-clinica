import React, { useState, useEffect } from 'react';
import {
  X,
  Scan,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Activity,
  Layers,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Search,
  UserCheck,
  Camera,
  Smartphone,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { checkinApi, CheckInLog, CheckInResult } from '../../src/services/checkin-api';
import { Patient, UnitId } from '../../types';
import toast from 'react-hot-toast';
import { supabase } from '../../src/lib/supabase';

interface CheckInPresenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  currentUnit: UnitId;
  currentUser?: {
    id: string;
    name: string;
    role: string;
  } | null;
  onSuccess?: () => void;
}

export const CheckInPresenceModal: React.FC<CheckInPresenceModalProps> = ({
  isOpen,
  onClose,
  patients,
  currentUnit,
  currentUser,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'logs'>('quick');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<CheckInLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLogForNotes, setSelectedLogForNotes] = useState<CheckInLog | null>(null);
  const [notesText, setNotesText] = useState('');
  const [selectedLogForRevert, setSelectedLogForRevert] = useState<CheckInLog | null>(null);
  const [revertReason, setRevertReason] = useState('');

  // 🩺 Agendamento e Profissional do Paciente Selecionado Hoje
  const [todaySession, setTodaySession] = useState<{
    id: string;
    time: string;
    type: string;
    professionalName: string;
  } | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);

  // 📅 Filtros de Data e Paginação para Grandes Volumes (100+ alunos)
  const todayYMD = new Date().toISOString().split('T')[0];
  const [selectedLogDate, setSelectedLogDate] = useState<string>(todayYMD);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logFilterStatus, setLogFilterStatus] = useState<'all' | 'success' | 'reverted'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este registro de presença do histórico?')) return;
    try {
      const { error } = await supabase.from('checkin_logs').delete().eq('id', logId);
      if (error) throw error;
      toast.success('Registro de presença excluído com sucesso!');
      loadLogs(selectedLogDate);
      if (onSuccess) onSuccess();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir registro.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs(selectedLogDate);
    }
  }, [isOpen, currentUnit, selectedLogDate]);

  // Buscar agendamento de hoje quando o paciente é selecionado
  useEffect(() => {
    if (!selectedPatientId) {
      setTodaySession(null);
      return;
    }
    const fetchSession = async () => {
      try {
        setLoadingSession(true);
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('sessions')
          .select(`
            id,
            time,
            type,
            professionals (
              name
            )
          `)
          .eq('patient_id', selectedPatientId)
          .eq('date', today)
          .neq('status', 'Cancelada')
          .order('time', { ascending: true })
          .limit(1);

        if (data && data.length > 0) {
          setTodaySession({
            id: data[0].id,
            time: data[0].time?.substring(0, 5) || '--:--',
            type: data[0].type || 'Atendimento',
            professionalName: (data[0].professionals as any)?.name || 'Profissional da Clínica'
          });
        } else {
          setTodaySession(null);
        }
      } catch (e) {
        console.warn('Erro ao buscar agendamento de hoje:', e);
        setTodaySession(null);
      } finally {
        setLoadingSession(false);
      }
    };
    fetchSession();
  }, [selectedPatientId]);

  const loadLogs = async (targetDate?: string) => {
    try {
      setLoadingLogs(true);
      const dateToFetch = targetDate || selectedLogDate;
      const data = await checkinApi.getTodayLogs(currentUnit, dateToFetch);
      setLogs(data);
      setCurrentPage(1);
    } catch (e) {
      console.error('Error loading check-in logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const changeDateByDays = (days: number) => {
    const current = new Date(`${selectedLogDate}T12:00:00`);
    current.setDate(current.getDate() + days);
    const newDateStr = current.toISOString().split('T')[0];
    setSelectedLogDate(newDateStr);
  };

  if (!isOpen) return null;

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);
  const plan = selectedPatient?.plan;
  const remaining = plan?.remainingSessions ?? 0;

  const handleConfirmPresence = async () => {
    if (!selectedPatientId) {
      toast.error('Selecione um paciente');
      return;
    }

    try {
      setLoading(true);
      const res = await checkinApi.processCheckIn({
        patientId: selectedPatientId,
        unitId: currentUnit,
        method: 'manual_reception',
        deductSession: true
      });

      if (res.success) {
        toast.success(`Presença confirmada com ${res.professionalName || 'Profissional'}! Restam ${res.remainingSessions} de ${res.totalSessions} sessões.`);
        loadLogs();
        if (onSuccess) onSuccess();
        setSelectedPatientId('');
      } else {
        toast.error(res.message);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao registrar presença');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.cpf && p.cpf.includes(searchTerm))
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Presença & Biometria Facial</h2>
              <p className="text-xs text-gray-500">Validação de aula/sessão e débito automático</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#/totem"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-white border border-gray-200 text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
              title="Abrir Tela do Totem para Tablet"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Modo Totem</span>
            </a>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 px-6 bg-gray-50/50">
          <button
            onClick={() => setActiveTab('quick')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'quick'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Registrar Presença Rápida
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'logs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <span>Histórico de Check-ins de Hoje</span>
            <span className="bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
              {logs.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {activeTab === 'quick' && (
            <div className="space-y-6">
              {/* Patient Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Selecione o Paciente *
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome ou CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selecione um paciente...</option>
                  {filteredPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.cpf ? `(${p.cpf})` : ''} - {p.plan?.name || 'Sem plano'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Patient Card Preview */}
              {selectedPatient && (
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                        {selectedPatient.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{selectedPatient.name}</h4>
                        <p className="text-xs text-gray-500">{selectedPatient.phone || 'Sem telefone'}</p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full">
                      {plan?.name || 'Avulso / Particular'}
                    </span>
                  </div>

                  {/* Informações do Agendamento de Hoje */}
                  {loadingSession ? (
                    <div className="flex items-center gap-2 p-3 bg-white/80 rounded-xl border border-blue-100 text-xs text-gray-500">
                      <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Verificando agendamento para hoje...</span>
                    </div>
                  ) : todaySession ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Agendamento Confirmado para Hoje
                        </span>
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          ⏰ {todaySession.time}
                        </span>
                      </div>
                      <div className="text-gray-700 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div>
                          Profissional: <strong className="text-gray-900 font-bold">{todaySession.professionalName}</strong>
                        </div>
                        <div>
                          Modalidade: <strong className="text-blue-700 font-bold">{todaySession.type}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Sem agendamento para hoje ({new Date().toLocaleDateString('pt-BR')})</p>
                        <p className="text-amber-700 mt-0.5">O paciente precisa ter um atendimento agendado para realizar o check-in.</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100/60 text-xs">
                    <div>
                      <span className="text-gray-500">Sessões Restantes:</span>
                      <p className={`font-black text-sm ${remaining > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {remaining > 0 ? `${remaining} de ${plan?.totalSessions || 10} sessões` : '0 sessões (Esgotado)'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status para Check-in:</span>
                      <p className={`font-bold ${remaining > 0 && todaySession ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {!todaySession ? 'Bloqueado (Sem Agendamento)' : remaining > 0 ? 'Liberado (debita 1 sessão)' : 'Bloqueado (Renovar Plano)'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* iDFace Terminal Status Info */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Terminal Facial iDFace integrado e pronto para leitura</span>
                </div>
                <span className="text-[11px] text-gray-400 font-mono">Control iD API</span>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (() => {
            const filteredLogs = logs.filter((log) => {
              const term = logSearchTerm.trim().toLowerCase();
              const matchSearch =
                !term ||
                (log.patientName && log.patientName.toLowerCase().includes(term)) ||
                (log.patientCpf && log.patientCpf.includes(term)) ||
                (log.modality && log.modality.toLowerCase().includes(term)) ||
                (log.professionalName && log.professionalName.toLowerCase().includes(term));

              const matchStatus =
                logFilterStatus === 'all' ||
                (logFilterStatus === 'reverted' && log.status === 'reverted') ||
                (logFilterStatus === 'success' && log.status !== 'reverted');

              return matchSearch && matchStatus;
            });

            const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
            const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

            return (
              <div className="space-y-3">
                {/* Barra de Filtros, Data e Busca */}
                <div className="flex flex-col gap-2.5 p-3 bg-gray-50/90 rounded-2xl border border-gray-200">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {/* Seletor de Data */}
                    <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => changeDateByDays(-1)}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer"
                        title="Dia Anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1.5 px-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <input
                          type="date"
                          value={selectedLogDate}
                          onChange={(e) => setSelectedLogDate(e.target.value)}
                          className="text-xs font-bold font-mono text-gray-800 bg-transparent outline-none cursor-pointer"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => changeDateByDays(1)}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer"
                        title="Próximo Dia"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedLogDate !== todayYMD && (
                        <button
                          type="button"
                          onClick={() => setSelectedLogDate(todayYMD)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors cursor-pointer"
                        >
                          Ir para Hoje
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => loadLogs(selectedLogDate)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-colors cursor-pointer"
                        title="Recarregar histórico"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Campo de Busca & Filtro de Status */}
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative flex-1 w-full">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={logSearchTerm}
                        onChange={(e) => {
                          setLogSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Buscar por aluno, CPF, modalidade ou profissional..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => { setLogFilterStatus('all'); setCurrentPage(1); }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          logFilterStatus === 'all'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Todos ({logs.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLogFilterStatus('success'); setCurrentPage(1); }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          logFilterStatus === 'success'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Confirmados ({logs.filter(l => l.status !== 'reverted').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLogFilterStatus('reverted'); setCurrentPage(1); }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          logFilterStatus === 'reverted'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Estornados ({logs.filter(l => l.status === 'reverted').length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de Cards Paginados */}
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                    <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Nenhum registro encontrado para esta data ou filtro.</p>
                  </div>
                ) : (
                  paginatedLogs.map((log) => {
                    const isReverted = log.status === 'reverted';
                    const hadCredit = typeof log.remainingSessionsBefore === 'number' && log.remainingSessionsBefore > 0;
                    const deducted = hadCredit && typeof log.remainingSessionsAfter === 'number' && log.remainingSessionsAfter < log.remainingSessionsBefore;

                    return (
                      <div
                        key={log.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col gap-3.5 shadow-2xs ${isReverted
                            ? 'border-gray-200 bg-gray-50/60 opacity-80'
                            : 'border-emerald-100/80 bg-emerald-50/15 hover:bg-emerald-50/30'
                          }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          {/* Dados do Paciente */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-xs shrink-0 bg-blue-100 flex items-center justify-center">
                              {log.patientPhotoUrl ? (
                                <img src={log.patientPhotoUrl} alt={log.patientName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-bold text-blue-600 text-sm">{log.patientName?.charAt(0)}</span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-gray-900 text-sm">{log.patientName}</p>
                                {log.patientCpf && (
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    CPF: {log.patientCpf}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <strong className="text-blue-700 font-bold">{log.modality}</strong>
                                {log.professionalName && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-gray-700 font-medium">Profissional: <strong className="text-gray-900">{log.professionalName}</strong></span>
                                  </>
                                )}
                                <span className="text-gray-300">•</span>
                                <span>{new Date(log.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-gray-400">Via {log.method === 'idface' ? 'iDFace Facial' : log.method === 'totem_facial' ? 'Totem Facial' : log.method === 'totem_cpf' ? 'Totem CPF' : 'Recepção'}</span>
                              </p>
                            </div>
                          </div>

                          {/* Status Badge & Ações */}
                          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap justify-between md:justify-end">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shrink-0 border ${isReverted
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                            >
                              {isReverted ? 'Estornado' : 'Presença Confirmada'}
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Botão de Observações / Relato do Atendimento */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLogForNotes(log);
                                  setNotesText(log.notes || '');
                                }}
                                className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap flex items-center gap-1"
                                title="Relatar o que foi feito ou registrar observações"
                              >
                                <span>📝 Relato / Obs</span>
                              </button>

                              {/* Botão de Estorno: Apenas se não estornado e se houve débito */}
                              {!isReverted && deducted && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLogForRevert(log);
                                    setRevertReason('');
                                  }}
                                  className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-200 text-rose-600 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap flex items-center gap-1"
                                  title="Estornar presença e devolver crédito ao plano do paciente"
                                >
                                  <span>↩️ Estornar Sessão</span>
                                </button>
                              )}

                              {/* Exclusão de Log: EXCLUSIVO PARA ADMIN */}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLog(log.id)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                                  title="Excluir registro permanentemente (Apenas Administrador)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Linha Informativa Detalhada do que foi feito */}
                        <div className="pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-gray-400 shrink-0 font-medium">Ação / Relato:</span>
                            <span className="font-semibold text-gray-700 truncate">
                              {log.notes
                                ? log.notes
                                : isReverted
                                  ? 'Presença estornada pela recepção'
                                  : deducted
                                    ? `Debitou 1 sessão (${log.remainingSessionsBefore} ➔ ${log.remainingSessionsAfter} restantes)`
                                    : 'Atendimento avulso / Sem plano contratado'}
                            </span>
                          </div>

                          <div className="text-[11px] font-mono text-gray-500 shrink-0">
                            Saldo: <strong className="text-gray-900 font-bold">{log.remainingSessionsAfter ?? 0} sessões</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Paginação para Grandes Volumes (100+ alunos) */}
                {filteredLogs.length > pageSize && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span>
                      Exibindo <strong>{(currentPage - 1) * pageSize + 1}</strong> a <strong>{Math.min(currentPage * pageSize, filteredLogs.length)}</strong> de <strong>{filteredLogs.length}</strong> check-ins
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        Anterior
                      </button>
                      <span className="font-mono font-bold px-2 text-gray-800">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>

          {activeTab === 'quick' && (
            <button
              type="button"
              disabled={!selectedPatientId || loading}
              onClick={handleConfirmPresence}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Confirmar Presença e Debitar</span>
            </button>
          )}
        </div>
      </div>

      {/* MODAL 1: RELATAR / OBSERVAÇÃO DO QUE FOI FEITO (Z-INDEX SUPERIOR Z-99999) */}
      {selectedLogForNotes && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100 animate-scale-up">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-900 text-base">📝 Relatar Atendimento / Observação</h3>
              <button
                type="button"
                onClick={() => setSelectedLogForNotes(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Paciente: <strong className="text-gray-800">{selectedLogForNotes.patientName}</strong> • {selectedLogForNotes.modality}
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Relato do que foi feito / Observações:
              </label>
              <textarea
                rows={4}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Ex: Paciente renovou o plano de 10 sessões na recepção, realizou atendimento sem custos adicionais, etc..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedLogForNotes(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await checkinApi.updateLogNotes(selectedLogForNotes.id, notesText.trim());
                    if (res.success) {
                      toast.success('Relato/observação salvo com sucesso!');
                      setSelectedLogForNotes(null);
                      loadLogs();
                    } else {
                      toast.error(res.message);
                    }
                  } catch (err: any) {
                    toast.error(err?.message || 'Erro ao salvar');
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 cursor-pointer"
              >
                Salvar Relato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ESTORNO DE SESSÃO COM JUSTIFICATIVA OBRIGATÓRIA (Z-INDEX SUPERIOR Z-99999) */}
      {selectedLogForRevert && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-100 animate-scale-up">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-rose-900 text-base flex items-center gap-2">
                <span>⚠️ Estornar Sessão do Paciente</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLogForRevert(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Esta ação devolverá <strong className="text-emerald-700 font-bold">+1 crédito de sessão</strong> para o plano de <strong>{selectedLogForRevert.patientName}</strong> e marcará a presença como estornada.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Motivo do estorno: *
              </label>
              <input
                type="text"
                required
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="Ex: Paciente passou mal e remarcou a aula, check-in duplicado..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500 text-gray-800 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedLogForRevert(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!revertReason.trim()}
                onClick={async () => {
                  if (!revertReason.trim()) {
                    toast.error('Informe o motivo do estorno.');
                    return;
                  }
                  try {
                    const res = await checkinApi.revertCheckIn(selectedLogForRevert.id, revertReason.trim());
                    if (res.success) {
                      toast.success(res.message);
                      setSelectedLogForRevert(null);
                      loadLogs();
                      if (onSuccess) onSuccess();
                    } else {
                      toast.error(res.message);
                    }
                  } catch (err: any) {
                    toast.error(err?.message || 'Erro ao estornar');
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all ${!revertReason.trim()
                    ? 'bg-gray-300 cursor-not-allowed shadow-none'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30 cursor-pointer active:scale-95'
                  }`}
              >
                Confirmar Estorno & Devolver Sessão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
