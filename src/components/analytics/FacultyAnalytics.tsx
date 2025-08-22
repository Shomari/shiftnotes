import { useState } from 'react'
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
import { ChartLine, ClipboardText, Clock, Users, CaretDown, CaretUp, Funnel, Download } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function FacultyAnalytics() {
  const { user, hasRole } = useAuth()
  const [assessments] = useKV<Assessment[]>('assessments', [])
  const [users] = useKV<any[]>('users', [])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedFaculty, setSelectedFaculty] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const isMobile = useIsMobile()

  if (!user) return null

  // Get faculty users
  const facultyMembers = users.filter(u => u.role === 'faculty' || u.role === 'leadership')
  
  // Filter assessments based on date range
  const dateFilteredAssessments = assessments.filter(assessment => {
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
      console.error('Error filtering faculty assessments by date:', error)
      return true // Include assessments when filtering fails
    }
  })

  const submittedAssessments = dateFilteredAssessments.filter(a => a.status === 'submitted')
  
  // Calculate faculty-specific stats
  const facultyStats = facultyMembers.map(faculty => {
    const facultyAssessments = submittedAssessments.filter(a => a.evaluatorId === faculty.id)
    
    // Calculate turnaround time (time between shift date and submission)
    const turnaroundTimes = facultyAssessments.map(assessment => {
      try {
        const shiftDate = new Date(assessment.shiftDate)
        const submittedDate = new Date(assessment.createdAt)
        
        if (isNaN(shiftDate.getTime()) || isNaN(submittedDate.getTime())) {
          return 0 // Return 0 days for invalid dates
        }
        
        return Math.max(0, Math.ceil((submittedDate.getTime() - shiftDate.getTime()) / (1000 * 60 * 60 * 24))) // days
      } catch (error) {
        console.error('Error calculating turnaround time:', error)
        return 0
      }
    })
    
    const avgTurnaround = turnaroundTimes.length > 0 
      ? turnaroundTimes.reduce((sum, days) => sum + days, 0) / turnaroundTimes.length 
      : 0
    
    const allEPAs = facultyAssessments.flatMap(a => a.epas)
    const avgEntrustment = allEPAs.length > 0 
      ? allEPAs.reduce((sum, epa) => sum + epa.entrustmentLevel, 0) / allEPAs.length 
      : 0

    return {
      id: faculty.id,
      name: faculty.name,
      assessmentCount: facultyAssessments.length,
      avgTurnaround,
      avgEntrustment,
      turnaroundTimes
    }
  }).filter(stats => selectedFaculty && selectedFaculty !== 'all' ? stats.id === selectedFaculty : true)

  // Overall stats
  const totalAssessments = submittedAssessments.length
  const activeFaculty = new Set(submittedAssessments.map(a => a.evaluatorId)).size
  const allTurnaroundTimes = facultyStats.flatMap(f => f.turnaroundTimes)
  const avgTurnaround = allTurnaroundTimes.length > 0 
    ? allTurnaroundTimes.reduce((sum, days) => sum + days, 0) / allTurnaroundTimes.length 
    : 0
  const overallAvgEntrustment = facultyStats.reduce((sum, f) => sum + (f.avgEntrustment * f.assessmentCount), 0) / 
    Math.max(1, facultyStats.reduce((sum, f) => sum + f.assessmentCount, 0))

  // Sort faculty by assessment count for charts
  const sortedFaculty = [...facultyStats].sort((a, b) => b.assessmentCount - a.assessmentCount)
  
  // Create "All Faculty" aggregate entry
  const allFacultyStats = {
    id: 'all-faculty',
    name: 'All Faculty',
    assessmentCount: totalAssessments,
    avgTurnaround: avgTurnaround,
    avgEntrustment: overallAvgEntrustment,
    turnaroundTimes: allTurnaroundTimes
  }
  
  // Add "All Faculty" to the beginning of the sorted list
  const facultyWithAggregate = [allFacultyStats, ...sortedFaculty]

  const handleExportData = () => {
    try {
      const exportData = {
        summary: {
          totalAssessments: submittedAssessments.length,
          activeFaculty: facultyMembers.length,
          averageTurnaround: avgTurnaroundTime,
          averageEntrustment: avgEntrustmentLevel,
          dateRange: {
            startDate: startDate || 'All time',
            endDate: endDate || 'All time'
          }
        },
        facultyStatistics: facultyStats,
        turnaroundAnalysis: {
          excellent: facultyStats.filter(f => f.avgTurnaround <= 1).length,
          good: facultyStats.filter(f => f.avgTurnaround > 1 && f.avgTurnaround <= 3).length,
          needsImprovement: facultyStats.filter(f => f.avgTurnaround > 3).length
        },
        detailedAssessments: submittedAssessments.map(assessment => ({
          id: assessment.id,
          evaluatorId: assessment.evaluatorId,
          traineeId: assessment.traineeId,
          shiftDate: assessment.shiftDate,
          submittedAt: assessment.createdAt,
          turnaroundDays: (() => {
            try {
              const shiftDate = new Date(assessment.shiftDate)
              const submittedDate = new Date(assessment.createdAt)
              
              if (isNaN(shiftDate.getTime()) || isNaN(submittedDate.getTime())) {
                return 0
              }
              
              return Math.max(0, Math.ceil((submittedDate.getTime() - shiftDate.getTime()) / (1000 * 60 * 60 * 24)))
            } catch (error) {
              console.error('Error calculating export turnaround days:', error)
              return 0
            }
          })(),
          epasCount: assessment.epas.length,
          averageEntrustment: assessment.epas.reduce((sum, epa) => sum + epa.entrustmentLevel, 0) / assessment.epas.length
        }))
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `faculty-analytics-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Faculty analytics exported successfully')
    } catch (error) {
      toast.error('Failed to export data')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Faculty Analytics</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Track faculty assessment activity and performance metrics, including turnaround time analysis
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
                  Filters {(startDate || endDate || (selectedFaculty && selectedFaculty !== 'all')) && '(Active)'}
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

                <div className="space-y-2">
                  <Label htmlFor="faculty" className="text-sm">Faculty Member</Label>
                  <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                    <SelectTrigger>
                      <SelectValue placeholder="All faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All faculty</SelectItem>
                      {facultyMembers.map(faculty => (
                        <SelectItem key={faculty.id} value={faculty.id}>
                          {faculty.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Actions</Label>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStartDate('')
                      setEndDate('')
                      setSelectedFaculty('all')
                    }}
                    disabled={!startDate && !endDate && (!selectedFaculty || selectedFaculty === 'all')}
                    className="w-full text-sm"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
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
              <Users size={20} className="text-accent" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{activeFaculty}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Active Faculty</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center space-x-2">
              <Clock size={20} className="text-orange-600" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{avgTurnaround.toFixed(1)}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Avg Turnaround (days)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center space-x-2">
              <ChartLine size={20} className="text-green-600" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{overallAvgEntrustment.toFixed(1)}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Average Entrustment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Count by Faculty */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">Assessment Count by Faculty</CardTitle>
          <CardDescription className="text-sm">
            Total number of assessments submitted by each faculty member
          </CardDescription>
        </CardHeader>
        <CardContent>
          {facultyWithAggregate.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <ChartLine size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-2">No assessment data available</h3>
            </div>
          ) : (
            <div className="space-y-3">
              {facultyWithAggregate.map((faculty, index) => (
                <div key={faculty.id} className={`flex items-center gap-2 sm:gap-4 p-3 border rounded-lg ${index === 0 ? 'bg-muted/30 border-primary/30' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm sm:text-base truncate ${index === 0 ? 'font-semibold' : ''}`}>
                      {faculty.name}
                      {index === 0 && <span className="ml-2 text-xs text-muted-foreground">(Aggregate)</span>}
                    </p>
                  </div>
                  <div className="w-16 sm:w-32 bg-muted rounded-full h-2">
                    <div 
                      className={`h-full rounded-full ${index === 0 ? 'bg-primary' : 'bg-primary'}`}
                      style={{ width: `${faculty.assessmentCount > 0 ? Math.max((faculty.assessmentCount / Math.max(...facultyWithAggregate.map(f => f.assessmentCount))) * 100, 5) : 0}%` }}
                    />
                  </div>
                  <div className="min-w-[40px] sm:min-w-[60px] text-right">
                    <span className={`text-base sm:text-lg font-bold text-primary ${index === 0 ? 'text-lg sm:text-xl' : ''}`}>{faculty.assessmentCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Average EPA Entrustment by Faculty */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">Average EPA Entrustment by Faculty</CardTitle>
          <CardDescription className="text-sm">
            Average entrustment levels assigned by each faculty member
          </CardDescription>
        </CardHeader>
        <CardContent>
          {facultyWithAggregate.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <ChartLine size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-2">No assessment data available</h3>
            </div>
          ) : (
            <div className="space-y-3">
              {facultyWithAggregate.filter(f => f.assessmentCount > 0).map((faculty, index) => {
                const isAggregate = faculty.id === 'all-faculty'
                return (
                  <div key={faculty.id} className={`flex items-center gap-2 sm:gap-4 p-3 border rounded-lg ${isAggregate ? 'bg-muted/30 border-primary/30' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm sm:text-base truncate ${isAggregate ? 'font-semibold' : ''}`}>
                        {faculty.name}
                        {isAggregate && <span className="ml-2 text-xs text-muted-foreground">(Aggregate)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{faculty.assessmentCount} assessments</p>
                    </div>
                    <div className="w-16 sm:w-32 bg-muted rounded-full h-2">
                      <div 
                        className="bg-accent h-full rounded-full" 
                        style={{ width: `${(faculty.avgEntrustment / 5) * 100}%` }}
                      />
                    </div>
                    <div className="min-w-[40px] sm:min-w-[60px] text-right">
                      <span className={`text-base sm:text-lg font-bold text-accent ${isAggregate ? 'text-lg sm:text-xl' : ''}`}>{faculty.avgEntrustment.toFixed(1)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Turnaround Time Analysis */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">Turnaround Time Analysis</CardTitle>
          <CardDescription className="text-sm">
            Average time from shift completion to assessment submission with performance color coding
          </CardDescription>
        </CardHeader>
        <CardContent>
          {facultyWithAggregate.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <ChartLine size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-2">No turnaround data available</h3>
            </div>
          ) : (
            <div className="space-y-3">
              {facultyWithAggregate.filter(f => f.assessmentCount > 0).map((faculty) => {
                const isAggregate = faculty.id === 'all-faculty'
                // Color coding: Green ≤1 day, Yellow 2-3 days, Orange 4-7 days, Red >7 days
                const turnaround = faculty.avgTurnaround
                const colorClass = turnaround <= 1 ? 'bg-green-500' : 
                                 turnaround <= 3 ? 'bg-yellow-500' : 
                                 turnaround <= 7 ? 'bg-orange-500' : 'bg-red-500'
                
                const performanceLabel = turnaround <= 1 ? 'Excellent' :
                                       turnaround <= 3 ? 'Good' :
                                       turnaround <= 7 ? 'Fair' : 'Needs Improvement'

                return (
                  <div key={faculty.id} className={`flex items-center gap-2 sm:gap-4 p-3 border rounded-lg ${isAggregate ? 'bg-muted/30 border-primary/30' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm sm:text-base truncate ${isAggregate ? 'font-semibold' : ''}`}>
                        {faculty.name}
                        {isAggregate && <span className="ml-2 text-xs text-muted-foreground">(Aggregate)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {faculty.assessmentCount} assessments • {performanceLabel}
                      </p>
                    </div>
                    <div className="w-16 sm:w-32 bg-muted rounded-full h-2">
                      <div 
                        className={`h-full rounded-full ${colorClass}`}
                        style={{ width: `${Math.min((turnaround / 14) * 100, 100)}%` }} // Scale to 14 days max
                      />
                    </div>
                    <div className="min-w-[40px] sm:min-w-[80px] text-right">
                      <span className={`text-base sm:text-lg font-bold ${isAggregate ? 'text-lg sm:text-xl' : ''}`}>{turnaround.toFixed(1)}</span>
                      <p className="text-xs text-muted-foreground">days</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}