import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Activity,
  Sparkles,
  ArrowLeft,
  Search,
  Keyboard,
  ShieldCheck,
  RefreshCw,
  Layers
} from 'lucide-react';
import { checkinApi, CheckInResult } from '../../src/services/checkin-api';
import { patientsApi } from '../../src/services/api';
import { Patient } from '../../types';
import { maskCpf } from '../../src/utils/masks';

export const TotemCheckIn: React.FC = () => {
  const [step, setStep] = useState<'idle' | 'scanning' | 'cpf_input' | 'patient_select' | 'result'>('idle');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [patients, setPatients] = useState<Patient[]>([]);
  const [cpf, setCpf] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [countdown, setCountdown] = useState(5);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load patients list for manual fallback / simulation
  useEffect(() => {
    async function loadPatients() {
      try {
        const data = await patientsApi.getAll();
        setPatients(data);
      } catch (e) {
        console.error('Error loading patients in totem:', e);
      }
    }
    loadPatients();
  }, []);

  // Auto-reset when showing result
  useEffect(() => {
    if (step === 'result') {
      setCountdown(5);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            resetToIdle();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step]);

  const resetToIdle = () => {
    setStep('idle');
    setCpf('');
    setSearchTerm('');
    setResult(null);
    setLoading(false);
  };

  const handleStartCheckIn = () => {
    setStep('scanning');
  };

  const handleProcessPatient = async (patientId: string) => {
    try {
      setLoading(true);
      const res = await checkinApi.processCheckIn({
        patientId,
        method: 'totem_facial',
        deductSession: true
      });
      setResult(res);
      setStep('result');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCpfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpf || cpf.replace(/\D/g, '').length < 11) return;

    try {
      setLoading(true);
      const res = await checkinApi.processCheckIn({
        cpf,
        method: 'totem_cpf',
        deductSession: true
      });
      setResult(res);
      setStep('result');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.cpf && p.cpf.includes(searchTerm))
  ).slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden font-sans">
      {/* Top Header */}
      <header className="flex justify-between items-center border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-primary flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider text-white">FISIOSTAR</h1>
            <p className="text-xs text-blue-300 font-medium">Totem de Check-in & Presença</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-3xl font-black tracking-tight text-white font-mono">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-xs text-gray-400 capitalize">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>

          {step !== 'idle' && (
            <button
              onClick={resetToIdle}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center my-6">
        {/* STEP: IDLE */}
        {step === 'idle' && (
          <div className="text-center max-w-xl mx-auto space-y-8 animate-fade-in">
            <div className="relative inline-block">
              <div className="w-40 h-40 rounded-full bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30 animate-pulse">
                <Scan className="w-20 h-20 text-blue-400" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 p-2 rounded-full shadow-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
                Bem-vindo(a) à FisioStar
              </h2>
              <p className="text-gray-400 text-base sm:text-lg">
                Confirme sua presença para a sessão de hoje em poucos segundos
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={handleStartCheckIn}
                className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-lg font-black tracking-wide shadow-xl shadow-blue-600/40 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
              >
                <Scan className="w-6 h-6" />
                <span>Iniciar Check-in</span>
              </button>

              <button
                onClick={() => setStep('cpf_input')}
                className="w-full sm:w-auto px-6 py-5 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-2xl text-sm font-bold transition-all cursor-pointer"
              >
                Digitar CPF
              </button>
            </div>
          </div>
        )}

        {/* STEP: SCANNING / FACIAL ORIENTATION */}
        {step === 'scanning' && (
          <div className="text-center max-w-lg mx-auto space-y-8 animate-fade-in">
            <div className="relative w-64 h-64 mx-auto rounded-3xl border-4 border-dashed border-blue-400/60 p-4 flex flex-col items-center justify-center bg-blue-950/40 shadow-2xl shadow-blue-500/20 overflow-hidden">
              {/* Radar scan line animation */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-bounce shadow-lg shadow-blue-400" />

              <User className="w-24 h-24 text-blue-300/80 mb-2 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Leitor Facial Ativo</p>
            </div>

            <div>
              <h3 className="text-2xl font-black text-white mb-2">
                Olhe para o equipamento de reconhecimento facial
              </h3>
              <p className="text-gray-400 text-sm">
                Posicione seu rosto na frente do sensor iDFace ou aguarde o reconhecimento
              </p>
            </div>

            {/* Quick Demo Selector for testing or quick fallback */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Ou selecione seu nome (Demonstração):</span>
                <span className="text-[10px] text-blue-400">Pacientes cadastrados</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                {patients.slice(0, 6).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleProcessPatient(p.id)}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-blue-600 text-left text-xs font-bold text-white transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                      {p.name.charAt(0)}
                    </div>
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setStep('cpf_input')}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold hover:underline cursor-pointer"
              >
                Problemas no reconhecimento facial? Digitar CPF
              </button>
            </div>
          </div>
        )}

        {/* STEP: CPF INPUT */}
        {step === 'cpf_input' && (
          <div className="text-center max-w-md mx-auto space-y-6 animate-fade-in w-full">
            <h3 className="text-2xl font-black text-white">Informe seu CPF</h3>
            <p className="text-gray-400 text-sm">Digite o CPF cadastrado na clínica para registrar sua presença</p>

            <form onSubmit={handleCpfSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full px-6 py-4 bg-white/10 border-2 border-blue-500/40 rounded-2xl text-2xl font-mono text-center text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-400 shadow-inner"
              />

              <button
                type="submit"
                disabled={loading || cpf.replace(/\D/g, '').length < 11}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-black text-base shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
              >
                {loading ? 'Validando...' : 'Confirmar Presença'}
              </button>
            </form>
          </div>
        )}

        {/* STEP: RESULT SCREEN */}
        {step === 'result' && result && (
          <div className="max-w-md w-full mx-auto animate-fade-in text-center">
            {result.success ? (
              <div className="bg-white/10 backdrop-blur-md border border-emerald-500/40 rounded-3xl p-8 shadow-2xl shadow-emerald-500/20 space-y-6">
                <div>
                  <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-widest rounded-full border border-emerald-500/30">
                    Presença Confirmada
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-white mt-4">{result.patientName}</h2>
                  <p className="text-base sm:text-lg font-bold text-blue-300 mt-1.5 flex items-center justify-center gap-2 flex-wrap">
                    <span>{result.modality}</span>
                    {result.professionalName && (
                      <>
                        <span className="text-blue-500">•</span>
                        <span className="text-white">Prof. {result.professionalName}</span>
                      </>
                    )}
                    <span className="text-blue-500">•</span>
                    <span className="font-mono text-emerald-400">{result.sessionTime}</span>
                  </p>
                </div>

                {/* Remaining Sessions Highlight (Clean, sem ícones) */}
                <div className="p-5 bg-slate-950/70 rounded-2xl border border-white/10 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Saldo do Pacote</p>
                  <p className="text-xl font-black text-white mt-1">
                    Restam <span className="text-emerald-400 text-2xl font-mono">{result.remainingSessions}</span> de {result.totalSessions} sessões
                  </p>
                </div>

                <p className="text-xs text-gray-400">Tenha uma excelente aula / atendimento!</p>

                <div className="pt-2">
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full transition-all duration-1000"
                      style={{ width: `${(countdown / 5) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">Retornando em {countdown} segundos...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md border border-amber-500/40 rounded-3xl p-8 shadow-2xl shadow-amber-500/20 space-y-6">
                <div className="w-20 h-20 bg-amber-500/20 border-2 border-amber-400 rounded-full flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/30 animate-pulse">
                  <AlertCircle className="w-10 h-10" />
                </div>

                <div>
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider rounded-full border border-amber-500/30">
                    {result.status === 'no_session' ? 'Sem Agendamento Hoje' : result.status === 'no_balance' ? 'Pacote Esgotado' : result.status === 'no_face_registered' ? 'Biometria Não Cadastrada' : 'Aviso de Check-in'}
                  </span>
                  <h3 className="text-2xl font-black text-white mt-3 mb-2">
                    {result.status === 'no_session' ? 'Horário Não Agendado' : result.status === 'no_balance' ? 'Dirija-se à Recepção' : result.status === 'no_face_registered' ? 'Identificação por CPF' : 'Aviso de Check-in'}
                  </h3>
                  <p className="text-amber-200 font-bold text-sm leading-relaxed max-w-sm mx-auto">
                    {result.message}
                  </p>
                </div>

                {result.patientName && (
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/10 text-xs text-gray-300 text-left flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-gray-400">Paciente identificado</p>
                      <p className="font-bold text-white text-sm">{result.patientName}</p>
                    </div>
                    <span className="text-amber-400 font-bold text-xs">
                      {result.status === 'no_balance' ? '0 sessões restantes' : ''}
                    </span>
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  {result.status === 'no_face_registered' && (
                    <button
                      onClick={() => setStep('cpf_input')}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs transition-all cursor-pointer shadow-lg shadow-blue-600/30 active:scale-95"
                    >
                      Digitar CPF para Check-in
                    </button>
                  )}
                  <button
                    onClick={resetToIdle}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
                  >
                    Voltar ao Início
                  </button>
                  <p className="text-[10px] text-gray-500 mt-2">Retornando automaticamente em {countdown} segundos...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="border-t border-white/10 pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Equipamento iDFace Online • Supabase Realtime</span>
        </div>
        <p>FisioStar Gestão de Clínicas © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};
