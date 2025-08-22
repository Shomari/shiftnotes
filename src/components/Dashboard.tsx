import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useIsMobile } from '../hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { 
  ClipboardText, 
  User, 
  ChartLine, 
  SignOut, 
  Plus,
  FileText,
  Users,
  Gear,
  Flag,
  Download,
  List,
  Target
} from '@phosphor-icons/react'
import { NewAssessmentForm } from './assessments/NewAssessmentForm'
import { AssessmentsList } from './assessments/AssessmentsList'
import { AllAssessments } from './assessments/AllAssessments'
import { AnalyticsDashboard } from './analytics/AnalyticsDashboard'
import { TraineeAnalytics } from './analytics/TraineeAnalytics'
import { FacultyAnalytics } from './analytics/FacultyAnalytics'
import { MilestoneAnalytics } from './analytics/MilestoneAnalytics'
import { EPABankManagement } from './admin/EPABankManagement'
import { UserManagement } from './admin/UserManagement'
import { MilestoneMapping } from './admin/MilestoneMapping'

type ViewType = 'overview' | 'new-assessment' | 'my-assessments' | 'resident-evaluations' | 
                'analytics' | 'trainee-analytics' | 'faculty-analytics' | 'milestone-analytics' | 
                'users' | 'epa-bank' | 'milestone-mapping' | 'all-assessments' | 'export'

export function Dashboard() {
  const { user, logout, hasRole } = useAuth()
  const [currentView, setCurrentView] = useState<ViewType>('overview')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  if (!user) return null

  const navigationItems = [
    // Universal items
    { id: 'overview', label: 'Overview', icon: ClipboardText, roles: ['faculty', 'trainee', 'admin', 'leadership', 'system-admin'] },
    
    // Faculty & Leadership items
    { id: 'new-assessment', label: 'New Assessment', icon: Plus, roles: ['faculty', 'leadership'] },
    { id: 'my-assessments', label: 'My Assessments', icon: FileText, roles: ['faculty', 'leadership'] },
    
    // Trainee items
    { id: 'resident-evaluations', label: 'My Assessments', icon: FileText, roles: ['trainee'] },
    
    // Analytics items - trainee gets single analytics, leadership gets multiple
    { id: 'analytics', label: 'My Progress Analytics', icon: ChartLine, roles: ['trainee'] },
    { id: 'trainee-analytics', label: 'Trainee Analytics', icon: ChartLine, roles: ['leadership'] },
    { id: 'faculty-analytics', label: 'Faculty Analytics', icon: ChartLine, roles: ['leadership'] },
    { id: 'milestone-analytics', label: 'Milestone Analytics', icon: ChartLine, roles: ['leadership'] },
    
    // Admin items
    { id: 'users', label: 'User Management', icon: Users, roles: ['admin', 'system-admin'] },
    { id: 'epa-bank', label: 'EPA Bank', icon: Gear, roles: ['admin', 'system-admin'] },
    { id: 'milestone-mapping', label: 'Milestone Mapping', icon: Target, roles: ['admin', 'system-admin'] },
    { id: 'all-assessments', label: 'All Assessments', icon: FileText, roles: ['admin', 'leadership'] },
    
    // Export
    { id: 'export', label: 'Export Data', icon: Download, roles: ['trainee'] }
  ]

  const visibleItems = navigationItems.filter(item => 
    item.roles.some(role => hasRole(role as any))
  )

  const renderContent = () => {
    switch (currentView) {
      case 'new-assessment':
        return <NewAssessmentForm />
      case 'my-assessments':
        return <AssessmentsList userRole="evaluator" />
      case 'resident-evaluations':
        return <AssessmentsList userRole="trainee" />
      case 'analytics':
        return <AnalyticsDashboard />
      case 'trainee-analytics':
        return <TraineeAnalytics />
      case 'faculty-analytics':
        return <FacultyAnalytics />
      case 'milestone-analytics':
        return <MilestoneAnalytics />
      case 'epa-bank':
        return <EPABankManagement />
      case 'milestone-mapping':
        return <MilestoneMapping />
      case 'users':
        return <UserManagement />
      case 'all-assessments':
        return <AllAssessments />
      case 'overview':
      default:
        return <OverviewContent user={user} onNavigate={setCurrentView} />
    }
  }

  const NavigationContent = () => (
    <div className="space-y-2">
      {visibleItems.map((item) => {
        const Icon = item.icon
        return (
          <Button
            key={item.id}
            variant={currentView === item.id ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              setCurrentView(item.id as ViewType)
              setIsMobileMenuOpen(false)
            }}
          >
            <Icon size={18} />
            <span className="ml-3">{item.label}</span>
          </Button>
        )
      })}
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Trigger */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <List size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="py-6">
                  <NavigationContent />
                </div>
              </SheetContent>
            </Sheet>

            <div className="bg-primary rounded-lg p-2">
              <ClipboardText size={24} weight="bold" className="text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-base sm:text-lg">ShiftNotes</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isMobile ? "Competency tracking made easy." : "Competency Tracking System"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user.name}</p>
              <Badge variant="secondary" className="text-xs capitalize">
                {user.role}
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              <SignOut size={16} />
              <span className="ml-2 hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar Navigation */}
        <nav className="hidden md:block w-64 border-r bg-card min-h-[calc(100vh-4rem)] p-4">
          <NavigationContent />
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

function OverviewContent({ user, onNavigate }: { user: any; onNavigate: (view: ViewType) => void }) {
  const { hasRole } = useAuth()
  
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">Welcome, {user.name}</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          {user.role === 'faculty' && 'Create and manage trainee assessments'}
          {user.role === 'trainee' && 'Track your learning progress and feedback'}
          {user.role === 'admin' && 'Manage users, EPAs, and system settings'}
          {user.role === 'leadership' && 'Monitor training outcomes and performance'}
          {user.role === 'system-admin' && 'Configure system-wide settings'}
        </p>
      </div>

      {/* Prominent New Assessment Button for Faculty and Leadership */}
      {(hasRole('faculty') || hasRole('leadership')) && (
        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="px-8 py-6 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200"
            onClick={() => onNavigate('new-assessment')}
          >
            <Plus size={24} className="mr-3" />
            New Assessment
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ClipboardText size={20} className="text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-sm">
              Your latest assessments and updates
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              No recent activity to display
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ChartLine size={20} className="text-accent" />
              Quick Stats
            </CardTitle>
            <CardDescription className="text-sm">
              Key metrics at a glance
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">This Month</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total</span>
                <span className="font-medium">0</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Flag size={20} className="text-destructive" />
              Notifications
            </CardTitle>
            <CardDescription className="text-sm">
              Important updates and reminders
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              All caught up! No notifications.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}