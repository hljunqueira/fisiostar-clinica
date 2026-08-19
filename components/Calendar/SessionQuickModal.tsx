import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, SessionStatus, Professional, Patient, Unit, Agreement } from '../../types';
import { sessionsApi } from '../../src/services/api';
import { formatPhone } from '../../src/utils/masks';
import toast from 'react-hot-toast';

interface SessionQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  patient?: Patient | null;
  professional?: Professional | null;
  unit?: Unit | null;
  agreements?: Agreement[];
  onOpenFullEdit: (session: Session) => void;
  onStatusUpdated?: (updatedSession: Session) => void;
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; bg: string; text: string; dot: string }> = {
  [SessionStatus.SCHEDULED]: { label: 'Agendado', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  [SessionStatus.CONFIRMED]: { label: 'Confirmado', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  [SessionStatus.COMPLETED]: { label: 'Atendido / Realizado', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
  [SessionStatus.NOSHOW]: { label: 'Faltou', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  [SessionStatus.CANCELED]: { label: 'Cancelado', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' }
};

export const SessionQuickModal: React.FC<SessionQuickModalProps> = ({
  isOpen,
  onClose,
  session,
  patient,
  professional,
  unit,
  agreements = [],
  onOpenFullEdit,
  onStatusUpdated
}) => {
  const navigate = useNavigate();
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!isOpen || !session) return null;

  const currentStatus = (session.status as SessionStatus) || SessionStatus.SCHEDULED;
  const statusInfo = STATUS_CONFIG[currentStatus] || STATUS_CONFIG[SessionStatus.SCHEDULED];

  const handleStatusChange = async (newStatus: SessionStatus) => {
    if (newStatus === session.status) return;
    try {
      setUpdatingStatus(true);
      const updated = await sessionsApi.update(session.id, { status: newStatus });
      toast.success(`Status alterado para "${STATUS_CONFIG[newStatus]?.label || newStatus}"`);
      if (onStatusUpdated) {
        onStatusUpdated(updated);
      }
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao alterar status da consulta');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleNavigateToPatient = () => {
    if (!session.patientId) return;
    onClose();
    navigate(`/pacientes?patientId=${session.patientId}&tab=timeline`);
  };

  const cleanPhone = (patient?.phone || '').replace(/\D/g, '');
  const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone.startsWith('55') ? cleanPhone.slice(2) : cleanPhone}` : null;
  const agreementName = agreements.find(a => a.id === session.agreementId)?.name || 'Particular / Próprio';

  // Format time range
  const startTime = session.time ? session.time.substring(0, 5) : '08:00';
  const endTime = session.endTime ? session.endTime.substring(0, 5) : (() => {
    const [h, m] = startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + (session.duration || 30);
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  })();

  const formattedDate = session.date ? new Date(session.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }) : '';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Popover Card */}
      <div 
        className="relative z-10 bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Clean */}
        <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold tracking-wide uppercase text-slate-400 capitalize">
              {formattedDate}
            </div>
            <div className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Horário: {startTime} – {endTime}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-1.5 rounded-lg transition-colors cursor-pointer text-sm font-bold"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-sm">
          {/* Fisioterapeuta */}
          <div className="flex items-start justify-between py-1 border-b border-slate-100/80">
            <span className="text-xs font-semibold text-slate-500">Fisioterapeuta</span>
            <span className="font-semibold text-slate-800 text-right">
              {professional?.name || 'Não atribuído'}
            </span>
          </div>

          {/* Paciente - Link Clicável */}
          <div className="flex items-start justify-between py-1.5 border-b border-slate-100/80 bg-blue-50/40 -mx-5 px-5">
            <span className="text-xs font-semibold text-blue-900">Paciente</span>
            <button
              onClick={handleNavigateToPatient}
              className="text-blue-600 hover:text-blue-800 font-bold text-right hover:underline cursor-pointer transition-colors"
              title="Clique para abrir o histórico e prontuário completo"
            >
              {patient?.name || 'Sem nome cadastrado'} →
            </button>
          </div>

          {/* Celular / WhatsApp */}
          {patient?.phone && (
            <div className="flex items-center justify-between py-1 border-b border-slate-100/80">
              <span className="text-xs font-semibold text-slate-500">Celular / WhatsApp</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-700 font-medium">
                  {formatPhone(patient.phone)}
                </span>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors"
                    title="Conversar no WhatsApp"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Convênio & Procedimento */}
          <div className="grid grid-cols-2 gap-3 py-1 border-b border-slate-100/80">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">Convênio / Plano</span>
              <span className="text-xs font-semibold text-slate-800 truncate block">
                {agreementName}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">Procedimento</span>
              <span className="text-xs font-semibold text-slate-800 truncate block">
                {session.type || 'Fisioterapia'}
              </span>
            </div>
          </div>

          {/* Status com Dropdown Rápido */}
          <div className="py-1 border-b border-slate-100/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500">Status do Atendimento</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${statusInfo.bg} ${statusInfo.text}`}>
                <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                {statusInfo.label}
              </span>
            </div>
            <select
              value={currentStatus}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value as SessionStatus)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value={SessionStatus.SCHEDULED}>Agendado</option>
              <option value={SessionStatus.CONFIRMED}>Confirmado</option>
              <option value={SessionStatus.COMPLETED}>Atendido / Realizado</option>
              <option value={SessionStatus.NOSHOW}>Faltou</option>
              <option value={SessionStatus.CANCELED}>Cancelado</option>
            </select>
          </div>

          {/* Recorrência / Saldo de Sessões (se houver plano) */}
          {patient?.plan && (
            <div className="flex items-center justify-between py-1 border-b border-slate-100/80 text-xs">
              <span className="text-slate-500 font-semibold">Plano do Paciente</span>
              <span className="font-semibold text-slate-700">
                {patient.plan.remainingSessions} de {patient.plan.totalSessions} sessões restantes
              </span>
            </div>
          )}

          {/* Observações */}
          {session.notes && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
              <span className="font-semibold text-slate-700 block mb-0.5">Observações:</span>
              <p className="whitespace-pre-wrap">{session.notes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons Clean */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFullEdit(session);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Editar Agendamento
          </button>

          <button
            type="button"
            onClick={handleNavigateToPatient}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Ver Prontuário & Linha do Tempo →
          </button>
        </div>
      </div>
    </div>
  );
};
