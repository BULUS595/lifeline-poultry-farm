// Authentication Service
import { type User, type UserRole } from '../types';
import { getDB } from '../db';

// Simulated API calls - replace with real backend
const API_BASE = 'http://localhost:3000/api';

interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  // Login user
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      // In production, this would call the backend
      // For now, we'll check against stored credentials
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Login failed: Invalid credentials');
      }

      const data: LoginResponse = await response.json();

      // Store token and user in localStorage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Also store in IndexedDB for offline access
      const db = await getDB();
      await db.put('users', data.user);

      return data;
    } catch (error) {
      console.error('Login error:', error);
      // Try offline mode with local data
      const db = await getDB();
      try {
        const users = await db.getAll('users');
        const user = users.find((u) => u.email === email);
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
          return { token: 'offline-token', user };
        }
      } catch (dbError) {
        console.error('DB error:', dbError);
      }
      throw error;
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
    } catch (error) {
      console.warn('Logout error:', error);
    }

    // Clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  // Get current user
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Get auth token
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  },

  // Register new user (Admin only)
  async registerUser(userData: Partial<User>, adminToken: string): Promise<User> {
    const response = await fetch(`${API_BASE}/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      throw new Error('User creation failed');
    }

    const user: User = await response.json();
    const db = await getDB();
    await db.put('users', user);
    return user;
  },

  // Check if user has permission
  hasPermission(user: User, requiredRole: UserRole): boolean {
    const roleHierarchy: Partial<Record<UserRole, number>> = {
      super_admin: 3,
      manager: 2,
      worker: 1
    };

    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  },

  // Check if user can access specific farm
  canAccessFarm(user: User, farmId: string): boolean {
    if (user.role === 'super_admin') return true;
    return user.farmIds.includes(farmId);
  },

  // Refresh token
  async refreshToken(): Promise<string> {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    localStorage.setItem('auth_token', data.token);
    return data.token;
  }
};

// Permission checking utilities
export const checkPermission = (user: User | null, requiredRole: UserRole): boolean => {
  if (!user) return false;
  return authService.hasPermission(user, requiredRole);
};

export const checkFarmAccess = (user: User | null, farmId: string): boolean => {
  if (!user) return false;
  return authService.canAccessFarm(user, farmId);
};

export const canCreateUser = (user: User | null): boolean => {
  return checkPermission(user, 'super_admin');
};

export const canDeleteData = (user: User | null): boolean => {
  return user?.role === 'super_admin' || user?.role === 'manager';
};

export const canEditSensitiveData = (user: User | null): boolean => {
  return user?.role === 'super_admin' || user?.role === 'manager';
};

export const canViewFinancialData = (user: User | null): boolean => {
  return user?.role === 'super_admin' || user?.role === 'manager';
};

export const canSeeAllWorkers = (user: User | null): boolean => {
  return user?.role === 'super_admin' || user?.role === 'manager';
};

export const getVisibleWorkers = (user: User | null, allWorkers: User[]): User[] => {
  if (!user) return [];

  if (user.role === 'super_admin') {
    return allWorkers;
  }

  if (user.role === 'manager') {
    return allWorkers.filter((w) => w.farmIds.some((f) => user.farmIds.includes(f)));
  }

  // Workers can only see themselves
  return [user];
};
