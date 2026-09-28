// Financial Module Types

export interface PaymentAuditPackage {
    packageId: string;
    patientId?: string;
    patientName: string;
    packageName: string; // Ex: '10S - 10 Sessões', '8S - 8 Sessões', '4S - 4 Sessões'
    totalSessions: number;
    paymentDate: string;
    price: number;
    paymentMethod: string;
    cardFeeRate: number;
    cardFeeAmount: number;
    netAmountAfterCard: number;
    verified: boolean;
    notes?: string;
}

export interface PaymentAuditSession {
    sessionId: string;
    patientName: string;
    date: string;
    time?: string;
    service: string;
    price: number;
    commissionType: 'percentage' | 'fixed';
    commissionValue: number;
    commissionEarned: number;
    unitId?: string;
    verified: boolean;
    isLateCancellation?: boolean;
    packageSessionNumber?: number;
    packageTotalSessions?: number;
    clinicRetained?: number;
    clinicPercentage?: number;
    paymentMethod?: string; // 'dinheiro' | 'pix' | 'debito' | 'credito' | 'sumup' | string
    cardFeeRate?: number; // % da maquininha
    cardFeeAmount?: number; // Valor R$ da taxa
    netAmountAfterCard?: number; // Valor líquido pós-maquininha
    chargeClinicFee?: boolean; // Se foi cobrada taxa da clínica neste atendimento
    attendedByProfessionalId?: string; // Se atendido por outro profissional
    attendedByProfessionalName?: string;
    transferredToProfessionalId?: string;
    transferredToProfessionalName?: string;
    isTransferred?: boolean;
    isCoveredByPackage?: boolean; // Se esta sessão já faz parte de um pacote pago no mês
    coverageDeduction?: number; // Dedução de 50% quando colega cobriu o atendimento
    coverageCredit?: number; // Crédito de 50% quando o profissional cobriu atendimento de colega
}

export interface Payment {
    id: string;
    professionalId: string;
    unitId?: string;
    periodStart: string; // YYYY-MM-DD
    periodEnd: string; // YYYY-MM-DD
    totalSessions: number;
    amountPerSession: number;
    totalAmount: number;
    baseSalary?: number;
    commissionAmount?: number;
    advancesDeducted?: number;
    clinicFeeDeducted?: number;
    totalCardFees?: number;
    chargeClinicFee?: boolean;
    transferredDeduction?: number;
    totalPackagesAmount?: number;
    totalPackagesCount?: number;
    packageAuditDetails?: PaymentAuditPackage[];
    totalCoverageDeductions?: number;
    totalCoverageCredits?: number;
    netAmount?: number;
    verifiedSessionsCount?: number;
    auditDetails?: PaymentAuditSession[];
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
    unitId?: string;
    periodStart: string;
    periodEnd: string;
    totalSessions: number;
    amountPerSession: number;
    totalAmount: number;
    baseSalary?: number;
    commissionAmount?: number;
    advancesDeducted?: number;
    clinicFeeDeducted?: number;
    totalCardFees?: number;
    chargeClinicFee?: boolean;
    transferredDeduction?: number;
    totalPackagesAmount?: number;
    totalPackagesCount?: number;
    packageAuditDetails?: PaymentAuditPackage[];
    totalCoverageDeductions?: number;
    totalCoverageCredits?: number;
    netAmount?: number;
    verifiedSessionsCount?: number;
    auditDetails?: PaymentAuditSession[];
    notes?: string;
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
    feePercentage?: number;
    netAmount?: number;
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
    feePercentage?: number;
    netAmount?: number;
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

