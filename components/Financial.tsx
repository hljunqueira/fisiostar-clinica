import React, { useState, useEffect } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { FinancialDashboard } from './FinancialDashboard';
import { DollarSign, Calendar, CheckCircle2, Clock, Download, Filter, Plus, TrendingUp, TrendingDown, X, Save, Trash2, FileText } from 'lucide-react';
import { UnitId, Professional, Patient } from '../types';
import type { Payment, Expense, Revenue, CreateExpense, CreateRevenue } from '../src/types/financial';
import { paymentsApi, expensesApi, revenuesApi } from '../src/services/financial-api';
import { professionalsApi, patientsApi, unitsApi, sessionsApi, auditLogsApi } from '../src/services/api';
import toast from 'react-hot-toast';

interface FinancialProps {
    currentUnit: UnitId;
    currentUserId: string;
}

type TabType = 'receitas' | 'despesas' | 'pagamentos';
type PeriodFilter = 'week' | 'month' | 'all';

const Financial: React.FC<FinancialProps> = ({ currentUnit, currentUserId }) => {
    const [activeTab, setActiveTab] = useState<TabType>('pagamentos');
    const [payments, setPayments] = useState<Payment[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [revenues, setRevenues] = useState<Revenue[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<PeriodFilter>('month');

    // Modals
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showRevenueModal, setShowRevenueModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

    useEffect(() => {
        loadData();
    }, [currentUnit]);

    async function loadData() {
        try {
            setLoading(true);
            const [paymentsData, expensesData, revenuesData, professionalsData, patientsData, unitsData] = await Promise.all([
                paymentsApi.getAll(),
                expensesApi.getAll(currentUnit === 'ALL' ? undefined : currentUnit),
                revenuesApi.getAll(currentUnit === 'ALL' ? {} : { unitId: currentUnit }),
                professionalsApi.getAll(),
                patientsApi.getAll(),
                unitsApi.getAll()
            ]);
            setPayments(paymentsData);
            setExpenses(expensesData);
            setRevenues(revenuesData);
            setProfessionals(professionalsData);
            setPatients(patientsData);
            setUnits(unitsData);
        } catch (error) {
            console.error('Error loading financial data:', error);
            toast.error('Erro ao carregar dados financeiros');
        } finally {
            setLoading(false);
        }
    }

    // Calculate totals
    const totalRevenues = revenues.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPendingPayments = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.totalAmount, 0);
    const totalPaidPayments = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.totalAmount, 0);
    const netBalance = totalRevenues - totalExpenses - totalPaidPayments;

    const handleMarkPaymentAsPaid = (payment: Payment) => {
        setSelectedPayment(payment);
        setShowPaymentModal(true);
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

            // Audit log
            const methodLabels: Record<string, string> = {
                pix: 'PIX',
                bank_transfer: 'Transferência Bancária',
                cash: 'Dinheiro Espécie',
                credit_card: 'Cartão de Crédito',
                debit_card: 'Cartão de Débito',
                check: 'Cheque'
            };
            await auditLogsApi.logAction({
                userName: 'Financeiro',
                userRole: 'admin',
                category: 'financial',
                action: 'Pagamento a Profissional Confirmado',
                details: `Confirmou repasse de R$ ${selectedPayment.totalAmount.toFixed(2)} (${methodLabels[paymentMethod] || paymentMethod}) para o profissional ${prof?.name || 'Profissional'} referente a ${selectedPayment.totalSessions} sessões.`
            });

            setSelectedPayment(null);
            toast.success('Pagamento registrado com sucesso!');
        } catch (error) {
            console.error('Error marking payment as paid:', error);
            toast.error('Erro ao registrar pagamento');
        }
    };

    const handleGeneratePayroll = async () => {
        try {
            const allSessions = await sessionsApi.getAll(currentUnit === 'ALL' ? {} : { unitId: currentUnit });
            const now = new Date();
            const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

            let created = 0;
            for (const prof of professionals) {
                const profSessions = allSessions.filter(s => s.professionalId === prof.id && s.status === 'Realizada');
                if (profSessions.length > 0) {
                    const totalAmount = profSessions.length * (prof.hourlyRate || 0);
                    await paymentsApi.create({
                        professionalId: prof.id,
                        periodStart,
                        periodEnd,
                        totalSessions: profSessions.length,
                        amountPerSession: prof.hourlyRate || 0,
                        totalAmount
                    });
                    created++;
                }
            }

            if (created > 0) {
                toast.success(`${created} folha(s) de pagamento gerada(s) com sucesso!`);
                await loadData();
            } else {
                toast.error('Nenhuma sessão realizada pendente no período atual.');
            }
        } catch (error) {
            console.error('Error generating payroll:', error);
            toast.error('Erro ao gerar folha de pagamento');
        }
    };



    // Modal State
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
            description: 'Tem certeza que deseja excluir esta receita? Esta ação não pode ser desfeita.',
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

    if (loading) {
        return <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Carregando dados financeiros...</div>
        </div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
                    <p className="text-gray-500">Gestão de receitas, despesas e pagamentos</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Download className="h-4 w-4" />
                    Exportar
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    title="Receitas"
                    value={`R$ ${totalRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                    color="green"
                />
                <StatCard
                    title="Despesas"
                    value={`R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={<TrendingDown className="h-5 w-5 text-red-600" />}
                    color="red"
                />
                <StatCard
                    title="Pagamentos Pendentes"
                    value={`R$ ${totalPendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={<Clock className="h-5 w-5 text-orange-600" />}
                    color="orange"
                />
                <StatCard
                    title="Balanço"
                    value={`R$ ${netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={<DollarSign className={`h-5 w-5 ${netBalance >= 0 ? "text-blue-600" : "text-red-600"}`} />}
                    color={netBalance >= 0 ? "blue" : "red"}
                />
            </div>

            {/* Charts Dashboard */}
            <FinancialDashboard revenues={revenues} expenses={expenses} />

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        {[
                            { id: 'receitas', label: 'Receitas', icon: <TrendingUp className="w-4 h-4" /> },
                            { id: 'despesas', label: 'Despesas', icon: <TrendingDown className="w-4 h-4" /> },
                            { id: 'pagamentos', label: 'Pagamentos a Profissionais', icon: <DollarSign className="w-4 h-4" /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Receitas Tab */}
                    {activeTab === 'receitas' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900">Receitas</h3>
                                <button
                                    onClick={() => setShowRevenueModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    Nova Receita
                                </button>
                            </div>
                            <RevenuesTable
                                revenues={revenues}
                                patients={patients}
                                onDelete={handleDeleteRevenue}
                            />
                        </div>
                    )}

                    {/* Despesas Tab */}
                    {activeTab === 'despesas' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900">Despesas</h3>
                                <button
                                    onClick={() => { setSelectedExpense(null); setShowExpenseModal(true); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    Nova Despesa
                                </button>
                            </div>
                            <ExpensesTable
                                expenses={expenses}
                                onEdit={(expense) => { setSelectedExpense(expense); setShowExpenseModal(true); }}
                                onDelete={handleDeleteExpense}
                            />
                        </div>
                    )}

                    {/* Pagamentos Tab */}
                    {activeTab === 'pagamentos' && (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gray-100">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Pagamentos a Profissionais (Folha de Pagamento)</h3>
                                    <p className="text-xs text-gray-500">Gerencie a folha de pagamento, repasses e comissões da equipe técnica.</p>
                                </div>
                                <button
                                    onClick={handleGeneratePayroll}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 text-xs font-bold shrink-0"
                                >
                                    <FileText className="h-4 w-4" />
                                    Gerar Folha de Pagamento
                                </button>
                            </div>
                            <PaymentsTable
                                payments={payments}
                                professionals={professionals}
                                onMarkAsPaid={handleMarkPaymentAsPaid}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Expense Modal */}
            {showExpenseModal && (
                <ExpenseModal
                    expense={selectedExpense}
                    unitId={currentUnit}
                    units={units}
                    userId={currentUserId}
                    onSave={async (expenseData) => {
                        try {
                            await expensesApi.create(expenseData);
                            await loadData();
                            setShowExpenseModal(false);
                            toast.success('Despesa salva!');

                            await auditLogsApi.logAction({
                                userName: 'Financeiro',
                                userRole: 'admin',
                                category: 'financial',
                                action: 'Nova Despesa Lançada',
                                details: `Cadastrou despesa no valor de R$ ${expenseData.amount.toFixed(2)} (${expenseData.description}).`
                            });
                        } catch (error) {
                            console.error('Error saving expense:', error);
                            toast.error('Erro ao salvar despesa');
                        }
                    }}
                    onCancel={() => setShowExpenseModal(false)}
                />
            )}

            {/* Revenue Modal */}
            {showRevenueModal && (
                <RevenueModal
                    unitId={currentUnit}
                    units={units}
                    userId={currentUserId}
                    patients={patients}
                    onSave={async (revenueData) => {
                        try {
                            await revenuesApi.create(revenueData);
                            await loadData();
                            setShowRevenueModal(false);
                            toast.success('Receita salva!');

                            await auditLogsApi.logAction({
                                userName: 'Financeiro',
                                userRole: 'admin',
                                category: 'financial',
                                action: 'Nova Receita Entrante Lançada',
                                details: `Cadastrou recebimento no valor de R$ ${revenueData.amount.toFixed(2)} (${revenueData.description}).`
                            });
                        } catch (error) {
                            console.error('Error saving revenue:', error);
                            toast.error('Erro ao salvar receita');
                        }
                    }}
                    onCancel={() => setShowRevenueModal(false)}
                />
            )}

            {/* Payment Modal */}
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
        </div>
    );
};

// ============================================
// Helper Components
// ============================================

const StatCard = ({ title, value, icon, color }: any) => {
    const bgColors: any = {
        blue: 'bg-blue-50',
        green: 'bg-green-50',
        red: 'bg-red-50',
        orange: 'bg-orange-50',
    };

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className={`p-2 rounded-lg ${bgColors[color]} w-fit mb-3`}>
                {icon}
            </div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        'pending': 'bg-orange-100 text-orange-700',
        'paid': 'bg-green-100 text-green-700',
        'cancelled': 'bg-red-100 text-red-700',
    };
    const labels: any = {
        'pending': 'Pendente',
        'paid': 'Pago',
        'cancelled': 'Cancelado',
    };
    return (
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${styles[status]}`}>
            {labels[status]}
        </span>
    );
};

// Revenues Table
const RevenuesTable = ({ revenues, patients, onDelete }: { revenues: Revenue[], patients: Patient[], onDelete: (id: string) => void }) => {
    const categoryLabels: any = {
        'patient_plan': 'Plano de Paciente',
        'session': 'Sessão Avulsa',
        'other': 'Outros'
    };

    if (revenues.length === 0) {
        return <div className="text-center py-12 text-gray-400">Nenhuma receita cadastrada</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full relative">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50">Descrição</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50">Categoria</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50">Paciente</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase bg-gray-50">Valor</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase bg-gray-50">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {revenues.map(revenue => {
                        const patient = patients.find(p => p.id === revenue.patientId);
                        return (
                            <tr key={revenue.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {new Date(revenue.revenueDate).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900">{revenue.description}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{categoryLabels[revenue.category]}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{patient?.name || '-'}</td>
                                <td className="px-6 py-4 text-right font-semibold text-green-600">
                                    R$ {revenue.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button onClick={() => onDelete(revenue.id)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// Expenses Table
const ExpensesTable = ({ expenses, onEdit, onDelete }: { expenses: Expense[], onEdit: (e: Expense) => void, onDelete: (id: string) => void }) => {
    const categoryLabels: any = {
        'rent': 'Aluguel',
        'utilities': 'Utilidades',
        'supplies': 'Materiais',
        'maintenance': 'Manutenção',
        'salaries': 'Salários',
        'marketing': 'Marketing',
        'other': 'Outros'
    };

    if (expenses.length === 0) {
        return <div className="text-center py-12 text-gray-400">Nenhuma despesa cadastrada</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full relative">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50">Descrição</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50">Categoria</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase bg-gray-50">Valor</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase bg-gray-50">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase bg-gray-50">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {expenses.map(expense => (
                        <tr key={expense.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-600">
                                {new Date(expense.expenseDate).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900">{expense.description}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{categoryLabels[expense.category]}</td>
                            <td className="px-6 py-4 text-right font-semibold text-red-600">
                                R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${expense.paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {expense.paid ? 'Pago' : 'Pendente'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center flex justify-center gap-2">
                                <button onClick={() => onDelete(expense.id)} className="text-red-500 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Payments Table
const PaymentsTable = ({ payments, professionals, onMarkAsPaid }: { payments: Payment[], professionals: Professional[], onMarkAsPaid: (p: Payment) => void }) => {
    if (payments.length === 0) {
        return <div className="text-center py-12 text-gray-400">Nenhum pagamento registrado</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full relative">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50">Profissional</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50">Período</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase bg-gray-50">Sessões</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase bg-gray-50">Total</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase bg-gray-50">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase bg-gray-50">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {payments.map(payment => {
                        const professional = professionals.find(p => p.id === payment.professionalId);
                        return (
                            <tr key={payment.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{professional?.name || 'N/A'}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {new Date(payment.periodStart).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {new Date(payment.periodEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                </td>
                                <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">{payment.totalSessions}</td>
                                <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                    R$ {payment.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <StatusBadge status={payment.status} />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {payment.status === 'pending' && (
                                        <button
                                            onClick={() => onMarkAsPaid(payment)}
                                            className="text-sm px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium"
                                        >
                                            Pagar
                                        </button>
                                    )}
                                    {payment.status === 'paid' && (
                                        <span className="text-sm text-gray-400">
                                            {new Date(payment.paidAt!).toLocaleDateString('pt-BR')}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// Expense Modal
const ExpenseModal = ({ expense, unitId, units, userId, onSave, onCancel }: { expense: Expense | null, unitId: string, units: any[], userId: string, onSave: (e: CreateExpense) => void, onCancel: () => void }) => {
    const [formData, setFormData] = useState({
        category: expense?.category || 'other',
        description: expense?.description || '',
        amount: expense?.amount || 0,
        expenseDate: expense?.expenseDate || new Date().toISOString().split('T')[0],
        unitId: unitId === 'ALL' ? (expense?.unitId || units[0]?.id) : unitId
    });

    const categoryLabels: Record<string, string> = {
        rent: 'Aluguel & Imóvel',
        utilities: 'Utilidades (Água/Luz/Internet)',
        supplies: 'Materiais e Insumos',
        maintenance: 'Manutenção & Equipamentos',
        salaries: 'Salários & Comissões',
        marketing: 'Marketing & Publicidade',
        other: 'Outras Despesas'
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-red-600" />
                            {expense ? 'Editar Despesa' : 'Lançar Nova Despesa'}
                        </h3>
                        <p className="text-xs text-gray-500">Cadastre saídas e contas a pagar da clínica</p>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-white transition-all cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); onSave({ ...formData, unitId: formData.unitId || unitId, createdBy: userId }); }} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {unitId === 'ALL' && (
                            <div>
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Unidade Clínica</label>
                                <select
                                    value={formData.unitId}
                                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                                >
                                    {units.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Categoria da Despesa</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                            >
                                {Object.entries(categoryLabels).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Valor (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={formData.amount || ''}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                                placeholder="0,00"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Data de Lançamento</label>
                            <input
                                type="date"
                                required
                                value={formData.expenseDate}
                                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Descrição da Despesa</label>
                            <input
                                type="text"
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                                placeholder="Ex: Pagamento conta de energia referente ao mês 08"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <Save className="w-4 h-4" />
                            Salvar Despesa
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Revenue Modal
const RevenueModal = ({ unitId, units, userId, patients, onSave, onCancel }: { unitId: string, units: any[], userId: string, patients: Patient[], onSave: (r: CreateRevenue) => void, onCancel: () => void }) => {
    const [formData, setFormData] = useState({
        category: 'patient_plan' as 'patient_plan' | 'session' | 'other',
        description: '',
        amount: 0,
        revenueDate: new Date().toISOString().split('T')[0],
        patientId: '',
        paymentMethod: 'pix' as 'pix' | 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer',
        unitId: unitId === 'ALL' ? units[0]?.id : unitId
    });

    const paymentMethods = [
        { value: 'pix', label: '⚡ PIX', color: 'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100' },
        { value: 'credit_card', label: '💳 Cartão Crédito', color: 'border-purple-200 bg-purple-50/50 text-purple-700 hover:bg-purple-100' },
        { value: 'debit_card', label: '💳 Cartão Débito', color: 'border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100' },
        { value: 'bank_transfer', label: '🏦 Transferência', color: 'border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100' },
        { value: 'cash', label: '💵 Dinheiro', color: 'border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100' },
        { value: 'other', label: '📜 Cheque / Outros', color: 'border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100' }
    ];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                            Lançar Nova Receita Entrante
                        </h3>
                        <p className="text-xs text-gray-500">Registre recebimentos de planos, sessões avulsas e serviços</p>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-white transition-all cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={(e) => {
                    e.preventDefault();
                    onSave({
                        ...formData,
                        unitId: formData.unitId || unitId,
                        createdBy: userId,
                        patientId: formData.patientId || undefined
                    });
                }} className="p-6 space-y-5">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Categoria da Receita</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                            >
                                <option value="patient_plan">Plano de Paciente / Pacote</option>
                                <option value="session">Sessão Avulsa</option>
                                <option value="other">Outras Receitas</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Paciente Relacionado (opcional)</label>
                            <select
                                value={formData.patientId}
                                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                            >
                                <option value="">Nenhum (Venda Direta / Outros)</option>
                                {patients.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Valor do Recebimento (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={formData.amount || ''}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                                placeholder="0,00"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Data do Recebimento</label>
                            <input
                                type="date"
                                required
                                value={formData.revenueDate}
                                onChange={(e) => setFormData({ ...formData, revenueDate: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Descrição da Receita</label>
                            <input
                                type="text"
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 bg-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                                placeholder="Ex: Pagamento da 1ª parcela do Plano 10 Sessões da paciente Maria"
                            />
                        </div>
                    </div>

                    {/* Forma de Pagamento - Grid de Botões Clicáveis */}
                    <div>
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Forma de Pagamento</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                            {paymentMethods.map(option => {
                                const isSelected = formData.paymentMethod === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, paymentMethod: option.value as any })}
                                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between min-h-[44px] ${isSelected
                                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                            : option.color
                                            }`}
                                    >
                                        <span>{option.label}</span>
                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0 ml-1" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <Save className="w-4 h-4" />
                            Salvar Receita
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Payment Modal
const PaymentModal = ({ payment, professional, onConfirm, onCancel }: { payment: Payment; professional?: Professional; onConfirm: (method: string, notes?: string, paidAt?: string) => void; onCancel: () => void }) => {
    const [method, setMethod] = useState<'pix' | 'bank_transfer' | 'cash' | 'credit_card' | 'debit_card' | 'check'>('pix');
    const [notes, setNotes] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);

    const paymentMethods = [
        { value: 'pix', label: '⚡ PIX', color: 'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100' },
        { value: 'bank_transfer', label: '🏦 Transferência (TED/DOC)', color: 'border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100' },
        { value: 'cash', label: '💵 Dinheiro', color: 'border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100' },
        { value: 'credit_card', label: '💳 Cartão de Crédito', color: 'border-purple-200 bg-purple-50/50 text-purple-700 hover:bg-purple-100' },
        { value: 'debit_card', label: '💳 Cartão de Débito', color: 'border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100' },
        { value: 'check', label: '📜 Cheque', color: 'border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100' }
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

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100">
                {/* Modal Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-600" />
                            Registrar Pagamento de Honorários
                        </h3>
                        <p className="text-xs text-gray-500">Repasse de comissões e acerto de sessões realizadas</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-white rounded-full transition-all cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
                    {/* Summary Info Card - 4 Columns */}
                    <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-blue-50/80 rounded-2xl border border-emerald-100/80 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-white text-emerald-700 font-bold flex items-center justify-center border border-emerald-200 text-base shadow-xs shrink-0">
                                {professional?.name?.charAt(0) || 'P'}
                            </div>
                            <div>
                                <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Profissional</p>
                                <h4 className="text-sm font-bold text-gray-900">{professional?.name || 'Profissional'}</h4>
                                <span className="text-[11px] text-gray-500 font-medium">{payment.totalSessions} sessões acumuladas</span>
                            </div>
                        </div>

                        <div className="text-left sm:text-center border-t sm:border-t-0 sm:border-l border-emerald-100/80 pt-2 sm:pt-0 sm:pl-4">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Período de Apuração</p>
                            <p className="text-xs font-semibold text-gray-800 mt-0.5">
                                {new Date(payment.periodStart).toLocaleDateString('pt-BR')} à {new Date(payment.periodEnd).toLocaleDateString('pt-BR')}
                            </p>
                        </div>

                        <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-emerald-100/80 pt-2 sm:pt-0 sm:pl-4">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Valor Total Liquidação</p>
                            <p className="text-2xl font-black text-emerald-600">
                                R$ {payment.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* Payment Method Selector - 4 COLUMNS GRID */}
                    <div>
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Forma de Pagamento</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                            {paymentMethods.map(option => {
                                const isSelected = method === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setMethod(option.value as any)}
                                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between min-h-[48px] ${isSelected
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                            : option.color
                                            }`}
                                    >
                                        <span className="leading-tight">{option.label}</span>
                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0 ml-1" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Date of Payment */}
                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Data da Efetivação</label>
                            <input
                                type="date"
                                required
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                            />
                        </div>

                        {/* Optional Notes */}
                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Nº do Comprovante / Notas (opcional)</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                                placeholder="Ex: PIX TxID 982371982 ou Nº do Cheque"
                            />
                        </div>
                    </div>

                    {/* Buttons */}
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
                            {submitting ? 'Confirmando...' : 'Confirmar Pagamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Financial;
