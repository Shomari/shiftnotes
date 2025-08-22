import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { useKV } from '../../hooks/useKV'
import { useIsMobile } from '../../hooks/use-mobile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Assessment, ENTRUSTMENT_LEVELS } from '../../lib/types'
import { safeDateFormat } from '@/lib/utils'
import { 
  CalendarBlank, 
  MapPin, 
  User, 
  Eye, 
  FileText,
  Clock,
  CaretDown,
  CaretUp,
  Funnel
} from '@phosphor-icons/react'

interface AssessmentsListProps {
  userRole: 'evaluator' | 'trainee'
}

export function AssessmentsList({ userRole }: AssessmentsListProps) {
  const { user } = useAuth()
  const [assessments] = useKV<Assessment[]>('assessments', [])
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const isMobile = useIsMobile()

  if (!user) return null

  // Filter assessments based on user role
  const relevantAssessments = assessments.filter(assessment => {
    if (userRole === 'evaluator') {
      return assessment.evaluatorId === user.id
    } else {
      return assessment.traineeId === user.id
    }
  })

  // Apply filters
  const filteredAssessments = relevantAssessments.filter(assessment => {
    const matchesStatus = userRole === 'trainee' || filterStatus === 'all' || assessment.status === filterStatus
    
    const matchesSearch = searchTerm === '' || 
      assessment.traineeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.evaluatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.epas.some(epa => 
        epa.epaCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        epa.epaTitle.toLowerCase().includes(searchTerm.toLowerCase())
      )
    
    // Date range filter (for both trainees and evaluators)
    const matchesDateRange = (!startDate && !endDate) || (() => {
      try {
        const assessmentDate = new Date(assessment.shiftDate)
        if (isNaN(assessmentDate.getTime())) {
          return true // Include assessments with invalid dates rather than throwing error
        }
        
        const fromMatch = !startDate || assessmentDate >= new Date(startDate)
        const toMatch = !endDate || assessmentDate <= new Date(endDate)
        return fromMatch && toMatch
      } catch (error) {
        console.error('Error filtering by date range:', error)
        return true // Include assessments when date filtering fails
      }
    })()
    
    return matchesStatus && matchesSearch && matchesDateRange
  })

  const getStatusColor = (status: Assessment['status']) => {
    switch (status) {
      case 'draft':
        return 'secondary'
      case 'submitted':
        return 'default'
      case 'locked':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const formatDate = (dateString: string) => {
    return safeDateFormat(dateString, dateString)
  }

  if (selectedAssessment) {
    return <AssessmentDetail 
      assessment={selectedAssessment} 
      onBack={() => setSelectedAssessment(null)}
      userRole={userRole}
    />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">
          {userRole === 'evaluator' ? 'My Assessments' : 'My Assessments'}
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          {userRole === 'evaluator' 
            ? 'Assessments you have created for trainees'
            : 'Feedback and evaluations you have received'
          }
        </p>
      </div>

      {/* Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-4 sm:p-6 h-auto hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <Funnel size={20} className="text-muted-foreground" />
                <span className="text-base font-medium">
                  Filters {filteredAssessments.length !== relevantAssessments.length && 
                    `(${filteredAssessments.length} of ${relevantAssessments.length})`}
                </span>
              </div>
              {filtersOpen ? (
                <CaretUp size={16} className="text-muted-foreground" />
              ) : (
                <CaretDown size={16} className="text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 sm:pb-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-sm">Search</Label>
                  <Input
                    id="search"
                    placeholder={userRole === 'evaluator' ? "Search by trainee or EPA..." : "Search by evaluator or EPA..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-sm sm:text-base"
                  />
                </div>

                {/* Status filter for evaluators only */}
                {userRole === 'evaluator' && (
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="locked">Locked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Date range filters for both evaluators and trainees */}
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-sm">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-sm">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Results</Label>
                  <div className="flex items-center justify-between h-10 px-3 rounded-md border bg-muted/50">
                    <span className="text-sm">{filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? 's' : ''}</span>
                    {(startDate || endDate) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStartDate('')
                          setEndDate('')
                        }}
                        className="text-xs h-6 px-2"
                      >
                        Clear Dates
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Assessments List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredAssessments.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-2">No assessments found</h3>
              <p className="text-muted-foreground text-sm">
                {userRole === 'evaluator' 
                  ? "You haven't created any assessments yet."
                  : "No evaluations have been submitted for you yet."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAssessments
            .sort((a, b) => {
              try {
                const dateA = new Date(b.createdAt)
                const dateB = new Date(a.createdAt)
                
                if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
                  return 0 // Keep original order if dates are invalid
                }
                
                return dateA.getTime() - dateB.getTime()
              } catch (error) {
                console.error('Error sorting by date:', error)
                return 0
              }
            })
            .map(assessment => (
            <Card key={assessment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h3 className="font-medium text-base sm:text-lg">
                        {userRole === 'evaluator' 
                          ? assessment.traineeName 
                          : `Assessment by ${assessment.evaluatorName}`
                        }
                      </h3>
                      <Badge variant={getStatusColor(assessment.status)} className="capitalize text-xs self-start">
                        {assessment.status}
                      </Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarBlank size={14} />
                        {formatDate(assessment.shiftDate)}
                      </div>
                      {assessment.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          <span className="truncate">{assessment.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        {formatDate(assessment.createdAt)}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedAssessment(assessment)}
                    className="self-start sm:self-auto shrink-0"
                  >
                    <Eye size={16} />
                    <span className="ml-2">View</span>
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2 text-sm sm:text-base">EPAs Assessed ({assessment.epas.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {assessment.epas.map(epa => (
                        <Badge key={epa.epaId} variant="outline" className="text-xs">
                          {epa.epaCode} - Level {epa.entrustmentLevel}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="text-xs sm:text-sm text-muted-foreground">
                    <strong>Average Entrustment:</strong>{' '}
                    {(assessment.epas.reduce((sum, epa) => sum + epa.entrustmentLevel, 0) / assessment.epas.length).toFixed(1)}
                    {assessment.privateComments && userRole === 'evaluator' && (
                      <span className="block sm:inline sm:ml-4 mt-1 sm:mt-0">
                        <strong>Has private comments for leadership</strong>
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

interface AssessmentDetailProps {
  assessment: Assessment
  onBack: () => void
  userRole: 'evaluator' | 'trainee'
}

function AssessmentDetail({ assessment, onBack, userRole }: AssessmentDetailProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return dateString
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: Assessment['status']) => {
    switch (status) {
      case 'draft':
        return 'secondary'
      case 'submitted':
        return 'default'
      case 'locked':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-4">
            ← Back to list
          </Button>
          <h2 className="text-xl sm:text-2xl font-bold">
            Assessment Details
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {userRole === 'evaluator' 
              ? `Assessment for ${assessment.traineeName}`
              : `Evaluation by ${assessment.evaluatorName}`
            }
          </p>
        </div>
        <Badge variant={getStatusColor(assessment.status)} className="capitalize text-sm sm:text-base px-3 py-1 self-start sm:self-auto">
          {assessment.status}
        </Badge>
      </div>

      {/* Assessment Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">Assessment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User size={16} className="text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {userRole === 'evaluator' ? 'Trainee:' : 'Evaluator:'}
                </span>
                <p className="font-medium text-sm sm:text-base">
                  {userRole === 'evaluator' ? assessment.traineeName : assessment.evaluatorName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <CalendarBlank size={16} className="text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <span className="text-xs sm:text-sm text-muted-foreground">Shift Date:</span>
                <p className="font-medium text-sm sm:text-base">{formatDate(assessment.shiftDate)}</p>
              </div>
            </div>

            {assessment.location && (
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm text-muted-foreground">Location:</span>
                  <p className="font-medium text-sm sm:text-base">{assessment.location}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Clock size={16} className="text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <span className="text-xs sm:text-sm text-muted-foreground">Submitted:</span>
                <p className="font-medium text-sm sm:text-base">{formatDate(assessment.createdAt)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EPA Assessments */}
      <div className="space-y-4">
        <h3 className="text-lg sm:text-xl font-semibold">EPA Evaluations</h3>
        {assessment.epas.map(epa => (
          <Card key={epa.epaId}>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base sm:text-lg">{epa.epaCode}: {epa.epaTitle}</CardTitle>
                <Badge variant="outline" className="text-sm sm:text-lg px-3 py-1 self-start sm:self-auto">
                  Level {epa.entrustmentLevel}
                </Badge>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                {ENTRUSTMENT_LEVELS[epa.entrustmentLevel as keyof typeof ENTRUSTMENT_LEVELS]}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-green-700 mb-2 text-sm sm:text-base">What went well:</h4>
                <p className="text-xs sm:text-sm bg-green-50 p-3 rounded-md border border-green-200">
                  {epa.whatWentWell}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-blue-700 mb-2 text-sm sm:text-base">What could be improved:</h4>
                <p className="text-xs sm:text-sm bg-blue-50 p-3 rounded-md border border-blue-200">
                  {epa.whatCouldImprove}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Private Comments (evaluator only) */}
      {assessment.privateComments && userRole === 'evaluator' && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-yellow-700 text-lg sm:text-xl">Private Comments for Leadership</CardTitle>
            <CardDescription className="text-xs sm:text-sm">These comments are not visible to the trainee</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm bg-yellow-50 p-3 rounded-md border border-yellow-200">
              {assessment.privateComments}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}