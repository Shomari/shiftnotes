/**
 * TypeScript types for ShiftNotes Mobile App
 * Migrated from web frontend - these remain identical for API compatibility
 */

export type UserRole = 'faculty' | 'trainee' | 'admin' | 'leadership' | 'system-admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  organization: string
  organization_name?: string
  program: string
  program_name?: string
  program_abbreviation?: string
  cohort?: string
  cohort_name?: string
  start_date?: string
  department: string
  specialties: string[]
  deactivated_at?: string
  created_at: string
  assessment_count?: number
  evaluation_count?: number
}

export interface Trainee extends User {
  role: 'trainee'
  cohort?: string
  start_date?: string
}

export interface Faculty extends User {
  role: 'faculty' | 'leadership'
  department?: string
  specialties: string[]
}

export interface EPA {
  id: string
  code: string
  title: string
  description: string
  category: string
  isActive: boolean
}

export interface Assessment {
  id: string
  traineeId: string
  evaluatorId: string
  shiftDate: string
  location?: string
  epas: AssessmentEPA[]
  status: 'draft' | 'submitted' | 'locked'
  createdAt: string
  updatedAt: string
  traineeName: string
  evaluatorName: string
  privateComments?: string
  acknowledgedAt?: string
  acknowledgedBy?: string
}

export interface AssessmentEPA {
  epaId: string
  epaCode: string
  epaTitle: string
  entrustmentLevel: 1 | 2 | 3 | 4 | 5
  whatWentWell: string
  whatCouldImprove: string
}

export interface Milestone {
  id: string
  title: string
  category: string
  level: number
  mappedEPAs: string[]
  isActive: boolean
}

export const ENTRUSTMENT_LEVELS = {
  1: "I had to do it (Requires constant direct supervision and myself or others' hands-on action for completion)",
  2: "I helped a lot (Requires considerable direct supervision and myself or others' guidance for completion)",
  3: "I helped a little (Requires minimal direct supervision or guidance from myself or others for completion)",
  4: "I needed to be there but did not help (Requires indirect supervision and no guidance by myself or others)",
  5: "I didn't need to be there at all (Does not require any supervision or guidance by myself or others)"
} as const

// Mobile-specific types
export interface AppState {
  isOnline: boolean
  user: User | null
  assessments: Assessment[]
  epas: EPA[]
  users: User[]
}

// Form types for React Native
export interface AssessmentFormData {
  traineeId: string
  shiftDate: string
  location: string
  privateComments: string
  selectedEPAs: string[]
  epaAssessments: Record<string, Partial<AssessmentEPA>>
}
