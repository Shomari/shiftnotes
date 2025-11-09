/**
 * Tests for AuthContext
 */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import { apiClient, TokenStorage } from '../../lib/api';

// Mock the API client
jest.mock('../../lib/api', () => ({
  apiClient: {
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  },
  TokenStorage: {
    getToken: jest.fn(),
    setToken: jest.fn(),
    removeToken: jest.fn(),
  },
}));

// Test component that uses the auth context
const TestComponent = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  
  return (
    <>
      <Text testID="loading">{isLoading ? 'loading' : 'not-loading'}</Text>
      <Text testID="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</Text>
      <Text testID="user-email">{user?.email || 'no-user'}</Text>
    </>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start with loading state', () => {
      (TokenStorage.getToken as jest.Mock).mockResolvedValue(null);
      
      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(getByTestId('loading').children[0]).toBe('loading');
    });

    it('should check for existing token on mount', async () => {
      (TokenStorage.getToken as jest.Mock).mockResolvedValue(null);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(TokenStorage.getToken).toHaveBeenCalled();
      });
    });

    it('should load user when valid token exists', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'trainee',
      };

      (TokenStorage.getToken as jest.Mock).mockResolvedValue('valid-token');
      (apiClient.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('authenticated').children[0]).toBe('authenticated');
        expect(getByTestId('user-email').children[0]).toBe('test@example.com');
      });
    });

    it('should handle invalid token gracefully', async () => {
      (TokenStorage.getToken as jest.Mock).mockResolvedValue('invalid-token');
      (apiClient.getCurrentUser as jest.Mock).mockRejectedValue(
        new Error('Unauthorized')
      );

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('authenticated').children[0]).toBe('not-authenticated');
        expect(TokenStorage.removeToken).toHaveBeenCalled();
      });
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'trainee',
      };

      (TokenStorage.getToken as jest.Mock).mockResolvedValue(null);
      (apiClient.login as jest.Mock).mockResolvedValue({
        token: 'new-token',
        user: mockUser,
      });

      const LoginTestComponent = () => {
        const { login, user, isAuthenticated } = useAuth();
        
        React.useEffect(() => {
          login('test@example.com', 'password123');
        }, []);

        return (
          <>
            <Text testID="authenticated">{isAuthenticated ? 'yes' : 'no'}</Text>
            <Text testID="email">{user?.email || 'none'}</Text>
          </>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <LoginTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(apiClient.login).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(getByTestId('authenticated').children[0]).toBe('yes');
        expect(getByTestId('email').children[0]).toBe('test@example.com');
      });
    });

    it('should handle login failure', async () => {
      (TokenStorage.getToken as jest.Mock).mockResolvedValue(null);
      (apiClient.login as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials')
      );

      const LoginFailComponent = () => {
        const { login, isAuthenticated } = useAuth();
        const [error, setError] = React.useState<string | null>(null);
        
        React.useEffect(() => {
          login('wrong@example.com', 'wrongpass').catch((err) => {
            setError(err.message);
          });
        }, []);

        return (
          <>
            <Text testID="authenticated">{isAuthenticated ? 'yes' : 'no'}</Text>
            <Text testID="error">{error || 'no-error'}</Text>
          </>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <LoginFailComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('authenticated').children[0]).toBe('no');
        expect(getByTestId('error').children[0]).toBe('Invalid credentials');
      });
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'trainee',
      };

      (TokenStorage.getToken as jest.Mock).mockResolvedValue('valid-token');
      (apiClient.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (apiClient.logout as jest.Mock).mockResolvedValue(undefined);

      const LogoutTestComponent = () => {
        const { logout, user, isAuthenticated } = useAuth();
        const [loggedOut, setLoggedOut] = React.useState(false);
        
        const handleLogout = async () => {
          await logout();
          setLoggedOut(true);
        };

        return (
          <>
            <Text testID="authenticated">{isAuthenticated ? 'yes' : 'no'}</Text>
            <Text testID="logged-out">{loggedOut ? 'yes' : 'no'}</Text>
            <Text testID="logout-trigger" onPress={handleLogout}>Logout</Text>
          </>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <LogoutTestComponent />
        </AuthProvider>
      );

      // Wait for initial auth check
      await waitFor(() => {
        expect(getByTestId('authenticated').children[0]).toBe('yes');
      });

      // Trigger logout
      await act(async () => {
        getByTestId('logout-trigger').props.onPress();
      });

      await waitFor(() => {
        expect(apiClient.logout).toHaveBeenCalled();
        expect(getByTestId('authenticated').children[0]).toBe('no');
      });
    });
  });

  describe('refreshUser', () => {
    it('should refresh user data when authenticated', async () => {
      const initialUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'trainee',
      };

      const updatedUser = {
        ...initialUser,
        name: 'Updated Name',
      };

      (TokenStorage.getToken as jest.Mock).mockResolvedValue('valid-token');
      (apiClient.getCurrentUser as jest.Mock)
        .mockResolvedValueOnce(initialUser)
        .mockResolvedValueOnce(updatedUser);

      const RefreshTestComponent = () => {
        const { refreshUser, user } = useAuth();
        
        return (
          <>
            <Text testID="user-name">{user?.name || 'no-name'}</Text>
            <Text testID="refresh-trigger" onPress={() => refreshUser()}>Refresh</Text>
          </>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <RefreshTestComponent />
        </AuthProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByTestId('user-name').children[0]).toBe('Test User');
      });

      // Trigger refresh
      await act(async () => {
        getByTestId('refresh-trigger').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('user-name').children[0]).toBe('Updated Name');
      });
    });

    it('should logout if refresh fails', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'trainee',
      };

      (TokenStorage.getToken as jest.Mock).mockResolvedValue('valid-token');
      (apiClient.getCurrentUser as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockRejectedValueOnce(new Error('Token expired'));
      (apiClient.logout as jest.Mock).mockResolvedValue(undefined);

      const RefreshFailComponent = () => {
        const { refreshUser, isAuthenticated } = useAuth();
        
        return (
          <>
            <Text testID="authenticated">{isAuthenticated ? 'yes' : 'no'}</Text>
            <Text testID="refresh-trigger" onPress={() => refreshUser()}>Refresh</Text>
          </>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <RefreshFailComponent />
        </AuthProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByTestId('authenticated').children[0]).toBe('yes');
      });

      // Trigger refresh that will fail
      await act(async () => {
        getByTestId('refresh-trigger').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('authenticated').children[0]).toBe('no');
      });
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const TestComponentWithoutProvider = () => {
        useAuth();
        return <Text>Test</Text>;
      };

      // Suppress console error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        render(<TestComponentWithoutProvider />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});

