import { supabase } from '../lib/supabase';
import type { Payment, CreatePayment, MarkAsPaidData, Expense, CreateExpense, PaymentFilters, Revenue, CreateRevenue, RevenueFilters } from '../types/financial';

// =====================================================
// PAYMENTS API
// =====================================================

export const paymentsApi = {
    /**
     * Get all payments with optional filters
     */
    async getAll(filters?: PaymentFilters): Promise<Payment[]> {
        let query = supabase
            .from('payments')
            .select('*')
            .order('period_start', { ascending: false });

        if (filters?.professionalId) {
            query = query.eq('professional_id', filters.professionalId);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.periodStart) {
            query = query.gte('period_start', filters.periodStart);
        }
        if (filters?.periodEnd) {
            query = query.lte('period_end', filters.periodEnd);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map(p => ({
            id: p.id,
            professionalId: p.professional_id,
            periodStart: p.period_start,
            periodEnd: p.period_end,
            totalSessions: p.total_sessions,
            amountPerSession: p.amount_per_session,
            totalAmount: p.total_amount,
            status: p.status,
            paidAt: p.paid_at,
            paidBy: p.paid_by,
            paymentMethod: p.payment_method,
            notes: p.notes,
            createdAt: p.created_at,
            updatedAt: p.updated_at
        }));
    },

    /**
     * Create a new payment record
     */
    async create(payment: CreatePayment): Promise<Payment> {
        const { data, error } = await supabase
            .from('payments')
            .insert({
                professional_id: payment.professionalId,
                period_start: payment.periodStart,
                period_end: payment.periodEnd,
                total_sessions: payment.totalSessions,
                amount_per_session: payment.amountPerSession,
                total_amount: payment.totalAmount,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            professionalId: data.professional_id,
            periodStart: data.period_start,
            periodEnd: data.period_end,
            totalSessions: data.total_sessions,
            amountPerSession: data.amount_per_session,
            totalAmount: data.total_amount,
            status: data.status,
            paidAt: data.paid_at,
            paidBy: data.paid_by,
            paymentMethod: data.payment_method,
            notes: data.notes,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    /**
     * Mark a payment as paid
     */
    async markAsPaid(id: string, paidData: MarkAsPaidData): Promise<Payment> {
        const { data, error } = await supabase
            .from('payments')
            .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
                paid_by: paidData.paidBy,
                payment_method: paidData.paymentMethod,
                notes: paidData.notes
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            professionalId: data.professional_id,
            periodStart: data.period_start,
            periodEnd: data.period_end,
            totalSessions: data.total_sessions,
            amountPerSession: data.amount_per_session,
            totalAmount: data.total_amount,
            status: data.status,
            paidAt: data.paid_at,
            paidBy: data.paid_by,
            paymentMethod: data.payment_method,
            notes: data.notes,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    /**
     * Cancel a payment
     */
    async cancel(id: string): Promise<Payment> {
        const { data, error } = await supabase
            .from('payments')
            .update({ status: 'cancelled' })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            professionalId: data.professional_id,
            periodStart: data.period_start,
            periodEnd: data.period_end,
            totalSessions: data.total_sessions,
            amountPerSession: data.amount_per_session,
            totalAmount: data.total_amount,
            status: data.status,
            paidAt: data.paid_at,
            paidBy: data.paid_by,
            paymentMethod: data.payment_method,
            notes: data.notes,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    /**
     * Get payment by ID
     */
    async getById(id: string): Promise<Payment> {
        const payments = await this.getAll();
        const payment = payments.find(p => p.id === id);
        if (!payment) throw new Error('Payment not found');
        return payment;
    }
};

// =====================================================
// EXPENSES API
// =====================================================

export const expensesApi = {
    /**
     * Get all expenses for a unit
     */
    async getAll(unitId?: string): Promise<Expense[]> {
        let query = supabase
            .from('expenses')
            .select('*')
            .order('expense_date', { ascending: false });

        if (unitId && unitId !== 'ALL') {
            query = query.eq('unit_id', unitId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return data.map(e => ({
            id: e.id,
            unitId: e.unit_id,
            category: e.category,
            description: e.description,
            amount: e.amount,
            expenseDate: e.expense_date,
            paid: e.paid,
            paidAt: e.paid_at,
            createdBy: e.created_by,
            createdAt: e.created_at,
            updatedAt: e.updated_at
        }));
    },

    /**
     * Create a new expense
     */
    async create(expense: CreateExpense): Promise<Expense> {
        const { data, error } = await supabase
            .from('expenses')
            .insert({
                unit_id: expense.unitId,
                category: expense.category,
                description: expense.description,
                amount: expense.amount,
                expense_date: expense.expenseDate,
                created_by: expense.createdBy
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            unitId: data.unit_id,
            category: data.category,
            description: data.description,
            amount: data.amount,
            expenseDate: data.expense_date,
            paid: data.paid,
            paidAt: data.paid_at,
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    /**
     * Update an expense
     */
    async update(id: string, updates: Partial<CreateExpense>): Promise<Expense> {
        const { data, error } = await supabase
            .from('expenses')
            .update({
                category: updates.category,
                description: updates.description,
                amount: updates.amount,
                expense_date: updates.expenseDate
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            unitId: data.unit_id,
            category: data.category,
            description: data.description,
            amount: data.amount,
            expenseDate: data.expense_date,
            paid: data.paid,
            paidAt: data.paid_at,
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    /**
     * Mark expense as paid
     */
    async markAsPaid(id: string): Promise<Expense> {
        const { data, error } = await supabase
            .from('expenses')
            .update({
                paid: true,
                paid_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            unitId: data.unit_id,
            category: data.category,
            description: data.description,
            amount: data.amount,
            expenseDate: data.expense_date,
            paid: data.paid,
            paidAt: data.paid_at,
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    /**
     * Delete an expense
     */
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// =====================================================
// REVENUES API
// =====================================================

export const revenuesApi = {
    /**
     * Get all revenues with optional filters
     */
    async getAll(filters?: RevenueFilters): Promise<Revenue[]> {
        let query = supabase
            .from('revenues')
            .select('*')
            .order('date', { ascending: false });

        if (filters?.unitId) {
            query = query.eq('unit_id', filters.unitId);
        }
        if (filters?.patientId) {
            query = query.eq('patient_id', filters.patientId);
        }
        if (filters?.category) {
            query = query.eq('category', filters.category);
        }
        if (filters?.startDate) {
            query = query.gte('date', filters.startDate);
        }
        if (filters?.endDate) {
            query = query.lte('date', filters.endDate);
        }
        if (filters?.received !== undefined) {
            query = query.eq('received', filters.received);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map(r => ({
            id: r.id,
            unitId: r.unit_id,
            patientId: r.patient_id,
            patientPlanId: r.patient_plan_id,
            category: r.category,
            description: r.description,
            amount: r.amount,
            revenueDate: r.date,
            paymentMethod: r.payment_method,
            received: r.received,
            receivedAt: r.received_at,
            createdBy: r.created_by,
            createdAt: r.created_at,
            updatedAt: r.updated_at
        }));
    },

    /**
     * Create a new revenue record
     */
    async create(revenue: CreateRevenue): Promise<Revenue> {
        const { data, error } = await supabase
            .from('revenues')
            .insert({
                unit_id: revenue.unitId,
                patient_id: revenue.patientId,
                patient_plan_id: revenue.patientPlanId,
                category: revenue.category,
                description: revenue.description,
                amount: revenue.amount,
                date: revenue.revenueDate,
                payment_method: revenue.paymentMethod,
                created_by: revenue.createdBy
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            unitId: data.unit_id,
            patientId: data.patient_id,
            patientPlanId: data.patient_plan_id,
            category: data.category,
            description: data.description,
            amount: data.amount,
            revenueDate: data.date,
            paymentMethod: data.payment_method,
            received: data.received,
            receivedAt: data.received_at,
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    /**
     * Mark revenue as received
     */
    async markAsReceived(id: string): Promise<Revenue> {
        const { data, error } = await supabase
            .from('revenues')
            .update({
                received: true,
                received_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            unitId: data.unit_id,
            patientId: data.patient_id,
            patientPlanId: data.patient_plan_id,
            category: data.category,
            description: data.description,
            amount: data.amount,
            revenueDate: data.date,
            paymentMethod: data.payment_method,
            received: data.received,
            receivedAt: data.received_at,
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    /**
     * Delete a revenue record
     */
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('revenues')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

