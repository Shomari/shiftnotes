import { User, UserRole } from './types'
import { useKV } from '../hooks/useKV'
import { createContext, useContext, ReactNode, useEffect } from 'react'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (userData: Partial<User> & { password: string }) => Promise<boolean>
  isAuthenticated: boolean
  hasRole: (roles: UserRole | UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useKV<User | null>('auth-user', null)
  const [users, setUsers] = useKV<User[]>('users', [])
  const [assessments, setAssessments] = useKV<any[]>('assessments', [])

  useEffect(() => {
    if (users.length === 0) {
      // Initialize with demo users
      const demoUsers: User[] = [
        {
          id: '1',
          email: 'faculty@shiftnotes.com',
          name: 'Dr. Sarah Chen',
          role: 'faculty',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          email: 'trainee@shiftnotes.com',
          name: 'Alex Thompson',
          role: 'trainee',
          cohort: '2024-A',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          startDate: '2024-07-01'
        },
        {
          id: '3',
          email: 'admin@shiftnotes.com',
          name: 'Dr. Michael Rodriguez',
          role: 'admin',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '4',
          email: 'leadership@shiftnotes.com',
          name: 'Dr. Jennifer Kim',
          role: 'leadership',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '5',
          email: 'trainee2@shiftnotes.com',
          name: 'Sam Martinez',
          role: 'trainee',
          cohort: '2024-A',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          startDate: '2024-07-01'
        },
        {
          id: '6',
          email: 'trainee3@shiftnotes.com',
          name: 'Jordan Wu',
          role: 'trainee',
          cohort: '2024-B',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          startDate: '2024-01-15'
        },
        {
          id: '7',
          email: 'trainee4@shiftnotes.com',
          name: 'Taylor Johnson',
          role: 'trainee',
          cohort: '2024-B',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          startDate: '2024-01-15'
        },
        {
          id: '8',
          email: 'trainee5@shiftnotes.com',
          name: 'Casey Brown',
          role: 'trainee',
          cohort: '2023-C',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          startDate: '2023-07-01'
        }
      ]
      setUsers(demoUsers)
    }
  }, [users, setUsers])

  // Initialize sample assessments
  useEffect(() => {
    if (assessments.length === 0) {
      const sampleAssessments = [
        {
          id: 'assess-1',
          traineeId: '2', // Alex Thompson (2024-A)
          evaluatorId: '1', // Dr. Sarah Chen
          shiftDate: '2024-11-01',
          location: 'Emergency Department',
          epas: [
            {
              epaId: 'epa-1',
              epaCode: 'EPA-1',
              epaTitle: 'Initiate treatment for a patient requiring emergent/immediate intervention',
              entrustmentLevel: 4,
              whatWentWell: 'Quick assessment and appropriate triage',
              whatCouldImprove: 'Could improve communication with nursing staff'
            },
            {
              epaId: 'epa-2', 
              epaCode: 'EPA-2',
              epaTitle: 'Lead the resuscitation of a critically ill or injured patient',
              entrustmentLevel: 3,
              whatWentWell: 'Maintained calm during emergency',
              whatCouldImprove: 'Need to delegate tasks more clearly'
            }
          ],
          status: 'submitted',
          createdAt: '2024-11-01T08:00:00Z',
          updatedAt: '2024-11-01T08:00:00Z',
          traineeName: 'Alex Thompson',
          evaluatorName: 'Dr. Sarah Chen'
        },
        {
          id: 'assess-2',
          traineeId: '5', // Sam Martinez (2024-A)
          evaluatorId: '1',
          shiftDate: '2024-11-02',
          location: 'Emergency Department',
          epas: [
            {
              epaId: 'epa-3',
              epaCode: 'EPA-3',
              epaTitle: 'Obtain and interpret a focused history using data from all necessary sources',
              entrustmentLevel: 5,
              whatWentWell: 'Excellent history taking skills',
              whatCouldImprove: 'Continue practicing with complex cases'
            }
          ],
          status: 'submitted',
          createdAt: '2024-11-02T09:00:00Z',
          updatedAt: '2024-11-02T09:00:00Z',
          traineeName: 'Sam Martinez',
          evaluatorName: 'Dr. Sarah Chen'
        },
        {
          id: 'assess-3',
          traineeId: '6', // Jordan Wu (2024-B)
          evaluatorId: '4', // Dr. Jennifer Kim
          shiftDate: '2024-11-03',
          location: 'Emergency Department',
          epas: [
            {
              epaId: 'epa-1',
              epaCode: 'EPA-1',
              epaTitle: 'Initiate treatment for a patient requiring emergent/immediate intervention',
              entrustmentLevel: 2,
              whatWentWell: 'Showed understanding of protocols',
              whatCouldImprove: 'Needs more practice with time management'
            },
            {
              epaId: 'epa-11',
              epaCode: 'EPA-11',
              epaTitle: 'Perform the diagnostic and therapeutic procedures of an emergency physician',
              entrustmentLevel: 3,
              whatWentWell: 'Good technical skills',
              whatCouldImprove: 'Work on procedure efficiency'
            }
          ],
          status: 'submitted',
          createdAt: '2024-11-03T10:00:00Z',
          updatedAt: '2024-11-03T10:00:00Z',
          traineeName: 'Jordan Wu',
          evaluatorName: 'Dr. Jennifer Kim'
        }
      ]
      setAssessments(sampleAssessments)
    }
  }, [assessments, setAssessments])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simple demo authentication - in production this would hit an API
    const foundUser = users.find(u => u.email === email && u.isActive)
    
    if (foundUser) {
      setUser(foundUser)
      toast.success(`Welcome back, ${foundUser.name}!`)
      return true
    } else {
      toast.error('Invalid credentials')
      return false
    }
  }

  const logout = () => {
    setUser(null)
    toast.success('Successfully logged out')
  }

  const register = async (userData: Partial<User> & { password: string }): Promise<boolean> => {
    const existingUser = users.find(u => u.email === userData.email)
    
    if (existingUser) {
      toast.error('User with this email already exists')
      return false
    }

    const newUser: User = {
      id: Date.now().toString(),
      email: userData.email!,
      name: userData.name!,
      role: userData.role || 'trainee',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    setUsers(current => [...current, newUser])
    setUser(newUser)
    toast.success('Account created successfully!')
    return true
  }

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.role)
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      register,
      isAuthenticated: !!user,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}