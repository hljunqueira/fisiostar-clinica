import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { systemUsersApi } from '../services/api';
import type { SystemUser, UserRole, UnitId } from '../../types';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    systemUser: SystemUser | null;
    role: UserRole | null;
    assignedUnit: UnitId | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [systemUser, setSystemUser] = useState<SystemUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                loadSystemUser(session.user.email!);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                loadSystemUser(session.user.email!);
            } else {
                setSystemUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    async function loadSystemUser(email: string) {
        try {
            const sysUser = await systemUsersApi.getByEmail(email);
            setSystemUser(sysUser);
        } catch (error) {
            console.error('Error loading system user:', error);
            setSystemUser(null);
        } finally {
            setLoading(false);
        }
    }

    async function signIn(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    }

    async function signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setSystemUser(null);
    }

    const value: AuthContextType = {
        user,
        systemUser,
        role: systemUser?.role ?? null,
        assignedUnit: systemUser?.unitId ?? null,
        loading,
        signIn,
        signOut
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
