import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { Expense, Revenue } from '../src/types/financial';

interface FinancialDashboardProps {
    revenues: Revenue[];
    expenses: Expense[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ revenues, expenses }) => {

    // 1. Prepare Data for Monthly Evolution (Last 6 months)
    const getMonthlyData = () => {
        const today = new Date();
        const data = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = date.toLocaleString('default', { month: 'short' });

            // Filter for this month
            const monthRevenues = revenues.filter(r => {
                const rDate = new Date(r.revenueDate);
                return rDate.getMonth() === date.getMonth() && rDate.getFullYear() === date.getFullYear();
            }).reduce((acc, curr) => acc + curr.amount, 0);

            const monthExpenses = expenses.filter(e => {
                const eDate = new Date(e.expenseDate);
                return eDate.getMonth() === date.getMonth() && eDate.getFullYear() === date.getFullYear();
            }).reduce((acc, curr) => acc + curr.amount, 0);

            data.push({
                name: key,
                Receitas: monthRevenues,
                Despesas: monthExpenses
            });
        }
        return data;
    };

    // 2. Prepare Data for Category Distribution (Pie Chart)
    const getCategoryData = () => {
        const categories: Record<string, number> = {};
        revenues.forEach(r => {
            const cat = r.category === 'patient_plan' ? 'Planos' :
                r.category === 'session' ? 'Sessões' : 'Outros';
            categories[cat] = (categories[cat] || 0) + r.amount;
        });

        return Object.entries(categories).map(([name, value]) => ({ name, value }));
    };

    const monthlyData = getMonthlyData();
    const categoryData = getCategoryData();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-fade-in">
            {/* Monthly Evolution Chart */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm h-[400px]">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Evolução Financeira</h3>
                <ResponsiveContainer width="100%" height="90%">
                    <BarChart
                        data={monthlyData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" strokeOpacity={0.1} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF' }} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value / 1000}k`} tick={{ fill: '#9CA3AF' }} />
                        <RechartsTooltip
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1F2937', color: '#fff' }}
                        />
                        <Legend iconType="circle" />
                        <Bar dataKey="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        <Bar dataKey="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Revenue Distribution Chart */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm h-[400px]">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Fontes de Receita</h3>
                {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="90%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']}
                            />
                            <Legend layout="vertical" verticalAlign="middle" align="right" />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        Sem dados suficientes
                    </div>
                )}
            </div>
        </div>
    );
};
