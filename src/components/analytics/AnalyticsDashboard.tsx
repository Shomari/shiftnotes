import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { useKV } from '../../hooks/useKV'
import { useIsMobile } from '../../hooks/use-mobile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Assessment } from '../../lib/types'
import { ChartLine, ClipboardText, TrendUp, Calendar, CaretDown, CaretUp, Funnel } from '@phosphor-icons/react'

export function AnalyticsDashboard() {
  const { user, hasRole } = useAuth()
  const [assessments] = useKV<Assessment[]>('assessments', [])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const isMobile = useIsMobile()

  if (!user) return null

  // Filter assessments based on user role
  const relevantAssessments = assessments.filter(assessment => {
    if (hasRole('trainee')) {
      return assessment.traineeId === user.id
    } else {
      return true // Leadership and admin see all
    }
  })

  // Apply date range filter if specified
  const dateFilteredAssessments = relevantAssessments.filter(assessment => {
    if (!startDate && !endDate) return true
    
    try {
      const assessmentDate = new Date(assessment.shiftDate)
      if (isNaN(assessmentDate.getTime())) {
        return true // Include assessments with invalid dates
      }
      
      const fromMatch = !startDate || assessmentDate >= new Date(startDate)
      const toMatch = !endDate || assessmentDate <= new Date(endDate)
      return fromMatch && toMatch
    } catch (error) {
      console.error('Error filtering dashboard assessments by date:', error)
      return true // Include assessments when filtering fails
    }
  })

  const submittedAssessments = dateFilteredAssessments.filter(a => a.status === 'submitted')
  
  // Calculate stats
  const totalAssessments = submittedAssessments.length
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  // If date range is selected, show count for that period instead of "this month"
  const periodAssessments = startDate || endDate ? submittedAssessments : submittedAssessments.filter(assessment => {
    try {
      const assessmentDate = new Date(assessment.shiftDate)
      if (isNaN(assessmentDate.getTime())) {
        return false // Exclude assessments with invalid dates from current month filter
      }
      return assessmentDate.getMonth() === currentMonth && assessmentDate.getFullYear() === currentYear
    } catch (error) {
      console.error('Error filtering assessments by current month:', error)
      return false
    }
  })

  const periodLabel = startDate || endDate ? 'Selected Period' : 'This Month'

  const allEPAAssessments = submittedAssessments.flatMap(a => a.epas)
  const averageEntrustment = allEPAAssessments.length > 0 
    ? (allEPAAssessments.reduce((sum, epa) => sum + epa.entrustmentLevel, 0) / allEPAAssessments.length).toFixed(1)
    : '0.0'

  // EPA breakdown
  const epaBreakdown = allEPAAssessments.reduce((acc, epa) => {
    const key = epa.epaCode
    if (!acc[key]) {
      acc[key] = { 
        code: epa.epaCode, 
        title: epa.epaTitle, 
        count: 0, 
        totalEntrustment: 0,
        averageEntrustment: 0
      }
    }
    acc[key].count++
    acc[key].totalEntrustment += epa.entrustmentLevel
    acc[key].averageEntrustment = acc[key].totalEntrustment / acc[key].count
    return acc
  }, {} as Record<string, any>)

  const epaStats = Object.values(epaBreakdown).sort((a: any, b: any) => b.count - a.count)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">
          {hasRole('trainee') ? 'My Progress Analytics' : 'Analytics Dashboard'}
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          {hasRole('trainee') 
            ? 'Track your learning progress and EPA performance over time'
            : 'Monitor training outcomes and assessment trends'
          }
        </p>
      </div>

      {/* Date Range Filter */}
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
                  Date Range Filter {(startDate || endDate) && '(Active)'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <Label className="text-sm">Actions</Label>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStartDate('')
                      setEndDate('')
                    }}
                    disabled={!startDate && !endDate}
                    className="w-full text-sm"
                  >
                    Clear Dates
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center space-x-2">
              <ClipboardText size={20} className="text-primary" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{totalAssessments}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Assessments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center space-x-2">
              <Calendar size={20} className="text-accent" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{periodAssessments.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{periodLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center space-x-2">
              <TrendUp size={20} className="text-green-600" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{averageEntrustment}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Avg Entrustment</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center space-x-2">
              <ChartLine size={20} className="text-blue-600" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{epaStats.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Unique EPAs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* EPA Performance Breakdown */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">EPA Performance Summary</CardTitle>
          <CardDescription className="text-sm">
            {hasRole('trainee') ? 'Your' : 'Trainee'} performance across different EPAs based on submitted assessments
            {(startDate || endDate) && (
              <span className="text-primary font-medium">
                {' '}• Filtered by selected date range
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {epaStats.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <ChartLine size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-2">No assessment data yet</h3>
              <p className="text-muted-foreground text-sm">
                {hasRole('trainee') 
                  ? "Once you receive assessments, your progress will be displayed here."
                  : "Assessment analytics will appear once evaluations are submitted."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {epaStats.map((epa: any, index) => (
                <div key={epa.code} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg space-y-2 sm:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <Badge variant="outline" className="text-xs">{epa.code}</Badge>
                      <h3 className="font-medium text-sm sm:text-base line-clamp-1">{epa.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
                      <span>{epa.count} assessment{epa.count !== 1 ? 's' : ''}</span>
                      <span>Average Level: {epa.averageEntrustment.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end">
                    <div className="flex-1 sm:w-20 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-full rounded-full" 
                        style={{ width: `${(epa.averageEntrustment / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-base sm:text-lg font-bold text-primary min-w-[2.5rem] text-right">
                      {epa.averageEntrustment.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">Recent Assessment Activity</CardTitle>
          <CardDescription className="text-sm">
            Latest assessment submissions and updates
            {(startDate || endDate) && (
              <span className="text-primary font-medium">
                {' '}• Filtered by selected date range
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submittedAssessments.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm">No recent activity to display</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submittedAssessments
                .sort((a, b) => {
                  try {
                    const dateA = new Date(b.createdAt)
                    const dateB = new Date(a.createdAt)
                    
                    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
                      return 0 // Keep original order if dates are invalid
                    }
                    
                    return dateA.getTime() - dateB.getTime()
                  } catch (error) {
                    console.error('Error sorting recent activity by date:', error)
                    return 0
                  }
                })
                .slice(0, 5)
                .map(assessment => (
                <div key={assessment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 space-y-2 sm:space-y-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">
                      {hasRole('trainee') 
                        ? `Assessment by ${assessment.evaluatorName}`
                        : `Assessment for ${assessment.traineeName}`
                      }
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {assessment.epas.length} EPA{assessment.epas.length !== 1 ? 's' : ''} • {' '}
                      {(() => {
                        try {
                          const date = new Date(assessment.shiftDate)
                          return isNaN(date.getTime()) ? assessment.shiftDate : date.toLocaleDateString()
                        } catch (error) {
                          console.error('Error formatting assessment date:', error)
                          return assessment.shiftDate
                        }
                      })()}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs self-start sm:self-auto">
                    {assessment.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}