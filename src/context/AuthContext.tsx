/* eslint-disable react-refresh/only-export-components */
// Auth Context - Global authentication state management
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type AuthState, type User } from '../types';
import { supabaseAuthService, supabase } from '../services/supabaseService';
import { initDB } from '../db';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  isAdmin: boolean;
  isInventory: boolean;
  isSales: boolean;
  isSuperAdmin: boolean;
  isManager: boolean;
  isAccountant: boolean;
  isAuditor: boolean;
  isStaff: boolean;
  getRoleLabel: (role?: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  // Initialize DB and handle session transitions
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await initDB();

        // Check for existing session on mount
        const user = await supabaseAuthService.getCurrentUser();
        if (user) {
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false
          });
        } else {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
        }

        // Listen for auth state changes (login, logout, session expiration)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            const profile = await supabaseAuthService.getUserProfile(session.user.id);
            if (profile) {
              setAuthState({ user: profile, isAuthenticated: true, isLoading: false });
            }
          } else if (event === 'SIGNED_OUT') {
            setAuthState({ user: null, isAuthenticated: false, isLoading: false });
            localStorage.removeItem('user');
          }
        });

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthState({ user: null, isAuthenticated: false, isLoading: false, error: 'Initialization error' });
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: undefined }));
    try {
      const response = await supabaseAuthService.signIn(email, password);
      // Persist locally for immediate availability on UI
      localStorage.setItem('user', JSON.stringify(response.user));

      setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  };

  const logout = async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    try {
      await supabaseAuthService.signOut();
      localStorage.removeItem('user');
      setAuthState({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const register = async () => {
    throw new Error('Register via AuthContext is deprecated.');
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!authState.user) return;
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.role !== undefined) dbUpdates.role = updates.role;

      const { error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', authState.user.id);

      if (error) throw error;

      const updatedUser = { ...authState.user, ...updates };
      setAuthState(prev => ({ ...prev, user: updatedUser }));
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      console.error('User update error:', err);
      throw err;
    }
  };

  const getRoleLabel = (role?: string) => {
    const rawRole = (role || authState.user?.role || '').toLowerCase();
    switch (rawRole) {
      case 'super_admin':
      case 'admin':
        return 'Admin';
      case 'manager':
      case 'inventory_staff':
      case 'inventory_officer':
        return 'Inventory Officer';
      case 'sales_staff':
      case 'sales':
        return 'Sales';
      default:
        // fallback
        return 'Staff';
    }
  };

  const isAdmin = authState.user?.role === 'super_admin' || authState.user?.role === 'admin';
  const isInventory = authState.user?.role === 'inventory_staff' || authState.user?.role === 'inventory_officer' || authState.user?.role === 'manager';
  const isSales = authState.user?.role === 'sales_staff' || authState.user?.role === 'sales';

  // maintain legacy names to avoid breaking tons of things, map them back safely if needed.
  const isSuperAdmin = isAdmin;
  const isManager = isAdmin || isInventory;
  const isAccountant = isAdmin;
  const isAuditor = isAdmin;
  const isStaff = !!authState.user;

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    register,
    updateUser,
    isAdmin,
    isInventory,
    isSales,
    isSuperAdmin,
    isManager,
    isAccountant,
    isAuditor,
    isStaff,
    getRoleLabel
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
