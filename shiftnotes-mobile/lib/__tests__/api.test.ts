/**
 * Tests for API client and TokenStorage
 */
import { ApiClient, TokenStorage } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('TokenStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setToken', () => {
    it('should store token in AsyncStorage', async () => {
      await TokenStorage.setToken('test-token-123');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token-123');
    });
  });

  describe('getToken', () => {
    it('should retrieve token from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('stored-token');
      
      const token = await TokenStorage.getToken();
      
      expect(token).toBe('stored-token');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('auth_token');
    });

    it('should return null when no token exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      
      const token = await TokenStorage.getToken();
      
      expect(token).toBeNull();
    });

    it('should cache token in memory after first retrieval', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('cached-token');
      
      const token1 = await TokenStorage.getToken();
      const token2 = await TokenStorage.getToken();
      
      expect(token1).toBe('cached-token');
      expect(token2).toBe('cached-token');
      // Should only call AsyncStorage once
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeToken', () => {
    it('should remove token from AsyncStorage', async () => {
      await TokenStorage.removeToken();
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });
});

describe('ApiClient', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient('http://test-api.com');
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        token: 'auth-token-123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'trainee',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await apiClient.login('test@example.com', 'password123');

      expect(result.token).toBe('auth-token-123');
      expect(result.user.email).toBe('test@example.com');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', 'auth-token-123');
    });

    it('should throw error on failed login', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid credentials' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await expect(
        apiClient.login('wrong@example.com', 'wrongpass')
      ).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should logout and remove token', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Logged out' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await apiClient.logout();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should remove token even if API call fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await apiClient.logout();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user with auth token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'trainee',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('auth-token-123');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockUser,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const user = await apiClient.getCurrentUser();

      expect(user.email).toBe('test@example.com');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me/'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Token auth-token-123',
          }),
        })
      );
    });
  });

  describe('getAssessments', () => {
    it('should fetch assessments with filters', async () => {
      const mockAssessments = {
        count: 2,
        results: [
          { id: 'assessment-1', trainee: 'user-1' },
          { id: 'assessment-2', trainee: 'user-2' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAssessments,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await apiClient.getAssessments({
        trainee_id: 'user-1',
        status: 'submitted',
      });

      expect(result.count).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('trainee_id=user-1'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=submitted'),
        expect.any(Object)
      );
    });
  });

  describe('createAssessment', () => {
    it('should create a new assessment', async () => {
      const newAssessment = {
        trainee: 'user-1',
        evaluator: 'user-2',
        shift_date: '2024-01-15',
        status: 'draft',
        assessment_epas: [],
      };

      const createdAssessment = {
        id: 'assessment-123',
        ...newAssessment,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => createdAssessment,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await apiClient.createAssessment(newAssessment);

      expect(result.id).toBe('assessment-123');
      expect(result.trainee).toBe('user-1');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/assessments/'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newAssessment),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.getUsers()).rejects.toThrow('Network error');
    });

    it('should handle non-JSON error responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error occurred',
        headers: new Headers({ 'content-type': 'text/plain' }),
      });

      await expect(apiClient.getUsers()).rejects.toThrow();
    });

    it('should handle 401 unauthorized errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ detail: 'Authentication required' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await expect(apiClient.getCurrentUser()).rejects.toThrow();
    });
  });

  describe('authentication headers', () => {
    it('should include auth token in headers when available', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('test-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [] }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await apiClient.getUsers();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Token test-token',
          }),
        })
      );
    });

    it('should not include auth header when no token', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await apiClient.login('test@example.com', 'password');

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const headers = callArgs[1].headers;
      
      expect(headers['Authorization']).toBeUndefined();
    });
  });
});

