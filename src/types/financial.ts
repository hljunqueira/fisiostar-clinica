// Financial Module Types

export interface Payment {
    id: string;
    professionalId: string;
    periodStart: string; // YYYY-MM-DD
    periodEnd: string; // YYYY-MM-DD
    totalSessions: number;
    amountPerSession: number;
    totalAmount: number;
    status: 'pending' | 'paid' | 'cancelled';
    paidAt?: string;
    paidBy?: string;
    paymentMethod?: 'cash' | 'bank_transfer' | 'pix' | 'check';
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePayment {
    professionalId: string;
    periodStart: string;
    periodEnd: string;
    totalSessions: number;
    amountPerSession: number;
    totalAmount: number;
}

export interface MarkAsPaidData {
    paymentMethod: 'cash' | 'bank_transfer' | 'pix' | 'check';
    paidBy: string; // system_user id
    notes?: string;
}

export interface Expense {
    id: string;
    unitId: string;
    category: 'rent' | 'utilities' | 'supplies' | 'maintenance' | 'salaries' | 'marketing' | 'other';
    description: string;
    amount: number;
    expenseDate: string; // YYYY-MM-DD
    paid: boolean;
    paidAt?: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateExpense {
    unitId: string;
    category: Expense['category'];
    description: string;
    amount: number;
    expenseDate: string;
    createdBy?: string;
}

export interface PaymentFilters {
    professionalId?: string;
    periodStart?: string;
    periodEnd?: string;
    status?: Payment['status'];
}

// Revenue Types (Patient plan payments and other income)
export type RevenueCategory = 'patient_plan' | 'session' | 'other';
export type PaymentMethodRevenue = 'pix' | 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer';

export interface Revenue {
    id: string;
    unitId: string;
    patientId?: string;
    patientPlanId?: string;
    category: RevenueCategory;
    description: string;
    amount: number;
    revenueDate: string; // YYYY-MM-DD
    paymentMethod?: PaymentMethodRevenue;
    received: boolean;
    receivedAt?: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateRevenue {
    unitId: string;
    patientId?: string;
    patientPlanId?: string;
    category: RevenueCategory;
    description: string;
    amount: number;
    revenueDate: string;
    paymentMethod?: PaymentMethodRevenue;
    createdBy?: string;
}

export interface RevenueFilters {
    unitId?: string;
    patientId?: string;
    category?: RevenueCategory;
    startDate?: string;
    endDate?: string;
    received?: boolean;
}

