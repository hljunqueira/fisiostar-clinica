import React, { useState, useEffect, useMemo } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { FinancialDashboard } from './FinancialDashboard';
import Professionals from './Professionals';
import { QuickPatientModal } from './QuickPatientModal';
import {
    DollarSign, Calendar, CheckCircle2, Clock, Download, Filter, Plus,
    TrendingUp, TrendingDown, X, Save, Trash2, FileText, ChevronLeft,
    ChevronRight, Check, AlertCircle, Eye, Building2, User, CreditCard,
    ArrowUpRight, ArrowDownRight, Sparkles, BarChart2, ShieldCheck, Briefcase,
    Receipt, CheckSquare, Square, Printer, Copy, MessageCircle, Share2,
    Crown, AlertTriangle, Layers, Percent, ChevronDown, CalendarCheck,
    ArrowRightLeft, Wallet, Package, Search, UserCheck, Edit, UserPlus, Phone
} from 'lucide-react';

// Helper de formatação de data pura (DD/MM/AAAA) sem distorção de fuso horário UTC
export const formatDateBR = (isoDate?: string | null): string => {
    if (!isoDate) return '';
    const clean = isoDate.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
};
import { UnitId, Professional, Patient, Session, isSecretaryProfessional, isClinicalProfessional } from '../types';
import type { Payment, Expense, Revenue, CreateExpense, CreateRevenue, PaymentAuditSession, PaymentAuditPackage } from '../src/types/financial';
import type { EmployeeAdvance } from '../src/types';
import { paymentsApi, expensesApi, revenuesApi, advancesApi } from '../src/services/financial-api';
import { professionalsApi, patientsApi, unitsApi, sessionsApi, auditLogsApi, patientPlansApi } from '../src/services/api';
import toast from 'react-hot-toast';

interface FinancialProps {
    currentUnit: UnitId;
    currentUserId: string;
}

export const Financial: React.FC<FinancialProps> = ({ currentUnit: propUnit, currentUserId }) => {
    // Sub-abas do Módulo Financeiro
    const [activeTab, setActiveTab] = useState<'payroll' | 'team' | 'cashflow'>('payroll');

    // Unidade Ativa no Financeiro (permite alternar entre Unidade 1, Unidade 2 ou Consolidado)
    const [selectedUnit, setSelectedUnit] = useState<string>(propUnit || 'ALL');

    // Período Atual (Ano e Mês)
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [showCharts, setShowCharts] = useState(false);
    const [loading, setLoading] = useState(true);

    // Dados Principais
    const [payments, setPayments] = useState<Payment[]>([]);
    const [allPayments, setAllPayments] = useState<Payment[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [revenues, setRevenues] = useState<Revenue[]>([]);
    const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);
    const [allAdvances, setAllAdvances] = useState<EmployeeAdvance[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [allSessions, setAllSessions] = useState<Session[]>([]);

    // Modais
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showRevenueModal, setShowRevenueModal] = useState(false);
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);

    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [auditingProf, setAuditingProf] = useState<Professional | null>(null);
    const [exportInitialProfId, setExportInitialProfId] = useState<string | undefined>(undefined);
    const [openActionMenuProfId, setOpenActionMenuProfId] = useState<string | null>(null);

    // Fechar menu de ações ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.action-menu-container')) {
                setOpenActionMenuProfId(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Modal de Confirmação
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: () => { }
    });

    const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

    // Sincroniza se a prop mudar
    useEffect(() => {
        if (propUnit) setSelectedUnit(propUnit);
    }, [propUnit]);

    // Datas limites do mês selecionado (sem desvio UTC)
    const periodStart = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}-01`;
    }, [currentDate]);

    const periodEnd = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const lastDay = String(new Date(year, month + 1, 0).getDate()).padStart(2, '0');
        return `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
    }, [currentDate]);

    // Base de cálculo para conferência de folha e sessões
    const [payrollBaseFilter, setPayrollBaseFilter] = useState<'realized' | 'confirmed_realized' | 'all'>('realized');

    // Separação de visualização da Folha: Corpo Clínico vs Recepção & Secretárias (Para não confundir)
    const [payrollStaffType, setPayrollStaffType] = useState<'clinical' | 'secretaries' | 'all'>('clinical');

    // Estado para ajuste rápido de salário fixo de colaboradores
    const [editingSalaryProf, setEditingSalaryProf] = useState<{ id: string; name: string; baseSalary: number } | null>(null);
    const [tempSalaryValue, setTempSalaryValue] = useState<string>('');

    const monthLabel = useMemo(() => {
        return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }, [currentDate]);

    const prevMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    useEffect(() => {
        loadData();
    }, [selectedUnit, periodStart, periodEnd]);

    async function loadData() {
        try {
            setLoading(true);
            const unitFilter = selectedUnit === 'ALL' ? undefined : selectedUnit;

            const [
                paymentsData,
                expensesData,
                revenuesData,
                advancesData,
                professionalsData,
                patientsData,
                unitsData,
                sessionsData,
                allPaymentsData
            ] = await Promise.all([
                paymentsApi.getAll({
                    periodStart,
                    periodEnd
                }),
                expensesApi.getAll(unitFilter),
                revenuesApi.getAll(unitFilter ? { unitId: unitFilter, startDate: periodStart, endDate: periodEnd } : { startDate: periodStart, endDate: periodEnd }),
                advancesApi.getAll({ unitId: unitFilter }),
                professionalsApi.getAll(),
                patientsApi.getAll(),
                unitsApi.getAll(),
                sessionsApi.getAll(unitFilter ? { unitId: unitFilter } : {}),
                paymentsApi.getAll()
            ]);

            setPayments(paymentsData);
            setAllPayments(allPaymentsData);
            setExpenses(expensesData.filter(e => e.expenseDate >= periodStart && e.expenseDate <= periodEnd));
            setRevenues(revenuesData);
            setAdvances(advancesData.filter(a => a.advanceDate >= periodStart && a.advanceDate <= periodEnd));
            setAllAdvances(advancesData);
            setProfessionals(professionalsData);
            setPatients(patientsData);
            setUnits(unitsData);
            setAllSessions(sessionsData);
        } catch (error) {
            console.error('Error loading financial data:', error);
            toast.error('Erro ao carregar dados financeiros');
        } finally {
            setLoading(false);
        }
    }

    // Helper: Cálculo de comissão para cada sessão
    const calculateSessionCommission = (session: Session, prof: Professional) => {
        const price = Number(session.price && session.price > 0 ? session.price : (prof.hourlyRate || 100));
        const sessionType = (session.type || '').trim().toLowerCase();

        let commissionType: 'percentage' | 'fixed' = 'percentage';
        let commissionValue = 50; // 50% default

        const isEvaluation = sessionType.includes('avalia') || sessionType.includes('avaliacao') || sessionType.includes('avaliação');

        const matchedService = prof.services?.find(
            s => s.serviceName.toLowerCase() === sessionType ||
                sessionType.includes(s.serviceName.toLowerCase()) ||
                s.serviceName.toLowerCase().includes(sessionType)
        );

        if (matchedService) {
            commissionType = matchedService.commissionType;
            commissionValue = matchedService.commissionValue;
        } else if (isEvaluation) {
            const evalService = prof.services?.find(s => s.serviceName.toLowerCase().includes('avalia'));
            commissionType = evalService ? evalService.commissionType : 'percentage';
            commissionValue = evalService ? evalService.commissionValue : 60;
        } else if (sessionType.includes('personal') || sessionType.includes('nata') || sessionType.includes('natação')) {
            const persService = prof.services?.find(s => s.serviceName.toLowerCase().includes('personal') || s.serviceName.toLowerCase().includes('nata'));
            commissionType = persService ? persService.commissionType : 'percentage';
            commissionValue = persService ? persService.commissionValue : 50;
        } else if (prof.hourlyRate && prof.hourlyRate > 0) {
            commissionType = 'fixed';
            commissionValue = prof.hourlyRate;
        }

        let commissionEarned = 0;
        let rateLabel = '';

        if (commissionType === 'percentage') {
            commissionEarned = (price * commissionValue) / 100;
            rateLabel = `${commissionValue}%`;
        } else {
            commissionEarned = commissionValue;
            rateLabel = `R$ ${commissionValue.toFixed(2)}`;
        }

        // Taxa que o profissional paga à clínica se regime parceria
        let clinicFee = 0;
        if (prof.contractType === 'partnership') {
            if (prof.clinicFeeType === 'percentage') {
                clinicFee = (price * (prof.clinicFeeValue || 0)) / 100;
            } else if (prof.clinicFeeType === 'fixed') {
                clinicFee = prof.clinicFeeValue || 0;
            }
        }

        // Retenção que fica com a clínica
        const clinicRetained = Math.max(0, price - commissionEarned);
        const clinicPercentage = commissionType === 'percentage'
            ? Math.max(0, 100 - commissionValue)
            : (price > 0 ? Math.round((clinicRetained / price) * 100) : 0);

        return {
            price,
            commissionType,
            commissionValue,
            commissionEarned,
            rateLabel,
            clinicFee,
            clinicRetained,
            clinicPercentage
        };
    };

    // Estatísticas da Agenda no Mês Selecionado (Comparativo Agenda x Financeiro)
    const agendaComparisonStats = useMemo(() => {
        const monthSessions = allSessions.filter(s => {
            const matchDate = s.date >= periodStart && s.date <= periodEnd;
            const matchUnit = selectedUnit === 'ALL' || s.unitId === selectedUnit;
            return matchDate && matchUnit;
        });

        const totalCount = monthSessions.length;
        const totalGross = monthSessions.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

        const realized = monthSessions.filter(s => s.status === 'Realizada' || s.isLateCancellation === true);
        const realizedCount = realized.length;
        const realizedGross = realized.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

        const confirmed = monthSessions.filter(s => s.status === 'Confirmada' && !s.isLateCancellation);
        const confirmedCount = confirmed.length;
        const confirmedGross = confirmed.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

        const scheduled = monthSessions.filter(s => s.status === 'Agendada' && !s.isLateCancellation);
        const scheduledCount = scheduled.length;
        const scheduledGross = scheduled.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

        const canceled = monthSessions.filter(s => (s.status === 'Cancelada' || s.status === 'Falta') && !s.isLateCancellation);
        const canceledCount = canceled.length;
        const canceledGross = canceled.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

        const realizedPercent = totalCount > 0 ? Math.round((realizedCount / totalCount) * 100) : 0;
        const confirmedPercent = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;
        const scheduledPercent = totalCount > 0 ? Math.round((scheduledCount / totalCount) * 100) : 0;

        return {
            totalCount,
            totalGross,
            realizedCount,
            realizedGross,
            realizedPercent,
            confirmedCount,
            confirmedGross,
            confirmedPercent,
            scheduledCount,
            scheduledGross,
            scheduledPercent,
            canceledCount,
            canceledGross
        };
    }, [allSessions, periodStart, periodEnd, selectedUnit]);

    // Estatísticas da Equipe no Mês Atual
    const teamPayrollStats = useMemo(() => {
        return professionals.map(prof => {
            const isSecretary = Boolean(
                prof.roles?.includes('secretary') ||
                prof.specialty?.toLowerCase().includes('secret') ||
                prof.specialty?.toLowerCase().includes('recep')
            );

            // Todas as sessões do profissional no mês
            const profMonthSessions = allSessions.filter(s => {
                const matchProf = s.professionalId === prof.id;
                const matchDate = s.date >= periodStart && s.date <= periodEnd;
                const matchUnit = selectedUnit === 'ALL' || s.unitId === selectedUnit;
                return matchProf && matchDate && matchUnit;
            });

            // Correspondência de unidade (pertence à unidade ativa ou atendeu nela)
            const matchesUnit = selectedUnit === 'ALL' ||
                (prof.unitIds && prof.unitIds.includes(selectedUnit)) ||
                profMonthSessions.length > 0;

            // Contagens discriminadas
            const realizedSessions = profMonthSessions.filter(s => s.status === 'Realizada' || s.isLateCancellation === true);
            const confirmedSessions = profMonthSessions.filter(s => s.status === 'Confirmada' && !s.isLateCancellation);
            const scheduledSessions = profMonthSessions.filter(s => s.status === 'Agendada' && !s.isLateCancellation);
            const canceledSessions = profMonthSessions.filter(s => (s.status === 'Cancelada' || s.status === 'Falta') && !s.isLateCancellation);

            // Sessões consideradas na folha com base no seletor
            const activeSessions = profMonthSessions.filter(s => {
                if (s.isLateCancellation === true) return true;
                if (payrollBaseFilter === 'realized') return s.status === 'Realizada';
                if (payrollBaseFilter === 'confirmed_realized') return s.status === 'Realizada' || s.status === 'Confirmada';
                return s.status === 'Realizada' || s.status === 'Confirmada' || s.status === 'Agendada';
            });

            // Vales pendentes ou concedidos no período
            const profAdvances = advances.filter(a => a.professionalId === prof.id);
            const totalAdvances = profAdvances.reduce((sum, a) => sum + a.amount, 0);

            // Pagamento já registrado neste mês?
            const existingPayment = payments.find(p => p.professionalId === prof.id);

            // Soma das produções e comissões para as sessões ativas (Secretárias não têm comissão clínica)
            let grossProduction = 0;
            let totalCommission = 0;
            let totalClinicFee = 0;
            let lateCancellationsCount = 0;

            if (!isSecretary) {
                activeSessions.forEach(s => {
                    const calc = calculateSessionCommission(s, prof);
                    grossProduction += calc.price;
                    totalCommission += calc.commissionEarned;
                    totalClinicFee += calc.clinicFee;
                    if (s.isLateCancellation) {
                        lateCancellationsCount++;
                    }
                });
            }

            // Margem retida da clínica nesta produção
            const clinicRetainedMargin = Math.max(0, grossProduction - totalCommission);

            // Se CLT, Sócio ou Secretária, tem pró-labore ou salário fixo
            const baseSalary = (prof.contractType === 'clt' || prof.contractType === 'socio' || isSecretary || (prof.baseSalary && prof.baseSalary > 0))
                ? (prof.baseSalary || 0)
                : 0;

            const netAmount = existingPayment
                ? (existingPayment.netAmount ?? existingPayment.totalAmount)
                : Math.max(0, (baseSalary + totalCommission) - totalAdvances - totalClinicFee);

            return {
                professional: prof,
                isSecretary,
                sessions: activeSessions,
                sessionsCount: activeSessions.length,
                allMonthSessions: profMonthSessions,
                realizedCount: realizedSessions.length,
                confirmedCount: confirmedSessions.length,
                scheduledCount: scheduledSessions.length,
                canceledCount: canceledSessions.length,
                lateCancellationsCount,
                grossProduction,
                totalCommission,
                clinicRetainedMargin,
                baseSalary,
                totalAdvances,
                totalClinicFee,
                netAmount,
                existingPayment,
                hasActivity: matchesUnit && (isSecretary || profMonthSessions.length > 0 || baseSalary > 0 || totalAdvances > 0 || !!existingPayment)
            };
        });
    }, [professionals, allSessions, advances, payments, periodStart, periodEnd, selectedUnit, payrollBaseFilter]);

    // Listas Separáveis: Corpo Clínico vs Recepção & Secretárias
    const clinicalPayrollStats = useMemo(() => {
        return teamPayrollStats.filter(item => !item.isSecretary && item.hasActivity);
    }, [teamPayrollStats]);

    const secretaryPayrollStats = useMemo(() => {
        return teamPayrollStats.filter(item => item.isSecretary && item.hasActivity);
    }, [teamPayrollStats]);

    // Totais Globais
    const totalRevenues = revenues.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalAdvancesGiven = advances.reduce((sum, a) => sum + a.amount, 0);

    const totalTeamPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.netAmount ?? p.totalAmount), 0);
    const totalTeamPending = teamPayrollStats.reduce((sum, item) => {
        if (!item.existingPayment || item.existingPayment.status === 'pending') {
            return sum + item.netAmount;
        }
        return sum;
    }, 0);

    const totalGrossProduction = teamPayrollStats.reduce((sum, item) => sum + item.grossProduction, 0);
    const totalClinicMargin = teamPayrollStats.reduce((sum, item) => sum + item.clinicRetainedMargin, 0);

    const netOperatingBalance = totalRevenues - totalExpenses - totalTeamPaid;

    // Ações de Pagamento e Fechamento
    const handleOpenAuditModal = (prof: Professional) => {
        setAuditingProf(prof);
        setShowAuditModal(true);
    };

    const handleOpenExportForProf = (profId?: string) => {
        setExportInitialProfId(profId);
        setShowExportModal(true);
    };

    const handleMarkPaymentAsPaid = (payment: Payment) => {
        setSelectedPayment(payment);
        setShowPaymentModal(true);
    };

    // Toggle sessão em cima da hora
    const handleToggleLateCancellation = async (sessionId: string, currentStatus: boolean) => {
        try {
            const newIsLate = !currentStatus;
            await sessionsApi.update(sessionId, {
                isLateCancellation: newIsLate,
                status: newIsLate ? ('Realizada' as any) : undefined
            });
            setAllSessions(prev => prev.map(s => s.id === sessionId ? {
                ...s,
                isLateCancellation: newIsLate,
                status: newIsLate ? ('Realizada' as any) : s.status
            } : s));
            toast.success(newIsLate ? 'Sessão classificada como Desmarcação em Cima da Hora (Atendimento Cobrado)!' : 'Classificação de desmarcação removida.');
        } catch (err) {
            console.error('Error toggling late cancellation:', err);
            toast.error('Erro ao atualizar status da sessão');
        }
    };

    const confirmPayment = async (paymentMethod: string, notes?: string, paidAt?: string) => {
        if (!selectedPayment) return;
        try {
            const prof = professionals.find(p => p.id === selectedPayment.professionalId);
            await paymentsApi.markAsPaid(selectedPayment.id, {
                paymentMethod: paymentMethod as any,
                paidBy: currentUserId,
                notes
            });
            await loadData();
            setShowPaymentModal(false);

            await auditLogsApi.logAction({
                userName: 'Financeiro',
                userRole: 'admin',
                category: 'financial',
                action: 'Pagamento de Folha Confirmado',
                details: `Confirmou quitação de R$ ${(selectedPayment.netAmount ?? selectedPayment.totalAmount).toFixed(2)} (${paymentMethod}) para ${prof?.name || 'Profissional'}.`
            });

            setSelectedPayment(null);
            toast.success('Pagamento liquidado com sucesso!');
        } catch (error) {
            console.error('Error marking payment as paid:', error);
            toast.error('Erro ao registrar quitação');
        }
    };

    const handleDeleteExpense = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Despesa',
            description: 'Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.',
            onConfirm: async () => {
                try {
                    await expensesApi.delete(id);
                    await loadData();
                    toast.success('Despesa excluída!');
                } catch (error) {
                    console.error('Error deleting expense:', error);
                    toast.error('Erro ao excluir despesa');
                }
            }
        });
    };

    const handleDeleteRevenue = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Receita',
            description: 'Tem certeza que deseja excluir este recebimento? Esta ação não pode ser desfeita.',
            onConfirm: async () => {
                try {
                    await revenuesApi.delete(id);
                    await loadData();
                    toast.success('Receita excluída!');
                } catch (error) {
                    console.error('Error deleting revenue:', error);
                    toast.error('Erro ao excluir receita');
                }
            }
        });
    };

    const handleDeleteAdvance = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancelar Vale / Adiantamento',
            description: 'Deseja realmente remover este vale concedido ao colaborador?',
            onConfirm: async () => {
                try {
                    await advancesApi.delete(id);
                    await loadData();
                    toast.success('Vale cancelado com sucesso!');
                } catch (error) {
                    console.error('Error deleting advance:', error);
                    toast.error('Erro ao cancelar vale');
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-80 space-y-3">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-sm font-semibold text-gray-500">Consolidando dados financeiros e folha...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12 animate-fade-in">
            {/* Header Unificado */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Financeiro Integrado FisioStar</h1>
                            <p className="text-xs text-gray-500">Faturamento, DRE, conferência de sessões, vales e gestão unificada da equipe</p>
                        </div>
                    </div>
                </div>

                {/* Controles de Unidade e Período */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Seletor de Unidade */}
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <select
                            value={selectedUnit}
                            onChange={(e) => setSelectedUnit(e.target.value)}
                            className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
                        >
                            <option value="ALL">Todas as Unidades (Consolidado)</option>
                            {units.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Navegação de Mês */}
                    <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-0.5">
                        <button
                            onClick={prevMonth}
                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                            title="Mês Anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-3 text-xs font-bold text-gray-800 capitalize select-none min-w-[130px] text-center">
                            {monthLabel}
                        </span>
                        <button
                            onClick={nextMonth}
                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                            title="Próximo Mês"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Botão de Exportar Relatório */}
                    <button
                        onClick={() => handleOpenExportForProf(undefined)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                        title="Exportar relatório com filtros avançados, impressão e WhatsApp"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Exportar / Extrato</span>
                    </button>

                    {/* Botões de Ação Rápida */}
                    <button
                        onClick={() => setShowAdvanceModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Novo Vale</span>
                    </button>

                    <button
                        onClick={() => { setSelectedExpense(null); setShowExpenseModal(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nova Despesa</span>
                    </button>

                    <button
                        onClick={() => setShowRevenueModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nova Receita</span>
                    </button>

                    <button
                        onClick={() => setShowCharts(!showCharts)}
                        className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${showCharts ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        title={showCharts ? "Ocultar Gráficos" : "Exibir Gráficos"}
                    >
                        <BarChart2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Sub-abas de Navegação: Folha & Fechamento | Equipe & Contratos | Fluxo de Caixa (DRE) */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
                <button
                    onClick={() => setActiveTab('payroll')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'payroll'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                        }`}
                >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Conferência de Folha & Sessões</span>
                </button>

                <button
                    onClick={() => setActiveTab('team')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'team'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                        }`}
                >
                    <User className="w-4 h-4" />
                    <span>Equipe, Contratos & Comissões</span>
                </button>

                <button
                    onClick={() => setActiveTab('cashflow')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'cashflow'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                        }`}
                >
                    <TrendingUp className="w-4 h-4" />
                    <span>Fluxo de Caixa & Lançamentos</span>
                </button>
            </div>

            {/* CONTEÚDO DA ABA: EQUIPE & CONTRATOS (EMBUTIDA NO FINANCEIRO) */}
            {activeTab === 'team' && (
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 animate-fade-in">
                    <div className="mb-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" />
                                Gestão Integrada da Equipe & Regimes Contratuais
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Gerencie profissionais, sócios com pró-labore, funcionários CLT, contratos PJ e percentuais por serviço prestado.
                            </p>
                        </div>
                    </div>
                    <Professionals currentUnit={selectedUnit === 'ALL' ? (units[0]?.id || '') : selectedUnit} />
                </div>
            )}

            {/* CONTEÚDO DAS DEMAIS ABAS (PAYROLL & CASHFLOW) */}
            {activeTab !== 'team' && (
                <>
                    {/* KPI Cards em Grid de 5 Colunas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                        {/* 1. Receitas */}
                        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Faturamento</span>
                                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">
                                    R$ {totalRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h3>
                                <p className="text-[11px] text-gray-400 mt-0.5">{revenues.length} recebimento(s)</p>
                            </div>
                        </div>

                        {/* 2. Despesas Gerais */}
                        <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">Despesas Clínicas</span>
                                <div className="p-2 bg-red-50 rounded-xl text-red-600">
                                    <TrendingDown className="w-4 h-4" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">
                                    R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h3>
                                <p className="text-[11px] text-gray-400 mt-0.5">{expenses.length} lançamento(s)</p>
                            </div>
                        </div>

                        {/* 3. Vales e Adiantamentos */}
                        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Vales Concedidos</span>
                                <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                                    <CreditCard className="w-4 h-4" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">
                                    R$ {totalAdvancesGiven.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h3>
                                <p className="text-[11px] text-gray-400 mt-0.5">{advances.length} vale(s) no mês</p>
                            </div>
                        </div>

                        {/* 4. Total a Pagar à Equipe */}
                        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Folha da Equipe</span>
                                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                                    <Briefcase className="w-4 h-4" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">
                                    R$ {totalTeamPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h3>
                                <p className="text-[11px] text-gray-400 mt-0.5">Líquido pendente de acerto</p>
                            </div>
                        </div>

                        {/* 5. Saldo Operacional */}
                        <div className="bg-gradient-to-br from-gray-900 to-slate-800 text-white p-4 rounded-2xl shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">Resultado Líquido</span>
                                <div className="p-2 bg-white/10 rounded-xl text-emerald-400">
                                    <DollarSign className="w-4 h-4" />
                                </div>
                            </div>
                            <div>
                                <h3 className={`text-xl font-black ${netOperatingBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    R$ {netOperatingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h3>
                                <p className="text-[11px] text-gray-400 mt-0.5">Saldo operacional da clínica</p>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard com Gráficos Opcionais */}
                    {showCharts && (
                        <div className="transition-all">
                            <FinancialDashboard revenues={revenues} expenses={expenses} />
                        </div>
                    )}

                    {/* SEÇÃO DE CONFERÊNCIA DA EQUIPE & FECHAMENTO DE FOLHA (Exibida na aba payroll ou cashflow) */}
                    {/* SEÇÃO DE CONFERÊNCIA DA EQUIPE & FECHAMENTO DE FOLHA (Exibida na aba payroll ou cashflow) */}
                    {activeTab === 'payroll' && (
                        <div className="space-y-4">
                            {/* Card Comparativo Agenda x Financeiro */}
                            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-5 text-white shadow-md border border-slate-800">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                                            <CalendarCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-base text-white">
                                                    Comparativo: Agenda FisioStar vs Financeiro
                                                </h3>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                                                    Auditoria Contínua
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-300 mt-0.5">
                                                Cruzamento em tempo real de sessões agendadas, confirmadas e realizadas no período de {formatDateBR(periodStart)} à {formatDateBR(periodEnd)}.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Seletor de Base de Cálculo da Folha */}
                                    <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl border border-white/15 backdrop-blur-xs">
                                        <span className="text-[10px] uppercase font-bold text-slate-300 px-2">Base Folha:</span>
                                        <button
                                            type="button"
                                            onClick={() => setPayrollBaseFilter('realized')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                payrollBaseFilter === 'realized'
                                                    ? 'bg-emerald-500 text-white shadow-xs'
                                                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                                            }`}
                                            title="Calcula a folha estritamente com as sessões realizadas ou canceladas em cima da hora"
                                        >
                                            Realizadas ({agendaComparisonStats.realizedCount})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPayrollBaseFilter('confirmed_realized')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                payrollBaseFilter === 'confirmed_realized'
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                                            }`}
                                            title="Inclui também sessões com confirmação de presença do paciente"
                                        >
                                            Confirmadas ({agendaComparisonStats.realizedCount + agendaComparisonStats.confirmedCount})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPayrollBaseFilter('all')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                payrollBaseFilter === 'all'
                                                    ? 'bg-purple-600 text-white shadow-xs'
                                                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                                            }`}
                                            title="Projeta o valor total considerando toda a agenda do mês"
                                        >
                                            Toda a Agenda ({agendaComparisonStats.totalCount})
                                        </button>
                                    </div>
                                </div>

                                {/* Métricas da Agenda */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                        <div className="text-[11px] font-medium text-slate-400">Total na Agenda</div>
                                        <div className="text-lg font-black text-white mt-0.5">
                                            {agendaComparisonStats.totalCount} <span className="text-xs font-normal text-slate-400">sessões</span>
                                        </div>
                                        <div className="text-xs text-blue-300 font-semibold mt-0.5">
                                            R$ {agendaComparisonStats.totalGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>

                                    <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                                        <div className="text-[11px] font-medium text-emerald-300 flex items-center justify-between">
                                            <span>Realizadas / Cobradas</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                                                {agendaComparisonStats.realizedPercent}%
                                            </span>
                                        </div>
                                        <div className="text-lg font-black text-emerald-400 mt-0.5">
                                            {agendaComparisonStats.realizedCount} <span className="text-xs font-normal text-emerald-300/70">sessões</span>
                                        </div>
                                        <div className="text-xs text-emerald-300 font-semibold mt-0.5">
                                            R$ {agendaComparisonStats.realizedGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>

                                    <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
                                        <div className="text-[11px] font-medium text-blue-300 flex items-center justify-between">
                                            <span>Confirmadas</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">
                                                {agendaComparisonStats.confirmedPercent}%
                                            </span>
                                        </div>
                                        <div className="text-lg font-black text-blue-400 mt-0.5">
                                            {agendaComparisonStats.confirmedCount} <span className="text-xs font-normal text-blue-300/70">sessões</span>
                                        </div>
                                        <div className="text-xs text-blue-300 font-semibold mt-0.5">
                                            R$ {agendaComparisonStats.confirmedGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>

                                    <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
                                        <div className="text-[11px] font-medium text-purple-300 flex items-center justify-between">
                                            <span>Agendadas (Aguardando)</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                                                {agendaComparisonStats.scheduledPercent}%
                                            </span>
                                        </div>
                                        <div className="text-lg font-black text-purple-400 mt-0.5">
                                            {agendaComparisonStats.scheduledCount} <span className="text-xs font-normal text-purple-300/70">sessões</span>
                                        </div>
                                        <div className="text-xs text-purple-300 font-semibold mt-0.5">
                                            R$ {agendaComparisonStats.scheduledGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden space-y-0">
                                {/* Cabeçalho da Folha com Seletor de Categoria */}
                                <div className="px-6 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/50">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-5 h-5 text-blue-600" />
                                            <h2 className="text-base font-bold text-gray-900">
                                                Conferência de Folha & Fechamento Financeiro
                                            </h2>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Folhas separadas por categoria: Corpo Clínico (produção/comissão) e Recepção/Secretárias (salário fixo e vales).
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2.5">
                                        {/* Seletor de Categoria: Corpo Clínico vs Recepção & Secretárias */}
                                        <div className="flex items-center bg-gray-200/70 p-1 rounded-xl">
                                            <button
                                                type="button"
                                                onClick={() => setPayrollStaffType('clinical')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    payrollStaffType === 'clinical'
                                                        ? 'bg-white text-blue-700 shadow-xs'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                                                <span>Corpo Clínico ({clinicalPayrollStats.length})</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setPayrollStaffType('secretaries')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    payrollStaffType === 'secretaries'
                                                        ? 'bg-white text-purple-700 shadow-xs'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                                                <span>Recepção & Secretárias ({secretaryPayrollStats.length})</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setPayrollStaffType('all')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    payrollStaffType === 'all'
                                                        ? 'bg-white text-gray-900 shadow-xs'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                <span>Ver Todos ({clinicalPayrollStats.length + secretaryPayrollStats.length})</span>
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => handleOpenExportForProf(undefined)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            <Download className="w-3.5 h-3.5 text-gray-500" />
                                            <span>Exportar Relatório</span>
                                        </button>
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200" title="Período contábil mensal">
                                            <Clock className="w-3.5 h-3.5" />
                                            {formatDateBR(periodStart)} à {formatDateBR(periodEnd)}
                                        </span>
                                    </div>
                                </div>

                                {/* TABELA 1: CORPO CLÍNICO */}
                                {(payrollStaffType === 'clinical' || payrollStaffType === 'all') && (
                                    <div>
                                        {payrollStaffType === 'all' && (
                                            <div className="px-6 py-2.5 bg-blue-50/40 border-b border-gray-100 flex items-center gap-2 text-xs font-bold text-blue-900">
                                                <UserCheck className="w-4 h-4 text-blue-600" />
                                                <span>Corpo Clínico — Fisioterapeutas & Sócios ({clinicalPayrollStats.length})</span>
                                            </div>
                                        )}
                                        <div className="overflow-x-auto min-h-[220px]">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-gray-100 bg-gray-50/70 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                        <th className="py-2.5 px-2.5">Profissional</th>
                                                        <th className="py-2.5 px-2 text-right whitespace-nowrap">Bruto</th>
                                                        <th className="py-2.5 px-1.5 text-center whitespace-nowrap">Atend.</th>
                                                        <th className="py-2.5 px-2 text-right whitespace-nowrap">Comissão</th>
                                                        <th className="py-2.5 px-2 text-right whitespace-nowrap">Margem</th>
                                                        <th className="py-2.5 px-1.5 text-right whitespace-nowrap">Fixo/Pró</th>
                                                        <th className="py-2.5 px-1.5 text-right whitespace-nowrap">Vales</th>
                                                        <th className="py-2.5 px-2 text-right whitespace-nowrap">Líquido</th>
                                                        <th className="py-2.5 px-1.5 text-center whitespace-nowrap">Status</th>
                                                        <th className="py-2.5 px-2 text-center whitespace-nowrap w-24">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 text-xs">
                                                    {clinicalPayrollStats.length > 0 ? (
                                                        clinicalPayrollStats.map((item, index, filteredArr) => {
                                                            const prof = item.professional;
                                                            const payment = item.existingPayment;
                                                            const isPaid = payment?.status === 'paid';
                                                            const isPendingPayment = payment?.status === 'pending';
                                                            const isLastRow = index >= filteredArr.length - 2 && filteredArr.length > 2;

                                                            const regimeBadge = {
                                                                socio: { label: 'Sócio', color: 'bg-amber-100 text-amber-900 border-amber-300' },
                                                                pj: { label: 'PJ', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                                                                clt: { label: 'CLT', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                                                                partnership: { label: 'Parceria', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                                                            }[prof.contractType || 'pj'] || { label: 'PJ', color: 'bg-gray-100 text-gray-700' };

                                                            return (
                                                                <tr key={prof.id} className="hover:bg-blue-50/30 transition-colors">
                                                                    {/* Profissional & Regime */}
                                                                    <td className="py-2.5 px-2.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <div
                                                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0 overflow-hidden"
                                                                                style={{ backgroundColor: prof.color || '#2563EB' }}
                                                                            >
                                                                                {prof.avatarUrl ? (
                                                                                    <img src={prof.avatarUrl} alt={prof.name} className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    prof.name.charAt(0)
                                                                                )}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="flex items-center gap-1">
                                                                                    <h4 className="font-bold text-gray-900 text-xs leading-tight truncate">{prof.name}</h4>
                                                                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${regimeBadge.color} shrink-0`}>
                                                                                        {regimeBadge.label}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="text-[10px] text-gray-400 truncate max-w-[125px]" title={prof.specialty}>
                                                                                    {prof.specialty}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>

                                                                    {/* Produção Bruta */}
                                                                    <td className="py-2.5 px-2 text-right font-bold text-gray-900 whitespace-nowrap text-xs">
                                                                        R$ {item.grossProduction.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </td>

                                                                    {/* Sessões Realizadas e Comparativo Agenda */}
                                                                    <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                                                                        <div className="inline-flex flex-col items-center">
                                                                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]" title="Sessões realizadas no período">
                                                                                {item.realizedCount} real.
                                                                            </span>
                                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                                {item.confirmedCount > 0 && (
                                                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200" title={`${item.confirmedCount} sessões confirmadas na agenda`}>
                                                                                        {item.confirmedCount} conf.
                                                                                    </span>
                                                                                )}
                                                                                {item.scheduledCount > 0 && (
                                                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200" title={`${item.scheduledCount} sessões agendadas`}>
                                                                                        {item.scheduledCount} agend.
                                                                                    </span>
                                                                                )}
                                                                                {item.lateCancellationsCount > 0 && (
                                                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-red-100 text-red-800 border border-red-200" title="Avisou em cima da hora (atendimento cobrado)">
                                                                                        {item.lateCancellationsCount} cobradas
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </td>

                                                                    {/* Comissões Produzidas */}
                                                                    <td className="py-2.5 px-2 text-right font-semibold text-blue-700 whitespace-nowrap text-xs">
                                                                        R$ {item.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                        {prof.services && prof.services.length > 0 && (
                                                                            <div className="text-[9px] text-gray-400 font-normal">
                                                                                {prof.services.length} serv.
                                                                            </div>
                                                                        )}
                                                                    </td>

                                                                    {/* Margem Retida da Clínica */}
                                                                    <td className="py-2.5 px-2 text-right font-bold text-emerald-700 whitespace-nowrap text-xs">
                                                                        R$ {item.clinicRetainedMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </td>

                                                                    {/* Salário Base CLT / Pró-labore */}
                                                                    <td className="py-2.5 px-1.5 text-right font-medium text-gray-600 whitespace-nowrap text-xs">
                                                                        {item.baseSalary > 0
                                                                            ? `R$ ${item.baseSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                                                            : <span className="text-gray-400">-</span>
                                                                        }
                                                                    </td>

                                                                    {/* Vales Descontados */}
                                                                    <td className="py-2.5 px-1.5 text-right font-bold text-amber-600 whitespace-nowrap text-xs">
                                                                        {item.totalAdvances > 0
                                                                            ? `- R$ ${item.totalAdvances.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                                                            : <span className="text-gray-400">-</span>
                                                                        }
                                                                    </td>

                                                                    {/* Líquido Devido */}
                                                                    <td className="py-2.5 px-2 text-right whitespace-nowrap text-xs">
                                                                        <span className="font-black text-emerald-600">
                                                                            R$ {item.netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                        </span>
                                                                        {item.totalClinicFee > 0 && (
                                                                            <div className="text-[9px] text-purple-600 font-medium">
                                                                                Taxa: -R$ {item.totalClinicFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                            </div>
                                                                        )}
                                                                    </td>

                                                                    {/* Status */}
                                                                    <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                                                                        {isPaid ? (
                                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                                Quitado
                                                                            </span>
                                                                        ) : isPendingPayment ? (
                                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                                                                Aguardando
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                                                Pendente
                                                                            </span>
                                                                        )}
                                                                    </td>

                                                                    {/* Ações */}
                                                                    <td className="py-2.5 px-2 text-center whitespace-nowrap w-24">
                                                                        <div className="relative inline-block text-left action-menu-container">
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setOpenActionMenuProfId(openActionMenuProfId === prof.id ? null : prof.id);
                                                                                }}
                                                                                className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                                                                                    openActionMenuProfId === prof.id
                                                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                                                                                }`}
                                                                                title="Ações para este profissional"
                                                                            >
                                                                                <span>Ações</span>
                                                                                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openActionMenuProfId === prof.id ? 'rotate-180' : ''}`} />
                                                                            </button>

                                                                            {openActionMenuProfId === prof.id && (
                                                                                <div
                                                                                    className={`absolute right-0 ${
                                                                                        isLastRow ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                                                                    } w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-gray-100 text-left`}
                                                                                >
                                                                                    <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                                                        {prof.name}
                                                                                    </div>

                                                                                    <div className="py-1">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setOpenActionMenuProfId(null);
                                                                                                handleOpenAuditModal(prof);
                                                                                            }}
                                                                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                                                                                        >
                                                                                            <Eye className="w-4 h-4 text-blue-600 shrink-0" />
                                                                                            <div>
                                                                                                <div className="font-bold text-gray-900">Conferir Sessões</div>
                                                                                                <div className="text-[10px] text-gray-400 font-normal">Auditar atendimentos e pacotes</div>
                                                                                            </div>
                                                                                        </button>

                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setOpenActionMenuProfId(null);
                                                                                                handleOpenExportForProf(prof.id);
                                                                                            }}
                                                                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-slate-50 hover:text-gray-900 transition-colors cursor-pointer"
                                                                                        >
                                                                                            <Download className="w-4 h-4 text-gray-500 shrink-0" />
                                                                                            <div>
                                                                                                <div className="font-bold text-gray-900">Exportar Extrato</div>
                                                                                                <div className="text-[10px] text-gray-400 font-normal">PDF, WhatsApp ou Excel</div>
                                                                                            </div>
                                                                                        </button>
                                                                                    </div>

                                                                                    <div className="py-1">
                                                                                        {payment && !isPaid ? (
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setOpenActionMenuProfId(null);
                                                                                                    handleMarkPaymentAsPaid(payment);
                                                                                                }}
                                                                                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                                                                            >
                                                                                                <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                                                                                                <div>
                                                                                                    <div className="font-bold text-emerald-700">Liquidar Pagamento</div>
                                                                                                    <div className="text-[10px] text-emerald-600/70 font-normal">Marcar como quitado</div>
                                                                                                </div>
                                                                                            </button>
                                                                                        ) : isPaid ? (
                                                                                            <div className="px-3.5 py-2 flex items-center gap-2 text-xs text-emerald-600 font-semibold bg-emerald-50/50">
                                                                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                                                                <div>
                                                                                                    <div className="font-bold text-emerald-700">Quitado</div>
                                                                                                    <div className="text-[10px] text-emerald-600/70 font-normal">Folha já liquidada</div>
                                                                                                </div>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setOpenActionMenuProfId(null);
                                                                                                    handleOpenAuditModal(prof);
                                                                                                }}
                                                                                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                                                                                            >
                                                                                                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                                                                                <div>
                                                                                                    <div className="font-bold text-amber-700">Gerar Fechamento</div>
                                                                                                    <div className="text-[10px] text-amber-600/70 font-normal">Conferir antes de pagar</div>
                                                                                                </div>
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={10} className="py-12 text-center text-gray-400">
                                                                Nenhum profissional do corpo clínico ativo com atendimentos ou folha no período.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* TABELA 2: RECEPÇÃO & SECRETÁRIAS (SEPARADA PARA NÃO CONFUNDIR) */}
                                {(payrollStaffType === 'secretaries' || payrollStaffType === 'all') && (
                                    <div className={payrollStaffType === 'all' ? 'border-t-2 border-purple-100' : ''}>
                                        <div className="px-6 py-3 bg-purple-50/60 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 text-xs font-bold text-purple-950">
                                                <Briefcase className="w-4 h-4 text-purple-600" />
                                                <span>Recepção & Secretárias — Administrativo CLT ({secretaryPayrollStats.length})</span>
                                            </div>
                                            <span className="text-[11px] text-purple-700 font-medium">
                                                Cálculo simplificado: <strong>Salário Fixo Mensal</strong> menos <strong>Vales e Adiantamentos</strong>
                                            </span>
                                        </div>

                                        <div className="overflow-x-auto min-h-[180px]">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-gray-100 bg-gray-50/70 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                        <th className="py-2.5 px-3">Colaboradora</th>
                                                        <th className="py-2.5 px-3">Unidade</th>
                                                        <th className="py-2.5 px-2 text-center">Regime</th>
                                                        <th className="py-2.5 px-3 text-right">Salário Fixo Mensal</th>
                                                        <th className="py-2.5 px-3 text-right">Vales Descontados</th>
                                                        <th className="py-2.5 px-3 text-right">Líquido a Pagar</th>
                                                        <th className="py-2.5 px-2 text-center">Status</th>
                                                        <th className="py-2.5 px-3 text-center w-28">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 text-xs">
                                                    {secretaryPayrollStats.length > 0 ? (
                                                        secretaryPayrollStats.map((item, index, filteredArr) => {
                                                            const prof = item.professional;
                                                            const payment = item.existingPayment;
                                                            const isPaid = payment?.status === 'paid';
                                                            const isPendingPayment = payment?.status === 'pending';
                                                            const isLastRow = index >= filteredArr.length - 2 && filteredArr.length > 2;

                                                            const profUnitNames = (prof.unitIds || [])
                                                                .map(uid => units.find(u => u.id === uid)?.name)
                                                                .filter(Boolean)
                                                                .join(', ') || (selectedUnit !== 'ALL' ? units.find(u => u.id === selectedUnit)?.name : 'Todas as Unidades');

                                                            return (
                                                                <tr key={prof.id} className="hover:bg-purple-50/30 transition-colors">
                                                                    {/* Colaboradora */}
                                                                    <td className="py-3 px-3">
                                                                        <div className="flex items-center gap-2.5">
                                                                            <div
                                                                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0 overflow-hidden"
                                                                                style={{ backgroundColor: prof.color || '#7C3AED' }}
                                                                            >
                                                                                {prof.avatarUrl ? (
                                                                                    <img src={prof.avatarUrl} alt={prof.name} className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    prof.name.charAt(0)
                                                                                )}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="font-bold text-gray-900 text-xs leading-tight truncate">
                                                                                    {prof.name}
                                                                                </div>
                                                                                <div className="text-[10px] text-purple-700 font-medium truncate mt-0.5">
                                                                                    {prof.specialty || 'Recepção & Administrativo'}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>

                                                                    {/* Unidade */}
                                                                    <td className="py-3 px-3 text-gray-600 text-xs">
                                                                        <span className="inline-flex items-center gap-1 font-medium bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-lg text-[11px]">
                                                                            <Building2 className="w-3 h-3 text-gray-400" />
                                                                            {profUnitNames}
                                                                        </span>
                                                                    </td>

                                                                    {/* Regime */}
                                                                    <td className="py-3 px-2 text-center">
                                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-blue-50 text-blue-700 border-blue-200">
                                                                            CLT
                                                                        </span>
                                                                    </td>

                                                                    {/* Salário Fixo Mensal (com lápis para edição rápida) */}
                                                                    <td className="py-3 px-3 text-right whitespace-nowrap">
                                                                        <div className="inline-flex items-center gap-1.5">
                                                                            <span className="font-bold text-gray-900 text-xs">
                                                                                R$ {(item.baseSalary || 1800).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setEditingSalaryProf({
                                                                                        id: prof.id,
                                                                                        name: prof.name,
                                                                                        baseSalary: item.baseSalary || 1800
                                                                                    });
                                                                                    setTempSalaryValue(String(item.baseSalary || 1800));
                                                                                }}
                                                                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                                                                title="Ajustar salário fixo mensal"
                                                                            >
                                                                                <Edit className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    </td>

                                                                    {/* Vales Descontados */}
                                                                    <td className="py-3 px-3 text-right whitespace-nowrap">
                                                                        {item.totalAdvances > 0 ? (
                                                                            <span className="font-bold text-amber-600 text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                                                                - R$ {item.totalAdvances.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-400">—</span>
                                                                        )}
                                                                    </td>

                                                                    {/* Líquido a Pagar */}
                                                                    <td className="py-3 px-3 text-right whitespace-nowrap">
                                                                        <span className="font-black text-emerald-600 text-sm">
                                                                            R$ {item.netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                        </span>
                                                                    </td>

                                                                    {/* Status */}
                                                                    <td className="py-3 px-2 text-center whitespace-nowrap">
                                                                        {isPaid ? (
                                                                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                                Quitado
                                                                            </span>
                                                                        ) : isPendingPayment ? (
                                                                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                                                                Aguardando
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                                                Pendente
                                                                            </span>
                                                                        )}
                                                                    </td>

                                                                    {/* Ações */}
                                                                    <td className="py-3 px-3 text-center whitespace-nowrap w-28">
                                                                        <div className="relative inline-block text-left action-menu-container">
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setOpenActionMenuProfId(openActionMenuProfId === prof.id ? null : prof.id);
                                                                                }}
                                                                                className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                                                                                    openActionMenuProfId === prof.id
                                                                                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                                                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
                                                                                }`}
                                                                            >
                                                                                <span>Ações</span>
                                                                                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openActionMenuProfId === prof.id ? 'rotate-180' : ''}`} />
                                                                            </button>

                                                                            {openActionMenuProfId === prof.id && (
                                                                                <div
                                                                                    className={`absolute right-0 ${
                                                                                        isLastRow ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                                                                    } w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-gray-100 text-left`}
                                                                                >
                                                                                    <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                                                        {prof.name}
                                                                                    </div>

                                                                                    <div className="py-1">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setOpenActionMenuProfId(null);
                                                                                                handleOpenAuditModal(prof);
                                                                                            }}
                                                                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                                                                                        >
                                                                                            <Briefcase className="w-4 h-4 text-purple-600 shrink-0" />
                                                                                            <div>
                                                                                                <div className="font-bold text-gray-900">Fechar Folha</div>
                                                                                                <div className="text-[10px] text-gray-400 font-normal">Salário fixo & vales</div>
                                                                                            </div>
                                                                                        </button>

                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setOpenActionMenuProfId(null);
                                                                                                setShowAdvanceModal(true);
                                                                                            }}
                                                                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                                                                                        >
                                                                                            <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                                                                                            <div>
                                                                                                <div className="font-bold text-amber-800">Lançar Vale</div>
                                                                                                <div className="text-[10px] text-amber-600/70 font-normal">Adiantamento salarial</div>
                                                                                            </div>
                                                                                        </button>

                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setOpenActionMenuProfId(null);
                                                                                                handleOpenExportForProf(prof.id);
                                                                                            }}
                                                                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-slate-50 hover:text-gray-900 transition-colors cursor-pointer"
                                                                                        >
                                                                                            <Download className="w-4 h-4 text-gray-500 shrink-0" />
                                                                                            <div>
                                                                                                <div className="font-bold text-gray-900">Exportar Recibo</div>
                                                                                                <div className="text-[10px] text-gray-400 font-normal">PDF ou WhatsApp</div>
                                                                                            </div>
                                                                                        </button>
                                                                                    </div>

                                                                                    <div className="py-1">
                                                                                        {payment && !isPaid ? (
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setOpenActionMenuProfId(null);
                                                                                                    handleMarkPaymentAsPaid(payment);
                                                                                                }}
                                                                                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                                                                            >
                                                                                                <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                                                                                                <div>
                                                                                                    <div className="font-bold text-emerald-700">Liquidar Pagamento</div>
                                                                                                    <div className="text-[10px] text-emerald-600/70 font-normal">Marcar como quitado</div>
                                                                                                </div>
                                                                                            </button>
                                                                                        ) : isPaid ? (
                                                                                            <div className="px-3.5 py-2 flex items-center gap-2 text-xs text-emerald-600 font-semibold bg-emerald-50/50">
                                                                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                                                                <div>
                                                                                                    <div className="font-bold text-emerald-700">Quitado</div>
                                                                                                    <div className="text-[10px] text-emerald-600/70 font-normal">Folha já liquidada</div>
                                                                                                </div>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setOpenActionMenuProfId(null);
                                                                                                    handleOpenAuditModal(prof);
                                                                                                }}
                                                                                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                                                                                            >
                                                                                                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                                                                                                <div>
                                                                                                    <div className="font-bold text-purple-700">Aprovar Folha</div>
                                                                                                    <div className="text-[10px] text-purple-600/70 font-normal">Gerar fechamento</div>
                                                                                                </div>
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={8} className="py-8 text-center text-gray-400">
                                                                Nenhuma secretária ou recepcionista cadastrada para a unidade selecionada.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                    </div>
                )}

                    {/* SEÇÃO 2: VALES & ADIANTAMENTOS CONCEDIDOS */}
                    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/30">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-amber-600" />
                                    Vales & Adiantamentos Concedidos no Período
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Adiantamentos realizados à equipe que serão abatidos no fechamento mensal.
                                </p>
                            </div>

                            <button
                                onClick={() => setShowAdvanceModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Novo Vale</span>
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-bold text-gray-500 uppercase">
                                        <th className="py-2.5 px-4">Data</th>
                                        <th className="py-2.5 px-4">Colaborador</th>
                                        <th className="py-2.5 px-4">Descrição / Motivo</th>
                                        <th className="py-2.5 px-4">Forma</th>
                                        <th className="py-2.5 px-4 text-right">Valor</th>
                                        <th className="py-2.5 px-4 text-center">Status</th>
                                        <th className="py-2.5 px-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {advances.length > 0 ? (
                                        advances.map(adv => {
                                            const prof = professionals.find(p => p.id === adv.professionalId);
                                            return (
                                                <tr key={adv.id} className="hover:bg-gray-50/60">
                                                    <td className="py-2.5 px-4 font-semibold text-gray-700">
                                                        {formatDateBR(adv.advanceDate)}
                                                    </td>
                                                    <td className="py-2.5 px-4 font-bold text-gray-900">
                                                        {prof?.name || 'Profissional'}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-gray-600">
                                                        {adv.description || 'Adiantamento salarial'}
                                                    </td>
                                                    <td className="py-2.5 px-4 uppercase text-[11px] font-bold text-gray-500">
                                                        {adv.paymentMethod || 'PIX'}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right font-black text-amber-700">
                                                        R$ {adv.amount.toFixed(2)}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${adv.status === 'deducted' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-800'}`}>
                                                            {adv.status === 'deducted' ? 'Deduzido na Folha' : 'Pendente de Abate'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center">
                                                        {adv.status !== 'deducted' && (
                                                            <button
                                                                onClick={() => handleDeleteAdvance(adv.id)}
                                                                className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                                                title="Cancelar Vale"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="py-6 text-center text-gray-400 text-xs">
                                                Nenhum vale ou adiantamento concedido neste período.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* SEÇÃO 3: FLUXO DE CAIXA (RECEITAS & DESPESAS DO MÊS) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Tabela de Receitas */}
                        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden flex flex-col">
                            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/40">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                                    <h3 className="text-sm font-bold text-gray-900">Receitas Entrantes ({revenues.length})</h3>
                                </div>
                                <button
                                    onClick={() => setShowRevenueModal(true)}
                                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Nova Receita
                                </button>
                            </div>

                            <div className="flex-1 overflow-x-auto max-h-80 custom-scrollbar">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50/70 text-[10px] font-bold text-gray-500 uppercase sticky top-0">
                                        <tr>
                                            <th className="py-2 px-2">Data</th>
                                            <th className="py-2 px-2">Descrição</th>
                                            <th className="py-2 px-2">Forma</th>
                                            <th className="py-2 px-2 text-right">Bruto</th>
                                            <th className="py-2 px-2 text-right">Líquido</th>
                                            <th className="py-2 px-1 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {revenues.length > 0 ? (
                                            revenues.map(rev => {
                                                const paymentMethodName = {
                                                    PIX: 'PIX',
                                                    CREDIT_CARD: 'Crédito',
                                                    DEBIT_CARD: 'Débito',
                                                    CASH: 'Dinheiro',
                                                    BANK_TRANSFER: 'Transf.',
                                                    BOLETO: 'Boleto'
                                                }[rev.paymentMethod || 'PIX'] || rev.paymentMethod;

                                                return (
                                                    <tr key={rev.id} className="hover:bg-gray-50/50">
                                                        <td className="py-2 px-2 font-medium text-gray-600 whitespace-nowrap text-[11px]">
                                                            {formatDateBR(rev.revenueDate)}
                                                        </td>
                                                        <td className="py-2 px-2 font-semibold text-gray-900 text-xs">
                                                            <div className="truncate max-w-[130px]" title={rev.description}>
                                                                {rev.description}
                                                            </div>
                                                        </td>
                                                        <td className="py-2 px-2 text-[10px] font-bold text-gray-500 whitespace-nowrap">
                                                            {paymentMethodName}
                                                            {rev.feePercentage ? ` (${rev.feePercentage}%)` : ''}
                                                        </td>
                                                        <td className="py-2 px-2 text-right font-medium text-gray-600 whitespace-nowrap text-xs">
                                                            R$ {rev.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-2 px-2 text-right font-black text-emerald-600 whitespace-nowrap text-xs">
                                                            R$ {(rev.netAmount ?? rev.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-2 px-1 text-center whitespace-nowrap">
                                                            <button
                                                                onClick={() => handleDeleteRevenue(rev.id)}
                                                                className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                                                title="Excluir Receita"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                                                    Nenhuma receita lançada no período.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Tabela de Despesas */}
                        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden flex flex-col">
                            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-red-50/40">
                                <div className="flex items-center gap-2">
                                    <TrendingDown className="w-4 h-4 text-red-600" />
                                    <h3 className="text-sm font-bold text-gray-900">Despesas Clínicas ({expenses.length})</h3>
                                </div>
                                <button
                                    onClick={() => { setSelectedExpense(null); setShowExpenseModal(true); }}
                                    className="text-xs font-bold text-red-700 hover:text-red-800 flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Nova Despesa
                                </button>
                            </div>

                            <div className="flex-1 overflow-x-auto max-h-80 custom-scrollbar">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50/70 text-[10px] font-bold text-gray-500 uppercase sticky top-0">
                                        <tr>
                                            <th className="py-2 px-2">Data</th>
                                            <th className="py-2 px-2">Descrição</th>
                                            <th className="py-2 px-2">Categoria</th>
                                            <th className="py-2 px-2 text-right">Valor</th>
                                            <th className="py-2 px-1 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {expenses.length > 0 ? (
                                            expenses.map(exp => {
                                                const categoryName = {
                                                    Maintenance: 'Manutenção',
                                                    Utilities: 'Contas/Luz',
                                                    Supplies: 'Insumos',
                                                    Rent: 'Aluguel',
                                                    Salaries: 'Salários',
                                                    Marketing: 'Marketing',
                                                    Taxes: 'Impostos',
                                                    Other: 'Outros'
                                                }[exp.category] || exp.category;

                                                return (
                                                    <tr key={exp.id} className="hover:bg-gray-50/50">
                                                        <td className="py-2 px-2 font-medium text-gray-600 whitespace-nowrap text-[11px]">
                                                            {formatDateBR(exp.expenseDate)}
                                                        </td>
                                                        <td className="py-2 px-2 font-semibold text-gray-900 text-xs">
                                                            <div className="truncate max-w-[150px]" title={exp.description}>
                                                                {exp.description}
                                                            </div>
                                                        </td>
                                                        <td className="py-2 px-2 text-gray-500 text-[11px] whitespace-nowrap">
                                                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-medium">
                                                                {categoryName}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-2 text-right font-black text-red-600 whitespace-nowrap text-xs">
                                                            R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-2 px-1 text-center whitespace-nowrap">
                                                            <button
                                                                onClick={() => handleDeleteExpense(exp.id)}
                                                                className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                                                title="Excluir Despesa"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                                                    Nenhuma despesa lançada no período.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* MODAL: AUDITORIA & CONFERÊNCIA DETALHADA DE SESSÕES */}
            {showAuditModal && auditingProf && (
                <SessionAuditModal
                    professional={auditingProf}
                    professionals={professionals}
                    sessions={allSessions.filter(s =>
                        s.professionalId === auditingProf.id &&
                        s.date >= periodStart &&
                        s.date <= periodEnd &&
                        (selectedUnit === 'ALL' || s.unitId === selectedUnit)
                    )}
                    advances={advances.filter(a => a.professionalId === auditingProf.id && a.status !== 'cancelled')}
                    existingPayment={payments.find(p => p.professionalId === auditingProf.id)}
                    periodStart={periodStart}
                    periodEnd={periodEnd}
                    patients={patients}
                    units={units}
                    selectedUnit={selectedUnit}
                    onToggleLateCancellation={handleToggleLateCancellation}
                    onSessionUpdated={(sessionId, newStatus) => {
                        setAllSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: newStatus as any } : s));
                    }}
                    onSessionTransferred={(sessionId, targetProfId) => {
                        setAllSessions(prev => prev.map(s => s.id === sessionId ? { ...s, professionalId: targetProfId } : s));
                    }}
                    onSessionDetailsUpdated={(updatedSession) => {
                        setAllSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
                    }}
                    onPatientCreated={(newPat) => {
                        setPatients(prev => [newPat, ...prev]);
                    }}
                    onPatientUpdated={(updatedPat) => {
                        setPatients(prev => prev.map(p => p.id === updatedPat.id ? updatedPat : p));
                    }}
                    onClose={() => {
                        setShowAuditModal(false);
                        setAuditingProf(null);
                    }}
                    onApprove={async (paymentPayload, advanceIdsToDeduct) => {
                        try {
                            const newPayment = await paymentsApi.create(paymentPayload);
                            if (advanceIdsToDeduct.length > 0) {
                                await advancesApi.markAsDeducted(advanceIdsToDeduct, newPayment.id);
                            }

                            await auditLogsApi.logAction({
                                userName: 'Financeiro',
                                userRole: 'admin',
                                category: 'financial',
                                action: 'Fechamento de Folha Aprovado',
                                details: `Aprovou conferência de ${paymentPayload.totalSessions} sessões do profissional ${auditingProf.name}, valor líquido: R$ ${paymentPayload.totalAmount.toFixed(2)}.`
                            });

                            toast.success(`Fechamento de ${auditingProf.name} aprovado com sucesso!`);
                            await loadData();
                            setShowAuditModal(false);
                            setAuditingProf(null);
                        } catch (err) {
                            console.error(err);
                            toast.error('Erro ao aprovar fechamento');
                        }
                    }}
                />
            )}

            {/* MODAL: EXPORTAR RELATÓRIO / EXTRATO COM FILTROS AVANÇADOS */}
            {showExportModal && (
                <ExportReportModal
                    initialProfId={exportInitialProfId}
                    professionals={professionals}
                    sessions={allSessions}
                    payments={allPayments.length > 0 ? allPayments : payments}
                    advances={allAdvances.length > 0 ? allAdvances : advances}
                    patients={patients}
                    units={units}
                    periodStart={periodStart}
                    periodEnd={periodEnd}
                    calculateSessionCommission={calculateSessionCommission}
                    onClose={() => {
                        setShowExportModal(false);
                        setExportInitialProfId(undefined);
                    }}
                />
            )}

            {/* MODAL: LANÇAR NOVO VALE / ADIANTAMENTO */}
            {showAdvanceModal && (
                <AdvanceModal
                    professionals={professionals}
                    units={units}
                    currentUnit={selectedUnit}
                    userId={currentUserId}
                    onSave={async (advData) => {
                        try {
                            await advancesApi.create(advData);
                            await loadData();
                            setShowAdvanceModal(false);
                            toast.success('Vale registrado com sucesso!');

                            const prof = professionals.find(p => p.id === advData.professionalId);
                            await auditLogsApi.logAction({
                                userName: 'Financeiro',
                                userRole: 'admin',
                                category: 'financial',
                                action: 'Vale Concedido a Colaborador',
                                details: `Concedeu vale no valor de R$ ${advData.amount.toFixed(2)} para ${prof?.name || 'Profissional'}.`
                            });
                        } catch (err) {
                            console.error(err);
                            toast.error('Erro ao registrar vale');
                        }
                    }}
                    onCancel={() => setShowAdvanceModal(false)}
                />
            )}

            {/* MODAL: DESPESA */}
            {showExpenseModal && (
                <ExpenseModal
                    expense={selectedExpense}
                    unitId={selectedUnit}
                    units={units}
                    userId={currentUserId}
                    onSave={async (expenseData) => {
                        try {
                            await expensesApi.create(expenseData);
                            await loadData();
                            setShowExpenseModal(false);
                            toast.success('Despesa salva com sucesso!');
                        } catch (error) {
                            console.error(error);
                            toast.error('Erro ao salvar despesa');
                        }
                    }}
                    onCancel={() => setShowExpenseModal(false)}
                />
            )}

            {/* MODAL: RECEITA */}
            {showRevenueModal && (
                <RevenueModal
                    unitId={selectedUnit}
                    units={units}
                    userId={currentUserId}
                    patients={patients}
                    onSave={async (revenueData) => {
                        try {
                            await revenuesApi.create(revenueData);
                            await loadData();
                            setShowRevenueModal(false);
                            toast.success('Receita salva com sucesso!');
                        } catch (error) {
                            console.error(error);
                            toast.error('Erro ao salvar receita');
                        }
                    }}
                    onCancel={() => setShowRevenueModal(false)}
                />
            )}

            {/* MODAL: QUITAR PAGAMENTO */}
            {showPaymentModal && selectedPayment && (
                <PaymentModal
                    payment={selectedPayment}
                    professional={professionals.find(p => p.id === selectedPayment.professionalId)}
                    onConfirm={confirmPayment}
                    onCancel={() => {
                        setShowPaymentModal(false);
                        setSelectedPayment(null);
                    }}
                />
            )}

            {/* MODAL: AJUSTE RÁPIDO DE SALÁRIO FIXO */}
            {editingSalaryProf && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full p-5 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <Edit className="w-4 h-4 text-blue-600" />
                                <h3 className="font-bold text-gray-900 text-sm">Ajustar Salário Fixo</h3>
                            </div>
                            <button
                                onClick={() => setEditingSalaryProf(null)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5">Colaborador(a):</p>
                            <p className="text-sm font-bold text-gray-900">{editingSalaryProf.name}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                                Salário Fixo Mensal (R$)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={tempSalaryValue}
                                    onChange={(e) => setTempSalaryValue(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm font-bold text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="1800.00"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setEditingSalaryProf(null)}
                                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    const val = parseFloat(tempSalaryValue);
                                    if (isNaN(val) || val < 0) {
                                        toast.error('Informe um valor válido de salário');
                                        return;
                                    }
                                    try {
                                        await professionalsApi.update(editingSalaryProf.id, { baseSalary: val });
                                        toast.success(`Salário fixo de ${editingSalaryProf.name} atualizado para R$ ${val.toFixed(2)}!`);
                                        setEditingSalaryProf(null);
                                        await loadData();
                                    } catch (err) {
                                        console.error(err);
                                        toast.error('Erro ao atualizar salário');
                                    }
                                }}
                                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>Salvar Salário</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CONFIRMAÇÃO */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                description={confirmModal.description}
                onConfirm={confirmModal.onConfirm}
                onClose={closeConfirmModal}
            />
        </div>
    );
};

// =========================================================================
// SUB-MODAIS: AUDITORIA DETALHADA DE SESSÕES & FOLHA (O CORAÇÃO DO SISTEMA)
// =========================================================================

interface SessionAuditModalProps {
    professional: Professional;
    professionals: Professional[];
    sessions: Session[];
    advances: EmployeeAdvance[];
    existingPayment?: Payment;
    periodStart: string;
    periodEnd: string;
    patients: Patient[];
    units: any[];
    selectedUnit: string;
    onToggleLateCancellation: (sessionId: string, currentStatus: boolean) => Promise<void>;
    onClose: () => void;
    onApprove: (paymentPayload: any, advanceIdsToDeduct: string[]) => Promise<void>;
    onSessionUpdated?: (sessionId: string, newStatus: string) => void;
    onSessionTransferred?: (sessionId: string, targetProfId: string) => void;
    onSessionDetailsUpdated?: (updatedSession: Session) => void;
    onPatientCreated?: (newPatient: Patient) => void;
    onPatientUpdated?: (updatedPatient: Patient) => void;
}

type PaymentMethodType = 'PIX' | 'Dinheiro' | 'Débito' | 'Crédito' | 'SumUp';

interface SessionOverride {
    price?: number;
    paymentMethod?: PaymentMethodType;
    cardFeeRate?: number;
    commissionValue?: number;
    commissionType?: 'percentage' | 'fixed';
    coveredByProfId?: string; // Se atendido por colega (cobertura com dedução de 50%)
    isCoveredByPackage?: boolean;
}

const PAYMENT_METHODS: { id: PaymentMethodType; label: string; defaultFee: number }[] = [
    { id: 'PIX', label: 'PIX (0%)', defaultFee: 0 },
    { id: 'Dinheiro', label: 'Dinheiro (0%)', defaultFee: 0 },
    { id: 'Débito', label: 'Débito (1,45%)', defaultFee: 1.45 },
    { id: 'Crédito', label: 'Crédito (3,51%)', defaultFee: 3.51 },
    { id: 'SumUp', label: 'SumUp (0%)', defaultFee: 0 },
];

const PACKAGE_TEMPLATES = [
    { id: '10A', name: 'Fisioterapia — Pacote 10 Sessões (10S)', sessions: 10, price: 350 },
    { id: '8A', name: 'Fisioterapia — Pacote 8 Sessões (8S)', sessions: 8, price: 250 },
    { id: '4A', name: 'Fisioterapia — Pacote 4 Sessões (4S)', sessions: 4, price: 150 },
    { id: '2A', name: 'Fisioterapia — Pacote 2 Sessões (2S)', sessions: 2, price: 75 },
    { id: '1A', name: 'Fisioterapia — Atendimento / Sessão Avulsa (1S)', sessions: 1, price: 35 },
    { id: '4A+4A', name: 'Fisioterapia — Pacote Duplo (4S + 4S)', sessions: 8, price: 300 },
    { id: 'PILATES_8', name: 'Pilates — Mensalidade 2x/Semana (8 Sessões)', sessions: 8, price: 240 },
    { id: 'HIDRO_8', name: 'Hidroterapia / Natação — Pacote 8 Sessões', sessions: 8, price: 250 },
    { id: 'CUSTOM', name: 'Personalizado', sessions: 10, price: 350 }
];

const getDefaultCardFeeRate = (method?: string): number => {
    if (!method) return 0;
    const lower = method.toLowerCase();
    if (lower.includes('débito') || lower.includes('debito')) return 1.45;
    if (lower.includes('crédito') || lower.includes('credito')) return 3.51;
    return 0;
};

const COMMON_MODALITIES = [
    'Fisioterapia',
    'Pilates',
    'RPG',
    'Drenagem Linfática',
    'Osteopatia',
    'Hidroterapia',
    'Acupuntura',
    'Massoterapia'
];

// =========================================================================
// MODAL: EDIÇÃO COMPLETA DE SESSÃO NA AUDITORIA / CONFERÊNCIA
// =========================================================================

interface AuditEditSessionModalProps {
    session: Session;
    patients: Patient[];
    currentUnit: string;
    allUnits: any[];
    onClose: () => void;
    onSaved: (updatedSession: Session) => void;
    onPatientCreated?: (newPatient: Patient) => void;
    onPatientUpdated?: (updatedPatient: Patient) => void;
}

const AuditEditSessionModal: React.FC<AuditEditSessionModalProps> = ({
    session,
    patients,
    currentUnit,
    allUnits,
    onClose,
    onSaved,
    onPatientCreated,
    onPatientUpdated
}) => {
    // 1. Data e Hora
    const [date, setDate] = useState<string>(session.date || '');
    const [time, setTime] = useState<string>(session.time ? session.time.substring(0, 5) : '08:00');

    // 2. Paciente
    const [patientId, setPatientId] = useState<string>(session.patientId || '');
    const [patientSearch, setPatientSearch] = useState<string>('');
    const [isEditingPatient, setIsEditingPatient] = useState<boolean>(false);
    const [editedPatientName, setEditedPatientName] = useState<string>('');
    const [editedPatientPhone, setEditedPatientPhone] = useState<string>('');
    const [savingPatient, setSavingPatient] = useState<boolean>(false);
    const [showQuickPatientModal, setShowQuickPatientModal] = useState<boolean>(false);

    // 3. Procedimento / Especialidade
    const [type, setType] = useState<string>(session.type || 'Fisioterapia');

    // 4. Pacote / Plano
    const [isPartOfPackage, setIsPartOfPackage] = useState<boolean>(
        Boolean(session.packageSessionNumber || session.packageTotalSessions || (session as any).isCoveredByPackage)
    );
    const [patientPlans, setPatientPlans] = useState<any[]>([]);
    const [loadingPlans, setLoadingPlans] = useState<boolean>(false);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [packageSessionNumber, setPackageSessionNumber] = useState<number>(session.packageSessionNumber || 1);
    const [packageTotalSessions, setPackageTotalSessions] = useState<number>(session.packageTotalSessions || 10);

    // Mini form para criação de novo pacote do paciente
    const [showNewPkgForm, setShowNewPkgForm] = useState<boolean>(false);
    const [newPkgTemplate, setNewPkgTemplate] = useState<string>('10A');
    const [newPkgName, setNewPkgName] = useState<string>('Fisioterapia — Pacote 10 Sessões (10S)');
    const [newPkgTotalSessions, setNewPkgTotalSessions] = useState<number>(10);
    const [newPkgPrice, setNewPkgPrice] = useState<number>(350);
    const [newPkgPaymentDate, setNewPkgPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [newPkgPaymentMethod, setNewPkgPaymentMethod] = useState<string>('PIX');
    const [savingNewPkg, setSavingNewPkg] = useState<boolean>(false);

    // Estado geral de salvamento
    const [saving, setSaving] = useState<boolean>(false);

    const currentPatient = useMemo(() => {
        return patients.find(p => p.id === patientId);
    }, [patients, patientId]);

    // Inicializa edição rápida do paciente
    useEffect(() => {
        if (currentPatient) {
            setEditedPatientName(currentPatient.name || '');
            setEditedPatientPhone(currentPatient.phone || '');
        }
    }, [currentPatient]);

    // Carrega os pacotes/planos do paciente selecionado
    const loadPatientPlans = async (targetPatientId: string) => {
        if (!targetPatientId) {
            setPatientPlans([]);
            return;
        }
        setLoadingPlans(true);
        try {
            const allPlans = await patientPlansApi.getAll();
            const filtered = (allPlans || []).filter((p: any) => p.patient_id === targetPatientId);
            setPatientPlans(filtered);
            if (filtered.length > 0) {
                const matched = filtered[0];
                setSelectedPlanId(matched.id);
                if (matched.total_sessions && !session.packageTotalSessions) {
                    setPackageTotalSessions(Number(matched.total_sessions));
                }
            }
        } catch (err) {
            console.error('Erro ao carregar pacotes do paciente:', err);
        } finally {
            setLoadingPlans(false);
        }
    };

    useEffect(() => {
        if (patientId) {
            loadPatientPlans(patientId);
        }
    }, [patientId]);

    // Filtro de busca de pacientes
    const filteredPatients = useMemo(() => {
        if (!patientSearch.trim()) return patients;
        const q = patientSearch.toLowerCase();
        return patients.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.phone && p.phone.includes(q)) ||
            (p.cpf && p.cpf.includes(q))
        );
    }, [patients, patientSearch]);

    // Salvar alteração rápida dos dados do paciente (nome / telefone)
    const handleSavePatientData = async () => {
        if (!currentPatient) return;
        if (!editedPatientName.trim()) {
            toast.error('Informe o nome do paciente');
            return;
        }
        setSavingPatient(true);
        try {
            const updated = await patientsApi.update(currentPatient.id, {
                name: editedPatientName.trim(),
                phone: editedPatientPhone.trim()
            });
            if (onPatientUpdated) {
                onPatientUpdated(updated);
            }
            setIsEditingPatient(false);
            toast.success(`Cadastro de ${updated.name} atualizado com sucesso!`);
        } catch (err) {
            console.error('Erro ao atualizar paciente:', err);
            toast.error('Erro ao salvar dados do paciente');
        } finally {
            setSavingPatient(false);
        }
    };

    // Criar novo pacote para o paciente diretamente
    const handleCreatePackage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId) {
            toast.error('Selecione um paciente primeiro');
            return;
        }
        setSavingNewPkg(true);
        try {
            const created = await patientPlansApi.create({
                patientId,
                name: newPkgName,
                totalSessions: newPkgTotalSessions,
                price: newPkgPrice,
                paymentDate: newPkgPaymentDate,
                paymentMethod: newPkgPaymentMethod
            });

            await loadPatientPlans(patientId);
            setSelectedPlanId(created.id);
            setPackageSessionNumber(1);
            setPackageTotalSessions(newPkgTotalSessions);
            setIsPartOfPackage(true);
            setShowNewPkgForm(false);
            toast.success(`Novo pacote de ${newPkgTotalSessions} sessões criado e vinculado!`);
        } catch (err) {
            console.error('Erro ao cadastrar pacote:', err);
            toast.error('Erro ao criar pacote para o paciente');
        } finally {
            setSavingNewPkg(false);
        }
    };

    // Salvar alterações da Sessão no banco de dados
    const handleSaveSession = async () => {
        if (!date) {
            toast.error('Informe a data da sessão');
            return;
        }
        if (!patientId) {
            toast.error('Selecione o paciente');
            return;
        }

        setSaving(true);
        try {
            const formattedTime = time.includes(':') ? (time.length === 5 ? `${time}:00` : time) : '08:00:00';
            const updates: Partial<Session> = {
                date,
                time: formattedTime,
                patientId,
                type: type.trim() || 'Fisioterapia',
                packageSessionNumber: isPartOfPackage ? Number(packageSessionNumber) : (null as any),
                packageTotalSessions: isPartOfPackage ? Number(packageTotalSessions) : (null as any),
                price: isPartOfPackage ? 0 : session.price
            };

            const updatedSession = await sessionsApi.update(session.id, updates);
            toast.success('Sessão atualizada com sucesso!');
            onSaved(updatedSession);
        } catch (err) {
            console.error('Erro ao atualizar sessão:', err);
            toast.error('Erro ao salvar alterações da sessão');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[100] p-3 sm:p-4 animate-fade-in" style={{ zIndex: 100 }}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
                            <Edit className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-gray-900 leading-tight">
                                Editar Detalhes do Atendimento
                            </h3>
                            <p className="text-xs text-gray-500">
                                Altere data, vincule paciente, altere procedimento ou configure o pacote vinculado
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs">
                    {/* 1. SEÇÃO DATA E HORA */}
                    <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200/80 space-y-3">
                        <div className="flex items-center gap-2 text-gray-900 font-bold">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span>Data e Horário do Atendimento</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                                    Data da Sessão *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-medium text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                                    Horário de Início *
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={time}
                                    onChange={e => setTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-medium text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. SEÇÃO PACIENTE */}
                    <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-gray-900 font-bold">
                                <User className="w-4 h-4 text-emerald-600" />
                                <span>Paciente Vinculado</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowQuickPatientModal(true)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold flex items-center gap-1.5 transition-all cursor-pointer text-[11px]"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                + Novo Paciente
                            </button>
                        </div>

                        {/* Busca e Seleção do Paciente */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar paciente por nome, telefone ou CPF..."
                                    value={patientSearch}
                                    onChange={e => setPatientSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                                />
                            </div>

                            <select
                                value={patientId}
                                onChange={e => {
                                    setPatientId(e.target.value);
                                    setIsEditingPatient(false);
                                }}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer text-gray-900"
                            >
                                <option value="" disabled>Selecione um paciente...</option>
                                {filteredPatients.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} {p.phone ? `(${p.phone})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Bloco de Detalhes e Edição Inline do Paciente Atual */}
                        {currentPatient && (
                            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs">
                                            {currentPatient.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{currentPatient.name}</p>
                                            <p className="text-[10px] text-gray-500">{currentPatient.phone || 'Sem telefone'} {currentPatient.cpf ? `• CPF: ${currentPatient.cpf}` : ''}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingPatient(!isEditingPatient)}
                                        className="text-blue-600 hover:text-blue-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                        <Edit className="w-3 h-3" />
                                        {isEditingPatient ? 'Cancelar Edição' : 'Editar Paciente'}
                                    </button>
                                </div>

                                {isEditingPatient && (
                                    <div className="pt-2 border-t border-gray-100 space-y-2 animate-fade-in">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Nome Completo</label>
                                                <input
                                                    type="text"
                                                    value={editedPatientName}
                                                    onChange={e => setEditedPatientName(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Telefone / WhatsApp</label>
                                                <input
                                                    type="text"
                                                    value={editedPatientPhone}
                                                    onChange={e => setEditedPatientPhone(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                disabled={savingPatient}
                                                onClick={handleSavePatientData}
                                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                            >
                                                <Save className="w-3 h-3" />
                                                {savingPatient ? 'Salvando...' : 'Salvar Alterações do Paciente'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 3. SEÇÃO PROCEDIMENTO / MODALIDADE */}
                    <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200/80 space-y-3">
                        <div className="flex items-center gap-2 text-gray-900 font-bold">
                            <Briefcase className="w-4 h-4 text-purple-600" />
                            <span>Procedimento / Especialidade Clínica</span>
                        </div>

                        {/* Chips de procedimentos rápidos */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {COMMON_MODALITIES.map(mod => (
                                <button
                                    key={mod}
                                    type="button"
                                    onClick={() => setType(mod)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${type.toLowerCase() === mod.toLowerCase()
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                                        }`}
                                >
                                    {mod}
                                </button>
                            ))}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">
                                Nome do Procedimento / Tipo de Atendimento
                            </label>
                            <input
                                type="text"
                                value={type}
                                onChange={e => setType(e.target.value)}
                                placeholder="Ex: Fisioterapia Vestibular, Pilates Avançado..."
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                            />
                        </div>
                    </div>

                    {/* 4. SEÇÃO PACOTE / PLANO VINCULADO */}
                    <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isPartOfPackage}
                                    onChange={e => setIsPartOfPackage(e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="font-bold text-gray-900">
                                    Esta sessão faz parte de um Pacote / Plano
                                </span>
                            </label>
                            {isPartOfPackage && (
                                <button
                                    type="button"
                                    onClick={() => setShowNewPkgForm(!showNewPkgForm)}
                                    className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold flex items-center gap-1.5 transition-all cursor-pointer text-[11px]"
                                >
                                    <Package className="w-3.5 h-3.5" />
                                    {showNewPkgForm ? 'Fechar Cadastro' : '+ Cadastrar Novo Pacote'}
                                </button>
                            )}
                        </div>

                        {isPartOfPackage && (
                            <div className="space-y-3 pt-1">
                                {/* Pacotes já existentes do paciente */}
                                {patientPlans.length > 0 ? (
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-600 mb-1">
                                            Vincular a Pacote Existente do Paciente:
                                        </label>
                                        <select
                                            value={selectedPlanId}
                                            onChange={e => {
                                                const planId = e.target.value;
                                                setSelectedPlanId(planId);
                                                const plan = patientPlans.find(p => p.id === planId);
                                                if (plan && plan.total_sessions) {
                                                    setPackageTotalSessions(Number(plan.total_sessions));
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer text-gray-900"
                                        >
                                            <option value="">Selecione um pacote cadastrado...</option>
                                            {patientPlans.map((plan: any) => (
                                                <option key={plan.id} value={plan.id}>
                                                    {plan.name} — {plan.total_sessions} Sessões (Pago em {formatDateBR(plan.payment_date)} • R$ {Number(plan.total_paid || 0).toFixed(2)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between">
                                        <span>Nenhum pacote anterior encontrado para este paciente.</span>
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPkgForm(true)}
                                            className="font-bold underline text-amber-900 hover:text-amber-950 cursor-pointer"
                                        >
                                            Cadastrar agora
                                        </button>
                                    </div>
                                )}

                                {/* Contagem da Sessão no Pacote */}
                                <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-gray-200">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-1">
                                            Número desta Sessão
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-gray-400 font-bold">Sessão</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max={packageTotalSessions || 50}
                                                value={packageSessionNumber}
                                                onChange={e => setPackageSessionNumber(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs font-black text-center text-purple-700 bg-purple-50/50"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-1">
                                            Total de Sessões do Pacote
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-gray-400 font-bold">de</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={packageTotalSessions}
                                                onChange={e => setPackageTotalSessions(Math.max(1, parseInt(e.target.value) || 10))}
                                                className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs font-black text-center text-gray-900 bg-gray-50"
                                            />
                                            <span className="text-[10px] text-gray-500 font-bold">sessões</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Formulário Inline de Criação de Novo Pacote */}
                                {showNewPkgForm && (
                                    <form onSubmit={handleCreatePackage} className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-3 animate-fade-in">
                                        <div className="flex items-center justify-between">
                                            <h5 className="font-bold text-purple-950 flex items-center gap-1.5">
                                                <Package className="w-4 h-4 text-purple-600" />
                                                Novo Pacote para {currentPatient?.name || 'Paciente'}
                                            </h5>
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPkgForm(false)}
                                                className="text-purple-400 hover:text-purple-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div className="sm:col-span-2">
                                                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Modelo Pré-definido</label>
                                                <select
                                                    value={newPkgTemplate}
                                                    onChange={e => {
                                                        const tmplId = e.target.value;
                                                        setNewPkgTemplate(tmplId);
                                                        const tmpl = PACKAGE_TEMPLATES.find(t => t.id === tmplId);
                                                        if (tmpl) {
                                                            setNewPkgName(tmpl.name);
                                                            setNewPkgTotalSessions(tmpl.sessions);
                                                            setNewPkgPrice(tmpl.price);
                                                        }
                                                    }}
                                                    className="w-full px-2.5 py-1.5 border border-purple-200 bg-white rounded-lg text-xs font-bold text-gray-900"
                                                >
                                                    {PACKAGE_TEMPLATES.map(t => (
                                                        <option key={t.id} value={t.id}>
                                                            {t.name} ({t.sessions} sessões — R$ {t.price})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Nome do Pacote</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={newPkgName}
                                                    onChange={e => setNewPkgName(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 border border-purple-200 bg-white rounded-lg text-xs font-bold text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Total de Sessões</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    required
                                                    value={newPkgTotalSessions}
                                                    onChange={e => setNewPkgTotalSessions(parseInt(e.target.value) || 10)}
                                                    className="w-full px-2.5 py-1.5 border border-purple-200 bg-white rounded-lg text-xs font-bold text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Valor Pago (R$)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    required
                                                    value={newPkgPrice}
                                                    onChange={e => setNewPkgPrice(parseFloat(e.target.value) || 0)}
                                                    className="w-full px-2.5 py-1.5 border border-purple-200 bg-white rounded-lg text-xs font-bold text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Data do Pagamento</label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={newPkgPaymentDate}
                                                    onChange={e => setNewPkgPaymentDate(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 border border-purple-200 bg-white rounded-lg text-xs font-medium text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Forma de Pagamento</label>
                                                <select
                                                    value={newPkgPaymentMethod}
                                                    onChange={e => setNewPkgPaymentMethod(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 border border-purple-200 bg-white rounded-lg text-xs font-bold text-gray-900"
                                                >
                                                    {PAYMENT_METHODS.map(m => (
                                                        <option key={m.id} value={m.id}>{m.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPkgForm(false)}
                                                className="px-3 py-1.5 border border-purple-200 rounded-lg text-[11px] font-bold text-purple-700 hover:bg-purple-100"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={savingNewPkg}
                                                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                            >
                                                <Save className="w-3.5 h-3.5" />
                                                {savingNewPkg ? 'Salvando...' : 'Salvar e Vincular Pacote'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer com Ações */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={handleSaveSession}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>

            {/* Modal de Criação Rápida de Paciente (sobreposta) */}
            {showQuickPatientModal && (
                <QuickPatientModal
                    isOpen={showQuickPatientModal}
                    onClose={() => setShowQuickPatientModal(false)}
                    onPatientCreated={(newPat) => {
                        setPatientId(newPat.id);
                        if (onPatientCreated) {
                            onPatientCreated(newPat);
                        }
                        setShowQuickPatientModal(false);
                        toast.success(`Paciente ${newPat.name} cadastrado e selecionado!`);
                    }}
                    currentUnit={currentUnit as any}
                    allUnits={allUnits}
                />
            )}
        </div>
    );
};

const isSecretaryProf = isSecretaryProfessional;

const SessionAuditModal: React.FC<SessionAuditModalProps> = ({
    professional,
    professionals,
    sessions,
    advances,
    existingPayment,
    periodStart,
    periodEnd,
    patients,
    units,
    selectedUnit,
    onToggleLateCancellation,
    onClose,
    onApprove,
    onSessionUpdated,
    onSessionTransferred,
    onSessionDetailsUpdated,
    onPatientCreated,
    onPatientUpdated
}) => {
    const isSecretary = isSecretaryProf(professional);
    const [secretaryBaseSalary, setSecretaryBaseSalary] = useState<number>(() => professional.baseSalary || 1800);

    const clinicalProfessionals = useMemo(() => {
        return professionals.filter(p => !isSecretaryProf(p));
    }, [professionals]);

    // Sub-aba ativa na conferência: Sócio inicia por padrão em 'packages', demais em 'sessions'
    const [activeAuditTab, setActiveAuditTab] = useState<'packages' | 'sessions'>(() =>
        professional.contractType === 'socio' ? 'packages' : 'sessions'
    );

    // =========================================================================
    // ESTADO: PACOTES PAGOS NO PERÍODO (Opção A com B)
    // =========================================================================
    const [packages, setPackages] = useState<PaymentAuditPackage[]>([]);
    const [loadingPackages, setLoadingPackages] = useState<boolean>(true);
    const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
    const [packageSearch, setPackageSearch] = useState<string>('');

    // Modal de Novo Pacote Pago
    const [showAddPackageModal, setShowAddPackageModal] = useState<boolean>(false);
    const [newPkgPatientId, setNewPkgPatientId] = useState<string>('');
    const [newPkgTemplate, setNewPkgTemplate] = useState<string>('10A');
    const [newPkgName, setNewPkgName] = useState<string>('Fisioterapia — Pacote 10 Sessões (10S)');
    const [newPkgSessions, setNewPkgSessions] = useState<number>(10);
    const [newPkgPrice, setNewPkgPrice] = useState<number>(350);
    const [newPkgDate, setNewPkgDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [newPkgMethod, setNewPkgMethod] = useState<PaymentMethodType>('PIX');
    const [newPkgCardFeeRate, setNewPkgCardFeeRate] = useState<number>(0);
    const [savingNewPkg, setSavingNewPkg] = useState<boolean>(false);

    // Carregamento de pacotes do período
    useEffect(() => {
        let isMounted = true;
        const fetchPackages = async () => {
            setLoadingPackages(true);
            try {
                const data = await patientPlansApi.getAll();
                const filtered = (data || []).filter((p: any) => {
                    const payDate = p.payment_date || p.created_at?.split('T')[0] || '';
                    if (!payDate) return false;
                    const inPeriod = payDate >= periodStart && payDate <= periodEnd;
                    if (!inPeriod) return false;
                    if (selectedUnit !== 'ALL' && p.patients?.unit_id && p.patients.unit_id !== selectedUnit) {
                        return false;
                    }
                    return true;
                });

                const mapped: PaymentAuditPackage[] = filtered.map((p: any) => {
                    const price = Number(p.total_paid || 0);
                    const method = (p.payment_method as PaymentMethodType) || 'PIX';
                    const feeRate = getDefaultCardFeeRate(method);
                    const feeAmount = (price * feeRate) / 100;
                    const net = Math.max(0, price - feeAmount);
                    return {
                        packageId: p.id,
                        patientId: p.patient_id,
                        patientName: p.patients?.name || 'Paciente',
                        packageName: p.name || 'Pacote de Sessões',
                        totalSessions: Number(p.total_sessions || 0),
                        paymentDate: p.payment_date || p.created_at?.split('T')[0] || periodStart,
                        price,
                        paymentMethod: method,
                        cardFeeRate: feeRate,
                        cardFeeAmount: feeAmount,
                        netAmountAfterCard: net,
                        verified: true
                    };
                });

                if (isMounted) {
                    setPackages(mapped);
                    setSelectedPackageIds(mapped.map(m => m.packageId));
                }
            } catch (err) {
                console.error('Erro ao carregar pacotes para fechamento:', err);
            } finally {
                if (isMounted) setLoadingPackages(false);
            }
        };

        fetchPackages();
        return () => { isMounted = false; };
    }, [periodStart, periodEnd, selectedUnit]);

    // Atualização inline de campos do pacote
    const updatePackageField = (packageId: string, patch: Partial<PaymentAuditPackage>) => {
        setPackages(prev => prev.map(pkg => {
            if (pkg.packageId !== packageId) return pkg;
            const updated = { ...pkg, ...patch };
            const method = patch.paymentMethod !== undefined ? patch.paymentMethod : updated.paymentMethod;
            const feeRate = patch.cardFeeRate !== undefined ? patch.cardFeeRate : getDefaultCardFeeRate(method);
            const price = patch.price !== undefined ? Math.max(0, patch.price) : updated.price;
            const feeAmount = (price * feeRate) / 100;
            return {
                ...updated,
                price,
                paymentMethod: method,
                cardFeeRate: feeRate,
                cardFeeAmount: feeAmount,
                netAmountAfterCard: Math.max(0, price - feeAmount)
            };
        }));
    };

    // Salvar novo pacote cadastrado no modal
    const handleSaveNewPackage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPkgPatientId) {
            toast.error('Selecione um paciente');
            return;
        }
        setSavingNewPkg(true);
        try {
            const pat = patients.find(p => p.id === newPkgPatientId);
            const created = await patientPlansApi.create({
                patientId: newPkgPatientId,
                name: newPkgName,
                totalSessions: newPkgSessions,
                price: newPkgPrice,
                paymentDate: newPkgDate,
                paymentMethod: newPkgMethod
            });

            const feeRate = newPkgCardFeeRate > 0 ? newPkgCardFeeRate : getDefaultCardFeeRate(newPkgMethod);
            const feeAmount = (newPkgPrice * feeRate) / 100;
            const net = Math.max(0, newPkgPrice - feeAmount);

            const newPkgItem: PaymentAuditPackage = {
                packageId: created.id,
                patientId: newPkgPatientId,
                patientName: pat?.name || 'Paciente',
                packageName: newPkgName,
                totalSessions: newPkgSessions,
                paymentDate: newPkgDate,
                price: newPkgPrice,
                paymentMethod: newPkgMethod,
                cardFeeRate: feeRate,
                cardFeeAmount: feeAmount,
                netAmountAfterCard: net,
                verified: true
            };

            setPackages(prev => [newPkgItem, ...prev]);
            setSelectedPackageIds(prev => [...prev, created.id]);
            setShowAddPackageModal(false);
            toast.success(`Pacote de ${pat?.name || 'Paciente'} lançado e incluído na conferência!`);
        } catch (err) {
            console.error('Erro ao criar pacote:', err);
            toast.error('Erro ao cadastrar pacote');
        } finally {
            setSavingNewPkg(false);
        }
    };

    // Excluir pacote da conferência e do banco
    const handleDeletePackage = async (packageId: string) => {
        if (!window.confirm('Deseja realmente remover este pacote da conferência e do cadastro?')) return;
        try {
            await patientPlansApi.delete(packageId);
            setPackages(prev => prev.filter(p => p.packageId !== packageId));
            setSelectedPackageIds(prev => prev.filter(id => id !== packageId));
            toast.success('Pacote removido com sucesso!');
        } catch (err) {
            console.error('Erro ao excluir pacote:', err);
            toast.error('Erro ao excluir pacote');
        }
    };

    // =========================================================================
    // ESTADO: SESSÕES DA AGENDA & COBERTURAS
    // =========================================================================
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'Realizada' | 'Confirmada' | 'Agendada' | 'Cancelada'>('ALL');
    const [transferredSessionIds, setTransferredSessionIds] = useState<string[]>([]);
    const [editingSessionForAudit, setEditingSessionForAudit] = useState<Session | null>(null);
    const [sessionEdits, setSessionEdits] = useState<Record<string, Session>>({});

    const activeSessionsList = useMemo(() => {
        return sessions
            .filter(s => !transferredSessionIds.includes(s.id))
            .map(s => sessionEdits[s.id] ? { ...s, ...sessionEdits[s.id] } : s);
    }, [sessions, transferredSessionIds, sessionEdits]);

    const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>(() =>
        sessions.filter(s => s.status === 'Realizada' || s.isLateCancellation === true).map(s => s.id)
    );

    const [chargeClinicFee, setChargeClinicFee] = useState<boolean>(() => {
        return professional.contractType !== 'socio';
    });

    const [sessionOverrides, setSessionOverrides] = useState<Record<string, SessionOverride>>({});

    const [transferModal, setTransferModal] = useState<{
        session: Session;
        targetProfId: string;
        targetProfName: string;
        loading: boolean;
        transferAllPatientSessions: boolean;
        patientSessionsCount: number;
    } | null>(null);

    const countsByStatus = useMemo(() => {
        return {
            all: activeSessionsList.length,
            realized: activeSessionsList.filter(s => s.status === 'Realizada' || s.isLateCancellation === true).length,
            confirmed: activeSessionsList.filter(s => s.status === 'Confirmada' && !s.isLateCancellation).length,
            scheduled: activeSessionsList.filter(s => s.status === 'Agendada' && !s.isLateCancellation).length,
            canceled: activeSessionsList.filter(s => (s.status === 'Cancelada' || s.status === 'Falta') && !s.isLateCancellation).length
        };
    }, [activeSessionsList]);

    const displayedSessions = useMemo(() => {
        if (statusFilter === 'ALL') return activeSessionsList;
        if (statusFilter === 'Realizada') return activeSessionsList.filter(s => s.status === 'Realizada' || s.isLateCancellation === true);
        if (statusFilter === 'Confirmada') return activeSessionsList.filter(s => s.status === 'Confirmada' && !s.isLateCancellation);
        if (statusFilter === 'Agendada') return activeSessionsList.filter(s => s.status === 'Agendada' && !s.isLateCancellation);
        if (statusFilter === 'Cancelada') return activeSessionsList.filter(s => (s.status === 'Cancelada' || s.status === 'Falta') && !s.isLateCancellation);
        return activeSessionsList;
    }, [activeSessionsList, statusFilter]);

    const displayedPackages = useMemo(() => {
        if (!packageSearch.trim()) return packages;
        const q = packageSearch.toLowerCase();
        return packages.filter(p =>
            p.patientName.toLowerCase().includes(q) ||
            p.packageName.toLowerCase().includes(q) ||
            p.paymentMethod.toLowerCase().includes(q)
        );
    }, [packages, packageSearch]);

    const updateSessionField = (sessionId: string, patch: Partial<SessionOverride>) => {
        setSessionOverrides(prev => ({
            ...prev,
            [sessionId]: {
                ...prev[sessionId],
                ...patch
            }
        }));
    };

    const applyBulkPaymentMethod = (method: PaymentMethodType) => {
        const defaultFee = getDefaultCardFeeRate(method);
        setSessionOverrides(prev => {
            const next = { ...prev };
            selectedSessionIds.forEach(id => {
                next[id] = {
                    ...next[id],
                    paymentMethod: method,
                    cardFeeRate: defaultFee
                };
            });
            return next;
        });
        toast.success(`Forma de pagamento ${method} (${defaultFee}% taxa) aplicada a ${selectedSessionIds.length} sessões!`);
    };

    const applyBulkCommission = (value: number, type: 'percentage' | 'fixed' = 'percentage') => {
        setSessionOverrides(prev => {
            const next = { ...prev };
            selectedSessionIds.forEach(id => {
                next[id] = {
                    ...next[id],
                    commissionValue: value,
                    commissionType: type
                };
            });
            return next;
        });
        toast.success(`Comissão de ${value}${type === 'percentage' ? '%' : 'R$'} aplicada a ${selectedSessionIds.length} sessões!`);
    };

    const handleMakeRealized = async (sessionId: string) => {
        try {
            await sessionsApi.update(sessionId, { status: 'Realizada' as any });
            if (onSessionUpdated) {
                onSessionUpdated(sessionId, 'Realizada');
            }
            setSelectedSessionIds(prev => prev.includes(sessionId) ? prev : [...prev, sessionId]);
            toast.success('Sessão marcada como Realizada na agenda e na folha!');
        } catch (err) {
            console.error('Erro ao atualizar sessão:', err);
            toast.error('Erro ao marcar sessão como realizada');
        }
    };

    const handleInitiateTransfer = (session: Session, targetProfId: string) => {
        if (targetProfId === professional.id) return;
        const targetProf = clinicalProfessionals.find(p => p.id === targetProfId) || clinicalProfessionals.filter(p => p.id !== professional.id)[0];
        if (!targetProf) {
            toast.error('Nenhum colega clínico disponível para transferência');
            return;
        }

        const patientSessions = activeSessionsList.filter(s => s.patientId === session.patientId);

        setTransferModal({
            session,
            targetProfId: targetProf.id,
            targetProfName: targetProf.name,
            loading: false,
            transferAllPatientSessions: false,
            patientSessionsCount: patientSessions.length
        });
    };

    const handleConfirmTransfer = async () => {
        if (!transferModal) return;
        setTransferModal(prev => prev ? { ...prev, loading: true } : null);
        try {
            const { session, targetProfId, targetProfName, transferAllPatientSessions } = transferModal;
            const sessionsToTransfer = transferAllPatientSessions
                ? activeSessionsList.filter(s => s.patientId === session.patientId)
                : [session];

            for (const s of sessionsToTransfer) {
                await sessionsApi.update(s.id, { professionalId: targetProfId });
                if (onSessionTransferred) {
                    onSessionTransferred(s.id, targetProfId);
                }
            }

            const transferredIds = sessionsToTransfer.map(s => s.id);
            setTransferredSessionIds(prev => [...prev, ...transferredIds]);
            setSelectedSessionIds(prev => prev.filter(id => !transferredIds.includes(id)));
            setSessionOverrides(prev => {
                const next = { ...prev };
                transferredIds.forEach(id => delete next[id]);
                return next;
            });

            const pat = patients.find(p => p.id === session.patientId);
            await auditLogsApi.logAction({
                userName: 'Financeiro',
                userRole: 'admin',
                category: 'financial',
                action: 'Transferência de Sessão na Conferência',
                details: `Transferiu ${sessionsToTransfer.length} atendimento(s) de ${pat?.name || 'Paciente'} em ${formatDateBR(session.date)} de ${professional.name} para a conferência individual de ${targetProfName}.`
            });

            toast.success(
                sessionsToTransfer.length === 1
                    ? `Atendimento de ${pat?.name || 'Paciente'} transferido para a conferência de ${targetProfName}!`
                    : `${sessionsToTransfer.length} atendimentos de ${pat?.name || 'Paciente'} transferidos para a conferência de ${targetProfName}!`
            );
            setTransferModal(null);
        } catch (err) {
            console.error('Erro ao transferir sessão:', err);
            toast.error('Erro ao transferir sessão para outro profissional');
            setTransferModal(prev => prev ? { ...prev, loading: false } : null);
        }
    };

    const [selectedAdvanceIds, setSelectedAdvanceIds] = useState<string[]>(() =>
        advances.filter(a => a.status !== 'deducted').map(a => a.id)
    );

    const [notes, setNotes] = useState(existingPayment?.notes || '');
    const [submitting, setSubmitting] = useState(false);

    // Mapeamento rápido de pacientes com pacotes selecionados no período
    const activePatientPackageMap = useMemo(() => {
        const map = new Map<string, PaymentAuditPackage>();
        packages.forEach(pkg => {
            if (selectedPackageIds.includes(pkg.packageId) && pkg.patientId) {
                map.set(pkg.patientId, pkg);
            }
        });
        return map;
    }, [packages, selectedPackageIds]);

    // Helper de cálculo por sessão (com identificação de pacote e cobertura de 50%)
    const getSessionDetails = (session: Session) => {
        const override = sessionOverrides[session.id] || {};
        const packageOfPatient = activePatientPackageMap.get(session.patientId);
        const isCoveredByPackage = override.isCoveredByPackage !== undefined
            ? override.isCoveredByPackage
            : Boolean(packageOfPatient);

        // Cobertura por outro colega (ex: Gilmar cobriu atendimento de Pedro/Francine)
        const coveredByProfId = override.coveredByProfId;
        const isCoveredByOtherProf = Boolean(coveredByProfId && coveredByProfId !== professional.id);
        const coveringProf = isCoveredByOtherProf ? clinicalProfessionals.find(p => p.id === coveredByProfId) : null;

        // Preço unitário de referência
        const unitPackagePrice = packageOfPatient && packageOfPatient.totalSessions > 0
            ? (packageOfPatient.price / packageOfPatient.totalSessions)
            : 35;

        const basePrice = override.price !== undefined
            ? Math.max(0, override.price)
            : Number(session.price && session.price > 0 ? session.price : (isCoveredByPackage ? unitPackagePrice : (professional.hourlyRate || 100)));

        // Se o paciente pagou o pacote no mês e foi atendido pelo titular, o valor contábil adicional é R$ 0,00 (pois os R$ 350 já entraram no pacote!)
        const price = (isCoveredByPackage && !isCoveredByOtherProf) ? 0 : basePrice;

        const paymentMethod: PaymentMethodType = override.paymentMethod || 'PIX';
        const cardFeeRate = override.cardFeeRate !== undefined
            ? Math.max(0, override.cardFeeRate)
            : getDefaultCardFeeRate(paymentMethod);

        const cardFeeAmount = (price * cardFeeRate) / 100;
        const netAmountAfterCard = Math.max(0, price - cardFeeAmount);

        // Dedução de cobertura (50% do valor do atendimento deduzido do titular para repasse ao substituto)
        let coverageDeduction = 0;
        let coverageCredit = 0;
        if (isCoveredByOtherProf) {
            coverageDeduction = Math.round((unitPackagePrice * 0.5) * 100) / 100;
            coverageCredit = coverageDeduction;
        }

        // Comissão
        let commissionEarned = 0;
        let clinicRetained = 0;
        let clinicPercentage = 0;

        if (!chargeClinicFee || professional.contractType === 'socio') {
            commissionEarned = netAmountAfterCard;
            clinicRetained = 0;
            clinicPercentage = 0;
        } else {
            const commVal = override.commissionValue !== undefined ? override.commissionValue : 50;
            commissionEarned = (netAmountAfterCard * commVal) / 100;
            clinicRetained = Math.max(0, netAmountAfterCard - commissionEarned);
            clinicPercentage = Math.max(0, 100 - commVal);
        }

        return {
            price,
            basePrice,
            isCoveredByPackage,
            packageOfPatient,
            isCoveredByOtherProf,
            coveringProf,
            coverageDeduction,
            coverageCredit,
            paymentMethod,
            cardFeeRate,
            cardFeeAmount,
            netAmountAfterCard,
            commissionEarned,
            clinicRetained,
            clinicPercentage
        };
    };

    const toggleSession = (id: string) => {
        setSelectedSessionIds(prev =>
            prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
        );
    };

    const togglePackage = (id: string) => {
        setSelectedPackageIds(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    const toggleAdvance = (id: string) => {
        setSelectedAdvanceIds(prev =>
            prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
        );
    };

    // Cálculos em tempo real consolidados
    const auditedTotals = useMemo(() => {
        // 1. Pacotes Pagos
        let totalPackagesGross = 0;
        let totalPackagesCardFees = 0;
        let totalPackagesNet = 0;

        packages.forEach(pkg => {
            if (selectedPackageIds.includes(pkg.packageId)) {
                totalPackagesGross += pkg.price;
                totalPackagesCardFees += pkg.cardFeeAmount;
                totalPackagesNet += pkg.netAmountAfterCard;
            }
        });

        // 2. Sessões da Agenda
        let totalSessionsGross = 0;
        let totalSessionsCardFees = 0;
        let totalSessionsNetAfterCard = 0;
        let totalCommissions = 0;
        let totalClinicRetained = 0;
        let totalCoverageDeductions = 0;
        let totalLateCancellations = 0;

        const sessionAuditSnapshot: PaymentAuditSession[] = [];

        activeSessionsList.forEach(s => {
            const isVerified = selectedSessionIds.includes(s.id);
            const det = getSessionDetails(s);
            const pat = patients.find(p => p.id === s.patientId);

            if (isVerified) {
                totalSessionsGross += det.price;
                totalSessionsCardFees += det.cardFeeAmount;
                totalSessionsNetAfterCard += det.netAmountAfterCard;
                totalCommissions += det.commissionEarned;
                totalClinicRetained += det.clinicRetained;
                totalCoverageDeductions += det.coverageDeduction;
                if (s.isLateCancellation) totalLateCancellations++;
            }

            sessionAuditSnapshot.push({
                sessionId: s.id,
                patientName: pat?.name || 'Paciente',
                date: s.date,
                time: s.time,
                service: s.type || 'Fisioterapia',
                price: det.price,
                paymentMethod: det.paymentMethod,
                cardFeeRate: det.cardFeeRate,
                cardFeeAmount: det.cardFeeAmount,
                netAmountAfterCard: det.netAmountAfterCard,
                chargeClinicFee: chargeClinicFee,
                commissionType: 'percentage',
                commissionValue: 50,
                commissionEarned: det.commissionEarned,
                clinicRetained: det.clinicRetained,
                clinicPercentage: det.clinicPercentage,
                unitId: s.unitId,
                verified: isVerified,
                isLateCancellation: s.isLateCancellation,
                packageSessionNumber: s.packageSessionNumber,
                packageTotalSessions: s.packageTotalSessions,
                isCoveredByPackage: det.isCoveredByPackage,
                coverageDeduction: det.coverageDeduction,
                coverageCredit: det.coverageCredit,
                attendedByProfessionalId: det.coveringProf?.id,
                attendedByProfessionalName: det.coveringProf?.name
            });
        });

        const baseSalary = (professional.contractType === 'clt' || professional.contractType === 'socio')
            ? (professional.baseSalary || 0)
            : 0;

        const totalAdvancesDeducted = advances
            .filter(a => selectedAdvanceIds.includes(a.id))
            .reduce((sum, a) => sum + a.amount, 0);

        // Se for Sócio (Pedro):
        // Líquido dos Pacotes Pagos + Receita Avulsa - Dedução de Coberturas de Colegas - Vales Deduzidos
        const isSocio = professional.contractType === 'socio';
        let netTotal = 0;
        if (isSocio) {
            netTotal = Math.max(0, (totalPackagesNet + totalCommissions) - totalCoverageDeductions - totalAdvancesDeducted);
        } else {
            netTotal = Math.max(0, (baseSalary + totalCommissions + totalPackagesNet) - totalCoverageDeductions - totalAdvancesDeducted);
        }

        const avgProfPercentage = totalSessionsNetAfterCard > 0 ? (totalCommissions / totalSessionsNetAfterCard) * 100 : 0;
        const avgClinicPercentage = totalSessionsNetAfterCard > 0 ? (totalClinicRetained / totalSessionsNetAfterCard) * 100 : 0;

        return {
            totalPackagesGross,
            totalPackagesCardFees,
            totalPackagesNet,
            totalPackagesCount: selectedPackageIds.length,
            totalSessionsGross,
            totalSessionsCardFees,
            totalSessionsNetAfterCard,
            totalCommissions,
            totalClinicRetained,
            totalCoverageDeductions,
            avgProfPercentage,
            avgClinicPercentage,
            totalLateCancellations,
            baseSalary,
            totalAdvancesDeducted,
            netTotal,
            sessionAuditSnapshot
        };
    }, [packages, selectedPackageIds, activeSessionsList, selectedSessionIds, selectedAdvanceIds, professional, advances, patients, sessionOverrides, chargeClinicFee, activePatientPackageMap]);

    const secretaryAdvancesDeducted = advances
        .filter(a => selectedAdvanceIds.includes(a.id))
        .reduce((sum, a) => sum + a.amount, 0);
    const secretaryNetTotal = Math.max(0, secretaryBaseSalary - secretaryAdvancesDeducted);

    const handleApproveForm = async () => {
        setSubmitting(true);
        try {
            if (isSecretary) {
                const payload = {
                    professionalId: professional.id,
                    unitId: selectedUnit === 'ALL' ? undefined : selectedUnit,
                    periodStart,
                    periodEnd,
                    totalSessions: 0,
                    amountPerSession: 0,
                    totalAmount: secretaryNetTotal,
                    baseSalary: secretaryBaseSalary,
                    commissionAmount: 0,
                    totalCardFees: 0,
                    chargeClinicFee: false,
                    advancesDeducted: secretaryAdvancesDeducted,
                    clinicFeeDeducted: 0,
                    totalPackagesAmount: 0,
                    totalPackagesCount: 0,
                    packageAuditDetails: [],
                    totalCoverageDeductions: 0,
                    netAmount: secretaryNetTotal,
                    verifiedSessionsCount: 0,
                    auditDetails: [],
                    notes: notes.trim() || 'Fechamento de folha de pagamento - Secretaria / Recepção (Salário Fixo - Vales)'
                };

                await onApprove(payload, selectedAdvanceIds);
                return;
            }

            const payload = {
                professionalId: professional.id,
                unitId: selectedUnit === 'ALL' ? undefined : selectedUnit,
                periodStart,
                periodEnd,
                totalSessions: selectedSessionIds.length,
                amountPerSession: selectedSessionIds.length > 0 ? (auditedTotals.totalCommissions / selectedSessionIds.length) : 0,
                totalAmount: auditedTotals.netTotal,
                baseSalary: auditedTotals.baseSalary,
                commissionAmount: auditedTotals.totalCommissions,
                totalCardFees: auditedTotals.totalSessionsCardFees + auditedTotals.totalPackagesCardFees,
                chargeClinicFee: chargeClinicFee,
                advancesDeducted: auditedTotals.totalAdvancesDeducted,
                clinicFeeDeducted: auditedTotals.totalClinicRetained,
                totalPackagesAmount: auditedTotals.totalPackagesNet,
                totalPackagesCount: auditedTotals.totalPackagesCount,
                packageAuditDetails: packages.filter(p => selectedPackageIds.includes(p.packageId)),
                totalCoverageDeductions: auditedTotals.totalCoverageDeductions,
                netAmount: auditedTotals.netTotal,
                verifiedSessionsCount: selectedSessionIds.length,
                auditDetails: auditedTotals.sessionAuditSnapshot,
                notes: notes.trim() || undefined
            };

            await onApprove(payload, selectedAdvanceIds);
        } finally {
            setSubmitting(false);
        }
    };

    if (isSecretary) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in">
                <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[96vh] flex flex-col overflow-hidden border border-gray-100">
                    {/* Header Secretária */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50/80 via-blue-50/50 to-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm overflow-hidden shrink-0"
                                style={{ backgroundColor: professional.color || '#7C3AED' }}
                            >
                                {professional.avatarUrl ? (
                                    <img src={professional.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    professional.name.charAt(0)
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-black text-gray-900 leading-tight">
                                        Fechamento de Folha: {professional.name}
                                    </h3>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                        Recepção & Administrativo
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs font-bold text-blue-700">Regime CLT</span>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-xs text-gray-500 font-medium">
                                        Período: {formatDateBR(periodStart)} à {formatDateBR(periodEnd)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Corpo do Fechamento da Secretária */}
                    <div className="p-6 space-y-5 overflow-y-auto flex-1">
                        {/* Banner de Regra */}
                        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3">
                            <Briefcase className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-blue-900">
                                <span className="font-bold">Regra Administrativa CLT: </span>
                                O fechamento de folha de recepção e secretárias considera exclusivamente o <strong>Salário Fixo Mensal</strong> menos os <strong>Vales e Adiantamentos</strong> concedidos no período.
                            </div>
                        </div>

                        {/* Card de Salário Fixo */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Salário Fixo Mensal (CLT)
                            </label>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={secretaryBaseSalary}
                                        onChange={(e) => setSecretaryBaseSalary(Math.max(0, parseFloat(e.target.value) || 0))}
                                        className="w-full pl-10 pr-4 py-2.5 text-base font-black text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <span className="text-xs text-gray-500 font-medium">
                                    Base contratual da colaboradora
                                </span>
                            </div>
                        </div>

                        {/* Vales do Período */}
                        <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-amber-600" />
                                    Vales & Adiantamentos do Período ({advances.length})
                                </h4>
                                <span className="text-xs font-bold text-amber-800">
                                    Total a Deduzir: R$ {secretaryAdvancesDeducted.toFixed(2)}
                                </span>
                            </div>

                            {advances.length > 0 ? (
                                <div className="space-y-2">
                                    {advances.map(adv => {
                                        const isDeducted = selectedAdvanceIds.includes(adv.id);
                                        return (
                                            <label
                                                key={adv.id}
                                                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                                    isDeducted
                                                        ? 'bg-white border-amber-300 shadow-2xs'
                                                        : 'bg-white/50 border-gray-200 opacity-60'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isDeducted}
                                                        onChange={() => toggleAdvance(adv.id)}
                                                        className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                                                    />
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900">
                                                            R$ {adv.amount.toFixed(2)}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500">
                                                            {formatDateBR(adv.advanceDate)} • {adv.description || 'Vale / Adiantamento'} ({adv.paymentMethod || 'PIX'})
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                                                    Abater no holerite
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-xs text-amber-700/80 italic py-2 text-center bg-white/60 rounded-xl border border-amber-200/50">
                                    Nenhum vale ou adiantamento concedido à secretária neste mês.
                                </div>
                            )}
                        </div>

                        {/* Resumo Consolidado */}
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2">
                            <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>(+) Salário Fixo Mensal</span>
                                <span className="font-bold text-gray-900">R$ {secretaryBaseSalary.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-amber-700">
                                <span>(-) Vales e Adiantamentos Deduzidos</span>
                                <span className="font-bold">- R$ {secretaryAdvancesDeducted.toFixed(2)}</span>
                            </div>
                            <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-sm">
                                <span className="font-black text-gray-900">(=) Total Líquido a Pagar</span>
                                <span className="text-lg font-black text-emerald-600">
                                    R$ {secretaryNetTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Observações */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Observações do Pagamento (Opcional)
                            </label>
                            <input
                                type="text"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Ex: Folha mensal normal, sem ocorrências"
                                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                        </div>
                    </div>

                    {/* Rodapé Secretária */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={submitting || secretaryBaseSalary <= 0}
                            onClick={handleApproveForm}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {submitting ? 'Aprovando...' : 'Aprovar Folha & Gerar Pagamento'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in">
            <div className="relative z-0 bg-white rounded-3xl shadow-2xl max-w-7xl w-full max-h-[96vh] flex flex-col overflow-hidden border border-gray-100">
                {/* Cabeçalho */}
                <div className="px-6 py-3.5 border-b border-gray-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white flex items-center justify-between shrink-0 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm overflow-hidden shrink-0"
                            style={{ backgroundColor: professional.color || '#2563EB' }}
                        >
                            {professional.avatarUrl ? (
                                <img src={professional.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                professional.name.charAt(0)
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-gray-900 leading-tight">
                                    Auditoria & Fechamento Financeiro: {professional.name}
                                </h3>
                                {professional.contractType === 'socio' && (
                                    <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                                        <Crown className="w-3 h-3 text-amber-600" />
                                        Sócio da Clínica
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                                    Regime: {professional.contractType?.toUpperCase() || 'PJ'}
                                </span>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs text-gray-500 font-medium">
                                    Período: {formatDateBR(periodStart)} até {formatDateBR(periodEnd)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Toggle: Cobrar Taxa da Clínica & Botão Fechar */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2.5 bg-white px-3.5 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
                            <div className="text-right">
                                <p className="text-[9px] uppercase font-bold text-gray-400 leading-tight">Taxa da Clínica</p>
                                <p className={`text-xs font-bold leading-tight ${chargeClinicFee ? 'text-indigo-700' : 'text-emerald-700'}`}>
                                    {chargeClinicFee ? 'Cobrando Retenção' : 'Isento (100% Repasse)'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setChargeClinicFee(prev => !prev)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${chargeClinicFee ? 'bg-indigo-600' : 'bg-emerald-600'}`}
                                title={chargeClinicFee ? "Clique para isentar taxa da clínica (repasse integral ao profissional)" : "Clique para ativar retenção da taxa da clínica"}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${chargeClinicFee ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all cursor-pointer"
                            title="Fechar modal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Sub-Abas de Navegação da Conferência */}
                <div className="px-6 pt-3 pb-0 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3 shrink-0 flex-wrap">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveAuditTab('packages')}
                            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-t border-x ${activeAuditTab === 'packages'
                                ? 'bg-white text-blue-700 border-gray-200 shadow-xs'
                                : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
                                }`}
                        >
                            <Package className="w-4 h-4" />
                            <span>Pacotes Pagos no Mês</span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeAuditTab === 'packages' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>
                                {selectedPackageIds.length}/{packages.length}
                            </span>
                            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                R$ {auditedTotals.totalPackagesNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveAuditTab('sessions')}
                            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-t border-x ${activeAuditTab === 'sessions'
                                ? 'bg-white text-indigo-700 border-gray-200 shadow-xs'
                                : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
                                }`}
                        >
                            <Calendar className="w-4 h-4" />
                            <span>Sessões da Agenda & Coberturas</span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeAuditTab === 'sessions' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-200 text-gray-700'}`}>
                                {selectedSessionIds.length}/{activeSessionsList.length}
                            </span>
                            {auditedTotals.totalCoverageDeductions > 0 && (
                                <span className="text-[10px] font-black text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                    - R$ {auditedTotals.totalCoverageDeductions.toFixed(2)} (cobertura)
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Botão de Ação Rápida */}
                    {activeAuditTab === 'packages' && (
                        <button
                            type="button"
                            onClick={() => setShowAddPackageModal(true)}
                            className="mb-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Adicionar Pacote Pago</span>
                        </button>
                    )}
                </div>

                {/* Conteúdo com Scroll */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {/* Alertas Operacionais de Acordo com a Regra do Negócio */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <div className="p-3 bg-emerald-50/90 rounded-xl border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950">
                            <Package className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold">Regime de Pacote Inteiro no Mês: </span>
                                O valor total do pacote pago pelo paciente entra <strong>100% no mês do pagamento</strong>. As sessões na agenda não cobram valor avulso duplicado.
                            </div>
                        </div>

                        <div className="p-3 bg-blue-50/90 rounded-xl border border-blue-200 flex items-start gap-2.5 text-xs text-blue-950">
                            <Wallet className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold">Taxas de Maquininha: </span>
                                Débito (1,45%) e Crédito (3,51%) abatidos automaticamente. Edite as taxas ou valores em qualquer linha.
                            </div>
                        </div>

                        <div className="p-3 bg-indigo-50/90 rounded-xl border border-indigo-200 flex items-start gap-2.5 text-xs text-indigo-950">
                            <ArrowRightLeft className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold">Cobertura por Colega (Repasse 50%): </span>
                                Se o atendimento foi coberto por outro profissional, selecione o substituto na coluna <strong>Atendente</strong> para deduzir 50% e creditar ao colega.
                            </div>
                        </div>
                    </div>

                    {/* ================================================================= */}
                    {/* ABA 1: PACOTES PAGOS NO MÊS */}
                    {/* ================================================================= */}
                    {activeAuditTab === 'packages' && (
                        <div className="space-y-3">
                            {/* Barra de Ferramentas de Pacotes */}
                            <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
                                <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                                    <div className="relative flex-1">
                                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={packageSearch}
                                            onChange={e => setPackageSearch(e.target.value)}
                                            placeholder="Buscar por paciente, plano ou forma de pagamento..."
                                            className="w-full pl-9 pr-3.5 py-1.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50 focus:bg-white"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const allIds = displayedPackages.map(p => p.packageId);
                                            const allSelected = allIds.every(id => selectedPackageIds.includes(id));
                                            if (allSelected) {
                                                setSelectedPackageIds(prev => prev.filter(id => !allIds.includes(id)));
                                            } else {
                                                setSelectedPackageIds(prev => Array.from(new Set([...prev, ...allIds])));
                                            }
                                        }}
                                        className="text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer flex items-center gap-1.5 shrink-0"
                                    >
                                        {displayedPackages.every(p => selectedPackageIds.includes(p.packageId)) && displayedPackages.length > 0 ? (
                                            <CheckSquare className="w-4 h-4 text-blue-600" />
                                        ) : (
                                            <Square className="w-4 h-4 text-gray-400" />
                                        )}
                                        <span>Marcar Todos ({selectedPackageIds.length}/{packages.length})</span>
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-gray-500">
                                        Total Pacotes Líquido: <strong className="text-emerald-700 text-sm">R$ {auditedTotals.totalPackagesNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                                    </span>
                                </div>
                            </div>

                            {/* Tabela de Pacotes Pagos */}
                            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                                <div className="overflow-x-auto max-h-[46vh] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-gray-100/90 text-[10px] font-bold text-gray-600 uppercase sticky top-0 z-10 border-b border-gray-200">
                                            <tr>
                                                <th className="py-2.5 px-3 w-8 text-center">OK</th>
                                                <th className="py-2.5 px-3 whitespace-nowrap">Data Pgto</th>
                                                <th className="py-2.5 px-3 whitespace-nowrap">Paciente</th>
                                                <th className="py-2.5 px-3 whitespace-nowrap">Pacote / Quantidade</th>
                                                <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[110px]">Valor Bruto (R$)</th>
                                                <th className="py-2.5 px-3 whitespace-nowrap min-w-[120px]">Forma de Pagto</th>
                                                <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[110px]">Taxa Maquininha</th>
                                                <th className="py-2.5 px-3 text-right whitespace-nowrap">Líquido Pós-Cartão</th>
                                                <th className="py-2.5 px-3 text-center whitespace-nowrap">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {loadingPackages ? (
                                                <tr>
                                                    <td colSpan={9} className="py-8 text-center text-gray-400 text-xs">
                                                        Carregando pacotes do período...
                                                    </td>
                                                </tr>
                                            ) : displayedPackages.length > 0 ? (
                                                displayedPackages.map(pkg => {
                                                    const isChecked = selectedPackageIds.includes(pkg.packageId);
                                                    return (
                                                        <tr
                                                            key={pkg.packageId}
                                                            onClick={() => togglePackage(pkg.packageId)}
                                                            className={`cursor-pointer transition-colors ${isChecked ? 'bg-blue-50/20 hover:bg-blue-50/35' : 'bg-white opacity-40 hover:opacity-70'}`}
                                                        >
                                                            {/* Checkbox */}
                                                            <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => togglePackage(pkg.packageId)}
                                                                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                                                />
                                                            </td>

                                                            {/* Data Pagamento */}
                                                            <td className="py-2 px-3 font-semibold text-gray-800 whitespace-nowrap">
                                                                {formatDateBR(pkg.paymentDate)}
                                                            </td>

                                                            {/* Paciente */}
                                                            <td className="py-2 px-3 font-bold text-gray-900 whitespace-nowrap">
                                                                {pkg.patientName}
                                                            </td>

                                                            {/* Pacote / Qtd Sessões */}
                                                            <td className="py-2 px-3 text-gray-700 whitespace-nowrap">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-bold text-gray-800 text-xs">{pkg.packageName}</span>
                                                                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-extrabold text-[10px] border border-purple-200">
                                                                        {pkg.totalSessions}S
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            {/* Valor Bruto Editável */}
                                                            <td className="py-2 px-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                                <div className="inline-flex items-center justify-end gap-1 bg-white border border-gray-200 rounded-lg px-1.5 py-0.5 shadow-2xs hover:border-blue-400 focus-within:ring-1 focus-within:ring-blue-500">
                                                                    <span className="text-[10px] text-gray-400 font-bold">R$</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        value={pkg.price}
                                                                        onChange={e => {
                                                                            const val = parseFloat(e.target.value);
                                                                            updatePackageField(pkg.packageId, { price: isNaN(val) ? 0 : val });
                                                                        }}
                                                                        className="w-16 text-right font-bold text-gray-900 text-xs bg-transparent focus:outline-none"
                                                                        title="Editar valor bruto do pacote"
                                                                    />
                                                                </div>
                                                            </td>

                                                            {/* Forma de Pagamento */}
                                                            <td className="py-2 px-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                                <select
                                                                    value={pkg.paymentMethod}
                                                                    onChange={e => {
                                                                        const newMethod = e.target.value as PaymentMethodType;
                                                                        const newFee = getDefaultCardFeeRate(newMethod);
                                                                        updatePackageField(pkg.packageId, {
                                                                            paymentMethod: newMethod,
                                                                            cardFeeRate: newFee
                                                                        });
                                                                    }}
                                                                    className="text-xs font-semibold py-1 px-1.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                                                                >
                                                                    {PAYMENT_METHODS.map(m => (
                                                                        <option key={m.id} value={m.id}>
                                                                            {m.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>

                                                            {/* Taxa da Maquininha */}
                                                            <td className="py-2 px-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                                <div className="inline-flex flex-col items-end">
                                                                    <div className="inline-flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg px-1 py-0.5 shadow-2xs hover:border-blue-400 focus-within:ring-1 focus-within:ring-blue-500">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            max="100"
                                                                            value={pkg.cardFeeRate}
                                                                            onChange={e => {
                                                                                const val = parseFloat(e.target.value);
                                                                                updatePackageField(pkg.packageId, { cardFeeRate: isNaN(val) ? 0 : val });
                                                                            }}
                                                                            className="w-10 text-right font-bold text-gray-700 text-xs bg-transparent focus:outline-none"
                                                                            title="Percentual da taxa de cartão"
                                                                        />
                                                                        <span className="text-[10px] font-bold text-gray-400">%</span>
                                                                    </div>
                                                                    {pkg.cardFeeAmount > 0 && (
                                                                        <span className="text-[9px] font-bold text-red-600 mt-0.5">
                                                                            - R$ {pkg.cardFeeAmount.toFixed(2)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* Líquido Pós-Cartão */}
                                                            <td className="py-2 px-3 text-right font-black text-emerald-700 whitespace-nowrap text-xs">
                                                                R$ {pkg.netAmountAfterCard.toFixed(2)}
                                                            </td>

                                                            {/* Ações */}
                                                            <td className="py-2 px-3 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeletePackage(pkg.packageId)}
                                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                                                    title="Remover pacote"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={9} className="py-8 text-center text-gray-400 text-xs">
                                                        Nenhum pacote pago encontrado para o período selecionado.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {packages.length > 0 && (
                                            <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-bold text-gray-900 sticky bottom-0 z-10 text-xs">
                                                <tr>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                                            {selectedPackageIds.length}/{packages.length}
                                                        </span>
                                                    </td>
                                                    <td colSpan={3} className="py-2.5 px-3 uppercase text-[10px] font-black text-gray-700 tracking-wider">
                                                        TOTAL DE PACOTES SELECIONADOS ({selectedPackageIds.length} pacotes)
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-black text-gray-950 whitespace-nowrap">
                                                        R$ {auditedTotals.totalPackagesGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center text-[10px] text-gray-500 whitespace-nowrap">
                                                        —
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-bold text-red-600 whitespace-nowrap">
                                                        - R$ {auditedTotals.totalPackagesCardFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-black text-emerald-700 whitespace-nowrap">
                                                        R$ {auditedTotals.totalPackagesNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center text-[10px] text-gray-400 whitespace-nowrap">
                                                        —
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ================================================================= */}
                    {/* ABA 2: SESSÕES DA AGENDA & COBERTURAS */}
                    {/* ================================================================= */}
                    {activeAuditTab === 'sessions' && (
                        <div className="space-y-3">
                            {/* Filtros de Status da Agenda no Modal */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-gray-500">Filtrar Agenda:</span>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('ALL')}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    Todas ({countsByStatus.all})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('Realizada')}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'Realizada' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}
                                >
                                    Realizadas ({countsByStatus.realized})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('Confirmada')}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'Confirmada' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'}`}
                                >
                                    Confirmadas ({countsByStatus.confirmed})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('Agendada')}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'Agendada' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'}`}
                                >
                                    Agendadas ({countsByStatus.scheduled})
                                </button>
                                {countsByStatus.canceled > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('Cancelada')}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'Cancelada' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'}`}
                                    >
                                        Canceladas ({countsByStatus.canceled})
                                    </button>
                                )}
                            </div>

                            {/* Tabela de Sessões com Edição Completa */}
                            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                                <div className="px-4 py-2.5 bg-gray-50/90 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <button
                                            onClick={() => {
                                                const displayedIds = displayedSessions.map(s => s.id);
                                                const allDisplayedSelected = displayedIds.length > 0 && displayedIds.every(id => selectedSessionIds.includes(id));
                                                if (allDisplayedSelected) {
                                                    setSelectedSessionIds(prev => prev.filter(id => !displayedIds.includes(id)));
                                                } else {
                                                    setSelectedSessionIds(prev => Array.from(new Set([...prev, ...displayedIds])));
                                                }
                                            }}
                                            className="text-blue-600 font-bold text-xs flex items-center gap-1.5 hover:underline cursor-pointer"
                                        >
                                            {displayedSessions.length > 0 && displayedSessions.every(s => selectedSessionIds.includes(s.id)) ? (
                                                <CheckSquare className="w-4 h-4 text-blue-600" />
                                            ) : (
                                                <Square className="w-4 h-4 text-gray-400" />
                                            )}
                                            <span>Marcar / Desmarcar ({displayedSessions.filter(s => selectedSessionIds.includes(s.id)).length}/{displayedSessions.length})</span>
                                        </button>

                                        {/* Ações em Massa de Comissão */}
                                        <div className="flex items-center gap-1.5 pl-3 border-l border-gray-300">
                                            <span className="text-[10px] uppercase font-bold text-gray-500">Comissão em massa:</span>
                                            <button
                                                type="button"
                                                onClick={() => applyBulkCommission(50, 'percentage')}
                                                className="px-2 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-md text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                                                title="Definir 50% em todas as sessões selecionadas"
                                            >
                                                Personal (50%)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyBulkCommission(60, 'percentage')}
                                                className="px-2 py-0.5 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-md text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                                                title="Definir 60% (Avaliação) em todas as sessões selecionadas"
                                            >
                                                Avaliação (60%)
                                            </button>
                                        </div>

                                        {/* Ações em Massa de Forma de Pagamento */}
                                        <div className="flex items-center gap-1.5 pl-3 border-l border-gray-300">
                                            <span className="text-[10px] uppercase font-bold text-gray-500">Forma de Pagto em massa:</span>
                                            <div className="flex items-center gap-1">
                                                {PAYMENT_METHODS.map(m => (
                                                    <button
                                                        key={m.id}
                                                        type="button"
                                                        onClick={() => applyBulkPaymentMethod(m.id)}
                                                        className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[10px] font-bold transition-all cursor-pointer"
                                                        title={`Aplicar ${m.label} a todas as sessões selecionadas`}
                                                    >
                                                        {m.id}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-gray-500 font-medium">
                                        Selecionadas entram no cálculo da folha
                                    </span>
                                </div>

                                <div className="overflow-x-auto max-h-[46vh] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-gray-100/90 text-[10px] font-bold text-gray-600 uppercase sticky top-0 z-10 border-b border-gray-200">
                                            <tr>
                                                <th className="py-2.5 px-3 w-8 text-center">OK</th>
                                                <th className="py-2.5 px-3 whitespace-nowrap">Data/Hora</th>
                                                <th className="py-2.5 px-3 whitespace-nowrap">Paciente</th>
                                                <th className="py-2.5 px-3 whitespace-nowrap">Procedimento / Pacote</th>
                                                <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                                                <th className="py-2.5 px-3 whitespace-nowrap min-w-[150px]">Atendente & Cobertura</th>
                                                <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[100px]">Total Atendimento (R$)</th>
                                                <th className="py-2.5 px-3 whitespace-nowrap min-w-[110px]">Forma Pagto</th>
                                                <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[110px]">Taxa Cartão</th>
                                                <th className="py-2.5 px-3 text-right whitespace-nowrap">Líquido Cartão</th>
                                                <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[130px]">Comissão (%)</th>
                                                <th className="py-2.5 px-3 text-right whitespace-nowrap">Repasse Prof.</th>
                                                <th className="py-2.5 px-3 text-right whitespace-nowrap bg-indigo-50/50">Clínica Retido</th>
                                                <th className="py-2.5 px-3 text-center whitespace-nowrap">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {displayedSessions.length > 0 ? (
                                                displayedSessions.map(s => {
                                                    const isChecked = selectedSessionIds.includes(s.id);
                                                    const det = getSessionDetails(s);
                                                    const pat = patients.find(p => p.id === s.patientId);
                                                    const isLate = s.isLateCancellation === true;

                                                    return (
                                                        <tr
                                                            key={s.id}
                                                            onClick={() => toggleSession(s.id)}
                                                            className={`cursor-pointer transition-colors ${isChecked ? 'bg-blue-50/25 hover:bg-blue-50/40' : 'bg-white opacity-40 hover:opacity-70'}`}
                                                        >
                                                            {/* Checkbox */}
                                                            <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => toggleSession(s.id)}
                                                                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                                                />
                                                            </td>

                                                            {/* Data/Hora */}
                                                            <td
                                                                className="py-2 px-3 font-semibold text-gray-800 whitespace-nowrap group cursor-pointer"
                                                                onClick={(e) => { e.stopPropagation(); setEditingSessionForAudit(s); }}
                                                                title="Clique para editar data e horário"
                                                            >
                                                                <div className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                                                                    <span>{formatDateBR(s.date)} {s.time?.substring(0, 5)}</span>
                                                                    <Edit className="w-3 h-3 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                                                </div>
                                                            </td>

                                                            {/* Paciente */}
                                                            <td
                                                                className="py-2 px-3 font-bold text-gray-900 whitespace-nowrap group cursor-pointer"
                                                                onClick={(e) => { e.stopPropagation(); setEditingSessionForAudit(s); }}
                                                                title="Clique para alterar ou editar cadastro do paciente"
                                                            >
                                                                <div className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                                                                    <span>{pat?.name || 'Paciente'}</span>
                                                                    <Edit className="w-3 h-3 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                                                </div>
                                                            </td>

                                                            {/* Procedimento / Pacote */}
                                                            <td
                                                                className="py-2 px-3 text-gray-700 whitespace-nowrap group cursor-pointer"
                                                                onClick={(e) => { e.stopPropagation(); setEditingSessionForAudit(s); }}
                                                                title="Clique para alterar procedimento ou configurar pacote vinculado"
                                                            >
                                                                <div className="flex items-center gap-1.5 flex-wrap hover:text-blue-600 transition-colors">
                                                                    <span className="px-2 py-0.5 rounded-md bg-gray-100 font-medium text-[11px] group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                                                                        {s.type || 'Fisioterapia'}
                                                                    </span>
                                                                    {det.isCoveredByPackage && (
                                                                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-black border border-emerald-300 text-[10px]" title="Paciente possui pacote ativo no mês. Valor bruto R$ 0,00 contábil para evitar cobrança duplicada.">
                                                                            Pacote (Já Incluso)
                                                                        </span>
                                                                    )}
                                                                    {s.packageSessionNumber && (
                                                                        <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200 text-[10px]">
                                                                            Sessão {s.packageSessionNumber}/{s.packageTotalSessions || '?'}
                                                                        </span>
                                                                    )}
                                                                    <Edit className="w-3 h-3 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                                                </div>
                                                            </td>

                                                            {/* Status / Cobrança */}
                                                            <td className="py-2 px-3 text-center whitespace-nowrap">
                                                                {isLate ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-300">
                                                                        Cima da Hora
                                                                    </span>
                                                                ) : s.status === 'Realizada' ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                        Realizada
                                                                    </span>
                                                                ) : s.status === 'Confirmada' ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                                                        Confirmada
                                                                    </span>
                                                                ) : s.status === 'Agendada' ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                                                        Agendada
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                                                                        {s.status}
                                                                    </span>
                                                                )}
                                                            </td>

                                                            {/* Atendente & Cobertura por Colega */}
                                                            <td className="py-2 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex flex-col gap-1">
                                                                    <select
                                                                        value={det.isCoveredByOtherProf ? `cobertura_${det.coveringProf?.id}` : professional.id}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            if (val === professional.id) {
                                                                                updateSessionField(s.id, { coveredByProfId: undefined });
                                                                            } else if (val.startsWith('transfer_')) {
                                                                                const targetId = val.replace('transfer_', '');
                                                                                handleInitiateTransfer(s, targetId);
                                                                            } else if (val.startsWith('cobertura_')) {
                                                                                const targetId = val.replace('cobertura_', '');
                                                                                updateSessionField(s.id, { coveredByProfId: targetId });
                                                                                const colega = clinicalProfessionals.find(p => p.id === targetId);
                                                                                toast.success(`Cobertura marcada: ${colega?.name || 'Colega'} atenderá com 50% de repasse!`);
                                                                            }
                                                                        }}
                                                                        className={`w-full text-xs font-semibold py-1 px-1.5 rounded-lg border bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs ${det.isCoveredByOtherProf ? 'border-amber-300 text-amber-900 bg-amber-50/50' : 'border-gray-200 text-gray-800'}`}
                                                                        title="Transferir atendimento (100%) ou marcar cobertura por colega (50%)"
                                                                    >
                                                                        <option value={professional.id}>
                                                                            {professional.name} (Titular)
                                                                        </option>
                                                                        <optgroup label="Transferir Atendimento (100% Repasse)">
                                                                            {clinicalProfessionals.filter(p => p.id !== professional.id).map(p => (
                                                                                <option key={`trans_${p.id}`} value={`transfer_${p.id}`}>
                                                                                    Transferir p/ {p.name} (100%)
                                                                                </option>
                                                                            ))}
                                                                        </optgroup>
                                                                        <optgroup label="Cobertura de Atendimento (50% Repasse)">
                                                                            {clinicalProfessionals.filter(p => p.id !== professional.id).map(p => (
                                                                                <option key={`cob_${p.id}`} value={`cobertura_${p.id}`}>
                                                                                    Cobertura: {p.name} (-50%)
                                                                                </option>
                                                                            ))}
                                                                        </optgroup>
                                                                    </select>

                                                                    {det.isCoveredByOtherProf && (
                                                                        <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded gap-1">
                                                                            <span>Dedução 50%:</span>
                                                                            <span className="text-red-700">- R$ {det.coverageDeduction.toFixed(2)}</span>
                                                                            {det.coveringProf && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleInitiateTransfer(s, det.coveringProf!.id)}
                                                                                    className="ml-auto text-[9px] text-blue-700 hover:text-blue-900 font-extrabold underline cursor-pointer"
                                                                                    title="Transferir integralmente (100%) este atendimento para este profissional"
                                                                                >
                                                                                    Transferir 100%
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* Total Atendimento (Bruto) Editável */}
                                                            <td className="py-2 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                                <div className="inline-flex items-center justify-end gap-1 bg-white border border-gray-200 rounded-lg px-1.5 py-0.5 shadow-2xs hover:border-blue-400 focus-within:ring-1 focus-within:ring-blue-500">
                                                                    <span className="text-[10px] text-gray-400 font-bold">R$</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        value={det.price}
                                                                        onChange={(e) => {
                                                                            const val = parseFloat(e.target.value);
                                                                            updateSessionField(s.id, { price: isNaN(val) ? 0 : val });
                                                                        }}
                                                                        className="w-16 text-right font-bold text-gray-900 text-xs bg-transparent focus:outline-none"
                                                                        title={det.isCoveredByPackage ? "Atendimento incluso no pacote do paciente (R$ 0,00)" : "Valor bruto do atendimento"}
                                                                    />
                                                                </div>
                                                            </td>

                                                            {/* Forma de Pagamento */}
                                                            <td className="py-2 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                                <select
                                                                    value={det.paymentMethod}
                                                                    onChange={(e) => {
                                                                        const newMethod = e.target.value as PaymentMethodType;
                                                                        const newFee = getDefaultCardFeeRate(newMethod);
                                                                        updateSessionField(s.id, {
                                                                            paymentMethod: newMethod,
                                                                            cardFeeRate: newFee
                                                                        });
                                                                    }}
                                                                    className="text-xs font-semibold py-1 px-1.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                                                                    title="Forma de pagamento do atendimento"
                                                                >
                                                                    {PAYMENT_METHODS.map(m => (
                                                                        <option key={m.id} value={m.id}>
                                                                            {m.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>

                                                            {/* Taxa da Maquininha (% e R$) */}
                                                            <td className="py-2 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                                <div className="inline-flex flex-col items-end">
                                                                    <div className="inline-flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg px-1 py-0.5 shadow-2xs hover:border-blue-400 focus-within:ring-1 focus-within:ring-blue-500">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            max="100"
                                                                            value={det.cardFeeRate}
                                                                            onChange={(e) => {
                                                                                const val = parseFloat(e.target.value);
                                                                                updateSessionField(s.id, { cardFeeRate: isNaN(val) ? 0 : val });
                                                                            }}
                                                                            className="w-10 text-right font-bold text-gray-700 text-xs bg-transparent focus:outline-none"
                                                                            title="Percentual da taxa de cartão"
                                                                        />
                                                                        <span className="text-[10px] font-bold text-gray-400">%</span>
                                                                    </div>
                                                                    {det.cardFeeAmount > 0 && (
                                                                        <span className="text-[9px] font-bold text-red-600 mt-0.5">
                                                                            - R$ {det.cardFeeAmount.toFixed(2)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* Líquido Pós-Cartão */}
                                                            <td className="py-2 px-3 text-right font-bold text-gray-900 whitespace-nowrap text-xs">
                                                                R$ {det.netAmountAfterCard.toFixed(2)}
                                                            </td>

                                                            {/* Comissão Profissional (%) */}
                                                            <td className="py-2 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <div className="inline-flex items-center gap-0.5 bg-white border border-blue-200 rounded-lg px-1.5 py-0.5 shadow-2xs hover:border-blue-400 focus-within:ring-1 focus-within:ring-blue-500">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            step="1"
                                                                            value={det.isCoveredByOtherProf ? 50 : (professional.contractType === 'socio' ? 100 : 50)}
                                                                            disabled={professional.contractType === 'socio' && !chargeClinicFee}
                                                                            onChange={(e) => {
                                                                                const val = parseFloat(e.target.value);
                                                                                updateSessionField(s.id, {
                                                                                    commissionValue: isNaN(val) ? 0 : val,
                                                                                    commissionType: 'percentage'
                                                                                });
                                                                            }}
                                                                            className="w-8 text-center font-bold text-blue-700 bg-transparent text-xs focus:outline-none disabled:opacity-60"
                                                                            title="Porcentagem de comissão do profissional"
                                                                        />
                                                                        <span className="text-[10px] font-black text-blue-600">%</span>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* Repasse Profissional */}
                                                            <td className="py-2 px-3 text-right font-black text-blue-700 whitespace-nowrap text-xs">
                                                                R$ {det.commissionEarned.toFixed(2)}
                                                            </td>

                                                            {/* Retido Clínica */}
                                                            <td className="py-2 px-3 text-right whitespace-nowrap bg-indigo-50/40">
                                                                <div className="inline-flex items-center justify-end gap-1.5">
                                                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                                                                        {det.clinicPercentage}%
                                                                    </span>
                                                                    <span className="font-bold text-indigo-950 text-xs">
                                                                        R$ {det.clinicRetained.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            {/* Ações */}
                                                            <td className="py-2 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    {s.status !== 'Realizada' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleMakeRealized(s.id)}
                                                                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition-all cursor-pointer"
                                                                            title="Confirmar realização do atendimento e incluir na folha"
                                                                        >
                                                                            Tornar Realizada
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => onToggleLateCancellation(s.id, isLate)}
                                                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${isLate
                                                                            ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                                                            : 'bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-800'
                                                                            }`}
                                                                        title={isLate ? "Remover cobrança em cima da hora" : "Marcar como cancelou em cima da hora (cobrar atendimento)"}
                                                                    >
                                                                        {isLate ? 'Desfazer Cobrança' : 'Cobrar Atendimento'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setEditingSessionForAudit(s)}
                                                                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer flex items-center gap-1"
                                                                        title="Editar data/hora, paciente, procedimento ou pacote vinculado"
                                                                    >
                                                                        <Edit className="w-3 h-3" />
                                                                        Editar
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleInitiateTransfer(s, clinicalProfessionals.filter(p => p.id !== professional.id)[0]?.id || '')}
                                                                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer flex items-center gap-1"
                                                                        title="Transferir paciente / atendimento para outro profissional"
                                                                    >
                                                                        <ArrowRightLeft className="w-3 h-3" />
                                                                        Transferir
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={14} className="py-8 text-center text-gray-400 text-xs">
                                                        Nenhuma sessão encontrada para este filtro na agenda do profissional.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {activeSessionsList.length > 0 && (
                                            <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-bold text-gray-900 sticky bottom-0 z-10 text-xs">
                                                <tr>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                                            {selectedSessionIds.length}/{activeSessionsList.length}
                                                        </span>
                                                    </td>
                                                    <td colSpan={5} className="py-2.5 px-3 uppercase text-[10px] font-black text-gray-700 tracking-wider">
                                                        TOTAL GERAL SESSÕES ({selectedSessionIds.length} sessões selecionadas)
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-black text-gray-950 whitespace-nowrap">
                                                        R$ {auditedTotals.totalSessionsGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center text-[10px] text-gray-500 whitespace-nowrap">
                                                        —
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-bold text-red-600 whitespace-nowrap">
                                                        - R$ {auditedTotals.totalSessionsCardFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-black text-gray-900 whitespace-nowrap">
                                                        R$ {auditedTotals.totalSessionsNetAfterCard.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                        <span className="text-[10px] font-bold text-gray-500">
                                                            Média: {auditedTotals.avgProfPercentage.toFixed(0)}%
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-black text-blue-700 whitespace-nowrap">
                                                        R$ {auditedTotals.totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-black text-indigo-900 whitespace-nowrap bg-indigo-100/60">
                                                        <div className="inline-flex items-center justify-end gap-1.5">
                                                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-800">
                                                                {auditedTotals.avgClinicPercentage.toFixed(0)}%
                                                            </span>
                                                            <span>
                                                                R$ {auditedTotals.totalClinicRetained.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center text-[10px] text-gray-500 whitespace-nowrap">
                                                        {auditedTotals.totalCoverageDeductions > 0 ? (
                                                            <span className="text-red-700 font-bold">
                                                                - R$ {auditedTotals.totalCoverageDeductions.toFixed(2)} (coberturas)
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Vales do Colaborador a Deduzir */}
                    {advances.length > 0 && (
                        <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <CreditCard className="w-4 h-4 text-amber-600" />
                                    Vales & Adiantamentos a Abater no Pagamento
                                </h4>
                                <span className="text-[11px] font-bold text-amber-800">
                                    Total Selecionado: R$ {auditedTotals.totalAdvancesDeducted.toFixed(2)}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {advances.map(adv => {
                                    const isDeducted = selectedAdvanceIds.includes(adv.id);
                                    return (
                                        <label
                                            key={adv.id}
                                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isDeducted
                                                ? 'bg-white border-amber-300 shadow-2xs'
                                                : 'bg-white/50 border-gray-200 opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isDeducted}
                                                    onChange={() => toggleAdvance(adv.id)}
                                                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                                                />
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900">
                                                        R$ {adv.amount.toFixed(2)}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500">
                                                        {formatDateBR(adv.advanceDate)} • {adv.description || 'Vale'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                                Abater
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Observações do Fechamento */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Observações do Fechamento Financeiro (Opcional)
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Ex: Fechamento com pacotes pagos no mês, deduções de cobertura e repasse de sócio"
                            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div>
                </div>

                {/* Rodapé Fixo Consolidado com Totais e Ações (Fiel à Planilha Real) */}
                <div className="border-t border-gray-200 bg-slate-900 text-white p-3.5 sm:px-6 sm:py-3.5 shrink-0 shadow-xl">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        {/* Métricas Consolidadas Seguidas da Planilha */}
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 flex-1">
                            <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/80">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pacotes Bruto</p>
                                <h4 className="text-sm sm:text-base font-black text-white">
                                    R$ {auditedTotals.totalPackagesGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h4>
                                <span className="text-[10px] text-slate-400">{auditedTotals.totalPackagesCount} pacotes</span>
                            </div>

                            <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/80">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Taxas Maquininha</p>
                                <h4 className="text-sm sm:text-base font-black text-red-400">
                                    - R$ {(auditedTotals.totalPackagesCardFees + auditedTotals.totalSessionsCardFees).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h4>
                                <span className="text-[10px] text-slate-400">Débito 1,45% / Créd. 3,51%</span>
                            </div>

                            <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/80">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Líquido Pacotes</p>
                                <h4 className="text-sm sm:text-base font-black text-blue-400">
                                    R$ {auditedTotals.totalPackagesNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h4>
                                <span className="text-[10px] text-blue-300/80">Pós-taxas de cartão</span>
                            </div>

                            <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/80">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Coberturas Colegas</p>
                                <h4 className="text-sm sm:text-base font-black text-amber-400">
                                    - R$ {auditedTotals.totalCoverageDeductions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h4>
                                <span className="text-[10px] text-amber-300/80">50% repasse substitutos</span>
                            </div>

                            <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/80">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Vales Deduzidos</p>
                                <h4 className="text-sm sm:text-base font-black text-amber-400">
                                    - R$ {auditedTotals.totalAdvancesDeducted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h4>
                                <span className="text-[10px] text-amber-300/80">{selectedAdvanceIds.length} vales selecionados</span>
                            </div>

                            <div className="bg-emerald-950/70 p-2.5 rounded-xl border border-emerald-500/50 flex flex-col justify-center">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Líquido a Pagar Final</p>
                                <h3 className="text-base sm:text-xl font-black text-emerald-400 leading-tight">
                                    R$ {auditedTotals.netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h3>
                            </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex items-center justify-end gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                Fechar
                            </button>
                            <button
                                type="button"
                                disabled={submitting || (selectedPackageIds.length === 0 && selectedSessionIds.length === 0)}
                                onClick={handleApproveForm}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                {submitting ? 'Aprovando...' : 'Aprovar Fechamento & Gerar Pagamento'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL: ADICIONAR NOVO PACOTE PAGO NA CONFERÊNCIA */}
            {showAddPackageModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ zIndex: 100 }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-gray-100">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Package className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-gray-900">Adicionar Pacote Pago</h4>
                                    <p className="text-[11px] text-gray-500">Lançamento de pacote para a conferência financeira</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddPackageModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveNewPackage} className="space-y-3.5">
                            {/* Paciente */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Paciente *
                                </label>
                                <select
                                    required
                                    value={newPkgPatientId}
                                    onChange={e => setNewPkgPatientId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="">Selecione o paciente...</option>
                                    {patients
                                        .filter(p => selectedUnit === 'ALL' || !p.unitId || p.unitId === selectedUnit)
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Template de Pacote / Plano */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Plano / Pacote Cadastrado
                                </label>
                                <select
                                    value={newPkgTemplate}
                                    onChange={e => {
                                        const tId = e.target.value;
                                        setNewPkgTemplate(tId);
                                        const t = PACKAGE_TEMPLATES.find(tpl => tpl.id === tId);
                                        if (t) {
                                            setNewPkgName(t.name);
                                            setNewPkgSessions(t.sessions);
                                            setNewPkgPrice(t.price);
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    {PACKAGE_TEMPLATES.map(tpl => (
                                        <option key={tpl.id} value={tpl.id}>
                                            {tpl.name} {tpl.id !== 'CUSTOM' ? `(R$ ${tpl.price.toFixed(2)})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Nome e Qtd Sessões */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Pacote</label>
                                    <input
                                        type="text"
                                        required
                                        value={newPkgName}
                                        onChange={e => setNewPkgName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Qtd Sessões</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={newPkgSessions}
                                        onChange={e => setNewPkgSessions(parseInt(e.target.value) || 1)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-center outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Valor Bruto e Data do Pagamento */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Valor Bruto (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={newPkgPrice}
                                        onChange={e => setNewPkgPrice(parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Data do Pagamento</label>
                                    <input
                                        type="date"
                                        required
                                        value={newPkgDate}
                                        onChange={e => setNewPkgDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Forma de Pagamento e Taxa Maquininha */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Forma de Pagamento</label>
                                    <select
                                        value={newPkgMethod}
                                        onChange={e => {
                                            const m = e.target.value as PaymentMethodType;
                                            setNewPkgMethod(m);
                                            setNewPkgCardFeeRate(getDefaultCardFeeRate(m));
                                        }}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        {PAYMENT_METHODS.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Taxa Maquininha (%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={newPkgCardFeeRate}
                                        onChange={e => setNewPkgCardFeeRate(parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Resumo Líquido Previsto */}
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-900">
                                <span>Líquido a ser Creditado:</span>
                                <span className="text-sm font-black text-emerald-700">
                                    R$ {(newPkgPrice - ((newPkgPrice * newPkgCardFeeRate) / 100)).toFixed(2)}
                                </span>
                            </div>

                            {/* Botões do Form */}
                            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAddPackageModal(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingNewPkg}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {savingNewPkg ? 'Salvando...' : 'Salvar Pacote na Conferência'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação: Transferência para Conferência Individual */}
            {transferModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ zIndex: 100 }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
                                <ArrowRightLeft className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-gray-900">
                                    Transferir Atendimento para Colega
                                </h4>
                                <p className="text-xs text-gray-500">
                                    Transferência definitiva de paciente / sessão
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-3">
                            <p>
                                Transferir atendimento de <strong>{patients.find(p => p.id === transferModal.session.patientId)?.name || 'Paciente'}</strong> realizado em <strong>{formatDateBR(transferModal.session.date)} às {transferModal.session.time?.substring(0, 5)}</strong>.
                            </p>

                            <div>
                                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                                    Profissional de Destino (Receberá 100% do repasse):
                                </label>
                                <select
                                    value={transferModal.targetProfId}
                                    onChange={(e) => {
                                        const chosen = clinicalProfessionals.find(p => p.id === e.target.value);
                                        if (chosen) {
                                            setTransferModal(prev => prev ? {
                                                ...prev,
                                                targetProfId: chosen.id,
                                                targetProfName: chosen.name
                                            } : null);
                                        }
                                    }}
                                    className="w-full text-xs font-semibold py-2 px-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                                >
                                    {clinicalProfessionals.filter(p => p.id !== professional.id).map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} {p.specialty ? `(${p.specialty})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {transferModal.patientSessionsCount > 1 && (
                                <label className="flex items-center gap-2 p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-xs font-semibold cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={transferModal.transferAllPatientSessions}
                                        onChange={(e) => setTransferModal(prev => prev ? { ...prev, transferAllPatientSessions: e.target.checked } : null)}
                                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                                    />
                                    <span>Transferir <strong>todos os {transferModal.patientSessionsCount} atendimentos</strong> deste paciente neste período</span>
                                </label>
                            )}

                            <div className="p-2.5 bg-indigo-50/80 rounded-lg border border-indigo-100 text-indigo-950 font-medium space-y-1">
                                <p className="text-[11px]">
                                    • O(s) atendimento(s) sairá(ão) da conferência de <strong>{professional.name}</strong>.
                                </p>
                                <p className="text-[11px]">
                                    • Será creditado na conferência individual de <strong>{transferModal.targetProfName}</strong>.
                                </p>
                                <p className="text-[11px] text-gray-500">
                                    • O profissional da sessão no banco de dados será atualizado para {transferModal.targetProfName}.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                disabled={transferModal.loading}
                                onClick={() => setTransferModal(null)}
                                className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={transferModal.loading}
                                onClick={handleConfirmTransfer}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                {transferModal.loading ? 'Transferindo...' : 'Confirmar Transferência'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edição Detalhada da Sessão (Data/Hora, Paciente, Procedimento, Pacote) */}
            {editingSessionForAudit && (
                <AuditEditSessionModal
                    session={editingSessionForAudit}
                    patients={patients}
                    currentUnit={selectedUnit}
                    allUnits={units}
                    onClose={() => setEditingSessionForAudit(null)}
                    onSaved={(updatedSession) => {
                        setSessionEdits(prev => ({
                            ...prev,
                            [updatedSession.id]: updatedSession
                        }));
                        if (onSessionDetailsUpdated) {
                            onSessionDetailsUpdated(updatedSession);
                        }
                        setEditingSessionForAudit(null);
                    }}
                    onPatientCreated={onPatientCreated}
                    onPatientUpdated={onPatientUpdated}
                />
            )}
        </div>
    );
};

// =========================================================================
// MODAL: EXPORTAR RELATÓRIO / EXTRATO COM FILTROS DE STATUS, PROFISSIONAL & SESSÕES
// =========================================================================

interface ExportReportModalProps {
    initialProfId?: string;
    professionals: Professional[];
    sessions: Session[];
    payments: Payment[];
    advances: EmployeeAdvance[];
    patients: Patient[];
    units: any[];
    periodStart: string;
    periodEnd: string;
    calculateSessionCommission: (session: Session, prof: Professional) => any;
    onClose: () => void;
}

const ExportReportModal: React.FC<ExportReportModalProps> = ({
    initialProfId,
    professionals,
    sessions,
    payments,
    advances,
    patients,
    units,
    periodStart: defaultStart,
    periodEnd: defaultEnd,
    calculateSessionCommission,
    onClose
}) => {
    // Filtros do Relatório
    const [selectedProfId, setSelectedProfId] = useState<string>(initialProfId || 'ALL');
    const [filterPaymentStatus, setFilterPaymentStatus] = useState<'ALL' | 'pending' | 'paid'>('ALL');
    const [filterSessionType, setFilterSessionType] = useState<'ALL' | 'normal' | 'late_cancellation'>('ALL');
    const [filterUnitId, setFilterUnitId] = useState<string>('ALL');
    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(defaultEnd);
    const [isAllTime, setIsAllTime] = useState<boolean>(false);

    // Filtragem das Sessões
    const filteredReportData = useMemo(() => {
        // Filtrar profissionais selecionados
        const profsToInclude = selectedProfId === 'ALL'
            ? professionals
            : professionals.filter(p => p.id === selectedProfId);

        const rows: Array<{
            session: Session;
            professional: Professional;
            patient?: Patient;
            unit?: any;
            calculation: any;
            isLate: boolean;
        }> = [];

        let totalGross = 0;
        let totalCommission = 0;
        let totalClinicMargin = 0;
        let lateCancellationsCount = 0;
        let normalSessionsCount = 0;

        sessions.forEach(s => {
            // Filtro de data: se NÃO for atemporal, aplica o range de datas
            if (!isAllTime) {
                if (startDate && s.date < startDate) return;
                if (endDate && s.date > endDate) return;
            }

            // Filtro de unidade
            if (filterUnitId !== 'ALL' && s.unitId !== filterUnitId) return;

            // Filtro de status da sessão
            const isLate = s.isLateCancellation === true;
            if (filterSessionType === 'normal' && isLate) return;
            if (filterSessionType === 'late_cancellation' && !isLate) return;

            // Sessões consideradas devem ser Realizadas ou Desmarcações em cima da hora
            if (s.status !== 'Realizada' && !isLate) return;

            // Profissional
            const prof = profsToInclude.find(p => p.id === s.professionalId);
            if (!prof) return;

            // Filtro de status do pagamento da folha
            const payment = payments.find(p => p.professionalId === prof.id);
            if (filterPaymentStatus === 'paid' && payment?.status !== 'paid') return;
            if (filterPaymentStatus === 'pending' && payment?.status === 'paid') return;

            const pat = patients.find(p => p.id === s.patientId);
            const unt = units.find(u => u.id === s.unitId);

            // Se o profissional já possui um fechamento/auditoria aprovada com esta sessão, usamos os valores auditados exatos
            const profPayment = payments.find(p => p.professionalId === prof.id);
            const auditedItem = profPayment?.auditDetails?.find(a => a.sessionId === s.id);

            const calc = auditedItem ? {
                price: Number(auditedItem.price || 0),
                commissionType: auditedItem.commissionType,
                commissionValue: Number(auditedItem.commissionValue || 0),
                commissionEarned: Number(auditedItem.commissionEarned || 0),
                rateLabel: auditedItem.commissionType === 'percentage' ? `${auditedItem.commissionValue}%` : `R$ ${Number(auditedItem.commissionValue || 0).toFixed(2)}`,
                clinicFee: 0,
                clinicRetained: Number(auditedItem.clinicRetained ?? Math.max(0, (auditedItem.price || 0) - (auditedItem.commissionEarned || 0))),
                clinicPercentage: Number(auditedItem.clinicPercentage ?? (auditedItem.commissionType === 'percentage' ? Math.max(0, 100 - (auditedItem.commissionValue || 0)) : 0))
            } : calculateSessionCommission(s, prof);

            const safePrice = Number(calc.price || 0);
            const safeCommission = Number(calc.commissionEarned || 0);
            const safeClinic = Number(calc.clinicRetained ?? Math.max(0, safePrice - safeCommission));

            totalGross += safePrice;
            totalCommission += safeCommission;
            totalClinicMargin += safeClinic;

            if (isLate) {
                lateCancellationsCount++;
            } else {
                normalSessionsCount++;
            }

            rows.push({
                session: s,
                professional: prof,
                patient: pat,
                unit: unt,
                calculation: {
                    ...calc,
                    price: safePrice,
                    commissionEarned: safeCommission,
                    clinicRetained: safeClinic
                },
                isLate
            });
        });

        // Ordenar por data decrescente de forma segura
        rows.sort((a, b) => (b.session.date || '').localeCompare(a.session.date || ''));

        // Vales dos profissionais filtrados
        const profIds = new Set(profsToInclude.map(p => p.id));
        const filteredAdvances = advances.filter(a =>
            profIds.has(a.professionalId) &&
            (isAllTime || ((!startDate || a.advanceDate >= startDate) && (!endDate || a.advanceDate <= endDate)))
        );
        const totalAdvances = filteredAdvances.reduce((sum, a) => sum + Number(a.amount || 0), 0);

        return {
            rows,
            totalGross,
            totalCommission,
            totalClinicMargin,
            totalAdvances,
            lateCancellationsCount,
            normalSessionsCount,
            totalSessionsCount: rows.length,
            profsIncluded: profsToInclude
        };
    }, [selectedProfId, filterPaymentStatus, filterSessionType, filterUnitId, startDate, endDate, isAllTime, professionals, sessions, payments, advances, patients, units]);

    // Ação 1: Imprimir / Salvar PDF
    const handlePrint = () => {
        window.print();
    };

    // Ação 2: Copiar Resumo para WhatsApp
    const handleCopyWhatsApp = () => {
        try {
            const profName = selectedProfId === 'ALL'
                ? 'TODOS OS PROFISSIONAIS (Consolidado)'
                : (professionals.find(p => p.id === selectedProfId)?.name || 'Profissional');

            const periodLabel = isAllTime
                ? 'Histórico Completo (Atemporal)'
                : `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`;

            let text = `*FISIOSTAR CLÍNICA - EXTRATO DE FECHAMENTO*\n`;
            text += `*Período:* ${periodLabel}\n`;
            text += `*Profissional:* ${profName}\n\n`;

            text += `*RESUMO OPERACIONAL:*\n`;
            text += `• Total Atendimentos: ${filteredReportData.totalSessionsCount} (${filteredReportData.normalSessionsCount} normais, ${filteredReportData.lateCancellationsCount} em cima da hora)\n`;
            text += `• Produção Bruta: R$ ${filteredReportData.totalGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            text += `• Repasse / Comissões: R$ ${filteredReportData.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            text += `• Margem Retida da Clínica: R$ ${filteredReportData.totalClinicMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            if (filteredReportData.totalAdvances > 0) {
                text += `• Vales/Adiantamentos: -R$ ${filteredReportData.totalAdvances.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            }
            text += `----------------------------------------\n`;
            const netToPay = Math.max(0, filteredReportData.totalCommission - filteredReportData.totalAdvances);
            text += `*LÍQUIDO A RECEBER: R$ ${netToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n`;
            text += `----------------------------------------\n\n`;

            if (filteredReportData.rows.length > 0) {
                text += `*Últimos Atendimentos Registrados:*\n`;
                filteredReportData.rows.slice(0, 15).forEach(r => {
                    const sDate = r.session.date ? formatDateBR(r.session.date) : '';
                    const pkg = r.session.packageSessionNumber ? `(Sessão ${r.session.packageSessionNumber}/${r.session.packageTotalSessions || '?'})` : '(Avulsa)';
                    const lateTag = r.isLate ? ' [Em Cima da Hora - Cobrada]' : '';
                    text += `• ${sDate}: ${r.patient?.name || 'Paciente'} - ${r.session.type || 'Fisioterapia'} ${pkg}${lateTag} -> R$ ${Number(r.calculation?.commissionEarned || 0).toFixed(2)}\n`;
                });
                if (filteredReportData.rows.length > 15) {
                    text += `... e mais ${filteredReportData.rows.length - 15} atendimentos listados no sistema.\n`;
                }
            }

            navigator.clipboard.writeText(text);
            toast.success('Resumo formatado copiado para a área de transferência! Cole no WhatsApp.');
        } catch (err) {
            console.error('Erro ao copiar WhatsApp:', err);
            toast.error('Erro ao gerar texto para o WhatsApp.');
        }
    };

    // Ação 3: Exportar CSV para Excel
    const handleExportCSV = () => {
        try {
            const headers = [
                'Profissional',
                'Data',
                'Hora',
                'Paciente',
                'Procedimento',
                'Contagem do Pacote',
                'Status / Tipo',
                'Valor Bruto (R$)',
                'Regra Comissao',
                'Repasse Profissional (R$)',
                'Margem Clinica (R$)',
                'Unidade'
            ];

            const csvRows = [headers.join(';')];

            filteredReportData.rows.forEach(r => {
                const pkg = r.session.packageSessionNumber
                    ? `Sessao ${r.session.packageSessionNumber} de ${r.session.packageTotalSessions || ''}`
                    : 'Avulsa';

                const status = r.isLate
                    ? 'Avisou em Cima da Hora (Atendimento Cobrado)'
                    : 'Atendimento Realizado';

                const safePrice = Number(r.calculation?.price || 0);
                const safeCommission = Number(r.calculation?.commissionEarned || 0);
                const safeClinic = Number(r.calculation?.clinicRetained ?? Math.max(0, safePrice - safeCommission));

                const profName = r.professional?.name || 'Profissional';
                const sDate = r.session.date ? formatDateBR(r.session.date) : '';
                const sTime = r.session.time || '';
                const patName = r.patient?.name || 'Paciente';
                const sType = r.session.type || 'Fisioterapia';
                const uName = r.unit?.name || '';
                const rateLabel = r.calculation?.rateLabel || '';

                const row = [
                    `"${profName}"`,
                    sDate,
                    sTime,
                    `"${patName}"`,
                    `"${sType}"`,
                    `"${pkg}"`,
                    `"${status}"`,
                    safePrice.toFixed(2).replace('.', ','),
                    `"${rateLabel}"`,
                    safeCommission.toFixed(2).replace('.', ','),
                    safeClinic.toFixed(2).replace('.', ','),
                    `"${uName}"`
                ];
                csvRows.push(row.join(';'));
            });

            const csvContent = '\uFEFF' + csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            const periodFileName = isAllTime ? 'historico_completo_atemporal' : `${startDate}_a_${endDate}`;
            link.setAttribute('download', `extrato_fisiostar_${periodFileName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Arquivo CSV baixado com sucesso!');
        } catch (err) {
            console.error('Erro ao exportar CSV:', err);
            toast.error('Erro ao gerar planilha CSV');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-5 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] flex flex-col overflow-hidden border border-gray-100">
                {/* Header do Modal */}
                <div className="px-6 py-4 border-b border-gray-100 bg-slate-900 text-white flex items-center justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <Download className="w-5 h-5 text-emerald-400" />
                            <h3 className="text-base font-black tracking-tight">
                                Exportar Extrato & Relatório Financeiro
                            </h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Filtre por profissional, período (mensal ou atemporal), status de pagamento e gere PDF, WhatsApp ou Excel.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Área de Filtros Interativos */}
                <div className="p-4 sm:p-5 bg-gray-50 border-b border-gray-200/80 space-y-3 shrink-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Profissional
                            </label>
                            <select
                                value={selectedProfId}
                                onChange={e => setSelectedProfId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="ALL">Todos os Profissionais</option>
                                {professionals.filter(isClinicalProfessional).map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>
                                ))}
                            </select>
                        </div>

                        {/* Filtro Status Pagamento */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Status da Folha
                            </label>
                            <select
                                value={filterPaymentStatus}
                                onChange={e => setFilterPaymentStatus(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="ALL">Todos os Status</option>
                                <option value="pending">Aguardando / Pendente</option>
                                <option value="paid">Quitado / Pago</option>
                            </select>
                        </div>

                        {/* Filtro Tipo de Sessão */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Tipo de Atendimento
                            </label>
                            <select
                                value={filterSessionType}
                                onChange={e => setFilterSessionType(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="ALL">Todas as Sessões Cobradas</option>
                                <option value="normal">Apenas Atendimentos Normais</option>
                                <option value="late_cancellation">Apenas Em Cima da Hora</option>
                            </select>
                        </div>

                        {/* Filtro Unidade */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Unidade Clínica
                            </label>
                            <select
                                value={filterUnitId}
                                onChange={e => setFilterUnitId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="ALL">Todas as Unidades</option>
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filtro Período com Opção Atemporal */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                                    Período
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsAllTime(!isAllTime)}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                                        isAllTime
                                            ? 'bg-purple-600 text-white shadow-2xs'
                                            : 'bg-gray-200 text-gray-700 hover:bg-purple-100 hover:text-purple-800'
                                    }`}
                                    title="Alternar filtro atemporal: considera todo o histórico sem limites de data"
                                >
                                    <span>Atemporal</span>
                                    {isAllTime && <CheckCircle2 className="w-2.5 h-2.5" />}
                                </button>
                            </div>
                            {isAllTime ? (
                                <div className="px-2.5 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-[11px] font-bold text-purple-800 text-center flex items-center justify-center gap-1">
                                    <span>Todo o Histórico Completo</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-1/2 px-2 py-1.5 border border-gray-200 rounded-xl text-[11px] font-semibold bg-white outline-none"
                                    />
                                    <span className="text-gray-400 text-xs">-</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-1/2 px-2 py-1.5 border border-gray-200 rounded-xl text-[11px] font-semibold bg-white outline-none"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Barra de Ações de Exportação */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-200/60">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                            <span>Sessões Encontradas:</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-black">
                                {filteredReportData.totalSessionsCount}
                            </span>
                            {filteredReportData.lateCancellationsCount > 0 && (
                                <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-black text-[10px]">
                                    {filteredReportData.lateCancellationsCount} em cima da hora
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopyWhatsApp}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer"
                                title="Copiar resumo formatado para enviar no WhatsApp do profissional"
                            >
                                <MessageCircle className="w-4 h-4" />
                                <span>Copiar p/ WhatsApp</span>
                            </button>

                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer"
                                title="Baixar planilha CSV compatível com Excel"
                            >
                                <Download className="w-4 h-4" />
                                <span>Baixar CSV (Excel)</span>
                            </button>

                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs cursor-pointer"
                                title="Imprimir ou Salvar em PDF"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Imprimir / PDF</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Conteúdo com Scroll: Cards de Totais & Tabela */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 print:p-0">
                    {/* Cards de Totais Filtrados */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                            <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Produção Bruta</span>
                            <p className="text-lg font-black text-gray-900">
                                R$ {filteredReportData.totalGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>

                        <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200">
                            <span className="text-[10px] font-bold uppercase text-blue-700 tracking-wider">Repasse Comissões</span>
                            <p className="text-lg font-black text-blue-700">
                                R$ {filteredReportData.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>

                        <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                            <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">Margem da Clínica</span>
                            <p className="text-lg font-black text-emerald-700">
                                R$ {filteredReportData.totalClinicMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>

                        <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200">
                            <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">Vales no Período</span>
                            <p className="text-lg font-black text-amber-700">
                                R$ {filteredReportData.totalAdvances.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* Tabela Detalhada com visual para impressão */}
                    <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-100/80 text-[10px] font-bold text-gray-600 uppercase border-b border-gray-200">
                                    <th className="py-2.5 px-3">Profissional</th>
                                    <th className="py-2.5 px-3">Data / Hora</th>
                                    <th className="py-2.5 px-3">Paciente</th>
                                    <th className="py-2.5 px-3">Procedimento</th>
                                    <th className="py-2.5 px-3">Pacote / Sessão</th>
                                    <th className="py-2.5 px-3 text-center">Status</th>
                                    <th className="py-2.5 px-3 text-right">Bruto (R$)</th>
                                    <th className="py-2.5 px-3 text-center">Regra</th>
                                    <th className="py-2.5 px-3 text-right">Repasse (R$)</th>
                                    <th className="py-2.5 px-3 text-right">Clínica (R$)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredReportData.rows.length > 0 ? (
                                    filteredReportData.rows.map(r => (
                                        <tr key={r.session.id} className="hover:bg-gray-50/70">
                                            <td className="py-2 px-3 font-bold text-gray-900">
                                                {r.professional.name}
                                            </td>
                                            <td className="py-2 px-3 text-gray-600">
                                                {formatDateBR(r.session.date)} {r.session.time?.substring(0, 5)}
                                            </td>
                                            <td className="py-2 px-3 font-semibold text-gray-800">
                                                {r.patient?.name || 'Paciente'}
                                            </td>
                                            <td className="py-2 px-3 text-gray-600">
                                                {r.session.type}
                                            </td>
                                            <td className="py-2 px-3">
                                                {r.session.packageSessionNumber ? (
                                                    <span className="font-bold text-purple-700">
                                                        Sessão {r.session.packageSessionNumber}/{r.session.packageTotalSessions || '?'}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">Avulsa</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                {r.isLate ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800">
                                                        Em Cima da Hora
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                        Realizada
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-right font-medium text-gray-700">
                                                R$ {r.calculation.price.toFixed(2)}
                                            </td>
                                            <td className="py-2 px-3 text-center text-blue-600 font-bold">
                                                {r.calculation.rateLabel}
                                            </td>
                                            <td className="py-2 px-3 text-right font-black text-emerald-600">
                                                R$ {r.calculation.commissionEarned.toFixed(2)}
                                            </td>
                                            <td className="py-2 px-3 text-right font-medium text-purple-700">
                                                R$ {r.calculation.clinicRetained.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-gray-400 text-xs">
                                            Nenhum registro encontrado para os filtros selecionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Rodapé */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

// =========================================================================
// MODAL: LANÇAR NOVO VALE / ADIANTAMENTO
// =========================================================================

const AdvanceModal = ({
    professionals,
    units,
    currentUnit,
    userId,
    onSave,
    onCancel
}: {
    professionals: Professional[];
    units: any[];
    currentUnit: string;
    userId: string;
    onSave: (data: any) => Promise<void>;
    onCancel: () => void;
}) => {
    const [professionalId, setProfessionalId] = useState(professionals[0]?.id || '');
    const [unitId, setUnitId] = useState(currentUnit === 'ALL' ? (units[0]?.id || '') : currentUnit);
    const [amount, setAmount] = useState('');
    const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('pix');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (!val || val <= 0) {
            toast.error('Informe um valor válido para o vale');
            return;
        }

        setSubmitting(true);
        try {
            await onSave({
                professionalId,
                unitId: unitId || undefined,
                amount: val,
                advanceDate,
                paymentMethod,
                description: description.trim() || undefined,
                createdBy: userId
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-amber-50/40">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-amber-600" />
                            Lançar Vale / Adiantamento a Colaborador
                        </h3>
                        <p className="text-xs text-gray-500">O valor será deduzido automaticamente na folha de pagamento.</p>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-white transition-all cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Colaborador / Profissional *
                        </label>
                        <select
                            required
                            value={professionalId}
                            onChange={e => setProfessionalId(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                        >
                            {professionals.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Valor do Vale (R$) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="300.00"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-black text-amber-700 outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Data da Concessão *
                            </label>
                            <input
                                type="date"
                                required
                                value={advanceDate}
                                onChange={e => setAdvanceDate(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Forma de Pagamento
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none bg-white cursor-pointer"
                            >
                                <option value="pix">PIX</option>
                                <option value="cash">Dinheiro em Espécie</option>
                                <option value="bank_transfer">Transferência Bancária</option>
                                <option value="check">Cheque</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Unidade
                            </label>
                            <select
                                value={unitId}
                                onChange={e => setUnitId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none bg-white cursor-pointer"
                            >
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Descrição / Motivo do Vale (Opcional)
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: Adiantamento solicitado para despesas médicas"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {submitting ? 'Salvando...' : 'Registrar Vale'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// =========================================================================
// MODAL: DESPESA CLÍNICA
// =========================================================================

const ExpenseModal = ({
    expense,
    unitId,
    units,
    userId,
    onSave,
    onCancel
}: {
    expense?: Expense | null;
    unitId: string;
    units: any[];
    userId: string;
    onSave: (data: any) => Promise<void>;
    onCancel: () => void;
}) => {
    const [selectedUnit, setSelectedUnit] = useState(unitId === 'ALL' ? (units[0]?.id || '') : unitId);
    const [category, setCategory] = useState<Expense['category']>(expense?.category || 'supplies');
    const [description, setDescription] = useState(expense?.description || '');
    const [amount, setAmount] = useState(expense?.amount?.toString() || '');
    const [expenseDate, setExpenseDate] = useState(expense?.expenseDate || new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (!val || val <= 0) {
            toast.error('Informe um valor válido');
            return;
        }

        setSubmitting(true);
        try {
            await onSave({
                unitId: selectedUnit,
                category,
                description: description.trim(),
                amount: val,
                expenseDate,
                createdBy: userId
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-red-50/40">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-red-600" />
                            {expense ? 'Editar Despesa' : 'Lançar Nova Despesa'}
                        </h3>
                        <p className="text-xs text-gray-500">Custos operacionais, aluguéis, materiais e taxas.</p>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-white transition-all cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Descrição da Despesa *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Compra de Faixas Elásticas e Gel Condutor"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Valor (R$) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="150.00"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-black text-red-700 outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Data do Vencimento/Pagamento *
                            </label>
                            <input
                                type="date"
                                required
                                value={expenseDate}
                                onChange={e => setExpenseDate(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Categoria
                            </label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none bg-white cursor-pointer"
                            >
                                <option value="supplies">Suprimentos / Insumos</option>
                                <option value="rent">Aluguel / Condomínio</option>
                                <option value="utilities">Energia / Água / Internet</option>
                                <option value="maintenance">Manutenção de Aparelhos</option>
                                <option value="marketing">Marketing / Anúncios</option>
                                <option value="salaries">Salários / Benefícios</option>
                                <option value="other">Outros Custos</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Unidade
                            </label>
                            <select
                                value={selectedUnit}
                                onChange={e => setSelectedUnit(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none bg-white cursor-pointer"
                            >
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {submitting ? 'Salvando...' : 'Salvar Despesa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// =========================================================================
// MODAL: RECEITA ENTRANTE COM DEDUÇÃO AUTOMÁTICA DE TAXAS (SUMUP)
// =========================================================================

const RevenueModal = ({
    unitId,
    units,
    userId,
    patients,
    onSave,
    onCancel
}: {
    unitId: string;
    units: any[];
    userId: string;
    patients: Patient[];
    onSave: (data: any) => Promise<void>;
    onCancel: () => void;
}) => {
    const [selectedUnit, setSelectedUnit] = useState(unitId === 'ALL' ? (units[0]?.id || '') : unitId);
    const [patientId, setPatientId] = useState('');
    const [category, setCategory] = useState<'patient_plan' | 'session' | 'other'>('patient_plan');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [revenueDate, setRevenueDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'debit_card' | 'cash' | 'bank_transfer'>('pix');
    const [feePercentage, setFeePercentage] = useState<number>(0);
    const [submitting, setSubmitting] = useState(false);

    // Ajustar taxa padrão conforme forma de pagamento (SumUp 1.45% Débito, 3.51% Crédito)
    const handleMethodChange = (newMethod: any) => {
        setPaymentMethod(newMethod);
        if (newMethod === 'credit_card') {
            setFeePercentage(3.51);
        } else if (newMethod === 'debit_card') {
            setFeePercentage(1.45);
        } else {
            setFeePercentage(0);
        }
    };

    const parsedAmount = parseFloat(amount) || 0;
    const feeDeduction = (parsedAmount * feePercentage) / 100;
    const netClinicAmount = Math.max(0, parsedAmount - feeDeduction);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (parsedAmount <= 0) {
            toast.error('Informe um valor válido');
            return;
        }

        setSubmitting(true);
        try {
            await onSave({
                unitId: selectedUnit,
                patientId: patientId || undefined,
                category,
                description: description.trim() || 'Recebimento de Tratamento',
                amount: parsedAmount,
                feePercentage: feePercentage > 0 ? feePercentage : undefined,
                netAmount: netClinicAmount,
                revenueDate,
                paymentMethod,
                createdBy: userId
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-emerald-50/40">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                            Lançar Nova Receita
                        </h3>
                        <p className="text-xs text-gray-500">Planos de tratamento, sessões avulsas e taxas de cartão.</p>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-white transition-all cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Paciente (Opcional)
                        </label>
                        <select
                            value={patientId}
                            onChange={e => {
                                setPatientId(e.target.value);
                                const pat = patients.find(p => p.id === e.target.value);
                                if (pat) setDescription(`Pagamento de Plano - ${pat.name}`);
                            }}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                            <option value="">Selecione o paciente (ou deixe avulso)...</option>
                            {patients.map(p => (
                                <option key={p.id} value={p.id}>{p.name} {p.cpf ? `(${p.cpf})` : ''}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Descrição do Recebimento *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Pacote 10 Sessões Pilates"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Valor Bruto Pago (R$) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="800.00"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Data do Recebimento *
                            </label>
                            <input
                                type="date"
                                required
                                value={revenueDate}
                                onChange={e => setRevenueDate(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Forma de Pagamento
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={e => handleMethodChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none bg-white cursor-pointer"
                            >
                                <option value="pix">PIX (0% taxa)</option>
                                <option value="credit_card">Cartão de Crédito (SumUp 3.51%)</option>
                                <option value="debit_card">Cartão de Débito (SumUp 1.45%)</option>
                                <option value="cash">Dinheiro em Espécie (0%)</option>
                                <option value="bank_transfer">Transferência Bancária (0%)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Taxa Maquininha (%)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={feePercentage}
                                onChange={e => setFeePercentage(parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none bg-white"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Resumo da Taxa & Líquido da Clínica */}
                    {parsedAmount > 0 && (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                            <div>
                                <span className="text-gray-500">Taxa descontada: </span>
                                <span className="font-bold text-red-600">-R$ {feeDeduction.toFixed(2)} ({feePercentage}%)</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Líquido na Conta: </span>
                                <span className="font-black text-emerald-700 text-sm">R$ {netClinicAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Unidade Clínica
                        </label>
                        <select
                            value={selectedUnit}
                            onChange={e => setSelectedUnit(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none bg-white cursor-pointer"
                        >
                            {units.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {submitting ? 'Salvando...' : 'Salvar Receita'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// =========================================================================
// MODAL: REGISTRAR QUITAÇÃO DE PAGAMENTO
// =========================================================================

const PaymentModal = ({
    payment,
    professional,
    onConfirm,
    onCancel
}: {
    payment: Payment;
    professional?: Professional;
    onConfirm: (method: string, notes?: string, paidAt?: string) => void;
    onCancel: () => void;
}) => {
    const [method, setMethod] = useState<'pix' | 'bank_transfer' | 'cash' | 'credit_card' | 'debit_card' | 'check'>('pix');
    const [notes, setNotes] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);

    const paymentMethods = [
        { value: 'pix', label: 'PIX', color: 'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100' },
        { value: 'bank_transfer', label: 'Transferência (TED/DOC)', color: 'border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100' },
        { value: 'cash', label: 'Dinheiro', color: 'border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100' },
        { value: 'check', label: 'Cheque', color: 'border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100' }
    ];

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await onConfirm(method, notes, paymentDate);
        } finally {
            setSubmitting(false);
        }
    };

    const finalAmount = payment.netAmount !== undefined ? payment.netAmount : payment.totalAmount;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-100">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-600" />
                            Quitar Honorários do Profissional
                        </h3>
                        <p className="text-xs text-gray-500">Confirmação de transferência e comprovante financeiro</p>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-white transition-all cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
                    <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-blue-50/80 rounded-2xl border border-emerald-100/80 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Profissional</p>
                            <h4 className="text-sm font-bold text-gray-900">{professional?.name || 'Profissional'}</h4>
                            <span className="text-[11px] text-gray-500 font-medium">{payment.totalSessions} sessões conferidas</span>
                            {professional?.pixKey && (
                                <p className="text-[11px] font-bold text-blue-600 mt-1">
                                    Chave PIX: {professional.pixKey}
                                </p>
                            )}
                        </div>

                        <div className="text-right">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Líquido</p>
                            <p className="text-2xl font-black text-emerald-600">
                                R$ {finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Forma de Efetivação</label>
                        <div className="grid grid-cols-2 gap-2">
                            {paymentMethods.map(option => {
                                const isSelected = method === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setMethod(option.value as any)}
                                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between ${isSelected
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                            : option.color
                                            }`}
                                    >
                                        <span>{option.label}</span>
                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Data da Efetivação</label>
                            <input
                                type="date"
                                required
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Nº Comprovante / Notas</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                                placeholder="Ex: PIX TxID ou DOC"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {submitting ? 'Confirmando...' : 'Confirmar Quitação'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Financial;
