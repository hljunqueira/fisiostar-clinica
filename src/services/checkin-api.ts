import { supabase } from '../lib/supabase';
import { Patient, Session, SessionStatus } from '../types';

export interface CheckInResult {
  success: boolean;
  status: 'success' | 'no_session' | 'no_balance' | 'no_face_registered' | 'duplicate' | 'patient_not_found' | 'too_early' | 'too_late' | 'error';
  patientId?: string;
  patientName?: string;
  patientPhotoUrl?: string;
  professionalName?: string;
  modality?: string;
  sessionTime?: string;
  remainingSessions?: number;
  totalSessions?: number;
  message: string;
}

export interface CheckInLog {
  id: string;
  patientId: string;
  patientName?: string;
  patientPhotoUrl?: string;
  patientCpf?: string;
  professionalName?: string;
  sessionId?: string;
  unitId: string;
  modality: string;
  method: 'idface' | 'totem_facial' | 'totem_cpf' | 'manual_reception';
  status: string;
  remainingSessionsBefore?: number;
  remainingSessionsAfter?: number;
  notes?: string;
  createdAt: string;
}

export const checkinApi = {
  // --- Processar Check-in Inteligente (iDFace / Totem / Recepção) ---
  async processCheckIn(params: {
    patientId?: string;
    cpf?: string;
    unitId?: string;
    method?: 'idface' | 'totem_facial' | 'totem_cpf' | 'manual_reception';
    deductSession?: boolean;
  }): Promise<CheckInResult> {
    try {
      const method = params.method || 'idface';
      const deductSession = params.deductSession !== false; // Padrão: true

      // 1. Localizar Paciente por ID ou CPF
      let patientQuery = supabase
        .from('patients')
        .select(`
          *,
          patient_plans (
            id,
            name,
            total_sessions,
            remaining_sessions,
            status,
            payment_status
          )
        `);

      if (params.patientId) {
        patientQuery = patientQuery.eq('id', params.patientId);
      } else if (params.cpf) {
        const cleanCpf = params.cpf.replace(/\D/g, '');
        patientQuery = patientQuery.eq('cpf', cleanCpf);
      } else {
        return {
          success: false,
          status: 'error',
          message: 'Identificação do paciente (ID ou CPF) é obrigatória.'
        };
      }

      const { data: patients, error: pError } = await patientQuery;
      if (pError || !patients || patients.length === 0) {
        return {
          success: false,
          status: 'patient_not_found',
          message: 'Paciente não encontrado no sistema.'
        };
      }

      const patient = patients[0];
      const patientId = patient.id;
      const patientName = patient.name;
      const patientPhoto = patient.photo_url || patient.photoUrl;
      const patientUnit = params.unitId || patient.unit_id || patient.unitId || 'MATRIZ';

      // 2. REGRA OBRIGATÓRIA: Verificar se o paciente possui Biometria Facial cadastrada
      const hasFacial = Boolean(
        (patient.facial_descriptor && String(patient.facial_descriptor).trim().length > 0) ||
        (patient.facialDescriptor && String(patient.facialDescriptor).trim().length > 0)
      );

      if (!hasFacial) {
        return {
          success: false,
          status: 'no_face_registered',
          patientId,
          patientName,
          patientPhotoUrl: patientPhoto,
          message: 'Biometria facial não cadastrada. Por favor, dirija-se à Recepção para realizar o cadastramento facial antes de iniciar.'
        };
      }

      // 3. Extrair Saldo do Pacote de Sessões (patient_plans ou patient.plan)
      const activePlan = patient.patient_plans?.[0] || patient.plan || {};
      const planName = activePlan.name || 'Particular / Avulso';
      const remainingSessionsBefore = typeof activePlan.remaining_sessions === 'number'
        ? activePlan.remaining_sessions
        : (typeof activePlan.remainingSessions === 'number' ? activePlan.remainingSessions : (typeof patient.plan?.remainingSessions === 'number' ? patient.plan.remainingSessions : 0));
      const totalSessions = typeof activePlan.total_sessions === 'number'
        ? activePlan.total_sessions
        : (typeof activePlan.totalSessions === 'number' ? activePlan.totalSessions : (typeof patient.plan?.totalSessions === 'number' ? patient.plan.totalSessions : 10));

      // 4. Buscar Agendamento de Hoje com dados do Profissional
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySessions } = await supabase
        .from('sessions')
        .select(`
          *,
          professionals (
            id,
            name,
            specialty
          )
        `)
        .eq('patient_id', patientId)
        .eq('date', today)
        .neq('status', SessionStatus.CANCELED)
        .order('time', { ascending: true });

      const currentSession = (todaySessions && todaySessions.length > 0) ? todaySessions[0] : null;

      // 🚨 REGRA ESTREITA OBRIGATÓRIA: Não fazer check-in se não tiver agendamento para hoje!
      if (!currentSession) {
        return {
          success: false,
          status: 'no_session',
          patientId,
          patientName,
          patientPhotoUrl: patientPhoto,
          message: `Você não possui atendimento agendado para hoje (${new Date().toLocaleDateString('pt-BR')}). Por favor, consulte a Recepção para agendar ou verificar seu horário.`
        };
      }

      const professionalName = currentSession.professionals?.name || 'Profissional da Clínica';
      const modality = currentSession.type || planName || 'Fisioterapia';
      const sessionTime = currentSession.time.substring(0, 5);

      // 4.1 REGRA DE HORÁRIO DO CHECK-IN NO BACKEND: 20 min antes e 10 min depois
      if (method !== 'manual_reception') {
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const [sHour, sMin] = currentSession.time.split(':').map(Number);
        const sessionMinutes = (sHour || 0) * 60 + (sMin || 0);

        const diffMinutes = nowMinutes - sessionMinutes; // Negativo = antes, Positivo = depois

        // Mais de 20 minutos antes do horário
        if (diffMinutes < -20) {
          const minutesLeft = Math.abs(diffMinutes);
          return {
            success: false,
            status: 'too_early',
            patientId,
            patientName,
            patientPhotoUrl: patientPhoto,
            professionalName,
            modality,
            sessionTime,
            remainingSessions: remainingSessionsBefore,
            totalSessions,
            message: `Check-in antecipado. Seu atendimento com ${professionalName} está agendado para as ${sessionTime}. O check-in é liberado a partir de 20 minutos antes (faltam ${minutesLeft} min).`
          };
        }

        // Mais de 10 minutos após o horário agendado
        if (diffMinutes > 10) {
          return {
            success: false,
            status: 'too_late',
            patientId,
            patientName,
            patientPhotoUrl: patientPhoto,
            professionalName,
            modality,
            sessionTime,
            remainingSessions: remainingSessionsBefore,
            totalSessions,
            message: `Tolerância de check-in expirada (limite de 10 min após as ${sessionTime} com ${professionalName}). Por favor, dirija-se à Recepção para verificar a falta ou autorizar seu atendimento.`
          };
        }
      }

      // 5. Verificar se a presença já foi registrada nos últimos 60 minutos (Prevenção de Duplicidade)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentLogs } = await supabase
        .from('checkin_logs')
        .select('id, created_at')
        .eq('patient_id', patientId)
        .eq('status', 'success')
        .gte('created_at', oneHourAgo);

      if (recentLogs && recentLogs.length > 0) {
        return {
          success: false,
          status: 'duplicate',
          patientId,
          patientName,
          patientPhotoUrl: patientPhoto,
          modality,
          sessionTime,
          remainingSessions: remainingSessionsBefore,
          totalSessions,
          message: 'Presença já registrada para este atendimento hoje!'
        };
      }

      // 6. Verificar se possui saldo de sessões disponível (Bloqueio Estrito se 0 sessões)
      if (deductSession && remainingSessionsBefore <= 0) {
        // Gravar log de saldo insuficiente
        try {
          await supabase.from('checkin_logs').insert({
            patient_id: patientId,
            session_id: currentSession?.id || null,
            unit_id: patientUnit,
            modality,
            method,
            status: 'no_balance',
            remaining_sessions_before: remainingSessionsBefore,
            remaining_sessions_after: remainingSessionsBefore,
            notes: 'Tentativa de check-in bloqueada: Paciente com 0 sessões disponíveis.'
          });
        } catch (_) {}

        return {
          success: false,
          status: 'no_balance',
          patientId,
          patientName,
          patientPhotoUrl: patientPhoto,
          modality,
          sessionTime,
          remainingSessions: 0,
          totalSessions,
          message: 'Você não possui sessões disponíveis no seu pacote. Por favor, dirija-se à Recepção para contratar ou renovar seu plano.'
        };
      }

      // 7. Atualizar Sessão para Realizada
      if (currentSession) {
        await supabase
          .from('sessions')
          .update({
            status: SessionStatus.COMPLETED,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSession.id);
      }

      // 8. Descontar Sessão do Pacote do Paciente
      let remainingSessionsAfter = remainingSessionsBefore;
      if (deductSession && remainingSessionsBefore > 0) {
        remainingSessionsAfter = Math.max(0, remainingSessionsBefore - 1);
        
        // 1. Atualiza na tabela relacional patient_plans
        await supabase
          .from('patient_plans')
          .update({
            remaining_sessions: remainingSessionsAfter,
            updated_at: new Date().toISOString()
          })
          .eq('patient_id', patientId);

        // 2. Atualiza na tabela patients para compatibilidade e estado local
        await supabase
          .from('patients')
          .update({
            plan: {
              ...activePlan,
              remainingSessions: remainingSessionsAfter,
              remaining_sessions: remainingSessionsAfter
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', patientId);
      }

      // 9. Gravar Log de Presença / Check-in com Auditoria Detalhada
      try {
        const actionNotes = (remainingSessionsBefore > 0 && deductSession)
          ? `Presença confirmada via ${method} — Debitou 1 sessão (Saldo de ${remainingSessionsBefore} para ${remainingSessionsAfter} sessões no plano ${planName})`
          : `Presença confirmada via ${method} — Atendimento avulso/particular (${planName})`;

        const { error: insertErr } = await supabase.from('checkin_logs').insert({
          patient_id: patientId,
          session_id: currentSession?.id || null,
          unit_id: patientUnit !== 'ALL' ? patientUnit : null,
          modality,
          method,
          status: 'success',
          remaining_sessions_before: remainingSessionsBefore,
          remaining_sessions_after: remainingSessionsAfter,
          notes: actionNotes
        });
        if (insertErr) {
          console.warn('Erro ao inserir checkin_logs:', insertErr);
        }
      } catch (logErr) {
        console.warn('Erro ao salvar checkin_log:', logErr);
      }

      return {
        success: true,
        status: 'success',
        patientId,
        patientName,
        patientPhotoUrl: patientPhoto,
        modality,
        sessionTime,
        remainingSessions: remainingSessionsAfter,
        totalSessions,
        message: 'Presença confirmada com sucesso!'
      };
    } catch (error: any) {
      console.error('Erro no processamento do check-in:', error);
      return {
        success: false,
        status: 'error',
        message: error?.message || 'Erro inesperado ao processar check-in.'
      };
    }
  },

  // --- Buscar Logs de Check-in (Por Data e Unidade) ---
  async getTodayLogs(unitId?: string, targetDate?: string): Promise<CheckInLog[]> {
    try {
      const selectedDate = targetDate || new Date().toISOString().split('T')[0];
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;

      let query = supabase
        .from('checkin_logs')
        .select(`
          *,
          patients (
            name,
            photo_url,
            cpf
          ),
          sessions (
            id,
            time,
            type,
            professionals (
              name
            )
          )
        `)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false });

      if (unitId && unitId !== 'ALL') {
        query = query.eq('unit_id', unitId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((l: any) => ({
        id: l.id,
        patientId: l.patient_id,
        patientName: l.patients?.name || 'Paciente sem nome',
        patientPhotoUrl: l.patients?.photo_url || undefined,
        patientCpf: l.patients?.cpf || undefined,
        professionalName: l.sessions?.professionals?.name || undefined,
        sessionId: l.session_id,
        unitId: l.unit_id,
        modality: l.modality,
        method: l.method,
        status: l.status,
        remainingSessionsBefore: l.remaining_sessions_before,
        remainingSessionsAfter: l.remaining_sessions_after,
        notes: l.notes,
        createdAt: l.created_at
      }));
    } catch (e) {
      console.error('Error fetching checkin logs:', e);
      return [];
    }
  },

  // --- Estornar / Cancelar Presença e Devolver Crédito (Auditado) ---
  async revertCheckIn(logId: string, userNotes?: string): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Localizar Log
      const { data: log, error: logErr } = await supabase
        .from('checkin_logs')
        .select('*, patients(*, patient_plans(*))')
        .eq('id', logId)
        .single();

      if (logErr || !log) {
        throw new Error('Registro de check-in não encontrado.');
      }

      if (log.status === 'reverted') {
        throw new Error('Esta presença já foi estornada anteriormente.');
      }

      const patientId = log.patient_id;
      const patient = log.patients;

      // 2. Devolver 1 sessão ao saldo
      const activePlan = patient?.patient_plans?.[0] || patient?.plan || {};
      const currentRemaining = typeof activePlan.remaining_sessions === 'number'
        ? activePlan.remaining_sessions
        : (typeof activePlan.remainingSessions === 'number' ? activePlan.remainingSessions : 0);

      const newRemaining = currentRemaining + 1;

      // Atualiza patient_plans se existir
      if (patient?.patient_plans && patient.patient_plans.length > 0) {
        await supabase
          .from('patient_plans')
          .update({
            remaining_sessions: newRemaining,
            updated_at: new Date().toISOString()
          })
          .eq('id', patient.patient_plans[0].id);
      }

      // Atualiza patients para sincronia
      await supabase
        .from('patients')
        .update({
          plan: {
            ...activePlan,
            remainingSessions: newRemaining,
            remaining_sessions: newRemaining
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', patientId);

      // 3. Voltar status da Sessão para Agendada se houver session_id
      if (log.session_id) {
        await supabase
          .from('sessions')
          .update({
            status: SessionStatus.SCHEDULED,
            updated_at: new Date().toISOString()
          })
          .eq('id', log.session_id);
      }

      // 4. Atualizar o log para status 'reverted' com auditoria
      await supabase
        .from('checkin_logs')
        .update({
          status: 'reverted',
          notes: userNotes ? `Estornado: ${userNotes}` : 'Presença estornada pela recepção (crédito devolvido)',
          remaining_sessions_after: newRemaining
        })
        .eq('id', logId);

      return {
        success: true,
        message: `Presença de ${patient?.name || 'paciente'} estornada e 1 crédito devolvido ao plano com sucesso!`
      };
    } catch (error: any) {
      console.error('Erro ao estornar check-in:', error);
      return {
        success: false,
        message: error.message || 'Erro ao estornar presença.'
      };
    }
  },

  // --- Atualizar Relato / Observação do Atendimento ---
  async updateLogNotes(logId: string, notes: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('checkin_logs')
        .update({ notes })
        .eq('id', logId);

      if (error) throw error;
      return { success: true, message: 'Relato/observação salvo com sucesso!' };
    } catch (e: any) {
      console.error('Erro ao atualizar observação do log:', e);
      return { success: false, message: e.message || 'Erro ao salvar observação.' };
    }
  }
};
