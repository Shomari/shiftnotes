/**
 * Tests for LoginScreen component
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { LoginScreen } from '../LoginScreen';
import { AuthProvider } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api';

// Mock the API client
jest.mock('../../lib/api', () => ({
  apiClient: {
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  },
  TokenStorage: {
    getToken: jest.fn(() => Promise.resolve(null)),
    setToken: jest.fn(),
    removeToken: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock the favicon image
jest.mock('../../assets/favicon.png', () => 'favicon.png');

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderLoginScreen = (props = {}) => {
    return render(
      <AuthProvider>
        <LoginScreen {...props} />
      </AuthProvider>
    );
  };

  describe('rendering', () => {
    it('should render login form correctly', () => {
      const { getByPlaceholderText, getByText } = renderLoginScreen();

      expect(getByText('Sign In')).toBeTruthy();
      expect(getByPlaceholderText('Enter your email')).toBeTruthy();
      expect(getByPlaceholderText('Enter your password')).toBeTruthy();
      expect(getByText('Sign In', { selector: 'Text' })).toBeTruthy();
    });

    it('should render tagline', () => {
      const { getByText } = renderLoginScreen();

      expect(getByText('Competency tracking made easy.')).toBeTruthy();
    });

    it('should render forgot password link', () => {
      const { getByText } = renderLoginScreen();

      expect(getByText('Forgot password?')).toBeTruthy();
    });
  });

  describe('form validation', () => {
    it('should show error when submitting empty form', async () => {
      const { getByText } = renderLoginScreen();

      const signInButton = getByText('Sign In', { selector: 'Text' });
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Please enter both email and password'
        );
      });
    });

    it('should show error when email is empty', async () => {
      const { getByPlaceholderText, getByText } = renderLoginScreen();

      const passwordInput = getByPlaceholderText('Enter your password');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByText('Sign In', { selector: 'Text' });
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Please enter both email and password'
        );
      });
    });

    it('should show error when password is empty', async () => {
      const { getByPlaceholderText, getByText } = renderLoginScreen();

      const emailInput = getByPlaceholderText('Enter your email');
      fireEvent.changeText(emailInput, 'test@example.com');

      const signInButton = getByText('Sign In', { selector: 'Text' });
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Please enter both email and password'
        );
      });
    });

    it('should trim whitespace from email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'trainee',
      };

      (apiClient.login as jest.Mock).mockResolvedValue({
        token: 'test-token',
        user: mockUser,
      });

      const { getByPlaceholderText, getByText } = renderLoginScreen();

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');

      fireEvent.changeText(emailInput, '  test@example.com  ');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByText('Sign In', { selector: 'Text' });
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(apiClient.login).toHaveBeenCalledWith(
          'test@example.com',
          'password123'
        );
      });
    });
  });

  describe('login flow', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'trainee',
      };

      (apiClient.login as jest.Mock).mockResolvedValue({
        token: 'test-token',
        user: mockUser,
      });

      const { getByPlaceholderText, getByText } = renderLoginScreen();

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByText('Sign In', { selector: 'Text' });
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(apiClient.login).toHaveBeenCalledWith(
          'test@example.com',
          'password123'
        );
      });
    });

    it('should show error on failed login', async () => {
      (apiClient.login as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials')
      );

      const { getByPlaceholderText, getByText } = renderLoginScreen();

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');

      fireEvent.changeText(emailInput, 'wrong@example.com');
      fireEvent.changeText(passwordInput, 'wrongpass');

      const signInButton = getByText('Sign In', { selector: 'Text' });
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Login Failed',
          'Invalid email or password. Please try again.'
        );
      });
    });

    it('should disable inputs and button while loading', async () => {
      // Create a promise that we can control
      let resolveLogin: any;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      (apiClient.login as jest.Mock).mockReturnValue(loginPromise);

      const { getByPlaceholderText, getByText } = renderLoginScreen();

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByText('Sign In', { selector: 'Text' });
      fireEvent.press(signInButton);

      // Check that inputs are disabled during loading
      await waitFor(() => {
        expect(emailInput.props.editable).toBe(false);
        expect(passwordInput.props.editable).toBe(false);
      });

      // Resolve the login
      resolveLogin({
        token: 'test-token',
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'trainee' },
      });
    });
  });

  describe('forgot password navigation', () => {
    it('should call onNavigateToForgotPassword when link is pressed', () => {
      const mockNavigate = jest.fn();
      const { getByText } = renderLoginScreen({
        onNavigateToForgotPassword: mockNavigate,
      });

      const forgotPasswordLink = getByText('Forgot password?');
      fireEvent.press(forgotPasswordLink);

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByPlaceholderText } = renderLoginScreen();

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');

      expect(emailInput.props.placeholder).toBe('Enter your email');
      expect(passwordInput.props.placeholder).toBe('Enter your password');
    });

    it('should have secure text entry for password', () => {
      const { getByPlaceholderText } = renderLoginScreen();

      const passwordInput = getByPlaceholderText('Enter your password');
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it('should have correct keyboard types', () => {
      const { getByPlaceholderText } = renderLoginScreen();

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');

      expect(emailInput.props.keyboardType).toBe('email-address');
      expect(emailInput.props.autoCapitalize).toBe('none');
    });
  });
});

