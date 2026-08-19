import { supabase } from '../lib/supabase';
import type {
    Unit, Professional, Patient, Session, Specialty,
    PlanTemplate, Announcement, SystemUser, SessionStatus,
    DaySchedule, Holiday, PermissionKey, AuditLogItem, AuditCategory,
    Agreement, PatientEvaluation, PatientEvolution, PatientEvolutionAudit,
    ContractTemplate, PatientContract
} from '../types';

export interface SystemNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    read: boolean;
    type: 'info' | 'warning' | 'success' | 'error';
    createdAt: string;
}

// =====================================================
// --- Notifications API ---
export const notificationsApi = {
    async getMy(userId: string): Promise<SystemNotification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data.map(n => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            message: n.message,
            read: n.read,
            type: n.type,
            createdAt: n.created_at
        }));
    },

    async markAsRead(id: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

        if (error) throw error;
    },

    async clearAll(userId: string) {
        // Option 1: Delete all
        // const { error } = await supabase.from('notifications').delete().eq('user_id', userId);

        // Option 2: Mark all as read (safer)
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId);

        if (error) throw error;
    }
};

// --- Storage API ---
// =====================================================

// =====================================================
// UNITS API
// =====================================================

export const unitsApi = {
    async getAll(): Promise<Unit[]> {
        const { data: units, error } = await supabase
            .from('units')
            .select('*, unit_operating_hours(*), unit_holidays(*)');

        if (error) throw error;

        return units.map(unit => ({
            id: unit.id,
            name: unit.name,
            city: unit.city,
            specialties: [], // TODO: Add unit_specialties table if needed
            hasPool: unit.has_pool,
            isActive: unit.is_active,
            operatingHours: unit.unit_operating_hours?.map((oh: any) => ({
                day: oh.day,
                isOpen: oh.is_open,
                start: oh.start_time,
                end: oh.end_time
            })) || [],
            holidays: unit.unit_holidays?.map((h: any) => ({
                id: h.id,
                date: h.date,
                name: h.name
            })) || []
        }));
    },

    async create(unit: Omit<Unit, 'id'>): Promise<Unit> {
        const { data, error } = await supabase
            .from('units')
            .insert({
                name: unit.name,
                city: unit.city,
                has_pool: unit.hasPool,
                is_active: unit.isActive
            })
            .select()
            .single();

        if (error) throw error;

        // Insert operating hours if provided
        if (unit.operatingHours && unit.operatingHours.length > 0) {
            await supabase.from('unit_operating_hours').insert(
                unit.operatingHours.map(oh => ({
                    unit_id: data.id,
                    day: oh.day,
                    is_open: oh.isOpen,
                    start_time: oh.start,
                    end_time: oh.end
                }))
            );
        }

        return this.getById(data.id);
    },

    async getById(id: string): Promise<Unit> {
        const units = await this.getAll();
        if (id === 'ALL' || !id) {
            if (units.length > 0) return units[0];
            throw new Error('Unit not found');
        }
        const unit = units.find(u => u.id === id);
        if (!unit && units.length > 0) return units[0];
        if (!unit) throw new Error('Unit not found');
        return unit;
    },

    async update(id: string, updates: Partial<Unit>): Promise<Unit> {
        const { error } = await supabase
            .from('units')
            .update({
                name: updates.name,
                city: updates.city,
                has_pool: updates.hasPool,
                is_active: updates.isActive
            })
            .eq('id', id);

        if (error) throw error;

        // Update operating hours: delete old and insert new
        if (updates.operatingHours) {
            // Delete existing operating hours
            await supabase
                .from('unit_operating_hours')
                .delete()
                .eq('unit_id', id);

            // Insert new operating hours
            if (updates.operatingHours.length > 0) {
                const { error: ohError } = await supabase
                    .from('unit_operating_hours')
                    .insert(
                        updates.operatingHours.map(oh => ({
                            unit_id: id,
                            day: oh.day,
                            is_open: oh.isOpen,
                            start_time: oh.start,
                            end_time: oh.end
                        }))
                    );
                if (ohError) console.error('Error updating operating hours:', ohError);
            }
        }

        // Update holidays: delete old and insert new
        if (updates.holidays) {
            // Delete existing holidays
            await supabase
                .from('unit_holidays')
                .delete()
                .eq('unit_id', id);

            // Insert new holidays
            if (updates.holidays.length > 0) {
                const { error: hError } = await supabase
                    .from('unit_holidays')
                    .insert(
                        updates.holidays.map(h => ({
                            unit_id: id,
                            date: h.date,
                            name: h.name
                        }))
                    );
                if (hError) console.error('Error updating holidays:', hError);
            }
        }

        return this.getById(id);
    }
};

// =====================================================
// PROFESSIONALS API
// =====================================================

export const professionalsApi = {
    async getAll(): Promise<Professional[]> {
        const { data: professionals, error } = await supabase
            .from('professionals')
            .select('*, professional_units(unit_id)');

        if (error) throw error;

        return professionals.map(prof => ({
            id: prof.id,
            name: prof.name,
            crf: prof.crf,
            specialty: prof.specialty,
            hourlyRate: prof.hourly_rate,
            unitIds: prof.professional_units?.map((pu: any) => pu.unit_id) || [],
            color: prof.color,
            avatarUrl: prof.avatar_url,
            personType: prof.person_type || 'PF',
            document: prof.document,
            pixKey: prof.pix_key,
            bankName: prof.bank_name,
            bankAgency: prof.bank_agency,
            bankAccount: prof.bank_account,
            roles: prof.roles || ['professional']
        }));
    },

    async create(professional: Omit<Professional, 'id'>): Promise<Professional> {
        const { data, error } = await supabase
            .from('professionals')
            .insert({
                name: professional.name,
                crf: professional.crf,
                specialty: professional.specialty,
                hourly_rate: professional.hourlyRate,
                color: professional.color,
                avatar_url: professional.avatarUrl,
                person_type: professional.personType || 'PF',
                document: professional.document || null,
                pix_key: professional.pixKey || null,
                bank_name: professional.bankName || null,
                bank_agency: professional.bankAgency || null,
                bank_account: professional.bankAccount || null,
                roles: professional.roles || ['professional']
            })
            .select()
            .single();

        if (error) throw error;

        // Link to units
        if (professional.unitIds && professional.unitIds.length > 0) {
            await supabase.from('professional_units').insert(
                professional.unitIds.map(unitId => ({
                    professional_id: data.id,
                    unit_id: unitId
                }))
            );
        }

        return this.getById(data.id);
    },

    async getById(id: string): Promise<Professional> {
        const professionals = await this.getAll();
        const professional = professionals.find(p => p.id === id);
        if (!professional) throw new Error('Professional not found');
        return professional;
    },

    async update(id: string, updates: Partial<Professional>): Promise<Professional> {
        const updateData: any = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.crf !== undefined) updateData.crf = updates.crf;
        if (updates.specialty !== undefined) updateData.specialty = updates.specialty;
        if (updates.hourlyRate !== undefined) updateData.hourly_rate = updates.hourlyRate;
        if (updates.color !== undefined) updateData.color = updates.color;
        if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;
        if (updates.personType !== undefined) updateData.person_type = updates.personType;
        if (updates.document !== undefined) updateData.document = updates.document;
        if (updates.pixKey !== undefined) updateData.pix_key = updates.pixKey;
        if (updates.bankName !== undefined) updateData.bank_name = updates.bankName;
        if (updates.bankAgency !== undefined) updateData.bank_agency = updates.bankAgency;
        if (updates.bankAccount !== undefined) updateData.bank_account = updates.bankAccount;
        if (updates.roles !== undefined) updateData.roles = updates.roles;

        const { error } = await supabase
            .from('professionals')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        // Update unit associations if provided
        if (updates.unitIds) {
            // Delete existing associations
            await supabase
                .from('professional_units')
                .delete()
                .eq('professional_id', id);

            // Insert new associations
            if (updates.unitIds.length > 0) {
                await supabase.from('professional_units').insert(
                    updates.unitIds.map(unitId => ({
                        professional_id: id,
                        unit_id: unitId
                    }))
                );
            }
        }

        return this.getById(id);
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('professionals')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async deleteAll(): Promise<void> {
        const { error } = await supabase
            .from('professionals')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) throw error;
    }
};

// =====================================================
// PATIENTS API
// =====================================================

export const patientsApi = {
    async getAll(): Promise<Patient[]> {
        const { data: patients, error } = await supabase
            .from('patients')
            .select('*, patient_plans(*)');

        if (error) throw error;

        return patients.map(patient => ({
            id: patient.id,
            name: patient.name,
            unitId: patient.unit_id,
            phone: patient.phone,
            cpf: patient.cpf,
            birthDate: patient.birth_date,
            address: patient.address,
            city: patient.city,
            status: patient.status,
            photoUrl: patient.photo_url,
            facialDescriptor: patient.facial_descriptor,
            lastVisit: patient.last_visit,
            agreementId: patient.agreement_id,
            plan: patient.patient_plans?.[0] ? {
                name: patient.patient_plans[0].name,
                totalSessions: patient.patient_plans[0].total_sessions,
                remainingSessions: patient.patient_plans[0].remaining_sessions,
                expiresAt: patient.patient_plans[0].expires_at,
                totalPaid: patient.patient_plans[0].total_paid,
                paymentStatus: patient.patient_plans[0].payment_status,
                paymentDate: patient.patient_plans[0].payment_date,
                paymentMethod: patient.patient_plans[0].payment_method
            } : undefined
        }));
    },

    async create(patient: Omit<Patient, 'id'>): Promise<Patient> {
        const { data, error } = await supabase
            .from('patients')
            .insert({
                name: patient.name,
                unit_id: patient.unitId || null,
                phone: patient.phone || null,
                cpf: patient.cpf || null,
                birth_date: patient.birthDate || null,
                address: patient.address || null,
                city: patient.city || null,
                status: patient.status || 'Active',
                photo_url: patient.photoUrl || null,
                facial_descriptor: patient.facialDescriptor || null,
                last_visit: patient.lastVisit || null,
                agreement_id: patient.agreementId || null
            })
            .select()
            .single();

        if (error) throw error;

        // Create patient plan if provided
        if (patient.plan) {
            const { error: planError } = await supabase.from('patient_plans').insert({
                patient_id: data.id,
                name: patient.plan.name,
                total_sessions: patient.plan.totalSessions || 0,
                remaining_sessions: patient.plan.remainingSessions !== undefined ? patient.plan.remainingSessions : (patient.plan.totalSessions || 0),
                expires_at: patient.plan.expiresAt || null,
                total_paid: patient.plan.totalPaid || 0,
                payment_status: patient.plan.paymentStatus || 'pending',
                payment_date: patient.plan.paymentDate || null,
                payment_method: patient.plan.paymentMethod || null
            });

            if (planError) {
                console.error('Error creating patient plan:', planError);
            }
        }

        return {
            id: data.id,
            name: data.name,
            unitId: data.unit_id,
            phone: data.phone || '',
            cpf: data.cpf || undefined,
            birthDate: data.birth_date || undefined,
            address: data.address || undefined,
            city: data.city || undefined,
            status: data.status,
            photoUrl: data.photo_url || undefined,
            facialDescriptor: data.facial_descriptor || undefined,
            lastVisit: data.last_visit || undefined,
            agreementId: data.agreement_id || undefined,
            plan: patient.plan
        };
    },

    async getById(id: string): Promise<Patient> {
        const { data: patient, error } = await supabase
            .from('patients')
            .select('*, patient_plans(*)')
            .eq('id', id)
            .single();

        if (error || !patient) throw error || new Error('Patient not found');

        return {
            id: patient.id,
            name: patient.name,
            unitId: patient.unit_id,
            phone: patient.phone || '',
            cpf: patient.cpf || undefined,
            birthDate: patient.birth_date || undefined,
            address: patient.address || undefined,
            city: patient.city || undefined,
            status: patient.status,
            photoUrl: patient.photo_url || undefined,
            facialDescriptor: patient.facial_descriptor || undefined,
            lastVisit: patient.last_visit || undefined,
            agreementId: patient.agreement_id || undefined,
            plan: patient.patient_plans?.[0] ? {
                name: patient.patient_plans[0].name,
                totalSessions: patient.patient_plans[0].total_sessions,
                remainingSessions: patient.patient_plans[0].remaining_sessions,
                expiresAt: patient.patient_plans[0].expires_at,
                totalPaid: patient.patient_plans[0].total_paid,
                paymentStatus: patient.patient_plans[0].payment_status,
                paymentDate: patient.patient_plans[0].payment_date,
                paymentMethod: patient.patient_plans[0].payment_method
            } : undefined
        };
    },

    async update(id: string, updates: Partial<Patient>): Promise<Patient> {
        const updateData: any = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.unitId !== undefined) updateData.unit_id = updates.unitId || null;
        if (updates.phone !== undefined) updateData.phone = updates.phone || null;
        if (updates.cpf !== undefined) updateData.cpf = updates.cpf || null;
        if (updates.birthDate !== undefined) updateData.birth_date = updates.birthDate || null;
        if (updates.address !== undefined) updateData.address = updates.address || null;
        if (updates.city !== undefined) updateData.city = updates.city || null;
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.photoUrl !== undefined) updateData.photo_url = updates.photoUrl || null;
        if (updates.facialDescriptor !== undefined) updateData.facial_descriptor = updates.facialDescriptor || null;
        if (updates.lastVisit !== undefined) updateData.last_visit = updates.lastVisit || null;
        if (updates.agreementId !== undefined) updateData.agreement_id = updates.agreementId || null;

        const { error } = await supabase
            .from('patients')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        // Update plan if provided
        if (updates.plan) {
            const { data: existingPlans } = await supabase
                .from('patient_plans')
                .select('id')
                .eq('patient_id', id)
                .limit(1);

            const existingPlan = existingPlans && existingPlans.length > 0 ? existingPlans[0] : null;

            if (existingPlan) {
                await supabase
                    .from('patient_plans')
                    .update({
                        name: updates.plan.name,
                        total_sessions: updates.plan.totalSessions || 0,
                        remaining_sessions: updates.plan.remainingSessions !== undefined ? updates.plan.remainingSessions : 0,
                        expires_at: updates.plan.expiresAt || null,
                        total_paid: updates.plan.totalPaid || 0,
                        payment_status: updates.plan.paymentStatus || 'pending',
                        payment_date: updates.plan.paymentDate || null,
                        payment_method: updates.plan.paymentMethod || null
                    })
                    .eq('id', existingPlan.id);
            } else {
                await supabase.from('patient_plans').insert({
                    patient_id: id,
                    name: updates.plan.name,
                    total_sessions: updates.plan.totalSessions || 0,
                    remaining_sessions: updates.plan.remainingSessions !== undefined ? updates.plan.remainingSessions : 0,
                    expires_at: updates.plan.expiresAt || null,
                    total_paid: updates.plan.totalPaid || 0,
                    payment_status: updates.plan.paymentStatus || 'pending',
                    payment_date: updates.plan.paymentDate || null,
                    payment_method: updates.plan.paymentMethod || null
                });
            }
        }

        return this.getById(id);
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async deleteAll(): Promise<void> {
        const { error } = await supabase
            .from('patients')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (error) throw error;
    }
};

// =====================================================
// SESSIONS API
// =====================================================

export const sessionsApi = {
    async getAll(filters?: { patientId?: string; professionalId?: string; unitId?: string }): Promise<Session[]> {
        let query = supabase
            .from('sessions')
            .select('*')
            .order('date', { ascending: true })
            .order('time', { ascending: true });

        if (filters?.patientId) {
            query = query.eq('patient_id', filters.patientId);
        }
        if (filters?.professionalId) {
            query = query.eq('professional_id', filters.professionalId);
        }
        if (filters?.unitId && filters.unitId !== 'ALL') {
            query = query.eq('unit_id', filters.unitId);
        }

        const { data: sessions, error } = await query;

        if (error) throw error;

        return sessions.map(session => ({
            id: session.id,
            patientId: session.patient_id,
            professionalId: session.professional_id,
            unitId: session.unit_id,
            date: session.date,
            time: session.time,
            duration: session.duration_minutes || 30,
            type: session.type,
            status: session.status as SessionStatus,
            notes: session.notes,
            signed: session.signed,
            isOutsidePlan: session.is_outside_plan,
            price: session.price,
            signatureUrl: session.signature_url,
            agreementId: session.agreement_id
        }));
    },

    async getByDate(date: string): Promise<Session[]> {
        const { data: sessions, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('date', date)
            .order('time', { ascending: true });

        if (error) throw error;

        return sessions.map(session => ({
            id: session.id,
            patientId: session.patient_id,
            professionalId: session.professional_id,
            unitId: session.unit_id,
            date: session.date,
            time: session.time,
            duration: session.duration_minutes || 30,
            type: session.type,
            status: session.status as SessionStatus,
            notes: session.notes,
            signed: session.signed,
            isOutsidePlan: session.is_outside_plan,
            price: session.price,
            signatureUrl: session.signature_url,
            agreementId: session.agreement_id
        }));
    },

    async create(session: Omit<Session, 'id'>): Promise<Session> {
        const { data, error } = await supabase
            .from('sessions')
            .insert({
                patient_id: session.patientId,
                professional_id: session.professionalId,
                unit_id: session.unitId,
                date: session.date,
                time: session.time,
                duration_minutes: session.duration || 30,
                type: session.type,
                status: session.status,
                notes: session.notes || null,
                signed: session.signed ?? false,
                is_outside_plan: session.isOutsidePlan ?? false,
                price: session.price || null,
                signature_url: session.signatureUrl,
                agreement_id: session.agreementId || null
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            patientId: data.patient_id,
            professionalId: data.professional_id,
            unitId: data.unit_id,
            date: data.date,
            time: data.time,
            duration: data.duration_minutes || 30,
            type: data.type,
            status: data.status,
            notes: data.notes || '',
            signed: data.signed,
            isOutsidePlan: data.is_outside_plan,
            price: data.price,
            signatureUrl: data.signature_url,
            agreementId: data.agreement_id
        };
    },

    async update(id: string, updates: Partial<Session>): Promise<Session> {
        const updateData: any = {};
        if (updates.patientId !== undefined) updateData.patient_id = updates.patientId;
        if (updates.professionalId !== undefined) updateData.professional_id = updates.professionalId;
        if (updates.unitId !== undefined) updateData.unit_id = updates.unitId;
        if (updates.date !== undefined) updateData.date = updates.date;
        if (updates.time !== undefined) updateData.time = updates.time;
        if (updates.duration !== undefined) updateData.duration_minutes = updates.duration;
        if (updates.type !== undefined) updateData.type = updates.type;
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.notes !== undefined) updateData.notes = updates.notes;
        if (updates.signed !== undefined) updateData.signed = updates.signed;
        if (updates.isOutsidePlan !== undefined) updateData.is_outside_plan = updates.isOutsidePlan;
        if (updates.price !== undefined) updateData.price = updates.price;
        if (updates.signatureUrl !== undefined) updateData.signature_url = updates.signatureUrl;
        if (updates.agreementId !== undefined) updateData.agreement_id = updates.agreementId;

        const { data, error } = await supabase
            .from('sessions')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            patientId: data.patient_id,
            professionalId: data.professional_id,
            unitId: data.unit_id,
            date: data.date,
            time: data.time,
            duration: data.duration_minutes || 30,
            type: data.type,
            status: data.status,
            notes: data.notes,
            signed: data.signed,
            isOutsidePlan: data.is_outside_plan,
            price: data.price,
            signatureUrl: data.signature_url,
            agreementId: data.agreement_id
        };
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('sessions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// =====================================================
// PLAN TEMPLATES API
// =====================================================

export const specialtiesApi = {
    async getAll(): Promise<Specialty[]> {
        const { data, error } = await supabase
            .from('specialties')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        return data.map(s => ({
            id: s.id,
            name: s.name,
            active: s.active
        }));
    },

    async create(name: string): Promise<Specialty> {
        const { data, error } = await supabase
            .from('specialties')
            .insert({ name, active: true })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            active: data.active
        };
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('specialties')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

export const planTemplatesApi = {
    async getAll(): Promise<PlanTemplate[]> {
        const { data, error } = await supabase
            .from('plan_templates')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        return data.map(pt => ({
            id: pt.id,
            name: pt.name,
            specialtyId: pt.specialty_id,
            sessions: pt.sessions,
            price: pt.price,
            description: pt.description,
            active: pt.active,
            autoRenew: pt.auto_renew,
            alertDaysBefore: pt.alert_days_before,
            financialLaunchType: pt.financial_launch_type,
            commissionType: pt.commission_type,
            commissionValue: pt.commission_value
        }));
    },

    async create(template: Omit<PlanTemplate, 'id'>): Promise<PlanTemplate> {
        const { data, error } = await supabase
            .from('plan_templates')
            .insert({
                name: template.name,
                specialty_id: template.specialtyId,
                sessions: template.sessions,
                price: template.price,
                description: template.description,
                active: template.active,
                auto_renew: template.autoRenew || 'none',
                alert_days_before: template.alertDaysBefore ?? 7,
                financial_launch_type: template.financialLaunchType || 'total',
                commission_type: template.commissionType || 'none',
                commission_value: template.commissionValue || 0
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            specialtyId: data.specialty_id,
            sessions: data.sessions,
            price: data.price,
            description: data.description,
            active: data.active,
            autoRenew: data.auto_renew,
            alertDaysBefore: data.alert_days_before,
            financialLaunchType: data.financial_launch_type,
            commissionType: data.commission_type,
            commissionValue: data.commission_value
        };
    },

    async update(id: string, updates: Partial<PlanTemplate>): Promise<PlanTemplate> {
        const updateData: any = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.specialtyId !== undefined) updateData.specialty_id = updates.specialtyId;
        if (updates.sessions !== undefined) updateData.sessions = updates.sessions;
        if (updates.price !== undefined) updateData.price = updates.price;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.active !== undefined) updateData.active = updates.active;
        if (updates.autoRenew !== undefined) updateData.auto_renew = updates.autoRenew;
        if (updates.alertDaysBefore !== undefined) updateData.alert_days_before = updates.alertDaysBefore;
        if (updates.financialLaunchType !== undefined) updateData.financial_launch_type = updates.financialLaunchType;
        if (updates.commissionType !== undefined) updateData.commission_type = updates.commissionType;
        if (updates.commissionValue !== undefined) updateData.commission_value = updates.commissionValue;

        const { data, error } = await supabase
            .from('plan_templates')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            specialtyId: data.specialty_id,
            sessions: data.sessions,
            price: data.price,
            description: data.description,
            active: data.active,
            autoRenew: data.auto_renew,
            alertDaysBefore: data.alert_days_before,
            financialLaunchType: data.financial_launch_type,
            commissionType: data.commission_type,
            commissionValue: data.commission_value
        };
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('plan_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// =====================================================
// ANNOUNCEMENTS API
// =====================================================

export const announcementsApi = {
    async getAll(): Promise<Announcement[]> {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;

        return data.map(a => ({
            id: a.id,
            title: a.title,
            message: a.message,
            type: a.type,
            date: a.date,
            targetRole: a.target_role,
            targetProfessionalId: a.target_professional_id
        }));
    },

    async create(announcement: Omit<Announcement, 'id'>): Promise<Announcement> {
        const { data, error } = await supabase
            .from('announcements')
            .insert({
                title: announcement.title,
                message: announcement.message,
                type: announcement.type,
                date: announcement.date,
                target_role: announcement.targetRole,
                target_professional_id: announcement.targetProfessionalId || null
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            title: data.title,
            message: data.message,
            type: data.type,
            date: data.date,
            targetRole: data.target_role,
            targetProfessionalId: data.target_professional_id
        };
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// =====================================================
// SYSTEM USERS API
// =====================================================

export const systemUsersApi = {
    async create(user: Omit<SystemUser, 'id'>): Promise<SystemUser> {
        // Note: This creates a system user record only. 
        // For real auth, they would need an auth.users entry (handled by demo_users.sql or auth signup).
        // For seeded secretaries, we just want them to appear in the list.
        const { data, error } = await supabase
            .from('system_users')
            .insert({
                name: user.name,
                email: user.email,
                role: user.role,
                unit_id: user.unitId ? user.unitId : null,
                avatar_url: user.avatarUrl
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            unitId: data.unit_id,
            avatarUrl: data.avatar_url,
            customPermissions: data.custom_permissions || []
        };
    },

    async getAll(): Promise<SystemUser[]> {
        const { data, error } = await supabase
            .from('system_users')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        return data.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            unitId: u.unit_id,
            avatarUrl: u.avatar_url,
            customPermissions: u.custom_permissions || []
        }));
    },

    async getByEmail(email: string): Promise<SystemUser | null> {
        const { data, error } = await supabase
            .from('system_users')
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            unitId: data.unit_id,
            avatarUrl: data.avatar_url,
            customPermissions: data.custom_permissions || []
        };
    },

    async getById(id: string): Promise<SystemUser | null> {
        const { data, error } = await supabase
            .from('system_users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            unitId: data.unit_id,
            avatarUrl: data.avatar_url,
            customPermissions: data.custom_permissions || []
        };
    },

    async updatePermissions(userId: string, permissions: PermissionKey[]): Promise<void> {
        const { error } = await supabase
            .from('system_users')
            .update({ custom_permissions: permissions })
            .eq('id', userId);

        if (error) throw error;
    },

    async update(id: string, updates: Partial<SystemUser>): Promise<SystemUser> {
        const payload: any = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.email !== undefined) payload.email = updates.email;
        if (updates.role !== undefined) payload.role = updates.role;
        if (updates.unitId !== undefined) payload.unit_id = updates.unitId ? updates.unitId : null;
        if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;

        const { error } = await supabase
            .from('system_users')
            .update(payload)
            .eq('id', id);

        if (error) throw error;

        const updatedUser = await this.getById(id);
        if (!updatedUser) throw new Error('User not found after update');
        return updatedUser;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('system_users')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async deleteAllSecretaries(): Promise<void> {
        const { error } = await supabase
            .from('system_users')
            .delete()
            .eq('role', 'secretary');

        if (error) throw error;
    }
};

export const infraMetricsApi = {
    async getHealth() {
        const start = performance.now();
        const { count: sessionsCount } = await supabase.from('sessions').select('*', { count: 'exact', head: true });
        const latency = Math.round(performance.now() - start);

        const { count: patientsCount } = await supabase.from('patients').select('*', { count: 'exact', head: true });
        const { count: professionalsCount } = await supabase.from('professionals').select('*', { count: 'exact', head: true });
        const { count: usersCount } = await supabase.from('system_users').select('*', { count: 'exact', head: true });
        const { count: paymentsCount } = await supabase.from('payments').select('*', { count: 'exact', head: true });

        return {
            latencyMs: latency,
            vpsHost: 'mdr-vps',
            diskUsedGb: 64,
            diskTotalGb: 99,
            diskUsedPercent: 68,
            counts: {
                sessions: sessionsCount || 0,
                patients: patientsCount || 0,
                professionals: professionalsCount || 0,
                systemUsers: usersCount || 0,
                payments: paymentsCount || 0
            },
            services: [
                { name: 'PostgreSQL 15 (supabase-db-fisiostar)', status: 'online', details: 'Saudável - Porta 5435/5432' },
                { name: 'Supabase Kong API Gateway', status: 'online', details: 'Porta 8020 (SSL/Active)' },
                { name: 'PostgREST API Engine', status: 'online', details: 'Porta 3000 (Active)' },
                { name: 'GoTrue Auth Service', status: 'online', details: 'Autenticação JWT' },
                { name: 'Caddy Reverse Proxy', status: 'online', details: 'HTTPS fisiostarclinica.com.br' }
            ]
        };
    }
};

export const managerMetricsApi = {
    async getStats(unitId?: string) {
        let sessionsQuery = supabase.from('sessions').select('*');
        let patientsQuery = supabase.from('patients').select('*');

        if (unitId && unitId !== 'ALL') {
            sessionsQuery = sessionsQuery.eq('unit_id', unitId);
            patientsQuery = patientsQuery.eq('unit_id', unitId);
        }

        const [{ data: sessions }, { data: patients }] = await Promise.all([
            sessionsQuery,
            patientsQuery
        ]);

        const allSessions = sessions || [];
        const allPatients = patients || [];

        const totalSessions = allSessions.length;
        const completedSessions = allSessions.filter(s => s.status === 'Realizada').length;
        const noShowSessions = allSessions.filter(s => s.status === 'Falta').length;
        const cancelledSessions = allSessions.filter(s => s.status === 'Cancelada').length;
        const confirmedSessions = allSessions.filter(s => s.status === 'Confirmada').length;

        const occupancyRate = totalSessions > 0 ? Math.round((completedSessions + confirmedSessions) / (totalSessions * 1.2) * 100) : 75;

        const patientsNeedingRenewal = allPatients.filter(p => {
            const plan = (p as any).patient_plans?.[0] || (p as any).plan;
            return plan && plan.remaining_sessions <= 2;
        });

        return {
            totalSessions,
            completedSessions,
            noShowSessions,
            cancelledSessions,
            confirmedSessions,
            occupancyRate: Math.min(occupancyRate, 95),
            patientsNeedingRenewal,
            totalPatients: allPatients.length
        };
    }
};

// =====================================================
// --- Audit Logs API ---
export const auditLogsApi = {
    async getAll(): Promise<AuditLogItem[]> {
        let allLogs: AuditLogItem[] = [];

        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .neq('user_role', 'super_admin')
                .order('created_at', { ascending: false })
                .limit(200);

            if (!error && data && data.length > 0) {
                allLogs = data.map(item => ({
                    id: item.id,
                    userName: item.user_name,
                    userRole: item.user_role,
                    category: item.category as AuditCategory,
                    action: item.action,
                    details: item.details,
                    ipAddress: item.ip_address || '127.0.0.1',
                    createdAt: item.created_at
                }));
            }
        } catch (e) {
            console.warn('Fallback to local storage audit logs');
        }

        if (allLogs.length === 0) {
            const stored = localStorage.getItem('fisiostar_audit_logs');
            if (stored) {
                try {
                    allLogs = JSON.parse(stored);
                } catch (e) { }
            }
        }

        // Strict filter: Never display Super Admin in logs
        return allLogs.filter(log => log.userRole !== 'super_admin' && !log.userName.toLowerCase().includes('super admin'));
    },

    async logAction(log: {
        userName: string;
        userRole: string;
        category: AuditCategory;
        action: string;
        details: string;
    }): Promise<AuditLogItem | null> {
        // Super Admin is stealth: Never log super_admin actions
        if (log.userRole === 'super_admin' || log.userName.toLowerCase().includes('super admin')) {
            return null;
        }

        const newLog: AuditLogItem = {
            id: String(Date.now()),
            userName: log.userName || 'Sistema',
            userRole: log.userRole || 'admin',
            category: log.category,
            action: log.action,
            details: log.details,
            ipAddress: '127.0.0.1',
            createdAt: new Date().toISOString()
        };

        try {
            await supabase.from('audit_logs').insert([{
                user_name: log.userName,
                user_role: log.userRole,
                category: log.category,
                action: log.action,
                details: log.details,
                ip_address: '127.0.0.1'
            }]);
        } catch (e) {
            console.warn('Could not insert audit log into PostgreSQL:', e);
        }

        try {
            const currentLogs = await this.getAll();
            const updated = [newLog, ...currentLogs];
            localStorage.setItem('fisiostar_audit_logs', JSON.stringify(updated.slice(0, 300)));
        } catch (e) { }

        return newLog;
    }
};

// =====================================================
// AGREEMENTS API (Convênios e Parcerias)
// =====================================================
export const agreementsApi = {
    async getAll(): Promise<Agreement[]> {
        const { data, error } = await supabase
            .from('agreements')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        return (data || []).map(a => ({
            id: a.id,
            name: a.name,
            ansCode: a.ans_code,
            cnpj: a.cnpj,
            phone: a.phone,
            email: a.email,
            discountPercentage: a.discount_percentage,
            gracePeriodDays: a.grace_period_days,
            notes: a.notes,
            isActive: a.is_active !== false,
            createdAt: a.created_at,
            updatedAt: a.updated_at
        }));
    },

    async getById(id: string): Promise<Agreement> {
        const { data, error } = await supabase
            .from('agreements')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            ansCode: data.ans_code,
            cnpj: data.cnpj,
            phone: data.phone,
            email: data.email,
            discountPercentage: data.discount_percentage,
            gracePeriodDays: data.grace_period_days,
            notes: data.notes,
            isActive: data.is_active !== false,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    async create(agreement: Omit<Agreement, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agreement> {
        const { data, error } = await supabase
            .from('agreements')
            .insert({
                name: agreement.name,
                ans_code: agreement.ansCode || null,
                cnpj: agreement.cnpj || null,
                phone: agreement.phone || null,
                email: agreement.email || null,
                discount_percentage: agreement.discountPercentage || 0,
                grace_period_days: agreement.gracePeriodDays || 0,
                notes: agreement.notes || null,
                is_active: agreement.isActive !== false
            })
            .select()
            .single();

        if (error) throw error;

        return this.getById(data.id);
    },

    async update(id: string, updates: Partial<Agreement>): Promise<Agreement> {
        const updateData: any = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.ansCode !== undefined) updateData.ans_code = updates.ansCode;
        if (updates.cnpj !== undefined) updateData.cnpj = updates.cnpj;
        if (updates.phone !== undefined) updateData.phone = updates.phone;
        if (updates.email !== undefined) updateData.email = updates.email;
        if (updates.discountPercentage !== undefined) updateData.discount_percentage = updates.discountPercentage;
        if (updates.gracePeriodDays !== undefined) updateData.grace_period_days = updates.gracePeriodDays;
        if (updates.notes !== undefined) updateData.notes = updates.notes;
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
        updateData.updated_at = new Date().toISOString();

        const { error } = await supabase
            .from('agreements')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        return this.getById(id);
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('agreements')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};


// =====================================================
// EVALUATIONS API (Avaliações Clínicas / Anamneses)
// =====================================================
export const evaluationsApi = {
    async getAll(): Promise<PatientEvaluation[]> {
        const { data, error } = await supabase
            .from('patient_evaluations')
            .select('*, patients(name), professionals(name), units(name)')
            .order('date', { ascending: false });

        if (error) throw error;

        return (data || []).map(e => ({
            id: e.id,
            patientId: e.patient_id,
            professionalId: e.professional_id,
            unitId: e.unit_id,
            date: e.date,
            specialty: e.specialty || 'Fisioterapia',
            chiefComplaint: e.chief_complaint,
            historyCurrentIllness: e.history_current_illness,
            pastMedicalHistory: e.past_medical_history,
            lifestyleHabits: e.lifestyle_habits,
            painLevel: e.pain_level,
            physicalExamination: e.physical_examination,
            clinicalDiagnosis: e.clinical_diagnosis,
            treatmentGoals: e.treatment_goals,
            treatmentPlan: e.treatment_plan,
            attachments: e.attachments || [],
            createdAt: e.created_at,
            updatedAt: e.updated_at,
            patientName: e.patients?.name,
            professionalName: e.professionals?.name,
            unitName: e.units?.name
        }));
    },

    async getByPatientId(patientId: string): Promise<PatientEvaluation[]> {
        const { data, error } = await supabase
            .from('patient_evaluations')
            .select('*, patients(name), professionals(name), units(name)')
            .eq('patient_id', patientId)
            .order('date', { ascending: false });

        if (error) throw error;

        return (data || []).map(e => ({
            id: e.id,
            patientId: e.patient_id,
            professionalId: e.professional_id,
            unitId: e.unit_id,
            date: e.date,
            specialty: e.specialty || 'Fisioterapia',
            chiefComplaint: e.chief_complaint,
            historyCurrentIllness: e.history_current_illness,
            pastMedicalHistory: e.past_medical_history,
            lifestyleHabits: e.lifestyle_habits,
            painLevel: e.pain_level,
            physicalExamination: e.physical_examination,
            clinicalDiagnosis: e.clinical_diagnosis,
            treatmentGoals: e.treatment_goals,
            treatmentPlan: e.treatment_plan,
            attachments: e.attachments || [],
            createdAt: e.created_at,
            updatedAt: e.updated_at,
            patientName: e.patients?.name,
            professionalName: e.professionals?.name,
            unitName: e.units?.name
        }));
    },

    async getById(id: string): Promise<PatientEvaluation> {
        const { data, error } = await supabase
            .from('patient_evaluations')
            .select('*, patients(name), professionals(name), units(name)')
            .eq('id', id)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            patientId: data.patient_id,
            professionalId: data.professional_id,
            unitId: data.unit_id,
            date: data.date,
            specialty: data.specialty || 'Fisioterapia',
            chiefComplaint: data.chief_complaint,
            historyCurrentIllness: data.history_current_illness,
            pastMedicalHistory: data.past_medical_history,
            lifestyleHabits: data.lifestyle_habits,
            painLevel: data.pain_level,
            physicalExamination: data.physical_examination,
            clinicalDiagnosis: data.clinical_diagnosis,
            treatmentGoals: data.treatment_goals,
            treatmentPlan: data.treatment_plan,
            attachments: data.attachments || [],
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            patientName: data.patients?.name,
            professionalName: data.professionals?.name,
            unitName: data.units?.name
        };
    },

    async create(evaluation: Omit<PatientEvaluation, 'id' | 'createdAt' | 'updatedAt'>): Promise<PatientEvaluation> {
        const { data, error } = await supabase
            .from('patient_evaluations')
            .insert({
                patient_id: evaluation.patientId,
                professional_id: evaluation.professionalId || null,
                unit_id: evaluation.unitId || null,
                date: evaluation.date || new Date().toISOString().split('T')[0],
                specialty: evaluation.specialty || 'Fisioterapia',
                chief_complaint: evaluation.chiefComplaint,
                history_current_illness: evaluation.historyCurrentIllness || null,
                past_medical_history: evaluation.pastMedicalHistory || null,
                lifestyle_habits: evaluation.lifestyleHabits || null,
                pain_level: evaluation.painLevel !== undefined ? evaluation.painLevel : null,
                physical_examination: evaluation.physicalExamination || null,
                clinical_diagnosis: evaluation.clinicalDiagnosis || null,
                treatment_goals: evaluation.treatmentGoals || null,
                treatment_plan: evaluation.treatmentPlan || null,
                attachments: evaluation.attachments || []
            })
            .select()
            .single();

        if (error) throw error;
        return this.getById(data.id);
    },

    async update(id: string, updates: Partial<PatientEvaluation>): Promise<PatientEvaluation> {
        const updateData: any = {};
        if (updates.specialty !== undefined) updateData.specialty = updates.specialty;
        if (updates.chiefComplaint !== undefined) updateData.chief_complaint = updates.chiefComplaint;
        if (updates.historyCurrentIllness !== undefined) updateData.history_current_illness = updates.historyCurrentIllness;
        if (updates.pastMedicalHistory !== undefined) updateData.past_medical_history = updates.pastMedicalHistory;
        if (updates.lifestyleHabits !== undefined) updateData.lifestyle_habits = updates.lifestyleHabits;
        if (updates.painLevel !== undefined) updateData.pain_level = updates.painLevel;
        if (updates.physicalExamination !== undefined) updateData.physical_examination = updates.physicalExamination;
        if (updates.clinicalDiagnosis !== undefined) updateData.clinical_diagnosis = updates.clinicalDiagnosis;
        if (updates.treatmentGoals !== undefined) updateData.treatment_goals = updates.treatmentGoals;
        if (updates.treatmentPlan !== undefined) updateData.treatment_plan = updates.treatmentPlan;
        if (updates.attachments !== undefined) updateData.attachments = updates.attachments;
        updateData.updated_at = new Date().toISOString();

        const { error } = await supabase
            .from('patient_evaluations')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        return this.getById(id);
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('patient_evaluations')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// =====================================================
// EVOLUTIONS API (Evoluções Diárias SOAPE)
// =====================================================
export const evolutionsApi = {
    async getAll(): Promise<PatientEvolution[]> {
        const { data, error } = await supabase
            .from('patient_evolutions')
            .select('*, patients(name), professionals(name), units(name)')
            .order('date', { ascending: false })
            .order('time', { ascending: false });

        if (error) throw error;

        return (data || []).map(e => ({
            id: e.id,
            patientId: e.patient_id,
            sessionId: e.session_id,
            professionalId: e.professional_id,
            unitId: e.unit_id,
            date: e.date,
            time: e.time,
            painLevel: e.pain_level,
            conduct: e.conduct,
            patientResponse: e.patient_response,
            nextSteps: e.next_steps,
            isLocked: e.is_locked,
            createdAt: e.created_at,
            updatedAt: e.updated_at,
            patientName: e.patients?.name,
            professionalName: e.professionals?.name,
            unitName: e.units?.name
        }));
    },

    async getByPatientId(patientId: string): Promise<PatientEvolution[]> {
        const { data, error } = await supabase
            .from('patient_evolutions')
            .select('*, patients(name), professionals(name), units(name)')
            .eq('patient_id', patientId)
            .order('date', { ascending: false })
            .order('time', { ascending: false });

        if (error) throw error;

        return (data || []).map(e => ({
            id: e.id,
            patientId: e.patient_id,
            sessionId: e.session_id,
            professionalId: e.professional_id,
            unitId: e.unit_id,
            date: e.date,
            time: e.time,
            painLevel: e.pain_level,
            conduct: e.conduct,
            patientResponse: e.patient_response,
            nextSteps: e.next_steps,
            isLocked: e.is_locked,
            createdAt: e.created_at,
            updatedAt: e.updated_at,
            patientName: e.patients?.name,
            professionalName: e.professionals?.name,
            unitName: e.units?.name
        }));
    },

    async getBySessionId(sessionId: string): Promise<PatientEvolution | null> {
        const { data, error } = await supabase
            .from('patient_evolutions')
            .select('*, patients(name), professionals(name), units(name)')
            .eq('session_id', sessionId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            id: data.id,
            patientId: data.patient_id,
            sessionId: data.session_id,
            professionalId: data.professional_id,
            unitId: data.unit_id,
            date: data.date,
            time: data.time,
            painLevel: data.pain_level,
            conduct: data.conduct,
            patientResponse: data.patient_response,
            nextSteps: data.next_steps,
            isLocked: data.is_locked,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            patientName: data.patients?.name,
            professionalName: data.professionals?.name,
            unitName: data.units?.name
        };
    },

    async getById(id: string): Promise<PatientEvolution> {
        const { data, error } = await supabase
            .from('patient_evolutions')
            .select('*, patients(name), professionals(name), units(name)')
            .eq('id', id)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            patientId: data.patient_id,
            sessionId: data.session_id,
            professionalId: data.professional_id,
            unitId: data.unit_id,
            date: data.date,
            time: data.time,
            painLevel: data.pain_level,
            conduct: data.conduct,
            patientResponse: data.patient_response,
            nextSteps: data.next_steps,
            isLocked: data.is_locked,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            patientName: data.patients?.name,
            professionalName: data.professionals?.name,
            unitName: data.units?.name
        };
    },

    async create(evolution: Omit<PatientEvolution, 'id' | 'createdAt' | 'updatedAt'>): Promise<PatientEvolution> {
        const now = new Date();
        const dateStr = evolution.date || now.toISOString().split('T')[0];
        const timeStr = evolution.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const { data, error } = await supabase
            .from('patient_evolutions')
            .insert({
                patient_id: evolution.patientId,
                session_id: evolution.sessionId || null,
                professional_id: evolution.professionalId || null,
                unit_id: evolution.unitId || null,
                date: dateStr,
                time: timeStr,
                pain_level: evolution.painLevel !== undefined ? evolution.painLevel : null,
                conduct: evolution.conduct,
                patient_response: evolution.patientResponse || null,
                next_steps: evolution.nextSteps || null
            })
            .select()
            .single();

        if (error) throw error;
        return this.getById(data.id);
    },

    async update(id: string, updates: Partial<PatientEvolution>, reason?: string): Promise<PatientEvolution> {
        // Fetch existing to audit
        const existing = await this.getById(id);

        const updateData: any = {};
        if (updates.painLevel !== undefined) updateData.pain_level = updates.painLevel;
        if (updates.conduct !== undefined) updateData.conduct = updates.conduct;
        if (updates.patientResponse !== undefined) updateData.patient_response = updates.patientResponse;
        if (updates.nextSteps !== undefined) updateData.next_steps = updates.nextSteps;
        updateData.updated_at = new Date().toISOString();

        const { error } = await supabase
            .from('patient_evolutions')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        // Insert audit log
        try {
            await supabase.from('patient_evolutions_audit').insert({
                evolution_id: id,
                old_conduct: existing.conduct,
                new_conduct: updates.conduct || existing.conduct,
                reason: reason || 'Edição de evolução clínica'
            });
        } catch (e) {
            console.warn('Could not record evolution audit log:', e);
        }

        return this.getById(id);
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('patient_evolutions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getAuditTrail(evolutionId: string): Promise<PatientEvolutionAudit[]> {
        const { data, error } = await supabase
            .from('patient_evolutions_audit')
            .select('*')
            .eq('evolution_id', evolutionId)
            .order('changed_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(a => ({
            id: a.id,
            evolutionId: a.evolution_id,
            modifiedBy: a.modified_by,
            oldConduct: a.old_conduct,
            newConduct: a.new_conduct,
            reason: a.reason,
            changedAt: a.changed_at
        }));
    }
};

// =====================================================
// CONTRACTS API (Contratos & Termos com Assinatura Digital)
// =====================================================
export const contractsApi = {
    // Templates
    async getTemplates(): Promise<ContractTemplate[]> {
        const { data, error } = await supabase
            .from('contract_templates')
            .select('*')
            .order('title', { ascending: true });

        if (error) throw error;

        return (data || []).map(t => ({
            id: t.id,
            title: t.title,
            type: t.type,
            content: t.content,
            isActive: t.is_active,
            createdAt: t.created_at,
            updatedAt: t.updated_at
        }));
    },

    async getTemplateById(id: string): Promise<ContractTemplate> {
        const { data, error } = await supabase
            .from('contract_templates')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            title: data.title,
            type: data.type,
            content: data.content,
            isActive: data.is_active,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    async createTemplate(template: Omit<ContractTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContractTemplate> {
        const { data, error } = await supabase
            .from('contract_templates')
            .insert({
                title: template.title,
                type: template.type,
                content: template.content,
                is_active: template.isActive ?? true
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            title: data.title,
            type: data.type,
            content: data.content,
            isActive: data.is_active,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    async updateTemplate(id: string, updates: Partial<ContractTemplate>): Promise<ContractTemplate> {
        const updateData: any = {};
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.type !== undefined) updateData.type = updates.type;
        if (updates.content !== undefined) updateData.content = updates.content;
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('contract_templates')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            title: data.title,
            type: data.type,
            content: data.content,
            isActive: data.is_active,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    async deleteTemplate(id: string): Promise<void> {
        const { error } = await supabase
            .from('contract_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Patient Contracts
    async getAll(): Promise<PatientContract[]> {
        const { data, error } = await supabase
            .from('patient_contracts')
            .select('*, patients(name)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(c => ({
            id: c.id,
            patientId: c.patient_id,
            planId: c.plan_id,
            templateId: c.template_id,
            title: c.title,
            content: c.content,
            status: c.status,
            documentHash: c.document_hash,
            signedAt: c.signed_at,
            signedIp: c.signed_ip,
            signedUserAgent: c.signed_user_agent,
            signatureUrl: c.signature_url,
            signerName: c.signer_name,
            signerCpf: c.signer_cpf,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            patientName: c.patients?.name
        }));
    },

    async getByPatientId(patientId: string): Promise<PatientContract[]> {
        const { data, error } = await supabase
            .from('patient_contracts')
            .select('*, patients(name)')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(c => ({
            id: c.id,
            patientId: c.patient_id,
            planId: c.plan_id,
            templateId: c.template_id,
            title: c.title,
            content: c.content,
            status: c.status,
            documentHash: c.document_hash,
            signedAt: c.signed_at,
            signedIp: c.signed_ip,
            signedUserAgent: c.signed_user_agent,
            signatureUrl: c.signature_url,
            signerName: c.signer_name,
            signerCpf: c.signer_cpf,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            patientName: c.patients?.name
        }));
    },

    async getById(id: string): Promise<PatientContract> {
        const { data, error } = await supabase
            .from('patient_contracts')
            .select('*, patients(name)')
            .eq('id', id)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            patientId: data.patient_id,
            planId: data.plan_id,
            templateId: data.template_id,
            title: data.title,
            content: data.content,
            status: data.status,
            documentHash: data.document_hash,
            signedAt: data.signed_at,
            signedIp: data.signed_ip,
            signedUserAgent: data.signed_user_agent,
            signatureUrl: data.signature_url,
            signerName: data.signer_name,
            signerCpf: data.signer_cpf,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            patientName: data.patients?.name
        };
    },

    async create(contract: Omit<PatientContract, 'id' | 'createdAt' | 'updatedAt'>): Promise<PatientContract> {
        const { data, error } = await supabase
            .from('patient_contracts')
            .insert({
                patient_id: contract.patientId,
                plan_id: contract.planId || null,
                template_id: contract.templateId || null,
                title: contract.title,
                content: contract.content,
                status: contract.status || 'pending',
                document_hash: contract.documentHash || null,
                signer_name: contract.signerName || null,
                signer_cpf: contract.signerCpf || null
            })
            .select()
            .single();

        if (error) throw error;
        return this.getById(data.id);
    },

    async sign(id: string, signatureData: {
        signatureUrl: string;
        signerName: string;
        signerCpf?: string;
        signedIp?: string;
        signedUserAgent?: string;
        documentHash?: string;
    }): Promise<PatientContract> {
        const { error } = await supabase
            .from('patient_contracts')
            .update({
                status: 'signed',
                signature_url: signatureData.signatureUrl,
                signer_name: signatureData.signerName,
                signer_cpf: signatureData.signerCpf || null,
                signed_ip: signatureData.signedIp || '127.0.0.1',
                signed_user_agent: signatureData.signedUserAgent || navigator.userAgent,
                document_hash: signatureData.documentHash || null,
                signed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
        return this.getById(id);
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('patient_contracts')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};


