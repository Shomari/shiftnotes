import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import { useKV } from '../../hooks/useKV'
import { useIsMobile } from '../../hooks/use-mobile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Assessment } from '../../lib/types'
import { ChartLine, ClipboardText, TrendUp, CaretDown, CaretUp, Funnel, Users, Download } from '@phosphor-icons/react' // removed unused Calendar icon
import { toast } from 'sonner'

export function TraineeAnalytics() {
  const { user, hasRole } = useAuth()
  const [assessments] = useKV<Assessment[]>('assessments', [])
  const [users] = useKV<any[]>('users', [])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedTrainee, setSelectedTrainee] = useState('all')
  const [selectedCohort, setSelectedCohort] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const isMobile = useIsMobile()

  // Reset trainee selection when cohort changes
  useEffect(() => {
    if (selectedCohort !== 'all') {
      setSelectedTrainee('all')
    }
  }, [selectedCohort])

  if (!user) return null

  const trainees = users.filter(u => u.role === 'trainee')
  const cohorts = [...new Set(trainees.map(t => t.cohort).filter(Boolean))].sort()

  // Filter by cohort first, then by trainee
  const cohortFilteredTrainees = selectedCohort !== 'all' 
    ? trainees.filter(t => t.cohort === selectedCohort)
    : trainees

  // Filter by trainee / role
  const relevantAssessments = assessments.filter(assessment => {
    if (selectedTrainee && selectedTrainee !== 'all') {
      return assessment.traineeId === selectedTrainee
    } else if (hasRole('trainee')) {
      return assessment.traineeId === user.id
    } else {
      // Leadership - filter by cohort if selected
      if (selectedCohort !== 'all') {
        const traineeIdsInCohort = cohortFilteredTrainees.map(t => t.id)
        return traineeIdsInCohort.includes(assessment.traineeId)
      }
      return true
    }
  })

  // Inclusive date filter (treat endDate as end-of-day)
  const dateFilteredAssessments = relevantAssessments.filter(assessment => {
    if (!startDate && !endDate) return true
    try {
      const assessmentDate = new Date(assessment.shiftDate)
      if (isNaN(assessmentDate.getTime())) return true

      const from = startDate ? new Date(`${startDate}T00:00:00`) : null
      const to = endDate ? new Date(`${endDate}T23:59:59.999`) : null

      const fromMatch = !from || assessmentDate >= from
      const toMatch = !to || assessmentDate <= to
      return fromMatch && toMatch
    } catch (err) {
      console.error('Error filtering trainee assessments by date:', err)
      return true
    }
  }) // <-- fixed extra parenthesis

  const submittedAssessments = dateFilteredAssessments.filter(a => a.status === 'submitted')

  // Flatten EPAs defensively
  const allEPAAssessments = submittedAssessments.flatMap(a =>
    Array.isArray(a.epas) ? a.epas : []
  )

  const averageEntrustment =
    allEPAAssessments.length > 0
      ? (allEPAAssessments.reduce((s, e) => s + (e.entrustmentLevel ?? 0), 0) / allEPAAssessments.length).toFixed(1)
      : '0.0'

  const totalAssessments = submittedAssessments.length
  const activeTraineeIds = new Set(submittedAssessments.map(a => a.traineeId))
  const activeTrainees = activeTraineeIds.size

  // EPA breakdown
  const epaBreakdown = allEPAAssessments.reduce((acc, epa) => {
    const key = epa.epaCode
    if (!acc[key]) {
      acc[key] = { code: epa.epaCode, title: epa.epaTitle, count: 0, totalEntrustment: 0, averageEntrustment: 0 }
    }
    acc[key].count++
    acc[key].totalEntrustment += (epa.entrustmentLevel ?? 0)
    acc[key].averageEntrustment = acc[key].totalEntrustment / acc[key].count
    return acc
  }, {} as Record<string, {code:string; title:string; count:number; totalEntrustment:number; averageEntrustment:number}>)

  const epaStats = Object.values(epaBreakdown).sort((a, b) => b.count - a.count)
  const maxEpaCount = epaStats.length ? Math.max(...epaStats.map(e => e.count)) : 1 // micro-opt + safe divide

  // Calculate cohort averages when a specific trainee is selected
  let cohortEpaStats: Record<string, {code:string; title:string; count:number; totalEntrustment:number; averageEntrustment:number}> = {}
  if (selectedTrainee !== 'all') {
    // Find the selected trainee's cohort
    const selectedTraineeData = trainees.find(t => t.id === selectedTrainee)
    if (selectedTraineeData?.cohort) {
      // Get all trainees in the same cohort
      const cohortTrainees = trainees.filter(t => t.cohort === selectedTraineeData.cohort)
      const cohortTraineeIds = cohortTrainees.map(t => t.id)
      
      // Get all assessments for cohort trainees within the date range
      const cohortAssessments = assessments.filter(a => {
        if (!cohortTraineeIds.includes(a.traineeId) || a.status !== 'submitted') return false
        
        if (!startDate && !endDate) return true
        try {
          const assessmentDate = new Date(a.shiftDate)
          if (isNaN(assessmentDate.getTime())) return true

          const from = startDate ? new Date(`${startDate}T00:00:00`) : null
          const to = endDate ? new Date(`${endDate}T23:59:59.999`) : null

          const fromMatch = !from || assessmentDate >= from
          const toMatch = !to || assessmentDate <= to
          return fromMatch && toMatch
        } catch (err) {
          console.error('Error filtering cohort assessments by date:', err)
          return true
        }
      })
      
      // Calculate cohort EPA breakdown
      const cohortEPAAssessments = cohortAssessments.flatMap(a =>
        Array.isArray(a.epas) ? a.epas : []
      )
      
      cohortEpaStats = cohortEPAAssessments.reduce((acc, epa) => {
        const key = epa.epaCode
        if (!acc[key]) {
          acc[key] = { code: epa.epaCode, title: epa.epaTitle, count: 0, totalEntrustment: 0, averageEntrustment: 0 }
        }
        acc[key].count++
        acc[key].totalEntrustment += (epa.entrustmentLevel ?? 0)
        acc[key].averageEntrustment = acc[key].totalEntrustment / acc[key].count
        return acc
      }, {} as Record<string, {code:string; title:string; count:number; totalEntrustment:number; averageEntrustment:number}>)
    }
  }

  // Monthly progress (use stable sort key)
  const monthlyData = submittedAssessments.reduce((acc, assessment) => {
    try {
      const d = new Date(assessment.shiftDate)
      if (isNaN(d.getTime())) return acc
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      const key = `${y}-${String(m).padStart(2, '0')}`         // stable key
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' }) // display label
      if (!acc[key]) acc[key] = { label, assessments: 0, totalEntrustment: 0, count: 0 }
      acc[key].assessments++
      const epas = Array.isArray(assessment.epas) ? assessment.epas : []
      for (const e of epas) {
        acc[key].totalEntrustment += (e.entrustmentLevel ?? 0)
        acc[key].count++
      }
    } catch (err) {
      console.error('Error aggregating monthly data:', err)
    }
    return acc
  }, {} as Record<string, {label:string; assessments:number; totalEntrustment:number; count:number}>)

  const monthlyStats = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b)) // YYYY-MM sorts naturally
    .map(([key, v]) => ({
      month: v.label,
      assessments: v.assessments,
      avgEntrustment: v.count > 0 ? (v.totalEntrustment / v.count).toFixed(1) : '0.0'
    }))

  const handleExportData = () => {
    try {
      const exportData = {
        summary: {
          totalAssessments,
          activeTrainees,                                // use the same active trainee logic
          averageEntrustment,                            // fixed: use defined var
          dateRange: {
            startDate: startDate || 'All time',
            endDate: endDate || 'All time'
          },
          selectedCohort: selectedCohort !== 'all' ? selectedCohort : 'All cohorts',
          selectedTrainee: selectedTrainee !== 'all' ? selectedTrainee : 'All trainees'
        },
        epaStatistics: epaStats,
        monthlyProgress: monthlyStats,
        detailedAssessments: dateFilteredAssessments.map(a => ({
          id: a.id,
          traineeId: a.traineeId,
          facultyId: a.facultyId,
          shiftDate: a.shiftDate,
          location: a.location,
          status: a.status,
          submittedAt: a.submittedAt,
          epas: (Array.isArray(a.epas) ? a.epas : []).map(epa => ({
            epaCode: epa.epaCode,
            epaTitle: epa.epaTitle,
            entrustmentLevel: epa.entrustmentLevel,
            whatWentWell: epa.whatWentWell,
            whatCouldImprove: epa.whatCouldImprove,
            privateComments: epa.privateComments ?? null
          }))
        }))
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trainee-analytics-${selectedTrainee !== 'all' ? selectedTrainee : 'all'}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Analytics data exported successfully')
    } catch (error) {
      console.error(error)
      toast.error('Failed to export data')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Trainee Analytics</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Leadership view to analyze trainee performance across all EPAs
          </p>
        </div>
        <Button
          onClick={handleExportData}
          className="ml-4 whitespace-nowrap"
          variant="outline"
        >
          <Download size={16} className="mr-2" />
          Export
        </Button>
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
                  Filters {(startDate || endDate || (selectedTrainee && selectedTrainee !== 'all') || (selectedCohort && selectedCohort !== 'all')) && '(Active)'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                {hasRole('leadership') && (
                  <div className="space-y-2">
                    <Label htmlFor="cohort" className="text-sm">Cohort</Label>
                    <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                      <SelectTrigger>
                        <SelectValue placeholder="All cohorts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All cohorts</SelectItem>
                        {cohorts.map(cohort => (
                          <SelectItem key={cohort} value={cohort}>
                            {cohort}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {hasRole('leadership') && (
                  <div className="space-y-2">
                    <Label htmlFor="trainee" className="text-sm">Trainee</Label>
                    <Select value={selectedTrainee} onValueChange={setSelectedTrainee}>
                      <SelectTrigger>
                        <SelectValue placeholder="All trainees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All trainees</SelectItem>
                        {cohortFilteredTrainees.map(trainee => (
                          <SelectItem key={trainee.id} value={trainee.id}>
                            {trainee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <ClipboardText size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssessments}</div>
            <p className="text-xs text-muted-foreground">
              Submitted assessments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trainees</CardTitle>
            <Users size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTrainees}</div>
            <p className="text-xs text-muted-foreground">
              With submitted assessments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Entrustment Level</CardTitle>
            <TrendUp size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageEntrustment}</div>
            <p className="text-xs text-muted-foreground">
              Across all EPAs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* EPA Assessment Count Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartLine size={20} />
            EPA Assessment Count
          </CardTitle>
          <CardDescription>
            Number of assessments per EPA (horizontal scrollable view)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {epaStats.length > 0 ? (
            <>
              <div className="space-y-4 overflow-x-auto pt-4">
                <div className="min-w-full" style={{ minWidth: `${Math.max(600, epaStats.length * 60)}px` }}>
                  {epaStats.map((epa) => {
                    const cohortAvg = cohortEpaStats[epa.code]
                    const showCohortAvg = selectedTrainee !== 'all' && cohortAvg
                    
                    return (
                      <div key={epa.code} className="flex items-center gap-3 py-2">
                        <div className="w-20 text-xs font-medium truncate" title={epa.code}>
                          {epa.code}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 relative">
                            {showCohortAvg && (
                              <div 
                                className="absolute -top-4 flex items-center justify-center z-10"
                                style={{ left: `${Math.min((cohortAvg.count / maxEpaCount) * 100, 100)}%`, transform: 'translateX(-50%)' }}
                              >
                                <CaretDown size={12} className="text-orange-600 drop-shadow-sm" />
                              </div>
                            )}
                            <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${Math.min((epa.count / maxEpaCount) * 100, 100)}%` }}
                              />
                            </div>
                            <div className="text-sm font-medium w-8 text-right">
                              {epa.count}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 truncate" title={epa.title}>
                            {epa.title}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {selectedTrainee !== 'all' && Object.keys(cohortEpaStats).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CaretDown size={12} className="text-orange-600" />
                    <span>Cohort Average</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <ChartLine size={48} className="mx-auto mb-4 opacity-50" />
              <p>No EPA data available for the selected filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* EPA Average Entrustment Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendUp size={20} />
            EPA Average Entrustment
          </CardTitle>
          <CardDescription>
            Average entrustment level per EPA
          </CardDescription>
        </CardHeader>
        <CardContent>
          {epaStats.length > 0 ? (
            <>
              <div className="space-y-4 overflow-x-auto pt-4">
                <div className="min-w-full" style={{ minWidth: `${Math.max(600, epaStats.length * 60)}px` }}>
                  {epaStats.map((epa) => {
                    const avgLevel = epa.averageEntrustment
                    const cohortAvg = cohortEpaStats[epa.code]
                    const showCohortAvg = selectedTrainee !== 'all' && cohortAvg
                    
                    return (
                      <div key={epa.code} className="flex items-center gap-3 py-2">
                        <div className="w-20 text-xs font-medium truncate" title={epa.code}>
                          {epa.code}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 relative">
                            {showCohortAvg && (
                              <div 
                                className="absolute -top-4 flex items-center justify-center z-10"
                                style={{ left: `${Math.min((cohortAvg.averageEntrustment / 5) * 100, 100)}%`, transform: 'translateX(-50%)' }}
                              >
                                <CaretDown size={12} className="text-orange-600 drop-shadow-sm" />
                              </div>
                            )}
                            <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${Math.min((avgLevel / 5) * 100, 100)}%` }}
                              />
                            </div>
                            <div className="text-sm font-medium w-12 text-right">
                              {avgLevel.toFixed(1)}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 truncate" title={epa.title}>
                            {epa.title}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {selectedTrainee !== 'all' && Object.keys(cohortEpaStats).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CaretDown size={12} className="text-orange-600" />
                    <span>Cohort Average</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <TrendUp size={48} className="mx-auto mb-4 opacity-50" />
              <p>No EPA entrustment data available for the selected filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartLine size={20} />
            Progress Over Time
          </CardTitle>
          <CardDescription>
            Monthly assessment trends and average entrustment levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyStats.length > 0 ? (
            <div className="space-y-4 overflow-x-auto">
              <div className="flex gap-4 pb-2" style={{ minWidth: `${Math.max(400, monthlyStats.length * 120)}px` }}>
                {monthlyStats.map((month, index) => (
                  <div key={index} className="flex flex-col items-center min-w-0" style={{ flex: '0 0 100px' }}>
                    <div className="text-xs font-medium mb-2 text-center">{month.month}</div>
                    <div className="w-16 h-32 bg-muted rounded-t-lg relative flex flex-col justify-end overflow-hidden">
                      <div 
                        className="bg-primary rounded-t-lg transition-all duration-300 flex items-end justify-center text-xs text-primary-foreground font-medium"
                        style={{ height: `${Math.max((month.assessments / Math.max(...monthlyStats.map(m => m.assessments))) * 100, 10)}%` }}
                      >
                        {month.assessments > 0 && (
                          <span className="mb-1">{month.assessments}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-center mt-2">
                      <div className="font-medium">{month.assessments} assessments</div>
                      <div className="text-muted-foreground">Avg: {month.avgEntrustment}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <ChartLine size={48} className="mx-auto mb-4 opacity-50" />
              <p>No temporal data available for the selected filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
