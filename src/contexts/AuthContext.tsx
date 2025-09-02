/**
 * Authentication Context
 * Manages user authentication, tenant selection, and JWT tokens
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/apiClient';

export interface User {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  tenants: Tenant[];
  currentTenantId?: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended';
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantSubdomain?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  subdomain: string;
  plan?: 'starter' | 'professional' | 'enterprise';
}

interface AuthContextType {
  user: User | null;
  currentTenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}


export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const tenantId = localStorage.getItem('current_tenant_id');
      
      if (token) {
        try {
          const userData = await apiClient.getProfile();
          setUser({
            id: userData.user.id,
            email: userData.user.email,
            role: userData.user.role,
            tenants: [userData.tenant],
            currentTenantId: userData.tenant.id
          });
          setCurrentTenant(userData.tenant);
        } catch (error) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('current_tenant_id');
          
          // In development mode, try auto-login for testing
          if (import.meta.env.DEV) {
            console.log('Auth failed, attempting development auto-login...');
            try {
              await login({ email: 'admin@demo.com', password: 'demo123' });
            } catch (loginError) {
              console.warn('Development auto-login failed:', loginError);
            }
          }
        }
      } else if (import.meta.env.DEV) {
        // In development mode, auto-login if no token exists
        console.log('No token found, attempting development auto-login...');
        try {
          await login({ email: 'admin@demo.com', password: 'demo123' });
        } catch (loginError) {
          console.warn('Development auto-login failed:', loginError);
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_tenant_id');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await apiClient.login(credentials.email, credentials.password, credentials.tenantSubdomain);
      
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('current_tenant_id', response.tenant.id);
      
      setUser({
        id: response.user.id,
        email: response.user.email,
        role: response.user.role,
        tenants: [response.tenant],
        currentTenantId: response.tenant.id
      });
      setCurrentTenant(response.tenant);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const response = await apiClient.register({
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        companyName: data.companyName,
        subdomain: data.subdomain,
        plan: data.plan || 'starter'
      });
      
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('current_tenant_id', response.tenant.id);
      
      setUser({
        id: response.user.id,
        email: response.user.email,
        role: response.user.role,
        tenants: [response.tenant],
        currentTenantId: response.tenant.id
      });
      setCurrentTenant(response.tenant);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_tenant_id');
    setUser(null);
    setCurrentTenant(null);
  };

  const switchTenant = async (tenantId: string) => {
    if (!user) throw new Error('User not authenticated');

    const tenant = user.tenants.find(t => t.id === tenantId);
    if (!tenant) throw new Error('Tenant not found');

    try {
      localStorage.setItem('current_tenant_id', tenantId);
      setCurrentTenant(tenant);
      
      // Optionally refresh token for new tenant
      await refreshToken();
    } catch (error) {
      console.error('Tenant switch failed:', error);
      throw error;
    }
  };

  const refreshToken = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No token available');

    try {
      const response = await apiClient.refreshToken();
      localStorage.setItem('auth_token', response.token);
    } catch (error) {
      logout();
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentTenant,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        switchTenant,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};