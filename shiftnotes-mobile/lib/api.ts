/**
 * API client for ShiftNotes Django backend
 * Handles all HTTP requests and authentication
 */

// API Configuration
// Use local Django server for development, EC2 for production
const getApiBaseUrl = () => {
  if (!__DEV__) {
    return 'http://44.197.181.141:8001/api';  // Production EC2 server
  }
  
  // For development, check if we're running in web or native
  // @ts-ignore - Platform is available in React Native
  if (typeof window !== 'undefined' && window.location) {
    // Web mode - use localhost
    return 'http://127.0.0.1:8001/api';
  } else {
    // Native mode - use local IP for physical device
    return 'http://192.168.86.20:8001/api';
  }
};

const API_BASE_URL = getApiBaseUrl();

// Types matching Django backend
export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: 'trainee' | 'faculty' | 'admin' | 'leadership' | 'system-admin';
  organization: string;
  organization_name?: string;
  programs?: ApiProgram[];
  cohort?: string;
  cohort_name?: string;
  start_date?: string;
  department: string;
  specialties: string[];
  created_at: string;
  assessment_count?: number;
  evaluation_count?: number;
}

export interface ApiProgram {
  id: string;
  name: string;
  abbreviation: string;
  specialty: string;
  acgme_id: string;
  org: string;
  org_name?: string;
  director_user?: string;
  coordinator_user?: string;
}

export interface ApiSite {
  id: string;
  name: string;
  org: string;
  org_name?: string;
  program: string;
  program_name?: string;
}

export interface ApiCoreCompetency {
  id: string;
  code: string;
  title: string;
  program: string;
  program_name?: string;
}

export interface ApiSubCompetency {
  id: string;
  code: string;
  title: string;
  program: string;
  program_name?: string;
  core_competency: string;
  core_competency_title?: string;
  epas?: string[];
  milestone_level_1?: string;
  milestone_level_2?: string;
  milestone_level_3?: string;
  milestone_level_4?: string;
  milestone_level_5?: string;
}

export interface ApiEPACategory {
  id: string;
  title: string;
  program: string;
  program_name?: string;
  epas_count?: number;
}

export interface ApiEPA {
  id: string;
  code: string;
  title: string;
  description?: string;
  category: string;
  category_title?: string;
  is_active?: boolean;
  assessment_count?: number;
  sub_competencies?: ApiSubCompetency[];
}

export interface ApiCoreCompetency {
  id: string;
  code: string;
  title: string;
  program: string;
  program_name?: string;
}

export interface ApiSubCompetencyEPA {
  id: string;
  sub_competency: string;
  sub_competency_code?: string;
  sub_competency_title?: string;
  epa: string;
  epa_code?: string;
  epa_title?: string;
  program_name?: string;
}

export interface ApiCohort {
  id: string;
  name: string;
  year: number;
  start_date: string;
  is_active: boolean;
  trainee_count: number;
}

export interface ApiAssessmentEPA {
  id?: string;
  epa: string;
  epa_code?: string;
  epa_title?: string;
  epa_category?: string;
  entrustment_level: number;
  entrustment_description?: string;
  what_went_well: string;
  what_could_improve: string;
}

export interface ApiAssessment {
  id?: string;
  trainee: string;
  evaluator: string;
  trainee_name?: string;
  evaluator_name?: string;
  shift_date: string;
  location: string;
  status: 'draft' | 'submitted' | 'locked';
  private_comments?: string;
  assessment_epas: ApiAssessmentEPA[];
  epa_count?: number;
  average_entrustment?: number;
  acknowledged_at?: string;
  created_at?: string;
}

export interface LoginResponse {
  token: string;
  user: ApiUser;
}

export interface ApiResponse<T> {
  count?: number;
  next?: string;
  previous?: string;
  results?: T[];
  // For single item responses
  [key: string]: any;
}

// Storage for authentication token
let authToken: string | null = null;

/**
 * Storage utility for persisting auth token
 */
export const TokenStorage = {
  async setToken(token: string): Promise<void> {
    authToken = token;
    // In a real app, you'd want to use SecureStore
    // import * as SecureStore from 'expo-secure-store';
    // await SecureStore.setItemAsync('auth_token', token);
  },

  async getToken(): Promise<string | null> {
    if (authToken) return authToken;
    // In a real app, retrieve from SecureStore
    // return await SecureStore.getItemAsync('auth_token');
    return null;
  },

  async removeToken(): Promise<void> {
    authToken = null;
    // In a real app, remove from SecureStore
    // await SecureStore.deleteItemAsync('auth_token');
  }
};

/**
 * HTTP client with automatic token authentication
 */
export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = await TokenStorage.getToken();
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.getHeaders();

    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    console.log(`API Request: ${config.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error(`API Error: ${response.status} ${response.statusText}`, errorData);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`API Response: ${url}`, data);
      return data;
    } catch (error) {
      console.error(`API Request failed: ${url}`, error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/users/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    await TokenStorage.setToken(response.token);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/users/logout/', { method: 'POST' });
    } finally {
      await TokenStorage.removeToken();
    }
  }

  async getCurrentUser(): Promise<ApiUser> {
    return this.request<ApiUser>('/users/me/');
  }

  // User endpoints
  async getUsers(): Promise<ApiResponse<ApiUser>> {
    return this.request<ApiResponse<ApiUser>>('/users/');
  }

  async getTrainees(): Promise<ApiResponse<ApiUser>> {
    return this.request<ApiResponse<ApiUser>>('/users/trainees/');
  }

  async getFaculty(): Promise<ApiResponse<ApiUser>> {
    return this.request<ApiResponse<ApiUser>>('/users/faculty/');
  }

  async createUser(userData: Partial<ApiUser> & { password: string }): Promise<ApiUser> {
    return this.request<ApiUser>('/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, userData: Partial<ApiUser>): Promise<ApiUser> {
    return this.request<ApiUser>(`/users/${userId}/`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: string): Promise<void> {
    return this.request(`/users/${userId}/`, { method: 'DELETE' });
  }

  // EPA endpoints
  async getEPAs(programId?: string): Promise<ApiResponse<ApiEPA>> {
    const url = programId ? `/epas/?program=${programId}` : '/epas/';
    return this.request<ApiResponse<ApiEPA>>(url);
  }

  async getEPA(epaId: string): Promise<ApiEPA> {
    return this.request<ApiEPA>(`/epas/${epaId}/`);
  }

  async createEPA(epaData: Partial<ApiEPA>): Promise<ApiEPA> {
    return this.request<ApiEPA>('/epas/', {
      method: 'POST',
      body: JSON.stringify(epaData),
    });
  }

  async updateEPA(epaId: string, epaData: Partial<ApiEPA>): Promise<ApiEPA> {
    return this.request<ApiEPA>(`/epas/${epaId}/`, {
      method: 'PUT',
      body: JSON.stringify(epaData),
    });
  }

  async deleteEPA(epaId: string): Promise<void> {
    return this.request(`/epas/${epaId}/`, { method: 'DELETE' });
  }

  // Program endpoints
  async getPrograms(organizationId?: string): Promise<ApiResponse<ApiProgram>> {
    const url = organizationId ? `/programs/?org=${organizationId}` : '/programs/';
    return this.request<ApiResponse<ApiProgram>>(url);
  }

  // Site endpoints
  async getSites(organizationId?: string, programId?: string): Promise<ApiResponse<ApiSite>> {
    let url = '/sites/';
    const params = new URLSearchParams();
    if (organizationId) params.append('org', organizationId);
    if (programId) params.append('program', programId);
    if (params.toString()) url += `?${params.toString()}`;
    return this.request<ApiResponse<ApiSite>>(url);
  }

  async createSite(data: Partial<ApiSite>): Promise<ApiSite> {
    return this.request('/sites/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSite(siteId: string, data: Partial<ApiSite>): Promise<ApiSite> {
    return this.request(`/sites/${siteId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteSite(siteId: string): Promise<void> {
    return this.request(`/sites/${siteId}/`, { method: 'DELETE' });
  }

  // Core Competency endpoints
  async getCoreCompetencies(programId?: string): Promise<ApiResponse<ApiCoreCompetency>> {
    const url = programId ? `/core-competencies/?program=${programId}` : '/core-competencies/';
    return this.request<ApiResponse<ApiCoreCompetency>>(url);
  }

  async createCoreCompetency(data: Partial<ApiCoreCompetency>): Promise<ApiCoreCompetency> {
    return this.request('/core-competencies/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCoreCompetency(competencyId: string, data: Partial<ApiCoreCompetency>): Promise<ApiCoreCompetency> {
    return this.request(`/core-competencies/${competencyId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCoreCompetency(competencyId: string): Promise<void> {
    return this.request(`/core-competencies/${competencyId}/`, { method: 'DELETE' });
  }

  // Sub-Competency endpoints
  async getSubCompetencies(coreCompetencyId?: string, programId?: string): Promise<ApiResponse<ApiSubCompetency>> {
    let url = '/sub-competencies/';
    const params = new URLSearchParams();
    if (coreCompetencyId) params.append('core_competency', coreCompetencyId);
    if (programId) params.append('program', programId);
    if (params.toString()) url += `?${params.toString()}`;
    return this.request<ApiResponse<ApiSubCompetency>>(url);
  }

  async createSubCompetency(data: Partial<ApiSubCompetency>): Promise<ApiSubCompetency> {
    return this.request('/sub-competencies/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSubCompetency(subCompetencyId: string, data: Partial<ApiSubCompetency>): Promise<ApiSubCompetency> {
    return this.request(`/sub-competencies/${subCompetencyId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteSubCompetency(subCompetencyId: string): Promise<void> {
    return this.request(`/sub-competencies/${subCompetencyId}/`, { method: 'DELETE' });
  }

  // EPA Category endpoints
  async getEPACategories(programId?: string): Promise<ApiResponse<ApiEPACategory>> {
    const url = programId ? `/epa-categories/?program=${programId}` : '/epa-categories/';
    return this.request<ApiResponse<ApiEPACategory>>(url);
  }


  // Sub-Competency-EPA relationship endpoints
  async getSubCompetencyEPAs(): Promise<ApiResponse<ApiSubCompetencyEPA>> {
    return this.request<ApiResponse<ApiSubCompetencyEPA>>('/sub-competency-epas/');
  }

  async createSubCompetencyEPA(data: Partial<ApiSubCompetencyEPA>): Promise<ApiSubCompetencyEPA> {
    return this.request<ApiSubCompetencyEPA>('/sub-competency-epas/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSubCompetencyEPA(id: string): Promise<void> {
    return this.request(`/sub-competency-epas/${id}/`, { method: 'DELETE' });
  }

  // Cohort endpoints
  async getCohorts(): Promise<ApiResponse<ApiCohort>> {
    return this.request<ApiResponse<ApiCohort>>('/cohorts/');
  }

  async createCohort(cohortData: Partial<ApiCohort>): Promise<ApiCohort> {
    return this.request<ApiCohort>('/cohorts/', {
      method: 'POST',
      body: JSON.stringify(cohortData),
    });
  }

  // Assessment endpoints
  async getAssessments(): Promise<ApiResponse<ApiAssessment>> {
    return this.request<ApiResponse<ApiAssessment>>('/assessments/');
  }

  async getMyAssessments(): Promise<ApiResponse<ApiAssessment>> {
    return this.request<ApiResponse<ApiAssessment>>('/assessments/my_assessments/');
  }

  async getMyEvaluations(): Promise<ApiResponse<ApiAssessment>> {
    return this.request<ApiResponse<ApiAssessment>>('/assessments/my_evaluations/');
  }

  async getReceivedAssessments(): Promise<ApiResponse<ApiAssessment>> {
    return this.request<ApiResponse<ApiAssessment>>('/assessments/received_assessments/');
  }

  async createAssessment(assessmentData: Partial<ApiAssessment>): Promise<ApiAssessment> {
    return this.request<ApiAssessment>('/assessments/', {
      method: 'POST',
      body: JSON.stringify(assessmentData),
    });
  }

  async updateAssessment(assessmentId: string, assessmentData: Partial<ApiAssessment>): Promise<ApiAssessment> {
    return this.request<ApiAssessment>(`/assessments/${assessmentId}/`, {
      method: 'PUT',
      body: JSON.stringify(assessmentData),
    });
  }

  async acknowledgeAssessment(assessmentId: string): Promise<void> {
    return this.request(`/assessments/${assessmentId}/acknowledge/`, {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();