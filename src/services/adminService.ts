import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseService';
import type { User } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// We create a secondary client so calling signUp doesn't replace the current user's session
const adminAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    }
});

export const adminService = {
    /**
     * Fetch all users from the public `users` table
     */
    async getAllUsers(): Promise<User[]> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(dbUser => ({
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            farmIds: dbUser.farm_ids || [],
            isActive: dbUser.is_active,
            createdAt: dbUser.created_at,
            lastLogin: dbUser.last_login || undefined,
        })) as User[];
    },

    /**
     * Create a new user (calls auth.signUp, then inserts into `users` table)
     */
    async createUser(userData: { email: string; password?: string; name: string; role: string }): Promise<User> {
        const tempPassword = userData.password || 'Welcome123!';

        // 1. Create auth user
        const { data: authData, error: authError } = await adminAuthClient.auth.signUp({
            email: userData.email,
            password: tempPassword,
        });

        if (authError) throw authError;
        const authId = authData.user?.id;
        if (!authId) throw new Error("Failed to retrieve new user auth ID.");

        // 2. Insert into users table
        const { error: dbError } = await supabase
            .from('users')
            .insert([{
                id: authId,
                email: userData.email,
                name: userData.name,
                role: userData.role,
                farm_ids: [],
                is_active: true,
                created_at: new Date().toISOString()
            }]);

        if (dbError) throw dbError;

        return {
            id: authId,
            email: userData.email,
            name: userData.name,
            role: userData.role as any,
            farmIds: [],
            isActive: true,
            createdAt: new Date().toISOString(),
        };
    },

    /**
     * Update an existing user's details
     */
    async updateUser(userId: string, updates: Partial<{ name: string; role: string; isActive: boolean }>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.role !== undefined) dbUpdates.role = updates.role;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

        const { error } = await supabase
            .from('users')
            .update(dbUpdates)
            .eq('id', userId);

        if (error) throw error;
    },

    /**
     * Delete user from the public users table
     */
    async deleteUser(userId: string) {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) throw error;
        return true;
    }
};
