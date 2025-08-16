import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import { useKV } from '@github/spark/hooks'
import { useIsMobile } from '../../hooks/use-mobile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Assessment } from '../../lib/types'
import { ChartLine, Target, TrendUp, Users, CaretDown, CaretUp, Funnel, CheckCircle, Download } from '@phosphor-icons/react'
import { toast } from 'sonner'

// Sample milestone data - in a real app this would come from the backend
const SAMPLE_MILESTONES = [
  {
    id: 'milestone-1',
    title: 'Patient Care - Emergency Stabilization',
    category: 'Patient Care',
    description: 'Demonstrates competency in initial patient assessment and emergency stabilization',
    mappedEPAs: ['EPA-1', 'EPA-2', 'EPA-11', 'EPA-12'],
    levels: 5, // 1-5 scale
    requiredAssessments: 10 // Minimum assessments needed for milestone completion
  },
  {
    id: 'milestone-2',
    title: 'Medical Knowledge - Diagnostic Reasoning',
    category: 'Medical Knowledge',
    description: 'Shows proficiency in clinical reasoning and differential diagnosis',
    mappedEPAs: ['EPA-3', 'EPA-5', 'EPA-6', 'EPA-7'],
    levels: 5,
    requiredAssessments: 15
  },
  {
    id: 'milestone-3',
    title: 'Communication - Patient and Family Interaction',
    category: 'Communication',
    description: 'Effective communication with patients, families, and healthcare team',
    mappedEPAs: ['EPA-16', 'EPA-18', 'EPA-19'],
    levels: 5,
    requiredAssessments: 8
  },
  {
    id: 'milestone-4',
    title: 'Systems-Based Practice - ED Flow Management',
    category: 'Systems-Based Practice',
    description: 'Manages patient flow and coordinates care within the emergency department',
    mappedEPAs: ['EPA-21'],
    levels: 5,
    requiredAssessments: 12
  },
  {
    id: 'milestone-5',
    title: 'Professionalism - Professional Standards',
    category: 'Professionalism',
    description: 'Demonstrates professional behavior and adherence to ethical standards',
    mappedEPAs: ['EPA-22'],
    levels: 5,
    requiredAssessments: 6
  },
  {
    id: 'milestone-6',
    title: 'Practice-Based Learning - Evidence Application',
    category: 'Practice-Based Learning',
    description: 'Applies best available evidence to guide patient care decisions',
    mappedEPAs: ['EPA-7', 'EPA-8'],
    levels: 5,
    requiredAssessments: 10
  }
]

export function MilestoneAnalytics() {
  const { user, hasRole } = useAuth()
  const [assessments] = useKV<Assessment[]>('assessments', [])
  const [users] = useKV<any[]>('users', [])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedTrainee, setSelectedTrainee] = useState('all-trainees')
  const [selectedCohort, setSelectedCohort] = useState('all-cohorts')
  const [selectedCategory, setSelectedCategory] = useState('all-categories')
  const [selectedMilestone, setSelectedMilestone] = useState('all-milestones')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const isMobile = useIsMobile()

  // Reset trainee selection when cohort changes
  useEffect(() => {
    if (selectedCohort !== 'all-cohorts') {
      setSelectedTrainee('all-trainees')
    }
  }, [selectedCohort])

  if (!user) return null

  // Get trainee users
  const trainees = users.filter(u => u.role === 'trainee')
  
  // Get unique cohorts from trainees
  const cohorts = [...new Set(trainees.map(t => t.cohort).filter(Boolean))].sort()
  
  // Get unique categories from milestones
  const categories = [...new Set(SAMPLE_MILESTONES.map(m => m.category))]
  
  // Filter assessments based on date range, trainee, and cohort
  const filteredAssessments = assessments.filter(assessment => {
    if (assessment.status !== 'submitted') return false
    
    // Date filter
    if (startDate || endDate) {
      try {
        const assessmentDate = new Date(assessment.shiftDate)
        if (!isNaN(assessmentDate.getTime())) {
          const fromMatch = !startDate || assessmentDate >= new Date(startDate)
          const toMatch = !endDate || assessmentDate <= new Date(endDate)
          if (!fromMatch || !toMatch) return false
        }
      } catch (error) {
        console.error('Error filtering milestone assessments by date:', error)
        // Continue with other filters if date filtering fails
      }
    }
    
    // Trainee filter
    if (selectedTrainee && selectedTrainee !== 'all-trainees') {
      return assessment.traineeId === selectedTrainee
    }
    
    // Cohort filter
    if (selectedCohort && selectedCohort !== 'all-cohorts') {
      const trainee = users.find(u => u.id === assessment.traineeId)
      return trainee && trainee.cohort === selectedCohort
    }
    
    return true
  })

  // Calculate milestone progress for each trainee
  const calculateMilestoneProgress = () => {
    // Filter trainees by cohort if specified
    let filteredTrainees = trainees
    if (selectedCohort && selectedCohort !== 'all-cohorts') {
      filteredTrainees = trainees.filter(trainee => trainee.cohort === selectedCohort)
    }
    
    const traineeProgress = filteredTrainees.map(trainee => {
      const traineeAssessments = filteredAssessments.filter(a => a.traineeId === trainee.id)
      
      const milestoneProgress = SAMPLE_MILESTONES.map(milestone => {
        // Get assessments for EPAs mapped to this milestone
        const relevantAssessments = traineeAssessments.filter(assessment => 
          assessment.epas.some(epa => milestone.mappedEPAs.includes(epa.epaCode))
        )
        
        const relevantEPAs = relevantAssessments.flatMap(assessment => 
          assessment.epas.filter(epa => milestone.mappedEPAs.includes(epa.epaCode))
        )
        
        // Calculate assessment counts per EPA
        const epaAssessmentCounts = milestone.mappedEPAs.map(epaCode => {
          const count = relevantEPAs.filter(epa => epa.epaCode === epaCode).length
          return { epaCode, count }
        })
        
        const assessmentCount = relevantEPAs.length
        const avgEntrustment = relevantEPAs.length > 0 
          ? relevantEPAs.reduce((sum, epa) => sum + epa.entrustmentLevel, 0) / relevantEPAs.length 
          : 0
        
        // Calculate progress as a percentage based on assessment count and performance
        const assessmentProgress = Math.min(assessmentCount / milestone.requiredAssessments, 1)
        const performanceProgress = avgEntrustment / 5
        const overallProgress = (assessmentProgress * 0.4) + (performanceProgress * 0.6) // Weight performance more heavily
        
        return {
          milestoneId: milestone.id,
          milestone,
          assessmentCount,
          epaAssessmentCounts,
          avgEntrustment,
          progress: overallProgress * 100,
          isCompleted: overallProgress >= 0.8 && assessmentCount >= milestone.requiredAssessments * 0.8
        }
      })
      
      return {
        trainee,
        milestoneProgress,
        completedMilestones: milestoneProgress.filter(m => m.isCompleted).length,
        totalProgress: milestoneProgress.reduce((sum, m) => sum + m.progress, 0) / milestoneProgress.length
      }
    })
    
    return traineeProgress
  }

  const traineeProgressData = calculateMilestoneProgress()
  
  // Filter by selected trainee if specified
  const displayData = (selectedTrainee && selectedTrainee !== 'all-trainees') 
    ? traineeProgressData.filter(tp => tp.trainee.id === selectedTrainee)
    : traineeProgressData
  
  // Filter milestones by category and specific milestone
  const filteredMilestones = SAMPLE_MILESTONES.filter(milestone => {
    if (selectedCategory && selectedCategory !== 'all-categories' && milestone.category !== selectedCategory) return false
    if (selectedMilestone && selectedMilestone !== 'all-milestones' && milestone.id !== selectedMilestone) return false
    return true
  })
  
  // Overall statistics
  const activeMilestones = SAMPLE_MILESTONES.length
  const totalEPAMappings = SAMPLE_MILESTONES.reduce((sum, m) => sum + m.mappedEPAs.length, 0)

  const handleExportData = () => {
    try {
      const exportData = {
        summary: {
          activeMilestones,
          totalEPAMappings,
          totalTrainees: displayData.length,
          dateRange: {
            startDate: startDate || 'All time',
            endDate: endDate || 'All time'
          },
          filters: {
            cohort: selectedCohort !== 'all-cohorts' ? selectedCohort : 'All cohorts',
            trainee: selectedTrainee !== 'all-trainees' ? users.find(u => u.id === selectedTrainee)?.name : 'All trainees',
            category: selectedCategory !== 'all-categories' ? selectedCategory : 'All categories',
            milestone: selectedMilestone !== 'all-milestones' ? SAMPLE_MILESTONES.find(m => m.id === selectedMilestone)?.title : 'All milestones'
          }
        },
        milestoneDefinitions: filteredMilestones,
        traineeProgress: displayData.map(tp => ({
          trainee: {
            id: tp.trainee.id,
            name: tp.trainee.name,
            cohort: tp.trainee.cohort
          },
          completedMilestones: tp.completedMilestones,
          totalProgress: tp.totalProgress,
          milestoneDetails: tp.milestoneProgress.map(mp => ({
            milestoneId: mp.milestone.id,
            milestoneTitle: mp.milestone.title,
            category: mp.milestone.category,
            assessmentCount: mp.assessmentCount,
            avgEntrustment: mp.avgEntrustment,
            progress: mp.progress,
            isCompleted: mp.isCompleted,
            epaAssessmentCounts: mp.epaAssessmentCounts
          }))
        })),
        assessmentData: filteredAssessments.map(assessment => ({
          id: assessment.id,
          traineeId: assessment.traineeId,
          evaluatorId: assessment.evaluatorId,
          shiftDate: assessment.shiftDate,
          submittedAt: assessment.createdAt,
          epas: assessment.epas.map(epa => ({
            epaCode: epa.epaCode,
            epaTitle: epa.epaTitle,
            entrustmentLevel: epa.entrustmentLevel,
            mappedMilestones: SAMPLE_MILESTONES.filter(m => m.mappedEPAs.includes(epa.epaCode)).map(m => ({ id: m.id, title: m.title }))
          }))
        }))
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `milestone-analytics-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Milestone analytics exported successfully')
    } catch (error) {
      toast.error('Failed to export data')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Milestone Analytics</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Track milestone achievement progress based on mapped EPA assessments with comprehensive filtering
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
                  Filters {(startDate || endDate || (selectedTrainee && selectedTrainee !== 'all-trainees') || (selectedCohort && selectedCohort !== 'all-cohorts') || (selectedCategory && selectedCategory !== 'all-categories') || (selectedMilestone && selectedMilestone !== 'all-milestones')) && '(Active)'}
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
                  <Label htmlFor="cohort" className="text-sm">Cohort</Label>
                  <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                    <SelectTrigger>
                      <SelectValue placeholder="All cohorts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-cohorts">All cohorts</SelectItem>
                      {cohorts.map(cohort => (
                        <SelectItem key={cohort} value={cohort}>
                          {cohort}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trainee" className="text-sm">Trainee</Label>
                  <Select value={selectedTrainee} onValueChange={setSelectedTrainee}>
                    <SelectTrigger>
                      <SelectValue placeholder="All trainees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-trainees">All trainees</SelectItem>
                      {trainees
                        .filter(trainee => !selectedCohort || selectedCohort === 'all-cohorts' || trainee.cohort === selectedCohort)
                        .map(trainee => (
                        <SelectItem key={trainee.id} value={trainee.id}>
                          {trainee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm">Competency</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All competencies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-categories">All competencies</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="milestone" className="text-sm">Specific Milestone</Label>
                  <Select value={selectedMilestone} onValueChange={setSelectedMilestone}>
                    <SelectTrigger>
                      <SelectValue placeholder="All milestones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-milestones">All milestones</SelectItem>
                      {filteredMilestones.map(milestone => (
                        <SelectItem key={milestone.id} value={milestone.id}>
                          {milestone.title}
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
                      setSelectedTrainee('all-trainees')
                      setSelectedCohort('all-cohorts')
                      setSelectedCategory('all-categories')
                      setSelectedMilestone('all-milestones')
                    }}
                    disabled={!startDate && !endDate && (!selectedTrainee || selectedTrainee === 'all-trainees') && (!selectedCohort || selectedCohort === 'all-cohorts') && (!selectedCategory || selectedCategory === 'all-categories') && (!selectedMilestone || selectedMilestone === 'all-milestones')}
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center space-x-2">
              <Target size={20} className="text-primary" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{activeMilestones}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Active Milestones</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center space-x-2">
              <ChartLine size={20} className="text-accent" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{totalEPAMappings}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">EPA Mappings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Progress Analysis */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">Milestone Progress Analysis</CardTitle>
          <CardDescription className="text-sm">
            Individual milestone progress tracking with 5-level system showing assessment counts and average entrustment levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {displayData.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <Target size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-2">No milestone data available</h3>
              <p className="text-muted-foreground text-sm">
                Milestone progress will appear once assessments are submitted for mapped EPAs.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {displayData.map(traineeData => (
                <div key={traineeData.trainee.id} className="space-y-4">
                  {/* Trainee Header */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg">{traineeData.trainee.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {traineeData.completedMilestones} of {SAMPLE_MILESTONES.length} milestones completed •{' '}
                        Overall Progress: {traineeData.totalProgress.toFixed(1)}%
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={traineeData.totalProgress} className="w-20 h-2" />
                      <span className="text-sm font-medium">{traineeData.totalProgress.toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Milestone Progress List */}
                  <div className="space-y-3">
                    {traineeData.milestoneProgress
                      .filter(mp => filteredMilestones.some(fm => fm.id === mp.milestoneId))
                      .map(milestoneProgress => (
                      <div key={milestoneProgress.milestoneId} className="border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {milestoneProgress.milestone.category}
                              </Badge>
                              {milestoneProgress.isCompleted && (
                                <CheckCircle size={16} className="text-green-600" />
                              )}
                            </div>
                            <h4 className="font-medium text-sm sm:text-base mb-1">
                              {milestoneProgress.milestone.title}
                            </h4>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                              {milestoneProgress.milestone.description}
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>
                                {milestoneProgress.assessmentCount} assessments
                              </span>
                              <span>•</span>
                              <span>
                                Avg Level: {milestoneProgress.avgEntrustment.toFixed(1)}
                              </span>
                              <span>•</span>
                              <span>
                                Mapped EPAs: {milestoneProgress.milestone.mappedEPAs.map(epaCode => {
                                  const epaCount = milestoneProgress.epaAssessmentCounts.find(eac => eac.epaCode === epaCode)?.count || 0
                                  return `${epaCode} (${epaCount})`
                                }).join(', ')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2 min-w-[120px]">
                            {/* 5-Level Progress Bar */}
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map(level => (
                                <div key={level} className="flex flex-col items-center gap-1">
                                  <div 
                                    className={`w-4 h-6 rounded-sm border ${
                                      milestoneProgress.progress >= level * 20 
                                        ? 'bg-primary border-primary' 
                                        : 'bg-muted border-border'
                                    }`}
                                  />
                                  <span className="text-xs text-muted-foreground">{level}</span>
                                </div>
                              ))}
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-primary">
                                {milestoneProgress.progress.toFixed(0)}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {milestoneProgress.isCompleted ? 'Completed' : 'In Progress'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}