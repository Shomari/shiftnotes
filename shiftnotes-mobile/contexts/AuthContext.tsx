/**
 * Authentication context for managing user state and API authentication
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, ApiUser, TokenStorage } from '../lib/api';

interface AuthContextType {
  user: ApiUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check for existing authentication on app start
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      console.log('🔍 Checking auth state...');
      const token = await TokenStorage.getToken();
      if (token) {
        console.log('🎟️ Token found, getting current user...');
        const currentUser = await apiClient.getCurrentUser();
        console.log('👤 Current user loaded:', currentUser);
        setUser(currentUser);
      } else {
        console.log('🚫 No token found');
      }
    } catch (error) {
      console.log('❌ No valid authentication found:', error);
      await TokenStorage.removeToken();
    } finally {
      console.log('✅ Auth check completed, setting loading to false');
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('🔐 Starting login process...');
      const response = await apiClient.login(email, password);
      console.log('✅ Login successful, user:', response.user);
      setUser(response.user);
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    } finally {
      console.log('🔄 Login process completed, setting loading to false');
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      if (isAuthenticated) {
        const currentUser = await apiClient.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails, user might be logged out
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

