import React, { useState, useEffect } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { DollarSign, Calendar, CheckCircle2, Clock, Download, Filter, Plus, TrendingUp, TrendingDown, X, Save, Trash2 } from 'lucide-react';
import { UnitId, Professional, Patient } from '../types';
import type { Payment, Expense, Revenue, CreateExpense, CreateRevenue } from '../src/types/financial';
import { paymentsApi, expensesApi, revenuesApi } from '../src/services/financial-api';
import { professionalsApi, patientsApi } from '../src/services/api';
import toast from 'react-hot-toast';

interface FinancialProps {
    currentUnit: UnitId;
    currentUserId: string;
}

type TabType = 'receitas' | 'despesas' | 'pagamentos';
type PeriodFilter = 'week' | 'month' | 'all';

const Financial: React.FC<FinancialProps> = ({ currentUnit, currentUserId }) => {
    const [activeTab, setActiveTab] = useState<TabType>('receitas');
    const [payments, setPayments] = useState<Payment[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [revenues, setRevenues] = useState<Revenue[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
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
            const [paymentsData, expensesData, revenuesData, professionalsData, patientsData] = await Promise.all([
                paymentsApi.getAll(),
                expensesApi.getAll(currentUnit),
                revenuesApi.getAll({ unitId: currentUnit }),
                professionalsApi.getAll(),
                patientsApi.getAll()
            ]);
            setPayments(paymentsData);
            setExpenses(expensesData);
            setRevenues(revenuesData);
            setProfessionals(professionalsData);
            setPatients(patientsData);
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

    const confirmPayment = async (paymentMethod: 'cash' | 'bank_transfer' | 'pix' | 'check', notes?: string) => {
        if (!selectedPayment) return;
        try {
            await paymentsApi.markAsPaid(selectedPayment.id, {
                paymentMethod,
                paidBy: currentUserId,
                notes
            });
            await loadData();
            setShowPaymentModal(false);
            setSelectedPayment(null);
            toast.success('Pagamento registrado!');
        } catch (error) {
            console.error('Error marking payment as paid:', error);
            toast.error('Erro ao registrar pagamento');
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
                    icon={<DollarSign className="h-5 w-5 text-blue-600" />}
                    color={netBalance >= 0 ? "blue" : "red"}
                />
            </div>

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
                            <h3 className="text-lg font-semibold text-gray-900">Pagamentos a Profissionais</h3>
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
                    userId={currentUserId}
                    onSave={async (expenseData) => {
                        try {
                            await expensesApi.create(expenseData);
                            await loadData();
                            setShowExpenseModal(false);
                            toast.success('Despesa salva!');
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
                    userId={currentUserId}
                    patients={patients}
                    onSave={async (revenueData) => {
                        try {
                            await revenuesApi.create(revenueData);
                            await loadData();
                            setShowRevenueModal(false);
                            toast.success('Receita salva!');
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
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Descrição</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Categoria</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Paciente</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Valor</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
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
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Descrição</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Categoria</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Valor</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
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
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Profissional</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Período</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Sessões</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ação</th>
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
const ExpenseModal = ({ expense, unitId, userId, onSave, onCancel }: { expense: Expense | null, unitId: string, userId: string, onSave: (e: CreateExpense) => void, onCancel: () => void }) => {
    const [formData, setFormData] = useState({
        category: expense?.category || 'other',
        description: expense?.description || '',
        amount: expense?.amount || 0,
        expenseDate: expense?.expenseDate || new Date().toISOString().split('T')[0]
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{expense ? 'Editar Despesa' : 'Nova Despesa'}</h3>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Categoria</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="rent">Aluguel</option>
                            <option value="utilities">Utilidades</option>
                            <option value="supplies">Materiais</option>
                            <option value="maintenance">Manutenção</option>
                            <option value="salaries">Salários</option>
                            <option value="marketing">Marketing</option>
                            <option value="other">Outros</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Descrição</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Descrição da despesa"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Valor (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Data</label>
                        <input
                            type="date"
                            value={formData.expenseDate}
                            onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSave({ ...formData, unitId, createdBy: userId })}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

// Revenue Modal
const RevenueModal = ({ unitId, userId, patients, onSave, onCancel }: { unitId: string, userId: string, patients: Patient[], onSave: (r: CreateRevenue) => void, onCancel: () => void }) => {
    const [formData, setFormData] = useState({
        category: 'other' as 'patient_plan' | 'session' | 'other',
        description: '',
        amount: 0,
        revenueDate: new Date().toISOString().split('T')[0],
        patientId: '',
        paymentMethod: 'pix' as 'pix' | 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer'
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Nova Receita</h3>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Categoria</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="patient_plan">Plano de Paciente</option>
                            <option value="session">Sessão Avulsa</option>
                            <option value="other">Outros</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Paciente (opcional)</label>
                        <select
                            value={formData.patientId}
                            onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Nenhum</option>
                            {patients.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Descrição</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Descrição da receita"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Valor (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Forma de Pagamento</label>
                        <select
                            value={formData.paymentMethod}
                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="pix">PIX</option>
                            <option value="cash">Dinheiro</option>
                            <option value="credit_card">Cartão de Crédito</option>
                            <option value="debit_card">Cartão de Débito</option>
                            <option value="bank_transfer">Transferência</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Data</label>
                        <input
                            type="date"
                            value={formData.revenueDate}
                            onChange={(e) => setFormData({ ...formData, revenueDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSave({
                            ...formData,
                            unitId,
                            createdBy: userId,
                            patientId: formData.patientId || undefined
                        })}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

// Payment Modal
const PaymentModal = ({ payment, professional, onConfirm, onCancel }: any) => {
    const [method, setMethod] = useState<'cash' | 'bank_transfer' | 'pix' | 'check'>('pix');
    const [notes, setNotes] = useState('');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Registrar Pagamento</h3>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Profissional</label>
                        <p className="text-gray-900 font-semibold">{professional?.name}</p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700">Período</label>
                        <p className="text-gray-600">
                            {new Date(payment.periodStart).toLocaleDateString('pt-BR')} - {new Date(payment.periodEnd).toLocaleDateString('pt-BR')}
                        </p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700">Valor</label>
                        <p className="text-2xl font-bold text-gray-900">
                            R$ {payment.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Forma de Pagamento</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: 'pix', label: 'PIX' },
                                { value: 'bank_transfer', label: 'Transferência' },
                                { value: 'cash', label: 'Dinheiro' },
                                { value: 'check', label: 'Cheque' }
                            ].map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setMethod(option.value as any)}
                                    className={`px-4 py-2 rounded-lg border transition-colors ${method === option.value
                                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Observações (opcional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Adicionar notas..."
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(method, notes)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                        Confirmar Pagamento
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Financial;
