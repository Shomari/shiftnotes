/**
 * API client for ShiftNotes Django backend
 * Handles all HTTP requests and authentication
 */

import config from '../env.config';

// API Configuration
const getApiBaseUrl = () => {
  return config.API_BASE_URL;
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
  program: string;
  program_name?: string;
  program_abbreviation?: string;
  cohort?: string;
  cohort_name?: string;
  start_date?: string;
  department: string;
  specialties: string[];
  deactivated_at?: string;
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
        let errorData;
        const contentType = response.headers.get('content-type');
        
        try {
          if (contentType?.includes('application/json')) {
            errorData = await response.json();
          } else {
            errorData = await response.text();
          }
        } catch (parseError) {
          errorData = 'Unknown error';
        }
        
        console.error(`API Error: ${response.status} ${response.statusText}`, errorData);
        
        // Create enhanced error object with response data
        const error: any = new Error(`API Error: ${response.status} ${response.statusText}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        };
        throw error;
      }

      // Handle empty responses (like DELETE 204)
      const contentType = response.headers.get('content-type');
      if (response.status === 204 || !contentType?.includes('application/json')) {
        console.log(`API Response: ${url} - No content`);
        return null as T;
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

  async createUser(userData: Partial<ApiUser>): Promise<ApiUser> {
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
    params.append('limit', '200'); // Increase limit to get all sub-competencies
    if (coreCompetencyId) params.append('core_competency', coreCompetencyId);
    if (programId) params.append('program', programId);
    url += `?${params.toString()}`;
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

  async createEPACategory(data: Partial<ApiEPACategory>): Promise<ApiEPACategory> {
    return this.request<ApiEPACategory>('/epa-categories/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEPACategory(id: string, data: Partial<ApiEPACategory>): Promise<ApiEPACategory> {
    return this.request<ApiEPACategory>(`/epa-categories/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEPACategory(id: string): Promise<void> {
    return this.request<void>(`/epa-categories/${id}/`, {
      method: 'DELETE',
    });
  }


  // Sub-Competency-EPA relationship endpoints
  async getSubCompetencyEPAs(): Promise<ApiResponse<ApiSubCompetencyEPA>> {
    return this.request<ApiResponse<ApiSubCompetencyEPA>>('/sub-competency-epas/?limit=500');
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
  async getCohorts(programId?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (programId) params.append('program', programId);
    
    const url = `/cohorts/${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.request<ApiResponse<any[]>>(url);
    return response.results || [];
  }

  async getCohortUsers(cohortId: string): Promise<ApiResponse<ApiUser>> {
    return this.request<ApiResponse<ApiUser>>(`/cohorts/${cohortId}/users/`);
  }

  async getCompetencyGridData(traineeId: string, startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('trainee_id', traineeId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    return this.request<any>(`/analytics/competency-grid/?${params.toString()}`);
  }

  async getTraineePerformanceData(cohort?: string, timeframeMonths?: string, sortBy?: string, sortOrder?: string): Promise<any> {
    const params = new URLSearchParams();
    if (cohort) params.append('cohort', cohort);
    if (timeframeMonths) params.append('months', timeframeMonths);
    if (sortBy) params.append('sort_by', sortBy);
    if (sortOrder) params.append('sort_order', sortOrder);
    
    return this.request<any>(`/analytics/trainee-performance/?${params.toString()}`);
  }

  async getProgramPerformanceData(months: number, cohort?: string, trainee?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('months', months.toString());
    if (cohort) params.append('cohort', cohort);
    if (trainee) params.append('trainee', trainee);
    
    return this.request<any>(`/analytics/program-performance/?${params.toString()}`);
  }

  async createCohort(cohortData: Partial<ApiCohort>): Promise<ApiCohort> {
    return this.request<ApiCohort>('/cohorts/', {
      method: 'POST',
      body: JSON.stringify(cohortData),
    });
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

  async getAssessment(assessmentId: string): Promise<ApiAssessment> {
    return this.request<ApiAssessment>(`/assessments/${assessmentId}/`);
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

  async deleteAssessment(assessmentId: string): Promise<void> {
    return this.request<void>(`/assessments/${assessmentId}/`, {
      method: 'DELETE',
    });
  }

  async acknowledgeAssessment(assessmentId: string): Promise<void> {
    return this.request(`/assessments/${assessmentId}/acknowledge/`, {
      method: 'POST',
    });
  }

  async getMailboxAssessments(page?: number, limit?: number): Promise<any> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const url = `/assessments/mailbox/${params.toString() ? '?' + params.toString() : ''}`;
    return this.request<any>(url);
  }

  async getReadMailboxAssessments(page?: number, limit?: number): Promise<any> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const url = `/assessments/mailbox/read/${params.toString() ? '?' + params.toString() : ''}`;
    return this.request<any>(url);
  }

  async markAssessmentAsRead(assessmentId: string): Promise<void> {
    return this.request(`/assessments/${assessmentId}/mark-read/`, {
      method: 'POST',
    });
  }

  // Program endpoints
  async getPrograms(organizationId?: string): Promise<ApiResponse<ApiProgram>> {
    let url = '/programs/';
    if (organizationId) {
      url += `?org=${organizationId}`;
    }
    return this.request<ApiResponse<ApiProgram>>(url);
  }

  // Assessment endpoints (general)
  async getAssessments(params?: { 
    limit?: number; 
    page?: number;
    trainee_id?: string; 
    evaluator_id?: string;
    epa_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<ApiAssessment>> {
    let url = '/assessments/';
    const searchParams = new URLSearchParams();
    
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.trainee_id) searchParams.append('trainee_id', params.trainee_id);
    if (params?.evaluator_id) searchParams.append('evaluator_id', params.evaluator_id);
    if (params?.epa_id) searchParams.append('epa_id', params.epa_id);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.start_date) searchParams.append('shift_date__gte', params.start_date);
    if (params?.end_date) searchParams.append('shift_date__lte', params.end_date);
    
    if (searchParams.toString()) url += `?${searchParams.toString()}`;
    return this.request<ApiResponse<ApiAssessment>>(url);
  }

  // Analytics endpoints
  async getProgramPerformanceData(months: number = 6, filters?: { cohort?: string; trainee?: string }): Promise<any> {
    const params = new URLSearchParams();
    params.append('months', months.toString());
    
    if (filters?.cohort) {
      params.append('cohort', filters.cohort);
    }
    if (filters?.trainee) {
      params.append('trainee', filters.trainee);
    }
    
    const url = `/analytics/program-performance/?${params.toString()}`;
    return this.request(url);
  }

  // Competency Grid APIs
  async getAssessmentsForTrainee(traineeId: string, startDate?: string, endDate?: string): Promise<any[]> {
    console.log('API: Fetching assessments for trainee:', traineeId);
    const token = await TokenStorage.getToken();
    console.log('API: Using token:', token ? token.substring(0, 10) + '...' : 'NO TOKEN');
    
    const params = new URLSearchParams();
    params.append('trainee', traineeId);
    params.append('limit', '100');
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await this.request(`/assessments/?${params.toString()}`);
    console.log('API: Assessments response:', response);
    const results = (response as any).results || [];
    console.log('API: Returning', results.length, 'assessments');
    return results;
  }

  // Analytics endpoints
  async getFacultyDashboard(facultyId?: string, startDate?: string, endDate?: string, search?: string): Promise<any> {
    const params = new URLSearchParams();
    if (facultyId) params.append('faculty', facultyId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (search) params.append('search', search);
    
    const url = `/analytics/faculty-dashboard/${params.toString() ? '?' + params.toString() : ''}`;
    return this.request<any>(url);
  }

  async getCompetencyProgress(): Promise<any> {
    return this.request<any>('/analytics/competency-progress/');
  }

  // Mailbox endpoints
  async getMailboxAssessments(): Promise<any> {
    return this.request<any>('/assessments/mailbox/');
  }

  async getMailboxCount(): Promise<{ unread_count: number }> {
    return this.request<{ unread_count: number }>('/assessments/mailbox/count/');
  }

  async markAssessmentAsRead(assessmentId: string): Promise<any> {
    return this.request<any>(`/assessments/${assessmentId}/mark-read/`, {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();