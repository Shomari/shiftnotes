import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Download, 
  CaretDown,
  CaretUp,
  MagnifyingGlass,
  ChartBar
} from '@phosphor-icons/react'
import { format } from 'date-fns'
import { safeDate, safeDateFormat } from '@/lib/utils'

interface Assessment {
  id: string
  trainee: string
  evaluator: string
  date: string
  epas: Array<{
    name: string
    entrustment: number
  }>
  status: 'draft' | 'submitted' | 'locked'
  location?: string
  whatWentWell: string
  whatCouldImprove: string
  privateComments?: string
}

export function AllAssessments() {
  const [assessments] = useKV<Assessment[]>('assessments', [])
  const [users] = useKV<any[]>('users', [])
  const [epas] = useKV<any[]>('epas', [])
  
  // Filter states
  const [filtersExpanded, setFiltersExpanded] = useState(true)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedTrainee, setSelectedTrainee] = useState<string>('all')
  const [selectedEvaluator, setSelectedEvaluator] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedEPA, setSelectedEPA] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Get trainees and faculty from users
  const trainees = users.filter(user => user.role === 'trainee')
  const evaluators = users.filter(user => user.role === 'faculty' || user.role === 'leadership')
  const activeEPAs = epas.filter(epa => epa.active)

  // Filter assessments
  const filteredAssessments = assessments.filter(assessment => {
    // Date range filter
    const assessmentDate = safeDate(assessment.date)
    if (startDate && assessmentDate && assessmentDate < new Date(startDate)) return false
    if (endDate && assessmentDate && assessmentDate > new Date(endDate)) return false
    
    // Trainee filter
    if (selectedTrainee !== 'all' && assessment.trainee !== selectedTrainee) return false
    
    // Evaluator filter
    if (selectedEvaluator !== 'all' && assessment.evaluator !== selectedEvaluator) return false
    
    // Status filter
    if (selectedStatus !== 'all' && assessment.status !== selectedStatus) return false
    
    // EPA filter
    if (selectedEPA !== 'all' && !assessment.epas.some(epa => epa.name === selectedEPA)) return false
    
    // Search filter
    if (searchTerm && !assessment.trainee.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !assessment.evaluator.toLowerCase().includes(searchTerm.toLowerCase())) return false
    
    return true
  })

  const handleExport = () => {
    const csvHeaders = [
      'Assessment ID',
      'Date',
      'Trainee',
      'Evaluator', 
      'Location',
      'EPA',
      'Entrustment Level',
      'Status',
      'What Went Well',
      'What Could Improve',
      'Private Comments'
    ]

    const csvRows = []
    filteredAssessments.forEach(assessment => {
      assessment.epas.forEach(epa => {
        csvRows.push([
          assessment.id,
          assessment.date,
          assessment.trainee,
          assessment.evaluator,
          assessment.location || '',
          epa.name,
          epa.entrustment,
          assessment.status,
          `"${assessment.whatWentWell}"`,
          `"${assessment.whatCouldImprove}"`,
          `"${assessment.privateComments || ''}"`
        ])
      })
    })

    const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `all-assessments-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setSelectedTrainee('all')
    setSelectedEvaluator('all')
    setSelectedStatus('all')
    setSelectedEPA('all')
    setSearchTerm('')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'submitted':
        return <Badge variant="default">Submitted</Badge>
      case 'locked':
        return <Badge variant="destructive">Locked</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getEntrustmentBadge = (level: number) => {
    const colors = {
      1: 'bg-red-100 text-red-800',
      2: 'bg-orange-100 text-orange-800', 
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-blue-100 text-blue-800',
      5: 'bg-green-100 text-green-800'
    }
    
    return (
      <Badge className={colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        Level {level}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">All Assessments</h2>
          <p className="text-muted-foreground">
            View and manage all assessments across the system
          </p>
        </div>
        <Button onClick={handleExport} className="w-full sm:w-auto">
          <Download size={16} className="mr-2" />
          Export Data
        </Button>
      </div>

      {/* Filters Section */}
      <Card>
        <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <MagnifyingGlass size={20} />
                  Filters
                </div>
                {filtersExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Date Range Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Other Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Trainee</Label>
                  <Select value={selectedTrainee} onValueChange={setSelectedTrainee}>
                    <SelectTrigger>
                      <SelectValue placeholder="All trainees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All trainees</SelectItem>
                      {trainees.map((trainee) => (
                        <SelectItem key={trainee.id} value={trainee.name}>
                          {trainee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Evaluator</Label>
                  <Select value={selectedEvaluator} onValueChange={setSelectedEvaluator}>
                    <SelectTrigger>
                      <SelectValue placeholder="All evaluators" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All evaluators</SelectItem>
                      {evaluators.map((evaluator) => (
                        <SelectItem key={evaluator.id} value={evaluator.name}>
                          {evaluator.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="locked">Locked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>EPA</Label>
                  <Select value={selectedEPA} onValueChange={setSelectedEPA}>
                    <SelectTrigger>
                      <SelectValue placeholder="All EPAs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All EPAs</SelectItem>
                      {activeEPAs.map((epa) => (
                        <SelectItem key={epa.id} value={epa.title}>
                          {epa.id}. {epa.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search and Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by trainee or evaluator name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredAssessments.length} of {assessments.length} assessments
        </p>
        <div className="flex items-center gap-2">
          <ChartBar size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">
            Avg Entrustment: {filteredAssessments.length > 0 
              ? (filteredAssessments.reduce((sum, assessment) => 
                  sum + assessment.epas.reduce((epaSum, epa) => epaSum + epa.entrustment, 0), 0
                ) / filteredAssessments.reduce((sum, assessment) => sum + assessment.epas.length, 0)).toFixed(1)
              : 'N/A'
            }
          </span>
        </div>
      </div>

      {/* Assessments List */}
      <div className="space-y-4">
        {filteredAssessments.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <ChartBar size={48} className="mx-auto mb-4 opacity-50" />
                <p>No assessments match your current filters.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredAssessments.map((assessment) => (
            <Card key={assessment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Assessment Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">
                        {assessment.trainee} • {safeDateFormat(assessment.date)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Evaluated by: {assessment.evaluator}
                        {assessment.location && ` • ${assessment.location}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(assessment.status)}
                    </div>
                  </div>

                  {/* EPAs */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">EPAs Assessed:</h4>
                    <div className="flex flex-wrap gap-2">
                      {assessment.epas.map((epa, index) => (
                        <div key={index} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                          <span className="text-sm font-medium line-clamp-1">
                            {epa.name}
                          </span>
                          {getEntrustmentBadge(epa.entrustment)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm text-green-700">What Went Well:</h4>
                      <p className="text-sm bg-green-50 p-3 rounded-lg line-clamp-2">
                        {assessment.whatWentWell}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm text-blue-700">What Could Improve:</h4>
                      <p className="text-sm bg-blue-50 p-3 rounded-lg line-clamp-2">
                        {assessment.whatCouldImprove}
                      </p>
                    </div>
                  </div>

                  {/* Private Comments (if any) */}
                  {assessment.privateComments && (
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm text-amber-700">Private Comments (Leadership Only):</h4>
                      <p className="text-sm bg-amber-50 p-3 rounded-lg line-clamp-2">
                        {assessment.privateComments}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}